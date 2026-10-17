import React from "react";
import { clamp, easeInCubic, lerp, prog, springT } from "../lib/util";
import type { Gesture, Mood } from "./Avatar";
export type { Gesture, Mood };
const SKIN = "#8b5a3c", SKIN_D = "#6e4426", INK = "#1a1a1a", HAIR = "#2b1d16", BURLAP = "#d9c49c", BURLAP_D = "#c4ad80", PAD = "#7a5230";
const SW = 6;
/** hand in local coords, wrist at (0,0), fingers up */
const Hand: React.FC<{ kind: "fist" | "point" | "open" }> = ({ kind }) => (
  <g fill={SKIN} stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
    {kind === "fist" && (<>
      <rect x="-44" y="-70" width="88" height="80" rx="30" />
      <path d="M-30 -40 q10 -14 20 0 M-10 -44 q10 -14 20 0 M10 -40 q10 -14 20 0" fill="none" strokeWidth={4} />
    </>)}
    {kind === "point" && (<>
      <rect x="-42" y="-66" width="84" height="76" rx="28" />
      <rect x="-40" y="-150" width="30" height="100" rx="15" transform="rotate(-6 -25 -100)" />
      <path d="M-4 -40 q10 -14 20 0 M18 -36 q10 -14 20 0" fill="none" strokeWidth={4} />
      <rect x="22" y="-72" width="26" height="40" rx="13" transform="rotate(28 35 -52)" />
    </>)}
    {kind === "open" && (<>
      <rect x="-44" y="-70" width="88" height="80" rx="26" />
      {[-30, -10, 10, 30].map((x, i) => <rect key={i} x={x - 11} y="-130" width="22" height="72" rx="11" transform={`rotate(${(i - 1.5) * 8} ${x} -60)`} />)}
      <rect x="-70" y="-62" width="24" height="52" rx="12" transform="rotate(-35 -58 -36)" />
    </>)}
  </g>
);
/** Big cartoon "sticker" bust with thick white outline, moods and gestures. viewBox 0 0 600 640 (bottom is meant to be cropped). */
export const Sticker: React.FC<{ t: number; mouth: number; mood?: Mood; gestures?: Gesture[]; look?: number; width?: number; id?: string }> = ({ t, mouth, mood = { brow: -0.4, smile: 0, squint: 0 }, gestures = [], look = 0.2, width = 600, id = "st" }) => {
  const breathe = Math.sin(t * 1.15) * 4; const tilt = Math.sin(t * 0.47) * 1.8;
  const bl = (t + 1.1) % 3.4; let blink = bl < 0.14 ? Math.sin((bl / 0.14) * Math.PI) : 0;
  const m = clamp(mouth, 0, 1);
  const EXIT = 0.16;
  const g = gestures.find((x) => t >= x.t0 && t < x.t0 + x.dur + EXIT);
  let inP = 0, outP = 0; if (g) { inP = springT(t - g.t0, { stiffness: 170, damping: 13 }); outP = t > g.t0 + g.dur ? prog(t, g.t0 + g.dur, EXIT, easeInCubic) : 0; }
  const vis = clamp(inP, 0, 1.15) * (1 - outP); const hold = g ? t - g.t0 : 0; const pose = g?.pose;
  let headDrop = 0, shoulders = 0;
  if (pose === "facepalm") { headDrop = 18 * vis; blink = Math.max(blink, vis); }
  if (pose === "shrug") shoulders = -16 * vis;
  const eyeRy = lerp(52, 4, blink) * (1 - 0.35 * mood.squint); const eyeRx = 46;
  const px = look * 10;
  const browY = mood.brow * 16; const angry = clamp(-mood.brow, 0, 1); const smile = mood.smile;
  const rise = (1 - vis) * 320;
  const hands: React.ReactNode[] = [];
  const sleeve = (x0: number, y0: number, x1: number, y1: number, key: string) => (<g key={key}><path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={INK} strokeWidth="92" strokeLinecap="round" /><path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={BURLAP} strokeWidth="80" strokeLinecap="round" /></g>);
  if (g && vis > 0.01) {
    if (pose === "point") { const bob = Math.sin(hold * 9) * 8 * Math.exp(-hold * 1.2); const wx = 540, wy = 470 + rise + bob; hands.push(sleeve(640, 720, wx, wy + 40, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-8 + bob * 0.5})`}><Hand kind="point" /></g>); }
    if (pose === "open") { const wob = Math.sin(hold * 5) * 8; const wx = 545, wy = 500 + rise; hands.push(sleeve(640, 740, wx, wy + 40, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-50 + wob})`}><Hand kind="open" /></g>); }
    if (pose === "circle") { const a = hold * 9; const wx = 535 + Math.cos(a) * 22, wy = 480 + rise + Math.sin(a) * 16; hands.push(sleeve(640, 740, wx, wy + 40, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(${-25 + Math.sin(a) * 10})`}><Hand kind="point" /></g>); }
    if (pose === "chop") { const ch = Math.abs(Math.sin(hold * 8)) * 30 * Math.exp(-hold * 1.5); const wx = 535, wy = 470 + rise + ch; hands.push(sleeve(640, 740, wx, wy + 40, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(-85)`}><Hand kind="open" /></g>); }
    if (pose === "facepalm") { const wx = 300 + 6 * Math.sin(hold * 2), wy = 280 + rise * 0.8; hands.push(sleeve(640, 740, wx + 70, wy + 70, "a"), <g key="h" transform={`translate(${wx} ${wy}) rotate(12)`}><Hand kind="open" /></g>); }
    if (pose === "shrug" || pose === "handsup") { const up = pose === "handsup"; const sh = up ? Math.sin(hold * 14) * 8 : Math.sin(hold * 3) * 5; const y = (up ? 330 : 500) + rise; const rot = up ? 0 : 50;
      hands.push(sleeve(-40, 740, 70, y + 40, "al"), <g key="hl" transform={`translate(${70 + sh} ${y}) rotate(${rot})`}><Hand kind={up ? "fist" : "open"} /></g>);
      hands.push(sleeve(640, 740, 530, y + 40, "ar"), <g key="hr" transform={`translate(${530 - sh} ${y}) rotate(${-rot})`}><Hand kind={up ? "fist" : "open"} /></g>); }
  }
  const faceHand = pose === "facepalm";
  const sweat = clamp(angry * 0.6 + mood.squint, 0, 1);
  const fid = `stick-${id}`;
  return (
    <svg width={width} height={(width * 640) / 600} viewBox="-60 -40 720 720" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id={fid} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="11" result="d" />
          <feFlood floodColor="#ffffff" result="w" />
          <feComposite in="w" in2="d" operator="in" result="o" />
          <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${fid})`} transform={`translate(0 ${breathe + shoulders})`} stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
        {/* body */}
        <path d="M70 700 C80 520 160 440 300 432 C440 440 520 520 530 700 Z" fill={BURLAP} />
        <path d="M250 436 L300 520 L350 436 Z" fill={BURLAP_D} />
        <path d="M300 520 L300 700" fill="none" strokeWidth={4} opacity="0.5" />
        <rect x="150" y="570" width="90" height="68" rx="10" fill={BURLAP_D} strokeDasharray="12 8" strokeWidth={4} />
        <rect x="340" y="600" width="110" height="80" rx="10" fill={BURLAP_D} strokeDasharray="12 8" strokeWidth={4} />
        <path d="M74 600 C70 500 120 446 196 444 L206 510 C160 520 130 550 122 610 Z" fill={PAD} />
        {[[110, 540], [140, 505], [172, 486], [120, 580], [150, 548]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="#e8c36a" strokeWidth={3} />)}
        {/* neck */}
        <rect x="258" y="360" width="84" height="90" rx="22" fill={SKIN} />
        {!faceHand && hands}
        <g transform={`translate(0 ${headDrop}) rotate(${tilt + headDrop * 0.4} 300 240)`}>
          <circle cx="142" cy="262" r="30" fill={SKIN} /><circle cx="458" cy="262" r="30" fill={SKIN} />
          {/* head: rounder */}
          <path d="M140 150 C140 50 215 14 300 14 C385 14 460 50 460 150 L460 290 C460 382 392 428 300 428 C208 428 140 382 140 290 Z" fill={SKIN} strokeWidth={7} />
          {/* short curly hair with bumpy hairline + sideburns */}
          <path d="M142 176 C142 60 215 22 300 22 C385 22 458 60 458 176 C450 156 440 146 428 144 C420 130 408 124 396 128 C386 114 372 110 360 116 C348 104 332 102 320 110 C308 100 292 100 280 110 C268 102 252 104 240 116 C228 110 214 114 204 128 C192 124 180 130 172 144 C160 146 150 156 142 176 Z" fill={HAIR} />
          <path d="M140 176 L140 262 L172 262 L172 186 Z M460 176 L460 262 L428 262 L428 186 Z" fill={HAIR} stroke="none" />
          {/* eyes: medium, heavy upper lids = serious look */}
          {[243, 357].map((cx, i) => { const rx = eyeRx * 0.82, ry = eyeRy * 0.8, cy = 216; return (
            <g key={i}>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
              <circle cx={cx + 4 + px} cy={cy + 6} r={Math.min(19, ry * 0.5)} fill={INK} stroke="none" />
              <circle cx={cx - 2 + px} cy={cy - 2} r={Math.min(5, ry * 0.16)} fill="#fff" stroke="none" />
              <path d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Q ${cx} ${cy - ry * 0.5} ${cx - rx} ${cy} Z`} fill={SKIN} strokeWidth={5} />
            </g>); })}
          {/* brows: heavy, low, slightly furrowed by default */}
          <path d={`M192 ${146 - browY + angry * 2} Q 243 ${134 - browY - (1 - angry) * 8} 290 ${150 - browY + angry * 22}`} fill="none" stroke={INK} strokeWidth={18} />
          <path d={`M408 ${146 - browY + angry * 2} Q 357 ${134 - browY - (1 - angry) * 8} 310 ${150 - browY + angry * 22}`} fill="none" stroke={INK} strokeWidth={18} />
          {/* nose */}
          <path d="M300 232 L282 290 Q300 304 318 290 Z" fill={SKIN_D} strokeWidth={5} />
          {/* trimmed beard along the jaw + goatee + mustache */}
          <path d="M140 258 L140 290 C140 382 208 428 300 428 C392 428 460 382 460 290 L460 258 L430 258 C426 334 378 378 300 378 C222 378 174 334 170 258 Z" fill="#1f1512" />
          <path d="M246 306 Q300 290 354 306 L348 322 Q300 310 252 322 Z" fill="#1f1512" />
          {/* mouth: restrained */}
          <g transform="translate(300 348)">
            <path d={`M-20 ${2 - smile * 5} Q 0 ${3 + smile * 9} 20 ${2 - smile * 5}`} fill="none" strokeWidth={6} opacity={m < 0.12 ? 1 : 0} />
            <ellipse cx="0" cy={4 + m * 9} rx={22 + m * 6} ry={3 + m * 15} fill="#3a0f12" strokeWidth={5} opacity={m >= 0.12 ? 1 : 0} />
            <rect x={-16} y={-1 + m * 2} width={32} height={Math.max(0.5, m * 8)} rx="3" fill="#fff" stroke="none" opacity={m > 0.14 ? 1 : 0} />
            <ellipse cx="0" cy={10 + m * 16} rx={12} ry={m * 7} fill="#e0566b" stroke="none" opacity={m > 0.35 ? 1 : 0} />
          </g>
          {/* sweat drop */}
          <path d="M432 150 C442 170 448 180 448 190 A16 16 0 0 1 416 190 C416 180 422 170 432 150 Z" fill="#7cc5ff" strokeWidth={4} opacity={sweat} transform={`translate(0 ${Math.sin(t * 3) * 3})`} />
        </g>
        {faceHand && hands}
      </g>
    </svg>
  );
};
