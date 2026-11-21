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
- Characters: realistic Mixamo (Remy), never cartoon characters. Motions must match the story (no ducking/"dodging bullets").
  Character height is normalised to 1.78 m with Box3; legs can be borrowed from a calm clip so they stay in the ground.
- No big text over the picture (no MOVIES / REAL LIFE / choice cards / big tags). Subtitles are enough.
  Small corner badges (temperature, "SUNK TO") are OK; thermometers only as small badges.
- No humming synth bed in the audio.
- Voice: Kokoro am_michael at speed 1.18. Whole video at 1.10x (`SPEED = 1.1` in script/timeline; make-audio applies `atempo`).
- Camera: varied, reel-style shots, not too zoomed in (frame-width cameras `B.makeShots` / `B.shotCam`).
- Fresh formats each time, not always the "So we / But" format.

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
