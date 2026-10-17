# Rust intro motion graphics (Remotion)

Two 16:9 clips for the "pyramids = ants" intro.

| Composition | Length | Audio mix |
|-------------|--------|-----------|
| `Desert`    | 25 s   | voice from 7.0 s, music (Cobra Desert 0:00–0:25) at −23.2 LUFS |
| `Discord`   | 20 s   | voice from 1.0 s, music (Cobra Desert 0:35–0:48) from 2.2 s, hard cut at 15.25 s |

## Rebuild

```bash
npm install
# 1. audio: voice stems, synthesized SFX, music at -23.2 LUFS, per-frame mouth envelopes
python3 tools/build_audio.py <scratch-dir>      # expects <scratch-dir>/audio/{voice8_raw,voice9_raw,music_full}.wav
python3 tools/make_words.py <scratch-dir>       # caption chunks from GigaAM word timestamps
# 2. video (headless chrome shell)
REMOTION_BROWSER=/path/to/headless_shell npx remotion render Desert out/desert_video.mp4 --codec=h264 --crf=17
REMOTION_BROWSER=/path/to/headless_shell npx remotion render Discord out/discord_video.mp4 --codec=h264 --crf=17
# 3. mux
tools/mux.sh <scratch-dir>/audio
```

Timings for both clips live in `src/data/timeline*.json` (shared by the audio mix and the animation).
Swear words in captions are masked with `*` in `tools/make_words.py` (`MASK`).
