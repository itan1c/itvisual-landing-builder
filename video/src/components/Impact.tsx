import React from "react";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, lerp, prog, rng, springT } from "../lib/util";
import { Chunk } from "./Captions";
import { wordColor } from "./Kinetic";
/** Huge tilted outlined word(s) with a comic burst behind — for emphasis chunks. */
export const Impact: React.FC<{ chunk: Chunk; t: number; x: number; y: number; size?: number; hold?: number; maxWidth?: number }> = ({ chunk, t, x, y, size = 190, hold = 0.7, maxWidth = 880 }) => {
  const p = springT(t - (chunk.s - 0.03), { stiffness: 190, damping: 10 });
  const outAt = chunk.e + hold; const outP = t > outAt ? prog(t, outAt, 0.16, easeInCubic) : 0;
  if (t < chunk.s - 0.03 || outP >= 1) return null;
  const wob = Math.sin((t - chunk.s) * 14) * 2.5 * Math.exp(-(t - chunk.s) * 3);
  const color = wordColor(chunk.w[0]);
  const text = chunk.w.map((w) => w.t).join(" ").toUpperCase().replace(/[.,]/g, "");
  const n = text.length; const fs = Math.min(size, maxWidth / (0.72 * n));
  const r = rng(Math.floor(chunk.s * 10));
  const burstR = fs * 1.9;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${-5 + wob}deg) scale(${lerp(1.7, 1, p) * (1 - 0.1 * outP)})`, opacity: clamp(p * 1.6, 0, 1) * (1 - outP), transformOrigin: "50% 50%" }}>
      <svg width={burstR * 2} height={burstR * 2} viewBox={`${-burstR} ${-burstR} ${burstR * 2} ${burstR * 2}`} style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${(t - chunk.s) * 25}deg)` }}>
        <path d={Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const rr = i % 2 ? burstR * 0.62 : burstR * (0.85 + r() * 0.15); return `${i ? "L" : "M"}${Math.cos(a) * rr} ${Math.sin(a) * rr * 0.55}`; }).join(" ") + " Z"} fill="rgba(0,0,0,0.55)" />
      </svg>
      <div style={{ position: "relative", fontFamily: F.display, fontWeight: 900, fontSize: fs, lineHeight: 1, color, whiteSpace: "nowrap", WebkitTextStroke: `${fs * 0.06}px #111`, paintOrder: "stroke fill", textShadow: `${fs * 0.05}px ${fs * 0.06}px 0 #111`, letterSpacing: "0.01em", padding: 20 }}>{text}</div>
    </div>
  );
};
