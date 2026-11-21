// "Castle": you build it, they break in, you fix it, all on ONE hilltop (the camera never travels far).
// A camp, a wooden fence (burnt), a stone wall, ladders, a moat, battlements, corner towers, a gate (rammed), a portcullis,
// a drawbridge, boiling water, and a keep with its door high off the ground.
// Camera rules from the reference analysis: it holds still 2-3 s while the action happens in frame, and moves only
// 1-2 s with a soft start and stop (never a whip); it stays 1-12 m above the ground except for the very last shot.
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const c = (l, w, n) => cue(l, w, n), L0 = id => LN(id).t0;
  const T = {
    hill: c('hook', 'hill'), enemies: c('hook', 'enemies'), sleep: c('hook', 'sleep'),
    fence0: L0('fence'), fence: c('fence', 'fence'), fire: c('fence', 'fire'),
    genius: c('wall', 'genius'), stone: c('wall', 'stone'), wall: c('wall', 'wall'),
    cong1: L0('cong1'), fort: c('cong1', 'fort'),
    ladders: c('ladder', 'ladders'), climbs: c('ladder', 'climbs'), top: c('ladder', 'top'),
    dig: c('moat', 'dig'), water: c('moat', 'water'), short: c('moat', 'short'), fallin: c('moat', 'fall', 1),
    archers: c('arrows', 'archers'), shoot: c('arrows', 'shoot'), off: c('arrows', 'off'), teeth: c('arrows', 'teeth'), hide: c('arrows', 'hide'),
    corners: c('corner', 'corners'), under: c('corner', 'under'),
    brain: c('towers', 'brain'), towers: c('towers', 'towers'), blind: c('towers', 'blind'),
    cong2: L0('cong2'), fortress: c('cong2', 'fortress'),
    gate: c('gate', 'gate'), smash: c('gate', 'smash'), log: c('gate', 'log'),
    drop: c('port', 'drop'), grill: c('port', 'grill'), bridge: c('port', 'drawbridge'), pour: c('port', 'pour'), boiling: c('port', 'boiling'), close: c('port', 'close'),
    keep0: L0('keep'), breakin: c('keep', 'break'), runs: c('keep', 'runs'), tower: c('keep', 'tower'), door: c('keep', 'door'), high: c('keep', 'high'),
    end: L0('end'), castle: c('end', 'castle'), wood: c('wall', 'wood'),
  };

  // ---------- the hill: a flat top (y = 10), the moat ring carved into it, slopes down to a plain
  const TOPY = 10, HW = 12, WT = 2, WH = 7, M0 = 15, M1 = 19, MD = 3.6;   // wall half-width, thickness, height; moat ring
  const sq = (x, z) => Math.pow(Math.pow(Math.abs(x), 6) + Math.pow(Math.abs(z), 6), 1 / 6);   // rounded-square distance
  function hAt(x, z) {
    const d = sq(x, z), n = B.fbm(x / 400 + 0.5, z / 400 + 0.5, 8, 4) - 0.5;
    let y = d < 26 ? TOPY : d < 70 ? lerp(TOPY, 0.5, sm((d - 26) / 44)) : 0.5;
    y += n * 4 * sm((d - 30) / 20);
    if (d > M0 && d < M1) { const u = (d - M0) / (M1 - M0); y -= MD * Math.pow(Math.sin(u * Math.PI), 0.35); }
    return y;
  }
  const SUN = V(0.55, 0.5, 0.7).normalize();
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', SUN, 32);
  B.fogColor.set(0xdfe2e6); scene.fog = new THREE.Fog(0xdfe2e6, 140, 900);
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdce8ff, 0x6a5a40, 0.5); scene.add(hemi);

  // grey castle stone: blocks in courses (made here), with the brick's bumps for relief
  const ASH = B.procTex(512, (u, v, i, j) => { const rows = 6, row = Math.floor(v * rows), off = row % 2 ? 0.5 / 3 : 0, cu = (u + off) * 3, col = Math.floor(cu);
    const fu = cu - col, fv = v * rows - row, edge = Math.min(fu * 1.4, (1 - fu) * 1.4, fv, 1 - fv), mort = edge < 0.05 ? 1 : 0;
    const sh = 0.82 + 0.2 * hash(row * 13 + col * 7 + 3) + 0.12 * (B.fbm(u, v, 16, 4) - 0.5);
    const l = mort ? 0.55 : sh; return [196 * l, 190 * l, 178 * l, mort ? 0 : 0.5 + 0.5 * B.fbm(u * 2, v * 2, 16, 3)]; }, 3, [1, 1]);
  const BRICK = (rx, ry) => { const m = B.sweepify(new THREE.MeshStandardMaterial({ map: ASH.map.clone(), normalMap: ASH.normalMap.clone(), roughness: 0.9 }));
    [m.map, m.normalMap].forEach(tx => { tx.repeat.set(rx * 2.5, ry * 2.5); tx.needsUpdate = true; }); return m; };
  const WOOD = B.pbr('brown_planks_09', 1, 1, { color: 0xc8a888 });
  {
    const S = 420, N = 300, geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z), d = sq(x, z); p.setY(i, y);
      const m = B.fbm(x / 40 + 0.3, z / 40 + 0.1, 8, 3);
      let cc = [lerp(0.55, 0.72, m), lerp(0.92, 1.0, m), lerp(0.45, 0.52, m)];
      if (d < 14) cc = cc.map((v, j) => lerp(v, [1.0, 0.86, 0.68][j], 0.75));               // trampled courtyard
      if (d > M0 - 0.4 && d < M1 + 0.4) cc = [0.78, 0.66, 0.52];                             // the ditch walls
      col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const tm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: B.tex('aerial_grass_rock', 60, 60), normalMap: B.tex('aerial_grass_rock', 60, 60, 'nor_gl'), vertexColors: true, roughness: 0.95 }));
    tm.receiveShadow = true; scene.add(tm);
  }
  // the moat is hidden under a lid of grass until you dig it (four sides, one after another)
  const LIDM = new THREE.MeshStandardMaterial({ map: B.tex('aerial_grass_rock', 4, 4), color: 0xa8d090, roughness: 0.95 });
  const lids = [[0, -17, 38, 4], [17, 0, 4, 38], [0, 17, 38, 4], [-17, 0, 4, 38]].map(([x, z, w, d], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), LIDM); m.position.set(x, TOPY - 0.28, z); m.receiveShadow = true; scene.add(m); return m; });
  const moatW = new THREE.Mesh(new THREE.RingGeometry(M0 - 0.2, M1 + 0.4, 4, 1, Math.PI / 4), new THREE.MeshStandardMaterial({ color: 0x2f7a8a, roughness: 0.08, envMapIntensity: 1.1, transparent: true, opacity: 0.92 }));
  moatW.rotation.x = -Math.PI / 2; moatW.scale.set(1.414 * 0.99, 1.414 * 0.99, 1); scene.add(moatW);
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(4.4, MD + 0.3, M1 - M0 + 0.6), new THREE.MeshStandardMaterial({ map: B.tex('dry_ground_01', 1, 1), color: 0xc8a888, roughness: 1 }));
  causeway.position.set(0, TOPY - (MD + 0.3) / 2, (M0 + M1) / 2); causeway.receiveShadow = causeway.castShadow = true; scene.add(causeway);

  // ---------- the camp: a tent and a fire
  const tent = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.2, 3, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9, side: THREE.DoubleSide }));
  tent.rotation.set(0, 0.6, Math.PI / 2); tent.position.set(-4, TOPY + 0.65, -4.5); tent.castShadow = true; scene.add(tent);
  const logs = new THREE.Group(); for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), WOOD); l.rotation.set(Math.PI / 2, i * Math.PI / 4, 0.3); logs.add(l); }
  logs.position.set(1.2, TOPY + 0.1, 1.8); scene.add(logs);
  const FIREP = V(1.2, TOPY + 0.2, 1.8);

  // ---------- the wooden fence: stakes on the wall's line
  const STAKES = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 40; i++) { const u = -HW + (i + 0.5) * (2 * HW / 40); STAKES.push(s === 0 ? [u, -HW] : s === 1 ? [HW, u] : s === 2 ? [-u, HW] : [-HW, -u]); }
  const stakeG = new THREE.CylinderGeometry(0.28, 0.3, 4.2, 6); stakeG.translate(0, 2.1, 0);
  const tipG = new THREE.ConeGeometry(0.3, 0.6, 6); tipG.translate(0, 4.5, 0);
  const fenceG = (() => { const a = stakeG.toNonIndexed(), b = tipG.toNonIndexed(), m = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(n => { const A = a.attributes[n].array, Bb = b.attributes[n].array, o = new Float32Array(A.length + Bb.length); o.set(A); o.set(Bb, A.length); m.setAttribute(n, new THREE.BufferAttribute(o, a.attributes[n].itemSize)); }); return m; })();
  const FENCEM = new THREE.MeshStandardMaterial({ map: B.tex('brown_planks_09', 1, 2), color: 0xb08a68, roughness: 0.9 });
  const fence = new THREE.InstancedMesh(fenceG, FENCEM, STAKES.length); fence.castShadow = fence.receiveShadow = true; fence.frustumCulled = false; scene.add(fence);

  // ---------- the stone wall: four sides (a gate gap in the front), rising in courses
  const walls = [], CW = BRICK(1, 1);
  function wallBox(x0, z0, x1, z1) { const w = Math.abs(x1 - x0) || WT, d = Math.abs(z1 - z0) || WT;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WH, d), BRICK(w / 4, WH / 4)); m.geometry.translate(0, WH / 2, 0);
    m.position.set((x0 + x1) / 2, TOPY, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; scene.add(m); walls.push(m); return m; }
  wallBox(-HW - 1, -HW, HW + 1, -HW); wallBox(HW, -HW, HW, HW); wallBox(-HW, -HW, -HW, HW); wallBox(-HW - 1, HW, -2.2, HW); wallBox(2.2, HW, HW + 1, HW);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2, WT), BRICK(1.1, 0.5)); lintel.position.set(0, TOPY + WH - 1, HW); lintel.castShadow = true; scene.add(lintel);
  // battlements (merlons) along the top
  const MER = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 12; i++) { const u = -HW + 0.9 + i * (2 * HW - 1.8) / 11; MER.push(s === 0 ? [u, -HW - 0.6] : s === 1 ? [HW + 0.6, u] : s === 2 ? [-u, HW + 0.6] : [-HW - 0.6, -u]); }
  const merG = new THREE.BoxGeometry(1.1, 1.2, 0.7); merG.translate(0, 0.6, 0);
  const mer = new THREE.InstancedMesh(merG, BRICK(0.3, 0.3), MER.length); mer.castShadow = mer.receiveShadow = true; mer.frustumCulled = false; scene.add(mer);
  // the dug-under corner: a chunk of the front-right corner that sags
  const crack = new THREE.Group(); scene.add(crack);
  // ---------- the corner towers
  const TOWERS = [[HW, HW], [-HW, HW], [HW, -HW], [-HW, -HW]].map(([x, z], i) => {
    const t = new THREE.Group(); t.position.set(x, TOPY, z); scene.add(t);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 10, 28), BRICK(4, 2.5)); body.position.y = 5; t.add(body);
    for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.6), BRICK(0.3, 0.3)); m.position.set(Math.cos(a) * 2.9, 10.6, Math.sin(a) * 2.9); m.rotation.y = -a; t.add(m); }
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x111111 })); slit.position.set(0, 6, 3.3); t.add(slit);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), WOOD); pole.position.y = 12; t.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1, 8, 1), new THREE.MeshStandardMaterial({ color: 0xd83a2a, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(0.8, 13, 0); t.add(flag); t.userData.flag = flag;
    B.shadowed(t); return t; });
  // ---------- the gate, portcullis, drawbridge
  const door = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5, 0.4), new THREE.MeshStandardMaterial({ map: B.tex('brown_planks_09', 1, 1), color: 0x9a7050, roughness: 0.85 }));
  door.geometry.translate(0, 2.5, 0); door.position.set(0, TOPY, HW + 0.6); door.castShadow = true; scene.add(door);
  const IRON = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.45, metalness: 0.85 });
  const port = new THREE.Group(); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.2, 0.14), IRON); b.position.set(-1.8 + i * 0.72, 2.6, 0); port.add(b); }
  for (let j = 0; j < 5; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.12), IRON); b.position.set(0, 0.4 + j * 1.15, 0); port.add(b); }
  B.shadowed(port); port.position.set(0, TOPY, HW - 0.7); scene.add(port);
  const dbr = new THREE.Group(); dbr.position.set(0, TOPY, HW + 1); scene.add(dbr);
  { const plank = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.35, 6.4), new THREE.MeshStandardMaterial({ map: B.tex('brown_planks_09', 1, 2), color: 0xb08a68, roughness: 0.85 })); plank.position.set(0, -0.18, 3.2); plank.castShadow = plank.receiveShadow = true; dbr.add(plank);
    [-1.9, 1.9].forEach(x => { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.5, 4), IRON); ch.position.set(x, 3.1, 3.1); ch.rotation.x = -0.82; dbr.add(ch); }); }
  // the cauldron of boiling water over the gate
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), IRON); pot.position.set(0, TOPY + WH + 1.4, HW + 0.2); pot.rotation.x = Math.PI; pot.castShadow = true; scene.add(pot);
  // the battering ram
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 12), new THREE.MeshStandardMaterial({ map: B.tex('brown_planks_09', 1, 3), color: 0x8a6a48, roughness: 0.9 }));
  ram.rotation.x = Math.PI / 2; ram.castShadow = true; scene.add(ram);
  // ladders
  const ladderG = (() => { const gq = new THREE.Group(); [-0.35, 0.35].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 8.5, 0.1), WOOD); r.position.set(x, 4.25, 0); gq.add(r); });
    for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), WOOD); s.position.set(0, 0.4 + i * 0.5, 0); gq.add(s); } return B.shadowed(gq); })();
  const LAD = [-7, -1.2, 6].map(x => { const l = ladderG.clone(); l.position.set(x, TOPY, HW + 2.2); scene.add(l); return l; });
  // the keep: the last tower in the middle, its door high up, a wooden stair that is pulled up
  const keep = new THREE.Group(); scene.add(keep); keep.position.set(0, TOPY, -1);
  { const body = new THREE.Mesh(new THREE.BoxGeometry(8, 15, 8), BRICK(2, 3.75)); body.position.y = 7.5; keep.add(body);
    for (let s = 0; s < 4; s++) for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), BRICK(0.3, 0.3)); const u = -3.4 + i * 1.7;
      m.position.set(s === 0 ? u : s === 1 ? 4 : s === 2 ? -u : -4, 15.55, s === 0 ? -4 : s === 1 ? u : s === 2 ? 4 : -u); keep.add(m); }
    const kd = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 })); kd.position.set(0, 7.2, 4.05); keep.add(kd);
    B.shadowed(keep); }
  const stair = new THREE.Group(); scene.add(stair); stair.position.set(0, TOPY + 6, 3.2);
  { for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.55), WOOD); s.position.set(0, -i * 0.5, i * 0.55); stair.add(s); }
    [-0.8, 0.8].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 7.6), WOOD); r.position.set(x, -2.75, 3.0); r.rotation.x = 0.74; stair.add(r); }); B.shadowed(stair); }

  // ---------- plants: Poly Haven grass clumps, ferns, rocks; simple trees down the slope
  const grassSet = B.gltf('models/grass_medium_01/grass_medium_01.gltf'), fernSet = B.gltf('models/fern_02/fern_02.gltf'), rockSet = B.gltf('models/rock_moss_set_01/rock_moss_set_01.gltf');
  function plant() {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion();
    const okSpot = (x, z) => { const d = sq(x, z); return !(d < 14.2) && !(d > M0 - 0.8 && d < M1 + 0.8); };
    const scatter = (set, n, rmin, rmax, smin, smax, seed) => { const meshes = []; set.traverse(m => { if (m.isMesh) meshes.push(m); }); if (!meshes.length) return;
      meshes.forEach((m, mi) => { const pl = [];
        for (let i = 0; pl.length < n && i < n * 6; i++) { const a = hash(seed + mi * 97 + i * 1.3) * 6.283, r = rmin + (rmax - rmin) * Math.sqrt(hash(seed + mi * 31 + i * 2.7));
          const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!okSpot(x, z)) continue; pl.push([x, hAt(x, z), z, hash(i * 3.3 + mi) * 6.28, smin + (smax - smin) * hash(i * 7.1 + mi)]); }
        const im = new THREE.InstancedMesh(m.geometry, m.material, pl.length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
        m.updateMatrixWorld(true); pl.forEach(([x, y, z, r, s], i) => { q.setFromAxisAngle(V(0, 1, 0), r); M.compose(V(x, y, z), q, V(s, s, s)).multiply(m.matrixWorld); im.setMatrixAt(i, M); });
        scene.add(im); }); set.visible = false; };
    scatter(grassSet, 260, 13, 75, 0.9, 1.6, 11); scatter(fernSet, 60, 20, 70, 0.8, 1.4, 23); scatter(rockSet, 6, 24, 60, 0.6, 1.2, 37);
    // trees: layered cypresses and round trees on the lower slope and plain
    const cy = [], ro = [];
    for (let i = 0; i < 500; i++) { const a = hash(i * 4.1) * 6.283, r = 40 + 160 * Math.sqrt(hash(i * 8.3)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 20 && Math.abs(x) < 20 && r < 90) continue; (hash(i * 2.2) < 0.5 ? cy : ro).push([x, hAt(x, z), z, 0.8 + 0.6 * hash(i * 9.1)]); }
    const leaf = c2 => new THREE.MeshStandardMaterial({ color: c2, roughness: 0.85 });
    const put = (geo, mat, list) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, s], i) => { M.compose(V(x, y - 0.2, z), q.setFromAxisAngle(V(0, 1, 0), s * 9), V(s, s, s)); im.setMatrixAt(i, M); }); im.castShadow = true; scene.add(im); };
    const cyG = new THREE.CapsuleGeometry(1.1, 6, 4, 10); cyG.translate(0, 4.6, 0); const roG = new THREE.IcosahedronGeometry(2.6, 3); roG.translate(0, 4.2, 0);
    const trG = new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6); trG.translate(0, 1.2, 0);
    { const p = roG.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i) - 4.2, p.getZ(i)), n = 1 + 0.18 * (B.fbm(v.x * 0.3 + 3, v.z * 0.3 + v.y * 0.2, 4, 3) - 0.5) * 2; p.setXYZ(i, v.x * n, v.y * n * 0.85 + 4.2, v.z * n); } roG.computeVertexNormals(); }
    put(cyG, leaf(0x3a6a30), cy); put(roG, leaf(0x5a8a3a), ro); put(trG, leaf(0x5a4232), cy.concat(ro));
  }

  // ---------- sprites: dust, drops, fire, steam (a fixed pool; each a pure function of t)
  const mkPool = (n, add) => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); return s; });
  const SPR = mkPool(500, false), FIRE = mkPool(260, true); let sN = 0, fN = 0;
  const puff = (p, col, size, op) => { if (sN >= SPR.length) return; const s = SPR[sN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = op; };
  const flame = (p, size, op) => { if (fN >= FIRE.length) return; const s = FIRE[fN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.setRGB(1, 0.55, 0.18); s.material.opacity = op; };
  function dust(t, t0, p, n = 8, r = 2, col = 0xdcc6a2, life = 1.2, size = 2) { const u = (t - t0) / life; if (u < 0 || u > 1) return;
    for (let i = 0; i < n; i++) { const a = hash(t0 * 7 + i) * 6.283, rr = r * (0.5 + 0.7 * hash(t0 * 3 + i * 1.7)) * eout(u);
      puff(V(p.x + Math.cos(a) * rr, p.y + 0.3 + u * r * 0.5 * hash(i + t0), p.z + Math.sin(a) * rr), col, size * (0.6 + u), 0.7 * (1 - u) * (1 - u)); } }
  function drops(t, t0, p, v, n = 10, life = 0.8, col = 0xcfefff) { const u = t - t0; if (u < 0 || u > life) return;
    for (let i = 0; i < n; i++) { const vv = V(v.x * (0.6 + 0.8 * hash(i + t0)) + (hash(i * 7 + t0) - 0.5), v.y * (0.7 + 0.6 * hash(i * 3 + t0)), v.z + (hash(i * 5 + t0) - 0.5) * 2);
      puff(V(p.x + vv.x * u, p.y + vv.y * u - 4.9 * u * u, p.z + vv.z * u), col, 0.25, 0.95 * (1 - u / life)); } }
  function fireAt(t, p, s = 1, a = 1) { for (let i = 0; i < 4; i++) { const u = ((t * 1.7 + hash(p.x * 3.1 + p.z * 7.7 + i)) % 1);
    flame(V(p.x + (hash(i * 3 + p.x) - 0.5) * 0.5 * s, p.y + u * 1.6 * s, p.z + (hash(i * 5 + p.z) - 0.5) * 0.5 * s), (0.9 - 0.5 * u) * s, a * (1 - u) * 0.9); } }

  // ---------- arrows (instanced): [launch t, from, to]
  const ARW = []; for (let i = 0; i < 26; i++) { const t0 = T.shoot - 0.3 + i * 0.16 + hash(i) * 0.1, fx = -9 + hash(i * 3) * 18, tx = -10 + hash(i * 5) * 20;
    ARW.push({ t0, a: V(fx, hAt(fx, 33) + 1.5, 33), b: V(tx, TOPY + WH + 0.5 + hash(i * 7) * 1.2, HW + 0.9) }); }
  const arrowG = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4); arrowG.rotateX(Math.PI / 2);
  const arrows = new THREE.InstancedMesh(arrowG, new THREE.MeshStandardMaterial({ color: 0x4a3a2a }), ARW.length); arrows.frustumCulled = false; scene.add(arrows);

  // ---------- people (Mixamo): one model cloned into a cast; each clone plays any role
  const MX = window.MIXAMO || { model: 'Walking.fbx', files: [] };
  const pick = (...names) => names.find(n => MX.files.includes(n + '.fbx')) || null;
  const ROLE = { walk: pick('Walking'), run: pick('Running', 'Fast Run', 'Walking'), idle: pick('Idle', 'Breathing Idle', 'Nervously Look Around'), look: pick('Nervously Look Around', 'Idle'),
    sleep: pick('Sleeping Idle', 'Laying Idle'), wake: pick('Getting Up'), cheer: pick('Cheering', 'Victory', 'Flailing Arms'), climb: pick('Climbing Ladder', 'Climbing', 'Pull Heavy Object'),
    dig: pick('Digging', 'Pull Heavy Object'), fall: pick('Falling', 'Falling Back Death', 'Flailing Arms'), swim: pick('Treading Water'), scared: pick('Terrified'), shoot: pick('Standing Draw Arrow', 'Archer', 'Nervously Look Around'),
    carry: pick('Carrying', 'Walking'), push: pick('Pushing', 'Pull Heavy Object'), point: pick('Pointing', 'Nervously Look Around'), think: pick('Thinking', 'Nervously Look Around'), torch: pick('Walking') };
  // the cast's bodies: Remy (the hero, recoloured), two peasants (your people), a paladin in armour (the enemy)
  const MODELS = { remy: ['Walking', 6], man: ['char_peasant_man', 10], girl: ['char_peasant_girl', 7], foe: ['char_paladin', 13] };
  const model = { objs: {}, clips: {} }, pools = {}, holders = [];
  Object.entries(MODELS).forEach(([key, [file]]) => { if (key === 'remy' || MX.files.includes(file + '.fbx')) holders.push(B.fbx('mixamo/' + file + '.fbx', obj => { model.objs[key] = obj; })); });
  [...new Set(Object.values(ROLE).filter(Boolean))].forEach(f => B.fbx('mixamo/' + f + '.fbx', obj => { const cl = obj.animations && obj.animations[0]; if (cl) model.clips[f] = cl; }));
  const pinHips = clip => { clip.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } }); return clip; };
  const TOP = /top|shirt|torso|jacket|hood|sweat/i, BOT = /bottom|pant|jean|trouser|short/i;
  function setupCast() {
    Object.values(model.clips).forEach(pinHips);
    const SU = window.THREE_ADDONS.SkeletonUtils;
    Object.entries(MODELS).forEach(([key, [, n]]) => {
      const o = model.objs[key] || model.objs.remy; if (!o) return; pools[key] = [];
      if (!o.userData.sized) { o.scale.setScalar(0.01); o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o, true);
        o.scale.multiplyScalar((key === 'girl' ? 1.68 : 1.8) / Math.max(0.1, bb.max.y - bb.min.y)); o.userData.sized = true; }
      for (let i = 0; i < n; i++) {
        const cl = SU.clone(o), mats = [];
        cl.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
          const arr = (Array.isArray(m.material) ? m.material : [m.material]).map(mm => { const nm = new THREE.MeshStandardMaterial({ map: mm.map || null, normalMap: mm.normalMap || null,
            color: 0xffffff, roughness: 0.8, metalness: 0, transparent: !!mm.transparent, alphaTest: mm.transparent ? 0.3 : 0 });
            nm.name = mm.name; if (key === 'remy' && (TOP.test(mm.name) || BOT.test(mm.name))) nm.map = null; mats.push(nm); return nm; });
          m.material = Array.isArray(m.material) ? arr : arr[0]; } });
        let hand = null; cl.traverse(b => { if (b.isBone && /RightHand$/.test(b.name)) hand = b; });
        const s = cl.scale.x, torch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 5), WOOD); torch.scale.setScalar(1 / s); torch.position.set(0, 0.2 / s, 0); torch.visible = false; if (hand) hand.add(torch);
        const holder = new THREE.Group(); holder.add(cl); scene.add(holder);
        const mixer = new THREE.AnimationMixer(cl), acts = {};
        Object.entries(model.clips).forEach(([f, clip]) => { let c = clip;
          if (key !== 'remy') { c = clip.clone(); c.tracks = c.tracks.filter(tr => !/Hips\.position$/.test(tr.name)); }   // hip height comes from each body's own rest pose
          const a = mixer.clipAction(c); a.play(); a.weight = 0; acts[f] = a; });
        pools[key].push({ holder, mixer, acts, mats, torch, key });
      }
    });
    holders.forEach(h => { h.visible = false; });
  }
  const HERO = { top: 0xd8301e, bottom: 0x3a3a48, m: 'remy' }, FOE = { m: 'foe' }, PAL = [0x3a7bd5, 0xe8b23a, 0x48a868, 0xe07aa8, 0xf2f2ea, 0x40c0c0];
  const ally = i => ({ m: i % 3 === 1 ? 'girl' : 'man' });
  const cast = [], add = (t0, t1, place, anim, look = {}) => cast.push({ t0, t1, place, anim, look });
  const loop = (role, ph = 0, sp = 1) => t => [[role, t * sp + ph, 1]];
  const at = (x, z, hd, dy = 0) => () => [x, hAt(x, z) + dy, z, hd];
  const on = (x, y, z, hd) => () => [x, y, z, hd];
  const along = (a, b, t0, t1, ease = x => x) => t => { const u = ease(k(t, t0, t1)); return [lerp(a[0], b[0], u), null, lerp(a[1], b[1], u)]; };
  const walkTo = (a, b, t0, t1, hd) => t => { const [x, , z] = along(a, b, t0, t1)(t); return [x, hAt(x, z), z, hd]; };
  const WY = TOPY + WH;                                    // the wall walk
  // 1) the camp: you asleep by the fire; enemies with torches creep up the hill
  add(-1, T.fence + 0.3, on(2.6, TOPY + 0.05, 2.2, 250), t => t < T.sleep - 0.3 ? [['sleep', t, 1]] : [['wake', (t - T.sleep + 0.3) * 1.3, 1]], HERO);
  for (let i = 0; i < 9; i++) { const a = rad(72 + i * 4.5), r0 = 50 + (i % 3) * 2.5, r1 = 30; add(-1, T.wall, t => { const r = lerp(r0, r1, k(t, 0, T.fire)) - (i % 2) * 2, x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, hAt(x, z), z, 180 + 90 - (72 + i * 4.5)]; },
    loop('walk', i * 0.4, 0.8), Object.assign({ torch: true }, FOE)); }
  // 2) the fence: you watch it burn
  add(T.fence + 0.3, T.cong1 - 0.5, on(3, TOPY, 6.5, 0), t => t < T.genius - 0.3 ? [['scared', t, 1]] : [['think', t, 1]], HERO);
  // 3) the fort: you cheer on the wall, friends too
  add(T.cong1 - 0.6, T.ladders, on(0, WY, HW - 0.6, 0), t => [['cheer', t - T.cong1, 1]], HERO);
  [[-3.5, 1], [3.2, 2]].forEach(([x, j]) => add(T.cong1 - 0.6, T.top + 0.3, on(x, WY, HW - 0.6, 0), t => [['cheer', t - T.cong1 + j * 0.6, 1]], ally(j)));
  // 4) ladders: three climbers
  [-7, -1.2, 6].forEach((x, i) => add(T.ladders - 0.2, T.dig + 0.2, t => { const u = k(t, T.ladders + 0.2 + i * 0.25, T.top + 0.4); return [x, TOPY + u * 6.2, HW + 2.0 - u * 0.9, 180]; },
    loop('climb', i * 0.5, 1.1), FOE));
  // 5) the moat: ladders fall short, the climbers fall in and paddle
  [-7, 6].forEach((x, i) => add(T.short - 0.6, T.archers + 0.2, t => { const f = k(t, T.fallin - 0.15, T.fallin + 0.45); return [x, lerp(TOPY + 3.5, TOPY - MD + 0.6, f * f), M1 - 0.6 - f * 1.4, 180]; },
    t => t < T.fallin + 0.3 ? [['fall', (t - T.short) * 1.2, 1]] : [['swim', t, 1]], FOE));
  // 6) archers on the slope shoot; a guard on the wall falls back; then guards hide behind the teeth
  for (let i = 0; i < 5; i++) { const x = -8 + i * 4; add(T.archers - 0.8, T.corners, at(x, 33 + (i % 2) * 1.5, 180), loop('shoot', i * 0.3), FOE); }
  add(T.archers - 0.8, T.teeth + 0.4, t => { const f = k(t, T.off - 0.1, T.off + 0.5); return [2, WY - f * f * 7, HW - 0.4 - f * 2.2, 0]; }, t => t < T.off - 0.1 ? [['look', t, 1]] : [['fall', t - T.off, 1]], ally(0));
  [[-4, 1], [4, 2]].forEach(([x, j]) => add(T.teeth - 0.2, T.corners, on(x, WY - 0.35, HW - 0.5, 0), loop('look', j), ally(j)));
  // 7) diggers at the front-right corner
  [[HW + 1.6, HW + 0.6, 220], [HW + 0.8, HW + 1.8, 200]].forEach(([x, z, hd], i) => add(T.corners - 0.6, T.towers + 0.2, on(x, TOPY, z, hd), loop('dig', i * 0.6, 1.2), FOE));
  // 8) the idea, the towers, the cheering
  add(T.brain - 1.2, T.cong2 + 2.2, on(HW - 3, WY, HW - 0.6, 20), t => t < T.cong2 - 0.2 ? [['think', t, 1]] : [['cheer', t - T.cong2, 1]], HERO);
  [[HW - 0.8, HW + 1.8], [-HW + 0.6, HW + 1.6]].forEach(([x, z], j) => add(T.cong2 - 0.4, T.gate, on(x, TOPY + 10, z - 1.2, 30), t => [['cheer', t - T.cong2 + j * 0.7, 1]], ally(j + 2)));
  // 9) the ram: four men run the log at the gate (they come over the causeway), then the drawbridge lifts them off
  const ramZ = t => t < T.smash ? lerp(34, HW + 4.6, eio(k(t, T.gate - 0.6, T.smash))) : HW + 4.6 + 0.9 * Math.abs(Math.sin((t - T.smash) * 7)) * (t < T.grill ? 1 : 0);
  for (let i = 0; i < 4; i++) { const sx = i % 2 ? 0.75 : -0.75, dz = Math.floor(i / 2) * 2.2 + 0.8;
    add(T.gate - 0.8, T.boiling + 2.5, t => { if (t < T.bridge + 0.3) { const z = ramZ(t) + dz; return [sx, hAt(sx, z), z, 180]; }
      const f = k(t, T.bridge + 0.3, T.bridge + 1.1), z = HW + 4.6 + dz + f * 1.5; return [sx * (1 + f), lerp(TOPY, TOPY - MD + 0.6, f * f), Math.min(z, M1 - 0.5), 180]; },
      t => t < T.smash ? [['run', t * 1.3 + i, 1]] : t < T.bridge + 0.3 ? [['push', t * 1.5 + i, 1]] : t < T.bridge + 1.1 ? [['fall', t - T.bridge, 1]] : [['swim', t + i, 1]], FOE); }
  // 10) boiling water: a defender tips the pot; the next attackers on the bank run off
  add(T.drop - 0.3, T.keep0, on(0.9, WY, HW - 0.3, 180), loop('push', 0.2), ally(1));
  for (let i = 0; i < 4; i++) { const x = -3 + i * 2; add(T.pour - 0.4, T.keep0 + 0.6, t => { const run = Math.max(0, t - T.boiling - 0.2), z = M1 + 1.5 + i * 0.8 + run * 3.2; return [x + run * (i - 1.5) * 0.4, hAt(x, z), z, run > 0 ? 0 : 180]; },
    t => t < T.boiling + 0.2 ? [['look', t + i, 1]] : [['run', t * 1.4 + i, 1]], FOE); }
  // 11) everyone runs up the stair into the keep
  for (let i = 0; i < 8; i++) { const a = rad(20 + i * 18), r = 9, sx = Math.cos(a) * r * (i % 2 ? 1 : -1), sz = 3 + Math.sin(a) * 5; const t0 = T.breakin + i * 0.12, t1 = T.tower + 0.2 + i * 0.12;
    add(T.keep0 - 0.3, T.door + 0.8, t => { const u = k(t, t0, t1); if (u < 0.75) { const v = u / 0.75; return [lerp(sx, 0, v), TOPY, lerp(sz, 9.2, v), Math.atan2(-sx, 9.2 - sz) * 180 / Math.PI]; }
      const v = (u - 0.75) / 0.25; return [0, TOPY + v * 6, lerp(9.2, 3.4, v), 180]; }, t => [['run', t * 1.3 + i, 1]], i === 0 ? HERO : ally(i)); }
  // 12) the end: cheering on the walls and the keep
  add(T.end - 0.5, DUR + 1, on(0, TOPY + 15, 2.6, 0), t => [['cheer', t - T.end, 1]], HERO);
  [[-4, -1], [4, 2], [-8, 3], [8, 4]].forEach(([x, j]) => add(T.end - 0.5, DUR + 1, on(x, WY, HW - 0.6, 0), t => [['cheer', t - T.end + j * 0.5, 1]], ally(Math.abs(j))));

  function castUpdate(t) {
    if (!Object.keys(pools).length) return;
    const used = {}; Object.keys(pools).forEach(kk => used[kk] = 0);
    for (const a of cast) {
      if (t < a.t0 || t > a.t1) continue;
      const mk = pools[(a.look || {}).m] ? (a.look || {}).m : 'remy', pl = pools[mk]; if (!pl || used[mk] >= pl.length) continue;
      const P = pl[used[mk]++], [x, y, z, hd] = a.place(t);
      P.holder.visible = true; P.holder.position.set(x, y, z); P.holder.rotation.set(0, rad(hd), 0);
      Object.values(P.acts).forEach(ac => { ac.weight = 0; ac.enabled = false; });
      a.anim(t).forEach(([role, lt, w]) => { const f = ROLE[role] || ROLE.idle || ROLE.walk, ac = P.acts[f]; if (!ac) return; const d = ac.getClip().duration;
        ac.enabled = true; ac.weight = w; ac.time = role === 'wake' ? clamp(lt, 0, d - 0.01) : ((lt % d) + d) % d; });
      P.mixer.update(0);
      const lk = a.look || {};
      if (P.key === 'remy') P.mats.forEach(m => { const top = TOP.test(m.name), bot = BOT.test(m.name); m.color.set(top ? (lk.top != null ? lk.top : 0xd8c8a8) : bot ? (lk.bottom != null ? lk.bottom : 0x6a5642) : 0xffffff); });
      P.torch.visible = !!lk.torch;
      if (lk.torch) { const wp = new THREE.Vector3(); P.torch.getWorldPosition(wp); fireAt(t, wp.add(V(0, 0.35, 0)), 0.45, 0.9); }
    }
    Object.entries(pools).forEach(([kk, pl]) => { for (let i = used[kk]; i < pl.length; i++) pl[i].holder.visible = false; });
  }

  // ---------- the camera: shots [arrive t, camera, target, fov]. It holds (a slow 3% push) and moves only between shots,
  // over 1.1-1.8 s with a soft start and stop.
  const Y = TOPY;
  const SHOTS = [
    [0.0, [5.2, Y + 1.6, 4.4], [2.2, Y + 0.3, 2.0], 44],               // asleep by the fire (close)
    [T.enemies + 0.9, [9, hAt(9, 60) + 2.2, 60], [0, Y - 1, 32], 42],                // enemies creep up the hill (low, behind them)
    [T.fence, [12, Y + 4.5, 30], [0, Y + 2.5, 3], 42],                   // the fence goes up round the top
    [T.genius - 0.2, [5.5, Y + 1.9, 9.8], [3, Y + 1.6, 6.5], 42],        // your idea (close)
    [T.stone, [15, Y + 5, 32], [0, Y + 4, 6], 42],                       // the stone wall rises
    [T.cong1, [5, Y + 0.8, 26], [0, WY + 1.2, HW - 0.5], 44],            // CONGRATULATIONS (low, looking up)
    [T.ladders, [-12, Y + 1.8, 24], [-2, Y + 4.5, HW + 1], 44],          // ladders and climbers
    [T.dig + 0.1, [36, Y + 26, 62], [0, Y - 1, 4], 42],                      // dig the moat (higher, still close)
    [T.short - 0.4, [-11, Y + 1.4, 26], [-6, Y + 1, 16.5], 42],          // a ladder falls short, splash
    [T.archers, [2.5, hAt(2.5, 40) + 2.2, 40], [0, Y - 1.5, 24], 44],          // behind the archers
    [T.teeth - 0.1, [5, WY + 2.2, 21], [1, WY + 0.6, HW + 0.5], 42],     // stone teeth along the top
    [T.corners, [22, Y + 1.6, 24], [HW + 1, Y + 1.5, HW + 1], 42],       // digging under the corner
    [T.brain - 0.3, [HW - 1, WY + 1.7, HW + 3.8], [HW - 3, WY + 1.4, HW - 0.6], 42], // your huge brain (close)
    [T.towers - 0.1, [40, Y + 16, 62], [0, Y + 5, 0], 42],                // round towers rise
    [T.cong2, [17, Y - 1.6, 22], [HW, Y + 9, HW], 48],                   // CONGRATULATIONS (low, up at a tower)
    [T.gate - 0.2, [4, Y + 1.6, 30], [0, Y + 2.5, HW + 2], 44],          // the gate, the ram coming
    [T.grill - 0.3, [1.6, Y + 1.8, 3.5], [0, Y + 2.6, HW], 46],          // from inside: the grill drops
    [T.bridge, [13, Y + 1.5, 22], [0, Y - 0.5, HW + 3.5], 44],           // the drawbridge lifts (side)
    [T.boiling - 0.2, [5, Y + 0.6, 25], [0, WY + 0.5, HW + 1], 44],      // boiling water from above (low)
    [T.breakin, [20, Y + 20, 26], [0, Y + 2, 2], 42],                    // everyone runs to the keep
    [T.tower, [6.5, Y + 4.5, 12.5], [0, Y + 7, 2], 48],                      // the keep rises (low, up)
    [T.end, [7, Y - 1.5, 42], [0, Y + 8, 0], 42],                        // CONGRATULATIONS (low and far)
    [T.castle - 0.2, [34, Y + 30, 64], [0, Y + 4, 0], 40],               // the castle on its hill
  ].map(([t, p, q, f]) => ({ t, p: V(...p), q: V(...q), f }));
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const push = (s, u) => ({ p: s.p.clone().lerp(s.q, 0.03 * u), q: s.q.clone(), f: s.f });
    const next = SHOTS[i + 1];
    if (!b) return push(a, ease(k(t, a.t, DUR)));
    const dist = a.p.distanceTo(b.p), M = clamp(1.3 + dist / 25, 1.5, 2.3), gap = b.t - a.t, mv = Math.min(M, gap * 0.7), ts = b.t - mv;
    const A = push(a, ease(k(t, a.t, ts)));
    if (t < ts) return A;
    const u = ease(k(t, ts, b.t)), Bv = push(b, 0);
    const mid = A.p.clone().lerp(Bv.p, 0.5); mid.y += Math.min(6, dist * 0.12);      // a gentle arc, never through the ground
    const p = A.p.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.multiplyScalar(2 * u * (1 - u))).add(Bv.p.clone().multiplyScalar(u * u));
    return { p, q: A.q.clone().lerp(Bv.q, u), f: lerp(A.f, Bv.f, u) };
  }
  window.__camAt = camAt;
  function placeCam(t) {
    const C = camAt(t); C.p.y = Math.max(C.p.y, hAt(C.p.x, C.p.z) + 0.5);
    const sh = 0.025; C.p.add(V(B.n1(t * 0.6) * sh, B.n1(t * 0.5 + 3) * sh, B.n1(t * 0.4 + 7) * sh));
    cam.position.copy(C.p); cam.up.set(0, 1, 0); cam.lookAt(C.q); cam.fov = C.f; cam.near = 0.1; cam.far = 2000; cam.updateProjectionMatrix();
    B.POST.focus = C.p.distanceTo(C.q);
    const P = camAt(t - 1 / 30), aim = P.p.clone().add(P.q.clone().sub(P.p).normalize().multiplyScalar(C.p.distanceTo(C.q)));
    cam.updateMatrixWorld(); const s = aim.project(cam);
    if (s.z < 1) { const dx = s.x * W / 2, dy = -s.y * H / 2, L = Math.hypot(dx, dy); const m = Math.min(1, 45 / Math.max(L, 1e-3)); B.POST.mb = L > 10 ? [dx * m * 0.6, dy * m * 0.6] : [0, 0]; }
    return C;
  }

  // ---------- update
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion();
  function update(t) {
    sN = 0; fN = 0;
    const C = placeCam(t), cd = C.p.distanceTo(C.q);
    const span = clamp(cd * 0.9, 14, 90); sun.target.position.copy(C.q); sun.position.copy(C.q).add(SUN.clone().multiplyScalar(200));
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 20, far: 500 }); sun.shadow.camera.updateProjectionMatrix();
    Object.assign(B.POST, { aperture: t < T.enemies ? 0.12 : 0.35, maxBlur: 12, bloom: 0.35, thr: 1.15, sat: 1.15, con: 1.06, exp: 1.0 });
    // camp
    const campOn = t < T.stone; tent.visible = logs.visible = campOn;
    if (t < T.wall) fireAt(t, FIREP, 0.9, 1);
    // fence: rises stake by stake round the top, burns, falls
    const burn = sm(k(t, T.fire - 0.4, T.fire + 0.8)), gone = sm(k(t, T.wood, T.wood + 0.6));
    FENCEM.color.set(0xb08a68).lerp(new THREE.Color(0x1a1410), burn * 0.9);
    STAKES.forEach(([x, z], i) => { const t0 = T.fence0 + 0.15 + i * 0.011, u = eout(k(t, t0, t0 + 0.35)), sink = gone * (0.5 + 0.5 * hash(i)) * 4.5;
      M4.compose(V(x, TOPY - 4.6 * (1 - u) - sink, z), Q0.setFromAxisAngle(V(1, 0, 0), gone * (hash(i * 3) - 0.5) * 0.8), V(1, 1, 1)); fence.setMatrixAt(i, M4);
      if (burn > 0.05 && gone < 0.9 && i % 4 === 0) fireAt(t, V(x, TOPY + 1 + hash(i) * 2.5, z), 1.1 * burn, 1 - gone); });
    fence.instanceMatrix.needsUpdate = true; fence.visible = t > T.fence0 && gone < 0.99;
    if (gone > 0 && gone < 1) for (let i = 0; i < 6; i++) dust(t, T.wood + i * 0.08, V((i - 3) * 6, TOPY + 0.5, HW), 5, 3, 0x2a2420, 1.0, 3);
    // stone wall: rises in courses (a step every 1 m)
    const wu = k(t, T.stone - 0.25, T.wall + 0.35), course = Math.floor(wu * WH + 0.0001) + sm(((wu * WH) % 1) * 3) * 0;
    walls.forEach((m, i) => { const h = Math.max(0.01, Math.min(WH, Math.floor(wu * WH * 1.4 - i * 0.6) + 1)) * (wu > 0 ? 1 : 0); m.scale.y = Math.max(0.001, h / WH); m.visible = wu > 0; });
    lintel.visible = wu >= 1; if (wu > 0 && wu < 1) for (let i = 0; i < 4; i++) dust(t, T.stone + i * 0.25, V(-HW + i * 8, TOPY + 0.3, HW + 1.5), 5, 3, 0xe0d0b8, 0.9, 3);
    // the corner sags when they dig under it, the towers fix it
    const sag = sm(k(t, T.under - 0.1, T.under + 0.6)) * (1 - sm(k(t, T.towers - 0.2, T.towers + 0.3)));
    walls[1].rotation.z = 0; walls[4].position.y = TOPY - sag * 1.2; walls[4].rotation.z = sag * 0.06;
    if (sag > 0.02 && sag < 0.98) dust(t, T.under, V(HW, TOPY + 0.5, HW), 10, 3, 0xd8c8a8, 1.2, 3);
    // the moat: sides dug one after another, water rises
    lids.forEach((m, i) => { const t0 = T.dig + i * 0.4; m.visible = t < t0 + 0.2; if (t > t0 && t < t0 + 1.2) dust(t, t0, m.position.clone().add(V(0, 0.5, 0)), 9, 6, 0xb89a78, 1.1, 4); });
    const wl = sm(k(t, T.water - 0.3, T.water + 0.9)); moatW.visible = wl > 0.01; moatW.position.y = TOPY - MD + 0.2 + wl * (MD - 1.0);
    causeway.visible = t < T.bridge + 0.3;
    // ladders: lean on the wall; later two stand on the far bank of the moat and fall in
    LAD.forEach((l, i) => { const before = t < T.dig; if (before) { l.visible = t > T.ladders - 0.25 + i * 0.12; l.position.set(l.position.x, TOPY, HW + 2.2); l.rotation.set(-0.15, 0, 0); return; }
      if (i === 1) { l.visible = false; return; }
      const f = k(t, T.short - 0.1, T.short + 0.7); l.visible = t > T.short - 0.8 && t < T.archers + 0.5; l.position.set(l.position.x, TOPY, M1 + 0.4); l.rotation.set(-0.35 + f * f * 1.25, 0, 0); });
    if (t > T.fallin) [-7, 6].forEach((x, i) => drops(t, T.fallin + 0.1 + i * 0.1, V(x, TOPY - MD + 0.8, M1 - 1.8), V(0, 5, 0), 18, 1.0));
    // battlements pop up one by one; towers rise
    MER.forEach(([x, z], i) => { const t0 = T.teeth - 0.15 + (i % 24) * 0.035 + Math.floor(i / 24) * 0.02, u = eout(k(t, t0, t0 + 0.25));
      M4.compose(V(x, WY - 1.2 * (1 - u), z), Q0.setFromAxisAngle(V(0, 1, 0), (i % 24 < 12 ? 0 : Math.PI / 2)), V(1, u > 0 ? 1 : 0, 1)); mer.setMatrixAt(i, M4); });
    mer.instanceMatrix.needsUpdate = true; mer.visible = wu >= 1;
    TOWERS.forEach((tw, i) => { const t0 = T.towers - 0.25 + i * 0.25, u = eout(k(t, t0, t0 + 0.7)); tw.visible = u > 0; tw.position.y = TOPY - 10.5 * (1 - u);
      if (u > 0 && u < 1) dust(t, t0, V(tw.position.x, TOPY + 0.5, tw.position.z), 8, 4, 0xe0d0b8, 1.0, 3.5);
      const fl = tw.userData.flag, ph = t * 3 + i; fl.rotation.y = Math.sin(ph) * 0.25; fl.visible = t > T.cong2 - 0.3; });
    // arrows in flight
    ARW.forEach((A, i) => { const u = k(t, A.t0, A.t0 + 0.8), live = t > A.t0 && t < A.t0 + 2.5 && t < T.corners;
      const p = A.a.clone().lerp(A.b, u); p.y += Math.sin(u * Math.PI) * 3; const pn = A.a.clone().lerp(A.b, Math.min(1, u + 0.02)); pn.y += Math.sin(Math.min(1, u + 0.02) * Math.PI) * 3;
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), pn.sub(p).normalize()); M4.compose(p, q, live ? V(1, 1, 1) : V(0, 0, 0)); arrows.setMatrixAt(i, M4);
      if (u >= 1 && t < A.t0 + 1.0) dust(t, A.t0 + 0.8, A.b, 3, 0.4, 0xe0d0c0, 0.4, 0.5); });
    arrows.instanceMatrix.needsUpdate = true;
    // gate: the door shakes under the ram, splinters; the grill drops; the drawbridge lifts
    door.visible = wu >= 1; door.rotation.x = t > T.smash && t < T.grill ? -0.05 * Math.abs(Math.sin((t - T.smash) * 7)) : 0;
    if (t > T.smash && t < T.grill) for (let i = 0; i < 3; i++) dust(t, T.smash + i * 0.45, V(0, TOPY + 2, HW + 1.2), 6, 1.2, 0x8a6a48, 0.6, 0.8);
    const pg = eout(k(t, T.grill - 0.25, T.grill + 0.1)); port.visible = t > T.drop - 0.2; port.position.y = TOPY + 5.5 * (1 - pg);
    if (t > T.grill + 0.1 && t < T.grill + 1.2) dust(t, T.grill + 0.1, V(0, TOPY + 0.2, HW - 0.7), 8, 1.5, 0xd8c8a8, 0.9, 1.2);
    const db = eio(k(t, T.bridge + 0.3, T.bridge + 1.5)); dbr.visible = t > T.bridge - 0.3; dbr.rotation.x = -db * rad(84);
    ram.visible = t > T.gate - 0.8 && t < T.bridge + 0.6; { const z = ramZ(t) + 1.9, f = k(t, T.bridge + 0.3, T.bridge + 1.1); ram.position.set(0, (t < T.bridge + 0.3 ? hAt(0, z) : lerp(TOPY, TOPY - MD + 0.4, f * f)) + 1.0, z); }
    // boiling water
    const tip = sm(k(t, T.pour - 0.2, T.pour + 0.3)) * (1 - sm(k(t, T.close + 0.5, T.close + 1))); pot.visible = t > T.drop - 0.3 && t < T.keep0; pot.rotation.x = Math.PI - tip * 1.6;
    if (tip > 0.5) for (let i = 0; i < 6; i++) { drops(t, Math.floor(t * 10) / 10 - i * 0.08, V(0, WY + 1.4, HW + 1.0), V(0, 0.5, 2.2), 4, 1.0, 0xe8f4ff); const u = ((t * 0.6 + i / 6) % 1); puff(V((hash(i) - 0.5) * 3, TOPY + 0.5 + u * 6, HW + 3 + hash(i * 3) * 2), 0xffffff, 1.5 + u * 2.5, 0.45 * Math.sin(u * Math.PI)); }
    // the keep rises; the stair is pulled up
    const ku = eout(k(t, T.tower - 0.5, T.tower + 0.5)); keep.visible = ku > 0 || t > T.tower; keep.position.y = TOPY - 15.5 * (1 - ku);
    if (ku > 0 && ku < 1) dust(t, T.tower - 0.5, V(0, TOPY + 0.5, 3), 12, 5, 0xe0d0b8, 1.2, 4);
    const su = eio(k(t, T.high + 0.1, T.high + 1.1)); stair.visible = ku >= 1 || t > T.tower + 0.5; stair.rotation.x = su * rad(80);
    // gold sweeps ("it worked")
    const sweep = (t0, dur, a, b, w = 4, amt = 1.8) => { if (t < t0 || t > t0 + dur) return; const u = k(t, t0, t0 + dur); B.SWEEP.dir.set(0, 1, 0); B.SWEEP.pos = lerp(a, b, eio(u)); B.SWEEP.width = w; B.SWEEP.amt = amt * Math.sin(u * Math.PI); };
    sweep(T.cong1 - 0.1, 1.4, TOPY - 1, WY + 2); sweep(T.cong2 - 0.1, 1.4, TOPY - 1, TOPY + 12, 3, 1.0); sweep(T.end - 0.1, 1.8, TOPY - 1, TOPY + 17, 5);
    castUpdate(t);
    for (let i = sN; i < SPR.length; i++) SPR[i].visible = false;
    for (let i = fN; i < FIRE.length; i++) FIRE[i].visible = false;
  }

  // ---------- overlay: the idea sparkle, the fire glow, a light vignette
  function sparkle(t, t0, head) { const a = eout(k(t, t0, t0 + 0.2)) * (1 - sm(k(t, t0 + 0.9, t0 + 1.1))); if (a <= 0) return;
    const p = B.project(head); if (!p.ok) return;
    g.save(); g.translate(p.x, p.y - 30); const s = (0.6 + 0.4 * a) * (1 + 0.08 * Math.sin(t * 20)); g.scale(s, s); g.rotate(t * 1.5);
    g.globalAlpha = a; g.shadowColor = '#ffd23f'; g.shadowBlur = 30; g.fillStyle = '#fff6b0';
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 34, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); g.restore(); }
  function overlay(t) {
    B.vignette(0.14);
    sparkle(t, T.genius - 0.15, V(3, TOPY + 2.15, 6.5));
    sparkle(t, T.brain - 0.25, V(HW - 3, WY + 2.15, HW - 0.6));
    B.tint(sm(k(t, T.fire - 0.5, T.fire + 0.3)) * (1 - sm(k(t, T.wall - 0.2, T.wall + 0.3))) * 0.25, '#ff7a2a', 'soft-light');
  }

  B.run({ update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hook: the camp', 0, T.fence0], ['The fence burns', T.fence0, L0('wall')], ['The stone wall', L0('wall'), L0('ladder')], ['Ladders and the moat', L0('ladder'), L0('arrows')],
      ['Archers and battlements', L0('arrows'), L0('corner')], ['Towers', L0('corner'), L0('gate')], ['The gate', L0('gate'), T.keep0], ['The keep', T.keep0, T.end], ['Congratulations', T.end, DUR]],
    warm: [1, 15, 30, 45], ready: async () => { plant(); setupCast(); } });
})();
