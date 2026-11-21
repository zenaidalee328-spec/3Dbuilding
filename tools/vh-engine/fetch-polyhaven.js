// Downloads Poly Haven (CC0) assets into tools/vh-engine/assets/: textures (diff, nor_gl, rough jpg), HDRIs (.hdr),
// models (glTF + bin + textures). Skips files that are already there.
//   node fetch-polyhaven.js tex:brown_mud_02 hdri:kloofendal_48d_partly_cloudy model:grass_medium_01 ...   [res=2k]
'use strict';
const fs = require('fs'), path = require('path'), https = require('https');
const OUT = path.join(__dirname, 'assets'), UA = { 'User-Agent': 'vh-film-tools' };
const get = url => new Promise((ok, no) => https.get(url, { headers: UA }, r => {
  if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(r.headers.location).then(ok, no);
  if (r.statusCode !== 200) return no(new Error(r.statusCode + ' ' + url));
  const b = []; r.on('data', d => b.push(d)); r.on('end', () => ok(Buffer.concat(b))); }).on('error', no));
async function save(url, file) { if (fs.existsSync(file)) return 0; fs.mkdirSync(path.dirname(file), { recursive: true }); const b = await get(url); fs.writeFileSync(file, b); return b.length; }
(async () => {
  const args = process.argv.slice(2), res = (args.find(a => a.startsWith('res=')) || 'res=2k').slice(4);
  let total = 0;
  for (const a of args.filter(a => !a.startsWith('res='))) {
    const [kind, id] = a.split(':'), files = JSON.parse((await get('https://api.polyhaven.com/files/' + id)).toString());
    if (kind === 'tex') {
      const maps = { diff: files.Diffuse, nor_gl: files.nor_gl, rough: files.Rough };
      for (const [k, m] of Object.entries(maps)) { const f = m && (m[res] || m['1k']); if (f && f.jpg) total += await save(f.jpg.url, path.join(OUT, 'tex', `${id}_${k}.jpg`)); }
    } else if (kind === 'hdri') {
      const f = files.hdri[res] || files.hdri['1k']; total += await save(f.hdr.url, path.join(OUT, 'hdri', `${id}_${res}.hdr`));
    } else if (kind === 'model') {
      const f = files.gltf[res] || files.gltf['1k'], dir = path.join(OUT, 'models', id);
      total += await save(f.gltf.url, path.join(dir, id + '.gltf'));
      for (const [p, inc] of Object.entries(f.gltf.include || {})) total += await save(inc.url, path.join(dir, p));
    }
    console.log('ok', kind, id);
  }
  console.log('downloaded', (total / 1e6).toFixed(1), 'MB');
})().catch(e => { console.error(e.message); process.exit(1); });
