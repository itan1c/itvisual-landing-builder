import React from "react";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, lerp, prog, springT } from "../lib/util";
import { Chunk } from "./Captions";
export const K = { yellow: "#f7c948", red: "#ff4d4d", green: "#58d68d", white: "#ffffff", grey: "#6c6c6c" };
const OVERRIDE: Record<string, string> = { "РАЗМУТИЛСЯ": K.green, "ДИСКОРДЕ": K.yellow, "ОРУТ": K.red, "МАТЕРИТЬСЯ": K.red, "ПИЗДЕЦ": K.white, "МУРАВЬЯМИ": K.yellow, "ЕГИПТЯНЕ": K.yellow };
export const wordColor = (w: { t: string; st: string }) => { const u = w.t.toUpperCase().replace(/[.,!?]/g, ""); if (OVERRIDE[u]) return OVERRIDE[u]; if (w.st === "big") return K.yellow; if (w.st === "dim") return K.red; return K.white; };
/** Centered kinetic typography (used in the desert clip): each chunk replaces the previous, words spring in one by one, fast exit. */
export const Kinetic: React.FC<{ chunks: Chunk[]; t: number; left: number; right: number; top?: number; bottom?: number; base?: number; big?: number; shiftX?: number }> = ({ chunks, t, left, right, top = 0, bottom = 0, base = 96, big = 150, shiftX = 0 }) => {
  const EXIT = 0.14; let idx = -1; for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].s - 0.03) idx = i;
  if (idx < 0) return null; const cur = chunks[idx]; if (t >= cur.e + EXIT) return null;
  const nextStart = chunks[idx + 1]?.s ?? 1e9; const outAt = Math.min(cur.e + 0.02, nextStart - 0.05);
  const outP = t > outAt ? prog(t, outAt, EXIT, easeInCubic) : 0;
  const isBig = cur.w.some((w) => w.st === "big"); const size = isBig ? big : base;
  return (
    <div style={{ position: "absolute", left, right, top, bottom, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: `0 ${size * 0.28}px`, alignContent: "center", opacity: 1 - outP, transform: `translateX(${shiftX}px) scale(${1 - 0.08 * outP})`, fontFamily: F.display, fontWeight: 900, lineHeight: 1.05, textAlign: "center", textTransform: "uppercase" }}>
      {cur.w.map((w, i) => {
        const p = springT(t - (w.s - 0.03), { stiffness: isBig ? 230 : 300, damping: isBig ? 11 : 15 }); const on = t >= w.s - 0.03;
        const fs = w.st === "big" ? size : w.st === "dim" ? size * 0.7 : size; const color = wordColor(w);
        const shadow = "0 4px 0 #1b1420, 0 8px 0 #0d0a10, 0 18px 36px rgba(0,0,0,0.55)";
        return <span key={i} style={{ display: "inline-block", fontSize: fs, color, textShadow: shadow, opacity: on ? clamp(p * 1.5, 0, 1) : 0, transform: `translateY(${lerp(40, 0, p)}px) scale(${lerp(0.7, 1, p)}) rotate(${lerp(i % 2 ? 4 : -4, 0, p)}deg)`, whiteSpace: "nowrap", marginBottom: 6 }}>{w.t}</span>;
      })}
    </div>
  );
};
/** Right-side captions (sticker clip): one current chunk, words spring in as spoken; no previous line. */
export const Stack: React.FC<{ chunks: Chunk[]; t: number; left: number; width: number; top?: number; size?: number; hideAt?: number }> = ({ chunks, t, left, width, top = 150, size = 84, hideAt = 1e9 }) => {
  let idx = -1; for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].s - 0.03) idx = i;
  if (idx < 0) return null; const cur = chunks[idx]; const nextS = chunks[idx + 1]?.s ?? 1e9;
  const hide = Math.min(cur.e + 1.2, nextS - 0.04, hideAt); if (t >= hide) return null;   const fsFor = (c: Chunk) => { const n = c.w.reduce((a, w) => a + w.t.length + 1, 0); const big = c.w.some((w) => w.st === "big"); return big ? size * 1.45 : n > 30 ? size * 0.74 : n > 20 ? size * 0.86 : size; };
  const line = (c: Chunk, fs: number, animate: boolean, color?: string) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${fs * 0.26}px`, fontFamily: F.display, fontWeight: 900, fontSize: fs, lineHeight: 1.06, textTransform: "uppercase", letterSpacing: "-0.005em" }}>
      {c.w.map((w, i) => { const wp = animate ? springT(t - (w.s - 0.03), { stiffness: 320, damping: 16 }) : 1; const on = !animate || t >= w.s - 0.03; return <span key={i} style={{ display: "inline-block", color: color ?? wordColor(w), opacity: on ? clamp(wp * 1.6, 0, 1) : 0, transform: `translateY(${lerp(26, 0, wp)}px) scale(${lerp(0.75, 1, wp)})`, textShadow: "0 3px 0 #000, 0 10px 24px rgba(0,0,0,0.6)", whiteSpace: "nowrap", marginBottom: 2 }}>{w.t}</span>; })}
    </div>
  );
  const gone = t >= cur.e + 0.9 && idx === chunks.length - 1 ? prog(t, cur.e + 0.9, 0.4, easeInCubic) : 0;
  return (
    <>
      <div style={{ position: "absolute", left, width, top, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", opacity: 1 - gone }}>{line(cur, fsFor(cur), true)}</div>
    </>
  );
};
