import type { AlgoId, Node, Resources, Task } from '../types';

export function fits(node: Node, r: Resources): boolean {
  return (
    node.used.cpu + r.cpu <= node.capacity.cpu + 1e-9 &&
    node.used.mem + r.mem <= node.capacity.mem + 1e-9 &&
    node.used.gpu + r.gpu <= node.capacity.gpu + 1e-9
  );
}

function waste(node: Node, r: Resources): number {
  return (
    node.capacity.cpu - node.used.cpu - r.cpu +
    (node.capacity.mem - node.used.mem - r.mem) / 4 +
    (node.capacity.gpu - node.used.gpu - r.gpu) * 8
  );
}

export type PlaceFn = (task: Task, nodes: Node[]) => number | null;

export const placers: Record<AlgoId, PlaceFn> = {
  fifo(task, nodes) {
    for (const n of nodes) if (fits(n, task.resources)) return n.id;
    return null;
  },
  firstFit(task, nodes) {
    for (const n of nodes) if (fits(n, task.resources)) return n.id;
    return null;
  },
  bestFit(task, nodes) {
    let best: number | null = null;
    let bestWaste = Infinity;
    for (const n of nodes) {
      if (!fits(n, task.resources)) continue;
      const w = waste(n, task.resources);
      if (w < bestWaste) {
        bestWaste = w;
        best = n.id;
      }
    }
    return best;
  },
  priorityPreempt(task, nodes) {
    for (const n of nodes) if (fits(n, task.resources)) return n.id;
    return null;
  },
  fairShare(task, nodes) {
    const scored = nodes
      .filter((n) => fits(n, task.resources))
      .map((n) => ({
        id: n.id,
        score:
          n.capacity.cpu - n.used.cpu +
          (n.capacity.mem - n.used.mem) / 4 +
          (n.capacity.gpu - n.used.gpu) * 8 -
          n.running.length * 0.1,
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.id ?? null;
  },
  sjf(task, nodes) {
    for (const n of nodes) if (fits(n, task.resources)) return n.id;
    return null;
  },
};

export function sortQueue(algo: AlgoId, queue: Task[]): Task[] {
  const q = [...queue];
  switch (algo) {
    case 'priorityPreempt':
      return q.sort((a, b) => b.priority - a.priority || a.arrival - b.arrival);
    case 'sjf':
      return q.sort((a, b) => a.duration - b.duration || a.arrival - b.arrival);
    case 'fairShare': {
      const counts = new Map<number, number>();
      for (const t of q) counts.set(t.tenant, (counts.get(t.tenant) ?? 0) + 1);
      return q.sort(
        (a, b) =>
          (counts.get(a.tenant) ?? 0) - (counts.get(b.tenant) ?? 0) ||
          a.arrival - b.arrival,
      );
    }
    default:
      return q.sort((a, b) => a.arrival - b.arrival);
  }
}
