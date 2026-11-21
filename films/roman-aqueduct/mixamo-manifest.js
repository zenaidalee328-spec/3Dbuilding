// Lists the Mixamo FBX files in mixamo/ and writes mixamo/manifest.js (window.MIXAMO = {model, files}): the biggest file
// is the character (downloaded "With Skin"); film.js picks each role's clip by file name.   node mixamo-manifest.js
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'mixamo');
const files = fs.readdirSync(DIR).filter(f => /\.fbx$/i.test(f)).map(f => ({ f, size: fs.statSync(path.join(DIR, f)).size })).sort((a, b) => b.size - a.size);
const out = { model: files[0].f, files: files.map(x => x.f) };
fs.writeFileSync(path.join(DIR, 'manifest.js'), 'window.MIXAMO = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out);
