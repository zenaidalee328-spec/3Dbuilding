# 3D Building: realistic 3D explainer shorts

Vertical (1080×1920) science/engineering shorts written as code (three.js r160) and reviewed in VideoHub.

| Film | Folder | Length |
|---|---|---|
| Clay pot fridge | `films/clay-pot-fridge` | rendered v1 |
| Windcatcher | `films/windcatcher` | 44.4 s |
| The deepest hole | `films/deepest-hole` | 46.8 s |
| 10,000 years | `films/ten-thousand-years` | 40.6 s |
| Inside a watch | `films/watch-exploded` | 35.5 s |
| Earthquake test | `films/earthquake-test` | 36.2 s |
| Quicksand (Mixamo character) | `films/quicksand-pov` | 35.3 s, rendered v1 |

Shared engine and film template: `tools/vh-engine`. Rules and style notes: `CLAUDE.md`.

## Setup on a new PC
1. Install Git + Git LFS, Node.js, ffmpeg, Python (Kokoro TTS for voices) and VideoHub.
2. Clone into the VideoHub workspace: `git clone https://github.com/zenaidalee328-spec/3Dbuilding C:\Users\Musa\Documents\VideoHub`
   (or clone elsewhere and copy `films/` and `tools/` into the workspace).
3. In each film folder: `npm install` (puppeteer for render.js), then open it with `hub_live`.

Not in the repo: renders (`*.mp4`, `render/`), stills (`snaps/`), other channels' films.

## Licences
Poly Haven textures/HDRIs/models: CC0. Freesound SFX: CC0 (see `sfx/CREDITS.txt`). Anton font: OFL.
three.js: MIT. Mixamo character/animations: not included (Adobe terms). Download Remy + clips listed in films/quicksand-pov/mixamo/manifest.js from mixamo.com.
