import React from "react";
/** top-down ant sprite facing +x, ~28px long. walk: phase for legs. */
export const Ant: React.FC<{ walk: number; eyes?: boolean; color?: string; scale?: number; legW?: number }> = ({ walk, eyes = false, color = "#14141b", scale = 1, legW = 1.6 }) => {
  const sw = Math.sin(walk);
  const legs = [-4, 0, 4].map((x, i) => {
    const a = (i % 2 === 0 ? sw : -sw) * 22;
    return (
      <g key={i}>
        <path d={`M${x} -2 l-3 -5 l-2 -4`} transform={`rotate(${a} ${x} -2)`} stroke={color} strokeWidth={legW} fill="none" strokeLinecap="round" />
        <path d={`M${x} 2 l-3 5 l-2 4`} transform={`rotate(${-a} ${x} 2)`} stroke={color} strokeWidth={legW} fill="none" strokeLinecap="round" />
      </g>
    );
  });
  return (
    <g transform={`scale(${scale})`}>
      {legs}
      <ellipse cx="-9" cy="0" rx="7.5" ry="5" fill={color} />
      <ellipse cx="0" cy="0" rx="4.8" ry="3.6" fill={color} />
      <circle cx="7.5" cy="0" r="4.2" fill={color} />
      <path d="M10 -2 l5 -5 M10 2 l5 5" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="-10" cy="-1.5" rx="3" ry="1.2" fill="#fff" opacity="0.18" />
      {eyes && (<>
        <circle cx="8" cy="-2.2" r="1.9" fill="#fff" /><circle cx="8" cy="2.2" r="1.9" fill="#fff" />
        <circle cx="8.6" cy="-2.2" r="0.9" fill="#111" /><circle cx="8.6" cy="2.2" r="0.9" fill="#111" />
      </>)}
    </g>
  );
};
/** Round avatar with an angry ant face for the voice-chat list */
export const AntFace: React.FC<{ size?: number; bg?: string; mouth?: number; angry?: number }> = ({ size = 96, bg = "#1b1e2e", mouth = 0, angry = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill={bg} />
    <path d="M36 32 C28 20 20 16 14 14 M64 32 C72 20 80 16 86 14" stroke="#15151c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="56" r="27" fill="#15151c" />
    <ellipse cx="39" cy="52" rx="7" ry="8" fill="#fff" /><ellipse cx="61" cy="52" rx="7" ry="8" fill="#fff" />
    <circle cx="40" cy="54" r="3.3" fill="#111" /><circle cx="60" cy="54" r="3.3" fill="#111" />
    <path d={`M30 ${40 + angry * 2} L44 ${46}`} stroke="#ff4d5e" strokeWidth="3.5" strokeLinecap="round" opacity={angry} />
    <path d={`M70 ${40 + angry * 2} L56 ${46}`} stroke="#ff4d5e" strokeWidth="3.5" strokeLinecap="round" opacity={angry} />
    <ellipse cx="50" cy="70" rx={7 + mouth * 3} ry={1.5 + mouth * 7} fill="#3a0d12" />
    <path d="M30 76 l-8 6 M70 76 l8 6" stroke="#15151c" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
