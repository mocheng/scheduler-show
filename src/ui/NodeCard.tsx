import type { Node, Task } from '../sim/types';
import { ResourceBars } from './ResourceBars';

const PRIO_CLASS = ['prio-0', 'prio-1', 'prio-2'];

export function NodeCard({
  node,
  tasks,
  flashIds,
}: {
  node: Node;
  tasks: Map<number, Task>;
  flashIds: Set<number>;
}) {
  const running = node.running.map((id) => tasks.get(id)).filter(Boolean) as Task[];
  return (
    <div className={`node-card ${running.length === 0 ? 'idle' : ''}`}>
      <div className="node-title">node-{node.id}</div>
      <ResourceBars used={node.used} capacity={node.capacity} />
      <div className="node-pills">
        {running.length === 0 && <span className="idle-dash">idle</span>}
        {running.map((t) => (
          <span
            key={t.id}
            className={`pill ${PRIO_CLASS[t.priority] ?? 'prio-0'} ${flashIds.has(t.id) ? 'flash' : ''}`}
            title={`t${t.id} prio=${t.priority} rem=${t.remaining.toFixed(1)}s cpu=${t.resources.cpu} mem=${t.resources.mem} gpu=${t.resources.gpu}`}
          >
            t{t.id}
          </span>
        ))}
      </div>
    </div>
  );
}
