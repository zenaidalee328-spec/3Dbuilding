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
  const SUN = V(0.6, 0.33, 0.73).normalize();                                     // warm, low sun (long shadows)
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', SUN, 32);
  B.fogColor.set(0xc9d2dc); scene.fog = new THREE.Fog(0xc9d2dc, 150, 950);
  { const sm2 = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(0x3f7cc8) }, hor: { value: new THREE.Color(0xe8dfd6) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.32)), 1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), sm2); sky.renderOrder = -1; scene.add(sky);
    for (let i = 0; i < 14; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
      const a = hash(i * 3.3) * 6.283; c.position.set(Math.cos(a) * 900, 220 + hash(i * 3) * 160, Math.sin(a) * 900); c.scale.set(260 + hash(i * 5) * 200, 70 + hash(i * 9) * 40, 1); scene.add(c); }
    const mm = new THREE.MeshStandardMaterial({ color: 0x8e9fb8, roughness: 1, envMapIntensity: 0.3 });   // far hazy mountains all round
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, r = 180 + 120 * hash(i * 7), h = 40 + 50 * hash(i * 2); const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), mm); m.position.set(Math.cos(a) * 820, h / 2 - 8, Math.sin(a) * 820); scene.add(m); } }
  const sun = new THREE.DirectionalLight(0xffd8aa, 3.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xc4d8ff, 0x5a5a38, 0.52); scene.add(hemi);   // round 3: lifts shadow areas
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.3); fill.position.set(-30, 25, 60); scene.add(fill);   // front fill: faces coming up the hill are not black
  // round 3: the sun sits at +x +z, so every -z face was nearly black - the burning fence, and the wall behind the
  // hero in the idea and Congratulations shots, all of which the camera looks at from -z. A soft warm fill from
  // behind the camera opens them up without touching the sun's shadows.
  // The sun sits low (19 deg) at +x +z, so a 4.9 m fence throws a ~14 m shadow over exactly the ground the camera
  // and the hero stand on: the whole fence beat was rendering at dusk. This fill carries the shadow side. It is
  // strong because it is only ever seen where the sun is blocked; lit faces already have the sun's 3.3 on them.
  const fillZ = new THREE.DirectionalLight(0xffe6cc, 1.0); fillZ.position.set(14, 22, -40); scene.add(fillZ);

  // grey castle stone: blocks in courses (made here), with the brick's bumps for relief
  const ASH = B.procTex(512, (u, v, i, j) => { const rows = 6, row = Math.floor(v * rows), off = row % 2 ? 0.5 / 3 : 0, cu = (u + off) * 3, col = Math.floor(cu);
    const fu = cu - col, fv = v * rows - row, edge = Math.min(fu * 1.4, (1 - fu) * 1.4, fv, 1 - fv), mort = edge < 0.05 ? 1 : 0;
    const sh = 0.82 + 0.2 * hash(row * 13 + col * 7 + 3) + 0.12 * (B.fbm(u, v, 16, 4) - 0.5);
    const l = mort ? 0.86 : sh * 0.97 + 0.03; return [226 * l, 217 * l, 200 * l, mort ? 0 : 0.5 + 0.5 * B.fbm(u * 2, v * 2, 16, 3)]; }, 3, [1, 1]);
  const BRICK = (rx, ry) => { const m = B.sweepify(new THREE.MeshStandardMaterial({ map: ASH.map.clone(), normalMap: ASH.normalMap.clone(), roughness: 0.9 }));
    [m.map, m.normalMap].forEach(tx => { tx.repeat.set(rx * 1.0, ry * 1.0); tx.needsUpdate = true; }); return m; };
  const WOOD = B.pbr('brown_planks_09', 1, 1, { color: 0xc8a888 });
  {
    const S = 420, N = 300, geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z), d = sq(x, z); p.setY(i, y);
      const m = B.fbm(x / 40 + 0.3, z / 40 + 0.1, 8, 3);
      const C3 = new THREE.Color().setHSL(lerp(0.2, 0.25, m), 0.6, lerp(0.28, 0.38, m));                     // painted meadow
      if (d < 14) C3.setHSL(0.08, 0.3, lerp(0.32, 0.39, m));                                                   // trampled dirt yard
      if (d > M0 - 0.4 && d < M1 + 0.4) C3.setHSL(0.068, 0.5, lerp(0.24, 0.33, m));                         // the ditch walls
      const cc = [C3.r, C3.g, C3.b];
      col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const tm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    tm.receiveShadow = true; scene.add(tm);
  }
  // the moat is hidden under a lid of grass until you dig it (four sides, one after another)
  const LIDM = new THREE.MeshStandardMaterial({ color: 0x55802e, roughness: 1 });
  const lids = [[0, -17, 38, 4], [17, 0, 4, 38], [0, 17, 38, 4], [-17, 0, 4, 38]].map(([x, z, w, d], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), LIDM); m.position.set(x, TOPY - 0.28, z); m.receiveShadow = true; scene.add(m); return m; });
  const moatW = new THREE.Mesh(new THREE.RingGeometry(M0 - 0.2, M1 + 0.4, 4, 1, Math.PI / 4), new THREE.MeshStandardMaterial({ color: 0x147c80, roughness: 0.2, envMapIntensity: 0.3, transparent: true, opacity: 0.94 }));
  moatW.rotation.x = -Math.PI / 2; moatW.scale.set(1.414 * 0.99, 1.414 * 0.99, 1); scene.add(moatW);
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(4.4, MD + 0.3, M1 - M0 + 0.6), new THREE.MeshStandardMaterial({ map: B.tex('dry_ground_01', 1, 1), color: 0xc8a888, roughness: 1 }));
  causeway.position.set(0, TOPY - (MD + 0.3) / 2, (M0 + M1) / 2); causeway.receiveShadow = causeway.castShadow = true; scene.add(causeway);

  // ---------- the camp: a tent and a fire
  const tent = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.3, 4), new THREE.MeshStandardMaterial({ color: 0xa08a68, roughness: 0.95 }));
  tent.rotation.set(0, 0.6, 0); tent.position.set(-1.5, TOPY + 1.15, -1.5); tent.castShadow = true; scene.add(tent);
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
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), IRON); pot.position.set(0, TOPY + WH + 0.75, HW + 0.1); pot.rotation.x = Math.PI; pot.castShadow = true; scene.add(pot);
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
    grassSet.visible = fernSet.visible = false; scatter(rockSet, 6, 24, 60, 0.6, 1.2, 37);
    blades();
    // trees: layered cypresses and round trees on the lower slope and plain
    const cy = [], ro = [];
    for (let i = 0; i < 500; i++) { const a = hash(i * 4.1) * 6.283, r = 40 + 160 * Math.sqrt(hash(i * 8.3)), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 20 && Math.abs(x) < 20 && r < 90) continue; (hash(i * 2.2) < 0.5 ? cy : ro).push([x, hAt(x, z), z, 0.8 + 0.6 * hash(i * 9.1)]); }
    const leaf = c2 => new THREE.MeshStandardMaterial({ color: c2, roughness: 0.85 });
    const tc = new THREE.Color();
    const put = (geo, mat, list, vary) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, s], i) => { M.compose(V(x, y - 0.2, z), q.setFromAxisAngle(V(0, 1, 0), s * 9), V(s, s * (0.85 + 0.35 * hash(i * 1.7)), s)); im.setMatrixAt(i, M);
      if (vary) im.setColorAt(i, tc.setHSL(0.2 + 0.09 * hash(i * 5.3), 0.45 + 0.2 * hash(i * 2.9), 0.32 + 0.16 * hash(i * 7.7))); }); im.castShadow = true; scene.add(im); };
    const cyG = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(Math.max(0.02, 1.4 * Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62 + 0.25), 1.4) * (1 - u * 0.75)), u * 8)); }
      const g = new THREE.LatheGeometry(pts, 20); g.translate(0, 1.4, 0); return g; })(); const roG = new THREE.IcosahedronGeometry(2.6, 4); roG.translate(0, 4.2, 0);
    const trG = new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6); trG.translate(0, 1.2, 0);
    { const p = roG.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i) - 4.2, p.getZ(i)), n = 1 + 0.18 * (B.fbm(v.x * 0.3 + 3, v.z * 0.3 + v.y * 0.2, 4, 3) - 0.5) * 2; p.setXYZ(i, v.x * n, v.y * n * 0.85 + 4.2, v.z * n); } roG.computeVertexNormals(); }
    put(cyG, leaf(0x557a3a), cy, true); put(roG, leaf(0x6a8f3c), ro, true);   // each tree its own green
    put(trG, leaf(0x5a4232), cy.concat(ro));
  }

  function blades() {
    const blade = (() => { const g = new THREE.PlaneGeometry(0.05, 0.36, 1, 4); g.translate(0, 0.18, 0); const p = g.attributes.position, cl = [];
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36; p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.08); cl.push(0.35 + 0.65 * y, 0.35 + 0.65 * y, 0.35 + 0.65 * y); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.computeVertexNormals(); return g; })();
    const GM = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    // round 3: the hilltop itself used to be bare dirt (nothing was planted inside d 14.4), so every shot on top
    // had an empty beige bottom half. The reference always keeps grass and flowers in the frame, so the top is
    // planted too now, minus the wall footprint (d 10.8-13.4) and the pad the keep comes up through.
    const onTop = (x, z) => sq(x, z) < 10.8 && !(Math.abs(x) < 4.8 && Math.abs(z + 1) < 4.8);
    const ok = (x, z) => { const d = sq(x, z); if (d < 14.4) return onTop(x, z);
      return !(d > M0 - 0.6 && d < M1 + 0.6) && !(Math.abs(x) < 2.6 && z > HW && z < M1 + 1); };
    const put = (geo, mat, n, rmin, rmax, seed, sc, col) => { const im = new THREE.InstancedMesh(geo, mat, n); let c = 0;
      for (let i = 0; c < n && i < n * 4; i++) { const a = hash(seed + i * 1.37) * 6.283, r = rmin + (rmax - rmin) * Math.pow(hash(seed + i * 2.11), 1.5), x = Math.cos(a) * r, z = Math.sin(a) * r; if (!ok(x, z)) continue;
        q.setFromEuler(e.set((hash(i * 3) - 0.5) * 0.5, hash(i * 5) * 6.28, (hash(i * 7) - 0.5) * 0.5)); const k2 = sc(i); M.compose(V(x, hAt(x, z), z), q, V(k2, k2 * (0.7 + hash(i * 11) * 0.9), k2)); im.setMatrixAt(c, M);
        if (col) im.setColorAt(c, col(i, cc)); c++; }
      im.count = c; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; };
    put(blade, GM, 200000, 13, 60, 11, () => 1.1, (i, c) => c.setHSL(0.22 + 0.06 * hash(i * 13), 0.55, 0.32 + 0.12 * hash(i * 17)));
    // the hilltop: shorter, slightly drier grass than the meadow outside, so the fort still reads as trodden ground
    put(blade, GM, 60000, 0, 11, 53, () => 0.8, (i, c) => c.setHSL(0.21 + 0.05 * hash(i * 13), 0.42, 0.33 + 0.1 * hash(i * 17)));
    put(blade, GM, 80000, 55, 140, 77, () => 1.8, (i, c) => c.setHSL(0.22 + 0.05 * hash(i * 13), 0.5, 0.32 + 0.1 * hash(i * 17)));
    const FL = [0xffffff, 0xfff1a8, 0xffc8e0, 0xffffff];
    put(new THREE.IcosahedronGeometry(0.04, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 7000, 15, 55, 33, () => 1, (i, c) => c.set(FL[i % 4])).position.y = 0.34;
  }
  // ---------- sprites: dust, drops, fire, steam (a fixed pool; each a pure function of t)
  const mkPool = (n, add) => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); return s; });
  const SPR = mkPool(600, false), FIRE = mkPool(420, true); let sN = 0, fN = 0;
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
  const arrowG = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5); arrowG.rotateX(Math.PI / 2);   // thick + light so they read on a phone
  const arrows = new THREE.InstancedMesh(arrowG, new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x3a3020 }), ARW.length); arrows.frustumCulled = false; scene.add(arrows);

  // ---------- people (Mixamo): one model cloned into a cast; each clone plays any role
  const MX = window.MIXAMO || { model: 'Walking.fbx', files: [] };
  const pick = (...names) => names.find(n => MX.files.includes(n + '.fbx')) || null;
  const ROLE = { walk: pick('Walking'), run: pick('Running', 'Fast Run', 'Walking'), idle: pick('Idle', 'Breathing Idle', 'Nervously Look Around'), look: pick('Nervously Look Around', 'Idle'),
    sleep: pick('Sleeping Idle', 'Laying Idle'), wake: pick('Getting Up'), cheer: pick('Cheering', 'Victory', 'Flailing Arms'), climb: pick('Climbing Ladder', 'Climbing', 'Pull Heavy Object'),
    dig: pick('Digging', 'Pull Heavy Object'), fall: pick('Falling', 'Falling Back Death', 'Flailing Arms'), swim: pick('Treading Water'), scared: pick('Terrified'), shoot: pick('Standing Draw Arrow', 'Archer', 'Nervously Look Around'),
    carry: pick('Carrying', 'Walking'), push: pick('Pushing', 'Pull Heavy Object'), point: pick('Pointing', 'Nervously Look Around'), think: pick('Breathing Idle', 'Idle'), torch: pick('Walking') };
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
  // 1) the camp: you asleep by the fire; enemies creep up the hill, their torches flare on the word "enemies"
  add(-1, T.fence0 + 0.1, on(2.6, TOPY + 0.05, 2.2, 250), t => t < T.sleep - 0.3 ? [['sleep', t, 1]] : [['wake', (t - T.sleep + 0.3) * 1.3, 1]], HERO);
  const foePos = (i, t) => { const a = rad(72 + i * 4.5), r = lerp(31 + (i % 3) * 2.5, 22, k(t, 0, T.fire - 0.5)) - (i % 2) * 2; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const THROW = i => T.fire - 0.5 + i * 0.04;
  for (let i = 0; i < 9; i++) add(-1, T.wall, t => { const [x, z] = foePos(i, t); return [x, hAt(x, z), z, 180 + 90 - (72 + i * 4.5)]; },
    t => t < T.fire - 0.5 ? [['walk', t * 0.8 + i * 0.4, 1]] : [['point', t + i * 0.3, 1]], Object.assign({ torch: true, torchT: T.enemies - 0.1, throwT: THROW(i) }, FOE));
  // 2) the fence: you run over and build it; it burns, you back off scared, then the idea (standing, thinking)
  const FX0 = 3, FZ = HW - 1.3;
  add(T.fence0 + 0.1, T.cong1 + 2.4, t => {
    if (t < T.fence + 0.3) { const u = k(t, T.fence0 + 0.1, T.fence + 0.3); return [lerp(2.6, FX0, u), TOPY, lerp(2.2, FZ, u), 0]; }
    // the idea camera now sits on the -z side (round 3), so he turns only the last 20 deg to face it instead of
    // swinging 200 deg round to the old +z camera.
    const u = eio(k(t, T.fire - 0.3, T.genius - 0.5)), turn = eio(k(t, T.genius - 0.7, T.genius - 0.3)); return [FX0, TOPY, lerp(FZ, 3.2, u), 160 + 20 * turn]; },
  t => t < T.fence + 0.3 ? [['run', t * 1.3, 1]] : t < T.fire - 0.3 ? [['push', t, 1]] : t < T.genius - 0.5 ? [['scared', t, 1]] : t < T.cong1 - 0.1 ? [['think', t - T.genius + 0.5, 1]] : [['cheer', t - T.cong1, 1]], HERO);
  // 3) the fort: you cheer on the wall, friends too (only once the wall is up: nobody floats)
  const WUP = T.wall + 0.4;
  // round 3: they cheer on the +z wall, the one the Congratulations shot looks at, facing the camera (180).
  // They used to stand on the -z wall, which the new low shot has behind the lens.
  add(WUP, T.ladders, on(-0.5, WY, HW - 0.6, 180), t => [['cheer', t - T.cong1, 1]], ally(5));
  [[-3.6, 1], [2.4, 2]].forEach(([x, j]) => add(WUP, T.top + 0.3, on(x, WY, HW - 0.6, 180), t => [['cheer', t - T.cong1 + j * 0.6, 1]], ally(j)));
  // 4) ladders: three climbers
  [-7, -1.2, 6].forEach((x, i) => add(T.ladders - 0.2, T.dig + 0.2, t => { const u = k(t, T.ladders + 0.2 + i * 0.25, T.top + 0.4); return [x, TOPY + u * 6.2, HW + 2.0 - u * 0.9, 180]; },
    loop('climb', i * 0.5, 1.1), FOE));
  // 5) the moat: your diggers dig it; then the ladders on the far bank are too short, slide in, the climbers fall in and paddle
  [-6, 0, 5].forEach((x, i) => add(T.dig - 0.3, T.water + 0.2, on(x, TOPY, M1 + 1.0, 180), loop('dig', i * 0.5, 1.2), ally(i + 3)));
  const WATER = TOPY - 0.8, SWIM = WATER - 1.35;                     // the water top; where a treading body stands
  const ladPose = (x, t) => { const f = eio(k(t, T.fallin - 0.35, T.fallin + 0.35)); return { p: V(x, lerp(TOPY, WATER - 1.6, f), lerp(M1 + 1.5, M1 - 1.2, f)), r: lerp(-0.32, 0.35, f) }; };
  [-7, 6].forEach((x, i) => add(T.short - 0.9, T.archers + 0.2, t => {
    const L = ladPose(x, t), s = lerp(1.2, 5.6, k(t, T.short - 0.9, T.short + 0.4)), on1 = V(x, L.p.y + Math.cos(L.r) * s, L.p.z + Math.sin(L.r) * s + 0.35);
    if (t < T.fallin - 0.15) return [on1.x, on1.y - 1.0, on1.z, 180];
    const f = k(t, T.fallin - 0.15, T.fallin + 0.35); return [x, lerp(on1.y - 1.0, SWIM, f * f), lerp(on1.z, M1 - 1.6, f), 180]; },
    t => t < T.short + 0.4 ? [['climb', t * 1.1 + i, 1]] : t < T.fallin + 0.3 ? [['fall', (t - T.short) * 1.2, 1]] : [['swim', t, 1]], FOE));
  // 6) archers on the slope shoot; a guard on the wall falls back; then guards duck behind the teeth
  for (let i = 0; i < 5; i++) { const x = -8 + i * 4; add(T.archers - 0.8, T.corners, at(x, 33 + (i % 2) * 1.5, 180), loop('shoot', i * 0.3), FOE); }
  add(T.archers - 0.8, T.teeth + 0.4, t => { const f = k(t, T.off - 0.1, T.off + 0.5); return [2, WY - f * f * 7, HW - 0.4 - f * 2.2, 0]; }, t => t < T.off - 0.1 ? [['look', t, 1]] : [['fall', t - T.off, 1]], ally(0));
  [[-5.05, 1], [3.03, 2], [-9.08, 4]].forEach(([x, j]) => add(T.teeth - 0.2, T.corners, t => [x, WY - 0.5 * sm(k(t, T.hide - 0.4, T.hide + 0.1)), HW - 0.9, 0], t => t < T.hide - 0.3 ? [['look', t + j, 1]] : [['scared', t + j, 1]], ally(j)));
  // 7) diggers at the front-right corner (dirt flies, see update)
  const DIGC = [[HW + 1.6, HW + 0.6, 220], [HW + 0.8, HW + 1.8, 200]];
  DIGC.forEach(([x, z, hd], i) => add(T.corners - 0.6, T.towers + 0.2, on(x, TOPY, z, hd), loop('dig', i * 0.6, 1.2), FOE));
  // 8) the idea (standing on the wall above the diggers), the towers, the cheering
  add(T.corners - 0.6, T.cong2 + 2.2, on(HW - 3, WY, HW - 0.6, 20), t => t < T.under + 0.3 ? [['look', t, 1]] : t < T.cong2 - 0.2 ? [['think', t - T.under, 1]] : [['cheer', t - T.cong2, 1]], HERO);
  [[HW - 0.8, HW + 1.8], [-HW + 0.6, HW + 1.6]].forEach(([x, z], j) => add(T.cong2 - 0.4, T.gate, on(x, TOPY + 10, z - 1.2, 30), t => [['cheer', t - T.cong2 + j * 0.7, 1]], ally(j + 2)));
  [[HW - 1.2, HW - 4.5, 90], [HW - 1.2, HW - 7.5, 90], [5, HW - 0.6, 0]].forEach(([x, z, hd], j) => add(T.cong2 - 0.4, T.gate, on(x, WY, z, hd), t => [['cheer', t - T.cong2 + j * 0.5, 1]], ally(j + 4)));
  // 9) the ram: four men carry the log at the gate (over the causeway); it hits the door; the drawbridge tips them off
  const gY = (x, z) => Math.abs(x) < 2.3 && z > HW && z < M1 + 1 ? TOPY : hAt(x, z);   // causeway + drawbridge top
  const RAMHIT = HW + 2.5;                                            // the log's nose touches the door here
  const ramZ = t => t < T.smash ? lerp(34, RAMHIT, eio(k(t, T.gate - 0.6, T.smash))) : RAMHIT + 0.9 * Math.abs(Math.sin((t - T.smash) * 7)) * (t < T.grill ? 1 : 0);
  for (let i = 0; i < 4; i++) { const sx = i % 2 ? 0.6 : -0.6, dz = Math.floor(i / 2) * 2.2 + 0.8;
    add(T.gate - 0.8, T.boiling + 2.5, t => { if (t < T.bridge + 0.3) { const z = ramZ(t) + dz; return [sx, gY(sx, z), z, 180]; }
      const f = k(t, T.bridge + 0.3, T.bridge + 1.1), z = RAMHIT + dz + f * 1.5; return [sx * (1 + f), lerp(TOPY, SWIM, f * f), Math.min(z, M1 - 0.5), 180]; },
      t => t < T.smash ? [['run', t * 1.3 + i, 1]] : t < T.bridge + 0.3 ? [['push', t * 1.5 + i, 1]] : t < T.bridge + 1.1 ? [['fall', t - T.bridge, 1]] : [['swim', t + i, 1]], FOE); }
  // 10) boiling water: a defender behind the pot tips it out over the gate; the next attackers on the bank run off
  add(T.drop - 0.3, T.keep0, on(0.6, WY, HW - 0.7, 0), loop('push', 0.2), ally(1));
  for (let i = 0; i < 4; i++) { const x = -3 + i * 2; add(T.pour - 0.4, T.keep0 + 0.6, t => { const run = Math.max(0, t - T.boiling - 0.2), z = M1 + 1.5 + i * 0.8 + run * 3.2; return [x + run * (i - 1.5) * 0.4, hAt(x, z), z, run > 0 ? 0 : 180]; },
    t => t < T.boiling + 0.2 ? [['look', t + i, 1]] : [['run', t * 1.4 + i, 1]], FOE); }
  // 11) they break in through the gate; everyone runs up the stair into the keep
  for (let i = 0; i < 4; i++) { const sx = -1.2 + i * 0.8; add(T.breakin - 0.2, T.door + 0.5, t => { const u = k(t, T.breakin - 0.1 + i * 0.15, T.runs + 1.6 + i * 0.15), z = lerp(HW + 7.5, HW - 6, u); return [sx * (1 + 1.5 * k(z, HW, HW - 6)), z > HW + 1 ? TOPY : TOPY, z, 180]; },
    t => [['run', t * 1.4 + i, 1]], FOE); }
  for (let i = 0; i < 8; i++) { const a = rad(20 + i * 18), r = 9, sx = Math.cos(a) * r * (i % 2 ? 1 : -1), sz = 3 + Math.sin(a) * 5; const t0 = T.breakin + i * 0.12, t1 = T.door + i * 0.1;
    add(T.keep0 - 0.3, t1 + 0.05, t => { const u = k(t, t0, t1); if (u < 0.75) { const v = u / 0.75; return [lerp(sx, 0, v), TOPY, lerp(sz, 9.2, v), Math.atan2(-sx, 9.2 - sz) * 180 / Math.PI]; }
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
      P.torch.visible = !!lk.torch && !(lk.throwT && t > lk.throwT);          // the torch leaves the hand when it is thrown
      if (P.torch.visible) { const lit = lk.torchT == null ? 1 : sm(k(t, lk.torchT, lk.torchT + 0.25)); if (lit > 0) { const flare = 1 + 0.8 * Math.max(0, 1 - Math.abs(t - lk.torchT - 0.25) * 2.5);
        const wp = new THREE.Vector3(); P.torch.getWorldPosition(wp); fireAt(t, wp.add(V(0, 0.35, 0)), 0.5 * flare, 0.95 * lit); } }
    }
    Object.entries(pools).forEach(([kk, pl]) => { for (let i = used[kk]; i < pl.length; i++) pl[i].holder.visible = false; });
  }

  // ---------- the camera: shots [arrive t, camera, target, fov]. It holds (a slow 3% push) and moves only between shots,
  // over 1.1-1.8 s with a soft start and stop.
  const Y = TOPY;
  // round 2: fewer, closer shots (no 50 m flights), no shot inside a wall, grill + drawbridge in one 3/4 shot
  const SHOTS = [
    [0.0, [3.6, Y + 1.8, -3.5], [1.2, Y + 0.3, 8], 46],                  // asleep by the fire; torches on the slope behind
    // round 3: this sat 11 m off the fence aiming level at it, so the fence filled the middle, the pale horizon was
    // hidden behind it and the frame was half deep-zenith sky over ground in the fence's own shadow (mean 41/255).
    // Back to the middle of the hilltop (inside d 7, where clearance stops lifting the camera over the wall line)
    // and aiming slightly down: lit grass in front, the fence across the middle third, low pale sky above.
    [T.fence + 0.4, [7, Y + 2.6, -6.5], [2.6, Y + 1.3, 9], 46],                // you build the fence; torches + fire arrows fly over it
    // round 3: the idea beat used to sit on the far side of the hilltop looking back, so the camera had to swing
    // 148 deg in 1.6 s (peak 269 px/f, the "too sharp" feeling). It now backs off and keeps looking the same way
    // as the fire shot: a 10 deg turn over 6 m. The wall still rises behind the hero, the reference way.
    [T.genius - 0.6, [5, Y + 1.6, -5], [2.4, Y + 2.2, 4], 50],            // the idea, hero framed against the rising wall
    [T.cong1 + 0.9, [8, Y + 0.3, -9], [2.4, Y + 5.5, 3], 50],             // CONGRATULATIONS 1: low, looking up, hero small / wall big
    [T.ladders - 0.15, [-12, Y + 1.8, 24], [-2, Y + 3, HW + 3], 44, 'cut'],   // hard cut on "But": outside, the ladders
    [T.short - 0.4, [-11, Y + 1.4, 26], [-6, Y + 1.5, 16.5], 42],         // the ladder stops short of the wall, slides in
    [T.archers - 0.1, [5.4, hAt(5.4, 37.2) + 1.9, 37.2], [1, WY - 0.5, HW + 1], 44], // over an archer's shoulder
    [T.teeth - 0.1, [5, WY + 2.2, 21], [1, WY + 0.6, HW + 0.5], 42],     // stone teeth along the top
    [T.corners + 0.3, [19, Y + 3.5, 21], [HW - 1, Y + 5.5, HW], 46],     // diggers at the corner + you on the wall above
    [T.towers - 0.1, [26, Y + 6, 30], [0, Y + 6, 0], 44],                // round towers rise
    [T.cong2, [20, Y + 0.5, 26], [6, Y + 8, 6], 48],                   // CONGRATULATIONS (low, up at a tower)
    [T.gate - 0.2, [4, Y + 1.6, 30], [0, Y + 2.5, HW + 2], 44],          // the gate, the ram coming
    [T.grill - 0.4, [8.5, Y + 2.4, 24], [0, Y + 2.4, HW + 1], 46],       // 3/4: the door breaks, the grill drops, the bridge lifts
    [T.pour - 0.4, [14, Y + 1.5, 22], [0, WY - 0.5, HW + 1], 46],       // over the defender's shoulder: the pot tips onto the bank
    [T.breakin - 0.3, [0.5, Y + 16, 27], [0, Y + 1, 4], 50],              // one high 3/4 shot: they pour in, everyone runs to the keep
    [T.door - 0.2, [4.5, Y + 2.0, 8.8], [0, Y + 6, 2.5], 55],             // the keep rises, its door high (inside, low)
    [T.castle, [16, Y + 10, 52], [0, Y + 5, 0], 42],               // rising a little on the castle
  ].map(([t, p, q, f, cut]) => ({ t, p: V(...p), q: V(...q), f, cut: !!cut }));
  // Quintic smootherstep: speed AND acceleration are zero at both ends, so a move never jerks as it starts or
  // stops. The raised cosine this replaces stepped the acceleration at the ends, which was accel_p99 12.6 (max 9).
  const ease = x => { const u = clamp(x); return u * u * u * (u * (u * 6 - 15) + 10); };
  // what stands where at time t (the camera must stay out of it)
  const WALL0 = c('wall', 'replace'), wuAt = t => k(t, WALL0, T.wall + 0.35), goneAt = t => sm(k(t, T.wood, T.wood + 0.6)), kuAt = t => eout(k(t, T.tower - 0.5, T.tower + 0.5));
  function clearance(p, t) {
    const fenceH = t > T.fence0 ? 4.9 * (1 - goneAt(t)) : 0, wallH = wuAt(t) > 0 ? WH * clamp(wuAt(t) * 1.4) + (t > T.teeth ? 1.2 : 0) : 0, h = Math.max(fenceH, wallH);
    const ax = Math.abs(p.x), az = Math.abs(p.z);
    if (h > 0 && Math.min(ax, az) < HW + 3.5) { const d = Math.abs(Math.max(ax, az) - HW); p.y = Math.max(p.y, TOPY + h + 0.9 - Math.max(0, d - 1.4) * 3); }
    if (t > T.towers - 0.25) { const rd = Math.hypot(ax - HW, az - HW) - 3.4; p.y = Math.max(p.y, TOPY + 14 - Math.max(0, rd - 0.4) * 3); }
    const ku = kuAt(t); if (ku > 0) { const bx = Math.max(0, ax - 4), bz = Math.max(0, Math.abs(p.z + 1) - 4), bd = Math.hypot(bx, bz); p.y = Math.max(p.y, TOPY + 15.5 * ku + 1 - Math.max(0, bd - 0.4) * 3); }
    p.y = Math.max(p.y, hAt(p.x, p.z) + 0.5);
    return p;
  }
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const push = (s, u) => ({ p: s.p.clone().lerp(s.q, 0.03 * u), q: s.q.clone(), f: s.f });
    if (!b) { const R = push(a, ease(k(t, a.t, DUR))); clearance(R.p, t); return R; }
    if (b.cut) { const R = push(a, ease(k(t, a.t, b.t))); clearance(R.p, t); return R; }   // a hard cut: hold, then jump on b.t
    // How long a move takes: the distance AND the turn decide it. The turn is what the eye actually sees, so a
    // move that swings the aim needs the time a move that only slides does not (42 deg of turn buys as much time
    // as 18 m of travel). Reference moves last 1.2-2.7 s, so that stays the range.
    const dist = a.p.distanceTo(b.p);
    const dirA = a.q.clone().sub(a.p).normalize(), dirB = b.q.clone().sub(b.p).normalize();
    const turn = Math.acos(clamp(dirA.dot(dirB), -1, 1)) * 180 / Math.PI;
    const M = clamp(Math.max(1.3 + dist / 18, 1.1 + turn / 42), 1.5, 2.8), gap = b.t - a.t, mv = Math.min(M, gap * 0.75), ts = b.t - mv;
    const A = push(a, ease(k(t, a.t, ts)));
    if (t < ts) { clearance(A.p, t); return A; }
    const u = ease(k(t, ts, b.t)), Bv = push(b, 0);
    const mid = A.p.clone().lerp(Bv.p, 0.5); mid.y += Math.min(6, dist * 0.12);      // a gentle arc, never through the ground
    const inside = P => Math.max(Math.abs(P.x), Math.abs(P.z)) < HW; if (inside(A.p) !== inside(Bv.p) && wuAt(t) > 0) mid.y = Math.max(mid.y, TOPY + WH + 7);   // in <-> out: crane well over the wall
    const p = A.p.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.multiplyScalar(2 * u * (1 - u))).add(Bv.p.clone().multiplyScalar(u * u));
    return { p: clearance(p, t), q: A.q.clone().lerp(Bv.q, u), f: lerp(A.f, Bv.f, u) };
  }
  window.__camAt = camAt;
  function placeCam(t) {
    const C = camAt(t);
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
    Object.assign(B.POST, { aperture: t < T.enemies ? 0.12 : 0.25, maxBlur: 10, bloom: 0.18, thr: 1.3, sat: 1.08, con: 1.12, exp: 0.95, ao: 1.2, aoR: 0.9 });
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
    for (let i = 0; i < 9; i++) { const t0 = THROW(i), u = k(t, t0, t0 + 0.55); if (t > t0 && u < 1) { const [fx, fz] = foePos(i, t0), a = V(fx, hAt(fx, fz) + 2, fz), b = V(fx * 0.6, TOPY + 3.2, HW - 0.3);
        const p = a.lerp(b, u); p.y += Math.sin(u * Math.PI) * 3; fireAt(t, p, 0.7, 1); } }                       // thrown torches
    for (let j = 0; j < 10; j++) { const t0 = T.fire - 0.75 + j * 0.06, u = k(t, t0, t0 + 0.45); if (t > t0 && u < 1) { const [fx, fz] = foePos(j % 9, t0), a = V(fx, hAt(fx, fz) + 1.6, fz), b = V(-4 + j * 1.6, TOPY + 2.5 + hash(j) * 2, HW - 0.2);
        const p = a.lerp(b, u); p.y += Math.sin(u * Math.PI) * 2; flame(p, 0.45, 1); puff(p.clone().add(V(0, 0, 0.6)), 0xffb060, 0.3, 0.5); } }  // fire arrows
    if (gone > 0 && gone < 1) for (let i = 0; i < 6; i++) dust(t, T.wood + i * 0.08, V((i - 3) * 6, TOPY + 0.5, HW), 5, 3, 0x2a2420, 1.0, 3);
    // stone wall: rises in courses (a step every 1 m)
    const wu = wuAt(t), course = Math.floor(wu * WH + 0.0001) + sm(((wu * WH) % 1) * 3) * 0;
    walls.forEach((m, i) => { const h = Math.max(0.01, Math.min(WH, (Math.floor(wu * WH * 2) + 1) * 0.5)); /* all sides together, one 0.5 m course at a time */ m.scale.y = Math.max(0.001, h / WH); m.visible = wu > 0; });
    lintel.visible = wu >= 1; if (wu > 0 && wu < 1) for (let i = 0; i < 4; i++) dust(t, T.stone + i * 0.25, V(-HW + i * 8, TOPY + 0.3, HW + 1.5), 5, 3, 0xe0d0b8, 0.9, 3);
    // the corner sags when they dig under it, the towers fix it
    const sag = sm(k(t, T.under - 0.1, T.under + 0.6)) * (1 - sm(k(t, T.towers - 0.2, T.towers + 0.3)));
    walls[1].rotation.z = 0; walls[4].position.y = TOPY - sag * 1.2; walls[4].rotation.z = sag * 0.06;
    if (t > T.corners - 0.5 && t < T.towers) DIGC.forEach(([x, z], i) => { const t0 = Math.floor((t + i * 0.3) / 0.6) * 0.6 - i * 0.3; dust(t, t0, V(x + 0.6, TOPY + 0.2, z + 0.6), 6, 1.2, 0x8a6a48, 0.6, 0.7); drops(t, t0, V(x, TOPY + 0.8, z + 0.5), V(1.5, 3, 1), 6, 0.6, 0x7a5a3a); });
    if (sag > 0.02 && sag < 0.98) dust(t, T.under, V(HW, TOPY + 0.5, HW), 10, 3, 0xd8c8a8, 1.2, 3);
    // the moat: sides dug one after another, water rises
    lids.forEach((m, i) => { const t0 = T.dig + i * 0.4; m.visible = t < t0 + 0.2; if (t > t0 && t < t0 + 1.2) dust(t, t0, m.position.clone().add(V(0, 0.5, 0)), 9, 6, 0xb89a78, 1.1, 4); });
    const wl = sm(k(t, T.water - 0.3, T.water + 0.9)); moatW.visible = wl > 0.01; moatW.position.y = TOPY - MD + 0.2 + wl * (MD - 1.0);
    causeway.visible = t < T.bridge + 0.3;
    // ladders: lean on the wall; later two stand on the far bank of the moat and fall in
    LAD.forEach((l, i) => { const before = t < T.dig; if (before) { l.visible = t > T.ladders - 0.25 + i * 0.12; l.position.set(l.position.x, TOPY, HW + 2.2); l.rotation.set(-0.15, 0, 0); return; }
      if (i === 1) { l.visible = false; return; }
      const L = ladPose(l.position.x, t); l.visible = t > T.short - 1.0 && t < T.archers + 0.5; l.position.copy(L.p); l.rotation.set(L.r, 0, 0); });
    if (t > T.fallin) [-7, 6].forEach((x, i) => { drops(t, T.fallin + 0.1 + i * 0.1, V(x, WATER, M1 - 1.6), V(0, 5, 0), 22, 1.0); dust(t, T.fallin + 0.1 + i * 0.1, V(x, WATER, M1 - 1.6), 8, 1.6, 0xffffff, 0.8, 1.2); });
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
    const BREAK = T.smash + 3 * Math.PI / 7;                                  // the 4th hit: the door bursts
    door.visible = wu >= 1 && t < BREAK; door.rotation.x = t > T.smash ? -0.08 * Math.abs(Math.sin((t - T.smash) * 7)) : 0;
    if (t > T.smash && t < T.grill) for (let i = 0; i < 4; i++) dust(t, T.smash + i * Math.PI / 7, V(0, TOPY + 1.2, HW + 1.0), 10, 1.6, 0x8a6a48, 0.6, 1.0);
    if (t > BREAK) { dust(t, BREAK, V(0, TOPY + 2, HW + 0.4), 18, 3, 0x6a4a30, 1.0, 1.4); drops(t, BREAK, V(0, TOPY + 2, HW + 0.6), V(0, 4, -3), 24, 1.0, 0x8a6a48); }
    const pg = eout(k(t, T.grill - 0.25, T.grill + 0.1)) * (1 - eio(k(t, T.breakin - 0.6, T.breakin))); port.visible = t > T.drop - 0.2; port.position.y = TOPY + 5.5 * (1 - pg);
    if (t > T.grill + 0.1 && t < T.grill + 1.2) dust(t, T.grill + 0.1, V(0, TOPY + 0.2, HW - 0.7), 8, 1.5, 0xd8c8a8, 0.9, 1.2);
    const db = eio(k(t, T.bridge + 0.3, T.bridge + 1.5)) * (1 - eio(k(t, T.breakin - 0.6, T.breakin))); dbr.visible = t > T.bridge - 0.3; dbr.rotation.x = -db * rad(84);
    ram.visible = t > T.gate - 0.8 && t < T.bridge + 0.6; { const z = ramZ(t) + 1.9, f = k(t, T.bridge + 0.3, T.bridge + 1.1); ram.position.set(0, (t < T.bridge + 0.3 ? gY(0, z) + 1.0 : lerp(TOPY + 1.0, WATER - 0.1, f * f)), z); }
    // boiling water
    const tip = sm(k(t, T.pour - 0.2, T.pour + 0.3)) * (1 - sm(k(t, T.close + 0.5, T.close + 1))); pot.visible = t > T.drop - 0.3 && t < T.keep0; pot.rotation.x = Math.PI - tip * 1.6;
    if (tip > 0.5) for (let i = 0; i < 6; i++) { drops(t, Math.floor(t * 10) / 10 - i * 0.08, V(0, WY + 0.9, HW + 1.0), V(0, 0.5, 2.2), 5, 1.0, 0xe8f4ff); const u = ((t * 0.6 + i / 6) % 1); puff(V((hash(i) - 0.5) * 3, TOPY + 0.5 + u * 6, HW + 3 + hash(i * 3) * 2), 0xffffff, 1.5 + u * 2.5, 0.45 * Math.sin(u * Math.PI)); }
    // the keep rises; the stair is pulled up
    const ku = eout(k(t, T.tower - 0.5, T.tower + 0.5)); keep.visible = ku > 0 || t > T.tower; keep.position.y = TOPY - 15.5 * (1 - ku);
    if (ku > 0 && ku < 1) dust(t, T.tower - 0.5, V(0, TOPY + 0.5, 3), 12, 5, 0xe0d0b8, 1.2, 4);
    const su = eio(k(t, T.high + 0.1, T.high + 1.1)); stair.visible = ku > 0; stair.position.y = TOPY + 6 - 15.5 * (1 - ku); stair.rotation.x = su * rad(80);
    // gold sweeps ("it worked")
    const sweep = (t0, dur, a, b, w = 4, amt = 1.8) => { if (t < t0 || t > t0 + dur) return; const u = k(t, t0, t0 + dur); B.SWEEP.dir.set(0, 1, 0); B.SWEEP.pos = lerp(a, b, eio(u)); B.SWEEP.width = w; B.SWEEP.amt = amt * Math.sin(u * Math.PI); };
    sweep(T.cong1 - 0.1, 1.4, TOPY - 1, WY + 2, 4, 0.7); sweep(T.cong2 - 0.1, 1.4, TOPY - 1, TOPY + 12, 3, 1.0); sweep(T.end - 0.1, 1.8, TOPY - 1, TOPY + 17, 5);
    castUpdate(t);
    for (let i = sN; i < SPR.length; i++) SPR[i].visible = false;
    for (let i = fN; i < FIRE.length; i++) FIRE[i].visible = false;
  }

  // ---------- overlay: the idea sparkle, the fire glow, a light vignette
  function sparkle(t, t0, head) { const a = eout(k(t, t0, t0 + 0.2)) * (1 - sm(k(t, t0 + 1.3, t0 + 1.6))); if (a <= 0) return;
    const p = B.project(head); if (!p.ok) return;
    // round 3: it was too small to read against the sky (the reference's idea icon is a big, obvious pop).
    g.save(); g.translate(p.x, p.y - 46); const s = (0.6 + 0.4 * a) * (1 + 0.08 * Math.sin(t * 20)); g.scale(s, s); g.rotate(t * 1.5);
    g.globalAlpha = a; g.shadowColor = '#ff9d1f'; g.shadowBlur = 70; g.fillStyle = '#fff6b0'; g.scale(2.6, 2.6);
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 34, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); g.restore(); }
  function overlay(t) {
    B.vignette(0.14);
    sparkle(t, T.genius, V(3, TOPY + 2.15, 3.2));
    sparkle(t, T.brain - 0.1, V(HW - 3, WY + 2.15, HW - 0.6));
    // round 3: the fire tint was a dark orange (#ff7a2a), and soft-light with it crushed the blue channel - the sky
    // went navy and the fence went black for the whole fire beat. This one is warm but neutral in blue, so the beat
    // reads as firelight instead of nightfall.
    B.tint(sm(k(t, T.fire - 0.5, T.fire + 0.3)) * (1 - sm(k(t, T.wall - 0.2, T.wall + 0.3))) * 0.22, '#ffc080', 'soft-light');
  }

  const dimEnv = () => scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) o.material.envMapIntensity = 0.4; });
  B.run({ hdriBackground: false, update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hook: the camp', 0, T.fence0], ['The fence burns', T.fence0, L0('wall')], ['The stone wall', L0('wall'), L0('ladder')], ['Ladders and the moat', L0('ladder'), L0('arrows')],
      ['Archers and battlements', L0('arrows'), L0('corner')], ['Towers', L0('corner'), L0('gate')], ['The gate', L0('gate'), T.keep0], ['The keep', T.keep0, T.end], ['Congratulations', T.end, DUR]],
    warm: [1, 15, 30, 45], ready: async () => { plant(); setupCast(); dimEnv(); } });
})();
