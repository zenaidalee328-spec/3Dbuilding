// LOOK TEST: one frame to match the reference short's look (stylised-clean 3D, eye-level 3/4 camera, 4 depth layers:
// grass + flowers in front, the hero on a stone-slab bridge, willows + cypresses along a river that runs away, hazy hills).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, clamp, lerp, hash, rad, scene, cam } = B;
  const { DUR } = window.TL;

  // ---------- the land: flat meadow, a river trench that meanders away (-z), a dirt path beside each bank, far hills
  const rx = z => 1.4 * Math.sin(z * 0.035) + 0.8 * Math.sin(z * 0.011 + 1);        // river centre line
  const HALF = 2.6, TOP = 3.8, DEEP = -2.3, WATER = -1.55;
  function hAt(x, z) {
    const d = Math.abs(x - rx(z));
    let y = d < HALF ? DEEP : d < TOP ? lerp(DEEP, 0, sm((d - HALF) / (TOP - HALF))) : 0;
    if (d > TOP) y += 0.25 * (B.fbm(x / 60 + 3, z / 60 + 1, 8, 3) - 0.5) * sm((d - TOP) / 6);
    if (z < -120) y += 18 * sm((-z - 120) / 160) * (0.6 + 0.4 * B.fbm(x / 90, z / 90, 4, 3)) * sm((d - 20) / 40);   // rolling hills far off
    return y;
  }
  const pathD = d => Math.abs(d - 5.4) < 0.75;
  {
    const geo = new THREE.PlaneGeometry(260, 520, 260, 520); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -200);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z), d = Math.abs(x - rx(z)); p.setY(i, y);
      const n = B.fbm(x / 9 + 5, z / 9 + 2, 8, 3);
      if (d < TOP + 0.1) c.setHSL(0.068, 0.5, lerp(0.24, 0.33, n) - 0.07 * sm((HALF + 0.6 - d) / 1.2));   // sandy bank
      else if (pathD(d)) c.setHSL(0.08, 0.28, lerp(0.38, 0.44, n));                                         // dirt path
      else c.setHSL(lerp(0.2, 0.25, n), 0.6, lerp(0.28, 0.38, n));                                        // meadow
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
  }
  // water: a flat teal sheet in the trench, clear near the banks
  { const g = new THREE.PlaneGeometry(14, 520, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, -200);
    const wm = new THREE.MeshStandardMaterial({ color: 0x147c80, envMapIntensity: 0.3, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.94 });
    const w = new THREE.Mesh(g, wm); w.position.y = WATER; w.receiveShadow = true; scene.add(w); }

  // ---------- sky: soft blue top to a warm pale horizon, and the same colour as haze
  const HORIZON = new THREE.Color(0xdfe2e4);
  scene.fog = new THREE.Fog(new THREE.Color(0xc9d2dc), 90, 900);
  { const sg = new THREE.SphereGeometry(900, 32, 16), sm2 = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3f7cc8) }, hor: { value: HORIZON } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.32)), 1.0); }' });
    const sky = new THREE.Mesh(sg, sm2); sky.renderOrder = -1; scene.add(sky);
    // a few soft cloud puffs
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      s.position.set(-300 + hash(i) * 600, 140 + hash(i * 3) * 120, -600 - hash(i * 7) * 150); s.scale.set(160 + hash(i * 5) * 160, 50 + hash(i * 9) * 30, 1); scene.add(s); } }
  // far mountains (hazy)
  { const mm = new THREE.MeshStandardMaterial({ color: 0x8e9fb8, roughness: 1, envMapIntensity: 0.3 });
    [[-160, -620, 150, 120], [40, -700, 200, 150], [220, -640, 160, 110], [-20, -560, 110, 80]].forEach(([x, z, r, h]) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.55, 24, 1), mm); m.position.set(x, h * 0.275 - 5, z); scene.add(m); }); }

  // ---------- light: low warm sun from the left, sky fill
  const SUN = V(-0.66, 0.4, 0.3).normalize();
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', V(-0.62, 0.52, 0.35), 40);
  const sun = new THREE.DirectionalLight(0xffc98a, 3.6); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xc4d8ff, 0x5a5a38, 0.22));

  // ---------- a rounded box (soft bevels catch the light like the reference's stone slabs)
  function rbox(w, h, d, r, seg = 4) {
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); inner.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
      v.sub(inner); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r); v.add(inner); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }
  const STONE = (() => { const t = B.procTex(256, (u, v) => { const n = B.fbm(u, v, 8, 4), l = 205 + 30 * n; return [l, l * 0.965, l * 0.91, n]; }, 1.2, [1, 1]);
    return new THREE.MeshStandardMaterial({ color: 0xe2d9c8, envMapIntensity: 0.5, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.88 }); })();

  // ---------- the bridge: three slabs on two pillars
  const BZ = 0, deckY = 0.34;
  const bx0 = rx(BZ);
  [-4.1, 0, 4.1].forEach((dx, i) => { const s = new THREE.Mesh(rbox(4.0, 0.45, 1.7, 0.07), STONE); s.position.set(bx0 + dx, deckY - 0.225, BZ); s.rotation.y = (hash(i) - 0.5) * 0.01; B.shadowed(s); scene.add(s); });
  const REFL = new THREE.MeshBasicMaterial({ color: 0x6f8a84, transparent: true, opacity: 0.55, fog: true });
  [-2.05, 2.05].forEach(dx => { const p = new THREE.Mesh(rbox(0.7, 2.7, 0.7, 0.05), STONE); p.position.set(bx0 + dx, DEEP + 1.35 - 0.1, BZ); B.shadowed(p); scene.add(p);
    const r = new THREE.Mesh(rbox(0.7, 1.9, 0.7, 0.05), REFL); r.position.set(bx0 + dx, WATER - 0.97, BZ); scene.add(r); });   // reflection
  { const r = new THREE.Mesh(rbox(12.2, 0.45, 1.7, 0.06), REFL); r.position.set(bx0, WATER - (deckY - WATER) - 0.05, BZ); scene.add(r); }

  // ---------- grass: tapered, slightly bent blades, dark at the root, light at the tip; flowers; rocks + reeds on the banks
  const blade = (() => { const g = new THREE.PlaneGeometry(0.05, 0.36, 1, 4); g.translate(0, 0.18, 0); const p = g.attributes.position, cl = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36; p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.08); cl.push(0.35 + 0.65 * y, 0.35 + 0.65 * y, 0.35 + 0.65 * y); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.computeVertexNormals(); return g; })();
  const GM = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Color();
  function scatter(geo, mat, n, pick, pose, color) {
    const im = new THREE.InstancedMesh(geo, mat, n); let c = 0;
    for (let i = 0; c < n && i < n * 8; i++) { const P = pick(i); if (!P) continue; const [x, z] = P, y = hAt(x, z);
      const [rot, sc] = pose(i); Q.setFromEuler(E.set(rot[0], rot[1], rot[2])); M4.compose(V(x, y, z), Q, V(sc[0], sc[1], sc[2])); im.setMatrixAt(c, M4);
      if (color) im.setColorAt(c, color(i, C)); c++; }
    im.count = c; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im;
  }
  const meadow = (i, near) => { const r = near ? 2 + 28 * Math.pow(hash(i * 1.37), 1.6) : 6 + 70 * hash(i * 1.37), a = hash(i * 2.11) * Math.PI * 2;
    const x = 0.8 + Math.cos(a) * r, z = 3 + Math.sin(a) * r * (near ? 1 : 2.2) - (near ? 6 : 30), d = Math.abs(x - rx(z));
    return d > TOP + 0.15 && !pathD(d) ? [x, z] : null; };
  scatter(blade, GM, 140000, i => meadow(i, true), i => [[(hash(i * 3) - 0.5) * 0.5, hash(i * 5) * 6.28, (hash(i * 7) - 0.5) * 0.5], [1, 0.7 + hash(i * 11) * 0.9, 1]],
    (i, c) => c.setHSL(0.22 + 0.06 * hash(i * 13), 0.55, 0.34 + 0.12 * hash(i * 17)));
  scatter(blade, GM, 90000, i => meadow(i + 1e6, false), i => [[0, hash(i * 5) * 6.28, 0], [1.4, 0.8 + hash(i * 11) * 0.8, 1.4]],
    (i, c) => c.setHSL(0.22 + 0.05 * hash(i * 13), 0.5, 0.34 + 0.1 * hash(i * 17)));
  const FL = [0xffffff, 0xfff1a8, 0xffc8e0, 0xffffff];
  scatter(new THREE.IcosahedronGeometry(0.035, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 5000, i => meadow(i + 3e6, true),
    i => [[0, 0, 0], [1, 1, 1]], (i, c) => c.set(FL[i % 4])).position.y = 0.32;
  // reeds at the water's edge, rocks on the banks
  const bank = (i, dmin, dmax) => { const z = 8 - hash(i * 1.7) * 120, side = hash(i * 2.3) < 0.5 ? -1 : 1, d = dmin + (dmax - dmin) * hash(i * 3.1); return [rx(z) + side * d, z]; };
  scatter(blade, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, color: 0xa8b860 }), 2600, i => bank(i, HALF - 0.1, HALF + 0.4),
    i => [[(hash(i) - 0.5) * 0.3, hash(i * 5) * 6.28, 0], [1.5, 2.2 + hash(i * 7) * 1.5, 1.5]]);
  { const rg = new THREE.IcosahedronGeometry(0.2, 2); scatter(rg, new THREE.MeshStandardMaterial({ color: 0xb4aea2, roughness: 0.8 }), 260, i => bank(i + 99, HALF + 0.2, TOP),
      i => [[hash(i) * 3, hash(i * 2) * 3, 0], [0.6 + hash(i * 3), 0.5 + hash(i * 4) * 0.6, 0.6 + hash(i * 5)]]).castShadow = true; }

  // ---------- trees: weeping willows (dome + hanging strands) and smooth cypresses, in rows along both banks
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.9 });
  const wDomeM = new THREE.MeshStandardMaterial({ color: 0x5f7f30, roughness: 0.9 });
  const strandM = new THREE.MeshStandardMaterial({ color: 0xa8c254, roughness: 0.8, side: THREE.DoubleSide });
  const cypM = new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: 0.85 });
  const cypG = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(Math.max(0.02, 1.15 * Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62 + 0.25), 1.4) * (1 - u * 0.75)), u * 7)); }
    const g = new THREE.LatheGeometry(pts, 20); g.translate(0, 1.2, 0); return g; })();
  const domeG = (() => { const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3();   // lumpy leafy crown
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.16 * (B.fbm(v.x * 0.9 + 2, v.z * 0.9 + v.y * 0.7 + 5, 4, 3) - 0.5) * 2 + 0.05 * (hash(i) - 0.5); if (v.y < -0.1) v.y *= 0.3; v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g; })();
  const strandG = new THREE.PlaneGeometry(0.11, 1, 1, 4); strandG.translate(0, -0.5, 0); { const p = strandG.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (0.25 + 0.75 * (1 + p.getY(i)))); strandG.computeVertexNormals(); }   // tapers to a tip
  const willows = [], cyps = [];
  for (let i = 0; i < 70; i++) { const z = 6 - i * 3.2 - hash(i) * 2, side = i % 2 ? 1 : -1, d = 7.5 + hash(i * 3) * 6 + (i % 4 < 2 ? 0 : 5);
    const x = rx(z) + side * d; if (z > -6 && Math.abs(x - 0.8) < 9) continue; (hash(i * 7) < 0.55 ? willows : cyps).push([x, hAt(x, z), z, 0.85 + 0.4 * hash(i * 9)]); }
  for (let i = 0; i < 40; i++) { const z = -10 - hash(i * 4.4) * 140, x = (hash(i * 5.5) < 0.5 ? -1 : 1) * (22 + hash(i * 6.6) * 30); cyps.push([x + rx(z), hAt(x + rx(z), z), z, 0.8 + 0.5 * hash(i)]); }
  const tIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1, 8), trunkM, willows.length + cyps.length), dIM = new THREE.InstancedMesh(domeG, wDomeM, willows.length * 3), cIM = new THREE.InstancedMesh(cypG, cypM, cyps.length);
  const NS = 480, sIM = new THREE.InstancedMesh(strandG, strandM, willows.length * NS);
  willows.forEach(([x, y, z, s], i) => {
    M4.compose(V(x, y + 1.5 * s, z), Q.identity(), V(s, 3 * s, s)); tIM.setMatrixAt(i, M4);
    const top = y + 3.2 * s, R = 2.3 * s; for (let q = 0; q < 3; q++) { const a = hash(i * 5 + q) * 6.28, o = q ? R * 0.38 : 0, rs = q ? 0.68 : 1; M4.compose(V(x + Math.cos(a) * o, top + (q ? 0.5 * s : 0), z + Math.sin(a) * o), Q.identity(), V(R * rs, 1.5 * s * rs * 1.1, R * rs));
      dIM.setMatrixAt(i * 3 + q, M4); dIM.setColorAt(i * 3 + q, C.setHSL(0.2 + 0.03 * hash(i + q), 0.42, 0.36 + 0.07 * hash(i * 2 + q))); }
    for (let j = 0; j < NS; j++) { const a = hash(i * 31 + j) * 6.283, rr = R * (0.35 + 0.68 * Math.sqrt(hash(i * 17 + j * 3))), hy = top + 1.5 * s * Math.sqrt(Math.max(0, 1 - (rr / R) ** 2)) * 0.85;
      M4.compose(V(x + Math.cos(a) * rr, hy, z + Math.sin(a) * rr), Q.setFromEuler(E.set(0.1 + 0.08 * hash(j * 13 + i), -a + Math.PI / 2, (hash(j * 19 + i) - 0.5) * 0.1, 'YXZ')), V(1, Math.max(0.6, (hy - y) * (0.25 + 0.65 * Math.pow(hash(j * 7 + i), 0.7))), 1)); sIM.setMatrixAt(i * NS + j, M4);
      sIM.setColorAt(i * NS + j, C.setHSL(0.2 + 0.04 * hash(j + i), 0.42, 0.3 + 0.2 * hash(j * 3 + i))); } });
  cyps.forEach(([x, y, z, s], i) => { M4.compose(V(x, y + 0.6 * s, z), Q.identity(), V(s, 1.2 * s, s)); tIM.setMatrixAt(willows.length + i, M4);
    M4.compose(V(x, y, z), Q.identity(), V(s, s * (0.9 + 0.4 * hash(i * 3)), s)); cIM.setMatrixAt(i, M4); cIM.setColorAt(i, C.setHSL(0.25 + 0.03 * hash(i), 0.32, 0.3 + 0.08 * hash(i * 5))); });
  [tIM, dIM, cIM, sIM].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
  // two small white farmhouses far left
  [[-26, -38], [-34, -70]].forEach(([x, z], i) => { const h = new THREE.Group(); const b = new THREE.Mesh(rbox(5, 3, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.9 }));
    b.position.y = 1.5; const r = new THREE.Mesh(new THREE.ConeGeometry(3.9, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x8a95a0, roughness: 0.8 })); r.position.y = 3.9; r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.8);
    h.add(b, r); h.position.set(x, hAt(x, z), z); h.rotation.y = 0.3 * i; B.shadowed(h); scene.add(h); });

  // ---------- the hero (Remy, red shirt, backpack + bedroll) walking over the bridge
  let hero = null, mixer = null, act = null;
  B.fbx('mixamo/Walking.fbx', obj => {
    obj.scale.setScalar(0.01); obj.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(obj, true); obj.scale.multiplyScalar(1.78 / (bb.max.y - bb.min.y));
    obj.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map(mm => { const top = /top|shirt|torso|jacket|hood|sweat/i.test(mm.name), bot = /bottom|pant|jean|trouser|short/i.test(mm.name);
        return new THREE.MeshStandardMaterial({ map: top || bot ? null : mm.map, normalMap: mm.normalMap || null, color: top ? 0xd8301e : bot ? 0x2e3440 : 0xffffff, roughness: 0.8 }); });
      m.material = Array.isArray(m.material) ? mats : mats[0]; } });
    let spine = null; obj.traverse(b => { if (b.isBone && /Spine2$/.test(b.name)) spine = b; });
    if (spine) { const s = 1 / obj.scale.x, pack = new THREE.Group();
      const bag = new THREE.Mesh(rbox(0.36, 0.46, 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xc07a3a, roughness: 0.85 })); bag.position.set(0, 0.02, -0.2);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 14), new THREE.MeshStandardMaterial({ color: 0x3a6ec0, roughness: 0.7 })); roll.rotation.z = Math.PI / 2; roll.position.set(0, -0.26, -0.22);
      pack.add(bag, roll); pack.scale.setScalar(s); B.shadowed(pack); spine.add(pack); }
    hero = new THREE.Group(); hero.add(obj); scene.add(hero);
    mixer = new THREE.AnimationMixer(obj); const cl = obj.animations[0]; cl.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
    act = mixer.clipAction(cl); act.play();
  });

  // ---------- camera: eye level, 3/4, ~5 m from the bridge, the river leading the eye to the hills
  function update(t) {
    const hx = bx0 - 3.2 + t * 1.25;
    if (hero) { hero.position.set(hx, deckY, BZ + 0.1); hero.rotation.y = Math.PI / 2; act.time = (t * 1.0) % act.getClip().duration; mixer.update(0); }
    const P = V(bx0 + 0.2 + t * 0.1, 2.3, 9.6), T = V(bx0 - 1.6 + t * 0.1, -1.2, -14);
    cam.position.copy(P); cam.lookAt(T); cam.fov = 44; cam.near = 0.1; cam.far = 2000; cam.updateProjectionMatrix();
    sun.target.position.set(bx0, 0, -8); sun.position.copy(sun.target.position).add(SUN.clone().multiplyScalar(120));
    Object.assign(B.POST, { focus: P.distanceTo(V(hx, 1, BZ)), aperture: 0.16, maxBlur: 9, bloom: 0.18, thr: 1.3, sat: 1.14, con: 1.14, exp: 0.95, ao: 1.2, aoR: 0.7, mb: [0, 0] });
  }
  const dimEnv = () => scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) o.material.envMapIntensity = 0.4; });
  B.run({ ready: dimEnv, update, overlay: () => B.vignette(0.1), captions: 'center', captionOpts: { font: 'Poppins', size: 64, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    hdriBackground: false, scenes: [['Look test', 0, DUR]], warm: [1] });
})();
