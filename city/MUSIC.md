# City Christmas music

The city scene loops a synthesized chorus of **Jingle Bells**. No audio file is stored in this repository.

## Melody

- Title: Jingle Bells (originally *The One Horse Open Sleigh*), chorus
- Composer: James Lord Pierpont
- Published: 1857
- Composer died: 1893
- License: **public domain**

The 1857 melody is out of copyright. This page does not use a recording, a sample library, or someone else's arrangement.

## Synthesis

`carol.mjs` renders the chorus in code: music-box partials for the tune and a quiet three-note pad (C, F, and G) underneath. That rendering was written for this project. `music.mjs` plays the buffer on a loop after a user gesture.

Playback stays quiet, pauses while the tab is hidden, and remembers a mute choice on this device (`localStorage` key `city-music`).
