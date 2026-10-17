import React from "react";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, lerp, prog, springT } from "../lib/util";
import { C, Chunk } from "./Captions";
/** Centered kinetic typography: each chunk replaces the previous, words spring in one by one, fast exit. */
export const Kinetic: React.FC<{ chunks: Chunk[]; t: number; left: number; right: number; top?: number; bottom?: number; base?: number; big?: number; finalAccent?: boolean; shiftX?: number; redFirst?: boolean }> = ({ chunks, t, left, right, top = 0, bottom = 0, base = 96, big = 150, finalAccent = false, shiftX = 0, redFirst = true }) => {
  const EXIT = 0.14; let idx = -1; for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].s - 0.03) idx = i;
  if (idx < 0) return null; const cur = chunks[idx]; if (t >= cur.e + EXIT) return null;
  const nextStart = chunks[idx + 1]?.s ?? 1e9; const outAt = Math.min(cur.e + 0.02, nextStart - 0.05);
  const outP = t > outAt ? prog(t, outAt, EXIT, easeInCubic) : 0;
  const isBig = cur.w.some((w) => w.st === "big"); const final = finalAccent && idx === chunks.length - 1;
  const size = isBig ? big : base;
  const red = redFirst && cur.w[0].t.startsWith("ПИ*");
  const drift = final ? 1 + 0.05 * clamp((t - cur.s) / 2.5, 0, 1) : 1;
  return (
    <div style={{ position: "absolute", left, right, top, bottom, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: `0 ${size * 0.3}px`, alignContent: "center", opacity: 1 - outP, transform: `translateX(${shiftX}px) scale(${(1 - 0.08 * outP) * drift})`, fontFamily: F.display, fontWeight: 900, lineHeight: 1.05, textAlign: "center" }}>
      {cur.w.map((w, i) => {
        const p = springT(t - (w.s - 0.03), { stiffness: isBig ? 230 : 300, damping: isBig ? 11 : 15 }); const on = t >= w.s - 0.03;
        const fs = w.st === "big" ? size : w.st === "dim" ? size * 0.62 : size;
        const color = w.st === "big" ? (red ? C.red : C.accent) : w.st === "dim" ? C.dim : "#fff4e3";
        const shadow = w.st === "big" ? (red ? "0 4px 0 #7a1a24, 0 8px 0 #3a0c12, 0 20px 40px rgba(0,0,0,0.5)" : "0 4px 0 #a85f12, 0 8px 0 #5a3010, 0 30px 60px rgba(0,0,0,0.5)") : "0 3px 0 #2a2230, 0 6px 0 #140f18, 0 18px 36px rgba(0,0,0,0.55)";
        return <span key={i} style={{ display: "inline-block", fontSize: fs, color, textShadow: shadow, opacity: on ? clamp(p * 1.5, 0, 1) : 0, transform: `translateY(${lerp(40, 0, p)}px) scale(${lerp(0.7, 1, p)}) rotate(${lerp(i % 2 ? 4 : -4, 0, p)}deg)`, letterSpacing: w.st === "big" ? "-0.01em" : "0", whiteSpace: "nowrap", marginBottom: 8 }}>{w.t}</span>;
      })}
    </div>
  );
};
