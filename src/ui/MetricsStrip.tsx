import type { Metrics } from '../sim/types';

export function MetricsStrip({ metrics }: { metrics: Metrics }) {
  const util =
    (metrics.utilCpu + metrics.utilMem + metrics.utilGpu) / 3;
  const history =
    metrics.waitHistory.length >= 2
      ? metrics.waitHistory
      : Array.from({ length: 24 }, () => 0);
  const max = Math.max(...history, 1);
  const points = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * 120;
      const y = 26 - (v / max) * 22;
      return `${x},${y}`;
    })
    .join(' ');
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
      <div className="spark-wrap" title="wait over time">
        <span className="spark-label">wait</span>
        <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
          <line x1="0" y1="26" x2="120" y2="26" stroke="currentColor" strokeOpacity="0.25" />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
}
