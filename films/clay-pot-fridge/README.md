# Clay pot fridge

Vertical short (1080x1920, 63.7 s): two clay pots + wet sand keep food cold with no electricity, built up step by step
("But... / So..." turns), with a cutaway of the pots.

- `timeline.js`: the script and the time of every word (captions, cues, audio).
- `film.js`: the three.js scene + captions; `window.renderOut(t)` draws second t.
- `make-audio.js`: `audio/mix.wav` (placeholder TTS voice + CC0 sounds + wind bed). Own voice: put `voice/<line id>.wav`
  files (or one `voice/voice.wav`) and run `node make-audio.js` again.
- `facts.md`: facts to source before posting, licences.
