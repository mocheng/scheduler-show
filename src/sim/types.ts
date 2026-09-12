export type AlgoId =
  | 'fifo'
  | 'firstFit'
  | 'bestFit'
  | 'priorityPreempt'
  | 'fairShare'
  | 'sjf';

export const ALGO_LABELS: Record<AlgoId, string> = {
  fifo: 'FIFO',
  firstFit: 'First Fit',
  bestFit: 'Best Fit',
  priorityPreempt: 'Priority + Preempt',
  fairShare: 'Fair Share',
  sjf: 'SJF',
};

export interface Resources {
  cpu: number;
  mem: number;
  gpu: number;
}

export interface Task {
  id: number;
  arrival: number;
  duration: number;
  remaining: number;
  resources: Resources;
  priority: number;
  tenant: number;
  state: 'queued' | 'running' | 'done' | 'unschedulable';
  nodeId: number | null;
  startTime: number | null;
  finishTime: number | null;
  waitAccum: number;
  preemptCount: number;
}

export interface Node {
  id: number;
  capacity: Resources;
  used: Resources;
  running: number[];
}

export interface Metrics {
  utilCpu: number;
  utilMem: number;
  utilGpu: number;
  waitP50: number;
  waitP95: number;
  throughput: number;
  preempts: number;
  unschedulable: number;
  completed: number;
  waitHistory: number[];
}

export interface SimConfig {
  nodeCount: number;
  capacity: Resources;
  arrivalRate: number;
  seed: number;
  durationDist: 'uniform' | 'lognormal' | 'bimodal';
  resourceDist: 'uniform' | 'lognormal' | 'bimodal';
  priorityMix: 'flat' | 'mostlyLow' | 'skewHigh';
}

export interface SimSnapshot {
  time: number;
  nodes: Node[];
  queue: Task[];
  running: Task[];
  done: Task[];
  metrics: Metrics;
  algo: AlgoId;
}
