import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
const CYR = "U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";
const LAT = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const defs: [string, string, string][] = [
  ["Display", "montserrat-900", "900"], ["Display", "montserrat-800", "800"],
  ["Body", "inter-600", "600"], ["Body", "inter-500", "500"], ["Mono", "jbmono-600", "600"],
];
let loaded = false;
export const loadFonts = () => {
  if (loaded) return; loaded = true;
  for (const [family, file, weight] of defs) {
    loadFont({ family, url: staticFile(`fonts/${file}.woff2`), weight, unicodeRange: CYR });
    loadFont({ family, url: staticFile(`fonts/${file}-latin.woff2`), weight, unicodeRange: LAT });
  }
};
export const F = { display: "Display, Montserrat, Arial, sans-serif", body: "Body, Inter, Arial, sans-serif", mono: "Mono, 'JetBrains Mono', monospace" };
