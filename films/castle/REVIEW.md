# Castle review, round 1 (2026-11-22)

## Creative reviewer
OVERALL 4/10 (story 5, cause-effect 3, framing 4, camera 6, people 3, look 5, fun 3). VERDICT: FIX FIRST.
Top 5: (1) camera clips into the door 40.8-41.8 and walls 50.2/51.8; (2) show causes: archer shot 22.8, diggers 28.2, pouring 45.2, ram impact 40.0; (3) hero standing+thinking at 7.8-9.2 and 29.2-30.8 with a big sparkle; (4) ladder short + climber falls into the moat 20.2-21.8, keep door high at 52.2; (5) no floating people at 10.8, lock stone colour.
Also: enemies with torches on the word "enemies"; hero builds the fence close; diggers + wider water for the moat; guard hides behind teeth; archer on tower aims at diggers; Congratulations 2 low with cheering people; grill+drawbridge one clear 3/4 shot; people run through the gate and to the keep; foreground grass, warm low sun, better trees, ripple rings, paladins lit from the front.

## Tech reviewer
VERDICT: FIX. QA on castle_v1.mp4: black frames at 7.6 s, 9.3 s, 41.0 s, 42.6 s (camera passes inside the wall / gate during moves). Loudness -11.1 LUFS (target -11..-6; use two-pass loudnorm or +2 dB makeup). Camera: max 137 px/f at 0.7 s (56 m move fire->enemies: drop that shot), p90 48 (target 25), 18 fast moves (target <=14): merge ladders->dig, corners->brain, grill->bridge; moves shorter than 1.2 s at 10.8, 30.3, 40.3, 42.4, 44.0 s. Keep the camera out of wall boxes (clamp in placeCam). All beats land within 0.3 s of their words except enemies (0.9 s late) and the sleeping camp shown only 0.8 s.

# Round 2 (2026-11-23)

Applied all round-1 fixes (camera clearance out of walls/towers/keep, fewer and closer shots, torches flare on "enemies", hero builds the fence, torches + fire arrows over the fence, ladders short and sliding into the moat, diggers, thick arrows, guards duck, door bursts, ram on the causeway, defender + pot, break-in through the gate, stair rises with the keep, warm low sun, -10 LUFS).

## Creative reviewer: 4/10 FIX FIRST
Its sheets showed bugs that are now fixed: the Thinking clip lay face down (now Breathing Idle), the ram and carriers were hidden in the ditch under the causeway (now on the causeway/bridge), the hero was out of frame at the start, the tent looked like a white block, and the trees were lime. Shots for the fire, idea, fort, pour and break-in were reworked after its notes.
Still open: brick colour shifts between shots (sun/bloom), "Congratulations" beats could be lower with more cheering, ripple rings on splashes, the teeth could drop visibly with an arrow hitting stone, and better tree models.

## Tech reviewer: FIX (p90 only)
Applied: the tower clearance is now 14 and the cong2 shot was reframed.
Metrics now: speed max 74.8, p90 28.3 (target 25, round 1 was 48.4), still 66%, 11 fast moves, -10.0 LUFS. All cues are within 0.3 s.

# Round 3 (2026-11-26)

Both remaining tech FAILs are gone and every check now passes (12/12).

## Numbers (round 2 -> round 3)
| | round 2 | round 3 | reference |
|---|---|---|---|
| speed_max | 935.9 FAIL | 67.3 | 0-90 |
| speed_p90 | 19.3 | 19.8 | 0-25 |
| accel_p99 | 12.6 FAIL | 3.55 | 0-9 |
| fast_moves | 10 | 10 | 6-14 |
| hard_cuts | (not measured) | 1 | 0-1 |
| still_or_slow | 75 % | 76 % | 65-100 % |

## What was actually wrong
1. **The 935.9 px/f was the hard cut at 14.1 s**, not a camera fault. Flow across a cut measures nothing, and the
   reference films each use 0-1 cuts as a punchline, so `analyse.py` now finds one-frame jumps, counts them as
   `hard_cuts` against its own 0-1 target, and leaves them out of the speed and acceleration numbers.
2. **The fire -> idea move swung the camera 148 deg in 1.6 s** (peak 269 px/f: the real "too sharp" feeling). The idea
   beat sat on the far side of the hilltop looking back. It now plays on the -z side, so the camera only backs off
   and keeps looking the same way: a 10 deg turn. That move is 22.3 px/f now. The hero turns 20 deg, not 200, and the
   cheering allies moved to the +z wall, which is the one the shot looks at.
3. **accel_p99** came from the raised-cosine ease, whose acceleration steps at both ends. Quintic smootherstep instead.
4. **Move length ignored rotation.** It is now the larger of distance and turn (42 deg buys what 18 m buys).

## What was wrong with the look (found in the frames, not the numbers)
5. **The hilltop was bare dirt.** Nothing was planted inside d 14.4, so every shot on top had an empty beige bottom
   half while the reference always keeps grass and flowers in frame. The top is planted now, minus the wall footprint
   and the keep's pad.
6. **The fence beat rendered at dusk** (frame mean 41/255). The sun is low at +x +z, so the 4.9 m fence threw a ~14 m
   shadow over the exact ground the camera and hero stood on; `clearance` also lifted the camera over the fence line,
   filling the frame with deep-zenith sky. The shot moved back inside d 7 aiming slightly down, plus a warm fill from
   -z and a stronger hemisphere. That stretch is 110/255 now, level with its neighbours.
7. The fire tint was a dark orange on soft-light, which crushed the blue channel; it is warm-neutral now.
8. **Congratulations 1** is a low shot looking up (hero small, wall big, cheering silhouettes on top), which is the
   reference's shape for a payoff beat. The idea sparkle is bigger, since it did not read against the sky.

## Still open for the owner
- The hero's sleeping pose at 0-3 s reads as face-down rather than asleep.
- 7.2 s is still darker than its neighbours (58/255) - the fence is charring and the camera is mid-move.
- Brick colour still shifts between shots; ripple rings on splashes; the teeth could drop with an arrow hitting stone.
