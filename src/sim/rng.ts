export function createRng(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    float(min: number, max: number) {
      return min + (max - min) * next();
    },
    int(min: number, max: number) {
      return Math.floor(min + (max - min + 1) * next());
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(next() * arr.length)]!;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
