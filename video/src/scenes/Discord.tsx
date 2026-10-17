import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "../data/timeline2.json";
import words from "../data/words2.json";
import env from "../data/clip2_env.json";
import menv from "../data/clip2_music_env.json";
import { F } from "../lib/fonts";
import { clamp, easeInCubic, easeOutBack, lerp, prog, rng, springT } from "../lib/util";
import { Grain } from "../components/Grain";
import { Avatar, Gesture, Mood } from "../components/Avatar";
import { AntFace } from "../components/Ant";
import { C, Chunk } from "../components/Captions";
import { Kinetic } from "../components/Kinetic";
const E = tl.events;
const NAMES = ["nastoyka", "alexford", "mokach1no", "малой", "bobronskiy"];
const YELLS = ["ТЫ ЧЁ?!", "КТО СТРЕЛЯЛ", "НЕ Я!!", "АЛЁ!", "ОТДАЙ", "ВЫХОДИ", "ЭТО МОЁ", "ЧЁ ОРЁШЬ", "СКАМ!", "АААА", "НУ ТЫ", "БАН"];
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
// yell schedule for the five ants: (start, ant, text)
const YELL_EV = (() => { const r = rng(42); const out: { s: number; a: number; txt: string; d: number }[] = []; let t = E.yell_start; let k = 0; while (t < E.yell_end - 0.3) { out.push({ s: t, a: Math.floor(r() * 5), txt: YELLS[k % YELLS.length], d: 0.5 + r() * 0.3 }); t += 0.22 + r() * 0.25; k++; } return out; })();
export const Discord: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const chunks = words as Chunk[]; const mouth = (env as number[])[Math.min(frame, env.length - 1)] ?? 0; const music = (menv as number[])[Math.min(frame, menv.length - 1)] ?? 0;
  const musicOn = t >= tl.music.at && t < E.music_cut; const beat = musicOn ? music : 0;
  const unm = springT(t - E.unmute, { stiffness: 240, damping: 12 }); const unmuted = t >= E.unmute;
  const speaking = t >= E.speech_start - 0.1 && t < 18.6; const ring = unmuted && speaking ? 0.35 + mouth * 0.65 : 0;
  const avP = springT(t - E.avatar_in, { stiffness: 150, damping: 14 }); const hdr = springT(t - E.header_in, { stiffness: 200, damping: 16 });
  const cut = t >= E.music_cut; const fade = prog(t, E.end_fade, 0.5, (x) => x);
  const zap = springT(t - E.relations, { stiffness: 260, damping: 10 }); const zapOn = t >= E.relations && t < E.music_cut;
  return (
    <AbsoluteFill style={{ background: "#050508", overflow: "hidden" }}>
      {/* music glow + bars */}
      {!cut && musicOn && (<>
        <div style={{ position: "absolute", left: 960 - 700, top: 540 - 500, width: 1400, height: 1000, borderRadius: "50%", background: `radial-gradient(circle, rgba(109,112,255,${0.10 + beat * 0.14}) 0%, rgba(109,112,255,0) 60%)`, filter: "blur(20px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, opacity: 0.5 }}>
          {Array.from({ length: 48 }, (_, i) => { const r = rng(i * 7 + frame * 3); const h = 6 + (0.35 + 0.65 * r()) * beat * 90 * (1 - Math.abs(i - 24) / 30); return <div key={i} style={{ width: 10, height: h, borderRadius: 5, background: C.blurple }} />; })}
        </div>
      </>)}
      {/* header */}
      <div style={{ position: "absolute", left: 80, top: 56, display: "flex", alignItems: "center", gap: 14, opacity: clamp(hdr * 1.5, 0, 1) * (cut ? 0.35 : 1), transform: `translateY(${lerp(-20, 0, hdr)}px)`, fontFamily: F.mono, fontWeight: 600, fontSize: 24, letterSpacing: "0.22em", color: "#8d90a8" }}>
        <svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="#8d90a8" /><path d="M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="#8d90a8" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        ГОЛОСОВОЙ  //  ОБЩИЙ
        {!cut && <span style={{ marginLeft: 14, padding: "4px 12px", borderRadius: 8, background: "rgba(61,220,132,0.12)", color: C.green, fontSize: 18 }}>● LIVE</span>}
      </div>
      {/* narrator avatar (circle) */}
      <div style={{ position: "absolute", left: 120, top: 380, transform: `translateY(${lerp(80, 0, avP)}px) scale(${lerp(0.8, 1, avP)})`, opacity: clamp(avP * 1.5, 0, 1) * (cut ? 0.75 : 1) }}>
        <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `5px solid ${C.green}`, opacity: ring, boxShadow: `0 0 ${20 + mouth * 30}px rgba(61,220,132,${0.3 + mouth * 0.4})` }} />
        <div style={{ width: 300, height: 300, borderRadius: "50%", overflow: "hidden", border: "4px solid #2a2b3d" }}>
          <Avatar t={t} mouth={speaking ? mouth : 0} mood={moodAt(t)} gestures={GESTURES} look={0.3 + 0.15 * Math.sin(t * 0.9)} />
        </div>
        {/* mic badge: muted (red slash) → unmuted */}
        <div style={{ position: "absolute", right: -6, bottom: -6, width: 72, height: 72, borderRadius: 36, background: unmuted ? C.green : "#2a2b3d", border: "5px solid #050508", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.35 * Math.sin(Math.PI * clamp(unm, 0, 1)) * (unm < 1 ? 1 : 0)})` }}>
          <svg width="36" height="36" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill={unmuted ? "#0e2a1a" : "#c9ccdf"} /><path d="M6 11 a6 6 0 0 0 12 0 M12 17 v4 M8 21 h8" stroke={unmuted ? "#0e2a1a" : "#c9ccdf"} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <line x1="4" y1="3" x2="20" y2="21" stroke={C.red} strokeWidth="3" strokeLinecap="round" opacity={1 - clamp(unm, 0, 1)} /></svg>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 316, textAlign: "center", fontFamily: F.body, fontWeight: 600, fontSize: 30, color: "#c9ccdf" }}>Ты</div>
      </div>
      {/* participants (ants) */}
      {!cut && NAMES.map((n, i) => {
        const p = springT(t - (E.ants_in + i * 0.085), { stiffness: 220, damping: 13 }); if (p <= 0) return null;
        const yell = YELL_EV.find((y) => y.a === i && t >= y.s && t < y.s + y.d);
        const loud = yell ? 1 : 0; const r = rng(i * 99 + 1); const idle = 0.5 + 0.5 * Math.sin(t * (2 + r()) + r() * 6);
        const y = 265 + i * 125; const x = 1590;
        const inP = yell ? springT(t - yell.s, { stiffness: 320, damping: 12 }) : 0; const outP = yell ? prog(t, yell.s + yell.d - 0.1, 0.1, easeInCubic) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 16, transform: `translateX(${lerp(120, 0, p)}px) scale(${lerp(0.7, 1, p)})`, opacity: clamp(p * 1.5, 0, 1), transformOrigin: "100% 50%" }}>
            {yell && <div style={{ position: "absolute", right: "100%", marginRight: 26, top: 14, transform: `scale(${inP * (1 - outP)})`, transformOrigin: "100% 50%", background: "#fff", color: "#1b1407", fontFamily: F.display, fontWeight: 900, fontSize: 26, padding: "8px 16px", borderRadius: 12, whiteSpace: "nowrap" }}>{yell.txt}<div style={{ position: "absolute", right: -9, top: 15, width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "11px solid #fff" }} /></div>}
            <div style={{ position: "relative", transform: `scale(${1 + loud * 0.1 * (0.6 + 0.4 * Math.sin(t * 30))})` }}>
              <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `4px solid ${C.green}`, opacity: loud ? 0.9 : 0.15 * idle, boxShadow: loud ? "0 0 22px rgba(61,220,132,0.6)" : "none" }} />
              <AntFace size={96} mouth={loud ? 0.6 + 0.4 * Math.abs(Math.sin(t * 25 + i)) : 0.05} angry={loud ? 1 : 0.6} />
            </div>
            <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 26, color: loud ? "#fff" : "#9a9db5", width: 200 }}>{n}</div>
          </div>
        );
      })}
      {/* lightning between the first two ants on "отношения" */}
      {zapOn && <svg width="96" height="96" style={{ position: "absolute", left: 1486, top: 338, transform: `scale(${zap}) rotate(${Math.sin(t * 40) * 6})`, transformOrigin: "50% 50%" }}><path d="M70 6 L32 62 L58 62 L40 114 L92 48 L64 48 Z" fill="#ffd166" stroke="#ff9f2e" strokeWidth="4" strokeLinejoin="round" /></svg>}
      <Kinetic chunks={chunks} t={t} left={470} right={cut ? 80 : 600} base={96} big={150} finalAccent />
      <Grain opacity={0.08} vignette={0.65} />
      <AbsoluteFill style={{ background: "#000", opacity: fade, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
