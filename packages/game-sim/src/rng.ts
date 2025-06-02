// cyrb128 hash -> 4 x 32-bit numbers
function cyrb128(seed: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < seed.length; i++) {
    k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const x = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, x];
}

// mulberry32 PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeededRandom {
  seed: string;
  next: () => number; // [0,1)
  nextInt: (maxExclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
}

export function createSeededRandom(seed: string): SeededRandom {
  const [a] = cyrb128(seed);
  const rand = mulberry32(a);
  const next = () => rand();
  const nextInt = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  const pick = <T>(arr: readonly T[]): T => arr[nextInt(arr.length)];
  return { seed, next, nextInt, pick };
}
