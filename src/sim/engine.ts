import { createRng, type Rng } from './rng';
import { placers, sortQueue } from './schedulers';
import type {
  AlgoId,
  Metrics,
  Node,
  Resources,
  SimConfig,
  SimSnapshot,
  Task,
} from './types';

function emptyUsed(): Resources {
  return { cpu: 0, mem: 0, gpu: 0 };
}

function sampleDuration(rng: Rng, dist: SimConfig['durationDist']): number {
  switch (dist) {
    case 'lognormal': {
      const u = rng.float(0.2, 1.8);
      return Math.max(0.5, Math.exp(u) * 2);
    }
    case 'bimodal':
      return rng.next() < 0.7 ? rng.float(1, 4) : rng.float(10, 20);
    default:
      return rng.float(2, 12);
  }
}

function sampleResources(
  rng: Rng,
  dist: SimConfig['resourceDist'],
  cap: Resources,
): Resources {
  const scale = () => {
    switch (dist) {
      case 'lognormal':
        return Math.min(0.9, Math.exp(rng.float(-1.5, 0)) * 0.35);
      case 'bimodal':
        return rng.next() < 0.75 ? rng.float(0.05, 0.25) : rng.float(0.4, 0.7);
      default:
        return rng.float(0.08, 0.45);
    }
  };
  const s = scale();
  return {
    cpu: Math.max(0.25, Math.round(cap.cpu * s * 4) / 4),
    mem: Math.max(0.5, Math.round(cap.mem * s * 2) / 2),
    gpu: rng.next() < 0.35 ? Math.min(cap.gpu, rng.int(1, Math.max(1, cap.gpu))) : 0,
  };
}

function samplePriority(rng: Rng, mix: SimConfig['priorityMix']): number {
  const r = rng.next();
  if (mix === 'mostlyLow') return r < 0.7 ? 0 : r < 0.9 ? 1 : 2;
  if (mix === 'skewHigh') return r < 0.2 ? 0 : r < 0.5 ? 1 : 2;
  return r < 0.33 ? 0 : r < 0.66 ? 1 : 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! * (hi - i) + sorted[hi]! * (i - lo);
}

function recomputeUsed(node: Node, tasks: Map<number, Task>) {
  node.used = emptyUsed();
  for (const id of node.running) {
    const t = tasks.get(id);
    if (!t) continue;
    node.used.cpu += t.resources.cpu;
    node.used.mem += t.resources.mem;
    node.used.gpu += t.resources.gpu;
  }
}

export class Simulator {
  config: SimConfig;
  algo: AlgoId;
  time = 0;
  nextId = 1;
  nextArrival = 0;
  nodes: Node[] = [];
  tasks = new Map<number, Task>();
  queue: number[] = [];
  preempts = 0;
  rng: Rng;
  waitHistory: number[] = [];
  private lastWaitSample = 0;

  constructor(config: SimConfig, algo: AlgoId) {
    this.config = { ...config, capacity: { ...config.capacity } };
    this.algo = algo;
    this.rng = createRng(config.seed);
    this.resetTopology();
    this.nextArrival = 0;
  }

  resetTopology() {
    this.nodes = Array.from({ length: this.config.nodeCount }, (_, id) => ({
      id,
      capacity: { ...this.config.capacity },
      used: emptyUsed(),
      running: [],
    }));
  }

  hardReset(config?: SimConfig, algo?: AlgoId) {
    if (config) this.config = { ...config, capacity: { ...config.capacity } };
    if (algo) this.algo = algo;
    this.time = 0;
    this.nextId = 1;
    this.tasks.clear();
    this.queue = [];
    this.preempts = 0;
    this.waitHistory = [];
    this.lastWaitSample = 0;
    this.rng = createRng(this.config.seed);
    this.resetTopology();
    this.nextArrival = 0;
  }

  setAlgo(algo: AlgoId) {
    this.algo = algo;
  }

  private spawnTask(): Task {
    const resources = sampleResources(
      this.rng,
      this.config.resourceDist,
      this.config.capacity,
    );
    // Mark unschedulable if larger than any node capacity
    const tooBig =
      resources.cpu > this.config.capacity.cpu ||
      resources.mem > this.config.capacity.mem ||
      resources.gpu > this.config.capacity.gpu;
    const duration = sampleDuration(this.rng, this.config.durationDist);
    const task: Task = {
      id: this.nextId++,
      arrival: this.time,
      duration,
      remaining: duration,
      resources,
      priority: samplePriority(this.rng, this.config.priorityMix),
      tenant: this.rng.int(0, 3),
      state: tooBig ? 'unschedulable' : 'queued',
      nodeId: null,
      startTime: null,
      finishTime: null,
      waitAccum: 0,
      preemptCount: 0,
    };
    this.tasks.set(task.id, task);
    if (!tooBig) this.queue.push(task.id);
    return task;
  }

  private assign(task: Task, nodeId: number) {
    const node = this.nodes[nodeId]!;
    task.state = 'running';
    task.nodeId = nodeId;
    task.startTime = this.time;
    node.running.push(task.id);
    recomputeUsed(node, this.tasks);
    this.queue = this.queue.filter((id) => id !== task.id);
  }

  private preempt(task: Task) {
    if (task.nodeId == null) return;
    const node = this.nodes[task.nodeId]!;
    node.running = node.running.filter((id) => id !== task.id);
    recomputeUsed(node, this.tasks);
    task.state = 'queued';
    task.nodeId = null;
    task.startTime = null;
    task.preemptCount += 1;
    this.preempts += 1;
    this.queue.push(task.id);
  }

