import type { AlgoId, Node, SimSnapshot } from '../sim/types';
import { ALGO_LABELS } from '../sim/types';

export function CompareLanes({
  lanes,
  onRemove,
  onAdd,
  available,
  onMove,
}: {
  lanes: { algo: AlgoId; snap: SimSnapshot }[];
  onRemove: (algo: AlgoId) => void;
  onAdd: (algo: AlgoId) => void;
  available: AlgoId[];
  onMove: (algo: AlgoId, dir: -1 | 1) => void;
}) {
  return (
    <div className="compare">
      <div className="compare-head">
        <span className="seed-badge">shared seed stream</span>
        {available.length > 0 && lanes.length < 5 && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value as AlgoId);
              e.target.value = '';
            }}
          >
            <option value="">+ add lane</option>
            {available.map((a) => (
              <option key={a} value={a}>
                {ALGO_LABELS[a]}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="lane-grid">
        <div className="lane-row lane-header">
          <div>Algorithm</div>
          <div>Queue</div>
          <div>Nodes</div>
          <div>Metrics</div>
        </div>
        {lanes.map(({ algo, snap }, idx) => (
          <div
            className="lane-row"
            key={algo}
            style={{ ['--lane-accent' as string]: laneColor(algo) }}
          >
            <div className="lane-label">
              <span className="lane-accent">{ALGO_LABELS[algo]}</span>
              <div className="lane-chrome">
                <button type="button" disabled={idx === 0} onClick={() => onMove(algo, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  disabled={idx === lanes.length - 1}
                  onClick={() => onMove(algo, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={lanes.length <= 1}
                  onClick={() => onRemove(algo)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="lane-queue">
              {snap.queue.slice(0, 24).map((t) => (
                <div key={t.id} className="q-item prio-neutral" />
              ))}
            </div>
            <div className="lane-nodes">
              {snap.nodes.map((n) => (
                <div key={n.id} className="node-strip" title={`node-${n.id}`}>
                  <div className="strip-fill" style={{ width: `${nodeUtil(n) * 100}%` }} />
                  <span className="strip-pills">
                    {n.running.slice(0, 4).map((id) => (
                      <i key={id} className="mini-pill" />
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="lane-metrics">
              <span>util {(avgUtil(snap) * 100).toFixed(0)}%</span>
              <span>wait {snap.metrics.waitP50.toFixed(1)}s</span>
              <span>preempts {snap.metrics.preempts}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function nodeUtil(n: Node) {
  const parts = [
    n.capacity.cpu ? n.used.cpu / n.capacity.cpu : 0,
    n.capacity.mem ? n.used.mem / n.capacity.mem : 0,
    n.capacity.gpu ? n.used.gpu / n.capacity.gpu : 0,
  ];
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function avgUtil(snap: SimSnapshot) {
  return (snap.metrics.utilCpu + snap.metrics.utilMem + snap.metrics.utilGpu) / 3;
}

function laneColor(algo: AlgoId): string {
  const map: Record<AlgoId, string> = {
    fifo: '#6b8cae',
    firstFit: '#5a9e8f',
    bestFit: '#7a9e5a',
    priorityPreempt: '#b07a4a',
    fairShare: '#8a6aaa',
    sjf: '#aa6a7a',
  };
  return map[algo];
}
