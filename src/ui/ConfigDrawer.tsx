import type { AlgoId, SimConfig } from '../sim/types';
import { ALGO_LABELS } from '../sim/types';

export function ConfigDrawer({
  open,
  onClose,
  config,
  onChange,
  singleAlgo,
  onSingleAlgo,
  compareAlgos,
  onCompareAlgos,
}: {
  open: boolean;
  onClose: () => void;
  config: SimConfig;
  onChange: (c: SimConfig) => void;
  singleAlgo: AlgoId;
  onSingleAlgo: (a: AlgoId) => void;
  compareAlgos: AlgoId[];
  onCompareAlgos: (a: AlgoId[]) => void;
}) {
  if (!open) return null;
  const set = <K extends keyof SimConfig>(key: K, value: SimConfig[K]) =>
    onChange({ ...config, [key]: value });

  const toggleCompare = (id: AlgoId) => {
    if (compareAlgos.includes(id)) {
      if (compareAlgos.length <= 1) return;
      onCompareAlgos(compareAlgos.filter((x) => x !== id));
    } else if (compareAlgos.length < 5) {
      onCompareAlgos([...compareAlgos, id]);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Config</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="hint">Changing node count or capacity needs Reset.</p>

        <section>
          <h3>Cluster</h3>
          <label>
            Nodes N
            <input
              type="range"
              min={1}
              max={24}
              value={config.nodeCount}
              onChange={(e) => set('nodeCount', Number(e.target.value))}
            />
            <span>{config.nodeCount}</span>
          </label>
          <label>
            CPU / node
            <input
              type="number"
              min={1}
              value={config.capacity.cpu}
              onChange={(e) =>
                set('capacity', { ...config.capacity, cpu: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Mem / node
            <input
              type="number"
              min={1}
              value={config.capacity.mem}
              onChange={(e) =>
                set('capacity', { ...config.capacity, mem: Number(e.target.value) })
              }
            />
          </label>
          <label>
            GPU / node
            <input
              type="number"
              min={0}
              value={config.capacity.gpu}
              onChange={(e) =>
                set('capacity', { ...config.capacity, gpu: Number(e.target.value) })
              }
            />
          </label>
        </section>

        <section>
          <h3>Workload</h3>
          <label>
            Arrival λ
            <input
              type="range"
              min={0.2}
              max={4}
              step={0.1}
              value={config.arrivalRate}
              onChange={(e) => set('arrivalRate', Number(e.target.value))}
            />
            <span>{config.arrivalRate.toFixed(1)}</span>
          </label>
          <label>
            Duration
            <select
              value={config.durationDist}
              onChange={(e) =>
                set('durationDist', e.target.value as SimConfig['durationDist'])
              }
            >
              <option value="uniform">uniform</option>
              <option value="lognormal">lognormal</option>
              <option value="bimodal">bimodal</option>
            </select>
          </label>
          <label>
            Resources
            <select
              value={config.resourceDist}
              onChange={(e) =>
                set('resourceDist', e.target.value as SimConfig['resourceDist'])
              }
            >
              <option value="uniform">uniform</option>
              <option value="lognormal">lognormal</option>
              <option value="bimodal">bimodal</option>
            </select>
          </label>
          <label>
            Priority mix
            <select
              value={config.priorityMix}
              onChange={(e) =>
                set('priorityMix', e.target.value as SimConfig['priorityMix'])
              }
            >
              <option value="flat">flat</option>
              <option value="mostlyLow">mostly low</option>
              <option value="skewHigh">skew high</option>
            </select>
          </label>
        </section>

        <section>
          <h3>Policy</h3>
          <label>
            Single algorithm
            <select
              value={singleAlgo}
              onChange={(e) => onSingleAlgo(e.target.value as AlgoId)}
            >
              {(Object.keys(ALGO_LABELS) as AlgoId[]).map((id) => (
                <option key={id} value={id}>
                  {ALGO_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <div className="compare-picks">
            Compare lanes (max 5)
            {(Object.keys(ALGO_LABELS) as AlgoId[]).map((id) => (
              <label key={id} className="check">
                <input
                  type="checkbox"
                  checked={compareAlgos.includes(id)}
                  onChange={() => toggleCompare(id)}
                />
                {ALGO_LABELS[id]}
              </label>
            ))}
          </div>
          <label>
            Seed
            <input
              type="number"
              value={config.seed}
              onChange={(e) => set('seed', Number(e.target.value))}
            />
          </label>
        </section>
      </div>
    </div>
  );
}