  private tryPreemptFor(task: Task): boolean {
    // Find a node where preempting lower-priority tasks frees enough room
    for (const node of this.nodes) {
      const victims = node.running
        .map((id) => this.tasks.get(id)!)
        .filter((t) => t.priority < task.priority)
        .sort((a, b) => a.priority - b.priority || b.remaining - a.remaining);
      if (victims.length === 0) continue;
      // Try preempting greedily
      const saved = { ...node.used };
      const toPreempt: Task[] = [];
      let cpu = node.used.cpu;
      let mem = node.used.mem;
      let gpu = node.used.gpu;
      for (const v of victims) {
        toPreempt.push(v);
        cpu -= v.resources.cpu;
        mem -= v.resources.mem;
        gpu -= v.resources.gpu;
        if (
          cpu + task.resources.cpu <= node.capacity.cpu + 1e-9 &&
          mem + task.resources.mem <= node.capacity.mem + 1e-9 &&
          gpu + task.resources.gpu <= node.capacity.gpu + 1e-9
        ) {
          for (const p of toPreempt) this.preempt(p);
          this.assign(task, node.id);
          return true;
        }
      }
      // restore unused — we didn't mutate used until preempt
      void saved;
    }
    return false;
  }

  private schedule() {
    const place = placers[this.algo];
    let guard = 0;
    while (guard++ < 500) {
      const queued = sortQueue(
        this.algo,
        this.queue.map((id) => this.tasks.get(id)!).filter(Boolean),
      );
      if (queued.length === 0) break;
      let progressed = false;
      for (const task of queued) {
        if (!this.queue.includes(task.id)) continue;
        const nodeId = place(task, this.nodes);
        if (nodeId != null) {
          this.assign(task, nodeId);
          progressed = true;
          break;
        }
        if (this.algo === 'priorityPreempt' && this.tryPreemptFor(task)) {
          progressed = true;
          break;
        }
      }
      if (!progressed) break;
    }
  }

  private finish(task: Task) {
    if (task.nodeId != null) {
      const node = this.nodes[task.nodeId]!;
      node.running = node.running.filter((id) => id !== task.id);
      recomputeUsed(node, this.tasks);
    }
    task.state = 'done';
    task.finishTime = this.time;
    task.nodeId = null;
    const wait = (task.startTime ?? this.time) - task.arrival;
    task.waitAccum = Math.max(0, wait);
  }

  step(dt: number) {
    const end = this.time + dt;
    // arrivals (Poisson-ish via exponential gaps)
    while (this.nextArrival <= end) {
      this.time = this.nextArrival;
      this.spawnTask();
      const gap = -Math.log(1 - this.rng.next()) / Math.max(0.01, this.config.arrivalRate);
      this.nextArrival += Math.max(0.05, gap);
    }
    this.time = end;

    // run tasks
    for (const node of this.nodes) {
      for (const id of [...node.running]) {
        const t = this.tasks.get(id);
        if (!t) continue;
        t.remaining -= dt;
        if (t.remaining <= 0) this.finish(t);
      }
    }

    this.schedule();

    if (this.time - this.lastWaitSample >= 0.5) {
      this.lastWaitSample = this.time;
      const waits = this.queue
        .map((id) => this.tasks.get(id)!)
        .filter(Boolean)
        .map((t) => this.time - t.arrival);
      const avg =
        waits.length === 0 ? 0 : waits.reduce((a, b) => a + b, 0) / waits.length;
      this.waitHistory = [...this.waitHistory.slice(-59), avg];
    }
  }

  metrics(): Metrics {
    const cap = this.nodes.reduce(
      (a, n) => ({
        cpu: a.cpu + n.capacity.cpu,
        mem: a.mem + n.capacity.mem,
        gpu: a.gpu + n.capacity.gpu,
      }),
      emptyUsed(),
    );
    const used = this.nodes.reduce(
      (a, n) => ({
        cpu: a.cpu + n.used.cpu,
        mem: a.mem + n.used.mem,
        gpu: a.gpu + n.used.gpu,
      }),
      emptyUsed(),
    );
    const done = [...this.tasks.values()].filter((t) => t.state === 'done');
    const waits = done.map((t) => t.waitAccum).sort((a, b) => a - b);
    const unschedulable = [...this.tasks.values()].filter(
      (t) => t.state === 'unschedulable',
    ).length;
    return {
      utilCpu: cap.cpu ? used.cpu / cap.cpu : 0,
      utilMem: cap.mem ? used.mem / cap.mem : 0,
      utilGpu: cap.gpu ? used.gpu / cap.gpu : 0,
      waitP50: percentile(waits, 0.5),
      waitP95: percentile(waits, 0.95),
      throughput: this.time > 0 ? done.length / this.time : 0,
      preempts: this.preempts,
      unschedulable,
      completed: done.length,
      waitHistory: [...this.waitHistory],
    };
  }

  snapshot(): SimSnapshot {
    const all = [...this.tasks.values()];
    return {
      time: this.time,
      nodes: this.nodes.map((n) => ({
        ...n,
        capacity: { ...n.capacity },
        used: { ...n.used },
        running: [...n.running],
      })),
      queue: this.queue.map((id) => this.tasks.get(id)!).filter(Boolean),
      running: all.filter((t) => t.state === 'running'),
      done: all.filter((t) => t.state === 'done'),
      metrics: this.metrics(),
      algo: this.algo,
    };
  }
}

export const DEFAULT_CONFIG: SimConfig = {
  nodeCount: 6,
  capacity: { cpu: 8, mem: 32, gpu: 1 },
  arrivalRate: 2.4,
  seed: 4242,
  durationDist: 'bimodal',
  resourceDist: 'bimodal',
  priorityMix: 'skewHigh',
};
