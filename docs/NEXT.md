# Where we stopped (2026-11-22, night)

Read first: CLAUDE.md, docs/HISTORY.md, claude/skills/shorts-studio/SKILL.md.

## Done
- Content system built: `shorts-studio` skill + agents shorts-writer, shorts-director, shorts-creative-reviewer,
  shorts-tech-reviewer (in %USERPROFILE%\.claude and copied to claude/), review kit tools/vh-engine/review
  (review.js -> analyse.py -> sheets + metrics vs reference.json; short_qa.py for renders).
- Reference sheets (4 AlexDiary shorts, 4x4, with words) are local only: C:\Users\Musa\Documents\VideoHub\reference\.
- Castle rendered v1, then reviewed (films/castle/REVIEW.md): creative 4/10 FIX FIRST, tech FIX
  (black frames at 7.6/9.3/41.0/42.6 s from the camera passing through the wall/gate, max 137 px/f, 18 fast moves,
  -11.1 LUFS).

## Next (morning)
1. Apply the Castle review (REVIEW.md): camera clamp out of walls + drop/merge shots (enemies, ladders->dig,
   corners->brain, grill->bridge), enemies with torches on "enemies", fire arrows + thrown torch on "sets it on fire"
   (fence must not fill the frame), hero standing + Thinking + big sparkle on "genius"/"brain", no floating people while
   the wall rises, ladder too short + climber falls into the moat, archer framed with visible arrows, guard hides behind
   teeth, diggers with dirt + corner sag, ram carried by 4 men, defender pours, people run through the gate to the keep,
   keep door high on "door high", foreground grass, warm low sun, better trees, front-lit paladins, louder mix (-9 LUFS).
2. Re-run review kit + both reviewers until RENDER/OK, then hub_live for the owner. Render only when he asks.
3. Then a new short through the full shorts-studio pipeline (owner picks the topic).
4. Optional: make the repo private (then push Mixamo .fbx), full renders via GitHub Releases.
