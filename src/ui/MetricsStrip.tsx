import type { Metrics } from '../sim/types';

export function MetricsStrip({ metrics }: { metrics: Metrics }) {
  const util =
    (metrics.utilCpu + metrics.utilMem + metrics.utilGpu) / 3;
  return (
    <div className="metrics-strip">
      <div className="metric-chips">
        <span className="chip">util {(util * 100).toFixed(0)}%</span>
        <span className="chip">wait p50 {metrics.waitP50.toFixed(1)}s</span>
        <span className="chip">wait p95 {metrics.waitP95.toFixed(1)}s</span>
        <span className="chip">throughput {metrics.throughput.toFixed(2)}/s</span>
        <span className="chip">preempts {metrics.preempts}</span>
        {metrics.unschedulable > 0 && (
          <span className="chip warn">unschedulable {metrics.unschedulable}</span>
        )}
      </div>
      <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
        {metrics.waitHistory.length > 1 && (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points={metrics.waitHistory
              .map((v, i) => {
                const max = Math.max(...metrics.waitHistory, 1);
                const x = (i / (metrics.waitHistory.length - 1)) * 120;
                const y = 26 - (v / max) * 24;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        )}
      </svg>
    </div>
  );
}
