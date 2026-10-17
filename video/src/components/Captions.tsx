import React from "react";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, lerp, prog, springT } from "../lib/util";
export type Word = { t: string; s: number; e: number; st: "n" | "big" | "dim"; raw?: string };
export type Chunk = { s: number; e: number; w: Word[] };
export const C = { text: "#f6f2ea", dim: "#8b8fa3", accent: "#ff9f2e", gold: "#ffd166", green: "#3ddc84", red: "#ff4d5e", blurple: "#6d70ff", bg: "#121420", panel: "#1a1d2b" };
/** Bottom karaoke-style captions: chunk pops in, each word lights up when spoken, fast exit. */
export const Captions: React.FC<{ chunks: Chunk[]; t: number; x?: number; bottom?: number; size?: number; maxWidth?: number }> = ({ chunks, t, x = 1180, bottom = 78, size = 46, maxWidth = 1100 }) => {
  const EXIT = 0.16;
  let idx = -1; for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].s - 0.04) idx = i;
  if (idx < 0) return null; const cur = chunks[idx]; if (t >= cur.e + EXIT) return null;
  const nextStart = chunks[idx + 1]?.s ?? 1e9;
  const outAt = Math.min(cur.e + 0.02, nextStart - 0.06);
  const inP = springT(t - (cur.s - 0.04), { stiffness: 260, damping: 18 });
  const outP = t > outAt ? prog(t, outAt, EXIT, easeInCubic) : 0;
  const scale = lerp(0.9, 1, inP) * (1 - 0.06 * outP), op = clamp(inP * 1.6, 0, 1) * (1 - outP), ty = lerp(16, 0, inP) - 10 * outP;
  const big = cur.w.length === 1 && cur.w[0].st === "big";
  return (
    <div style={{ position: "absolute", left: x, bottom, transform: `translateX(-50%) translateY(${ty}px) scale(${scale})`, opacity: op, transformOrigin: "50% 100%", maxWidth, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.32}px`, padding: big ? "6px 28px" : "12px 30px", borderRadius: 18, background: big ? "transparent" : "rgba(10,11,18,0.72)", boxShadow: big ? undefined : "0 8px 32px rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", fontFamily: F.body, fontWeight: 600, fontSize: size, lineHeight: 1.25, whiteSpace: "nowrap" }}>
      {cur.w.map((w, i) => {
        const on = t >= w.s - 0.02; const wp = springT(t - (w.s - 0.02), { stiffness: 320, damping: 16 });
        const active = on && t < w.e + 0.05;
        const dim = w.st === "dim";
        const color = w.st === "big" ? C.accent : active ? C.accent : on ? C.text : "rgba(246,242,234,0.38)";
        const fs = w.st === "big" ? size * 1.7 : dim ? size * 0.78 : size;
        return (
          <span key={i} style={{ display: "inline-block", color: dim ? (on ? C.dim : "rgba(139,143,163,0.35)") : color, fontSize: fs, fontFamily: w.st === "big" ? F.display : F.body, fontWeight: w.st === "big" ? 900 : 600, transform: `translateY(${lerp(10, 0, wp)}px) scale(${lerp(0.86, 1, wp) * (active && !dim ? 1.06 : 1)})`, opacity: on ? 1 : 0.9, transition: "none", letterSpacing: w.st === "big" ? "-0.01em" : 0 }}>{w.t}</span>
        );
      })}
    </div>
  );
};
