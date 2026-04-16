// Simple deterministic noise for terrain
export function createNoise(seed) {
  const mask = 0xff;
  const size = mask + 1;
  const p = new Uint8Array(size * 2);

  let s = typeof seed === 'string' ? seed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  for (let i = 0; i < size; i++) p[i] = i;
  for (let i = 0; i < size; i++) {
    const j = Math.floor(random() * size);
    [p[i], p[j]] = [p[j], p[i]];
    p[i + size] = p[i];
  }

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  const grad = (hash, x, y, z) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x, y, z = 0) => {
    const xi = Math.floor(x) & mask;
    const yi = Math.floor(y) & mask;
    const zi = Math.floor(z) & mask;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const a = p[xi] + yi;
    const aa = p[a] + zi;
    const ab = p[a + 1] + zi;
    const b = p[xi + 1] + yi;
    const ba = p[b] + zi;
    const bb = p[b + 1] + zi;

    return lerp(w, lerp(v, lerp(u, grad(p[aa], xf, yf, zf),
                                  grad(p[ba], xf - 1, yf, zf)),
                           lerp(u, grad(p[ab], xf, yf - 1, zf),
                                  grad(p[bb], xf - 1, yf - 1, zf))),
                   lerp(v, lerp(u, grad(p[aa + 1], xf, yf, zf - 1),
                                  grad(p[ba + 1], xf - 1, yf, zf - 1)),
                           lerp(u, grad(p[ab + 1], xf, yf - 1, zf - 1),
                                  grad(p[bb + 1], xf - 1, yf - 1, zf - 1))));
  };
}
