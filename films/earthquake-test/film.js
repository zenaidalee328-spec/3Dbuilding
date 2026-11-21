// "Earthquake test": the same quake (magnitude 5 -> 8) under three buildings side by side: a mud-brick house, an
// unreinforced brick building and a base-isolated building on rubber bearings. Bricks fall one by one on paths that
// are pure functions of time (no simulation state). Uses base.js (BASE).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const T = {}; ['hook', 'intro', 'm5', 'm6', 'm7', 'm8', 'iso', 'fact', 'end'].forEach(id => { T[id] = LN(id).t0; T[id + 'E'] = LN(id).t1; });
  Object.assign(T, { mud: cue('intro', 'mud'), brick: cue('intro', 'brick', 1), rubber: cue('intro', 'rubber'), crack: cue('m6', 'crack'), down: cue('m7', 'down'),
    bend: cue('m7', 'bend'), peel: cue('m8', 'peel'), gives: cue('m8', 'gives'), slides: cue('iso', 'slides'), base: cue('fact', 'base') });

  // ---------- the quake: magnitude over time, and the ground's motion
  const MK = [[0, 0], [0.4, 4.3], [T.hookE - 0.3, 4.3], [T.intro, 0], [T.m5 - 0.1, 0], [T.m5 + 0.3, 5], [T.m6, 5.2], [T.m6 + 0.3, 6], [T.m7, 6.2], [T.m7 + 0.3, 7],
    [T.m8, 7.2], [T.m8 + 0.3, 8], [T.fact + 0.6, 8], [T.fact + 2.2, 0], [DUR + 1, 0]];
  const magAt = t => { for (let i = 0; i + 1 < MK.length; i++) { const [a, ma] = MK[i], [b, mb] = MK[i + 1]; if (t < b) return lerp(ma, mb, sm(k(t, a, b))); } return 0; };
  const ampOf = M => M < 3.5 ? 0 : 0.02 * Math.pow(3, M - 5) * clamp((M - 3.5) / 1.5);
  const groundAt = t => { const A = ampOf(magAt(t)); return V(A * (0.7 * Math.sin(t * 2 * Math.PI * 1.7) + 0.5 * B.n1(t * 5)), A * 0.15 * B.n1(t * 7 + 9), A * 0.4 * B.n1(t * 4 + 3)); };

  // ---------- light
  const SUN = V(0.45, 0.7, 0.55).normalize();
  B.loadHDR('hdri/kloofendal_48d_partly_cloudy_2k.hdr', SUN, 55);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 100 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x7a6a50, 0.4));

  // ---------- the world that shakes
  const world = new THREE.Group(); scene.add(world);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), B.pbr('dry_ground_01', 90, 90, { color: 0xffffff })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const pad = B.boxAt(-13, -0.2, -5, 13, 0.02, 5, B.pbr('concrete_floor', 6, 2.4, { color: 0xd8d4ce }), world);
  const mudMat = B.pbr('mud_cracked_dry_03', 0.35, 0.35, { color: 0xb08860 }), brickMat = B.pbr('red_brick_03', 0.5, 0.5, { color: 0xe8b090 }, false);
  const concMat = B.pbr('rough_concrete', 1, 1, { color: 0xe4e0da }, false), glassMat = new THREE.MeshStandardMaterial({ color: 0x8ab8d8, roughness: 0.05, metalness: 0.4, envMapIntensity: 1.4 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 });

  // ---------- falling blocks: an instanced building whose blocks fall on their own schedule
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = V(1, 1, 1), tmpP = V();
  function blockBuilding(cx, blocks, mat) {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, blocks.length); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    return { cx, blocks, m };
  }
  // block: {p: local centre, s: size, tc: when it starts to fall (Infinity: never), out: outward dir}
  function layoutWalls(w, d, h, bw, bh, th, openings, roofH) {
    const out = [];
    const sides = [[-w / 2, 0, w, 'z+', d / 2], [-w / 2, 0, w, 'z-', -d / 2], [-d / 2, 0, d, 'x-', -w / 2], [-d / 2, 0, d, 'x+', w / 2]];
    sides.forEach(([a0, , len, side, off]) => {
      const n = Math.round(len / bw), rows = Math.round(h / bh);
      for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
        const sh = r % 2 ? 0.5 : 0, u = a0 + (i + 0.5 + sh) * len / n; if (u > a0 + len) continue;
        const y = (r + 0.5) * h / rows;
        if (openings && openings(side, u, y)) continue;
        const along = side[0] === 'z' ? V(u, y, off) : V(off, y, u);
        const s = side[0] === 'z' ? V(len / n * 0.98, h / rows * 0.96, th) : V(th, h / rows * 0.96, len / n * 0.98);
        const outD = side === 'z+' ? V(0, 0, 1) : side === 'z-' ? V(0, 0, -1) : side === 'x+' ? V(1, 0, 0) : V(-1, 0, 0);
        out.push({ p: along, s, out: outD, side, rowK: y / h });
      }
    });
    return out;
  }
  // the mud house (left)
  const MUD_X = -8.2, mudBlocks = layoutWalls(5, 4.4, 2.7, 0.62, 0.34, 0.42, (side, u, y) => side === 'z+' && Math.abs(u - 0.6) < 0.5 && y < 1.9 || (side === 'x+' && Math.abs(u) < 0.45 && y > 1.1 && y < 1.8));
  for (let i = 0; i < 8; i++) mudBlocks.push({ p: V(-2.2 + i * 0.63, 2.86, 0), s: V(0.6, 0.3, 4.9), out: V(0, 0, 0), roof: true, rowK: 1.05 });
  const mud = blockBuilding(MUD_X, mudBlocks, mudMat);
  // the unreinforced brick building (middle): 3 storeys, windows, concrete floors
  const URM_X = 0, urmBlocks = layoutWalls(5.4, 5, 8.4, 0.72, 0.42, 0.36, (side, u, y) => { const fl = Math.floor(y / 2.8), yy = y - fl * 2.8;
    return (side === 'z+' || side === 'x+' || side === 'x-') && yy > 0.9 && yy < 2.1 && (Math.abs(Math.abs(u) - 1.3) < 0.45) || (side === 'z+' && fl === 0 && Math.abs(u) < 0.5 && yy < 2.2); });
  [2.8, 5.6, 8.4].forEach((y, f) => { for (let i = 0; i < 4; i++) urmBlocks.push({ p: V(-2.7 + 0.675 + i * 1.35, y + 0.1, 0), s: V(1.33, 0.2, 5.3), out: V(0, 0, 0), slab: true, rowK: y / 8.4, conc: true }); });
  const urm = blockBuilding(URM_X, urmBlocks, brickMat);
  // when each block falls: the mud house on "down" (top first); the brick building's front peels on "peel", the rest on "gives"
  mudBlocks.forEach((b, i) => { b.tc = T.down - 0.25 + (1 - b.rowK) * 0.35 + hash(i) * 0.25; if (b.roof) b.tc = T.down - 0.15 + hash(i) * 0.15; });
  urmBlocks.forEach((b, i) => { b.tc = T.gives - 0.2 + (1 - b.rowK) * 0.5 + hash(i + 50) * 0.3;
    if (b.side === 'z+' && b.rowK > 0.35) b.tc = T.peel - 0.1 + (1 - b.rowK) * 0.4 + hash(i + 70) * 0.35; if (b.slab) b.tc = T.gives + (1 - b.rowK) * 0.4; });
  // a crude pile height: things land on what fell before
  const restY = (b, i, bx) => b.s.y / 2 + (b.roof || b.slab ? 0.25 + hash(i + 7) * 0.5 : hash(i + 9) * 0.8 * clamp(1 - (Math.abs(b.land.x) + Math.abs(b.land.z)) / 6));
  [mud, urm].forEach(bd => bd.blocks.forEach((b, i) => {
    const sp = 0.8 + hash(i + 11) * 2.2;
    b.v = b.out.clone().multiplyScalar(sp).add(V((hash(i + 12) - 0.5) * 1.5, 0.4 + hash(i + 14) * 0.8, (hash(i + 13) - 0.5) * 1.5));
    b.w = V((hash(i + 15) - 0.5) * 8, (hash(i + 16) - 0.5) * 6, (hash(i + 17) - 0.5) * 8);
    const yRest0 = b.s.y / 2, tf = (b.v.y + Math.sqrt(b.v.y * b.v.y + 2 * 9.81 * Math.max(0.01, b.p.y - yRest0))) / 9.81;
    b.land = V(b.p.x + b.v.x * tf, 0, b.p.z + b.v.z * tf); b.yr = restY(b, i); b.tf = (b.v.y + Math.sqrt(b.v.y * b.v.y + 2 * 9.81 * Math.max(0.01, b.p.y - b.yr))) / 9.81;
  }));
  function poseBlocks(bd, t, gnd, sway, crack) {
    const H0 = bd.blocks.reduce((a, b) => Math.max(a, b.p.y), 1);
    bd.blocks.forEach((b, i) => {
      const dt = t - b.tc;
      if (dt <= 0) {   // standing: moves with the ground, sways with height, cracks open
        const h = b.p.y / H0, j = crack * (hash(i + 30) - 0.5);
        tmpP.set(bd.cx + b.p.x + gnd.x * (1 + sway * h) + j * 0.05, b.p.y + gnd.y, b.p.z + gnd.z * (1 + sway * h) + j * 0.03);
        tmpE.set(j * 0.06, 0, j * 0.08 + sway * gnd.x * 0.03 * h); tmpQ.setFromEuler(tmpE);
      } else if (dt < b.tf) {   // falling
        tmpP.set(bd.cx + b.p.x + b.v.x * dt, b.p.y + b.v.y * dt - 4.9 * dt * dt, b.p.z + b.v.z * dt);
        tmpE.set(b.w.x * dt, b.w.y * dt, b.w.z * dt); tmpQ.setFromEuler(tmpE);
      } else {   // landed: a short slide, then still (moves with the ground)
        const sl = 1 - Math.exp(-(dt - b.tf) * 5);
        tmpP.set(bd.cx + b.land.x + b.v.x * 0.12 * sl + gnd.x, b.yr + gnd.y, b.land.z + b.v.z * 0.12 * sl + gnd.z);
        tmpE.set(b.w.x * b.tf, b.w.y * b.tf, b.w.z * b.tf); tmpQ.setFromEuler(tmpE);
      }
      tmpM.compose(tmpP, tmpQ, tmpS.copy(b.s)); bd.m.setMatrixAt(i, tmpM);
    });
    bd.m.instanceMatrix.needsUpdate = true;
  }
  // concrete floors in the brick building get their own colour
  urmBlocks.forEach((b, i) => urm.m.setColorAt(i, b.conc ? new THREE.Color(0.75, 0.78, 0.82) : new THREE.Color(1, 1, 1)));
  mudBlocks.forEach((b, i) => mud.m.setColorAt(i, b.roof ? new THREE.Color(0.45, 0.34, 0.24) : new THREE.Color(0.92 + hash(i) * 0.1, 0.9 + hash(i) * 0.1, 0.86 + hash(i + 1) * 0.1)));

  // ---------- the base-isolated building (right): a stiff frame on rubber bearings in a pit
  const ISO_X = 8.2, isoG = new THREE.Group(); scene.add(isoG);
  const BH = 0.55;   // bearing height
  B.boxAt(-2.9, BH, -2.6, 2.9, BH + 0.4, 2.6, concMat, isoG);   // base slab
  for (let f = 0; f < 3; f++) {
    const y0 = BH + 0.4 + f * 2.9;
    [[-2.6, -2.3], [2.6, -2.3], [-2.6, 2.3], [2.6, 2.3], [0, -2.3], [0, 2.3]].forEach(([x, z]) => B.boxAt(x - 0.2, y0, z - 0.2, x + 0.2, y0 + 2.6, z + 0.2, concMat, isoG));
    B.boxAt(-2.9, y0 + 2.6, -2.6, 2.9, y0 + 2.9, 2.6, concMat, isoG);
    [[-1.3, 2.35], [1.3, 2.35]].forEach(([x, z]) => B.boxAt(x - 1.05, y0 + 0.3, z - 0.04, x + 1.05, y0 + 2.4, z + 0.04, glassMat, isoG));
    [[2.65, -1.15], [2.65, 1.15]].forEach(([x, z]) => B.boxAt(x - 0.04, y0 + 0.3, z - 0.95, x + 0.04, y0 + 2.4, z + 0.95, glassMat, isoG));
  }
  const pit = new THREE.Group(); world.add(pit);
  B.boxAt(-3.4, -0.6, -3.1, 3.4, 0.0, 3.1, concMat, pit);
  const bearings = [];
  [[-2.4, -2.1], [0, -2.1], [2.4, -2.1], [-2.4, 0], [0, 0], [2.4, 0], [-2.4, 2.1], [0, 2.1], [2.4, 2.1]].forEach(([x, z]) => {
    const G = new THREE.Group(); scene.add(G);
    const rub = B.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, BH - 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.75 }))); G.add(rub);
    [-1, 1].forEach(s => { const pl = B.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.35 }))); pl.position.y = s * (BH / 2 - 0.03); G.add(pl); });
    bearings.push({ G, x, z });
  });
  pit.position.x = ISO_X;

  // ---------- set dressing: boulders and grass clumps (Poly Haven)
  const boulder = B.gltf('models/namaqualand_boulder_02/namaqualand_boulder_02.gltf'), grassSet = B.gltf('models/grass_medium_01/grass_medium_01.gltf');
  function dress() {
    [[-15, -9, 1.6, 0.4], [14, -11, 2.2, 2.1], [-4, -16, 1.2, 1.2], [18, 6, 1.4, 3.0]].forEach(([x, z, sc, ry]) => { const b = boulder.clone(); b.position.set(x, 0, z); b.scale.setScalar(sc); b.rotation.y = ry; world.add(b); });
    boulder.visible = false;
    const clumps = []; grassSet.traverse(m => { if (m.isMesh) clumps.push(m); });
    const tq = new THREE.Quaternion(), tm = new THREE.Matrix4(), tp = V(), ts = V();
    clumps.forEach((m, ci) => { const n0 = ci * 40, im = new THREE.InstancedMesh(m.geometry, m.material, 30); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
      for (let i = 0; i < 30; i++) { const n = n0 + i; let x = (hash(n) - 0.5) * 50, z = -6 - hash(n + 1) * 20; if (hash(n + 7) > 0.6) { x = (hash(n + 2) - 0.5) * 40; z = 6 + hash(n + 3) * 10; }
        tq.setFromAxisAngle(V(0, 1, 0), hash(n + 4) * 6.28); tm.compose(tp.set(x, 0, z), tq, ts.setScalar(0.8 + hash(n + 5) * 0.8)); im.setMatrixAt(i, tm); }
      world.add(im); });
    grassSet.visible = false;
  }

  // ---------- dust
  const dust = Array.from({ length: 40 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xc8b090, transparent: true, depthWrite: false })); scene.add(s); return s; });

  // ---------- camera
  const SH = B.makeShots([
    [0, [2, 6, 30], [0, 3.0, 0], 25.5, 4],
    [T.mud - 0.2, [MUD_X + 3, 3, 9], [MUD_X, 1.5, 0], 8.5, 6],
    [T.brick - 0.2, [URM_X + 3, 4, 11], [URM_X, 4, 0], 11, 6],
    [T.rubber - 0.2, [ISO_X + 2, 1.2, 7], [ISO_X, 0.6, 1], 7, 6],
    [T.m5, [3, 6, 31], [0, 3.0, 0], 25.5, 4],
    [T.m6, [MUD_X + 2.5, 2.6, 9], [MUD_X, 1.4, 0], 8.5, 6],
    [T.m7, [MUD_X + 4, 3.5, 12], [MUD_X + 0.5, 1.5, 0], 11.5, -5],
    [T.m8, [URM_X + 4, 5, 15], [URM_X, 3.5, 0], 14, 5],
    [T.iso, [ISO_X + 2.5, 0.9, 6.5], [ISO_X, 0.55, 1.2], 6, 8],
    [T.slides - 0.2, [ISO_X + 4, 4, 13], [ISO_X, 3.6, 0], 12.5, 6],
    [T.fact, [-4, 8, 32], [0, 2.8, 0], 26, 8],
    [T.end, [6, 5, 30], [0.5, 2.8, 0], 26, -6],
  ]);

  function update(t) {
    const gnd = groundAt(t), M = magAt(t); window.__M = M;
    world.position.copy(gnd);
    const crackMud = sm(k(t, T.crack - 0.4, T.crack + 0.6)), crackUrm = sm(k(t, T.m7 + 0.5, T.m8 + 0.5));
    poseBlocks(mud, t, gnd, 0.6, crackMud);
    poseBlocks(urm, t, gnd, 1.2, crackUrm);
    // isolated building: the ground slides under it; it drifts a little, slowly
    const iso = V(gnd.x * 0.08 + 0.03 * Math.sin(t * 1.1) * ampOf(M) * 3, 0, gnd.z * 0.08);
    isoG.position.set(ISO_X + iso.x, 0, iso.z);
    bearings.forEach(b => { const top = V(ISO_X + b.x + iso.x, BH, b.z + iso.z), bot = V(ISO_X + b.x + gnd.x, gnd.y, b.z + gnd.z), d = top.clone().sub(bot);
      b.G.position.copy(top).add(bot).multiplyScalar(0.5); b.G.rotation.set(Math.atan2(d.z, BH), 0, -Math.atan2(d.x, BH)); });
    // dust at the collapses
    const bursts = [[T.down, MUD_X], [T.peel, URM_X], [T.gives, URM_X]];
    dust.forEach((s, i) => { const [tb, bx] = bursts[i % 3], life = (t - tb - hash(i) * 0.4) / 2.6;
      if (life < 0 || life > 1) { s.visible = false; return; } s.visible = true;
      const a = hash(i + 3) * 6.283, r = 1 + life * (3 + hash(i + 4) * 3); s.position.set(bx + Math.cos(a) * r, 0.5 + life * (2 + hash(i + 5) * 3), Math.sin(a) * r * 0.7);
      s.scale.setScalar(1.5 + life * 4); s.material.opacity = 0.5 * Math.sin(Math.PI * life); });
    // camera: handheld, shaken by the ground
    const c = B.shotCam(SH, t, { end: DUR, glide: 0.7, push: 0.06 });
    c.Q.add(gnd.clone().multiplyScalar(0.5)); c.Q.y += B.n1(t * 9) * ampOf(M) * 0.4;
    B.place(c, B.n1(t * 6 + 4) * ampOf(M) * 0.05); cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix();
    B.POST.aperture = 0.15;
    sun.position.copy(SUN).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  }

  // ---------- overlays
  function status(t, x3, text, col, t0, t1) {
    const a = eout(k(t, t0, t0 + 0.3)) * (1 - sm(k(t, t1 - 0.2, t1))); if (a <= 0) return;
    const p = B.project(V(x3, -0.3, 3.5)); if (!p.ok) return;
    g.save(); g.globalAlpha = a; g.font = `40px ${B.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const w = g.measureText(text).width + 36, y = clamp(p.y + 50, 300, 1260);
    g.fillStyle = col; B.rr(p.x - w / 2, y - 30, w, 60, 16); g.fill(); g.fillStyle = '#fff'; g.fillText(text, p.x, y + 2); g.restore();
  }
  function overlay(t) {
    const M = window.__M;
    B.vignette(0.2);
    B.tag(t, 'WHICH ONE SURVIVES?', 0.3, T.intro, 3, 150);
    B.counter(W / 2, 300, sm(k(t, T.m5 - 0.2, T.m5 + 0.2)) * (1 - sm(k(t, T.fact + 1.5, T.fact + 2.2))), 'M ' + (Math.round(M * 10) / 10).toFixed(1), 'MAGNITUDE', M >= 7 ? '#ff5a3a' : M >= 6 ? '#ffb040' : '#ffffff', 150);
    B.label(t, 'MUD BRICK', V(MUD_X, 2.9, 0), T.mud, T.brick, -1, '#ffd23f', -200);
    B.label(t, 'NO STEEL INSIDE', V(URM_X, 8.6, 0), T.brick + 0.3, T.rubber, -1, '#ffd23f', -160);
    B.label(t, 'RUBBER PADS', V(ISO_X, 0.3, 2.1), T.rubber + 0.1, T.m5, -1, '#7cc8ff', -300);
    const all = (t0, t1) => [[MUD_X, 'mud'], [URM_X, 'urm'], [ISO_X, 'iso']];
    const st = (which) => which === 'mud' ? (t > T.down ? ['COLLAPSED', 'rgba(210,30,30,0.95)'] : t > T.crack ? ['CRACKING', 'rgba(230,120,20,0.95)'] : ['STANDING', 'rgba(30,150,70,0.95)'])
      : which === 'urm' ? (t > T.gives ? ['COLLAPSED', 'rgba(210,30,30,0.95)'] : t > T.peel ? ['FAILING', 'rgba(230,120,20,0.95)'] : t > T.m7 + 0.5 ? ['CRACKING', 'rgba(230,120,20,0.95)'] : ['STANDING', 'rgba(30,150,70,0.95)'])
      : ['STANDING', 'rgba(30,150,70,0.95)'];
    all().forEach(([x, w]) => { const [txt, col] = st(w); status(t, x, txt, col, T.m5 + 0.4, T.fact + 0.2); });
    B.tag(t, 'THE GROUND MOVES, THE BUILDING DOESN\'T', T.slides - 0.1, T.fact, 2, 470);
    B.tag(t, 'BASE ISOLATION', T.base - 0.1, T.end, 2, 470);
    B.flash(t, [T.down, T.gives], '#fff1d8', 0.12, 0.35);
  }

  B.run({
    update, overlay, warm: [1, 12, 20, 30], ready: async () => dress(),
    scenes: [['Hook', 0, T.intro], ['Three buildings', T.intro, T.m5], ['M5', T.m5, T.m6], ['M6: cracks', T.m6, T.m7], ['M7: mud house falls', T.m7, T.m8],
      ['M8: brick building falls', T.m8, T.iso], ['Rubber pads', T.iso, T.fact], ['Base isolation', T.fact, T.end], ['Ending', T.end, DUR]],
  });
})();
