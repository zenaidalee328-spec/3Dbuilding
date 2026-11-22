# Project history and decisions (everything learned so far)

Owner's channel: vertical 3D explainer shorts. All work is reviewed in VideoHub (live preview from code), rendered only
when the owner asks. Talk to the owner in Roman Urdu.

## Films (in `films/`)
| Film | State | Notes |
|---|---|---|
| clay-pot-fridge | rendered v1 | first film; hum removed, no always-on thermometer, worker character hidden (owner disliked the cartoon worker) |
| windcatcher | built, not rendered | small corner temperature badges only |
| deepest-hole, ten-thousand-years, watch-exploded, earthquake-test | built, not rendered | "new formats" batch (ideas 1,4,5,6,7) |
| quicksand-pov | rendered v1 | realistic Mixamo character; big text cards removed ("subtitles are enough") |
| roman-aqueduct | rendered v1 | first "If you... / But... / So you... / Congratulations!" film; music turned down to -32 dB at owner's request |
| castle | rendered v1 | built after the frame-by-frame study of the reference shorts; one hilltop, slow camera, 4 Mixamo bodies |
| character-test | test only | a person built in code vs the Mixamo person (owner chose Mixamo) |

Small copies of the renders are in `renders/` (CRF 25). Full-quality renders stay on the PC (`outputs/`).

## Owner's rules (from feedback)
- Voice: Kokoro am_michael at 1.18; whole video plays at 1.10x (script.js SPEED 1.1).
- No big text over the picture (no title cards, tags, choice cards). Subtitles only. Small corner badges at most.
- Music very quiet (-32 dB) or none. Never a humming synth bed.
- Realistic characters (Mixamo), never cartoon characters.
- Characters' motions must match the words (no "dodging bullets" moves).
- Camera: not too zoomed, but close when a person acts; wide/high only when size matters.
- Camera must NOT be sharp: see the camera rules below.
- Render only when asked, one at a time, through VideoHub (`hub_render`).
- Save everything to GitHub (this repo) as work goes on.

## The reference study (4 AlexDiary shorts, analysed frame by frame at 30 fps)
Full notes: `docs/analysis/reference-shorts-frame-notes.md`. The videos themselves are not in the repo (not ours).
- Format: "If you ..." hook from frame 0, 8-12 "But... / So you..." steps, 3-4 "Congratulations! You just built ..." mini
  payoffs, famous name only at the end. 57-67 s, 240-265 words, ~4 words/s, no pause longer than 0.25 s, video ends 0.1-0.6 s
  after the last word (loops).
- Every visual beat lands on its noun/verb within 0-0.3 s; a new beat every ~1.3 s.
- Unspoken visual gags (robbers slide down, pushers fall over, bored emperor).
- One recurring hero (red shirt + backpack), recurring villains, crowds of 8-12+ people always doing something.
- Captions: centre of the frame, 2 words, first white, second coloured (yellow, pink, green, red, cyan rotating), rounded
  heavy font (we use Poppins ExtraBold), no animation.
- Loudness about -7 LUFS, music under everything, SFX on every action.
- Look: clean stylised-realistic 3D, warm low sun, long shadows, foreground grass/flowers, soft DOF, teal water with white
  ripple rings, gold light sweep on success, grade changes with mood (storm, underground).

### Camera rules (measured with optical flow on every frame of the Bridge short)
- BUILD BEATS (owner, 2026-11-23): when the words say something is built ("you build a wall"), show it being built from start to finish, the whole thing in frame from the ground to its top (with sky above it only once it is finished), the camera holding still on it while it rises. Start the build on the verb ("replace", "build"), give it ~2 s, never start the camera's next move before it is finished. Never frame where the thing will be (empty sky) before it exists.
- Bridge: median 1.5 px/frame, p90 16, max 78; 42% of frames still, 34% slow; only 11 fast moves in 67 s, each 1.2-2.7 s
  with 0.5-1.5 s ease in/out; 0-1 hard cuts. Our Roman Aqueduct was 15-25x faster (peaks 2000 px/f) = "too sharp".
- ROOT CAUSE: their whole story happens in ONE place (~100 m); each new step is built where the camera already is.
  Our aqueduct story jumped 100-400 m between places, forcing big fast flights.
- So: one location per film; hold 2-3 s while the action happens in frame; move only 1.5-2.3 s with a cosine ease;
  camera 1-6 m high (low from the water/ground looking up for "Congratulations"); one high wide shot at the very end;
  change shots with a foreground wipe (a boat, a person) instead of a whip.
- Tools: `docs/analysis/tools/flow.py` (optical flow of a video), `flowstat.py` (speed stats), `camdump.js` (our camera
  measured straight from a film's `window.__camAt`). Castle now: accel p99 7.0 (Bridge 8.4), max 128 px/f.

## Characters (Mixamo)
- Account: the owner's Adobe account; the owner always signs in himself (never type passwords). Mixamo logs out often.
- Download flow in the in-app browser: set viewport 1280x800, search the animation, click the first result, Download,
  "Without Skin" for motions / "With Skin" for bodies, FBX Binary, 30 fps. Files land in Downloads as `.tmp`; move only
  fresh files from Downloads (`docs/analysis/tools/mixamo-grab.sh`; it once grabbed a non-Downloads file, now fixed).
- Bodies: Remy (`Walking.fbx`, hero, recoloured), `char_peasant_man`, `char_peasant_girl` (your people),
  `char_paladin` (armoured enemies). For non-Remy bodies the clips' Hips.position tracks are removed (otherwise they float).
- Motions downloaded: Walking, Running, Cheering, Digging, Climbing Ladder, Standing Draw Arrow, Falling Back Death,
  Pushing, Sleeping Idle, Thinking, Breathing Idle, Nervously Look Around, Terrified, Flailing Arms ("Floating"),
  Pull Heavy Object, Treading Water, Laying Idle, Low Crawl, Getting Up.
- The FBX files are NOT in this public repo (Adobe terms); re-download them with the names above into each film's `mixamo/`.

## Assets
- Poly Haven (CC0): textures aerial_grass_rock, brown_mud_02, damp_beach_sand, gravel_floor_02, rock_face_03,
  dry_ground_01, mud_cracked_dry_03, concrete_floor, rust_coarse_01, castle_brick_07, brown_planks_09, forrest_ground_01;
  HDRIs kloofendal_48d_partly_cloudy, kloofendal_overcast, brown_photostudio_02, kloppenheim_06; models grass_medium_01,
  fern_02, rock_moss_set_01, namaqualand_boulder_02 (tree_small_02 and island_tree_02 were too heavy, removed).
  Fetch more with `node tools/vh-engine/fetch-polyhaven.js tex:<id> hdri:<id> model:<id>`.
- Music: "Blue Sky.mp3" by Sergmusic (Freesound 639933, CC0). SFX: Freesound CC0 (each film's `sfx/CREDITS.txt`).
- Font: Poppins ExtraBold (OFL) for captions, Anton (OFL).

## Engine additions (tools/vh-engine/base.js)
`B.captionsCenter` (reel captions), `POST.mb` motion blur, `POST.exp`, `B.sweepify(material)` + `B.SWEEP` gold light sweep,
`film.fonts`, `film.captions: 'center' | false`.
