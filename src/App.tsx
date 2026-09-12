import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, Simulator } from './sim/engine';
import type { AlgoId, SimConfig, SimSnapshot } from './sim/types';
import { ALGO_LABELS } from './sim/types';
import { CompareLanes } from './ui/CompareLanes';
import { ConfigDrawer } from './ui/ConfigDrawer';
import { MetricsStrip } from './ui/MetricsStrip';
import { NodeCard } from './ui/NodeCard';
import { QueueRail } from './ui/QueueRail';
import './App.css';

type Mode = 'single' | 'compare';

const ALL_ALGOS = Object.keys(ALGO_LABELS) as AlgoId[];

export default function App() {
  const [mode, setMode] = useState<Mode>('single');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const [draftConfig, setDraftConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [appliedConfig, setAppliedConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [singleAlgo, setSingleAlgo] = useState<AlgoId>('bestFit');
  const [compareAlgos, setCompareAlgos] = useState<AlgoId[]>([
    'fifo',
    'bestFit',
    'fairShare',
  ]);
  const [singleSnap, setSingleSnap] = useState<SimSnapshot | null>(null);
  const [compareSnaps, setCompareSnaps] = useState<
    { algo: AlgoId; snap: SimSnapshot }[]
  >([]);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

  const singleRef = useRef<Simulator | null>(null);
  const compareRef = useRef<Map<AlgoId, Simulator>>(new Map());
  const preemptSeen = useRef(0);

  const rebuild = useCallback(() => {
    const cfg = { ...draftConfig, capacity: { ...draftConfig.capacity } };
    setAppliedConfig(cfg);
    singleRef.current = new Simulator(cfg, singleAlgo);
    const map = new Map<AlgoId, Simulator>();
    for (const a of compareAlgos) {
      map.set(a, new Simulator({ ...cfg, capacity: { ...cfg.capacity } }, a));
    }
    compareRef.current = map;
    preemptSeen.current = 0;
    setSingleSnap(singleRef.current.snapshot());
    setCompareSnaps(
      compareAlgos.map((a) => ({ algo: a, snap: map.get(a)!.snapshot() })),
    );
  }, [draftConfig, singleAlgo, compareAlgos]);

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (singleRef.current) singleRef.current.setAlgo(singleAlgo);
  }, [singleAlgo]);

  useEffect(() => {
    const cfg = appliedConfig;
    const map = compareRef.current;
    for (const a of compareAlgos) {
      if (!map.has(a)) {
        map.set(a, new Simulator({ ...cfg, capacity: { ...cfg.capacity } }, a));
        // catch up roughly by not replaying — fresh lane
      }
    }
    for (const key of [...map.keys()]) {
      if (!compareAlgos.includes(key)) map.delete(key);
    }
  }, [compareAlgos, appliedConfig]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) {
        const dt = dtReal * speed * 2; // sim seconds
        if (mode === 'single' && singleRef.current) {
          const before = singleRef.current.preempts;
          singleRef.current.step(dt);
          const snap = singleRef.current.snapshot();
          setSingleSnap(snap);
          if (singleRef.current.preempts > before) {
            const newly = snap.queue.filter((t) => t.preemptCount > 0).slice(0, 5);
            setFlashIds(new Set(newly.map((t) => t.id)));
            window.setTimeout(() => setFlashIds(new Set()), 400);
          }
        } else if (mode === 'compare') {
          const out: { algo: AlgoId; snap: SimSnapshot }[] = [];
          for (const a of compareAlgos) {
            const sim = compareRef.current.get(a);
            if (!sim) continue;
            sim.step(dt);
            out.push({ algo: a, snap: sim.snapshot() });
          }
          setCompareSnaps(out);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, mode, compareAlgos]);

  const taskMap = useMemo(() => {
    const m = new Map();
    if (!singleSnap) return m;
    for (const t of [...singleSnap.queue, ...singleSnap.running, ...singleSnap.done]) {
      m.set(t.id, t);
    }
    // also grab from nodes
    for (const n of singleSnap.nodes) {
      for (const id of n.running) {
        const t = singleSnap.running.find((x) => x.id === id);
        if (t) m.set(id, t);
      }
    }
    return m as Map<number, import('./sim/types').Task>;
  }, [singleSnap]);

  const compactNodes = appliedConfig.nodeCount > 12;

  const moveLane = (algo: AlgoId, dir: -1 | 1) => {
    setCompareAlgos((list) => {
      const i = list.indexOf(algo);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Scheduler Show</div>
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'single' ? 'active' : ''}
            onClick={() => setMode('single')}
          >
            Single
          </button>
          <button
            type="button"
            className={mode === 'compare' ? 'active' : ''}
            onClick={() => setMode('compare')}
          >
            Compare
          </button>
        </div>
        <div className="transport">
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <label>
            speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
          <button type="button" onClick={rebuild}>
            Reset
          </button>
          <button type="button" onClick={() => setDrawer(true)}>
            Config
          </button>
        </div>
      </header>

      {mode === 'single' && singleSnap && (
        <main className="single-main">
          <QueueRail queue={singleSnap.queue} colorByPriority />
          <div className="stage">
            <div className={`node-grid ${compactNodes ? 'compact' : ''}`}>
              {singleSnap.nodes.map((n) => (
                <NodeCard key={n.id} node={n} tasks={taskMap} flashIds={flashIds} />
              ))}
            </div>
            <MetricsStrip metrics={singleSnap.metrics} />
            <div className="algo-tag">{ALGO_LABELS[singleAlgo]} · t={singleSnap.time.toFixed(1)}s</div>
          </div>
        </main>
      )}

      {mode === 'compare' && (
        <main className="compare-main">
          <CompareLanes
            lanes={compareSnaps}
            onRemove={(a) =>
              setCompareAlgos((xs) => (xs.length > 1 ? xs.filter((x) => x !== a) : xs))
            }
            onAdd={(a) =>
              setCompareAlgos((xs) => (xs.includes(a) || xs.length >= 5 ? xs : [...xs, a]))
            }
            available={ALL_ALGOS.filter((a) => !compareAlgos.includes(a))}
            onMove={moveLane}
          />
        </main>
      )}

      <ConfigDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        config={draftConfig}
        onChange={setDraftConfig}
        singleAlgo={singleAlgo}
        onSingleAlgo={setSingleAlgo}
        compareAlgos={compareAlgos}
        onCompareAlgos={setCompareAlgos}
      />
    </div>
  );
}
