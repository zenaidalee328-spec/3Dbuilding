// Finds the Mixamo FBX files in mixamo/ and writes mixamo/manifest.js (window.MIXAMO) for film.js:
// the biggest file is the character (downloaded "With Skin"); the others are clips, matched by name.
//   node mixamo-manifest.js
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'mixamo');
const files = fs.readdirSync(DIR).filter(f => /\.fbx$/i.test(f)).map(f => ({ f, size: fs.statSync(path.join(DIR, f)).size }));
if (!files.length) { console.log('no .fbx in mixamo/'); process.exit(1); }
files.sort((a, b) => b.size - a.size);
const ROLES = { walk: /walk/i, scared: /nervous|look around|terrif|scared|fear|shock|surpris/i, struggle: /flail|struggl|panic|tread|swim/i, pull: /pull/i,
  float: /float|back ?float|lay|lying|relax/i, roll: /crawl|roll/i, up: /get(ting)? ?up|stand(ing)? ?up|getup/i };
const clips = {};
// each role takes the best match: the earlier words in its pattern win (nervous before terrified, flail before tread)
for (const [role, re] of Object.entries(ROLES)) { const alts = re.source.split('|'); for (const a of alts) { const hit = files.find(({ f }) => new RegExp(a, 'i').test(f) && !Object.values(clips).includes(f)); if (hit) { clips[role] = hit.f; break; } } }
const out = { model: files[0].f, clips };
fs.writeFileSync(path.join(DIR, 'manifest.js'), 'window.MIXAMO = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out);
