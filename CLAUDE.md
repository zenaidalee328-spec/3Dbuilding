# Realistic 3D shorts: rules for Claude

This folder is the VideoHub workspace (`C:\Users\Musa\Documents\VideoHub`). The GitHub repo
`zenaidalee328-spec/3Dbuilding` holds only the films listed in `.gitignore` and `tools/vh-engine`.
Reply to the user in Roman Urdu.

## Workflow (VideoHub)
- Follow the `videohub` skill. New film: `sh tools/vh-engine/newfilm.sh <folder> "<Title>"` → `films/<folder>`.
- When it plays: `hub_project` (set `render.env.DUR`), then `hub_live`, then STOP and ask for notes ("Send to Claude").
- Fix notes in code only, mark each with `hub_note_update`. Check with stills: `node render.js snap 3 8 13` (→ `snaps/`).
- Render ONLY when the user asks, one at a time, via `hub_render`. After the first render set status `review`.

## Style the user wants (learned from feedback)
- Realistic as 3D allows: Poly Haven PBR textures + HDRI lighting (`B.loadHDR`, `B.pbr`), real models, depth of field.
- NO human characters for now (owner, 2026-11-23: their motions look odd). Tell the story with the machines, props, FX and camera; animals (e.g. the CC0 donkey) are OK.
- (If people ever come back) Characters: realistic Mixamo (Remy), never cartoon characters. Motions must match the story (no ducking/"dodging bullets").
  Character height is normalised to 1.78 m with Box3; legs can be borrowed from a calm clip so they stay in the ground.
- No big text over the picture (no MOVIES / REAL LIFE / choice cards / big tags). Subtitles are enough.
  Small corner badges (temperature, "SUNK TO") are OK; thermometers only as small badges.
- No humming synth bed in the audio.
- Voice: Kokoro am_michael at speed 1.18. Whole video at 1.10x (`SPEED = 1.1` in script/timeline; make-audio applies `atempo`).
- Camera: varied, reel-style shots, not too zoomed in (frame-width cameras `B.makeShots` / `B.shotCam`).
- Build beats: when the words say something is built, show it rising from start to finish, the whole thing in frame (ground to top), camera holding on it. Never a shot of empty sky where it will be.
- Fresh formats each time, not always the "So we / But" format.
- No score/tally gimmicks ("House two, hill zero", "HOUSE vs HILL 2:0" badges): the owner hates them, even when they are in a script he gives. Just name each fix plainly.
- No stock asides in scripts ("Being an absolute genius", "Using your huge brain", "Being smart"): the owner finds them repetitive.

## Mistakes not to repeat (owner feedback, Windmill + Hillside House, 2026-11-23)
Check every one of these BEFORE showing the owner a film:
1. **Show it plainly, never a cutaway.** No section/cross-section views of the ground: the owner could not tell what was happening.
   Show every fix from outside, on the surface, with machines and props doing the work: a drilling rig drilling beside the house, steel
   cages lowered into the holes, steel bars sliding into the slope row by row, pipes pushed in with water pouring out, wet patches + cracks.
2. **The camera goes to the thing the words are about.** When the voice says "you cut a ditch" / "a staircase" / "steel bars", that object
   fills the frame, close enough to read (about 10-20 m away), the camera holding on it while it is built. Never leave it a thin line far away.
3. **A built thing must be visible.** Don't sink it into the terrain (a channel inside the ground was invisible): raise it above the ground
   or cut the ground. Check a still of every build beat.
4. **Camera paths never pass through buildings.** Long moves between far-apart shots are hard cuts. Check a still in the middle of every move.
5. **Props never stick through the house** (rods, pipes, rigs): check their start and end positions.
6. **No score/tally gimmicks** ("House two, hill zero", "HOUSE vs HILL 2:0" badges), even when they are in the owner's own script.
   Name each fix plainly ("This is a crest channel.").
7. **"Congratulations" at most once, at the very end** (Windmill had 4, then 2; the owner wanted 1).
8. **No stock asides** ("Being an absolute genius", "Using your huge brain", "Being smart").
9. **Owner's own script: check the length first** (~3.4 words/s at our speed). Over 70 s: trim it to 55-70 s, keeping his facts and order.
10. **Background wind quiet:** bed about -38 dB, gusts -15 to -22 dB, so the voice is clear.
11. **Animals move at a real pace,** facing the way they walk, never sliding or teleporting.
12. **Before saying "done", look at a contact sheet of stills** (one per beat) and ask: would a viewer understand this frame without the words?

## Engine (`tools/vh-engine`)
- `base.js`: renderer + post (DOF, bloom, grade), HDRI, PBR, captions, `B.tag/B.badge/B.counter`, `B.gltf/B.fbx`, `B.run`.
- `template/`: index.html, render.js, timeline.js, make-audio.js, make-voice.py, vendor (three r160 + addons).
- `fetch-polyhaven.js`: downloads CC0 textures/HDRIs/models into `assets/`. `bundle-addons.js` rebuilds `vendor/three-addons.js`
  from `npm/three-0.160.0.tgz` (extract it to `npm/package` first).
- Quicksand: `mixamo-manifest.js` scans `mixamo/*.fbx` and writes `mixamo/manifest.js` (roles walk/scared/struggle/pull/float/roll/up).

## Read first
`docs/HISTORY.md` has every decision, the reference-shorts study, the camera rules, the Mixamo workflow and the asset list.
After each piece of work, commit and push everything to GitHub (the owner asked for this).

## Rules
- Never type passwords or codes; the user signs in himself (Adobe/Mixamo, GitHub).
- Download only with the user's OK. Never copy the paid HowItsBuiltKit files.
- The repo is PUBLIC: Mixamo .fbx files are NOT in it (Adobe terms forbid sharing them on their own). Re-download them from mixamo.com (Remy, Without Skin for clips) into films/quicksand-pov/mixamo/ and run node mixamo-manifest.js.
- Each film's `facts.md` lists claims to verify before posting and asset licences.

## Content system
New shorts go through the `shorts-studio` skill (claude/skills/shorts-studio): writer agent -> voice -> director agent -> build (main session only) -> creative + tech reviewer agents in parallel -> owner in VideoHub -> render -> QA -> push. Review kit: tools/vh-engine/review/.
