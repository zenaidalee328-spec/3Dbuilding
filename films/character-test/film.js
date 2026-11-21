// Character test: a person built entirely in code (left) next to the Mixamo person (right), both doing the same moves:
// walk, run, cheer, dig, climb a ladder. The code person's motion is written by hand (every joint is a formula of t).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, clamp, lerp, rad, scene, cam, g } = B;
  const { DUR } = window.TL;
  const SEG = [['WALK', 0, 3], ['RUN', 3, 6], ['CHEER', 6, 9], ['DIG', 9, 12], ['CLIMB', 12, 15.4]];
  const segAt = t => SEG.find(s => t >= s[1] && t < s[2]) || SEG[SEG.length - 1];

  // ---------- world
  const SUN = V(0.5, 0.6, 0.8).normalize();
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', SUN, 40);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 40 }); sun.shadow.bias = -0.0004; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x6a5a40, 0.5));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: B.tex('aerial_grass_rock', 16, 16), normalMap: B.tex('aerial_grass_rock', 16, 16, 'nor_gl'), color: 0xc8e0b0, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 });
  const ladder = x => { const gq = new THREE.Group(); [-0.3, 0.3].forEach(dx => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 5, 0.07), WOOD); r.position.set(dx, 2.5, 0); gq.add(r); });
    for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), WOOD); s.position.set(0, 0.3 + i * 0.3, 0); gq.add(s); } B.shadowed(gq); gq.position.set(x, 0, -0.42); scene.add(gq); return gq; };
  const LADS = [ladder(-0.8), ladder(0.8)];

  // ---------- the code-made person: a skeleton of groups, each limb a rounded shape
  const SKIN = new THREE.MeshStandardMaterial({ color: 0xe0a882, roughness: 0.6 }), SHIRT = new THREE.MeshStandardMaterial({ color: 0xd8301e, roughness: 0.8 });
  const PANTS = new THREE.MeshStandardMaterial({ color: 0x2e3a52, roughness: 0.85 }), SHOE = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  const HAIR = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }), DARK = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });
  const limb = (r, len, mat, sx = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat); m.geometry.translate(0, -len / 2 - r * 0.4, 0); m.scale.set(sx, 1, sz); m.castShadow = true; return m; };
  const joint = (parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; };
  function makePerson() {
    const P = {}; P.root = new THREE.Group(); scene.add(P.root);
    P.hips = joint(P.root, 0, 0.98, 0);
    const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.1, 6, 14), PANTS); pelvis.scale.set(1.15, 1, 0.8); pelvis.castShadow = true; P.hips.add(pelvis);
    P.spine = joint(P.hips, 0, 0.08, 0);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.14, 6, 14), SHIRT); belly.scale.set(1.1, 1, 0.78); belly.position.y = 0.12; belly.castShadow = true; P.spine.add(belly);
    P.chest = joint(P.spine, 0, 0.2, 0);
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 6, 16), SHIRT); chest.scale.set(1.18, 1, 0.72); chest.position.y = 0.14; chest.castShadow = true; P.chest.add(chest);
    P.neck = joint(P.chest, 0, 0.33, 0); const neck = limb(0.05, 0.06, SKIN); neck.geometry.translate(0, 0.1, 0); P.neck.add(neck);
    P.head = joint(P.neck, 0, 0.1, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), SKIN); head.scale.set(0.92, 1.12, 1); head.position.y = 0.11; head.castShadow = true; P.head.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), HAIR); hair.scale.set(0.95, 1.12, 1.03); hair.position.set(0, 0.125, -0.008); P.head.add(hair);
    [-0.035, 0.035].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), DARK); e.position.set(x, 0.125, 0.092); P.head.add(e); });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 6), SKIN); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.1, 0.11); P.head.add(nose);
    [-1, 1].forEach(s => { const side = s < 0 ? 'L' : 'R';
      const sh = joint(P.chest, s * 0.215, 0.27, 0); const ua = limb(0.055, 0.22, SHIRT); sh.add(ua);
      const el = joint(sh, 0, -0.3, 0); el.add(limb(0.045, 0.2, SKIN));
      const wr = joint(el, 0, -0.27, 0); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), SKIN); hand.scale.set(0.8, 1.2, 0.6); hand.position.y = -0.05; wr.add(hand);
      const hp = joint(P.hips, s * 0.095, -0.05, 0); hp.add(limb(0.075, 0.33, PANTS));
      const kn = joint(hp, 0, -0.45, 0); kn.add(limb(0.06, 0.32, PANTS));
      const an = joint(kn, 0, -0.43, 0); const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), SHOE); foot.position.set(0, -0.035, 0.06); foot.castShadow = true; an.add(foot);
      Object.assign(P, { ['sh' + side]: sh, ['el' + side]: el, ['wr' + side]: wr, ['hp' + side]: hp, ['kn' + side]: kn, ['an' + side]: an }); });
    const shovel = new THREE.Group(); const sh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 6), WOOD); shovel.add(sh1);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.4 })); blade.position.y = -0.65; shovel.add(blade);
    B.shadowed(shovel); P.shovel = shovel; scene.add(shovel);
    return P;
  }
  const ME = makePerson();
  // poses: every joint angle is a formula of time (x: + bends the limb backwards, - swings it forwards)
  function zero(P) { ['hips', 'spine', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hpL', 'hpR', 'knL', 'knR', 'anL', 'anR'].forEach(j => P[j].rotation.set(0, 0, 0)); P.hips.position.set(0, 0.98, 0); }
  function gait(P, t, f, amp, knee, lean, armAmp, elbow, bob) {
    const ph = t * Math.PI * 2 * f;
    [['L', 0], ['R', Math.PI]].forEach(([s, o]) => { const p = ph + o;
      P['hp' + s].rotation.x = -amp * Math.sin(p);
      P['kn' + s].rotation.x = knee * Math.max(0, Math.sin(p + 1.9)) + 0.08;
      P['an' + s].rotation.x = -0.25 * Math.sin(p + 0.6);
      P['sh' + s].rotation.x = armAmp * Math.sin(p); P['sh' + s].rotation.z = (s === 'L' ? 1 : -1) * 0.08;
      P['el' + s].rotation.x = -elbow - 0.25 * Math.max(0, Math.sin(p)); });
    P.hips.position.y = 0.98 - bob * (1 - Math.abs(Math.cos(ph))) * 0.5 - (knee > 1 ? 0.06 : 0);
    P.hips.rotation.y = 0.08 * Math.sin(ph); P.chest.rotation.y = -0.16 * Math.sin(ph); P.spine.rotation.x = lean;
    P.hips.rotation.z = 0.04 * Math.sin(ph); P.head.rotation.x = -lean * 0.7;
  }
  function animateMe(t) {
    const P = ME, [name, t0] = segAt(t), lt = t - t0; zero(P); P.shovel.visible = false;
    if (name === 'WALK') gait(P, lt, 0.95, 0.42, 0.75, 0.04, 0.35, 0.15, 0.05);
    else if (name === 'RUN') gait(P, lt, 1.45, 0.85, 1.55, 0.22, 0.75, 1.45, 0.12);
    else if (name === 'CHEER') { const ph = lt * Math.PI * 2 * 1.6, pump = Math.abs(Math.sin(ph));
      ['L', 'R'].forEach((s, i) => { const sg = s === 'L' ? 1 : -1; P['sh' + s].rotation.x = -2.75 - 0.25 * pump; P['sh' + s].rotation.z = sg * (0.35 + 0.1 * pump); P['el' + s].rotation.x = -0.4 - 0.7 * (1 - pump); });
      const hop = Math.max(0, Math.sin(ph)) * 0.08; P.hips.position.y = 0.98 + hop - 0.04; P.hpL.rotation.x = P.hpR.rotation.x = -0.15 * (1 - pump); P.knL.rotation.x = P.knR.rotation.x = 0.3 * (1 - pump);
      P.head.rotation.x = -0.2; P.spine.rotation.x = -0.08; }
    else if (name === 'DIG') { const ph = (lt * 0.85) % 1, push = sm(clamp(ph / 0.35)), lift = sm(clamp((ph - 0.45) / 0.3)), u = push * (1 - lift);
      P.spine.rotation.x = 0.25 + 0.35 * u; P.chest.rotation.x = 0.1 * u; P.hips.position.y = 0.98 - 0.12 * u;
      P.hpL.rotation.x = -0.5 * u - 0.1; P.knL.rotation.x = 0.7 * u + 0.15; P.hpR.rotation.x = 0.25; P.knR.rotation.x = 0.35 * u + 0.1; P.anL.rotation.x = -0.2 * u;
      P.shL.rotation.x = -0.9 - 0.4 * u; P.elL.rotation.x = -0.9 + 0.3 * u; P.shR.rotation.x = -0.4 - 0.5 * u; P.elR.rotation.x = -1.2; P.shR.rotation.z = -0.15; P.shL.rotation.z = 0.25;
      // the shovel held in both hands
      P.root.updateMatrixWorld(true); const a = new THREE.Vector3(), b = new THREE.Vector3(); P.wrL.getWorldPosition(a); P.wrR.getWorldPosition(b);
      const d = b.clone().sub(a).normalize(); P.shovel.visible = true; P.shovel.position.copy(a.clone().lerp(b, 0.5)).add(d.clone().multiplyScalar(-0.1));
      P.shovel.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().add(V(0, -0.6, 0.6)).normalize()); }
    else { const ph = lt * Math.PI * 2 * 0.8;                                  // climb: reach and step, the body rises
      [['L', 0], ['R', Math.PI]].forEach(([s, o]) => { const p = ph + o, r = 0.5 + 0.5 * Math.sin(p);
        P['sh' + s].rotation.x = -2.2 - 0.6 * r; P['el' + s].rotation.x = -0.9 * (1 - r) - 0.2; P['sh' + s].rotation.z = (s === 'L' ? 1 : -1) * 0.15;
        P['hp' + s].rotation.x = -1.2 * (1 - r) - 0.2; P['kn' + s].rotation.x = 1.6 * (1 - r) + 0.3; P['an' + s].rotation.x = 0.3; });
      P.hips.position.y = 0.98 + lt * 0.55; P.spine.rotation.x = 0.06; P.head.rotation.x = -0.35; }
  }

  // ---------- the Mixamo person (Remy), same moves
  const MX = window.MIXAMO || { model: 'Walking.fbx', files: [] };
  const CLIP = { WALK: 'Walking', RUN: 'Running', CHEER: 'Cheering', DIG: 'Digging', CLIMB: 'Climbing Ladder' };
  const R = { obj: null, clips: {}, acts: {} };
  const holder = B.fbx('mixamo/' + MX.model, obj => { R.obj = obj; });
  Object.values(CLIP).forEach(f => B.fbx('mixamo/' + f + '.fbx', obj => { const c = obj.animations && obj.animations[0]; if (c) R.clips[f] = c; }));
  scene.add(holder);
  function setupRemy() {
    if (!R.obj) return; const o = R.obj; o.scale.setScalar(0.01); o.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(o, true); o.scale.multiplyScalar(1.78 / (bb.max.y - bb.min.y));
    o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; const mm = Array.isArray(m.material) ? m.material : [m.material];
      const nm = mm.map(x => new THREE.MeshStandardMaterial({ map: x.map || null, normalMap: x.normalMap || null, color: 0xffffff, roughness: 0.8, transparent: !!x.transparent, alphaTest: x.transparent ? 0.3 : 0 })); m.material = Array.isArray(m.material) ? nm : nm[0]; } });
    R.mixer = new THREE.AnimationMixer(o);
    Object.entries(R.clips).forEach(([f, c]) => { c.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
      const a = R.mixer.clipAction(c); a.play(); a.weight = 0; R.acts[f] = a; });
  }
  function animateRemy(t) {
    if (!R.mixer) return; const [name, t0] = segAt(t), f = CLIP[name];
    Object.values(R.acts).forEach(a => { a.weight = 0; a.enabled = false; });
    const a = R.acts[f]; if (a) { a.enabled = true; a.weight = 1; const d = a.getClip().duration; a.time = (t - t0) % d; }
    R.mixer.update(0);
  }

  function update(t) {
    const [name, t0] = segAt(t), climb = name === 'CLIMB';
    LADS.forEach(l => { l.visible = climb; });
    ME.root.position.set(-0.8, 0, climb ? -0.15 : 0); ME.root.rotation.y = climb ? Math.PI : 0.25;
    holder.position.set(0.8, climb ? (t - t0) * 0.55 : 0, climb ? -0.15 : 0); holder.rotation.y = climb ? Math.PI : -0.25;
    animateMe(t); animateRemy(t);
    const y = climb ? 1.0 + (t - t0) * 0.5 : 1.0;
    cam.position.set(Math.sin(t * 0.15) * 0.8 + 0.3, y + 0.4, 6.6); cam.lookAt(0, y, 0); cam.fov = 40; cam.updateProjectionMatrix();
    B.POST.focus = 6.6; Object.assign(B.POST, { aperture: 0.15, bloom: 0.3, thr: 1.2, sat: 1.12, con: 1.05 });
    sun.target.position.set(0, 0, 0); sun.position.copy(SUN).multiplyScalar(20);
  }
  function overlay(t) {
    const [name] = segAt(t);
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '64px Poppins'; g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineJoin = 'round';
    g.strokeText(name, W / 2, 170); g.fillStyle = '#ffe14d'; g.fillText(name, W / 2, 170);
    g.font = '40px Poppins'; [['MADE IN CODE', W * 0.27], ['MIXAMO', W * 0.73]].forEach(([s, x]) => { g.strokeText(s, x, H - 220); g.fillStyle = '#ffffff'; g.fillText(s, x, H - 220); });
    g.restore();
  }
  B.run({ update, overlay, captions: false, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']], scenes: SEG.map(([n, a, b]) => [n, a, b]), warm: [1, 8], ready: async () => { setupRemy(); } });
})();
