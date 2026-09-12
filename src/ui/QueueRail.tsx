import type { Task } from '../sim/types';

const PRIO_CLASS = ['prio-0', 'prio-1', 'prio-2'];

export function QueueRail({
  queue,
  colorByPriority,
}: {
  queue: Task[];
  colorByPriority: boolean;
}) {
  return (
    <aside className="queue-rail">
      <div className="queue-title">Queue ({queue.length})</div>
      <div className="queue-silhouette">
        {queue.slice(0, 40).map((t) => (
          <div
            key={t.id}
            className={`q-item ${colorByPriority ? PRIO_CLASS[t.priority] : 'prio-neutral'}`}
            title={`t${t.id}`}
          />
        ))}
        {queue.length === 0 && <div className="q-empty">empty</div>}
      </div>
    </aside>
  );
}
