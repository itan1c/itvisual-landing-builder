import React from "react";
import { clamp, easeInCubic, lerp, prog, springT } from "../lib/util";
export type Pose = "point" | "open" | "chop" | "facepalm" | "shrug" | "circle" | "handsup";
export type Gesture = { pose: Pose; t0: number; dur: number };
export type Mood = { brow: number; smile: number; squint: number };
const SKIN = "#8a5a35", HAIR = "#1c1512", SHIRT = "#c9b894", COLLAR = "#c43a32", PAD = "#7a5230", SLEEVE = "#c9b894";
/** minimal mitten hand, wrist at (0,0), fingers up */
const Hand: React.FC<{ kind: "open" | "point" }> = ({ kind }) => (
  <g fill={SKIN}>
    {kind === "open" ? (<>
      <rect x="-26" y="-58" width="52" height="60" rx="22" />
      <rect x="-40" y="-36" width="22" height="30" rx="11" transform="rotate(-30 -29 -21)" />
    </>) : (<>
      <rect x="-24" y="-44" width="48" height="48" rx="20" />
      <rect x="-9" y="-92" width="18" height="56" rx="9" />
      <rect x="-38" y="-34" width="22" height="28" rx="11" transform="rotate(-30 -27 -20)" />
    </>)}
  </g>
);
/** Minimal flat cartoon bust (300x300 viewBox) with moods + hand gestures. */
export const Avatar: React.FC<{ t: number; mouth: number; mood?: Mood; gestures?: Gesture[]; look?: number; size?: number }> = ({ t, mouth, mood = { brow: -0.3, smile: 0, squint: 0 }, gestures = [], look = 0.2, size = 300 }) => {
  const breathe = Math.sin(t * 1.15) * 2.5; const tilt = Math.sin(t * 0.47) * 2;
  const bl = (t + 1.1) % 3.3; let blink = bl < 0.14 ? Math.sin((bl / 0.14) * Math.PI) : 0;
  const m = clamp(mouth, 0, 1);
  const EXIT = 0.16;
  const g = gestures.find((x) => t >= x.t0 && t < x.t0 + x.dur + EXIT);
  let inP = 0, outP = 0; if (g) { inP = springT(t - g.t0, { stiffness: 170, damping: 13 }); outP = t > g.t0 + g.dur ? prog(t, g.t0 + g.dur, EXIT, easeInCubic) : 0; }
  const vis = clamp(inP, 0, 1.15) * (1 - outP); const hold = g ? t - g.t0 : 0; const pose = g?.pose;
  let headDrop = 0, shoulders = 0;
  if (pose === "facepalm") { headDrop = 10 * vis; blink = Math.max(blink, vis); }
  if (pose === "shrug") shoulders = -9 * vis;
  const eyeR = lerp(13, 1.5, blink) * (1 - 0.4 * mood.squint);
  const px = look * 4;
  const browY = mood.brow * 8; const angry = clamp(-mood.brow, 0, 1); const smile = mood.smile;
  const rise = (1 - vis) * 180;
  const hands: React.ReactNode[] = [];
  const arm = (x0: number, y0: number, x1: number, y1: number, key: string) => <path key={key} d={`M${x0} ${y0} L${x1} ${y1}`} stroke={SLEEVE} strokeWidth="40" strokeLinecap="round" />;
  if (g && vis > 0.01) {
    if (pose === "point") { const bob = Math.sin(hold * 9) * 5 * Math.exp(-hold * 1.2); const wx = 238, wy = 196 + rise + bob; hands.push(arm(284, 330, wx, wy, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-10 + bob * 0.5})`}><Hand kind="point" /></g>); }
    if (pose === "open") { const wob = Math.sin(hold * 5) * 7; const wx = 242, wy = 218 + rise; hands.push(arm(288, 335, wx, wy, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-60 + wob})`}><Hand kind="open" /></g>); }
    if (pose === "circle") { const a = hold * 9; const wx = 234 + Math.cos(a) * 15, wy = 200 + rise + Math.sin(a) * 11; hands.push(arm(288, 335, wx, wy, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-30 + Math.sin(a) * 8})`}><Hand kind="point" /></g>); }
    if (pose === "chop") { const ch = Math.abs(Math.sin(hold * 8)) * 20 * Math.exp(-hold * 1.5); const wx = 232, wy = 194 + rise + ch; hands.push(arm(288, 335, wx, wy, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(-85)`}><Hand kind="open" /></g>); }
    if (pose === "facepalm") { const wx = 150 + 4 * Math.sin(hold * 2), wy = 130 + rise * 0.8; hands.push(arm(284, 335, wx + 34, wy + 34, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(12)`}><Hand kind="open" /></g>); }
    if (pose === "shrug" || pose === "handsup") { const sh = pose === "handsup" ? Math.sin(hold * 14) * 5 : Math.sin(hold * 3) * 3; const y = (pose === "handsup" ? 150 : 208) + rise; const rot = pose === "handsup" ? 0 : 45;
      hands.push(arm(16, 335, 50, y, "al"), <g key="hl" transform={`translate(${50 + sh} ${y}) rotate(${rot})`}><Hand kind="open" /></g>);
      hands.push(arm(284, 335, 250, y, "ar"), <g key="hr" transform={`translate(${250 - sh} ${y}) rotate(${-rot})`}><Hand kind="open" /></g>); }
  }
  const faceHand = pose === "facepalm";
  return (
    <svg width={size} height={size} viewBox="0 0 300 300" style={{ display: "block" }}>
      <defs><clipPath id="av-clip"><rect x="0" y="0" width="300" height="300" rx="28" /></clipPath></defs>
      <g clipPath="url(#av-clip)">
        <rect width="300" height="300" fill="#1c1a2e" />
        <circle cx="150" cy="150" r="118" fill="#2b2846" />
        <g transform={`translate(0 ${breathe + shoulders})`}>
          <path d="M30 320 C34 236 80 212 150 212 C220 212 266 236 270 320 Z" fill={SHIRT} />
          <path d="M112 208 C128 226 172 226 188 208 L196 222 C170 244 130 244 104 222 Z" fill={COLLAR} />
          <rect x="34" y="222" width="62" height="40" rx="18" fill={PAD} transform="rotate(-18 65 242)" />
          <rect x="204" y="222" width="62" height="40" rx="18" fill={PAD} transform="rotate(18 235 242)" />
          <rect x="132" y="180" width="36" height="44" rx="12" fill={SKIN} />
          <g transform={`translate(0 ${headDrop}) rotate(${tilt + headDrop * 0.6} 150 128)`}>
            <rect x="88" y="46" width="124" height="150" rx="58" fill={SKIN} />
            <circle cx="88" cy="128" r="10" fill={SKIN} /><circle cx="212" cy="128" r="10" fill={SKIN} />
            <path d="M90 108 C90 58 112 40 150 40 C188 40 210 58 210 108 C196 90 178 84 150 84 C122 84 104 90 90 108 Z" fill={HAIR} />
            <path d="M94 136 C96 176 118 200 150 200 C182 200 204 176 206 136 C196 162 180 174 150 174 C120 174 104 162 94 136 Z" fill={HAIR} />
            <rect x="126" y="150" width="48" height="12" rx="6" fill={HAIR} />
            <g transform="translate(150 170)">
              <path d={`M-14 ${0 - smile * 5} Q 0 ${2 + smile * 8} 14 ${0 - smile * 5}`} stroke="#2a0f0d" strokeWidth="4" fill="none" strokeLinecap="round" opacity={m < 0.12 ? 1 : 0} />
              <rect x={-14 - m * 3} y={-2 - smile * 2} width={28 + m * 6} height={4 + m * 20} rx={6 + m * 4} fill="#2a0f0d" opacity={m >= 0.12 ? 1 : 0} />
              <rect x={-10} y={0} width={20} height={Math.max(0.5, m * 5)} rx="2" fill="#fff" opacity={m > 0.14 ? 1 : 0} />
            </g>
            <circle cx="126" cy="118" r={eyeR} fill="#fff" /><circle cx="174" cy="118" r={eyeR} fill="#fff" />
            <circle cx={127 + px} cy="119" r={Math.min(6, eyeR * 0.5)} fill="#1b1410" /><circle cx={175 + px} cy="119" r={Math.min(6, eyeR * 0.5)} fill="#1b1410" />
            <path d={`M108 ${98 - browY + angry * 2} L144 ${96 - browY + angry * 12}`} stroke={HAIR} strokeWidth="9" strokeLinecap="round" />
            <path d={`M192 ${98 - browY + angry * 2} L156 ${96 - browY + angry * 12}`} stroke={HAIR} strokeWidth="9" strokeLinecap="round" />
            <rect x="144" y="130" width="12" height="18" rx="6" fill="#6e4426" />
          </g>
          {!faceHand && hands}
        </g>
        {faceHand && <g transform={`translate(0 ${breathe + shoulders})`}>{hands}</g>}
      </g>
      <rect x="1.5" y="1.5" width="297" height="297" rx="27" fill="none" stroke="#3d3a5c" strokeWidth="3" />
    </svg>
  );
};
