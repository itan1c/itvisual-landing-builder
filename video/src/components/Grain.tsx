import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { rng } from "../lib/util";
export const Grain: React.FC<{ opacity?: number; vignette?: number }> = ({ opacity = 0.09, vignette = 0.55 }) => {
  const f = useCurrentFrame(); const r = rng(f * 13 + 1);
  const x = Math.floor(r() * 400), y = Math.floor(r() * 400);
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,${vignette}) 100%)`, pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("noise.png")})`, backgroundSize: "400px 400px", backgroundPosition: `${x}px ${y}px`, opacity, mixBlendMode: "overlay", pointerEvents: "none" }} />
    </>
  );
};
