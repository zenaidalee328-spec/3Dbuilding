// "Roman Aqueduct": a "you build it, it breaks, you fix it" short. A thirsty hill town, a mountain spring, a dug channel,
// a valley in the way (filled with dirt, washed away), three rows of arches, a stone roof against frogs, a gentle tilt
// instead of pumps, and a tank that splits the water three ways. One continuous camera (whip pans, no cuts), a cast of
// Mixamo people, and the reel look: centre captions, gold sweeps when something works. Uses base.js (BASE).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const c = (l, w, n) => cue(l, w, n), L0 = id => LN(id).t0, L1 = id => LN(id).t1;
  const T = {
    city: c('hook', 'city'), well: c('hook', 'well'), thirsty: c('hook', 'thirsty'),
    carry: L0('carry'), mountain: c('carry', 'mountain'), walk: c('carry', 'walk'), day: c('carry', 'day'), half: c('carry', 'half'), spills: c('carry', 'spills'),
    genius: c('dig', 'genius'), dig: c('dig', 'dig'), city2: c('dig', 'city'),
    cong1: L0('cong1'), canal: c('cong1', 'canal'),
    valley: L0('valley'), deep: c('valley', 'deep'), refuses: c('valley', 'refuses'), uphill: c('valley', 'uphill'),
    fill: c('fill', 'fill'), dirt: c('fill', 'dirt'), rain: c('fill', 'rain'), washes: c('fill', 'washes'),
    brain: c('arches', 'brain'), build: c('arches', 'build'), arches: c('arches', 'arches'), across: c('arches', 'across'),
    short: L0('short'), shortW: c('short', 'short'), second: c('short', 'second'), third: c('short', 'third'),
    cong2: L0('cong2'), bridge: c('cong2', 'bridge'),
    frogsL: L0('frogs'), green: c('frogs', 'green'), frogs: c('frogs', 'frogs'), roof: c('frogs', 'roof'), stone: c('frogs', 'stone'), clean: c('frogs', 'clean'),
    pumpL: L0('pump'), fifty: c('pump', 'fifty'), pump: c('pump', 'pump'), tilt: c('pump', 'tilt'), cm: c('pump', 'twentyfive'), every: c('pump', 'every'), gravity: c('pump', 'gravity'),
    tanks: L0('tanks'), split: c('tanks', 'split'), fount: c('tanks', 'fountains'), baths: c('tanks', 'baths'), rich: c('tanks', 'rich'),
    drought: c('drought', 'drought'), cut: c('drought', 'cut'), never: c('drought', 'fountains'),
    end: L0('end'), roman: c('end', 'roman'),
  };

  // ---------- the land: a mountain (west), a plain, a river valley (x -45..45), a plain, a town on a hill (east)
  const YC = x => 30 - (x + 160) * 0.012;      // the water level in the channel (it falls 1.2 cm per metre, shown 50x)
  const RG = x => YC(x) - 0.35;                // the ground along the channel
  const PLAZA = V(204, 22, 10), CAST = V(180, 22, 0), BATH = V(222, 22, -20), VILLA = V(230, 22, 36), SPRING = V(-168, 0, 0);
  function hBase(x) {
    if (x < -176) return Math.min(80, 29.8 + (-176 - x) * 1.8);
    if (x < -45) return RG(x);
    if (x <= 45) { const a = Math.abs(x); return a < 20 ? 0.6 + 0.8 * (a / 20) * (a / 20) : lerp(1.4, RG(x), sm((a - 20) / 25)); }
    if (x < 172) return RG(x);
    if (x < 184) return lerp(RG(x), 22, sm((x - 172) / 12));
    if (x < 252) return 22;
    return lerp(22, 3, sm((x - 252) / 40));
  }
  const hN = (x, z) => B.fbm(x / 1600 + 0.5, z / 1600 + 0.5, 8, 4) - 0.5;
  function hAt(x, z) {
    let y = hBase(x); const az = Math.abs(z), n = hN(x, z);
    if (x < -176) y += n * 26 + (B.fbm(x / 300 + 0.2, z / 300 + 0.7, 8, 3) - 0.5) * 10 * sm((-176 - x) / 30);
    else if (!(x > -45 && x < 45) && x < 172) y += n * 16 * sm((az - 34) / 60);
    if (x >= 184) { const dz = Math.abs(z - 8); y = lerp(y, 6 + n * 10, sm((dz - 52) / 30)); }
    return y;
  }
  B.fogColor.set(0xcfdcea);
  const SUN0 = V(0.35, 0.72, 0.6).normalize(), SUN = SUN0.clone();
  B.loadHDR('hdri/kloofendal_48d_partly_cloudy_2k.hdr', SUN, 58);
  const sun = new THREE.DirectionalLight(0xfff2de, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd8e6ff, 0x8a7a5a, 0.55); scene.add(hemi);
  scene.fog = new THREE.Fog(0xcfdcea, 320, 1500);

  // textures made here: clean limestone blocks, plaster, roof tiles, a light ground grain
  const ashlar = B.procTex(512, (u, v, i, j) => { const rows = 4, row = Math.floor(v * rows), off = row % 2 ? 0.5 / 3 : 0, cu = (u + off) * 3, col = Math.floor(cu);
    const fu = cu - col, fv = v * rows - row, edge = Math.min(fu, 1 - fu, fv * 0.75, (1 - fv) * 0.75), mort = edge < 0.035 ? 1 : 0;
    const shade = 0.9 + 0.16 * hash(row * 13 + col * 7 + 3) + 0.06 * (B.fbm(u, v, 16, 3) - 0.5);
    const l = mort ? 0.72 : shade; return [236 * l, 218 * l, 182 * l, mort ? 0 : 0.6 + 0.4 * B.fbm(u, v, 24, 3)]; }, 2.2, [1, 1]);
  const plaster = B.procTex(256, (u, v) => { const n = B.fbm(u, v, 8, 4); const l = 0.92 + 0.1 * n; return [246 * l, 236 * l, 214 * l, n]; }, 1.2, [1, 1]);
  const tiles = B.procTex(256, (u, v) => { const r = Math.abs(Math.sin(u * Math.PI * 8)), s = (v * 6) % 1; const l = 0.75 + 0.25 * r - (s < 0.08 ? 0.25 : 0);
    return [200 * l, 92 * l, 52 * l, r - (s < 0.08 ? 1 : 0)]; }, 2.5, [1, 1]);
  const grain = B.procTex(512, (u, v, i, j) => { const n = B.fbm(u, v, 32, 4), s = hash(i * 3.1 + j * 7.7); const l = 0.86 + 0.16 * n + 0.05 * s; return [235 * l, 235 * l, 228 * l, n]; }, 1.6, [180, 140]);
  const stoneM = (rx, ry, col = 0xffffff) => { const m = B.sweepify(new THREE.MeshStandardMaterial({ map: ashlar.map.clone(), normalMap: ashlar.normalMap.clone(), color: col, roughness: 0.88 }));
    m.map.repeat.set(rx, ry); m.normalMap.repeat.set(rx, ry); m.map.needsUpdate = m.normalMap.needsUpdate = true; return m; };
  const STONE = stoneM(0.25, 0.25), STONE_S = stoneM(0.5, 0.5);
  const PLASTER = B.sweepify(new THREE.MeshStandardMaterial({ map: plaster.map, normalMap: plaster.normalMap, roughness: 0.92 }));
  plaster.map.repeat.set(0.15, 0.15); plaster.normalMap.repeat.set(0.15, 0.15);
  const ROOF = B.sweepify(new THREE.MeshStandardMaterial({ map: tiles.map, normalMap: tiles.normalMap, roughness: 0.8 }));
  tiles.map.repeat.set(0.4, 0.4); tiles.normalMap.repeat.set(0.4, 0.4);

  // ---------- terrain (vertex colours: grass, dirt, rock, a dusty town)
  {
    const SX = 1700, SZ = 1300, NX = 340, NZ = 260;
    const geo = new THREE.PlaneGeometry(SX, SZ, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate(40, 0, 0);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const GR = [0.5, 0.95, 0.42], GR2 = [0.64, 1.0, 0.48], DI = [1.0, 0.8, 0.62], RO = [0.78, 0.74, 0.72], TO = [1.0, 0.9, 0.74];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = hAt(x, z); pos.setY(i, y);
      const sl = Math.min(1, (Math.abs(hAt(x + 2, z) - hAt(x - 2, z)) + Math.abs(hAt(x, z + 2) - hAt(x, z - 2))) / 4);
      const m = B.fbm(x / 90 + 0.3, z / 90 + 0.1, 8, 3);
      let cc = GR.map((v, j) => lerp(v, GR2[j], m));
      cc = cc.map((v, j) => lerp(v, DI[j], clamp(sl * 1.6 - 0.2)));
      if (x < -176) cc = cc.map((v, j) => lerp(v, RO[j], sm((-176 - x) / 6)));
      if (x > 176 && Math.abs(z - 8) < 60) cc = cc.map((v, j) => lerp(v, TO[j], 0.55 * sm((60 - Math.abs(z - 8)) / 20) * sm((x - 176) / 8)));
      if (Math.abs(x) < 8) cc = cc.map((v, j) => lerp(v, DI[j], 0.5));
      col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const tm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: B.tex('aerial_grass_rock', 170, 130), normalMap: B.tex('aerial_grass_rock', 170, 130, 'nor_gl'), vertexColors: true, roughness: 0.95 }));
    tm.receiveShadow = true; scene.add(tm);
    // the mountain: its own rock surface
    const mg = new THREE.PlaneGeometry(260, 1300, 104, 260); mg.rotateX(-Math.PI / 2); mg.translate(-304, 0, 0);
    const mp = mg.attributes.position; for (let i = 0; i < mp.count; i++) { const x = Math.min(mp.getX(i), -174.5); mp.setX(i, x); mp.setY(i, hAt(x, mp.getZ(i)) + 0.06); }
    mg.computeVertexNormals();
    const mm = new THREE.Mesh(mg, B.pbr('rock_face_03', 26, 130, { color: 0xb8aea2 })); mm.receiveShadow = true; mm.castShadow = true; scene.add(mm);
  }
  // the river in the valley and a dirt road beside the channel
  const WATER = new THREE.MeshStandardMaterial({ color: 0x2a86b8, roughness: 0.08, metalness: 0.0, envMapIntensity: 0.9, emissive: 0x062030, emissiveIntensity: 0.3 });
  const ripple = B.procTex(256, (u, v) => [255, 255, 255, B.fbm(u, v, 6, 4)], 4, [1, 1]); WATER.normalMap = ripple.normalMap; WATER.normalScale = new THREE.Vector2(0.6, 0.6);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(14, 1300), new THREE.MeshStandardMaterial({ color: 0x2a7aa0, roughness: 0.1, envMapIntensity: 0.8, normalMap: ripple.normalMap }));
  river.rotation.x = -Math.PI / 2; river.position.set(0, 1.1, 0); scene.add(river);
  const ROAD = B.pbr('dry_ground_01', 1, 60, { color: 0xf0e2c8 });
  [[-160, -46], [46, 176]].forEach(([a, b]) => { const n = Math.round((b - a) / 2), geo = new THREE.PlaneGeometry(b - a, 3.2, n, 1); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (a + b) / 2; p.setY(i, RG(x) + 0.03); }
    const m = new THREE.Mesh(geo, ROAD); m.position.set((a + b) / 2, 0, 4.2); m.receiveShadow = true; scene.add(m); });

  // ---------- trees: cypresses and round olive trees, instanced (built after the camera path: none in its way)
  function plantTrees() {
    const cyG = new THREE.ConeGeometry(1.0, 8, 7); cyG.translate(0, 5, 0);
    const olG = new THREE.IcosahedronGeometry(2.2, 1); olG.translate(0, 3.2, 0);
    const trG = new THREE.CylinderGeometry(0.18, 0.25, 2, 5); trG.translate(0, 1, 0);
    const cyM = new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 0.9, flatShading: true }), olM = new THREE.MeshStandardMaterial({ color: 0x6b8a3a, roughness: 0.9, flatShading: true });
    const trM = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 0.9 });
    const spots = [];
    for (let i = 0; i < 900 && spots.length < 420; i++) {
      const x = -170 + hash(i * 3.1) * 440, z = (hash(i * 7.3) - 0.5) * 520;
      if (Math.abs(z) < 12 || (x > -50 && x < 50 && Math.abs(x) < 30) || x < -178) continue;
      if (x > 176 && Math.abs(z - 8) < 46) continue;
      spots.push([x, hAt(x, z), z, hash(i * 1.7), 0.8 + hash(i * 5.3) * 0.6]);
    }
    // a few beside the town's streets
    [[190, 30], [196, -14], [214, 30], [238, 0], [244, 22], [186, 18], [212, -32], [240, -10]].forEach(([x, z], i) => spots.push([x, 22, z, 0.2 + i * 0.1, 0.9]));
    const put = (geo, mat, list, scl) => { const im = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), q = new THREE.Quaternion();
      list.forEach(([x, y, z, r, s], i) => { q.setFromAxisAngle(V(0, 1, 0), r * 6); M.compose(V(x, y - 0.2, z), q, V(s, s * scl, s)); im.setMatrixAt(i, M); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im); };
    const path = []; for (let t = 0; t <= DUR; t += 0.04) { const C = camAt(t); path.push([C.p, C.q]); }
    const segD = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1, u = clamp(((px - a.x) * dx + (pz - a.z) * dz) / L); return Math.hypot(px - a.x - u * dx, pz - a.z - u * dz); };
    const clear = ([x, y, z]) => !path.some(([p, q]) => Math.hypot(x - p.x, z - p.z) < 9 || (segD(x, z, p, q) < 3.5 && y + 8 > Math.min(p.y, q.y)));
    for (let i = spots.length - 1; i >= 0; i--) if (!clear(spots[i])) spots.splice(i, 1);
    const cy = spots.filter(s => s[3] < 0.55), ol = spots.filter(s => s[3] >= 0.55);
    put(cyG, cyM, cy, 1); put(trG, trM, cy, 1); put(olG, olM, ol, 0.8); put(trG, trM, ol, 1.2);
  }

  // ---------- the spring: a waterfall out of the cliff into a pool
  const FOAM = B.procTex(256, (u, v) => { const n = B.fbm(u * 2, v, 8, 4); const l = 0.75 + 0.35 * n; return [210 * l, 235 * l, 250 * l, n]; }, 3, [1, 3]);
  const fallM = new THREE.MeshStandardMaterial({ map: FOAM.map, color: 0xd8f0ff, roughness: 0.2, transparent: true, opacity: 0.92, emissive: 0x1a4a66, emissiveIntensity: 0.35 });
  const spring = (() => { const geo = new THREE.PlaneGeometry(1, 1, 1, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = p.getY(i) + 0.5, x = lerp(-176.3, -181, v); p.setXYZ(i, x + 0.35, hAt(x, 0) + 0.35, p.getX(i) * 3.2); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, fallM); m.material.side = THREE.DoubleSide; scene.add(m); return m; })();
  const springPool = new THREE.Mesh(new THREE.CircleGeometry(7, 40), WATER); springPool.rotation.x = -Math.PI / 2; springPool.position.set(-168, RG(-168) + 0.08, 0); scene.add(springPool);

  // ---------- the channel on the plains: a dug trench with earth banks, its water, and later a stone roof
  const DIRT = B.sweepify(new THREE.MeshStandardMaterial({ map: B.tex('brown_mud_02', 40, 1), normalMap: B.tex('brown_mud_02', 40, 1, 'nor_gl'), color: 0x7a5a40, roughness: 0.95 }));
  const BERM = new THREE.MeshStandardMaterial({ map: B.tex('dry_ground_01', 30, 1), color: 0xb08868, roughness: 1 });
  function strip(x0, x1, w, y0, dy, mat, z = 0, segs) {   // a strip that follows the channel's fall; grows from x0 with .scale.x
    const n = segs || Math.round(Math.abs(x1 - x0) / 2), geo = new THREE.BoxGeometry(1, dy, w, n, 1, 1); geo.translate(0.5, dy / 2, 0);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i), x = x0 + u * (x1 - x0); p.setY(i, p.getY(i) + RG(x) - RG(x0) + y0); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.position.set(x0, RG(x0), z); m.scale.x = x1 - x0; m.receiveShadow = true; m.castShadow = dy > 0.2; scene.add(m); m.userData.len = x1 - x0; return m;
  }
  const TR = { w: [strip(-162, -45, 1.7, -0.02, 0.06, DIRT), strip(-162, -45, 0.9, 0, 0.45, BERM, 1.4), strip(-162, -45, 0.9, 0, 0.45, BERM, -1.4)],
    e: [strip(45, 177, 1.7, -0.02, 0.06, DIRT), strip(45, 177, 0.9, 0, 0.45, BERM, 1.4), strip(45, 177, 0.9, 0, 0.45, BERM, -1.4)] };
  const WATER_CH = WATER.clone(); WATER_CH.color = new THREE.Color(0x2f9fd8);
  const WC = { w: strip(-162, -45, 1.3, 0.06, 0.03, WATER_CH), e: strip(45, 177, 1.3, 0.06, 0.03, WATER_CH) };
  const grow = (m, x) => { const L = m.userData.len, s = clamp(x - m.position.x, 0, L); m.scale.x = Math.max(0.001, s); m.visible = s > 0.01; };
  // the dig front, the water front (x along the route)
  const digW = t => lerp(-162, -45, eio(k(t, T.dig - 0.05, T.city2 + 0.35)));
  const digE = t => lerp(45, 177, k(t, T.dirt, T.rain + 0.3));
  const wetW = t => t < T.cong1 - 0.4 ? -170 : t < T.canal - 0.2 ? lerp(-162, -60, sm(k(t, T.cong1 - 0.4, T.canal - 0.2))) : lerp(-60, -45, k(t, T.canal - 0.2, T.deep - 0.2));
  const tCross = T.third + 0.55;                      // water crosses the finished bridge
  const wetE = t => lerp(45, 177, sm(k(t, tCross + 0.6, tCross + 2.2)));

  // ---------- the valley: the waterfall off the cut, its pool; the dirt fill that washes away
  const bankFall = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const x = -45 + i; pts.push([x, Math.max(hAt(x, 0), 0.8) + 0.15]); }
    const geo = new THREE.PlaneGeometry(1, 1, 24, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const j = Math.round((p.getX(i) + 0.5) * 24), zz = p.getY(i) * 2.2; p.setXYZ(i, pts[j][0], pts[j][1] + (j === 0 ? 0.2 : 0), zz); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, fallM.clone()); m.material.side = THREE.DoubleSide; scene.add(m); return m; })();
  const valPool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), WATER); valPool.rotation.x = -Math.PI / 2; valPool.position.set(-14, 1.25, 0); scene.add(valPool);
  const MOUND = new THREE.MeshStandardMaterial({ map: B.tex('dry_ground_01', 0.08, 0.08), normalMap: B.tex('dry_ground_01', 0.08, 0.08, 'nor_gl'), color: 0xc8a078, roughness: 1 });
  const mound = (() => { const sh = new THREE.Shape(); sh.moveTo(-46, RG(-46) - 0.2);
    for (let x = -46; x <= 46; x += 2) sh.lineTo(x, Math.min(hAt(x, 0), RG(x)) - 2.5); sh.lineTo(46, RG(46) - 0.2);
    for (let x = 46; x >= -46; x -= 2) sh.lineTo(x, RG(x) - 0.1 + 0.6 * Math.sin((x + 46) / 92 * Math.PI));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 26, bevelEnabled: false, steps: 8 }); geo.translate(0, 0, -13);
    const gp = geo.attributes.position; for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), b = Math.min(hAt(x, 0), RG(x)) - 2.5, y = gp.getY(i);
      gp.setY(i, b + (y - b) * (1 - Math.pow(Math.abs(z) / 13, 3))); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, MOUND); m.castShadow = m.receiveShadow = true; scene.add(m); return m; })();
  const moundFlow = strip(-45, 45, 1.4, 0.35, 0.03, WATER_CH);
  const mudRiver = new THREE.Mesh(new THREE.PlaneGeometry(60, 1300), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.2, transparent: true, opacity: 0 }));
  mudRiver.rotation.x = -Math.PI / 2; mudRiver.position.set(0, 1.35, 0); scene.add(mudRiver);

  // ---------- the bridge: three rows of arches (each bay its own piece, so they rise / drop one by one) and the channel on top
  const TIERS = [   // y0, height, bays, opening width, spring height, thickness
    [-2, 17, 8, 7.6, 10.5, 6.2], [15, 8, 8, 7.6, 3.6, 5.2], [23, YC(0) - 0.85 - 23, 16, 3.2, 1.1, 3.6]];
  const bays = [];
  TIERS.forEach(([y0, h, n, ow, sh, th], ti) => {
    const bw = 92 / n;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(bw, 0); s.lineTo(bw, h); s.lineTo(0, h); s.lineTo(0, 0);
      const r = ow / 2, cx = bw / 2, hole = new THREE.Path(); hole.moveTo(cx - r, 0); hole.lineTo(cx - r, sh); hole.absarc(cx, sh, r, Math.PI, 0, true); hole.lineTo(cx + r, 0); hole.lineTo(cx - r, 0);
      s.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1, curveSegments: 14 });
      geo.translate(-bw / 2, 0, -th / 2);
      const m = new THREE.Mesh(geo, ti === 2 ? STONE_S : STONE); m.castShadow = m.receiveShadow = true;
      const x = -46 + bw * (i + 0.5); m.userData = { ti, i, x, y0 }; m.position.set(x, y0, 0); scene.add(m); bays.push(m);
      // a cornice along the top of each row
      const cor = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.45, th + 0.6), STONE_S); cor.position.set(0, h, 0); cor.castShadow = cor.receiveShadow = true; m.add(cor);
    }
  });
  // the stone channel on the bridge (floor, two walls) and its water
  const deckY = YC(0) - 0.85;
  const chan = new THREE.Group(); scene.add(chan);
  const CHW = stoneM(0.5, 0.5);
  [[0, -0.25, 0, 92, 0.5, 2.4], [0, 0.7, 0.95, 92, 1.4, 0.5], [0, 0.7, -0.95, 92, 1.4, 0.5]].forEach(([x, y, z, w, h, d], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i === 1 ? CHW : STONE_S); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; chan.add(m); });
  const bridgeWater = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1.38), WATER_CH); bridgeWater.geometry.translate(0.5, 0, 0); scene.add(bridgeWater);

  // ---------- the stone roof: slabs that drop one after another, from the middle of the bridge outwards
  const SLABS = []; for (let x = -160; x <= 176; x += 2) SLABS.push(x);
  const slabGeoB = new THREE.BoxGeometry(1.96, 0.28, 2.5), slabGeoP = new THREE.BoxGeometry(1.96, 1.05, 2.2); slabGeoP.translate(0, 0.52, 0);
  const ROOFM = stoneM(0.5, 0.5);
  const slabB = new THREE.InstancedMesh(slabGeoB, ROOFM, SLABS.length), slabP = new THREE.InstancedMesh(slabGeoP, ROOFM, SLABS.length);
  [slabB, slabP].forEach(m => { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
  const slabT = x => T.stone + 0.05 + Math.abs(x) * 0.032;
  const clipFront = new THREE.Plane(V(0, 0, -1), 0.7);

  // ---------- the tilt demo: an open stretch of channel that tips, a gold level line, the gap at the far end
  const demo = new THREE.Group(); demo.position.set(70, RG(70), 0); scene.add(demo);
  [[6, 0.1, 0, 12, 0.3, 2.4], [6, 0.75, 1.0, 12, 1.3, 0.45], [6, 0.75, -1.0, 12, 1.3, 0.45]].forEach(([x, y, z, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), STONE_S); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; demo.add(m); });
  const demoWater = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 1.5), WATER_CH); demoWater.position.set(6, 0.75, 0); demo.add(demoWater);
  const GOLD = new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 0, depthWrite: false });
  const levelLine = new THREE.Mesh(new THREE.BoxGeometry(13, 0.12, 0.12), GOLD); levelLine.position.set(76.5, RG(70) + 1.48, 1.3); scene.add(levelLine);
  const gapTick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.14), GOLD); scene.add(gapTick);
  const pumpG = new THREE.Group(); scene.add(pumpG);
  { const red = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.5, metalness: 0.3 }), iron = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.6, 16), red); body.position.y = 0.8; pumpG.add(body);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8), iron); spout.rotation.z = Math.PI / 2; spout.position.set(0.6, 1.2, 0); pumpG.add(spout);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), iron); lever.position.set(-0.4, 1.75, 0); lever.rotation.z = 0.4; pumpG.add(lever);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20), iron); wheel.position.set(0, 1, 0.6); pumpG.add(wheel);
    B.shadowed(pumpG); pumpG.position.set(126, RG(126) + 1.05, 0); }

  // ---------- the town: houses round a plaza with a well (later a fountain), the water tank, baths, a rich man's villa
  function house(x, z, w, d, h, ry = 0, big) {
    const gq = new THREE.Group(); gq.position.set(x, 22, z); gq.rotation.y = ry; scene.add(gq);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), PLASTER); wall.position.y = h / 2; gq.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 1.08, h * 0.45, 4, 1), ROOF); roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.hypot(w, d) * 1.41, 1, d / Math.hypot(w, d) * 1.41);
    roof.position.y = h + h * 0.22; gq.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a3a22 })); door.position.set(0, 1.05, d / 2 + 0.03); gq.add(door);
    if (big) for (let i = 0; i < 6; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, h * 0.9, 12), STONE_S); col.position.set(-w / 2 + 1 + i * (w - 2) / 5, h * 0.45, d / 2 + 1.4); gq.add(col); }
    if (big) { const por = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, 3), ROOF); por.position.set(0, h * 0.9 + 0.2, d / 2 + 1.4); gq.add(por); }
    B.shadowed(gq); return gq;
  }
  [[188, -6, 7, 6, 4.5, 0.1], [192, 24, 8, 7, 5, -0.2], [214, -8, 9, 7, 5.5, 0.05], [216, 26, 7, 6, 4.5, 0.3], [196, -22, 8, 6, 5, -0.1], [208, -30, 7, 7, 4.5, 0.2],
    [236, -8, 7, 6, 5, 0.15], [244, 18, 7, 7, 5, -0.1], [190, 40, 8, 6, 5, 0.1], [204, 44, 7, 6, 4.5, -0.25], [218, 50, 8, 6, 5, 0.1],
    [248, -24, 8, 7, 5, 0.2], [226, -34, 7, 6, 4.5, 0], [250, 2, 7, 6, 5, 0]].forEach(([x, z, w, d, h, r]) => house(x, z, w, d, h, r));
  const villa = house(VILLA.x, VILLA.z, 16, 11, 6.5, Math.PI, true);
  // plaza paving
  const pave = new THREE.Mesh(new THREE.CircleGeometry(15, 48), B.pbr('gravel_floor_02', 6, 6, { color: 0xe8dcc4 })); pave.rotation.x = -Math.PI / 2; pave.position.set(PLAZA.x, 22.03, PLAZA.z); pave.receiveShadow = true; scene.add(pave);
  // the well (the start) and the fountain (the end)
  const well = new THREE.Group(); well.position.copy(PLAZA); scene.add(well);
  { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.9, 20, 1, true), STONE_S); ring.position.y = 0.45; ring.material = STONE_S; well.add(ring);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.12, 6, 24), STONE_S); cap.rotation.x = Math.PI / 2; cap.position.y = 0.9; well.add(cap);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.9 });
    [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), wood); p.position.set(s * 0.95, 1.1, 0); well.add(p); });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), wood); bar.rotation.z = Math.PI / 2; bar.position.y = 2.05; well.add(bar);
    const dark = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), new THREE.MeshBasicMaterial({ color: 0x050505 })); dark.rotation.x = -Math.PI / 2; dark.position.y = 0.6; well.add(dark);
    B.shadowed(well); }
  const wellRope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), new THREE.MeshStandardMaterial({ color: 0xc8b088 })); scene.add(wellRope);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 })); bucket.castShadow = true; scene.add(bucket);
  const fountain = new THREE.Group(); fountain.position.copy(PLAZA); scene.add(fountain);
  { const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.7, 32, 1, true), STONE_S); basin.position.y = 0.35; fountain.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.14, 6, 40), STONE_S); rim.rotation.x = Math.PI / 2; rim.position.y = 0.7; fountain.add(rim);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 12), STONE_S); col.position.y = 0.9; fountain.add(col);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), STONE_S); bowl.position.y = 1.85; fountain.add(bowl);
    const wtr = new THREE.Mesh(new THREE.CircleGeometry(2.35, 32), WATER); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.55; fountain.add(wtr);
    B.shadowed(fountain); }
  // the water tank (castellum): a round stone house cut open, the water inside, three pipes at three heights
  const tank = new THREE.Group(); tank.position.copy(CAST); scene.add(tank);
  const CASTM = stoneM(0.4, 0.4); CASTM.side = THREE.DoubleSide; CASTM.clippingPlanes = [new THREE.Plane(V(0, 0, -1), CAST.z)];
  { const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 4.8, 40, 1, true), CASTM); wall.position.y = 2.4; tank.add(wall);
    const roofC = new THREE.Mesh(new THREE.SphereGeometry(3.9, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), CASTM); roofC.scale.y = 0.45; roofC.position.y = 4.8; tank.add(roofC);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 32), STONE_S); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; tank.add(floor);
    B.shadowed(tank); }
  const castWater = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1, 32), WATER_CH.clone()); castWater.material.clippingPlanes = [new THREE.Plane(V(0, 0, -1), CAST.z)]; scene.add(castWater);
  const PIPE = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.35, metalness: 0.7 });
  const FLOW = new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.85, depthWrite: false });
  const flowTex = (() => { const cv2 = document.createElement('canvas'); cv2.width = 64; cv2.height = 8; const x = cv2.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 8);
    const gr = x.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 8);
    const t = new THREE.CanvasTexture(cv2); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const PIPES = [['f', 22.5, [PLAZA.x - 2.6, 22.2, PLAZA.z]], ['b', 23.6, [BATH.x - 5.5, 22.25, BATH.z + 2]], ['v', 24.7, [VILLA.x - 6, 22.25, VILLA.z - 6]]].map(([id, y, to], i) => {
    const a = V(CAST.x + 3.7 * Math.cos(rad(-20 + i * 40)), y, CAST.z + 3.7 * Math.sin(rad(-20 + i * 40))), b = V(...to);
    const pts = [a, V(a.x + 3, y, a.z + (b.z - a.z) * 0.1), V(a.x + 5, 22.25, a.z + (b.z - a.z) * 0.2), V(lerp(a.x, b.x, 0.6), 22.25, lerp(a.z, b.z, 0.6)), b];
    const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.22, 10), PIPE); tube.castShadow = true; scene.add(tube);
    const fm = FLOW.clone(); fm.map = flowTex.clone(); fm.map.repeat.set(curve.getLength() / 3, 1); fm.map.needsUpdate = true; fm.alphaMap = fm.map;
    const flow = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.26, 10), fm); scene.add(flow);
    return { id, y, flow, tube, len: curve.getLength() };
  });
  // the baths: a long pool in a low walled court, steam
  { const court = new THREE.Group(); court.position.copy(BATH); scene.add(court);
    [[0, 0.6, -6, 16, 1.2, 0.6], [0, 0.6, 6, 16, 1.2, 0.6], [-8, 0.6, 0, 0.6, 1.2, 12], [8, 0.6, 0, 0.6, 1.2, 12]].forEach(([x, y, z, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), PLASTER); m.position.set(x, y, z); court.add(m); });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 7), STONE_S); rim.position.y = 0.15; court.add(rim);
    const wtr = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ color: 0x4ec0d8, roughness: 0.05, envMapIntensity: 1.3, normalMap: ripple.normalMap })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.32; court.add(wtr);
    for (let i = 0; i < 8; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 4, 12), STONE_S); col.position.set(-7 + i * 2, 2, -6.6); court.add(col); }
    B.shadowed(court); }
  // the villa's garden spout
  const spoutP = V(VILLA.x - 2, 23.4, VILLA.z - 12);
  { const basin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.4), STONE_S); basin.position.set(spoutP.x, 22.3, spoutP.z + 0.9); basin.castShadow = basin.receiveShadow = true; scene.add(basin);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.5), STONE_S); post.position.set(spoutP.x, 23.1, spoutP.z - 0.1); post.castShadow = true; scene.add(post); }

  // ---------- sprites: dust puffs, water drops, steam (a fixed pool, each sprite a pure function of t)
  const SPR = Array.from({ length: 520 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xd8c4a0, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return s; });
  let sprN = 0;
  const puff = (p, col, size, op) => { if (sprN >= SPR.length) return; const s = SPR[sprN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = op; };
  // a burst of dust at p from t0: n puffs, radius r
  function dust(t, t0, p, n = 8, r = 2, col = 0xdcc6a2, life = 1.3, size = 2.2) {
    const u = (t - t0) / life; if (u < 0 || u > 1) return;
    for (let i = 0; i < n; i++) { const a = hash(t0 * 7 + i) * 6.283, rr = r * (0.5 + 0.7 * hash(t0 * 3 + i * 1.7)) * eout(u);
      puff(V(p.x + Math.cos(a) * rr, p.y + 0.3 + u * r * 0.5 * hash(i + t0), p.z + Math.sin(a) * rr), col, size * (0.6 + u * 0.9), 0.75 * (1 - u) * (1 - u)); }
  }
  // water drops thrown from p along v (arc), n drops
  function drops(t, t0, p, v, n = 10, life = 0.8, col = 0xbfeaff) {
    const u = t - t0; if (u < 0 || u > life) return;
    for (let i = 0; i < n; i++) { const vv = V(v.x * (0.6 + 0.8 * hash(i + t0)), v.y * (0.7 + 0.6 * hash(i * 3 + t0)), v.z + (hash(i * 5 + t0) - 0.5) * 2);
      puff(V(p.x + vv.x * u, p.y + vv.y * u - 4.9 * u * u, p.z + vv.z * u), col, 0.22, 0.95 * (1 - u / life)); }
  }

  // ---------- people (Mixamo): one model, cloned for the cast; each clone plays any role, chosen per frame
  const MX = window.MIXAMO || { model: 'Walking.fbx', files: [] };
  const pick = (...names) => names.find(n => MX.files.includes(n + '.fbx'));
  const ROLE = { walk: pick('Walking'), idle: pick('Idle', 'Nervously Look Around'), look: pick('Nervously Look Around'), pull: pick('Pull Heavy Object'),
    dig: pick('Digging', 'Pull Heavy Object'), cheer: pick('Cheering', 'Victory', 'Flailing Arms'), carry: pick('Carrying', 'Walking'), lay: pick('Laying Idle'),
    up: pick('Getting Up'), scared: pick('Terrified'), drink: pick('Drinking', 'Nervously Look Around'), push: pick('Pushing', 'Pull Heavy Object'), swim: pick('Treading Water') };
  const CAST_N = 34, model = { obj: null, clips: {} }, pool = [];
  const modelHolder = B.fbx('mixamo/' + MX.model, obj => { model.obj = obj; });
  const clipFiles = [...new Set(Object.values(ROLE).filter(Boolean))];
  clipFiles.forEach(f => B.fbx('mixamo/' + f + '.fbx', obj => { const cl = obj.animations && obj.animations[0]; if (cl) model.clips[f] = cl; }));
  function pinHips(clip) {
    clip.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    return clip;
  }
  const JAR = new THREE.MeshStandardMaterial({ color: 0xc0683a, roughness: 0.7 });
  const jarGeo = new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.2, 0.15], [0.21, 0.35], [0.13, 0.5], [0.07, 0.56], [0.09, 0.62], [0, 0.62]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
  function setupCast() {
    if (!model.obj) return;
    const o = model.obj; o.scale.setScalar(0.01); o.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(o, true); o.scale.multiplyScalar(1.78 / Math.max(0.1, bb.max.y - bb.min.y));
    const names = []; o.traverse(m => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => names.push(mm.name)); });
    console.log('cast materials', names.join(', '));
    Object.values(model.clips).forEach(pinHips);
    const SU = window.THREE_ADDONS.SkeletonUtils;
    for (let i = 0; i < CAST_N; i++) {
      const cl = SU.clone(o), mats = [];
      cl.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        const arr = (Array.isArray(m.material) ? m.material : [m.material]).map(mm => { const nm = new THREE.MeshStandardMaterial({ map: mm.map || null, normalMap: mm.normalMap || null,
          color: mm.map ? 0xffffff : (mm.color || new THREE.Color(0.7, 0.6, 0.5)), roughness: 0.8, metalness: 0, transparent: !!mm.transparent, alphaTest: mm.transparent ? 0.3 : 0 });
          nm.name = mm.name; if (TOP.test(mm.name) || BOT.test(mm.name)) nm.map = null; mats.push(nm); return nm; });
        m.material = Array.isArray(m.material) ? arr : arr[0]; } });
      let head = null; cl.traverse(b => { if (b.isBone && /Head$/.test(b.name)) head = b; });
      const jar = new THREE.Mesh(jarGeo, JAR); jar.castShadow = true; jar.visible = false; const s = cl.scale.x; jar.scale.setScalar(1 / s); jar.position.set(0, 0.17 / s, 0);
      if (head) head.add(jar);
      const holder = new THREE.Group(); holder.add(cl); scene.add(holder);
      const mixer = new THREE.AnimationMixer(cl), acts = {};
      Object.entries(model.clips).forEach(([f, clip]) => { const a = mixer.clipAction(clip); a.play(); a.weight = 0; acts[f] = a; });
      pool.push({ holder, model: cl, mixer, acts, mats, jar });
    }
    modelHolder.visible = false;
  }
  const TOP = /top|shirt|torso|body_?cloth|jacket|hood|sweat/i, BOT = /bottom|pant|jean|trouser|short/i;
  const TINTS = [0xd8452e, 0x3a7bd5, 0xe8b23a, 0x48a868, 0xe07aa8, 0xf2f2ea, 0x8a5ad0, 0x40c0c0, 0xff8a3a, 0x9ab040];
  // the cast: [from, to, place(t) -> [x, y, z, headingDeg], anim(t) -> [[role, time, weight]...], look {top, bottom, jar}]
  const cast = [];
  const add = (t0, t1, place, anim, look = {}) => cast.push({ t0, t1, place, anim, look });
  const loop = (role, ph = 0, sp = 1) => t => [[role, t * sp + ph, 1]];
  const at = (x, z, hd, dy = 0) => () => [x, hAt(x, z) + dy, z, hd];
  const HERO = { top: 0xd8301e, bottom: 0x3a3a48 };
  // 1) the town: a queue at the tiny well, the hero hauling the bucket, people flat out in the heat
  add(-1, T.carry + 0.9, () => [PLAZA.x + 1.25, 22, PLAZA.z + 0.2, -90], loop('pull', 0.3), HERO);
  for (let i = 0; i < 9; i++) { const a = 0.4 + i * 0.25, r = 3 + i * 1.25, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
    const hd = Math.atan2(PLAZA.x - x, PLAZA.z - z) * 180 / Math.PI;
    if (i === 4) add(-1, T.carry + 0.9, at(x, z, hd), t => t < T.thirsty - 0.1 ? [['look', t + i, 1]] : [['up', Math.max(0, 2.6 - (t - T.thirsty + 0.1) * 1.6), 1]], { top: TINTS[i] });
    else add(-1, T.carry + 0.9, at(x, z, hd), loop('look', i * 1.37, 0.8 + hash(i) * 0.4), { top: TINTS[i % TINTS.length] }); }
  [[PLAZA.x - 7, PLAZA.z + 7, 30], [PLAZA.x + 9, PLAZA.z - 6, 200]].forEach(([x, z, hd], i) => add(-1, T.carry + 0.9, at(x, z, hd, 0.02), loop('lay', i * 2), { top: TINTS[i + 3] }));
  // 2) the spring: people fill jars; a line of carriers walks to town; one trips and loses his jar
  for (let i = 0; i < 4; i++) add(T.carry - 1, T.dig + 0.4, at(-164 + (i % 2) * 2.5, (i < 2 ? 5.2 : -5.2) + i * 0.3, i < 2 ? 200 : -20), loop('pull', i * 0.9), { top: TINTS[(i + 4) % 10], jar: true });
  const WALK_V = 1.35;
  for (let i = 0; i < 9; i++) { const x0 = -158 + i * 5.5;
    const pl = t => { const x = x0 + (t - T.carry) * WALK_V * 2.2; return [x, RG(x) + 0.02, 4.1 + (i % 2 ? 0.5 : -0.5), 90]; };
    if (i === 6) add(T.carry - 1, T.dig + 0.6, t => { const tt = Math.min(t, T.spills - 0.1), p = pl(tt); return p; }, t => t < T.spills - 0.15 ? [['walk', t * 1.1 + i, 1]] : [['scared', (t - T.spills) * 1.2, 1]], { top: TINTS[(i + 2) % 10], jar: t => t < T.spills - 0.1 });
    else add(T.carry - 1, T.dig + 0.6, pl, loop('walk', i * 0.37, 1.1), { top: TINTS[(i + 2) % 10], jar: true }); }
  const heroX = -103.5;
  add(T.half - 0.6, T.city2 + 0.6, t => { const x = Math.min(heroX, heroX - 6 + (t - T.half + 0.6) * 4); return [x, RG(x) + 0.02, 2.6, t < T.genius - 0.3 ? 90 : 160]; },
    t => t < T.genius - 0.3 ? [['walk', t, 1]] : [['look', t - T.genius, 1]], Object.assign({ jar: t => t < T.genius - 0.3 }, HERO));
  // 3) the diggers run with the dig front
  for (let i = 0; i < 6; i++) add(T.dig - 0.2, T.cong1 + 0.3, t => { const x = Math.max(-160, digW(t) - 1.5 - i * 3.2); return [x, RG(x), (i % 2 ? 1.6 : -1.6), i % 2 ? 180 : 0]; }, loop('dig', i * 0.53, 1.3), { top: TINTS[(i + 6) % 10] });
  // 4) the canal works: the hero and friends cheer beside it
  add(T.cong1 - 0.6, T.valley + 0.5, at(-66, 2.5, 200, 0.02), t => [['cheer', t - T.cong1, 1]], HERO);
  [[-69, 3.6, 170], [-63.5, 3.1, 220]].forEach(([x, z, hd], i) => add(T.cong1 - 0.6, T.valley + 0.5, at(x, z, hd, 0.02), t => [['cheer', t - T.cong1 + i * 0.7, 1]], { top: TINTS[i + 1] }));
  // 5) at the valley's edge, peering down
  add(T.valley - 0.2, T.fill + 0.4, at(-48.5, 2.4, 100, 0.02), loop('look', 0.4), HERO);
  add(T.valley - 0.2, T.fill + 0.4, at(-49.2, -2.2, 80, 0.02), loop('look', 1.7), { top: TINTS[2] });
  // 6) workers on the dirt fill; when the rain comes they run off
  for (let i = 0; i < 8; i++) { const x0 = -30 + i * 8.5, z0 = (i % 2 ? 5 : -6) + hash(i) * 3;
    add(T.dirt + 0.2, T.arches - 1, t => { const f = moundF(t), run = Math.max(0, t - T.rain - 0.2), x = x0 + run * 2.6 * (i < 4 ? -1 : 1); return [x, lerp(hAt(x, z0), RG(x) - 0.2, f), z0, run > 0 ? (i < 4 ? -90 : 90) : (i % 2 ? 200 : 20)]; },
      t => t < T.rain + 0.2 ? [['dig', t * 1.2 + i, 1]] : [['walk', t * 2.2 + i, 1]], { top: TINTS[(i + 3) % 10] }); }
  // 7) the hero has an idea at the bank; builders on the valley floor
  add(T.washes + 0.5, T.short + 0.5, at(-48.5, 2.4, 130, 0.02), t => [['look', t * 0.6, 1]], HERO);
  for (let i = 0; i < 6; i++) { const x = -30 + i * 11, z = 9 + (i % 2) * 3; add(T.build - 0.5, T.cong2 - 0.2, at(x, z, 180 + (i % 3) * 30), loop('push', i * 0.8, 1.1), { top: TINTS[(i + 5) % 10] }); }
  // 8) the crowd on the valley floor cheers the finished bridge
  for (let i = 0; i < 26; i++) { const a = hash(i * 3.3), x = -4 + (i % 7) * 3.1 + a * 1.4, z = 12 + Math.floor(i / 7) * 2.6 + hash(i * 5.1) * 1.2;
    add(T.cong2 - 0.4, T.frogsL + 1.2, at(x, z, 180 + (a - 0.5) * 40), t => [['cheer', t - T.cong2 + a * 2, 1]], i === 3 ? HERO : { top: TINTS[i % 10] }); }
  // 9) on top of the bridge: the hero looks at the frogs, then at the clean water
  add(T.frogsL + 0.2, T.pumpL + 0.6, () => [3.2, deckY + 0.23, 1.55, 200], loop('look', 0.2), HERO);
  // 10) the town at the end: drinkers at the fountain, bathers, the rich man, the hero cheering
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, x = PLAZA.x + Math.cos(a) * 3.4, z = PLAZA.z + Math.sin(a) * 3.4, hd = Math.atan2(PLAZA.x - x, PLAZA.z - z) * 180 / Math.PI;
    add(T.tanks - 0.5, DUR + 1, at(x, z, hd), t => t > T.never - 0.2 ? [['cheer', t + i, 1]] : [['drink', t + i * 0.7, 1]], { top: TINTS[(i + 1) % 10] }); }
  [[-2.5, -1], [0.5, 1], [3, -0.6]].forEach(([dx, dz], i) => add(T.tanks - 0.5, DUR + 1, () => [BATH.x + dx, 22.32 - 0.95, BATH.z + dz, 90 + i * 60], loop('swim', i * 0.8), { top: TINTS[(i + 4) % 10] }));
  add(T.tanks - 0.5, DUR + 1, () => [spoutP.x + 1.6, 22, spoutP.z + 1.2, 250], t => t < T.cut ? [['look', t, 1]] : [['scared', (t - T.cut) * 1.1, 1]], { top: 0x7a3ab8, bottom: 0xf0e8d8 });
  add(T.end - 0.5, DUR + 1, () => [PLAZA.x + 5.5, 22, PLAZA.z + 5.5, 30], t => [['cheer', t - T.end, 1]], HERO);
  add(-1, T.carry + 0.9, () => [0, -50, 0, 0], loop('idle'), {});   // (keeps the pool warm)

  function moundF(t) { return eout(k(t, T.fill, T.dirt + 0.7)) * (1 - 0.85 * eio(k(t, T.washes - 0.1, T.washes + 1.3))) * (t < T.arches - 0.5 ? 1 : 0); }

  function castUpdate(t) {
    if (!pool.length) return;
    let j = 0;
    for (const a of cast) {
      if (t < a.t0 || t > a.t1 || j >= pool.length) continue;
      const P = pool[j++], [x, y, z, hd] = a.place(t);
      P.holder.visible = true; P.holder.position.set(x, y, z); P.holder.rotation.set(0, rad(hd), 0);
      Object.values(P.acts).forEach(ac => { ac.weight = 0; ac.enabled = false; });
      a.anim(t).forEach(([role, lt, w]) => { const f = ROLE[role] || ROLE.idle, ac = P.acts[f]; if (!ac) return; const d = ac.getClip().duration;
        ac.enabled = true; ac.weight = w; ac.time = role === 'up' ? clamp(lt, 0, d - 0.01) : ((lt % d) + d) % d; });
      P.mixer.update(0);
      const lk = a.look || {};
      P.mats.forEach(m => { const top = TOP.test(m.name), bot = BOT.test(m.name);
        m.color.set(top ? (lk.top != null ? lk.top : 0xd8c8a8) : bot ? (lk.bottom != null ? lk.bottom : 0x6a5642) : 0xffffff); });
      P.jar.visible = typeof lk.jar === 'function' ? lk.jar(t) : !!lk.jar;
    }
    for (; j < pool.length; j++) pool[j].holder.visible = false;
  }

  // ---------- the camera, shot by shot. Each shot: [arrive t, subject (point or t->point), frame width at the subject (m),
  // azimuth (deg, where the camera sits round the subject: 0 = +x, 90 = +z), elevation (deg, negative = looking up), fov].
  // Close (2-5 m) when a person acts or a small thing changes; medium (8-25 m) for a group; wide and high (40-400 m)
  // when the size of things is the point; low and looking up for every "Congratulations". The camera arrives on the
  // word, holds and pushes in slowly, then whips to the next shot.
  const S = (x, y, z) => () => V(x, y, z);
  const xi = (i, t) => -158 + i * 5.5 + (t - T.carry) * WALK_V * 2.2;            // carrier i's x
  const jxT = xi(6, T.spills - 0.1);
  const HP = [PLAZA.x + 1.25, 23.25, PLAZA.z + 0.2];
  const SHOTS = [
    [0.0, S(...HP), 2.6, 160, 8, 40],                                         // hero hauls the bucket (close)
    [T.city + 0.35, S(PLAZA.x, 25, PLAZA.z), 95, 80, 7, 40],                  // a city ON A HILL (low, far, looking up the hill)
    [T.well - 1.0, S(PLAZA.x + 2, 23, PLAZA.z + 4), 15, 60, 22, 40],          // everyone queues at the well (medium)
    [T.well - 0.05, S(PLAZA.x, 22.9, PLAZA.z), 3.2, 110, 30, 40],              // one TINY well (close)
    [T.thirsty - 0.6, S(206.6, 23.1, 15.2), 6.5, 243, 6, 40],                 // thirsty faces (close, from the well's side)
    [T.mountain - 0.3, S(-166, 33, 0), 58, 62, 32, 40],                       // the mountain spring (wide, high)
    [T.walk - 0.4, S(-164, 30.6, 3), 11, 70, 14, 40],                         // filling the jars (medium)
    [T.walk + 0.15, t => V(xi(4, t), 30.2, 4.1), 24, 90, 9, 40],              // the long walk (tracking the line)
    [T.half - 0.1, t => V(xi(5, t), 31.0, 4.1), 3.4, 78, 8, 40],              // a jar sloshing (close)
    [T.spills - 0.15, S(jxT + 0.5, 29.8, 3.8), 4.5, 100, 6, 40],              // the jar smashes (close, low)
    [T.genius - 0.45, S(-103.5, RG(-103.5) + 1.45, 2.6), 2.8, 290, 6, 40],    // the hero's idea (close)
    [T.dig - 0.05, S(-128, 29, 0), 42, 95, 24, 40],     // the dig races to the city (wide, high, tracking)
    [T.cong1 - 0.1, S(-66, RG(-66) + 1.3, 2.5), 4.2, 250, -5, 42],            // CONGRATULATIONS (low hero shot)
    [T.canal - 0.6, S(-75, RG(-75) + 0.6, 0), 13, 12, 12, 40],                // the canal running at you (medium)
    [T.valley + 0.1, t => V(Math.min(wetW(t), -46), 28.8, 0), 12, 70, 22, 40],// follow the water to the edge
    [T.deep - 0.15, S(0, 11, 0), 115, 80, 22, 42],                            // a DEEP valley (wide, high)
    [T.refuses - 0.2, S(-26, 7, 0), 26, 75, 5, 42],                           // water won't climb back (low, in the valley)
    [T.fill - 0.1, S(0, 14, 0), 105, 70, 24, 40],                             // fill it with dirt (wide)
    [T.rain - 0.2, S(0, 14, 0), 88, 66, 18, 40],                              // the rain (pushing in)
    [T.brain - 0.45, S(-48.5, RG(-48.5) + 1.5, 2.4), 2.8, 290, 6, 40],        // huge brain (close)
    [T.build - 0.1, S(0, 10, 0), 62, 85, 3, 50],                              // arches rise (low from the valley floor)
    [T.shortW - 0.3, S(-26, 19, 0), 40, 95, 10, 42],                           // too short to reach (medium on the gap)
    [T.second - 0.3, S(0, 15, 0), 86, 75, 10, 45],                            // second and third rows (wide)
    [T.cong2 - 0.1, S(4, 5, 13), 22, 85, 6, 50],                              // CONGRATULATIONS: the crowd (low, behind them)
    [T.bridge - 0.5, S(0, 16, 0), 46, 80, -6, 50],                            // a bridge for water (looking up)
    [T.frogsL + 0.35, S(0, deckY + 0.9, 0), 7, 70, 35, 40],                   // up on top: the open channel
    [T.green - 0.25, S(-1, deckY + 0.9, 0), 3.4, 75, 55, 40],                 // it turns green (close, from above)
    [T.frogs - 0.25, S(-2, deckY + 1.1, 0), 3.0, 80, 25, 40],                 // frogs (close)
    [T.stone - 0.2, S(0, deckY + 1.5, 0), 14, 70, 28, 40],                    // the roof drops (medium)
    [T.clean - 0.35, S(-1, deckY + 0.95, 0), 3.4, 90, 12, 40],                // clean and cool inside (close, cut open)
    [T.fifty - 0.25, S(20, 24, 0), 300, 15, 28, 40],                          // FIFTY KILOMETRES (huge, high)
    [T.pump - 0.25, S(126, RG(126) + 1.8, 0), 4.6, 75, 10, 40],               // a single pump (close)
    [T.tilt - 0.1, S(76.5, 27.8, 0), 15, 90, 14, 45],                          // tilt the whole thing (side-on)
    [T.cm - 0.2, S(82.3, 27.1, 1.3), 3.6, 95, 4, 40],                         // 25 centimetres (close on the gap)
    [T.every + 0.1, S(76.5, 27.8, 0), 16, 90, 14, 45],                         // every kilometre (back out)
    [T.gravity - 0.1, t => V(lerp(85, 172, eio(k(t, T.gravity - 0.1, T.tanks + 0.2))), 27, 0), 12, 105, 18, 42], // gravity: race to town
    [T.tanks + 0.15, S(195, 24, 6), 70, 30, 30, 40],                          // it reaches the city (wide)
    [T.split - 0.2, S(180, 24, 0), 12, 80, 40, 40],                           // split three ways (into the tank)
    [T.fount - 0.2, S(PLAZA.x, 23.2, PLAZA.z), 8, 60, 18, 40],                // fountains
    [T.baths - 0.2, S(BATH.x, 22.6, BATH.z), 16, 75, 32, 40],                 // baths
    [T.rich - 0.2, S(spoutP.x + 0.9, 23.2, spoutP.z + 0.7), 6, 270, 10, 40],  // rich people's houses
    [T.drought - 0.15, S(180, 24, 0), 10, 80, 35, 40],                        // a drought: the level drops
    [T.cut - 0.25, S(spoutP.x + 0.9, 23.2, spoutP.z + 0.8), 4.4, 265, 6, 40], // cut off first (close)
    [T.never - 0.3, S(PLAZA.x, 23.2, PLAZA.z), 10, 70, 12, 40],               // the fountains never stop
    [T.end - 0.1, S(PLAZA.x + 5.5, 23.3, PLAZA.z + 5.5), 3.6, 60, -5, 42],   // CONGRATULATIONS (low hero shot)
    [T.roman - 0.4, S(60, 24, 0), 260, 12, 20, 40],                           // the whole aqueduct (huge)
  ].map(([t, sub, w, az, el, f]) => ({ t, sub, w, az, el, f }));
  const viewOf = (s, t) => ({ S: s.sub(t), w: s.w, az: s.az, el: s.el, f: s.f });
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    let v = viewOf(a, t);
    // hold: a slow push-in and drift until the whip to the next shot
    const tEnd = b ? b.t : DUR + 1, mv = b ? Math.min(0.55, (b.t - a.t) * 0.45) : 0, hold = k(t, a.t, tEnd - mv);
    v.w *= 1 - 0.09 * eio(hold); v.az += 4 * eio(hold);
    if (b && t > tEnd - mv) {                                                  // the whip
      const u = eio(k(t, tEnd - mv, tEnd)), nb = viewOf(b, t);
      let daz = ((nb.az - v.az) % 360 + 540) % 360 - 180;
      v = { S: v.S.clone().lerp(nb.S, u), w: Math.exp(lerp(Math.log(v.w), Math.log(nb.w), u)), az: v.az + daz * u, el: lerp(v.el, nb.el, u), f: lerp(v.f, nb.f, u) };
    }
    const d = B.distFor(v.w, v.f), az = rad(v.az), el = rad(v.el);
    const p = v.S.clone().add(V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(d));
    return { p, q: v.S.clone(), f: v.f };
  }
  window.__camAt = t => camAt(t);
  const prevCam = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
  function placeCam(t) {
    const C = camAt(t), sh = 0.06 * (1 + 3 * shake(t));
    C.p.y = Math.max(C.p.y, hAt(C.p.x, C.p.z) + 1.3);
    C.p.add(V(B.n1(t * 0.7) * sh, B.n1(t * 0.6 + 3) * sh, B.n1(t * 0.5 + 7) * sh));
    cam.position.copy(C.p); cam.up.set(0, 1, 0); cam.lookAt(C.q); cam.fov = C.f; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix();
    B.POST.focus = C.p.distanceTo(C.q);
    // motion blur: where last frame's aim point lands on this frame's screen
    const P = camAt(t - 1 / 30); prevCam.position.copy(P.p); prevCam.lookAt(P.q);
    const aim = P.p.clone().add(P.q.clone().sub(P.p).normalize().multiplyScalar(C.p.distanceTo(C.q)));
    cam.updateMatrixWorld(); const s = aim.project(cam);
    if (s.z < 1) { const dx = s.x * W / 2, dy = -s.y * H / 2, L = Math.hypot(dx, dy), m = Math.min(1, 150 / Math.max(L, 1e-3)); B.POST.mb = L > 8 ? [dx * m * 0.45, dy * m * 0.45] : [0, 0]; }
    return C;
  }
  const shake = t => Math.max(0, 1 - Math.abs(t - T.washes - 0.4) / 0.8) * 0.5;

  // ---------- update: everything is a function of t
  function update(t) {
    sprN = 0;
    const C = placeCam(t);
    // sun: the long walk takes "all day" (the sun swings across); a storm; a drought glare
    const day = eio(k(t, T.walk, T.half - 0.1));
    SUN.copy(SUN0).applyAxisAngle(V(0, 1, 0), rad(lerp(0, 300, day) * (t < T.half ? 1 : 0)));
    const storm = sm(k(t, T.rain - 0.5, T.rain + 0.3)) * (1 - sm(k(t, T.brain - 1.2, T.brain - 0.2)));
    sun.intensity = 2.6 * (1 - 0.55 * storm) * (1 - 0.5 * Math.sin(day * Math.PI));
    sun.color.setRGB(1, lerp(0.95, 0.7, Math.sin(day * Math.PI)), lerp(0.87, 0.5, Math.sin(day * Math.PI)));
    const span = clamp(C.p.distanceTo(C.q) * 0.75, 12, 170);
    const cd = C.p.distanceTo(C.q); scene.fog.near = Math.max(320, cd * 0.9); scene.fog.far = scene.fog.near + 1800;
    sun.target.position.copy(C.q); sun.position.copy(C.q).add(SUN.clone().multiplyScalar(300));
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 50, far: 600 }); sun.shadow.camera.updateProjectionMatrix();
    hemi.intensity = 0.55 * (1 - 0.1 * storm);
    // grade
    const heat = 1 - sm(k(t, T.carry, T.carry + 0.8)), dry = sm(k(t, T.drought - 0.2, T.drought + 0.4)) * (1 - sm(k(t, T.never - 0.3, T.never + 0.3)));
    Object.assign(B.POST, { aperture: 0.22, maxBlur: 10, bloom: 0.3, thr: 1.2, sat: 1.18 - 0.45 * storm + 0.05 * heat, con: 1.08, exp: 1.0 - 0.15 * storm + 0.08 * dry });
    // the well's bucket goes up and down (start), the fountain replaces the well (end)
    const haul = (Math.sin(t * 2.4) * 0.5 + 0.5);
    well.visible = t < T.tanks - 0.5; fountain.visible = !well.visible;
    wellRope.visible = bucket.visible = well.visible; const by = 21.6 + haul * 2.0; bucket.position.set(PLAZA.x, by, PLAZA.z);
    wellRope.scale.y = 24.05 - by - 0.13; wellRope.position.set(PLAZA.x, (24.05 + by + 0.13) / 2, PLAZA.z);
    // the trench and its water
    const dw = digW(t), de = digE(t);
    TR.w.forEach(m => grow(m, dw)); TR.e.forEach(m => grow(m, de));
    grow(WC.w, wetW(t)); grow(WC.e, t > tCross ? wetE(t) : -1e3);
    if (t > T.dig && t < T.city2 + 0.4) for (let i = 0; i < 4; i++) dust(t, Math.floor(t * 10) / 10 - i * 0.1, V(digW(Math.floor(t * 10) / 10 - i * 0.1), RG(dw) + 0.2, 0), 5, 2, 0xb88a60, 0.6, 2);
    // green water and frogs; clean again under the roof
    const greenA = sm(k(t, T.green - 0.3, T.green + 0.4)) * (1 - sm(k(t, T.clean - 0.6, T.clean)));
    WATER_CH.color.set(0x2a86b8).lerp(new THREE.Color(0x6a8a2a), greenA); WATER_CH.emissive.set(0x062030).lerp(new THREE.Color(0x1a2a00), greenA);
    WATER_CH.roughness = lerp(0.06, 0.4, greenA);
    ripple.normalMap.offset.set(t * 0.08, t * 0.03);
    // the valley: the waterfall off the cut, the pool, the dirt fill, the rain washing it away
    const fallOn = t > T.deep - 0.4 && t < tCross && !(t > T.dirt + 0.5 && t < T.washes + 0.2);
    bankFall.visible = fallOn; bankFall.material.map.offset.y = -t * 1.6; fallM.map.offset.y = -t * 1.2;
    const pr = 3 + 9 * sm(k(t, T.deep, T.uphill + 0.5)); valPool.visible = t > T.deep && t < T.fill + 0.5; valPool.scale.setScalar(pr);
    const mf = moundF(t); mound.visible = mf > 0.01; mound.scale.y = Math.max(0.01, mf);
    MOUND.color.set(0xc8a078).lerp(new THREE.Color(0x9a7458), sm(k(t, T.rain, T.washes)));
    moundFlow.visible = t > T.dirt + 0.5 && t < T.washes + 0.1 && mf > 0.9; grow(moundFlow, lerp(-45, 45, k(t, T.dirt + 0.5, T.rain + 0.2)));
    mudRiver.material.opacity = 0.9 * sm(k(t, T.washes, T.washes + 0.8)) * (1 - sm(k(t, T.across, T.across + 1)));
    if (t > T.fill && t < T.dirt + 0.8) for (let i = 0; i < 6; i++) dust(t, T.fill + i * 0.18, V(-36 + i * 14, RG(0) * mf, (i % 2 ? 8 : -8)), 7, 5, 0xc8a47a, 1.1, 5);
    if (t > T.washes && t < T.washes + 1.6) for (let i = 0; i < 5; i++) dust(t, T.washes + i * 0.2, V(-30 + i * 15, RG(0) * mf * 0.8, 6), 6, 6, 0x8a6a4a, 1.2, 6);
    // the arches: row 1 rises out of the ground, rows 2 and 3 drop from the sky; then the channel on top
    bays.forEach(m => { const { ti, i, x, y0 } = m.userData; let off = 0, vis = true;
      if (ti === 0) { const t0 = T.build + 0.1 + i * 0.13; const u = eout(k(t, t0, t0 + 0.55)); off = -20 * (1 - u); vis = t > t0 - 0.05;
        if (t > t0 + 0.4) dust(t, t0 + 0.4, V(x, 1.5, 3.5), 5, 4, 0xd0b890, 1.0, 4); }
      else { const t0 = (ti === 1 ? T.second - 0.1 : T.third - 0.15) + i * (ti === 1 ? 0.09 : 0.045), u = k(t, t0, t0 + 0.32);
        off = 45 * (1 - u * u); vis = t > t0; if (t > t0 + 0.32) dust(t, t0 + 0.32, V(x, y0 + 0.3, 3), 4, 3, 0xe0cca6, 0.9, 3.5); }
      m.visible = vis; m.position.y = y0 + off; });
    const chT = T.third + 0.25, cu = k(t, chT, chT + 0.3); chan.visible = t > chT; chan.position.set(0, deckY + 45 * (1 - cu * cu), 0);
    bridgeWater.visible = t > tCross; bridgeWater.position.set(-46, deckY + 0.85, 0); bridgeWater.scale.x = Math.max(0.01, 92 * sm(k(t, tCross, tCross + 0.9)));
    // the roof slabs
    const M = new THREE.Matrix4(), q0 = new THREE.Quaternion();
    SLABS.forEach((x, i) => { const t0 = slabT(x), u = k(t, t0, t0 + 0.3), onB = Math.abs(x) < 46, hide = t < t0 || (t > T.tilt - 0.6 && t < T.tanks - 0.3 && x > 68 && x < 84);
      const y = (onB ? deckY + 1.55 : RG(x) - 0.05) + 30 * (1 - u * u);
      M.compose(V(x, y, 0), q0, hide ? V(0, 0, 0) : V(1, 1, 1)); (onB ? slabB : slabP).setMatrixAt(i, M); (onB ? slabP : slabB).setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      if (Math.abs(x) < 16 && t > t0 + 0.3) dust(t, t0 + 0.3, V(x, deckY + 1.6, 1.6), 3, 1.5, 0xe8dcc0, 0.7, 1.4); });
    slabB.instanceMatrix.needsUpdate = slabP.instanceMatrix.needsUpdate = true;
    ROOFM.clippingPlanes = CHW.clippingPlanes = t > T.clean - 0.5 && t < T.pumpL + 0.8 ? [clipFront] : [];
    // frogs
    frogs.forEach((f, i) => { const t0 = T.frogs - 0.6 + i * 0.04, on = t > t0 && t < T.stone + 0.1 + Math.abs(f.userData.x) * 0.032; f.visible = on;
      if (!on) return; const ph = ((t - t0) * 1.6 + hash(i)) % 1, hop = Math.sin(ph * Math.PI) * 0.5 * (hash(i * 3) > 0.4 ? 1 : 0);
      f.position.set(f.userData.x + ph * 0.3, deckY + 1.0 + hop, f.userData.z * 0.6); f.scale.setScalar(2.2 * eout(k(t, t0, t0 + 0.2))); });
    // the tilt: the demo stretch tips, a gold level line, the gap at the far end; the pump pops up and vanishes
    const showDemo = t > T.tilt - 0.6 && t < T.tanks - 0.3; demo.visible = showDemo;
    const tilt = eio(k(t, T.tilt + 0.15, T.tilt + 0.9)); demo.rotation.z = -rad(8) * tilt;
    GOLD.opacity = showDemo ? sm(k(t, T.tilt, T.tilt + 0.3)) * (1 - sm(k(t, T.gravity, T.gravity + 0.3))) : 0;
    const gap = Math.sin(rad(8) * tilt) * 12; gapTick.scale.y = Math.max(0.01, gap + 0.73); gapTick.position.set(82.3, RG(70) + 1.48 - (gap + 0.73) / 2 + 0.05, 1.3);
    gapTick.visible = t > T.cm - 0.2; demoWater.material = WATER_CH;
    const pu = eout(k(t, T.pump - 0.1, T.pump + 0.2)), gone = t > T.pump + 0.55; pumpG.visible = t > T.pump - 0.1 && !gone; pumpG.scale.setScalar(Math.max(0.01, pu * (1 + 0.2 * Math.sin(k(t, T.pump, T.pump + 0.4) * Math.PI))));
    if (t > T.pump + 0.55) dust(t, T.pump + 0.55, V(126, RG(126) + 1.8, 0), 10, 2.2, 0xffffff, 0.9, 2.2);
    // the tank and the three pipes; in the drought the level drops below the villa's pipe
    const lvl = t < T.tanks ? 25.2 : lerp(25.2, 24.0, sm(k(t, T.drought, T.cut + 0.3))) + 0.04 * Math.sin(t * 6);
    tank.visible = castWater.visible = t > T.pumpL; PIPES.forEach(p => p.tube.visible = t > T.pumpL);
    castWater.position.set(CAST.x, (22.1 + lvl) / 2, CAST.z); castWater.scale.y = lvl - 22.1;
    PIPES.forEach((p, i) => { const on = t > T.split - 0.1 + i * 0.12 && lvl > p.y + 0.05; p.flow.visible = on && t > T.tanks - 0.5; p.flow.material.map.offset.x = -t * 2.2; });
    // fountain jets, the villa spout, bath steam, a jar spilling, a jar breaking
    if (fountain.visible) for (let i = 0; i < 6; i++) { const a = i * 1.047; drops(t, Math.floor(t * 8) / 8 - (i % 3) * 0.12, V(PLAZA.x, 24.0, PLAZA.z), V(Math.cos(a) * 1.4, 2.4, Math.sin(a) * 1.4), 3, 0.85); }
    if (t > T.tanks - 0.5 && t < T.cut + 0.2) for (let i = 0; i < 3; i++) drops(t, Math.floor(t * 10) / 10 - i * 0.1, spoutP.clone().add(V(0, 0, 0.35)), V(0, 0.5, 1.6), 3, 0.6);
    if (t > T.tanks - 0.5) for (let i = 0; i < 10; i++) { const u = ((t * 0.25 + hash(i)) % 1); puff(V(BATH.x - 4 + hash(i * 3) * 8, 22.5 + u * 4, BATH.z - 2 + hash(i * 7) * 4), 0xffffff, 2 + u * 3, 0.35 * Math.sin(u * Math.PI)); }
    if (t > T.half - 0.2 && t < T.spills + 1) for (let i = 0; i < 7; i++) { const x = -158 + i * 5.5 + (t - T.carry) * WALK_V * 2.2; if (i !== 6) drops(t, Math.floor(t * 5) / 5, V(x, RG(x) + 2.2, 4.1 + (i % 2 ? 0.5 : -0.5)), V(1.5, 1.2, 0), 2, 0.6); }
    const jx = -158 + 6 * 5.5 + (T.spills - 0.1 - T.carry) * WALK_V * 2.2;
    drops(t, T.spills - 0.05, V(jx + 0.6, RG(jx) + 0.4, 3.6), V(2.2, 2.5, 0), 22, 0.9); dust(t, T.spills - 0.05, V(jx + 0.8, RG(jx) + 0.1, 3.6), 6, 1.2, 0xc06a3a, 0.8, 0.6);
    // the waterfall's splash in the valley
    if (fallOn) for (let i = 0; i < 6; i++) { const u = ((t * 1.4 + i / 6) % 1); puff(V(-22 + hash(i) * 3, 1.6 + u * 2.5, (hash(i * 3) - 0.5) * 2), 0xffffff, 1.5 + u * 2, 0.55 * (1 - u)); }
    // the gold sweeps ("it worked")
    const sweep = (t0, dur, dir, a, b, w = 10, amt = 1.6) => { if (t < t0 || t > t0 + dur) return; const u = k(t, t0, t0 + dur);
      B.SWEEP.dir.copy(dir); B.SWEEP.pos = lerp(a, b, eio(u)); B.SWEEP.width = w; B.SWEEP.amt = amt * Math.sin(u * Math.PI); };
    sweep(T.cong1 - 0.1, 1.6, V(1, 0, 0), -165, -50, 9, 2.2);
    sweep(T.arches - 0.1, 1.3, V(1, 0, 0), -50, 50, 12, 1.4);
    sweep(T.bridge - 0.6, 1.5, V(0, 1, 0), -4, 34, 6, 1.8);
    sweep(T.roof + 0.2, 1.0, V(1, 0, 0), -12, 14, 6, 1.6);
    sweep(T.gravity - 0.1, 1.2, V(1, 0, 0), 100, 182, 10, 2.2);
    sweep(T.roman - 0.6, 1.8, V(1, 0, 0), -170, 260, 40, 1.6);
    castUpdate(t);
    for (let i = sprN; i < SPR.length; i++) SPR[i].visible = false;
  }
  // frogs: little green bodies with two eyes
  const frogs = [];
  { const fm = new THREE.MeshStandardMaterial({ color: 0x5aa83a, roughness: 0.5 }), em = new THREE.MeshStandardMaterial({ color: 0xfff6cc, roughness: 0.3 });
    for (let i = 0; i < 16; i++) { const f = new THREE.Group(); f.userData.big = 2.2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), fm); b.scale.set(1.3, 0.8, 1); f.add(b);
      [-0.08, 0.08].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), em); e.position.set(0.12, 0.12, s); f.add(e); });
      f.userData = { x: -9 + i * 1.2 + hash(i) * 0.5, z: (hash(i * 5) - 0.5) * 0.9 }; f.rotation.y = hash(i * 2) * 6; B.shadowed(f); scene.add(f); frogs.push(f); } }

  // ---------- overlay: the idea sparkle, rain, heat, drought, flashes, light vignette
  function sparkle(t, t0, head) {
    const a = eout(k(t, t0, t0 + 0.2)) * (1 - sm(k(t, t0 + 0.8, t0 + 1.0))); if (a <= 0) return;
    const p = B.project(head); if (!p.ok) return;
    g.save(); g.translate(p.x, p.y - 30); const s = (0.6 + 0.4 * a) * (1 + 0.08 * Math.sin(t * 20)); g.scale(s, s); g.rotate(t * 1.5);
    g.globalAlpha = a; g.shadowColor = '#ffd23f'; g.shadowBlur = 30; g.fillStyle = '#fff6b0';
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 34, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); g.restore();
  }
  function overlay(t) {
    B.vignette(0.14);
    sparkle(t, T.genius - 0.15, V(-103.5, RG(-103.5) + 2.15, 2.6));
    sparkle(t, T.brain - 0.3, V(-48.5, RG(-48.5) + 2.15, 2.4));
    B.tint((1 - sm(k(t, T.carry - 0.3, T.carry + 0.5))) * 0.22, '#ff9a3c', 'soft-light');
    const dry = sm(k(t, T.drought - 0.2, T.drought + 0.4)) * (1 - sm(k(t, T.never - 0.3, T.never + 0.3)));
    B.tint(dry * 0.35, '#ffb040', 'soft-light');
    const rain = sm(k(t, T.rain - 0.3, T.rain + 0.2)) * (1 - sm(k(t, T.washes + 1.0, T.brain - 0.6)));
    if (rain > 0) { B.tint(rain * 0.15, '#28384a', 'multiply'); g.save(); g.strokeStyle = 'rgba(210,225,240,0.55)'; g.lineWidth = 2.2; g.globalAlpha = rain; g.beginPath();
      for (let i = 0; i < 260; i++) { const sp = 2400 * (0.8 + 0.4 * hash(i * 3)), x = (hash(i) * (W + 300) + t * 260) % (W + 300) - 150, y = ((hash(i * 7) * (H + 300) + t * sp) % (H + 300)) - 150;
        g.moveTo(x, y); g.lineTo(x - 14, y + 70); } g.stroke(); g.restore(); }
    B.flash(t, [T.washes, T.third + 0.32], '#ffffff', 0.12, 0.25);
  }

  plantTrees();
  B.run({ update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hook: the thirsty town', 0, T.carry], ['Carrying water', T.carry, L0('dig')], ['The canal', L0('dig'), T.valley], ['The valley', T.valley, L0('arches')],
      ['Arches', L0('arches'), T.frogsL], ['Frogs and the roof', T.frogsL, T.pumpL], ['The tilt', T.pumpL, T.tanks], ['Three ways', T.tanks, T.end], ['Congratulations', T.end, DUR]],
    warm: [1, 20, 40, 60], ready: async () => { SUN0.copy(SUN); setupCast(); } });
})();
