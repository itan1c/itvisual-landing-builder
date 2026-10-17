import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "../data/timeline1.json";
import words from "../data/words1.json";
import env from "../data/clip1_env.json";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, easeOutBack, lerp, prog, rng, springT } from "../lib/util";
import { Grain } from "../components/Grain";
import { Avatar, Gesture, Mood } from "../components/Avatar";
import { Ant } from "../components/Ant";
import { C, Chunk } from "../components/Captions";
import { Kinetic } from "../components/Kinetic";
const E = tl.events;
const W = 1920, H = 1080, HOR = 600;
// ---------- pyramids (2.5D) ----------
type PyrDef = { id: string; x: number; yb: number; w: number; h: number; t0: number };
const PYRS: PyrDef[] = [
  { id: "big", x: 1150, yb: 720, w: 330, h: 370, t0: E.pyr_big },
  { id: "mid", x: 700, yb: 752, w: 205, h: 225, t0: E.pyr_mid },
  { id: "small", x: 1590, yb: 770, w: 150, h: 160, t0: E.pyr_small },
];
const corners = (p: PyrDef, h = p.h) => ({ A: [p.x, p.yb - h] as const, L: [p.x - p.w, p.yb - p.w * 0.1] as const, Fr: [p.x + p.w * 0.22, p.yb + p.w * 0.24] as const, R: [p.x + p.w, p.yb - p.w * 0.14] as const });
// ---------- ridge (foreground dune) ----------
const ridge = (x: number) => 905 - 38 * Math.sin((x / W) * Math.PI * 1.1 + 0.4) + 14 * Math.sin((x / W) * Math.PI * 3.3) ;
const ridgePath = (() => { let d = `M0 ${ridge(0)}`; for (let x = 20; x <= W; x += 20) d += ` L${x} ${ridge(x).toFixed(1)}`; return d; })();
// ---------- swarm on the big pyramid faces ----------
const SWARM_N = 90;
type Leg = { a: [number, number]; b: [number, number]; t0: number; t1: number };
const bary = (r: () => number, P: readonly (readonly [number, number])[]) => { let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; } return [P[0][0] + (P[1][0] - P[0][0]) * u + (P[2][0] - P[0][0]) * v, P[0][1] + (P[1][1] - P[0][1]) * u + (P[2][1] - P[0][1]) * v] as [number, number]; };
const SWARM = Array.from({ length: SWARM_N }, (_, i) => {
  const r = rng(i * 611 + 7); const p = PYRS[0]; const c = corners(p); const left = r() < 0.62;
  const tri = left ? [c.A, c.L, c.Fr] : [c.A, c.Fr, c.R];
  const spawn = E.burst + i * 0.028 + r() * 0.05; const legs: Leg[] = []; let pos: [number, number] = [c.A[0], c.A[1] + 6]; let t = spawn;
  // first leg: slide down to a random point in the lower half of the face
  let next = bary(r, tri); next[1] = Math.max(next[1], c.A[1] + p.h * (0.45 + r() * 0.5));
  while (t < 40) { const d = Math.hypot(next[0] - pos[0], next[1] - pos[1]); const sp = 95 + r() * 70; legs.push({ a: pos, b: next, t0: t, t1: t + d / sp }); t += d / sp + r() * 0.35; pos = next; next = bary(r, tri); }
  return { spawn, legs, left, size: 2.6 + r() * 1.6, wig: r() * 9 };
});
// ---------- foreground ants on the ridge ----------
const FG_N = 11;
const FG = Array.from({ length: FG_N }, (_, i) => {
  const r = rng(i * 331 + 55); const fromRight = i % 2 === 0; const spawn = E.burst + 0.5 + i * 0.16 + r() * 0.1;
  const legs: { a: number; b: number; t0: number; t1: number }[] = []; let x = fromRight ? W + 60 : -60; let t = spawn;
  let next = fromRight ? 1500 - r() * 500 : 450 + r() * 500;
  while (t < 40) { const d = Math.abs(next - x); const sp = 150 + r() * 120; legs.push({ a: x, b: next, t0: t, t1: t + d / sp }); t += d / sp + 0.1 + r() * 0.5; x = next; next = 420 + r() * 1380; if (t > E.bonfire - 1.5 && next > 1080 && next < 1600) next = next < 1330 ? 500 + r() * 560 : 1620 + r() * 220; }
  return { spawn, legs, circ: i < 5, phase: (i / 5) * Math.PI * 2, scale: 1.9 + r() * 0.4, wig: r() * 7, dy: -2 + r() * 10 };
});
const FIRE_X = 1330;
const GESTURES: Gesture[] = [
  { pose: "point", t0: 7.0, dur: 1.1 }, { pose: "open", t0: 8.3, dur: 1.25 }, { pose: "shrug", t0: 11.12, dur: 0.75 },
  { pose: "circle", t0: 13.0, dur: 1.0 }, { pose: "circle", t0: 14.5, dur: 0.85 }, { pose: "handsup", t0: 15.64, dur: 1.95 },
  { pose: "chop", t0: 18.5, dur: 0.5 }, { pose: "facepalm", t0: 19.2, dur: 1.4 }, { pose: "point", t0: 20.76, dur: 1.9 }, { pose: "shrug", t0: 22.8, dur: 1.5 },
];
const MOODS: { t: number; m: Mood }[] = [
  { t: 0, m: { brow: -0.2, smile: 0.1, squint: 0 } }, { t: 7.0, m: { brow: 0.6, smile: 0.2, squint: 0 } }, { t: 9.6, m: { brow: 0.2, smile: 0, squint: 0.35 } },
  { t: 11.1, m: { brow: -0.6, smile: -0.3, squint: 0.2 } }, { t: 11.9, m: { brow: -0.4, smile: -0.1, squint: 0.3 } }, { t: 15.6, m: { brow: -1, smile: -0.5, squint: 0.1 } },
  { t: 17.8, m: { brow: -0.3, smile: 0.45, squint: 0.25 } }, { t: 20.7, m: { brow: 0.8, smile: 0.2, squint: 0 } }, { t: 22.7, m: { brow: 0.5, smile: 0.75, squint: 0.15 } },
];
const moodAt = (t: number): Mood => { let cur = MOODS[0].m, prev = MOODS[0].m, t0 = 0; for (const k of MOODS) { if (t >= k.t) { prev = cur; cur = k.m; t0 = k.t; } } const b = prog(t, t0, 0.35); return { brow: lerp(prev.brow, cur.brow, b), smile: lerp(prev.smile, cur.smile, b), squint: lerp(prev.squint, cur.squint, b) }; };
const YELLS = ["ЧЁ?!", "!!!", "#@$!", "АААА", "ТЫ ЧЁ", "МОЁ!!", "НЕ ТРОГАЙ", "ВАЛИ", "АЛЁ!"];
const STARS = Array.from({ length: 80 }, (_, i) => { const r = rng(i * 31 + 5); return { x: r() * W, y: r() * 470, s: 0.7 + r() * 1.5, f: 0.6 + r() * 1.6, p: r() * 6.3 }; });
const WIND = Array.from({ length: 46 }, (_, i) => { const r = rng(i * 77 + 3); return { y: 640 + r() * 300, sp: 520 + r() * 520, len: 40 + r() * 120, off: r() * 3000, op: 0.08 + r() * 0.16, th: 1 + r() * 1.4 }; });
const BIRDS = Array.from({ length: 7 }, (_, i) => { const r = rng(i * 13 + 1); return { dx: (i % 4) * 46 + r() * 20, dy: Math.floor(i / 4) * 30 + (i % 2) * 14 - 10, f: r() * 6 }; });
const PUFFS = Array.from({ length: 10 }, (_, i) => { const r = rng(i * 5 + 21); return { a: Math.PI + r() * Math.PI, v: 40 + r() * 90, r: 10 + r() * 22, life: 0.7 + r() * 0.5 }; });
const antTime = (t: number) => { const tf = t < E.frantic ? t : E.frantic + (t - E.frantic) * 1.7; const ts = E.frantic + (E.similar - E.frantic) * 1.7; return t >= E.similar ? ts : tf; };
function walkLegs<T extends { t0: number; t1: number }>(legs: T[], tau: number, get: (L: T, k: number) => [number, number, number]) {
  let last = legs[legs.length - 1];
  for (const L of legs) { if (tau < L.t0) return get(L, 0); if (tau <= L.t1) return get(L, (tau - L.t0) / (L.t1 - L.t0)); last = L; }
  return get(last, 1);
}
const Shadow: React.FC<{ p: PyrDef; t: number }> = ({ p, t }) => {
  const g = prog(t, p.t0, 0.6, (x) => easeOutBack(x, 1.15)); if (g <= 0) return null; const c = corners(p);
  return <polygon points={`${c.Fr[0]},${c.Fr[1]} ${c.R[0]},${c.R[1]} ${c.R[0] + p.h * 0.95 * g},${c.R[1] - p.w * 0.2} ${c.R[0] + p.h * 0.55 * g},${c.R[1] - p.w * 0.28}`} fill="#2a1830" opacity={0.42 * g} />;
};
const Pyramid: React.FC<{ p: PyrDef; t: number }> = ({ p, t }) => {
  const g = prog(t, p.t0, 0.6, (x) => easeOutBack(x, 1.15)); if (g <= 0) return null;
  const swell = p.id === "big" ? 1 + 0.07 * prog(t, E.shudder, E.burst - E.shudder, easeInCubic) * (t < E.burst ? 1 : 0) + (t >= E.burst ? 0.07 * (1 - springT(t - E.burst, { stiffness: 260, damping: 8 })) : 0) : 1;
  const pulse = (p.id === "big" ? 1 + 0.03 * Math.sin(Math.PI * prog(t, E.pyr_pulse, 0.45, (x) => x)) : 1) * swell;
  const c = corners(p, p.h * pulse); const rise = (1 - g) * p.h * 1.1;
  const dust = prog(t, p.t0 + 0.45, 0.7); const hole = p.id === "big" ? prog(t, E.burst, 0.3, easeOutBack) : 0;
  return (
    <g>
      <clipPath id={`clip-${p.id}`}><rect x={p.x - p.w * 1.2} y={-100} width={p.w * 2.4} height={c.Fr[1] + 100} /></clipPath>
      <g clipPath={`url(#clip-${p.id})`} transform={`translate(0 ${rise})`}>
        <polygon points={`${c.A[0]},${c.A[1]} ${c.L[0]},${c.L[1]} ${c.Fr[0]},${c.Fr[1]}`} fill={`url(#lit-${p.id})`} />
        <polygon points={`${c.A[0]},${c.A[1]} ${c.Fr[0]},${c.Fr[1]} ${c.R[0]},${c.R[1]}`} fill={`url(#dark-${p.id})`} />
        {/* brick courses */}
        {Array.from({ length: 9 }, (_, k) => { const y = c.A[1] + ((k + 1) / 10) * (c.Fr[1] - c.A[1]); const f = (y - c.A[1]) / (c.Fr[1] - c.A[1]); const xl = c.A[0] + (c.L[0] - c.A[0]) * f, xr = c.A[0] + (c.Fr[0] - c.A[0]) * f; return <line key={k} x1={xl} y1={c.A[1] + (c.L[1] - c.A[1]) * f} x2={xr} y2={y} stroke="#000" strokeWidth="1" opacity="0.08" />; })}
        <line x1={c.A[0]} y1={c.A[1]} x2={c.Fr[0]} y2={c.Fr[1]} stroke="#fff1c8" strokeWidth="2" opacity="0.35" />
        {hole > 0 && <ellipse cx={c.A[0]} cy={c.A[1] + 5} rx={14 * hole} ry={7 * hole} fill="#1d1020" />}
      </g>
      <defs>
        <linearGradient id={`lit-${p.id}`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#ffd27a" /><stop offset="1" stopColor="#d9893a" /></linearGradient>
        <linearGradient id={`dark-${p.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6e4062" /><stop offset="1" stopColor="#3e2440" /></linearGradient>
      </defs>
      {dust > 0 && dust < 1 && [0, 1, 2].map((k) => <ellipse key={k} cx={c.Fr[0] - p.w * 0.5 + k * p.w * 0.5} cy={c.Fr[1] - p.w * 0.1 - 10 * dust} rx={p.w * 0.35 * (0.4 + dust)} ry={p.w * 0.12 * (0.4 + dust)} fill="#f2c88c" opacity={0.5 * (1 - dust)} />)}
    </g>
  );
};
export const Desert: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const chunks = words as Chunk[]; const mouth = (env as number[])[Math.min(frame, env.length - 1)] ?? 0;
  const push = t / tl.duration; // 0..1 slow push-in
  const exitP = prog(t, E.exit, 0.45, easeInCubic);
  const camS = 1 + 0.07 * push + 2.2 * exitP; const camX = -30 * push + 10 * Math.sin(t * 0.35), camY = -10 * push + 4 * Math.sin(t * 0.27);
  const flash = t > E.burst ? 0.45 * Math.exp(-(t - E.burst) * 3) : 0;
  const layer = (par: number) => `translate(${960 + camX * par} ${HOR + camY * par}) scale(${1 + (camS - 1) * par}) translate(${-960} ${-HOR})`;
  const tau = antTime(t); const eyes = t >= E.similar && t < E.exit; const eyesP = springT(t - E.similar, { stiffness: 240, damping: 14 });
  // swarm dots
  const swarm: React.ReactNode[] = [];
  SWARM.forEach((s, i) => { if (t < s.spawn) return; const [x, y] = walkLegs(s.legs, tau, (L, k) => [lerp(L.a[0], L.b[0], k), lerp(L.a[1], L.b[1], k), 0]); const born = clamp((t - s.spawn) * 6, 0, 1); const wg = Math.sin(tau * 25 + s.wig) * 1.2; swarm.push(<ellipse key={i} cx={x + wg} cy={y} rx={s.size * born} ry={s.size * 0.7 * born} fill={s.left ? "#1a1114" : "#140c14"} />); });
  // foreground ants
  const fg: { x: number; y: number; dir: number; i: number; behind: boolean; walk: number; circ: boolean }[] = [];
  FG.forEach((a, i) => { if (t < a.spawn) return; const [x, , dir] = walkLegs(a.legs, tau, (L, k) => [lerp(L.a, L.b, k), 0, Math.sign(L.b - L.a)]); let px = x, py = ridge(x) - 4 + a.dy, behind = false, d = dir;
    if (a.circ && t > E.bonfire) { const b = prog(t, E.bonfire, 0.9); const th = 2.2 * (tau - antTime(E.bonfire)) + a.phase; const cx = FIRE_X + Math.cos(th) * 150, cy = ridge(FIRE_X) + Math.sin(th) * 34 - 4; px = lerp(px, cx, b); py = lerp(py, cy, b); behind = Math.sin(th) < 0 && b > 0.5; d = b > 0.5 ? -Math.sign(Math.sin(th + Math.PI / 2)) || 1 : dir; }
    fg.push({ x: px, y: py, dir: d || 1, i, behind, walk: tau * 19 + i, circ: a.circ && t > E.bonfire }); });
  const antEl = (a: (typeof fg)[0]) => (<g key={a.i} transform={`translate(${a.x} ${a.y}) scale(${FG[a.i].scale * a.dir} ${FG[a.i].scale}) rotate(${eyes ? 0 : Math.sin(a.walk * 0.5) * 3})`}>
    <Ant walk={eyes ? 0 : a.walk} eyes={eyes && eyesP > 0.3} color="#120c12" legW={2.3} />
    {a.circ && <path d="M4 -6 l10 -14 M14 -20 l-3 2 M14 -20 l-1 -3" stroke="#3a2a1a" strokeWidth="1.6" strokeLinecap="round" fill="none" />}
  </g>);
  // bubbles
  const bubbles: React.ReactNode[] = [];
  for (let k = 0; k < 9; k++) { const s0 = E.yell_start + k * 0.21, d = 0.55; if (t < s0 || t > s0 + d) continue; const a = fg[(k * 5 + 2) % Math.max(1, fg.length)]; if (!a) continue; const inP = springT(t - s0, { stiffness: 300, damping: 13 }); const outP = prog(t, s0 + d - 0.1, 0.1, easeInCubic); const sc = inP * (1 - outP); const txt = YELLS[k % YELLS.length];
    bubbles.push(<g key={k} transform={`translate(${a.x} ${a.y - 46}) scale(${sc})`}><path d="M-6 8 L0 20 L8 8 Z" fill="#fff" /><rect x={-txt.length * 8.6 - 14} y="-34" width={txt.length * 17.2 + 28} height="42" rx="10" fill="#fff" /><text x="0" y="-5" textAnchor="middle" fontFamily={F.display} fontWeight="900" fontSize="24" fill="#1b1407">{txt}</text></g>); }
  // bonfire
  const fireP = prog(t, E.bonfire, 0.5, (x) => easeOutBack(x, 1.6)); const fy = ridge(FIRE_X);
  const fire = fireP > 0 && (<g transform={`translate(${FIRE_X} ${fy}) scale(${fireP * 1.6})`}>
    <ellipse cx="0" cy="0" rx="120" ry="40" fill="#ff9f2e" opacity={0.12 + 0.04 * Math.sin(t * 11)} />
    <path d="M-20 4 l12 -9 M20 4 l-12 -9 M-12 7 l24 -5" stroke="#3e2711" strokeWidth="5" strokeLinecap="round" />
    {[0, 1, 2].map((k) => { const w = 1 + 0.18 * Math.sin(t * 17 + k * 2.1); const hh = (30 - k * 8) * (1 + 0.15 * Math.sin(t * 13 + k)); return <path key={k} d={`M${-10 + k * 4} 0 C ${-15 + k * 4} ${-hh * 0.5} ${-4 + k * 3} ${-hh * 0.6} ${k * 2 - 2} ${-hh} C ${6 - k * 2} ${-hh * 0.55} ${13 - k * 3} ${-hh * 0.4} ${10 - k * 3} 0 Z`} fill={["#ff8c1a", "#ffc23d", "#fff0a8"][k]} transform={`scale(${w} 1)`} />; })}
  </g>);
  // title etc
  const titleExit = prog(t, E.exit, 0.35, easeInCubic); const tagP = springT(t - E.tag_in, { stiffness: 210, damping: 11 }); const tagOp = clamp((t - E.tag_in) * 12, 0, 1); const titleBump = 1 + 0.05 * Math.sin(Math.PI * prog(t, E.tag_in, 0.35, (x) => x));
  const avP = springT(t - E.avatar_in, { stiffness: 150, damping: 14 }); const avExit = prog(t, E.exit + 0.05, 0.35, easeInCubic); const speaking = t >= E.speech_start - 0.1 && t < 24.4; const ring = speaking ? 0.3 + mouth * 0.7 : 0;
  const phP = springT(t - E.pharaoh_in, { stiffness: 170, damping: 15 }); const stampP = springT(t - E.check, { stiffness: 260, damping: 11 }); const simP = springT(t - E.similar, { stiffness: 220, damping: 12 }); const phWobble = t > E.similar ? Math.sin((t - E.similar) * 18) * 4 * Math.exp(-(t - E.similar) * 4) : 0; const phExit = prog(t, E.exit, 0.3, easeInCubic);
  const black = prog(t, E.exit + 0.12, 0.4, (x) => x);
  const horizonIn = prog(t, E.horizon, 1.2); const skyIn = prog(t, 0, 1.4);
  const birdsX = W + 200 - (t - 1.0) * 150;
  return (
    <AbsoluteFill style={{ background: "#0b0b16", overflow: "hidden" }}>
      <AbsoluteFill>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c0d1f" /><stop offset="0.45" stopColor="#2a2047" /><stop offset="0.8" stopColor="#5a3356" /><stop offset="1" stopColor="#8a4a52" /></linearGradient>
            <radialGradient id="glow" cx="0.12" cy="0.62" r="0.7"><stop offset="0" stopColor="#ffa040" stopOpacity="0.75" /><stop offset="0.35" stopColor="#ff7a3c" stopOpacity="0.25" /><stop offset="1" stopColor="#ff7a3c" stopOpacity="0" /></radialGradient>
            <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c98a52" /><stop offset="1" stopColor="#7a4a40" /></linearGradient>
            <linearGradient id="groundL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffb469" stopOpacity="0.55" /><stop offset="0.5" stopColor="#ffb469" stopOpacity="0" /></linearGradient>
            <linearGradient id="fgdune" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2238" /><stop offset="1" stopColor="#1a1020" /></linearGradient>
            <linearGradient id="dune1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6b4a5e" /><stop offset="1" stopColor="#4a3555" /></linearGradient>
            <linearGradient id="dune2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8d5a55" /><stop offset="1" stopColor="#5e3f52" /></linearGradient>
          </defs>
          {/* sky */}
          <g transform={layer(0.15)} opacity={skyIn}>
            <rect x="-200" y="-200" width={W + 400} height={HOR + 260} fill="url(#sky)" />
            {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={(0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.f + s.p))) * prog(t, 0.3 + i * 0.012, 0.8)} />)}
            <circle cx="1640" cy="150" r="44" fill="#ffe9c4" opacity="0.9" /><circle cx="1662" cy="138" r="40" fill="#1a1631" />
            {[0, 1, 2].map((k) => <ellipse key={k} cx={300 + k * 560 + ((t * 9 * (k + 1)) % 200)} cy={330 + k * 70} rx={240 + k * 60} ry={9 + k * 3} fill="#c27a86" opacity={0.18} />)}
            <rect x="-200" y="-200" width={W + 400} height={HOR + 260} fill="url(#glow)" opacity={horizonIn} />
            {/* birds */}
            {t > 1 && t < 12 && BIRDS.map((b, i) => { const x = birdsX + b.dx, y = 330 + b.dy + Math.sin(t * 1.3 + b.f) * 6; const fl = Math.sin(t * 9 + b.f) * 6; return <path key={i} d={`M${x - 11} ${y + fl} Q ${x} ${y - 4} ${x + 11} ${y + fl}`} stroke="#2a1a30" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />; })}
          </g>
          {/* far dunes */}
          <g transform={layer(0.3)} opacity={horizonIn}>
            <path d={`M-200 ${HOR + 40} C 200 ${HOR - 40}, 500 ${HOR - 70}, 900 ${HOR - 20} S 1500 ${HOR - 60}, ${W + 200} ${HOR - 10} L ${W + 200} ${HOR + 300} L -200 ${HOR + 300} Z`} fill="url(#dune1)" />
          </g>
          <g transform={layer(0.42)} opacity={horizonIn}>
            <path d={`M-200 ${HOR + 60} C 300 ${HOR + 10}, 700 ${HOR + 30}, 1100 ${HOR + 5} S 1600 ${HOR + 40}, ${W + 200} ${HOR + 20} L ${W + 200} ${HOR + 400} L -200 ${HOR + 400} Z`} fill="url(#dune2)" />
          </g>
          {/* ground + pyramids */}
          <g transform={layer(0.55)} opacity={horizonIn}>
            <rect x="-200" y={HOR + 40} width={W + 400} height={600} fill="url(#ground)" />
            <rect x="-200" y={HOR + 40} width={W + 400} height={600} fill="url(#groundL)" />
            {/* palms behind the pyramids */}
            {[[905, 700, 0.95], [955, 712, 0.75], [1470, 712, 0.8]].map(([x, y, sc], i) => <g key={i} transform={`translate(${x} ${y}) scale(${sc * prog(t, E.palms + i * 0.12, 0.5, (q) => easeOutBack(q, 1.5))})`} fill="#3a2440">
              <path d="M-4 0 C 4 -40 2 -80 -8 -118 L -14 -118 C -4 -80 -6 -40 -12 0 Z" />
              {[-170, -140, -110, -80, -50, -20, 8].map((a) => <path key={a} d="M0 0 C 14 -16 40 -22 70 -10 C 42 -8 20 -2 0 6 Z" transform={`translate(-10 -118) rotate(${a + Math.sin(t * 1.4 + a) * 2.5})`} />)}
              <circle cx="-12" cy="-114" r="7" /><circle cx="-4" cy="-110" r="6" />
            </g>)}
            {PYRS.map((p) => <Shadow key={`s${p.id}`} p={p} t={t} />)}
            {PYRS.map((p) => <Pyramid key={p.id} p={p} t={t} />)}
            {swarm}
            {/* sand puff from apex at burst */}
            {t > E.burst && PUFFS.map((p, i) => { const age = t - E.burst; if (age > p.life) return null; const c = corners(PYRS[0]); return <circle key={i} cx={c.A[0] + Math.cos(p.a) * p.v * age * 1.3} cy={c.A[1] - Math.abs(Math.sin(p.a)) * p.v * age + 60 * age * age} r={p.r * (0.5 + age)} fill="#f2c88c" opacity={0.5 * (1 - age / p.life)} />; })}
          </g>
          {/* wind streaks */}
          <g transform={layer(0.7)}>
            {WIND.map((w, i) => { const x = W + 200 - ((t * w.sp + w.off) % (W + 600)); return <line key={i} x1={x} y1={w.y} x2={x + w.len} y2={w.y - 2} stroke="#ffd9a0" strokeWidth={w.th} opacity={w.op * horizonIn} strokeLinecap="round" />; })}
          </g>
          {/* foreground dune + ants */}
          <g transform={layer(0.95)}>
            <path d={`${ridgePath} L${W} ${H + 200} L0 ${H + 200} Z`} fill="url(#fgdune)" opacity={prog(t, E.floor_in, 0.9)} />
            <path d={ridgePath} stroke="#ffb36b" strokeWidth="3" fill="none" opacity={0.45 * prog(t, E.floor_in, 0.9)} />
            {fg.filter((a) => a.behind).map(antEl)}
            {fire}
            {fg.filter((a) => !a.behind).map(antEl)}
            {bubbles}
          </g>
        </svg>
        {/* flash on burst */}
        <AbsoluteFill style={{ background: "#ffb36b", opacity: flash * 0.5, mixBlendMode: "screen" }} />
        {/* title */}
        <div style={{ position: "absolute", left: 76, top: 72, display: "flex", alignItems: "center", gap: 26, transform: `translateY(${-320 * titleExit}px)`, opacity: 1 - titleExit }}>
          <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 158, lineHeight: 1.05, letterSpacing: "-0.02em", display: "flex", transform: `scale(${titleBump})`, transformOrigin: "0 60%" }}>
            {"ПИРАМИДЫ".split("").map((ch, i) => { const p = springT(t - (E.title_in + i * 0.055), { stiffness: 190, damping: 13 }); return <span key={i} style={{ display: "inline-block", transform: `translateY(${lerp(-90, 0, p)}px) rotate(${lerp(-10, 0, p)}deg)`, opacity: clamp(p * 2, 0, 1), color: "#fff4e3", textShadow: "0 3px 0 #c9742e, 0 6px 0 #7a4221, 0 9px 0 #4a2614, 0 24px 40px rgba(0,0,0,0.55)" }}>{ch}</span>; })}
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 92, lineHeight: 1, color: "#1b1407", background: C.accent, padding: "10px 30px 14px", borderRadius: 18, transform: `rotate(${lerp(-10, -3, tagP)}deg) scale(${lerp(2.4, 1, tagP)}) skewX(-6deg)`, opacity: tagOp, boxShadow: "0 10px 40px rgba(255,159,46,0.35), 0 4px 0 #a85f12", transformOrigin: "40% 50%", whiteSpace: "nowrap" }}>= МУРАВЬИ</div>
        </div>
        {/* avatar card */}
        <div style={{ position: "absolute", left: 84, top: 700, transform: `translateY(${lerp(140, 0, avP) + 420 * avExit}px) rotate(${lerp(-6, 0, avP)}deg)`, opacity: clamp(avP * 1.5, 0, 1) * (1 - avExit), transformOrigin: "50% 100%" }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: 36, border: `4px solid ${C.green}`, opacity: ring, boxShadow: `0 0 ${18 + mouth * 24}px rgba(61,220,132,${0.35 + mouth * 0.4})` }} />
          <Avatar t={t} mouth={speaking ? mouth : 0} mood={moodAt(t)} gestures={GESTURES} look={0.25 + 0.15 * Math.sin(t * 0.9)} />
          <div style={{ position: "absolute", right: -14, bottom: -14, width: 54, height: 54, borderRadius: 27, background: speaking ? C.green : "#2a2f45", border: "4px solid #15121c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill={speaking ? "#0e2a1a" : "#8b8fa3"} /><path d="M6 11 a6 6 0 0 0 12 0 M12 17 v4 M8 21 h8" stroke={speaking ? "#0e2a1a" : "#8b8fa3"} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </div>
        </div>
        {/* pharaoh card */}
        {phP > 0 && (
          <div style={{ position: "absolute", left: 1290, top: 300, width: 570, transform: `translateX(${lerp(160, 0, phP) + 600 * phExit}px) rotate(${lerp(5, 0, phP) + phWobble}deg)`, opacity: clamp(phP * 1.5, 0, 1) * (1 - phExit), transformOrigin: "100% 50%" }}>
            <div style={{ background: "rgba(24,18,34,0.92)", border: "2px solid #4a3550", borderRadius: 26, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 16px 50px rgba(0,0,0,0.45)" }}>
              <PharaohMask size={120} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 40, color: "#fff4e3", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>ЕГИПТЯНЕ</div>
                <div style={{ fontFamily: F.mono, fontSize: 18, color: "#b89fa8", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>4 500 ЛЕТ НАЗАД</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: 120, justifyContent: "flex-end", transform: `scale(${simP})`, transformOrigin: "100% 50%" }}>
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 48, color: C.gold }}>≈</div>
                <svg width="64" height="40" viewBox="-20 -16 40 32"><g transform="rotate(-20)"><Ant walk={0} eyes scale={1.1} /></g></svg>
              </div>
            </div>
            {stampP > 0 && <div style={{ position: "absolute", right: -8, bottom: -34, fontFamily: F.display, fontWeight: 900, fontSize: 34, color: C.green, border: `4px solid ${C.green}`, borderRadius: 12, padding: "4px 14px", transform: `rotate(-9deg) scale(${lerp(1.8, 1, stampP)})`, opacity: clamp(stampP * 2, 0, 1), background: "rgba(10,8,16,0.8)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>НЕ ТАКИЕ ✓</div>}
          </div>
        )}
        <Kinetic chunks={chunks} t={t} left={400} right={400} top={300} bottom={300} base={100} big={160} shiftX={-210 * springT(t - E.pharaoh_in, { stiffness: 120, damping: 16 })} redFirst={false} />
      </AbsoluteFill>
      <Grain opacity={0.1} vignette={0.6} />
      <AbsoluteFill style={{ background: "#000", opacity: black, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
const PharaohMask: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <defs><pattern id="nemes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="10" height="10" fill="#e9bd4f" /><rect width="10" height="4" fill="#2f55c9" /></pattern></defs>
    <path d="M18 112 L18 60 C18 28 36 10 60 10 C84 10 102 28 102 60 L102 112 L84 112 L84 70 L36 70 L36 112 Z" fill="url(#nemes)" />
    <path d="M18 112 L18 60 C18 28 36 10 60 10 C84 10 102 28 102 60 L102 112 L84 112 L84 70 L36 70 L36 112 Z" fill="none" stroke="#9a7420" strokeWidth="2" />
    <path d="M38 40 C38 26 48 20 60 20 C72 20 82 26 82 40 L82 62 C82 80 72 90 60 90 C48 90 38 80 38 62 Z" fill="#c98b55" />
    <rect x="30" y="24" width="60" height="10" rx="4" fill="#e9bd4f" /><circle cx="60" cy="22" r="5" fill="#2f55c9" />
    <path d="M44 50 L56 50 M64 50 L76 50" stroke="#1b1410" strokeWidth="4" strokeLinecap="round" />
    <path d="M56 50 l4 -2 M64 50 l-4 -2 M44 50 l-6 -3 M76 50 l6 -3" stroke="#1b1410" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M52 74 C56 78 64 78 68 74" stroke="#5c3a20" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="54" y="88" width="12" height="24" rx="4" fill="#2f55c9" /><path d="M54 94 h12 M54 100 h12 M54 106 h12" stroke="#e9bd4f" strokeWidth="2" />
  </svg>
);
