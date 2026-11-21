// opens a film page and measures its camera: screen motion of the aim point per frame (px at 1080 wide), and zoom
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const pp = require(require.resolve('puppeteer-core', { paths: ['D:/video hub/Videohub'] }));
(async () => {
  const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(f => fs.existsSync(f));
  const br = await pp.launch({ executablePath: exe, headless: 'new', args: ['--allow-file-access-from-files', '--use-angle=d3d11', '--enable-gpu'] });
  const p = await br.newPage(); await p.setViewport({ width: 1080, height: 1920 });
  await p.goto(pathToFileURL(path.resolve(process.argv[2], 'index.html')).href);
  await p.waitForFunction('window.READY === true', { timeout: 300000 });
  const rows = await p.evaluate(() => {
    const out = [], DUR = window.TL.DUR, cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 5000);
    let prev = null;
    for (let f = 0; f < DUR * 30; f++) {
      const C = window.__camAt(f / 30);
      cam.position.copy(C.p); cam.lookAt(C.q); cam.fov = C.f; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      if (prev) { const d = prev.p.distanceTo(prev.q), aim = prev.p.clone().add(prev.q.clone().sub(prev.p).normalize().multiplyScalar(d)).project(cam);
        const zoom = (prev.p.distanceTo(prev.q) / C.p.distanceTo(C.q) - 1) * 100 * (Math.tan(prev.f * Math.PI / 360) / Math.tan(C.f * Math.PI / 360));
        out.push([aim.x * 540, -aim.y * 960, zoom, 0]); }
      prev = C;
    }
    return out;
  });
  fs.writeFileSync(process.argv[3], JSON.stringify(rows)); await br.close(); console.log(rows.length, 'frames');
})();
