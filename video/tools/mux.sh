#!/usr/bin/env bash
# usage: tools/mux.sh <scratch_audio_dir>  -> out/01_pyramids_intro.mp4, out/02_discord.mp4
set -e
A="$1"
ffmpeg -v error -y -i out/desert_video.mp4 -i "$A/clip1_mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/01_pyramids_intro.mp4
ffmpeg -v error -y -i out/discord_video.mp4 -i "$A/clip2_mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/02_discord.mp4
ls -la out/*.mp4
