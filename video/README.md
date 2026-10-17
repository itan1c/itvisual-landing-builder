# Rust intro motion graphics (Remotion)

Two 16:9 clips for the "pyramids = ants" intro.

| Composition | Length | Audio mix |
|-------------|--------|-----------|
| `Desert`    | 25 s   | voice from 7.0 s, music (Cobra Desert 0:00–0:25) at −23.2 LUFS |
| `Discord`   | 20 s   | voice from 1.0 s, music (Cobra Desert 0:35–0:48) from 2.2 s, hard cut at 15.25 s |

## Rebuild

```bash
npm install            # Node 22+, ffmpeg and python3 + numpy must be installed
# 0. inputs: put the three originals somewhere and convert them (mic is only in the left channel → duplicate it)
mkdir -p <scratch-dir>/audio
ffmpeg -i "<voice 8 .aac>" -af "pan=stereo|c0=c0|c1=c0" -ar 48000 <scratch-dir>/audio/voice8_raw.wav   # pyramids take (26 s)
ffmpeg -i "<voice 9 .aac>" -af "pan=stereo|c0=c0|c1=c0" -ar 48000 <scratch-dir>/audio/voice9_raw.wav   # discord take (19 s)
ffmpeg -i "<Cobra Desert .mp4>" -vn -ar 48000 <scratch-dir>/audio/music_full.wav
# 1. audio: voice stems, synthesized SFX, music at -23.2 LUFS, per-frame mouth envelopes
python3 tools/build_audio.py <scratch-dir>
# (word timestamps are already committed in src/data/words*.json; tools/make_words.py only needs re-running if the takes change)
# 2. video (on a normal machine Remotion downloads its own headless Chrome; REMOTION_BROWSER is only for locked-down containers)
npx remotion render Desert out/desert_video.mp4 --codec=h264 --crf=17
npx remotion render Discord out/discord_video.mp4 --codec=h264 --crf=17
npx remotion studio    # live preview with a scrubbable timeline
# 3. mux
tools/mux.sh <scratch-dir>/audio
```

Timings for both clips live in `src/data/timeline*.json` (shared by the audio mix and the animation).
Swear words in captions are masked with `*` in `tools/make_words.py` (`MASK`).

## Placement in the final edit

| Clip | Put at | Notes |
|------|--------|-------|
| `01_pyramids_intro.mp4` | 0:00 | voice starts at 7.0 s, fades to black over the last 5 s |
| `02_discord.mp4` | 0:33.0 | voice ends at 0:51.0, music 0:35.2–0:48.25 of the master timeline |

Captions are uncensored (set `MASK` in `tools/make_words.py` to censor). Nicknames in the voice chat: `NAMES` in `src/scenes/Discord.tsx`.
