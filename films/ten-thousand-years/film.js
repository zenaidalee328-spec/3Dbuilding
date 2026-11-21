// "10,000 years": one river bend in the Indus valley, seen from the same spot while the years run: wild river, first
// farmers, a baked-brick city, the river moves, sand buries the city, a village, a fort, the railway, a modern city, and
// an x-ray of the buried city under it. The hook starts in today's city and rewinds. Uses base.js (BASE).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const T = {}; ['hook', 'wild', 'farm', 'city', 'shift', 'buried', 'village', 'fort', 'rail', 'today', 'end'].forEach(id => { T[id] = LN(id).t0; T[id + 'E'] = LN(id).t1; });
  T.ten = cue('hook', 'ten'); T.drains = cue('city', 'drains'); T.under = cue('end', 'under');

  // ---------- the year at time t (the hook rewinds from today)
  const YK = [[0, 2025], [T.ten - 0.1, 2025], [T.hookE + 0.1, -8000], [T.wild + 0.3, -8000], [T.farm, -7000], [T.farm + 0.6, -6000], [T.city, -4000], [T.city + 0.7, -2600],
    [T.shift, -2300], [T.shift + 0.6, -1900], [T.buried, -1700], [T.buriedE, 200], [T.village + 0.4, 400], [T.fort, 1300], [T.fort + 0.5, 1600], [T.rail, 1700],
    [T.rail + 0.5, 1900], [T.today, 1960], [T.today + 0.6, 2025], [DUR + 1, 2025]];
  const yearAt = t => { for (let i = 0; i + 1 < YK.length; i++) { const [a, ya] = YK[i], [b, yb] = YK[i + 1]; if (t < b) return lerp(ya, yb, i === 1 ? eio(k(t, a, b)) : k(t, a, b)); } return 2025; };
  const ky = (Y, a, b) => sm(k(Y, a, b));

  // ---------- light
  const SUN = V(0.55, 0.7, 0.45).normalize();
  B.loadHDR('hdri/kloofendal_48d_partly_cloudy_2k.hdr', SUN, 55);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -330, right: 330, top: 330, bottom: -330, near: 10, far: 1500 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x8a7a5a, 0.4); scene.add(hemi);
  scene.fog = new THREE.Fog(0xd9d4c8, 1800, 7000);

  // ---------- terrain: gentle noise, a mound that grows over the buried city, a river channel that moves
  const riverA = z => -115 + 32 * Math.sin(z / 70) + 10 * Math.sin(z / 23 + 1), riverB = z => -265 + 38 * Math.sin(z / 95 + 1.3);
  function heightAt(x, z, Y) {
    const rk = ky(Y, -2000, -1700), bury = ky(Y, -1700, 300), dig = ky(Y, 1960, 2025) * 0.3;
    const n = (B.fbm((x + 600) / 1200, (z + 600) / 1200, 6, 3) - 0.5) * 4;
    const r = Math.hypot(x, z), mound = (2.5 + 8 * bury) * Math.exp(-r * r / (2 * 95 * 95)) * (1 - dig);
    const ca = Math.max(0, 1 - Math.abs(x - riverA(z)) / 26), cb = Math.max(0, 1 - Math.abs(x - riverB(z)) / 26);
    const carve = 5.5 * (sm(ca) * (1 - rk) * (1 - 0.6 * bury * 0) + sm(cb) * rk);
    return n + mound - carve;
  }
  const WATER_Y = -1.4;
  const SEG = 150, SIZE = 640;
  const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tGeo.rotateX(-Math.PI / 2);
  const tCol = new Float32Array(tGeo.attributes.position.count * 3); tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const groundT = B.procTex(512, (u, v, i, j) => { const n = B.fbm(u, v, 32, 4), s = hash(i * 1.3 + j * 7.1); const l = 0.8 + 0.3 * n + (s > 0.95 ? 0.08 : 0); return [255 * l, 255 * l, 255 * l, n]; }, 2, [60, 60]);
  const tMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: B.tex('dry_ground_01', 70, 70), normalMap: B.tex('dry_ground_01', 70, 70, 'nor_gl'), roughness: 1, transparent: false, opacity: 1, color: 0xffffff });
  tMat.color.setScalar(1.45);   // the ground photo is dark: the vertex colours carry the tint
  const terrain = new THREE.Mesh(tGeo, tMat); terrain.receiveShadow = true; scene.add(terrain);
  const C = { grass: new THREE.Color(0.32, 0.46, 0.18), dry: new THREE.Color(0.74, 0.62, 0.42), sand: new THREE.Color(0.82, 0.7, 0.5), mud: new THREE.Color(0.5, 0.42, 0.32),
    town: new THREE.Color(0.66, 0.6, 0.52), city: new THREE.Color(0.5, 0.5, 0.5) };
  Object.values(C).forEach(c => c.convertSRGBToLinear());   // these are picked as sRGB colours
  const tmpC = new THREE.Color();
  function shapeTerrain(Y) {
    const P = tGeo.attributes.position, rk = ky(Y, -2000, -1700), bury = ky(Y, -1700, 300), townK = ky(Y, 1900, 1960), cityK = ky(Y, 1960, 2025), farm = ky(Y, -6500, -5800);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), y = heightAt(x, z, Y); P.setY(i, y);
      const dr = Math.min(Math.abs(x - riverA(z)) + 400 * rk, Math.abs(x - riverB(z)) + 400 * (1 - rk));
      const wet = Math.exp(-Math.max(0, dr - 20) / 70);
      tmpC.copy(C.dry).lerp(C.grass, wet * (1 - 0.2 * farm));
      const r = Math.hypot(x, z);
      tmpC.lerp(C.sand, bury * (1 - ky(Y, 400, 900) * 0.5) * Math.exp(-r * r / (2 * 110 * 110)));
      tmpC.lerp(C.town, townK * Math.exp(-r * r / (2 * 140 * 140)) * 0.7);
      tmpC.lerp(C.city, cityK * clamp(1.4 - r / 260) * 0.8);
      if (y < WATER_Y + 0.4) tmpC.lerp(C.mud, 0.7);
      tCol[i * 3] = tmpC.r; tCol[i * 3 + 1] = tmpC.g; tCol[i * 3 + 2] = tmpC.b;
    }
    P.needsUpdate = true; tGeo.attributes.color.needsUpdate = true; tGeo.computeVertexNormals();
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ color: 0x1d5a78, roughness: 0.22, metalness: 0.05, envMapIntensity: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; scene.add(water);
  // a wide flat plain beyond the patch
  // the plain beyond the patch: a big square with the patch cut out (so it never covers the river)
  const pS = new THREE.Shape(); pS.moveTo(-3000, -3000); pS.lineTo(3000, -3000); pS.lineTo(3000, 3000); pS.lineTo(-3000, 3000);
  const pH = new THREE.Path(); pH.moveTo(-SIZE / 2 + 2, -SIZE / 2 + 2); pH.lineTo(-SIZE / 2 + 2, SIZE / 2 - 2); pH.lineTo(SIZE / 2 - 2, SIZE / 2 - 2); pH.lineTo(SIZE / 2 - 2, -SIZE / 2 + 2); pS.holes.push(pH);
  const plain = new THREE.Mesh(new THREE.ShapeGeometry(pS), new THREE.MeshStandardMaterial({ map: B.tex('dry_ground_01', 0.109, 0.109), roughness: 1, color: C.dry.clone().multiplyScalar(1.45) })); plain.rotation.x = -Math.PI / 2; plain.position.y = -0.3; scene.add(plain);

  // ---------- instanced things
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = V(1, 1, 1), tmpP = V(), YAX = V(0, 1, 0);
  function inst(geo, mat, n, colors) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    if (colors) for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(1, 1, 1)); return m; }
  const put = (m, i, x, y, z, sx, sy, sz, ry = 0) => { tmpQ.setFromAxisAngle(YAX, ry); tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz)); m.setMatrixAt(i, tmpM); };
  const hideI = (m, i) => { tmpM.makeScale(0, 0, 0); m.setMatrixAt(i, tmpM); };
  const box1 = new THREE.BoxGeometry(1, 1, 1); box1.translate(0, 0.5, 0);
  const cyl1 = new THREE.CylinderGeometry(1, 1, 1, 14); cyl1.translate(0, 0.5, 0);
  const cone1 = new THREE.ConeGeometry(1, 1, 14); cone1.translate(0, 0.5, 0);
  // trees
  const NT = 520, trees = [];
  for (let i = 0; i < NT; i++) { const a = hash(i + 1) * 6.283, r = 30 + Math.sqrt(hash(i + 2)) * 290; trees.push([Math.cos(a) * r, Math.sin(a) * r, 6 + hash(i + 3) * 7, hash(i + 4)]); }
  const trunks = inst(cyl1, new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }), NT), crowns = inst(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3e6a2a, roughness: 0.95, flatShading: true }), NT, true);
  // fields
  const NF = 46, fields = [];
  for (let i = 0; i < NF; i++) { const z = -250 + i * 11 + hash(i) * 4, side = i % 2 ? 1 : -1; fields.push([riverA(z) + side * (40 + hash(i + 7) * 40), z, 30 + hash(i + 8) * 25, 9 + hash(i + 9) * 4]); }
  const fieldM = inst(box1, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), NF, true);
  // huts
  const NH = 26, huts = [];
  for (let i = 0; i < NH; i++) { const a = -0.6 + hash(i + 20) * 2.4 + Math.PI, r = 45 + hash(i + 21) * 50; huts.push([Math.cos(a) * r * 0.9 + 20, Math.sin(a) * r]); }
  const hutW = inst(cyl1, new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 1 }), NH), hutR = inst(cone1, new THREE.MeshStandardMaterial({ color: 0xb59a5e, roughness: 1 }), NH);
  // the baked-brick city: a grid of houses with streets (and a citadel)
  const brick = B.pbr('red_brick_03', 1, 1, { color: 0xe0a080 }, false);
  const blocks = [];
  for (let gx = -7; gx <= 7; gx++) for (let gz = -7; gz <= 7; gz++) { if (gx % 4 === 0 || gz % 4 === 0) continue; const x = gx * 11, z = gz * 11;
    if (Math.hypot(x, z) > 84) continue; blocks.push([x, z, 4 + hash(gx * 13 + gz) * 4, hash(gx * 7 + gz * 3 + 1)]); }
  const NB = blocks.length, cityM = inst(box1, brick, NB, true);
  const citadel = B.boxAt(-70, 0, -70, -40, 9, -40, brick); citadel.visible = false;
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6 });
  const drains = [-44, 0, 44].flatMap(c => [B.boxAt(c - 0.6, 0, -84, c + 0.6, 0.25, 84, drainMat), B.boxAt(-84, 0, c - 0.6, 84, 0.25, c + 0.6, drainMat)]);
  // the village (on top of the mound)
  const plaster = B.pbr('clay_plaster', 1, 1, { color: 0xe8c79c });
  const NV = 20, vil = []; for (let i = 0; i < NV; i++) { const a = hash(i + 40) * 6.283, r = 10 + hash(i + 41) * 45; vil.push([Math.cos(a) * r, Math.sin(a) * r, 5 + hash(i + 42) * 3, hash(i + 43) * 3]); }
  const vilM = inst(box1, plaster, NV);
  // the fort
  const fortG = new THREE.Group(); scene.add(fortG); const fortMat = B.pbr('red_brick_03', 3, 1, { color: 0xc89a70 }, false);
  const FX0 = 40, FZ0 = 20, FS = 34;
  [[FX0 - FS, FZ0 - FS, FX0 + FS, FZ0 - FS + 3], [FX0 - FS, FZ0 + FS - 3, FX0 + FS, FZ0 + FS], [FX0 - FS, FZ0 - FS, FX0 - FS + 3, FZ0 + FS], [FX0 + FS - 3, FZ0 - FS, FX0 + FS, FZ0 + FS]]
    .forEach(([a, b, c, d]) => B.boxAt(a, 0, b, c, 9, d, fortMat, fortG));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const m = B.shadowed(new THREE.Mesh(cyl1, fortMat)); m.scale.set(6, 12, 6); m.position.set(FX0 + sx * FS, 0, FZ0 + sz * FS); fortG.add(m); });
  B.boxAt(FX0 - 6, 0, FZ0 + FS - 4, FX0 + 6, 13, FZ0 + FS + 2, fortMat, fortG);
  // the railway, the station, a train
  const RX = 175, railG = new THREE.Group(); scene.add(railG);
  B.boxAt(RX - 3, 0, -330, RX + 3, 0.6, 330, new THREE.MeshStandardMaterial({ color: 0x7a7068, roughness: 1 }), railG);
  [-0.8, 0.8].forEach(o => B.boxAt(RX + o - 0.08, 0.6, -330, RX + o + 0.08, 0.8, 330, new THREE.MeshStandardMaterial({ color: 0x55504a, metalness: 0.8, roughness: 0.4 }), railG));
  B.boxAt(RX + 6, 0, -25, RX + 16, 7, 25, plaster, railG); B.boxAt(RX + 5, 7, -27, RX + 17, 8, 27, new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 }), railG);
  const train = new THREE.Group(); scene.add(train);
  for (let i = 0; i < 7; i++) B.boxAt(-1.6, 0.8, i * 13, 1.6, 4.6, i * 13 + 12, new THREE.MeshStandardMaterial({ color: i ? 0x6a2a20 : 0x222222, roughness: 0.6, metalness: 0.2 }), train);
  // the town (1900s) and the modern city
  const NTW = 80, town = []; for (let i = 0; i < NTW; i++) { const a = hash(i + 60) * 6.283, r = 60 + hash(i + 61) * 110; town.push([Math.cos(a) * r, Math.sin(a) * r, 4 + hash(i + 62) * 5, 6 + hash(i + 63) * 6]); }
  const townM = inst(box1, B.pbr('clay_plaster', 1, 1, { color: 0xf2e6d2 }), NTW);
  const winT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#9a9a98'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.fillStyle = hash(i * 9 + j) > 0.35 ? '#2a3440' : '#ffd9a0'; x.fillRect(6 + i * 31, 6 + j * 15, 22, 9); }
    const t = B.srgb(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const winE = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) if (hash(i * 9 + j + 0.5) > 0.4) { x.fillStyle = '#ffcf80'; x.fillRect(6 + i * 31, 6 + j * 15, 22, 9); }
    const t = B.srgb(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const towerMat = new THREE.MeshStandardMaterial({ map: winT, emissiveMap: winE, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6, metalness: 0.1 });
  const NC = 190, cityB = [];
  for (let i = 0; i < NC; i++) { const a = hash(i + 80) * 6.283, r = 40 + Math.sqrt(hash(i + 81)) * 250, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - FX0, z - FZ0) < 50 || Math.abs(x - RX) < 14 || Math.abs(x - riverB(z)) < 34) continue;
    cityB.push([x, z, 10 + Math.pow(hash(i + 82), 2) * 70 * (x > 0 ? 1 : 0.6), 10 + hash(i + 83) * 12, hash(i + 84)]); }
  const cityBM = inst(box1, towerMat, cityB.length);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.9 });
  const roads = [-150, -60, 100, 230].flatMap(c => [B.boxAt(-230, 0, c - 4, 320, 0.3, c + 4, roadMat), B.boxAt(c - 4, 0, -320, c + 4, 0.3, 320, roadMat)]);
  const bridge = B.boxAt(-320, 2.5, 96, -200, 3.5, 104, new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.8 }));

  // ---------- the world in year Y
  const zone = (x, z) => Math.hypot(x, z);
  function world(Y, t) {
    shapeTerrain(Y);
    // trees: thin out with farming and cities
    const dens = Y < -6500 ? 1 : lerp(1, 0.4, ky(Y, -6500, -5200)) - 0.15 * ky(Y, -2700, -2400) + 0.2 * ky(Y, -1500, 0) - 0.2 * ky(Y, 1880, 2025);
    trees.forEach(([x, z, h, hs], i) => {
      let d = dens; if (zone(x, z) < 95 && Y > -2700 && Y < -1700) d = 0; if (Y > 1960 && zone(x, z) < 250) d *= 0.3;
      if (hs < d) { const y = heightAt(x, z, Y); if (y < WATER_Y + 0.3) { hideI(trunks, i); hideI(crowns, i); return; }
        put(trunks, i, x, y, z, 0.5, h * 0.45, 0.5); put(crowns, i, x, y + h * 0.62, z, h * 0.32, h * 0.36, h * 0.32);
        crowns.setColorAt(i, tmpC.setRGB(0.24 + hs * 0.12, 0.42 + hs * 0.12, 0.16).convertSRGBToLinear()); }
      else { hideI(trunks, i); hideI(crowns, i); }
    });
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; crowns.instanceColor.needsUpdate = true;
    // fields: from the first farmers; gone under the modern city
    const fk = ky(Y, -6300, -5800) * (1 - ky(Y, 1940, 1990));
    const rk = ky(Y, -2000, -1700);
    fields.forEach(([x, z, w, d], i) => { const fx = lerp(x, x + (riverB(z) - riverA(z)), rk), on = fk * (hash(i + 30) < 0.85 ? 1 : 0);
      if (on < 0.01) { hideI(fieldM, i); return; }
      put(fieldM, i, fx, heightAt(fx, z, Y) + 0.05, z, w * on, 0.25, d, 0.1);
      fieldM.setColorAt(i, tmpC.setRGB(...((i + Math.floor(Y / 300)) % 3 ? [0.62, 0.62, 0.22] : [0.36, 0.55, 0.2])).convertSRGBToLinear()); });
    fieldM.instanceMatrix.needsUpdate = true; fieldM.instanceColor.needsUpdate = true;
    // huts
    const hk = ky(Y, -6300, -5900) * (1 - ky(Y, -2750, -2600));
    huts.forEach(([x, z], i) => { if (hk * 1.1 < hash(i + 25)) { hideI(hutW, i); hideI(hutR, i); return; } const y = heightAt(x, z, Y);
      put(hutW, i, x, y, z, 2.6, 2.4, 2.6); put(hutR, i, x, y + 2.4, z, 3.3, 2.6, 3.3); });
    hutW.instanceMatrix.needsUpdate = hutR.instanceMatrix.needsUpdate = true;
    // the brick city: built, ruined, buried (the ground rises over it; it stays where it was)
    const bk = ky(Y, -2650, -2380), ruin = ky(Y, -1950, -1550);
    blocks.forEach(([x, z, h, hs], i) => { if (bk < hs * 0.9 + 0.05) { hideI(cityM, i); return; }
      const hh = h * lerp(1, 0.3 + 0.3 * hs, ruin), base = 2.5 * Math.exp(-(x * x + z * z) / (2 * 95 * 95)) + (B.fbm((x + 600) / 1200, (z + 600) / 1200, 6, 3) - 0.5) * 4;
      put(cityM, i, x, base - 0.5, z, 9.5, hh + 0.5, 9.5); cityM.setColorAt(i, tmpC.setRGB(1, 1, 1).multiplyScalar(lerp(1, 0.6, ruin))); });
    cityM.instanceMatrix.needsUpdate = true; cityM.instanceColor.needsUpdate = true;
    citadel.visible = bk > 0.5; citadel.position.y = 2.3 - 0.5 + 4.5 - 9 * (1 - lerp(1, 0.4, ruin)) / 2; citadel.scale.y = lerp(1, 0.4, ruin);
    drains.forEach(d => { d.visible = bk > 0.8; d.position.y = 2.4; });
    // the village on the mound
    const vk = ky(Y, 380, 650) * (1 - ky(Y, 1880, 1960));
    vil.forEach(([x, z, s, ry], i) => { if (vk < hash(i + 45)) { hideI(vilM, i); return; } put(vilM, i, x, heightAt(x, z, Y) - 0.3, z, s, 3.2, s * 0.8, ry); });
    vilM.instanceMatrix.needsUpdate = true;
    // the fort
    const fo = ky(Y, 1520, 1620); fortG.visible = fo > 0.01; fortG.scale.set(1, Math.max(0.01, fo), 1); fortG.position.y = heightAt(FX0, FZ0, Y) - 0.6;
    // the railway and the train
    const ra = ky(Y, 1870, 1900); railG.visible = ra > 0.5; railG.position.y = 0.2;
    train.visible = Y > 1900; train.position.set(RX, 0.6, ((t * 140) % 1100) - 620);
    // the town and the modern city
    const tk = ky(Y, 1895, 1965);
    town.forEach(([x, z, h, s], i) => { const on = tk > hash(i + 66) && !(Y > 1990 && hash(i + 67) < ky(Y, 1990, 2025) * 0.7);
      if (!on || Math.hypot(x - FX0, z - FZ0) < 44 || Math.abs(x - RX) < 10) { hideI(townM, i); return; } put(townM, i, x, heightAt(x, z, Y) - 0.3, z, s, h, s * 0.9, hash(i) * 0.4); });
    townM.instanceMatrix.needsUpdate = true;
    const ck = ky(Y, 1958, 2025);
    cityB.forEach(([x, z, h, s, hs], i) => { const g0 = clamp((ck - hs * 0.8) / 0.2); if (g0 <= 0) { hideI(cityBM, i); return; }
      put(cityBM, i, x, heightAt(x, z, Y) - 0.5, z, s, h * g0, s); });
    cityBM.instanceMatrix.needsUpdate = true;
    roads.forEach(r => { r.visible = Y > 1950; r.position.y = 0.6; }); bridge.visible = Y > 1975;
  }

  // ---------- camera: one place, a slow orbit, push-ins for each age
  const SH = B.makeShots([
    [0, [0.62, 0.42, 0.66], [20, 25, 0], 330, 6],
    [T.wild, [0.55, 0.38, 0.74], [-70, 0, 0], 300, 8],
    [T.farm + 0.3, [0.42, 0.36, 0.82], [-50, 0, 10], 190, 6],
    [T.city + 0.4, [0.5, 0.5, 0.7], [-5, 0, 0], 170, 8],
    [T.shift, [0.55, 0.45, 0.7], [-110, 0, 0], 320, 6],
    [T.village + 0.2, [0.62, 0.38, 0.68], [10, 8, 0], 150, 6],
    [T.fort, [0.68, 0.32, 0.66], [40, 10, 20], 130, 8],
    [T.rail, [0.78, 0.34, 0.52], [150, 5, 0], 220, -6],
    [T.today, [0.6, 0.36, 0.7], [20, 30, 0], 360, 8],
    [T.end, [0.5, 0.62, 0.6], [0, 0, 0], 300, 6],
  ].map(s => [s[0], [s[2][0] + s[1][0] * 100, s[2][1] + s[1][1] * 100, s[2][2] + s[1][2] * 100], s[2], s[3], s[4]]));

  function update(t) {
    const Y = yearAt(t); window.__Y = Y;
    world(Y, t);
    const night = sm(k(t, T.today + 0.3, T.today + 1.6));
    const xray = sm(k(t, T.under - 0.3, T.under + 0.6));
    const see = xray > 0.001; if (tMat.transparent !== see) { tMat.transparent = see; tMat.needsUpdate = true; }
    tMat.opacity = 1 - 0.62 * xray; tMat.depthWrite = xray < 0.05; plain.material.transparent = true; plain.material.opacity = 1 - 0.5 * xray;
    sun.intensity = 3.0 * (1 - 0.75 * night); hemi.intensity = 0.4 * (1 - 0.5 * night);
    if ('backgroundIntensity' in scene) scene.backgroundIntensity = 1 - 0.75 * night;
    if ('environmentIntensity' in scene) scene.environmentIntensity = 1 - 0.6 * night;
    towerMat.emissiveIntensity = 2.2 * night;
    B.R.toneMappingExposure = 1.1 - 0.2 * night;
    sun.position.copy(SUN).multiplyScalar(700).add(V(0, 0, 0)); sun.target.position.set(0, 0, 0);
    const c = B.shotCam(SH, t, { end: DUR, glide: 0.9, push: 0.08 });
    c.Q.x += Math.sin(t * 0.4) * 3;
    const P = B.place(c); cam.near = 2; cam.far = 4000; cam.updateProjectionMatrix();
    B.POST.aperture = 0.12;
  }

  const yearText = Y => { const y = Math.round(Y); return y < 0 ? `${(-y).toLocaleString('en-US')} BC` : y < 1000 ? `AD ${y}` : `${y}`; };
  const ERAS = [[-9000, -6200, 'WILD RIVER'], [-6200, -2700, 'FIRST FARMERS'], [-2700, -1900, 'A CITY OF BAKED BRICK'], [-1900, -1700, 'THE RIVER MOVES AWAY'],
    [-1700, 350, 'BURIED'], [350, 1520, 'A VILLAGE ON THE MOUND'], [1520, 1870, 'THE FORT'], [1870, 1960, 'THE RAILWAY TOWN'], [1960, 2100, 'TODAY']];
  // when each age starts and ends on screen (after the hook)
  const ERA_T = ERAS.map(([a, b, text]) => { let t0 = null, t1 = DUR + 1;
    for (let t = T.wild - 0.2; t < DUR; t += 0.02) { const Y = yearAt(t); if (t0 == null && Y >= a && Y < b) t0 = t; if (t0 != null && Y >= b) { t1 = t; break; } }
    return [t0 == null ? -1 : t0, t1, text]; }).filter(e => e[0] >= 0);
  function overlay(t) {
    const Y = window.__Y;
    B.vignette(0.18);
    const rew = t < T.hookE + 0.2 && t > T.ten - 0.2 ? sm(k(t, T.ten - 0.2, T.ten + 0.1)) * (1 - sm(k(t, T.hookE - 0.1, T.hookE + 0.2))) : 0;
    B.tint(rew * 0.5, '#3a6aff', 'soft-light');
    if (rew > 0) B.tag(t, '◀◀ REWIND', T.ten - 0.2, T.hookE + 0.2, 3, 400);
    B.counter(W / 2, 290, 1, yearText(Y), null, '#ffffff', 150);
    ERA_T.forEach(([t0, t1, text], i) => B.tag(t, text, t0, t1, i === 3 || i === 4 ? 1 : 0, 400));
    B.label(t, 'DRAINS UNDER THE STREETS', V(0, 3, 44), T.drains, T.shift + 0.2, 1, '#7cc8ff', -260);
    B.label(t, 'THE OLD CITY, STILL DOWN THERE', V(-10, 2, -10), T.under + 0.2, DUR + 1, -1, '#ffd23f', -320);
  }

  B.run({
    update, overlay, warm: [1, 15, 30, 38],
    scenes: [['Hook: rewind', 0, T.wild], ['Wild river', T.wild, T.farm], ['First farmers', T.farm, T.city], ['Brick city', T.city, T.shift], ['River moves', T.shift, T.buried],
      ['Buried', T.buried, T.village], ['Village', T.village, T.fort], ['Fort', T.fort, T.rail], ['Railway', T.rail, T.today], ['Today', T.today, T.end], ['X-ray', T.end, DUR]],
  });
})();
