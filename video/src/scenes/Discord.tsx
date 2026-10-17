import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "../data/timeline2.json";
import words from "../data/words2.json";
import env from "../data/clip2_env.json";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, easeOutBack, lerp, prog, rng, springT } from "../lib/util";
import { Grain } from "../components/Grain";
import { Sticker, Gesture, Mood } from "../components/Sticker";
import { Ant, AntFace } from "../components/Ant";
import { Chunk } from "../components/Captions";
import { Stack, K, wordColor } from "../components/Kinetic";
import { Impact } from "../components/Impact";
const E = tl.events;
const NAMES = ["nastoyka", "alexford", "mokach1no", "малой", "bobronskiy"];
const COLORS = ["#5865f2", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6"];
const YELLS = ["ТЫ ЧЁ?!", "КТО СТРЕЛЯЛ", "НЕ Я!!", "АЛЁ!", "ОТДАЙ", "ВЫХОДИ", "ЭТО МОЁ", "ЧЁ ОРЁШЬ", "СКАМ!", "АААА", "НУ ТЫ", "???"];
const GESTURES: Gesture[] = [
  { pose: "point", t0: 1.72, dur: 0.8 }, { pose: "handsup", t0: 3.72, dur: 0.85 }, { pose: "open", t0: 4.64, dur: 0.85 }, { pose: "point", t0: 5.6, dur: 0.7 },
  { pose: "handsup", t0: 7.52, dur: 1.6 }, { pose: "circle", t0: 9.9, dur: 1.4 }, { pose: "shrug", t0: 11.52, dur: 0.9 }, { pose: "chop", t0: 13.52, dur: 0.5 },
  { pose: "point", t0: 14.52, dur: 1.2 }, { pose: "shrug", t0: 16.48, dur: 0.75 }, { pose: "handsup", t0: 17.28, dur: 1.4 },
];
const MOODS: { t: number; m: Mood }[] = [
  { t: 0, m: { brow: -0.3, smile: 0, squint: 0 } }, { t: 1.72, m: { brow: -0.5, smile: -0.3, squint: 0.1 } }, { t: 3.72, m: { brow: -1, smile: -0.5, squint: 0 } },
  { t: 4.64, m: { brow: 0.3, smile: 0, squint: 0 } }, { t: 5.6, m: { brow: 0.6, smile: 0.3, squint: 0 } }, { t: 6.96, m: { brow: -0.6, smile: -0.2, squint: 0.3 } },
  { t: 8.52, m: { brow: -1, smile: -0.6, squint: 0.1 } }, { t: 11.52, m: { brow: 0.2, smile: 0.2, squint: 0 } }, { t: 14.52, m: { brow: 0.5, smile: 0.4, squint: 0 } },
  { t: 16.48, m: { brow: 0.6, smile: 0.5, squint: 0 } }, { t: 17.28, m: { brow: 0.8, smile: 0.9, squint: 0.2 } },
];
const moodAt = (t: number): Mood => { let cur = MOODS[0].m, prev = MOODS[0].m, t0 = 0; for (const k of MOODS) { if (t >= k.t) { prev = cur; cur = k.m; t0 = k.t; } } const b = prog(t, t0, 0.3); return { brow: lerp(prev.brow, cur.brow, b), smile: lerp(prev.smile, cur.smile, b), squint: lerp(prev.squint, cur.squint, b) }; };
const YELL_EV = (() => { const r = rng(42); const out: { s: number; a: number; txt: string; d: number }[] = []; let t = E.yell_start; let k = 0; while (t < E.yell_end - 0.3) { out.push({ s: t, a: [0, 2, 4, 1, 3][k % 5], txt: YELLS[k % YELLS.length], d: 0.5 + r() * 0.3 }); t += 0.22 + r() * 0.25; k++; } return out; })();
const RAYS = 28;
const PANEL_IN = 7.2, PANEL_OUT = 12.45;
export const Discord: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const chunks = words as Chunk[]; const mouth = (env as number[])[Math.min(frame, env.length - 1)] ?? 0;
  const speaking = t >= E.speech_start - 0.1 && t < 18.6;
  const cut = t >= E.music_cut; const fade = prog(t, E.end_fade, 0.5, (x) => x);
  const bigChunks = chunks.filter((c) => c.w.some((w) => w.st === "big"));
  const impact = [...bigChunks].reverse().find((c) => t >= c.s - 0.03 && t < c.e + 0.9);
  const flashSrc = [...bigChunks].reverse().find((c) => t >= c.s);
  const flash = flashSrc ? (t < flashSrc.s + 0.08 ? (t - flashSrc.s) / 0.08 : clamp(1 - (t - flashSrc.s - 0.08) / 0.5, 0, 1)) : 0;
  const flashColor = flashSrc ? wordColor(flashSrc.w[0]) : "#ff4d4d";
  const fc = flashColor === "#ffffff" ? "#d94040" : flashColor;
  const lineChunks = chunks.filter((c) => !c.w.some((w) => w.st === "big"));
  const mood = moodAt(t); const angryOn = mood.brow < -0.75;
  const panelP = springT(t - PANEL_IN, { stiffness: 170, damping: 15 }) * (1 - prog(t, PANEL_OUT, 0.25, easeInCubic));
  const cardP = springT(t - 12.52, { stiffness: 170, damping: 15 }) * (cut ? 0 : 1);
  const zap = springT(t - E.relations, { stiffness: 260, damping: 10 }); const zapOn = t >= E.relations && t < PANEL_OUT;
  const stIn = springT(t - 0.2, { stiffness: 120, damping: 14 });
  const offP = springT(t - E.music_cut, { stiffness: 200, damping: 14 });
  return (
    <AbsoluteFill style={{ background: "#0f0f0f", overflow: "hidden" }}>
      {/* rotating sunburst */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(1150 600) rotate(${t * 2.2})`}>
          {Array.from({ length: RAYS }, (_, i) => { const a0 = (i / RAYS) * Math.PI * 2, a1 = ((i + 1) / RAYS) * Math.PI * 2; const R = 2400; const dark = i % 2 === 0; const base = dark ? "#1d1d1d" : "#121212"; return <path key={i} d={`M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} L${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`} fill={flash > 0 ? fc : base} opacity={flash > 0 ? (dark ? 1 : 0.8) : 1} />; })}
        </g>
        {flash > 0 && <rect width="1920" height="1080" fill="#000" opacity={0.25 * (1 - flash)} />}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 60% 55%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)" }} />
      {/* voice chat panel */}
      {panelP > 0.001 && (
        <div style={{ position: "absolute", left: 980, top: 80, width: 860, transform: `translateY(${lerp(-60, 0, panelP)}px) scale(${lerp(0.9, 1, panelP)})`, opacity: clamp(panelP * 1.4, 0, 1), transformOrigin: "50% 0%", background: "#1f2024", border: "3px solid #2c2d33", borderRadius: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ padding: "16px 28px", borderBottom: "3px solid #2c2d33", fontFamily: F.display, fontWeight: 900, fontSize: 34, color: "#e9e9ee", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="#e9e9ee" /><path d="M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="#e9e9ee" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            Голосовой чат
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", padding: "26px 10px 22px" }}>
            {NAMES.map((n, i) => {
              const yell = YELL_EV.find((y) => y.a === i && t >= y.s && t < y.s + y.d); const loud = yell ? 1 : 0;
              const inP = yell ? springT(t - yell.s, { stiffness: 320, damping: 12 }) : 0; const outP = yell ? prog(t, yell.s + yell.d - 0.1, 0.1, easeInCubic) : 0;
              const ap = springT(t - (E.ants_in + i * 0.08), { stiffness: 220, damping: 13 });
              return (
                <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 150, transform: `scale(${clamp(ap, 0, 1.1)})` }}>
                  {false && yell && <div style={{ position: "absolute", top: -58, left: "50%", transform: `translateX(-50%) scale(${inP * (1 - outP)})`, transformOrigin: "50% 100%", background: "#fff", color: "#1b1407", fontFamily: F.display, fontWeight: 900, fontSize: 20, padding: "5px 10px", borderRadius: 10, whiteSpace: "nowrap", border: "3px solid #1a1a1a" }}>{yell.txt}<div style={{ position: "absolute", left: "50%", bottom: -11, marginLeft: -8, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "10px solid #1a1a1a" }} /></div>}
                  <div style={{ position: "relative", transform: `scale(${1 + loud * 0.1 * (0.6 + 0.4 * Math.sin(t * 30))})` }}>
                    <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `4px solid ${K.green}`, opacity: loud ? 1 : 0.18, boxShadow: loud ? "0 0 20px rgba(88,214,141,0.7)" : "none" }} />
                    <AntFace size={96} bg={COLORS[i]} mouth={loud ? 0.6 + 0.4 * Math.abs(Math.sin(t * 25 + i)) : 0.05} angry={loud ? 1 : 0.5} />
                  </div>
                  <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: loud ? "#fff" : "#b9bac4", textTransform: "uppercase", whiteSpace: "nowrap" }}>{n}</div>
                  <svg width="20" height="24" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill={loud ? K.green : "#5f6068"} /><path d="M6 11 a6 6 0 0 0 12 0 M12 17 v4 M8 21 h8" stroke={loud ? K.green : "#5f6068"} strokeWidth="2.2" fill="none" strokeLinecap="round" /></svg>
                </div>
              );
            })}
          </div>
          {zapOn && <svg width="90" height="90" style={{ position: "absolute", left: 300, top: 110, transform: `scale(${zap}) rotate(${Math.sin(t * 40) * 6})` }}><path d="M52 4 L22 48 L42 48 L30 86 L70 36 L48 36 Z" fill={K.yellow} stroke="#1a1a1a" strokeWidth="4" strokeLinejoin="round" /></svg>}
        </div>
      )}
      {/* "whole video" card */}
      {cardP > 0.001 && (
        <div style={{ position: "absolute", left: 1040, top: 90, width: 740, transform: `translateY(${lerp(-60, 0, cardP)}px) scale(${lerp(0.9, 1, cardP)})`, opacity: clamp(cardP * 1.4, 0, 1), transformOrigin: "50% 0%", borderRadius: 22, overflow: "hidden", border: "4px solid #2c2d33", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ height: 300, background: "linear-gradient(#5a3a2c, #2a1a14)", position: "relative" }}>
            <svg width="740" height="300" style={{ position: "absolute", inset: 0 }}>
              <rect x="0" y="200" width="740" height="100" fill="#3a2418" />
              {Array.from({ length: 9 }, (_, i) => <g key={i} transform={`translate(${60 + i * 80} ${225 + (i % 3) * 20}) scale(2.6 ${2.6 * (i % 2 ? 1 : -1)}) rotate(${(i * 37) % 40 - 20})`}><Ant walk={t * 20 + i} color="#120c12" legW={2} /></g>)}
            </svg>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 96, height: 96, marginLeft: -48, marginTop: -48, borderRadius: 48, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 0, height: 0, borderTop: "22px solid transparent", borderBottom: "22px solid transparent", borderLeft: "36px solid #1a1a1a", marginLeft: 8 }} /></div>
          </div>
          <div style={{ background: "#d33b3b", padding: "12px 24px", fontFamily: F.display, fontWeight: 900, fontSize: 28, color: "#fff", textTransform: "uppercase" }}>Весь видос</div>
        </div>
      )}
      {/* music off label */}
      {cut && <div style={{ position: "absolute", right: 120, top: 80, fontFamily: F.display, fontWeight: 900, fontSize: 40, color: "#8b8c96", textTransform: "uppercase", opacity: clamp(offP, 0, 1), transform: `translateY(${lerp(-20, 0, offP)}px)` }}>♪ выкл</div>}
      {/* stacked captions */}
      <Stack chunks={lineChunks} t={t} left={960} width={900} top={430} size={82} hideAt={E.final_word} />
      {impact && <Impact chunk={impact} t={t} x={1410} y={520} size={190} maxWidth={820} />}
      {/* anger marks near the head */}
      {angryOn && !cut && <svg width="120" height="120" style={{ position: "absolute", left: 600, top: 400, transform: `scale(${0.9 + 0.1 * Math.sin(t * 20)}) rotate(${Math.sin(t * 9) * 6}deg)` }}><g stroke={K.red} strokeWidth="10" strokeLinecap="round" fill="none"><path d="M30 30 q20 14 0 40 M60 20 q20 14 0 40 M20 70 q20 14 0 40 M60 60 q20 14 0 40" /></g></svg>}
      {/* grawlix spray falling from under the final word */}
      {t >= E.final_word && t < E.final_word + 2.8 && Array.from({ length: 34 }, (_, i) => { const r = rng(i * 17 + 3); const x0 = 980 + r() * 760; const delay = 0.1 + r() * 0.8; const age = t - E.final_word - delay; if (age < 0) return null; const vy = 260 + r() * 240; const y = 610 + age * vy + 140 * age * age; const x = x0 + Math.sin(age * 4 + i) * 18; const ch = "#@$%!&?*"[i % 8]; return <div key={i} style={{ position: "absolute", left: x, top: y, fontFamily: F.display, fontWeight: 900, fontSize: 40 + r() * 50, color: [K.yellow, K.red, "#fff", K.green][i % 4], transform: `translate(-50%,-50%) rotate(${age * 150 * (r() > 0.5 ? 1 : -1)}deg) scale(${springT(age, { stiffness: 320, damping: 14 })})`, opacity: clamp(1.2 - age / 1.6, 0, 1), WebkitTextStroke: "3px #111", paintOrder: "stroke fill" }}>{ch}</div>; })}
      {/* sticker character */}
      <div style={{ position: "absolute", left: 30, top: 380, transform: `translateY(${lerp(500, 0, stIn)}px)` }}>
        <Sticker t={t} mouth={speaking ? mouth : 0} mood={moodAt(t)} gestures={GESTURES} look={0.4 + 0.2 * Math.sin(t * 0.9)} width={700} id="d" />
      </div>
      <Grain opacity={0.07} vignette={0.35} />
      <AbsoluteFill style={{ background: "#000", opacity: fade, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
