import React from "react";
import { Composition } from "remotion";
import { loadFonts } from "./lib/fonts";
import { Desert } from "./scenes/Desert";
import tl1 from "./data/timeline1.json";
import tl2 from "./data/timeline2.json";
import { Discord } from "./scenes/Discord";
loadFonts();
export const Root: React.FC = () => (
  <>
    <Composition id="Desert" component={Desert} durationInFrames={Math.round(tl1.duration * tl1.fps)} fps={tl1.fps} width={1920} height={1080} />
    <Composition id="Discord" component={Discord} durationInFrames={Math.round(tl2.duration * tl2.fps)} fps={tl2.fps} width={1920} height={1080} />
  </>
);
