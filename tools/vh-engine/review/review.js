// Review kit, step 1: opens a film's live page and saves what the reviewers need into <film>/review/:
//   frames/f_<t>.jpg   a frame every 0.5 s (270x480), taken from the page itself (no render)
//   data.json          duration, every word with its time, the camera's path (window.__camAt) for every frame
// Then run:  python tools/vh-engine/review/analyse.py <film>     (metrics + 4x4 sheets with the spoken words)
//   node tools/vh-engine/review/review.js <film folder> [step=0.5]
'use strict';
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const film = path.resolve(process.argv[2] || '.'), step = +(process.argv[3] || 0.5);
const pp = require(require.resolve('puppeteer-core', { paths: [process.env.VIDEOHUB_DIR || 'D:/video hub/Videohub', film] }));
(async () => {
  const exe = [process.env.CHROME, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(f => fs.existsSync(f));
  const br = await pp.launch({ executablePath: exe, headless: 'new', args: ['--allow-file-access-from-files', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await br.newPage(); await p.setViewport({ width: 1080, height: 1920 });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto(pathToFileURL(path.join(film, 'index.html')).href);
  await p.waitForFunction('window.READY === true', { timeout: 300000 });
  const out = path.join(film, 'review'), fr = path.join(out, 'frames');
  fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
  const data = await p.evaluate(() => {
    const TL = window.TL, DUR = TL.DUR, cams = [];
    if (window.__camAt) for (let f = 0; f <= DUR * 30; f++) { const C = window.__camAt(f / 30); cams.push([C.p.x, C.p.y, C.p.z, C.q.x, C.q.y, C.q.z, C.f]); }
    return { DUR, words: TL.words.map(w => ({ w: w.w, t0: w.t0, t1: w.t1, line: w.line })), lines: TL.lines.map(l => ({ id: l.id, text: l.text, t0: l.t0, t1: l.t1 })),
      scenes: window.VH_SCENES || [], cams };
  });
  const cdp = await p.target().createCDPSession(), shots = [];
  for (let t = step / 2; t < data.DUR; t += step) {
    await p.evaluate(t => window.renderOut(t), t);
    const { data: b64 } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 0.25 } });
    const f = `f_${t.toFixed(2).padStart(6, '0')}.jpg`; fs.writeFileSync(path.join(fr, f), Buffer.from(b64, 'base64')); shots.push({ t, f });
  }
  data.frames = shots; fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(data));
  await br.close(); console.log(`review: ${shots.length} frames, ${data.words.length} words, camera ${data.cams.length ? 'yes' : 'no (__camAt missing)'} -> ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
