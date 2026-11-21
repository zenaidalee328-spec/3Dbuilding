// "Quicksand": a first-person survival short. You step off the path into quicksand, sink to the waist, pick from three
// moves (two wrong: struggle, pull a leg out; one right: lean back), float, wiggle and roll out onto solid ground.
// The camera is your eyes. Uses base.js (BASE).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const T = {}; ['hook', 'myth', 'why', 'danger', 'struggle', 'pull', 'lean', 'wiggle', 'roll', 'end'].forEach(id => { T[id] = LN(id).t0; T[id + 'E'] = LN(id).t1; });
  Object.assign(T, { off: cue('hook', 'off'), ground: cue('hook', 'ground'), grabs: cue('hook', 'grabs'), disappear: cue('myth', 'disappear'), real: cue('myth', 'real'),
    twice: cue('why', 'twice'), waist: cue('why', 'waist'), what: cue('danger', 'what'), deeper: cue('struggle', 'deeper'), car: cue('pull', 'car'),
    right: cue('lean', 'right'), floating: cue('lean', "you're"), seeps: cue('wiggle', 'seeps') });

  // ---------- light and sky
  const SUN = V(-0.4, 0.75, -0.5).normalize();
  B.loadHDR('hdri/kloofendal_48d_partly_cloudy_2k.hdr', SUN, 55);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target); scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x7a6a50, 0.4));

  // ---------- the ground: a firm path, the tidal flat, the quicksand, a grassy bank (solid ground)
  const QC = V(-0.6, 0, 0.9), QR = 3.6;   // the quicksand patch
  const sand = B.pbr('damp_beach_sand', 60, 60, { color: 0xffffff });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), sand); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const pathT = B.procTex(256, (u, v, i, j) => { const n = B.fbm(u, v, 12, 4), s = hash(i * 2.3 + j * 5.1); const l = 0.8 + 0.25 * n + (s > 0.95 ? 0.15 : 0); return [196 * l, 176 * l, 140 * l, n + s * 0.4]; }, 2.5, [2, 30]);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 60), B.pbr('gravel_floor_02', 1, 40, { color: 0x8a8274 }));
  path.rotation.x = -Math.PI / 2; path.position.set(-4.7, 0.01, 0); path.receiveShadow = true; scene.add(path);
  // the quicksand: wet, glossy, with moving ripples
  const ripT = B.procTex(256, (u, v) => { const n = B.fbm(u, v, 5, 4); return [255, 255, 255, n]; }, 3.5, [3, 3]);
  const qMat = new THREE.MeshStandardMaterial({ map: B.tex('brown_mud_02', 3, 3), normalMap: B.tex('brown_mud_02', 3, 3, 'nor_gl'), color: 0xc8b8a0, roughness: 0.38, metalness: 0, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.0 });
  const qs = new THREE.Mesh(new THREE.CircleGeometry(QR, 96), qMat); qs.rotation.x = -Math.PI / 2; qs.position.set(QC.x, 0.012, QC.z); qs.receiveShadow = true; scene.add(qs);
  const edge = new THREE.Mesh(new THREE.RingGeometry(QR, QR + 0.7, 96), new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.7, transparent: true, opacity: 0.22, depthWrite: false }));
  edge.rotation.x = -Math.PI / 2; edge.position.set(QC.x, 0.011, QC.z); scene.add(edge);
  // puddles
  const waterM = new THREE.MeshStandardMaterial({ color: 0x5a7a8a, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.5 });
  [].forEach(([x, z, r]) => { const p = new THREE.Mesh(new THREE.CircleGeometry(r, 40), waterM); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.015, z); p.scale.y = 0.6; scene.add(p); });
  // the solid bank: grass from x = 3.3
  const grassT = B.procTex(256, (u, v, i, j) => { const n = B.fbm(u, v, 16, 4), s = hash(i * 7.3 + j * 3.1); const l = 0.7 + 0.35 * n + 0.15 * s; return [70 * l, 110 * l, 45 * l, n + s]; }, 2, [20, 40]);
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), B.pbr('aerial_grass_rock', 10, 20));
  bank.rotation.x = -Math.PI / 2; bank.position.set(3.3 + 20, 0.02, 0); bank.receiveShadow = true; scene.add(bank);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = V(1, 1, 1), tmpP = V();
  // real grass clumps (Poly Haven grass_medium_01: 17 clumps, each instanced) and mossy rocks
  const grassSet = B.gltf('models/grass_medium_01/grass_medium_01.gltf'), rockSet = B.gltf('models/rock_moss_set_01/rock_moss_set_01.gltf');
  function dressSet() {
    const clumps = []; grassSet.traverse(m => { if (m.isMesh) clumps.push(m); });
    clumps.forEach((m, ci) => { const places = [];
      for (let i = 0; i < 26; i++) { const n = ci * 100 + i; let x, z; const c = n % 4;
        if (c < 2) { x = 3.5 + hash(n) * 12; z = -14 + hash(n + 1) * 28; } else { const a = hash(n + 2) * 6.283, r = QR + 0.8 + hash(n + 3) * 7; x = QC.x + Math.cos(a) * r; z = QC.z + Math.sin(a) * r; if (x > -5.7 && x < -3.7) x -= 2.6; }
        places.push([x, 0, z, hash(n + 4) * 6.28, 0.7 + hash(n + 5) * 0.7]); }
      const im = new THREE.InstancedMesh(m.geometry, m.material, places.length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
      places.forEach(([x, y, z, ry, sc], i) => { tmpQ.setFromAxisAngle(V(0, 1, 0), ry); tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.setScalar(sc)); im.setMatrixAt(i, tmpM); });
      scene.add(im); });
    grassSet.visible = false;
    const rocks = []; rockSet.traverse(m => { if (m.isMesh) rocks.push(m); });
    [[-6.2, 3.5, 0.5], [-3.4, -2.6, 0.35], [2.6, 4.8, 0.45], [-7, -5, 0.6], [4.2, -3.2, 0.4]].forEach(([x, z, sc], i) => { const r = rocks[i % rocks.length].clone(); r.position.set(x, 0, z); r.scale.setScalar(sc); r.rotation.y = hash(i) * 6; r.castShadow = r.receiveShadow = true; scene.add(r); });
    rockSet.visible = false;
  }
  // the sand heaped round your body, and the rings it sends out
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 10, 48), qMat); mound.rotation.x = Math.PI / 2; mound.scale.z = 0.5; mound.receiveShadow = true; scene.add(mound);
  const rings = Array.from({ length: 4 }, () => { const r = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: 0xd8c098, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; scene.add(r); return r; });
  const mud = Array.from({ length: 24 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0x6a5232, transparent: true, depthWrite: false })); scene.add(s); return s; });

  // ---------- your eyes: [t, x, eye height, z, pitch, heading, roll] (degrees; heading 0 looks along -z, -90 looks along +x)
  const BX = -1.9, BZ = 2.1;
  const KF = [
    [0, -4.7, 1.65, 6.0, -10, 0, 0], [T.off - 0.1, -4.7, 1.65, 3.6, -10, 0, 0], [T.ground + 0.15, -2.1, 1.6, 2.2, -28, -55, 0],
    [T.hookE, BX, 1.12, BZ, -52, -62, 0], [T.disappear - 0.2, BX, 0.98, BZ, -14, -75, 0], [T.disappear + 0.5, BX, 0.32, BZ, 8, -75, 0],
    [T.real + 0.25, BX, 0.95, BZ, -10, -75, 0], [T.whyE, BX, 0.72, BZ, -8, -88, 0], [T.danger + 1.0, BX, 0.72, BZ, 0, -40, 0], [T.dangerE, BX, 0.72, BZ, -4, -100, 0],
    [T.struggleE, BX, 0.5, BZ, -22, -90, 0], [T.pull + 0.8, BX, 0.5, BZ, -62, -90, 0], [T.pullE, BX, 0.5, BZ, -55, -90, 0],
    [T.lean + 1.0, BX, 0.55, BZ, 68, -90, 0], [T.wiggleE, BX, 0.62, BZ, 74, -90, 0], [T.roll + 0.25, BX, 0.45, BZ, 8, -90, 0],
    [T.rollE, 3.9, 0.4, 1.4, 6, -90, -720], [T.end + 0.7, 4.4, 1.65, 1.1, -22, 95, 0], [DUR + 1, 4.6, 1.68, 1.2, -25, 102, 0],
  ];
  const eyeAt = t => { for (let i = 0; i + 1 < KF.length; i++) { const a = KF[i], b = KF[i + 1]; if (t < b[0]) { const u = i === 15 ? k(t, a[0], b[0]) : eio(k(t, a[0], b[0])); return a.map((v, j) => j ? lerp(v, b[j], u) : t); } } return KF[KF.length - 1]; };
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');

  function povUpdate(t) {
    let [, x, y, z, p, h, r] = eyeAt(t);
    // walking bob; struggling shake; pulling strain; wiggle; breathing
    if (t < T.ground + 0.2) { y += 0.035 * Math.abs(Math.sin(t * 6)); r += 1.2 * Math.sin(t * 3); }
    const sh = sm(k(t, T.struggle + 0.2, T.struggle + 0.8)) * (1 - sm(k(t, T.struggleE - 0.3, T.struggleE + 0.2)));
    x += B.n1(t * 14) * 0.06 * sh; y += B.n1(t * 17 + 3) * 0.05 * sh; r += B.n1(t * 12 + 7) * 9 * sh; p += B.n1(t * 15 + 2) * 8 * sh;
    const st = sm(k(t, T.pull + 0.5, T.pull + 1)) * (1 - sm(k(t, T.pullE - 0.3, T.pullE)));
    y += B.n1(t * 40) * 0.012 * st; p += B.n1(t * 38 + 1) * 1.5 * st;
    const wg = sm(k(t, T.wiggle, T.wiggle + 0.5)) * (1 - sm(k(t, T.wiggleE - 0.4, T.wiggleE)));
    r += Math.sin(t * 5) * 4 * wg;
    y += 0.008 * Math.sin(t * 1.7);
    cam.position.set(x, y, z); eul.set(rad(p), rad(h), rad(r)); cam.quaternion.setFromEuler(eul);
    cam.fov = 62; cam.near = 0.03; cam.far = 600; cam.updateProjectionMatrix();
    B.POST.focus = p < -30 ? 1.0 : 6; B.POST.aperture = 0.35; B.POST.bloom = 0.25; B.POST.thr = 1.6;
    // the sand round you, the rings, the mud
    const sunk = clamp((1.6 - y) / 1.0);
    mound.visible = sunk > 0.25 && t < T.roll + 0.5; mound.position.set(x, 0.02, z); mound.scale.set(1 + 0.2 * sh, 1 + 0.2 * sh, 0.35);
    const ringOn = Math.max(sh, wg * 0.6, sm(k(t, T.grabs, T.grabs + 0.4)) * (1 - sm(k(t, T.hookE, T.hookE + 0.6))));
    rings.forEach((rg, i) => { const life = (t * (sh > 0.1 ? 1.4 : 0.6) + i / 4) % 1; rg.position.set(BX, 0.03, BZ); rg.scale.setScalar(0.5 + life * 2.6); rg.material.opacity = 0.16 * ringOn * (1 - life); });
    mud.forEach((m, i) => { const life = (t * 1.8 + hash(i)) % 1, a = hash(i + 9) * 6.283, rr = 0.3 + life * 0.8;
      m.position.set(BX + Math.cos(a) * rr, 0.05 + Math.sin(life * Math.PI) * (0.3 + hash(i + 3) * 0.4), BZ + Math.sin(a) * rr); m.scale.setScalar(0.06 + 0.05 * hash(i + 4));
      m.material.opacity = sh * Math.sin(Math.PI * life); m.visible = sh > 0.02; });
    // the quicksand ripples, and gets wetter as water seeps in
    qMat.normalMap.offset.set(Math.sin(t * 0.3) * 0.05, t * 0.02);
    const wet = sm(k(t, T.seeps - 0.3, T.seeps + 1.2));
    qMat.roughness = lerp(0.38, 0.2, wet); qMat.color.set(0xc8b8a0).lerp(new THREE.Color(0x8a7458), wet * 0.7);
    sun.position.copy(SUN).multiplyScalar(30).add(V(0, 0, 0)); sun.target.position.set(0, 0, 0);
  }

  // ---------- the character (Mixamo, when mixamo/manifest.js lists the files): it acts out every step, filmed from outside
  const CH = { ready: false, sink: 0 };
  const MX = window.MIXAMO;
  if (MX) {
    CH.holder = B.fbx('mixamo/' + MX.model, obj => {
      // a real person's height: the file's units come in about twice too big, so measure and scale to 1.78 m
      obj.scale.setScalar(0.01); obj.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(obj, true); obj.scale.multiplyScalar(1.78 / Math.max(0.1, bb.max.y - bb.min.y));
      obj.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        const old = Array.isArray(m.material) ? m.material : [m.material];
        const neu = old.map(o => new THREE.MeshStandardMaterial({ map: o.map || null, normalMap: o.normalMap || null, color: o.map ? 0xffffff : (o.color || new THREE.Color(0.7, 0.6, 0.5)), roughness: 0.75, metalness: 0, transparent: !!o.transparent, alphaTest: o.transparent ? 0.3 : 0 }));
        m.material = Array.isArray(m.material) ? neu : neu[0]; } });
      CH.model = obj; CH.mixer = new THREE.AnimationMixer(obj);
    });
    scene.add(CH.holder);
    CH.clips = {};
    Object.entries(MX.clips).forEach(([role, file]) => { B.fbx('mixamo/' + file, obj => { const c = obj.animations && obj.animations[0]; if (c) CH.clips[role] = c; }); });
  }
  // keep the hips from walking away (we move the body ourselves): hips x/z stay at their first value
  function pinHips(clip) {
    clip.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    return clip;
  }
  function setupCharacter() {
    if (!CH.model || CH.holder.userData.missing) return;
    CH.actions = {};
    // the flailing clip kicks its legs up out of the sand: it keeps the arms and body, and borrows the legs of the calm clip
    const LEGS = /(UpLeg|Leg|Foot|ToeBase|Toe_End)\./;
    if (CH.clips.struggle && CH.clips.scared) { const st = CH.clips.struggle;
      st.tracks = st.tracks.filter(tr => !LEGS.test(tr.name)).concat(CH.clips.scared.tracks.filter(tr => LEGS.test(tr.name)).map(tr => tr.clone())); }
    Object.entries(CH.clips).forEach(([role, c]) => { const a = CH.mixer.clipAction(pinHips(c)); a.play(); a.weight = 0; CH.actions[role] = a; });
    CH.ready = Object.keys(CH.actions).length > 0;
  }
  // the body over time: [t, x, z, sink (root height), heading (deg; 90 faces +x), lean back (deg)]
  const BK = [
    [0, -4.7, 6.0, 0, 180, 0], [T.off - 0.1, -4.7, 3.6, 0, 180, 0], [T.ground + 0.2, BX, BZ, 0, 100, 0], [T.hookE, BX, BZ, -0.42, 100, 0],
    [T.disappear - 0.2, BX, BZ, -0.5, 100, 0], [T.disappear + 0.5, BX, BZ, -1.5, 100, 0], [T.real + 0.25, BX, BZ, -0.62, 100, 0],
    [T.struggle + 0.4, BX, BZ, -0.85, 100, 0], [T.struggleE - 0.2, BX, BZ, -1.0, 100, 0], [T.pull + 0.3, BX, BZ, -0.8, 100, 0], [T.pullE, BX, BZ, -0.8, 100, 0], [T.lean + 1.0, BX, BZ, -0.14, 100, 0], [T.wiggleE, BX, BZ, -0.12, 100, 0],
    [T.roll + 0.3, BX, BZ, -0.06, 100, 0], [T.rollE, 3.7, 1.6, -0.01, 90, 0], [T.rollE + 0.4, 3.9, 1.6, 0, 90, 0], [DUR + 1, 3.9, 1.6, 0, 250, 0],
  ];
  const bodyAt = t => { for (let i = 0; i + 1 < BK.length; i++) { const a = BK[i], b = BK[i + 1]; if (t < b[0]) { const u = eio(k(t, a[0], b[0])); return a.map((v, j) => j ? lerp(v, b[j], u) : t); } } return BK[BK.length - 1]; };
  // which clip plays when (with crossfades), and from when its own time runs
  const SEG = [['walk', -1, T.ground + 0.15], ['scared', T.ground + 0.15, T.struggle + 0.1], ['struggle', T.struggle + 0.1, T.pull + 0.1], ['pull', T.pull + 0.1, T.lean + 0.2], ['float', T.lean + 0.2, T.roll + 0.2],
    ['roll', T.roll + 0.2, T.rollE + 0.1], ['up', T.rollE + 0.1, DUR + 2]];
  const FADE = 0.35;
  function charUpdate(t) {
    const [, x, z, sink, head, lean] = bodyAt(t); CH.sink = sink;
    const sh = sm(k(t, T.struggle + 0.2, T.struggle + 0.8)) * (1 - sm(k(t, T.pullE - 0.3, T.pullE + 0.2)));
    CH.holder.position.set(x + B.n1(t * 9) * 0.03 * sh, sink, z);
    CH.holder.rotation.set(0, rad(head), 0); CH.model.rotation.set(rad(lean), 0, 0);
    // clip weights and times (a pure function of t)
    Object.values(CH.actions).forEach(a => { a.weight = 0; a.enabled = false; });
    SEG.forEach(([role, t0, t1]) => { const a = CH.actions[role] || CH.actions.scared || Object.values(CH.actions)[0]; if (!a) return;
      const w = sm(k(t, t0 - FADE, t0)) * (1 - sm(k(t, t1 - FADE, t1))); if (w <= 0) return;
      const d = a.getClip().duration, lt = t - t0 + 0.2;
      a.enabled = true; a.weight = Math.max(a.weight, w); a.time = role === 'up' ? clamp(lt * 2.2, 0, d - 0.01) : ((lt % d) + d) % d; });
    CH.mixer.update(0);
    // camera: outside shots of the person
    const S3 = B.shotCam(SH3, t, { end: DUR, glide: 0.7, push: 0.06 });
    if (t < T.off) S3.Q.set(x, 1.1, z);
    S3.Q.add(V(B.n1(t * 8) * 0.03 * sh, B.n1(t * 7 + 2) * 0.03 * sh, 0));
    B.place(S3, 0, 0.15); cam.near = 0.05; cam.far = 600; cam.updateProjectionMatrix(); B.POST.aperture = 0.45; B.POST.bloom = 0.25; B.POST.thr = 1.6;
    // the sand round the body, the rings, the mud
    const wg = sm(k(t, T.wiggle, T.wiggle + 0.5)) * (1 - sm(k(t, T.wiggleE - 0.4, T.wiggleE)));
    mound.visible = sink < -0.25 && t < T.lean; mound.position.set(x, 0.02, z); mound.scale.set(0.62 + 0.12 * sh, 0.62 + 0.12 * sh, 0.25);
    const ringOn = Math.max(sh, wg * 0.6, sm(k(t, T.grabs, T.grabs + 0.4)) * (1 - sm(k(t, T.hookE, T.hookE + 0.6))));
    rings.forEach((rg, i) => { const life = (t * (sh > 0.1 ? 1.4 : 0.6) + i / 4) % 1; rg.position.set(x, 0.03, z); rg.scale.setScalar(0.5 + life * 2.6); rg.material.opacity = 0.16 * ringOn * (1 - life); });
    mud.forEach((m, i) => { const life = (t * 1.8 + hash(i)) % 1, a = hash(i + 9) * 6.283, rr = 0.3 + life * 0.8;
      m.position.set(x + Math.cos(a) * rr, 0.05 + Math.sin(life * Math.PI) * (0.3 + hash(i + 3) * 0.4), z + Math.sin(a) * rr); m.scale.setScalar(0.06 + 0.05 * hash(i + 4));
      m.material.opacity = sh * Math.sin(Math.PI * life); m.visible = sh > 0.02; });
    qMat.normalMap.offset.set(Math.sin(t * 0.3) * 0.05, t * 0.02);
    const wet = sm(k(t, T.seeps - 0.3, T.seeps + 1.2));
    qMat.roughness = lerp(0.38, 0.2, wet); qMat.color.set(0xc8b8a0).lerp(new THREE.Color(0x8a7458), wet * 0.7);
    sun.position.copy(SUN).multiplyScalar(30); sun.target.position.set(0, 0, 0);
  }
  // shots of the person: [t0, camera side, target, frame width, drift]
  const SH3 = B.makeShots([
    [0, [-3.0, 1.4, 7.8], [-4.7, 0.9, 4.4], 2.4, 4],
    [T.off, [0.2, 1.1, 4.6], [BX, 0.55, BZ], 2.1, 6],
    [T.myth, [-0.9, 0.55, 3.8], [BX, 0.25, BZ], 1.5, 5],
    [T.why, [0.6, 0.35, 3.4], [BX, 0.22, BZ], 1.6, -5],
    [T.danger, [-0.6, 0.75, 4.2], [BX, 0.3, BZ], 1.8, 8],
    [T.struggle, [0.3, 0.35, 3.8], [BX, 0.28, BZ], 1.6, -6],
    [T.pull, [1.4, 0.95, 3.0], [BX, 0.2, BZ], 1.8, 6],
    [T.lean, [-0.6, 2.6, 3.2], [BX - 0.2, -0.15, BZ], 2.3, 6],
    [T.wiggle, [0.9, 1.4, 2.8], [BX + 0.2, -0.1, BZ], 2.0, -6],
    [T.roll, [0.6, 2.0, 6.0], [0.9, 0.1, 1.8], 4.2, 4],
    [T.end, [5.6, 1.1, 4.4], [3.9, 0.85, 1.6], 2.3, 8],
  ]);
  function update(t) { if (CH.ready) charUpdate(t); else povUpdate(t); }

  // ---------- overlays: depth, densities, the three choices
  const OPTS = [['A', 'STRUGGLE HARD'], ['B', 'PULL A LEG OUT'], ['C', 'LEAN BACK']];
  function choices(t) {
    const a = eout(k(t, T.what - 0.1, T.what + 0.3)) * (1 - sm(k(t, T.right + 1.3, T.right + 1.8)));
    if (a <= 0) return;
    const state = i => i === 0 ? (t > T.struggle + 0.2 ? -1 : 0) : i === 1 ? (t > T.pull + 0.2 ? -1 : 0) : (t > T.right - 0.1 ? 1 : 0);
    const focus = t < T.struggle ? -1 : t < T.pull ? 0 : t < T.lean ? 1 : 2;
    OPTS.forEach(([L, text], i) => {
      const y = 980 + i * 118, s = state(i), f = focus === i ? 1 : 0, wv = 640 + f * 60, x = W / 2 - wv / 2;
      const ai = a * eout(k(t, T.what + i * 0.12, T.what + i * 0.12 + 0.3)) * (focus >= 0 && focus !== i ? 0.55 : 1);
      g.save(); g.globalAlpha = ai;
      g.fillStyle = s < 0 ? 'rgba(200,30,30,0.92)' : s > 0 ? 'rgba(30,160,70,0.94)' : 'rgba(14,18,24,0.86)'; B.rr(x, y, wv, 98, 24); g.fill();
      g.strokeStyle = s < 0 ? '#ff8080' : s > 0 ? '#9cffb8' : '#ffd23f'; g.lineWidth = 4; g.stroke();
      g.font = `56px ${B.FONT}`; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f'; g.fillText(L, x + 28, y + 52);
      g.fillStyle = '#ffffff'; g.fillText(text, x + 90, y + 52);
      if (s) { g.textAlign = 'right'; g.fillText(s < 0 ? '✗' : '✓', x + wv - 30, y + 52); }
      g.restore();
    });
  }
  function overlay(t) {
    B.vignette(0.25);
    // the movie myth: a dark close-in
    const movie = sm(k(t, T.disappear - 0.2, T.disappear + 0.3)) * (1 - sm(k(t, T.real - 0.1, T.real + 0.2)));
    if (movie > 0) { B.tint(movie * 0.7, '#000000', 'multiply'); }
    // depth
    const y = CH.ready ? 1.6 + CH.sink : cam.position.y, da = sm(k(t, T.grabs, T.grabs + 0.4)) * (1 - sm(k(t, T.roll + 0.5, T.roll + 1)));
    B.badge(40, 80, da * (1 - sm(k(t, T.lean - 0.2, T.lean + 0.2))), 'SUNK TO', (CH.ready ? CH.sink > -0.25 : y > 1.3) ? 'ANKLES' : (CH.ready ? CH.sink > -0.55 : y > 0.9) ? 'KNEES' : 'WAIST', '#ffb070');
    const dn = eout(k(t, T.twice - 0.1, T.twice + 0.3)) * (1 - sm(k(t, T.danger - 0.2, T.danger)));
    B.badge(W - 330, 80, dn, 'QUICKSAND', '2.0 g/cm³', '#ffd23f', 290); B.badge(W - 330, 200, dn, 'YOUR BODY', '1.0 g/cm³', '#7cc8ff', 290);
    // wrong / right
    const wrongA = sm(k(t, T.struggle + 0.2, T.struggle + 0.5)) * (1 - sm(k(t, T.struggleE - 0.2, T.struggleE))), wrongB = sm(k(t, T.pull + 0.2, T.pull + 0.5)) * (1 - sm(k(t, T.pullE - 0.2, T.pullE)));
    B.tint(Math.max(wrongA, wrongB) * 0.35, '#ff2020', 'soft-light');
    B.flash(t, [T.grabs, T.right], '#ffffff', 0.12, 0.4);
  }

  B.run({
    update, overlay, warm: [1, 10, 20, 30], ready: async () => { dressSet(); if (MX) setupCharacter(); },
    scenes: [['Hook: step in', 0, T.myth], ['The movie myth', T.myth, T.why], ['Why you float', T.why, T.danger], ['What do you do?', T.danger, T.struggle],
      ['A: struggle', T.struggle, T.pull], ['B: pull a leg', T.pull, T.lean], ['C: lean back', T.lean, T.wiggle], ['Wiggle', T.wiggle, T.roll], ['Roll out', T.roll, T.end], ['Ending', T.end, DUR]],
  });
})();
