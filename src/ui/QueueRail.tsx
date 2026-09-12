import type { Task } from '../sim/types';

const PRIO_CLASS = ['prio-0', 'prio-1', 'prio-2'];
const SLOT_COUNT = 12;

export function QueueRail({
  queue,
  colorByPriority,
}: {
  queue: Task[];
  colorByPriority: boolean;
}) {
  const shown = queue.slice(0, 40);
  const placeholders = Math.max(0, SLOT_COUNT - shown.length);
  return (
    <aside className="queue-rail">
      <div className="queue-title">Queue ({queue.length})</div>
      <div className="queue-silhouette">
        {shown.map((t) => (
          <div
            key={t.id}
            className={`q-item ${colorByPriority ? PRIO_CLASS[t.priority] : 'prio-neutral'}`}
            title={`t${t.id}`}
          />
        ))}
        {Array.from({ length: placeholders }, (_, i) => (
          <div key={`slot-${i}`} className="q-item q-slot" />
        ))}
      </div>
    </aside>
  );
}
