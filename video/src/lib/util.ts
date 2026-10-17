export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t: number, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
/** progress of a tween that starts at t0 (seconds) and lasts dur, eased */
export const prog = (t: number, t0: number, dur: number, ease: (x: number) => number = easeOutCubic) => ease(clamp((t - t0) / dur, 0, 1));
/** deterministic PRNG */
export function rng(seed: number) {
  let a = (seed * 1103515245 + 12345) >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** critically-ish damped spring, time based (seconds). overshoot via lower damping */
export function springT(t: number, { stiffness = 170, damping = 14, mass = 1 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass); const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) { const wd = w0 * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t)); }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
/** 1 at t0, decaying shake amplitude */
export const decay = (t: number, t0: number, dur: number) => (t < t0 || t > t0 + dur ? 0 : 1 - (t - t0) / dur);
export const shakeXY = (t: number, t0: number, dur: number, amp: number, seed = 1) => {
  const d = decay(t, t0, dur); if (!d) return { x: 0, y: 0 };
  const k = (t - t0) * 60; return { x: amp * d * Math.sin(k * 7.3 + seed) * Math.cos(k * 3.1), y: amp * d * Math.cos(k * 6.1 + seed * 2) };
};
