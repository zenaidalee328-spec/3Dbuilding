# Castle review, round 1 (2026-11-22)

## Creative reviewer
OVERALL 4/10 (story 5, cause-effect 3, framing 4, camera 6, people 3, look 5, fun 3). VERDICT: FIX FIRST.
Top 5: (1) camera clips into the door 40.8-41.8 and walls 50.2/51.8; (2) show causes: archer shot 22.8, diggers 28.2, pouring 45.2, ram impact 40.0; (3) hero standing+thinking at 7.8-9.2 and 29.2-30.8 with a big sparkle; (4) ladder short + climber falls into the moat 20.2-21.8, keep door high at 52.2; (5) no floating people at 10.8, lock stone colour.
Also: enemies with torches on the word "enemies"; hero builds the fence close; diggers + wider water for the moat; guard hides behind teeth; archer on tower aims at diggers; Congratulations 2 low with cheering people; grill+drawbridge one clear 3/4 shot; people run through the gate and to the keep; foreground grass, warm low sun, better trees, ripple rings, paladins lit from the front.

## Tech reviewer
VERDICT: FIX. QA on castle_v1.mp4: black frames at 7.6 s, 9.3 s, 41.0 s, 42.6 s (camera passes inside the wall / gate during moves). Loudness -11.1 LUFS (target -11..-6; use two-pass loudnorm or +2 dB makeup). Camera: max 137 px/f at 0.7 s (56 m move fire->enemies: drop that shot), p90 48 (target 25), 18 fast moves (target <=14): merge ladders->dig, corners->brain, grill->bridge; moves shorter than 1.2 s at 10.8, 30.3, 40.3, 42.4, 44.0 s. Keep the camera out of wall boxes (clamp in placeCam). All beats land within 0.3 s of their words except enemies (0.9 s late) and the sleeping camp shown only 0.8 s.
