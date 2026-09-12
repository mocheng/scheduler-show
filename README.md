# Scheduler Show

Interactive demo of cluster scheduling algorithms on multi-resource nodes (CPU, memory, GPU).

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Modes

- **Single** — one policy; node cards with CPU/Mem/GPU bars; priority-colored tasks; queue rail + metrics.
- **Compare** — shared seeded arrival stream across fixed-width algo lanes (default 3, max 5).

## Algorithms

FIFO, First Fit, Best Fit, Priority + Preemption, Fair Share, SJF.

## Config

Open **Config** drawer for N, capacities, arrival rate, distributions, seed. Changing N/capacity requires **Reset**.

Local git on the assistant computer — sync path TBD.
