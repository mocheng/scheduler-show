import type { Resources } from '../sim/types';

export function ResourceBars({
  used,
  capacity,
  compact = false,
}: {
  used: Resources;
  capacity: Resources;
  compact?: boolean;
}) {
  const rows: { key: keyof Resources; label: string }[] = [
    { key: 'cpu', label: 'CPU' },
    { key: 'mem', label: 'Mem' },
    { key: 'gpu', label: 'GPU' },
  ];
  return (
    <div className={`bars ${compact ? 'bars-compact' : ''}`}>
      {rows.map(({ key, label }) => {
        const pct = capacity[key] ? Math.min(1, used[key] / capacity[key]) : 0;
        return (
          <div className="bar-row" key={key}>
            {!compact && <span className="bar-label">{label}</span>}
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${pct * 100}%`,
                  opacity: 0.35 + pct * 0.65,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
