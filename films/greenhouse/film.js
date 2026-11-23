// "Greenhouse": one plot of crops in a field. Every problem hits the plants; every fix is built on the spot, in frame:
// stakes + clear sheets -> steel arches + X bracing + concrete feet + closed sides -> heater + sensor -> roof/side vents ->
// drip hoses -> drain channel -> fertilizer tank -> insect screen -> circulation fans -> partitions + wet wall + fan ->
// a pollinating trolley -> bee boxes -> gutters, sensors, a farmer's hat. No people, no cutaways.
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const c = (l, w, n) => cue(l, w, n), L0 = id => LN(id).t0;
  const T = {
    hail: c('hook', 'hail'), city: c('hook', 'city'),
    poly0: L0('poly'), stakes: c('poly', 'stakes'), sheets: c('poly', 'transparent'), sunl: c('poly', 'sunlight'), hail2: c('poly', 'hail'), poly2: L0('poly2'),
    wind0: L0('wind'), storm: c('wind', 'storm'), under: c('wind', 'underneath'), rips: c('wind', 'rips'), wdie: c('wind', 'die'),
    brace0: L0('brace'), arches: c('brace', 'arches'), xbars: c('brace', 'xshaped'), bracing: c('brace', 'bracing'),
    feet0: L0('feet'), feet: c('feet', 'feet'), conc: c('feet', 'concrete'), close: c('feet', 'close'), sides: c('feet', 'sides'), gust: c('feet', 'wind'),
    cold0: L0('cold'), freeze: c('cold', 'freeze'),
    heat0: L0('heat'), heater: c('heat', 'heater'), sensor: c('heat', 'sensor'), auto: c('heat', 'automatically'), drops: c('heat', 'drops'), off: c('heat', 'off'), thermo: c('heat', 'thermostat'),
    hot0: L0('hot'), sun: c('hot', 'sun'), unb: c('hot', 'unbearable'), car: c('hot', 'car'), light: c('hot', 'light'), intoHeat: c('hot', 'heat', 1), cant: c('hot', "can't"), hdie: c('hot', 'die'),
    sky0: L0('sky'), windows: c('sky', 'windows'), sides2: c('sky', 'sides'), rise: c('sky', 'rise'), below: c('sky', 'below'), skyl: c('sky', 'skylights'),
    dry0: L0('dry'), dries: c('dry', 'dries'), drip0: L0('drip'), hoses: c('drip', 'hoses'), drip: c('drip', 'drip'), roots: c('drip', 'roots'),
    rot0: L0('rot'), rot: c('rot', 'rot'), drain0: L0('drain'), drain: c('drain', 'drain'), drainage: c('drain', 'drainage'),
    weak0: L0('weak'), yellow: c('weak', 'yellow'), fert0: L0('fert'), fert: c('fert', 'fertilizer'), drop: c('fert', 'drop'), fertig: c('fert', 'fertigation'),
    bugs0: L0('bugs'), insects: c('bugs', 'insects'), leaves: c('bugs', 'leaves'), screen0: L0('screen'), screen: c('screen', 'screen'), scant: c('screen', "can't"), sins: c('screen', 'insect'),
    mold0: L0('mold'), vapor: c('mold', 'vapor'), night: c('mold', 'night'), mold: c('mold', 'mold'), fans0: L0('fans'), fins: c('fans', 'inside'), fans: c('fans', 'fans'),
    zone0: L0('zone'), hate: c('zone', 'hate'), sector0: L0('sector'), rooms: c('sector', 'rooms'), fan: c('sector', 'fan'), wet: c('sector', 'wet'), cool: c('sector', 'cool'), sectors: c('sector', 'sectors'),
    pollen0: L0('pollen'), flowers: c('pollen', 'flowers'), vib0: L0('vib'), vibr: c('vib', 'vibrator'), cluster: c('vib', 'cluster'), spreads: c('vib', 'spreads'), vpoll: c('vib', 'pollination'),
    bees0: L0('bees'), bscreen: c('bees', 'screen'), bdie: c('bees', 'die'), hive0: L0('hive'), boxes: c('hive', 'boxes'), polli: c('hive', 'pollinate'),
    add0: L0('add'), gutters: c('add', 'gutters'), sensors: c('add', 'sensors'), hat: c('add', 'hat'), end0: L0('end'),
  };

  // ---------- the field (flat around the plot, low hills far away)
  const hAt = (x, z) => { const r = Math.hypot(x, z); return r < 45 ? 0 : 7 * sm(k(r, 45, 160)) * B.fbm(x / 90 + 2, z / 90 + 5, 8, 3); };
  const GW = 6, GZ = 10, EH = 2.6, RH = 5.0;                    // half width, half length, eave height, ridge height
  const roofY = x => EH + (RH - EH) * Math.sqrt(Math.max(0, 1 - (x / GW) * (x / GW)));
  {
    const geo = new THREE.PlaneGeometry(400, 400, 260, 260); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); p.setY(i, hAt(x, z));
      const n = B.fbm(x / 7 + 5, z / 7 + 2, 8, 3);
      if (Math.abs(x) < 8.5 && Math.abs(z) < 12.5) cc.setHSL(0.09, 0.16, lerp(0.5, 0.58, n));                  // gravel pad around the plot
      else if (Math.abs(x - 1.5) < 1.6 && z > 12 && z < 60) cc.setHSL(0.09, 0.2, lerp(0.46, 0.54, n));          // the farm track
      else cc.setHSL(lerp(0.2, 0.25, n), 0.5, lerp(0.28, 0.38, n));                                             // meadow
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
  }

  // ---------- sky, haze, far hills, light
  scene.fog = new THREE.Fog(0xc9d2dc, 120, 900);
  const skyU = { top: { value: new THREE.Color(0x3f7cc8) }, hor: { value: new THREE.Color(0xe8dfd6) } };
  { const sm2 = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.32)), 1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), sm2); sky.renderOrder = -1; scene.add(sky);
    const mm = new THREE.MeshStandardMaterial({ color: 0x8e9fb8, roughness: 1, envMapIntensity: 0.3 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, r = 160 + 110 * hash(i * 7), h = 40 + 50 * hash(i * 2); const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), mm); m.position.set(Math.cos(a) * 760, h / 2 - 30, Math.sin(a) * 760); scene.add(m); } }
  const clouds = []; for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    const a = hash(i * 3.3) * 6.283; s.position.set(Math.cos(a) * 850, 200 + hash(i * 3) * 160, Math.sin(a) * 850); s.scale.set(260 + hash(i * 5) * 200, 70 + hash(i * 9) * 40, 1); scene.add(s); clouds.push(s); }
  const SUN = V(0.55, 0.62, 0.45).normalize();
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', SUN, 40);
  const sun = new THREE.DirectionalLight(0xffd8aa, 3.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xc4d8ff, 0x5a5a38, 0.38); scene.add(hemi);

  // ---------- helpers + materials
  function rbox(w, h, d, r, seg = 2) {
    const gq = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = gq.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); inner.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(inner); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r); v.add(inner); p.setXYZ(i, v.x, v.y, v.z); }
    gq.computeVertexNormals(); return gq;
  }
  const noiseTex = (base, amt, P = 8) => B.procTex(256, (u, v) => { const n = B.fbm(u, v, P, 4), l = base + amt * n; return [l, l * 0.98, l * 0.95, n]; }, 1.2, [1, 1]);
  const CT = noiseTex(200, 40);
  const CONC = new THREE.MeshStandardMaterial({ color: 0xc4c0b8, map: CT.map, normalMap: CT.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.92, envMapIntensity: 0.45 });
  const GLASS = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.2, roughness: 0.06, envMapIntensity: 1.3 });
  const WOOD = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.8, envMapIntensity: 0.4 });
  const GALV = new THREE.MeshStandardMaterial({ color: 0xc2c8ce, metalness: 0.75, roughness: 0.32, envMapIntensity: 0.9 });
  const DARK = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.6, envMapIntensity: 0.4 });
  const WHITE = new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.5, envMapIntensity: 0.5 });
  const sh = o => B.shadowed(o);
  const stripeTex = (r, gg, b) => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = `rgba(${r},${gg},${b},0.55)`; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * hash(i * 3)})`; x.fillRect(hash(i) * 64, hash(i * 7) * 256, 1 + 2 * hash(i * 5), 14 + 40 * hash(i * 9)); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const WATERT = stripeTex(140, 190, 230), MUDT = stripeTex(150, 120, 80);
  // a water ribbon lying on the floor along a polyline [[x, z], ...] at height y
  function ribbon(pts, w, y, tex) {
    const P = [], uv = [], idx = []; let L = 0;
    pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) L += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
      [-1, 1].forEach(s => { P.push(q[0] + nx * w / 2 * s, y, q[1] + nz * w / 2 * s); uv.push((s + 1) / 2, L / 3); });
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } });
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gq.setIndex(idx);
    const tx = (tex || WATERT).clone(); tx.needsUpdate = true;
    const m = new THREE.Mesh(gq, new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 2; scene.add(m); return m;
  }
  const flow = (rb, t, speed, op) => { rb.visible = op > 0.01; rb.material.opacity = op; rb.material.map.offset.y = -t * speed / 3; };
  const line = (a, b, n = 24, fn) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [lerp(a[0], b[0], u) + (fn ? fn(u) : 0), lerp(a[1], b[1], u)]; });
  const reveal = (m, u) => { m.visible = u > 0.002; const n = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor(clamp(u) * n / 6) * 6); };

  // ---------- the plot: 6 raised soil beds along z, a dark ground mat between them
  const ROWS = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5];              // x < 0: strawberries (need bees), x > 0: tomatoes (self-pollinating)
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW - 0.2, 2 * GZ - 0.2), new THREE.MeshStandardMaterial({ color: 0x8a7e6c, roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = 0.015; mat.receiveShadow = true; scene.add(mat);
  const ST = noiseTex(110, 40, 20);
  const SOIL = new THREE.MeshStandardMaterial({ color: 0x6a4a32, map: ST.map, normalMap: ST.normalMap, roughness: 0.95, envMapIntensity: 0.3 });
  const crackTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); x.clearRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(40,26,14,0.95)'; x.lineWidth = 2.2;
    for (let i = 0; i < 46; i++) { let px = hash(i * 3) * 256, py = hash(i * 7) * 256; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (hash(i * 11 + j) - 0.5) * 60; py += (hash(i * 13 + j) - 0.5) * 60; x.lineTo(px, py); } x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 18); return t; })();
  const BEDS = ROWS.map(x => { const b = new THREE.Mesh(rbox(1.0, 0.22, 18.4, 0.04), SOIL); b.position.set(x, 0.11, 0); b.receiveShadow = true; scene.add(b);
    const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 18.3), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    ck.rotation.x = -Math.PI / 2; ck.position.set(x, 0.225, 0); scene.add(ck); return { b, ck }; });

  // ---------- the plants (instanced): one bush per spot, recoloured / squashed by each problem, healed by each fix
  const PL = []; ROWS.forEach((x, r) => { for (let z = -8.4; z <= 8.41; z += 0.7) PL.push({ x: x + (hash(PL.length * 3.1) - 0.5) * 0.08, z, r, tom: x > 0, i: PL.length }); });
  // real-looking plants: leaf cards (a drawn leaf with see-through edges) on a stem. Tomato: a tall stem with compound leaves
  // spiralling up it; strawberry: a low rosette of three-part leaves on stalks. The texture is grey; each plant's colour tints it.
  const ATL = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'); x.clearRect(0, 0, 512, 256);
    const leaflet = (cx, cy, len, wid, ang, lum) => { x.save(); x.translate(cx, cy); x.rotate(ang); x.beginPath(); const N = 22;
      for (let i = 0; i <= N; i++) { const u = i / N, a = u * Math.PI, r = wid * Math.sin(a) * (1 - 0.25 * u) * (1 + 0.08 * (i % 2)); x.lineTo(r, -len * u); }
      for (let i = N; i >= 0; i--) { const u = i / N, a = u * Math.PI, r = wid * Math.sin(a) * (1 - 0.25 * u) * (1 + 0.08 * (i % 2)); x.lineTo(-r, -len * u); }
      x.closePath(); const gr = x.createLinearGradient(-wid, 0, wid, 0); gr.addColorStop(0, `rgb(${lum - 40},${lum - 40},${lum - 40})`); gr.addColorStop(0.5, `rgb(${lum},${lum},${lum})`); gr.addColorStop(1, `rgb(${lum - 30},${lum - 30},${lum - 30})`);
      x.fillStyle = gr; x.fill(); x.strokeStyle = 'rgba(120,120,120,0.9)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -len * 0.92); x.stroke();
      x.lineWidth = 0.9; for (let i = 1; i < 6; i++) { const u = i / 6; [-1, 1].forEach(sg => { x.beginPath(); x.moveTo(0, -len * u); x.lineTo(sg * wid * 0.7 * Math.sin(u * Math.PI), -len * (u + 0.1)); x.stroke(); }); }
      x.restore(); };
    // tomato compound leaf in [0,256): rachis bottom-centre to top, 3 pairs of leaflets + a tip
    x.strokeStyle = '#9a9a9a'; x.lineWidth = 5; x.beginPath(); x.moveTo(128, 254); x.lineTo(128, 30); x.stroke();
    [[206, 84, 46], [146, 76, 42], [90, 64, 36]].forEach(([y, l, w], i) => { leaflet(126, y, l, w, -1.05 - i * 0.1, 225 - i * 6); leaflet(130, y, l, w, 1.05 + i * 0.1, 220 - i * 6); });
    leaflet(128, 50, 62, 36, 0, 230);
    // strawberry three-part leaf in [256,384)
    [[0, 232], [-0.9, 220], [0.9, 218]].forEach(([a, l]) => leaflet(320, 240, 118, 60, a, l));
    // stem strip in [384,512)
    x.fillStyle = '#b4b4a4'; x.fillRect(388, 0, 120, 256);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const UV = { tom: [0, 0.5], str: [0.5, 0.75], stem: [0.76, 0.99] };
  function plantGeo(tom) {
    const P = [], U = [], I = [];
    const quad = (pts, uv) => { const o = P.length / 3; pts.forEach(p => P.push(p.x, p.y, p.z)); U.push(...uv); I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); };
    // a bending card: from base along dir, width side, n segments, each turning down by droop
    const card = (base, dir, side, len, wid, [u0, u1], droop, n = 3) => { let a = base.clone(), d = dir.clone().normalize(); const axis = side.clone().normalize();
      for (let i = 0; i < n; i++) { const b = a.clone().addScaledVector(d, len / n), v0 = i / n, v1 = (i + 1) / n;
        quad([a.clone().addScaledVector(axis, -wid / 2), a.clone().addScaledVector(axis, wid / 2), b.clone().addScaledVector(axis, -wid / 2), b.clone().addScaledVector(axis, wid / 2)], [u0, v0, u1, v0, u0, v1, u1, v1]);
        d.applyAxisAngle(axis, droop); a = b; } };
    if (tom) {
      const H = 1.3; [0, Math.PI / 2].forEach(r => card(V(0, 0, 0), V(0, 1, 0), V(Math.cos(r), 0, Math.sin(r)), H, 0.035, UV.stem, 0, 1));
      for (let i = 0; i < 22; i++) { const h = 0.08 + i * 0.054, a = i * 2.4, out = V(Math.cos(a), 0, Math.sin(a)), dir = out.clone().multiplyScalar(0.9).add(V(0, 0.55 - i * 0.02, 0));
        const side = V(-Math.sin(a), 0, Math.cos(a)), len = 0.58 - i * 0.012;
        card(V(0, h, 0), dir, side, len, len * 0.75, UV.tom, -0.3, 3); }
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; card(V(0, H - 0.05, 0), V(Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4), V(-Math.sin(a), 0, Math.cos(a)), 0.2, 0.13, UV.tom, -0.2, 2); }
    } else {
      for (let i = 0; i < 14; i++) { const a = i * 2.4 + hash(i) * 0.3, out = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a)), r = 0.07 + 0.05 * (i % 3), h = 0.1 + 0.05 * (i % 3);
        card(V(0, 0, 0), out.clone().multiplyScalar(r).add(V(0, h, 0)), side, Math.hypot(r, h), 0.02, UV.stem, 0, 1);
        card(V(out.x * r, h, out.z * r), out.clone().add(V(0, 0.35, 0)), side, 0.19, 0.2, UV.str, -0.45, 2); }
    }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); gq.setIndex(I); gq.computeVertexNormals(); return gq;
  }
  const LEAFM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ATL, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.65, envMapIntensity: 0.5 });
  const PT = PL.filter(p => p.tom), PS = PL.filter(p => !p.tom); PT.forEach((p, j) => p.k = j); PS.forEach((p, j) => p.k = j);
  const tomI = new THREE.InstancedMesh(plantGeo(true), LEAFM, PT.length), strI = new THREE.InstancedMesh(plantGeo(false), LEAFM, PS.length);
  [tomI, strI].forEach(m => { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
  const LT = B.procTex(256, (u, v) => { const n = B.fbm(u, v, 24, 4), l = 150 + 105 * n; return [l, l, l, n]; }, 2.0, [1, 1]);
  const stakesT = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0xc8b07a, roughness: 0.8 }), PL.length);
  { const M = new THREE.Matrix4(); let n = 0; PL.forEach(p => { if (!p.tom) return; M.makeTranslation(p.x + 0.06, 0.75 + 0.2, p.z + 0.03); stakesT.setMatrixAt(n++, M); }); stakesT.count = n; stakesT.castShadow = true; scene.add(stakesT); }
  // flowers (yellow on tomatoes, white on strawberries) and fruit (red), 4 per plant
  const FLW = []; PL.forEach(p => { for (let j = 0; j < 4; j++) { const a = hash(p.i * 7 + j) * 6.283, h = p.tom ? 0.5 + 0.65 * hash(p.i + j * 3) : 0.3 + 0.1 * hash(p.i + j);
    const r = p.tom ? 0.15 : 0.22; FLW.push({ p, x: p.x + Math.cos(a) * r, y: h, z: p.z + Math.sin(a) * r * 0.8, j }); } });
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x222200 }), FLW.length);
  const fruit = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, envMapIntensity: 0.8 }), FLW.length);
  flowers.frustumCulled = fruit.frustumCulled = false; fruit.castShadow = true; scene.add(flowers, fruit);

  // ---------- 1) stakes around the plot + clear sheets laid on top (the first try)
  const STK = []; { const pts = []; for (let z = -GZ; z <= GZ + 0.01; z += 2.5) pts.push([-GW, z], [GW, z]); [-3, 0, 3].forEach(x => pts.push([x, -GZ], [x, GZ]));
    pts.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    pts.forEach(([x, z], i) => { const gq = new THREE.CylinderGeometry(0.07, 0.08, 2.7, 8); gq.translate(0, 1.35, 0); const m = new THREE.Mesh(gq, WOOD); m.position.set(x, 0, z); m.castShadow = true; scene.add(m); STK.push({ m, x, z, t0: i / pts.length }); }); }
  const SHEETM = new THREE.MeshStandardMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.32, roughness: 0.06, metalness: 0.1, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const SHEETS = [-7.5, -2.5, 2.5, 7.5].map((z, i) => { const gq = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(2 * GW + 0.3, 0.03, 5.0), SHEETM); gq.add(p);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2 * GW + 0.3, 0.06, 0.08), GALV); fr.position.z = 2.46; gq.add(fr); const fr2 = fr.clone(); fr2.position.z = -2.46; gq.add(fr2);
    scene.add(gq); return { gq, z, i }; });

  // ---------- 2) the steel greenhouse: 9 arches, purlins, X braces, concrete feet, the polycarbonate cover
  const AZ = Array.from({ length: 9 }, (_, i) => -GZ + i * 2.5);
  const profile = (n = 28) => { const P = [V(-GW, 0, 0), V(-GW, EH * 0.5, 0), V(-GW, EH, 0)];
    for (let i = 1; i < n; i++) { const a = Math.PI - i / n * Math.PI; P.push(V(GW * Math.cos(a), EH + (RH - EH) * Math.sin(a), 0)); }
    P.push(V(GW, EH, 0), V(GW, EH * 0.5, 0), V(GW, 0, 0)); return P; };
  const ARCHES = AZ.map(z => { const pts = profile().map(p => p.setZ(z)); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 160, 0.06, 8), GALV);
    m.castShadow = true; scene.add(m); return m; });
  const tubeAB = (a, b, r = 0.04) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 8, r, 6), GALV); m.castShadow = true; scene.add(m); return m; };
  const arcPt = (a, z) => V(GW * Math.cos(a), EH + (RH - EH) * Math.sin(a), z);
  const PURL = [0.0, 0.5, 1.0, 1.571, 2.14, 2.64, Math.PI].map(a => tubeAB(arcPt(a, -GZ), arcPt(a, GZ), 0.035));
  const XB = []; [[-GZ, -GZ + 2.5], [GZ - 2.5, GZ]].forEach(([z0, z1]) => { [-GW, GW].forEach(x => { XB.push(tubeAB(V(x, 0.1, z0), V(x, EH, z1)), tubeAB(V(x, EH, z0), V(x, 0.1, z1))); });
    XB.push(tubeAB(arcPt(2.4, z0), arcPt(0.74, z1)), tubeAB(arcPt(0.74, z0), arcPt(2.4, z1))); });
  const FEET = []; AZ.forEach(z => [-GW, GW].forEach(x => { const m = new THREE.Mesh(rbox(0.6, 0.5, 0.6, 0.04), CONC); m.castShadow = m.receiveShadow = true; scene.add(m); FEET.push({ m, x, z }); }));
  // the cover: ribbed polycarbonate; built z-major so it can roll on from the back to the front. The band right of the ridge is the roof vent.
  const ribTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#c8d4de'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 2, 64); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; })();
  const COVM = new THREE.MeshStandardMaterial({ color: 0xeef6ff, map: ribTex, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.05, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const VA0 = Math.PI / 2 - 0.36, VA1 = Math.PI / 2;            // roof vent band (angles of the arch)
  function coverGeo(a0, a1, na) { const NZ = 40, P = [], uv = [], idx = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= na; i++) { const a = lerp(a0, a1, i / na), q = arcPt(a, lerp(-GZ, GZ, j / NZ)); P.push(q.x, q.y, q.z); uv.push(i / na, j / NZ); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i; idx.push(a, a + 1, a + na + 1, a + 1, a + na + 2, a + na + 1); }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gq.setIndex(idx); gq.computeVertexNormals(); return gq; }
  const covers = [coverGeo(VA1, Math.PI, 24), coverGeo(0, VA0, 18)].map(gq => { const m = new THREE.Mesh(gq, COVM); m.renderOrder = 4; scene.add(m); return m; });
  // the walls: a fixed strip at the bottom + a roll-up curtain (side vents); end walls with a door frame
  const WALLS = [-1, 1].map(s => { const fix = new THREE.Mesh(new THREE.PlaneGeometry(2 * GZ, 0.45), COVM); fix.rotation.y = Math.PI / 2; fix.position.set(s * GW, 0.225, 0); fix.renderOrder = 4; scene.add(fix);
    const cg = new THREE.PlaneGeometry(2 * GZ, EH - 0.45); cg.translate(0, -(EH - 0.45) / 2, 0); const cur = new THREE.Mesh(cg, COVM); cur.rotation.y = Math.PI / 2; cur.position.set(s * GW, EH, 0); cur.renderOrder = 4; scene.add(cur);
    const rg = new THREE.CylinderGeometry(0.07, 0.07, 2 * GZ, 10); rg.rotateX(Math.PI / 2); const roll = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.4 })); roll.position.set(s * (GW + 0.08), 0.45, 0); scene.add(roll);
    return { s, fix, cur, roll }; });
  const endShape = (() => { const sp = new THREE.Shape(); sp.moveTo(-GW, 0); sp.lineTo(-GW, EH); for (let i = 1; i <= 28; i++) { const a = Math.PI - i / 28 * Math.PI; sp.lineTo(GW * Math.cos(a), EH + (RH - EH) * Math.sin(a)); } sp.lineTo(GW, 0); sp.lineTo(-GW, 0); return sp; })();
  const ENDS = [-GZ, GZ].map(z => { const m = new THREE.Mesh(new THREE.ShapeGeometry(endShape), COVM); m.position.z = z; m.renderOrder = 4; scene.add(m); return m; });
  const door = new THREE.Group(); scene.add(door); [[-0.9, 1.1, 0.08, 2.2], [0.9, 1.1, 0.08, 2.2], [0, 2.2, 1.88, 0.08]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), WHITE); m.position.set(x, y, GZ + 0.02); door.add(m); });
  // the roof vents: 4 hinged panels at the ridge (right side), framed white so they read as windows
  const VENTS = [-7.5, -2.5, 2.5, 7.5].map(z => { const piv = new THREE.Group(); piv.position.set(0, RH, z); scene.add(piv);
    const e = arcPt(VA0, 0), w = Math.hypot(e.x, e.y - RH), ang = Math.atan2(e.y - RH, e.x);
    const pan = new THREE.Group(); pan.rotation.z = ang; piv.add(pan);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 4.8), COVM); gl.position.x = w / 2; gl.renderOrder = 4; pan.add(gl);
    [[w / 2, 0, 2.4, w, 0.07], [w / 2, 0, -2.4, w, 0.07], [w, 0, 0, 0.07, 4.8], [0, 0, 0, 0.07, 4.8]].forEach(([x, y, zz, a, b]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(a * 1.02 + 0.04, 0.12, b), DARK); f.position.set(x, y, zz); pan.add(f); });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), GALV); pan.add(arm); arm.visible = false;
    // the insect screen under it (the same band), a fine white mesh
    return { piv, pan, w, ang, z }; });
  const meshTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.strokeStyle = '#ffffff'; x.lineWidth = 2;
    for (let i = 0; i <= 32; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 32); x.moveTo(0, i); x.lineTo(32, i); x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const SCRM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x404040, alphaMap: meshTex, transparent: true, opacity: 1.0, roughness: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const scrRoof = (() => { const gq = coverGeo(VA0, VA1, 6), m = new THREE.Mesh(gq, SCRM.clone()); m.material.alphaMap = meshTex.clone(); m.material.alphaMap.needsUpdate = true; m.material.alphaMap.repeat.set(14, 90); m.renderOrder = 5; scene.add(m); return m; })();
  const scrSide = [-1, 1].map(s => { const gq = new THREE.PlaneGeometry(2 * GZ, EH - 0.5), m = new THREE.Mesh(gq, SCRM.clone()); m.material.alphaMap = meshTex.clone(); m.material.alphaMap.needsUpdate = true; m.material.alphaMap.repeat.set(90, 12);
    m.rotation.y = Math.PI / 2; m.position.set(s * (GW + 0.12), 0.45 + (EH - 0.5) / 2, 0); m.renderOrder = 5; scene.add(m); return m; });

  // ---------- 3) heater (+ flue) and the sensor on a post, wired to it
  const heater = new THREE.Group(); scene.add(heater);
  const glowM = new THREE.MeshStandardMaterial({ color: 0x331a0a, emissive: 0xff5a14, emissiveIntensity: 0, roughness: 0.5 });
  { const b = new THREE.Mesh(rbox(1.3, 1.3, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.45, metalness: 0.3 })); b.position.y = 0.95; heater.add(b);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), glowM); gr.position.set(0, 1.0, 0.455); heater.add(gr);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.03), DARK); s.position.set(0, 0.7 + i * 0.12, 0.47); heater.add(s); }
    [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), DARK); l.position.set(x, 0.15, z); heater.add(l); });
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 12), GALV); fl.position.set(0.35, 3.4, -0.2); heater.add(fl); }
  heater.position.set(3.6, 0, -9.0); sh(heater);
  const heatLight = new THREE.PointLight(0xff7a2a, 0, 9, 2); heatLight.position.set(3.6, 1.2, -8.2); scene.add(heatLight);
  const sensor = new THREE.Group(); scene.add(sensor);
  const ledM = new THREE.MeshBasicMaterial({ color: 0x40a0ff });
  { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), GALV); post.position.y = 0.75; sensor.add(post);
    const bx = new THREE.Mesh(rbox(0.26, 0.34, 0.14, 0.02), WHITE); bx.position.y = 1.55; sensor.add(bx);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), ledM); led.position.set(0, 1.62, 0.075); sensor.add(led);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0x9adfff })); sc.position.set(0, 1.5, 0.072); sensor.add(sc); }
  sensor.position.set(1.8, 0, -6.4); sh(sensor);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.8, 1.4, -6.4), V(1.8, 0.05, -6.6), V(2.4, 0.05, -8.2), V(3.2, 0.05, -8.6), V(3.3, 0.6, -8.6)]), 60, 0.015, 5), DARK); scene.add(wire);

  // ---------- 4) a car parked by the track (the "closed car in the sun")
  const car = new THREE.Group(); scene.add(car);
  { const paint = new THREE.MeshStandardMaterial({ color: 0xb02a22, metalness: 0.5, roughness: 0.3, envMapIntensity: 1.0 });
    const body = new THREE.Mesh(rbox(4.2, 0.75, 1.8, 0.2), paint); body.position.y = 0.72; car.add(body);
    const cab = new THREE.Mesh(rbox(2.3, 0.7, 1.62, 0.22), paint); cab.position.set(-0.2, 1.38, 0); car.add(cab);
    [[1, 1], [-1, 1]].forEach(([s]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5), GLASS); w.position.set(-0.2, 1.4, s * 0.82); w.rotation.y = s > 0 ? 0 : Math.PI; car.add(w); });
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.55), GLASS); ws.position.set(0.97, 1.38, 0); ws.rotation.y = Math.PI / 2; ws.rotation.x = 0; car.add(ws);
    [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]].forEach(([x, z]) => { const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20); wg.rotateX(Math.PI / 2); const w = new THREE.Mesh(wg, DARK); w.position.set(x, 0.36, z); car.add(w); }); }
  car.position.set(4.2, 0, 15.2); car.rotation.y = 0.25; sh(car);

  // ---------- 5) drip hoses (one per bed) + the header pipe across the back; wet spots under each plant
  const HOSEM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
  const header = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(-4.3, 0.3, -9.45), V(4.9, 0.3, -9.45)), 40, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x2a5aa8, roughness: 0.5 })); scene.add(header);
  const HOSES = ROWS.map((x, i) => { const pts = [V(x + 0.22, 0.3, -9.45), V(x + 0.22, 0.25, -9.2), V(x + 0.22, 0.24, -8.9), V(x + 0.22, 0.24, 9.0)];
    const curve = new THREE.CatmullRomCurve3(pts), m = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 6), HOSEM); scene.add(m);
    const fm = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.04, 6), new THREE.MeshBasicMaterial({ map: (() => { const t = stripeTex(80, 200, 90); t.repeat.set(1, 1); return t; })(), transparent: true, opacity: 0, depthWrite: false })); scene.add(fm);
    return { m, fm, x: x + 0.22 }; });
  const wetSpots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshStandardMaterial({ color: 0x24160c, roughness: 0.3, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), PL.length);
  { const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2); PL.forEach((p, i) => wetSpots.setMatrixAt(i, M.compose(V(p.x, 0.226, p.z), Q, V(1, 1, 1)))); scene.add(wetSpots); }
  const fertTank = new THREE.Group(); scene.add(fertTank);
  { const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x2f7ad0, roughness: 0.4, transparent: true, opacity: 0.92 })); tk.position.y = 0.6; fertTank.add(tk);
    const lq = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.8, 24), new THREE.MeshStandardMaterial({ color: 0x4ad06a, roughness: 0.3, emissive: 0x0a3010 })); lq.position.y = 0.45; fertTank.add(lq);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), DARK); lid.position.y = 1.25; fertTank.add(lid);
    const pump = new THREE.Mesh(rbox(0.4, 0.35, 0.3, 0.03), new THREE.MeshStandardMaterial({ color: 0xe0b020, roughness: 0.5 })); pump.position.set(0.62, 0.2, 0.05); fertTank.add(pump);
    const pp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.7, 0.35, 0.1), V(0.9, 0.3, 0.0), V(1.0, 0.3, 0.0)]), 20, 0.04, 6), HOSEM); fertTank.add(pp); }
  fertTank.position.set(-5.3, 0, -9.45); sh(fertTank);
  // ---------- 6) puddles in the aisles, the drain channel along the front, the outlet pipe and the water pouring out
  const AISLES = [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4];
  const puddles = AISLES.map((x, i) => ribbon(line([x, -8.8], [x, 8.9], 30, u => 0.06 * Math.sin(u * 17 + i)), x === 0 || Math.abs(x) > 5 ? 0.5 : 0.75, 0.04, MUDT));
  const DCH = []; for (let x = -5.6; x < 5.6; x += 0.8) { const gq = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.6), CONC); gq.add(b);
    [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.3, 0.08), CONC); w.position.set(0, 0.15, s * 0.28); gq.add(w); });
    gq.position.set(x + 0.4, 0, 9.45); scene.add(sh(gq)); DCH.push(gq); }
  const chWater = ribbon(line([-5.5, 9.45], [5.6, 9.45], 20), 0.45, 0.2);
  const outlet = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(5.5, 0.15, 9.45), V(6.4, 0.25, 9.45), V(7.6, 0.3, 9.45)]), 20, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.5 })); scene.add(sh(outlet));
  const ditch = ribbon(line([7.9, 9.45], [9.5, 18], 20, u => 0.3 * Math.sin(u * 5)), 0.8, 0.03);

  // ---------- 7) circulation fans hanging under the roof
  const FANS = []; [-2.6, 2.6].forEach(x => [-6, 0, 6].forEach(z => { const gq = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 28), WHITE); gq.add(ring);
    const guard = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: meshTex, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); guard.position.z = 0.06; gq.add(guard);
    const mot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12), DARK); mot.rotation.x = Math.PI / 2; mot.position.z = -0.12; gq.add(mot);
    const bl = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), DARK); b.position.x = 0.19; const h = new THREE.Group(); h.rotation.z = i * 2.094; b.rotation.x = 0.4; h.add(b); bl.add(h); } gq.add(bl);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), GALV); rod.position.y = 0.9; gq.add(rod);
    gq.position.set(x, 3.65, z); if (x > 0) gq.rotation.y = Math.PI; scene.add(gq); FANS.push({ gq, bl, x, z }); }));

  // ---------- 8) partitions (rooms), the wet wall (cooling pad) on the left wall of the back room, the big fan on the right wall
  const PARTM = new THREE.MeshStandardMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.12, roughness: 0.1, envMapIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const PARTS = [-3.4, 3.4].map(z => { const gq = new THREE.Group(); const sp = new THREE.Mesh(new THREE.ShapeGeometry(endShape), PARTM); sp.renderOrder = 4; gq.add(sp);
    const pts = profile(); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, a.distanceTo(b) + 0.06), WHITE); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); gq.add(m); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2 * GW, 0.07, 0.07), WHITE); bar.position.y = 0.04; gq.add(bar);
    gq.position.z = z; scene.add(gq); return gq; });
  const padTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#8a6a40'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#4a3418'; x.lineWidth = 3;
    for (let i = -64; i < 128; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 64); x.moveTo(i + 40, 0); x.lineTo(i, 64); x.stroke(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const pad = new THREE.Group(); scene.add(pad);
  { const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 5.6), new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.9 })); p.position.y = 1.25; pad.add(p);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 5.7), GALV); tr.position.y = 2.2; pad.add(tr); const tr2 = tr.clone(); tr2.position.y = 0.3; pad.add(tr2);
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.75), new THREE.MeshBasicMaterial({ map: (() => { const t = stripeTex(120, 180, 230); t.repeat.set(4, 1); return t; })(), transparent: true, opacity: 0, depthWrite: false }));
    wf.rotation.y = Math.PI / 2; wf.position.set(0.09, 1.25, 0); pad.add(wf); pad.userData.wf = wf; }
  pad.position.set(-GW + 0.15, 0, -6.7); sh(pad);
  const bigFan = new THREE.Group(); scene.add(bigFan); const bigBl = new THREE.Group();
  { const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 1.4), GALV); bigFan.add(box); const hole = new THREE.Mesh(new THREE.CircleGeometry(0.6, 28), DARK); hole.rotation.y = -Math.PI / 2; hole.position.x = -0.26; bigFan.add(hole);
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.55), new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.6, roughness: 0.4 })); b.position.z = 0.3; b.rotation.z = 0.4; const h = new THREE.Group(); h.rotation.x = i * 1.2566; h.add(b); bigBl.add(h); }
    bigBl.position.x = -0.3; bigFan.add(bigBl);
    const gr = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: meshTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); gr.rotation.y = -Math.PI / 2; gr.position.x = -0.33; bigFan.add(gr); }
  bigFan.position.set(GW - 0.3, 1.3, -6.7); sh(bigFan);

  // ---------- 9) the pollinating trolley (a small cart in the aisle between the tomato rows, a buzzing wand on each side)
  const trolley = new THREE.Group(); scene.add(trolley); const wands = [];
  { const base = new THREE.Mesh(rbox(0.55, 0.22, 0.75, 0.04), new THREE.MeshStandardMaterial({ color: 0x2a8a4a, roughness: 0.4 })); base.position.y = 0.22; trolley.add(base);
    [[-0.22, -0.28], [0.22, -0.28], [-0.22, 0.28], [0.22, 0.28]].forEach(([x, z]) => { const wg = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14); wg.rotateZ(Math.PI / 2); const w = new THREE.Mesh(wg, DARK); w.position.set(x * 1.25, 0.09, z); trolley.add(w); });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), GALV); mast.position.y = 0.75; trolley.add(mast);
    const head = new THREE.Mesh(rbox(0.22, 0.14, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a8a4a, roughness: 0.5 })); head.position.y = 1.2; trolley.add(head);
    [-1, 1].forEach(s => { const arm = new THREE.Group(); arm.position.set(0, 1.12, 0); trolley.add(arm);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 6), GALV); a.rotation.z = Math.PI / 2; a.position.x = s * 0.3; arm.add(a);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4, emissive: 0x302000 })); tip.position.set(s * 0.62, -0.08, 0); arm.add(tip);
      wands.push({ arm, s }); }); }
  sh(trolley);
  // ---------- 10) bee boxes on stands in the strawberry aisle; bees and bugs are sprites
  const HIVES = [[-1.8, -4.5], [-1.8, 3.5]].map(([x, z]) => { const gq = new THREE.Group();
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), DARK); st.position.y = 0.25; gq.add(st);
    const bx = new THREE.Mesh(rbox(0.55, 0.36, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.8 })); bx.position.y = 0.68; gq.add(bx);
    const lid = new THREE.Mesh(rbox(0.62, 0.06, 0.52, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a7a40, roughness: 0.7 })); lid.position.y = 0.89; gq.add(lid);
    const ent = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), DARK); ent.position.set(0, 0.56, 0.226); gq.add(ent);
    gq.position.set(x, 0, z); scene.add(sh(gq)); return { gq, x, z }; });

  // ---------- 11) gutters along both eaves, downpipes at the corners; sensors; the farmer's hat on a post by the door
  const GUT = [-1, 1].map(s => { const gq = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 2 * GZ + 0.4), GALV); gq.add(b);
    [-1, 1].forEach(q => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 2 * GZ + 0.4), GALV); w.position.set(q * 0.11, 0.08, 0); gq.add(w); });
    const wt = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 2 * GZ + 0.4), new THREE.MeshBasicMaterial({ map: (() => { const t = stripeTex(140, 190, 230); t.repeat.set(1, 6); return t; })(), transparent: true, opacity: 0, depthWrite: false }));
    wt.rotation.x = -Math.PI / 2; wt.position.y = 0.06; gq.add(wt); gq.userData.wt = wt;
    [-1, 1].forEach(q => { const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, EH, 10), GALV); dp.position.set(0, -EH / 2, q * (GZ + 0.15)); gq.add(dp); });
    gq.position.set(s * (GW + 0.16), EH, 0); scene.add(sh(gq)); return { gq, s }; });
  const SENS = [[-0.9, -2.5], [2.7, 3.0], [-4.5, 5.5]].map(([x, z]) => { const s = sensor.clone(); s.position.set(x + 0.45, 0, z); scene.add(s); return s; });
  const HATP = V(2.2, 0, GZ + 1.3);
  const hatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 8), WOOD); hatPost.position.set(HATP.x, 0.75, HATP.z); hatPost.castShadow = true; scene.add(hatPost);
  const hat = (() => { const straw = new THREE.MeshStandardMaterial({ color: 0xdcb86c, map: LT.map, roughness: 0.9 });
    const pts = [V(0, 0, 0), V(0.42, 0, 0), V(0.44, 0.02, 0), V(0.2, 0.03, 0), V(0.18, 0.16, 0), V(0.14, 0.2, 0), V(0, 0.21, 0)].map(p => new THREE.Vector2(p.x, p.y));
    const gq = new THREE.Group(); const h = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), straw); h.material.side = THREE.DoubleSide; gq.add(h);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.187, 0.193, 0.045, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a2a1a, roughness: 0.7 })); band.position.y = 0.06; gq.add(band);
    scene.add(sh(gq)); return gq; })();

  // ---------- sprites: dust, drips, air puffs, insects, bees; hail and rain
  const mkPool = n => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const SPR = mkPool(1400); let sN = 0;
  const puff = (p, col, size, op) => { if (sN >= SPR.length) return; const s = SPR[sN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = op; };
  const dotT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 12, 0, 7); x.fill(); return new THREE.CanvasTexture(cv); })();
  const BUGS = Array.from({ length: 140 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: 0x1a1a14, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const BEES = Array.from({ length: 60 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: 0xe8a818, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const hailM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.2, envMapIntensity: 1.2 });
  const HAILN = 1500, hailI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 1), hailM, HAILN); hailI.frustumCulled = false; scene.add(hailI);
  const HAILG = 900, hailG = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.04, 1), hailM, HAILG); hailG.frustumCulled = false; scene.add(hailG);
  const rainM = new THREE.MeshBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.45, depthWrite: false });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.9, 0.02), rainM, 1400); rain.frustumCulled = false; scene.add(rain);
  const inside = (x, z) => Math.abs(x) < GW && Math.abs(z) < GZ;

  // ---------- plant health: each problem tints/squashes the plants, its fix heals them
  const EV = [
    [T.hail + 0.4, T.sunl - 0.6, 0x6e5a36, 0.28, 0.95, () => 1],                       // hail flattens the crop
    [T.wdie - 1.0, T.arches + 0.2, 0x6a5a2a, 0.5, 0.9, () => 1],                       // the storm
    [T.freeze - 0.6, T.auto, 0xb4cfc8, 0.85, 0.95, () => 1],                             // frost
    [T.unb - 0.8, T.below, 0x9a8a3a, 0.62, 0.9, () => 1],                                // cooked
    [T.dries - 0.4, T.roots, 0x8a6a38, 0.55, 0.9, () => 1],                              // dry soil
    [T.rot - 0.8, T.drainage, 0x5a4a26, 0.6, 0.85, () => 1],                             // rotten roots
    [T.yellow - 0.4, T.drop + 0.3, 0xd8c23a, 0.8, 0.7, () => 1],                         // weak, yellow
    [T.leaves - 0.4, T.sins, 0x6a6a2a, 0.62, 0.8, () => 1],                              // eaten
    [T.mold - 1.2, T.fans + 0.2, 0xa4a69c, 0.85, 0.85, () => 1],                         // mould
    [T.hate - 0.3, T.cool + 0.8, 0x8a7a2a, 0.7, 0.95, p => p.z < -3.4],                 // the heat-haters (back room)
    [T.bdie - 0.9, T.polli, 0x8a8a3a, 0.6, 0.9, p => !p.tom],                            // strawberries without bees
  ].map(([a, b, col, sy, fr, sel]) => ({ a, b, col: new THREE.Color(col), sy, fr, sel }));
  const GREEN = new THREE.Color(0x5c9a3c), CC = new THREE.Color();
  // fixes visible from these times on
  const SHOW = { arches: T.arches - 0.2 };

  // ---------- camera shots [arrive t, camera, target, fov, cut?]
  const SHOTS = [
    [0.0, [7.5, 1.3, 13.5], [0, 0.6, 2], 50],                                   // low over the crop, hail starts
    [T.city - 0.9, [15, 9, 19], [0, 0.5, 0], 50],                              // rising: the flattened field
    [T.stakes - 0.35, [14, 4.5, 17], [0, 1.2, 0], 48, 'cut'],                  // stakes go in around the plot
    [T.sheets - 0.3, [11.5, 6.5, 14], [0, 2.0, 0], 48],                         // the clear sheets come down on top
    [T.sunl - 0.3, [1.4, 2.0, 12.8], [0.6, 2.9, 3], 54, 'cut'],                 // under the roof: plants green, hail bounces off above
    [T.poly2 - 0.2, [2.5, 2.4, 13.5], [0, 2.6, 2], 54],
    [T.wind0 - 0.05, [15, 4, 15], [0, 2.4, 0], 50, 'cut'],                     // the storm rips the sheets off
    [T.arches - 0.4, [17, 6, 17], [0, 2.4, 0], 50, 'cut'],                     // the arches rise, back to front
    [T.xbars - 0.3, [12, 3.2, -15], [5.5, 2.2, -8.8], 48, 'cut'],              // the X braces in the end bay
    [T.bracing - 0.7, [15, 6, -14], [2, 2.6, -5], 50],                          // the cover rolls on
    [T.feet - 0.4, [9.5, 1.3, -6.5], [6, 0.35, -2.5], 46, 'cut'],               // concrete feet along the side
    [T.close - 0.3, [16, 5.5, 16], [0, 2.3, 0], 50, 'cut'],                     // the sides close, the gust doesn't take it
    [T.cold0 - 0.05, [0, 2.5, 8.6], [0, 0.6, 0], 50, 'cut'],                 // night inside: frost
    [T.heater - 0.4, [1.8, 1.9, -4.2], [3.6, 1.0, -8.8], 50, 'cut'],          // the heater
    [T.sensor - 0.1, [0.4, 1.8, -4.0], [1.8, 1.35, -6.4], 44],                // the sensor on its post
    [T.drops - 0.5, [0, 2.4, -1.2], [2.6, 1.0, -7.4], 50],                   // both: on when it drops, off when warm
    [T.hot0 - 0.05, [15, 3, 13], [0, 2.2, 0], 50, 'cut'],                       // a hot day outside
    [T.car - 0.45, [11.5, 2.6, 23.5], [4.2, 0.9, 15.2], 40, 'cut'],                // the closed car in the sun
    [T.light - 0.3, [0, 2.2, 8.6], [0, 3.0, -2], 54, 'cut'],                  // inside: light in, heat stuck
    [T.windows - 0.4, [7.5, 9.5, 7.5], [1.0, 4.8, -1.5], 50, 'cut'],               // the roof windows open
    [T.sides2 - 0.2, [12, 2.0, 7], [5.6, 1.4, 0], 48, 'cut'],                   // the sides roll up, cool air in
    [T.below + 0.8, [16, 8.5, 15], [0, 3.2, 0], 50, 'cut'],                     // hot out the top, cool in below
    [T.dry0 - 0.05, [0, 2.6, 8.6], [0, 0.3, 0], 50, 'cut'],                // rain on the roof, dry soil inside
    [T.hoses - 0.4, [1.8, 1.3, 2.5], [1.1, 0.25, -3.5], 46, 'cut'],           // hoses unroll, drips
    [T.rot0 - 0.05, [-1.6, 2.4, 6.5], [-1.8, 0.1, -0.5], 48, 'cut'],            // puddles
    [T.drain0 - 0.1, [9.6, 1.3, 12.6], [6.2, 0.25, 9.45], 46, 'cut'],             // the drain channel at the front, water pours out
    [T.weak0 - 0.05, [-3.4, 1.9, 4.5], [-2.7, 0.4, -1.5], 48, 'cut'],          // yellow plants
    [T.fert - 0.35, [-3.6, 2.4, -4.4], [-5.0, 0.6, -9.3], 46, 'cut'],           // the fertilizer tank on the drip line
    [T.drop - 0.4, [-1.8, 1.0, -2.6], [-2.5, 0.3, -6.5], 44],                    // green drops
    [T.bugs0 - 0.05, [7.5, 7.5, 6.5], [1.5, 4.6, -0.5], 50, 'cut'],                 // windows open, bugs swarm in
    [T.leaves - 0.4, [3.6, 1.5, 3.2], [2.7, 0.7, -0.5], 44, 'cut'],             // bugs on the leaves
    [T.screen - 0.4, [6.5, 8.0, 6.0], [1.2, 4.8, -1.0], 48, 'cut'],                     // screens go over the openings
    [T.scant - 0.6, [9.5, 1.9, 3.5], [6, 1.4, 0], 46, 'cut'],                   // bugs stopped at the side screen
    [T.mold0 - 0.05, [0, 2.4, 8.6], [0, 1.0, 0], 50, 'cut'],                  // night: vapour, mould
    [T.fins - 0.3, [0, 2.3, 9.2], [0, 3.3, -1], 54],                          // the fans
    [T.zone0 - 0.05, [0, 4.0, 9.5], [0, 0.6, -3.5], 50, 'cut'],               // the back plants wilt
    [T.rooms - 0.4, [15, 6, 13], [0, 2.2, 0], 50, 'cut'],                       // partitions rise
    [T.fan - 0.4, [2.0, 1.9, -1.2], [5.6, 1.3, -6.7], 50, 'cut'],               // the big fan on the right wall
    [T.wet - 0.4, [-1.6, 1.9, -1.4], [-5.8, 1.25, -6.7], 50, 'cut'],           // the wet wall on the left
    [T.cool + 0.6, [0.2, 2.6, 0.4], [0, 0.8, -7], 50],                          // the cool back room
    [T.pollen0 - 0.05, [3.6, 1.9, 4.6], [2.7, 0.8, -1.0], 40, 'cut'],          // tomato flowers, no fruit
    [T.vibr - 0.4, [1.8, 1.7, 7.2], [1.8, 0.9, 0], 46, 'cut'],             // the trolley buzzes each cluster
    [T.spreads + 0.6, [1.8, 1.9, 8.8], [1.8, 0.8, 1.5], 46],                 // fruit sets behind it
    [T.bees0 - 0.05, [-3.6, 1.4, 3.6], [-2.7, 0.6, -0.5], 44, 'cut'],           // strawberries in flower, bees stuck outside
    [T.boxes - 0.4, [-1.8, 1.8, 7.0], [-1.8, 0.6, 2.2], 46, 'cut'],            // the bee boxes, bees fly out
    [T.gutters - 0.4, [11.5, 4.5, 13], [6.1, 2.4, 3], 48, 'cut'],               // gutters + downpipes in the rain
    [T.sensors - 0.4, [0, 2.0, 1.6], [-0.3, 1.3, -2.5], 46, 'cut'],            // sensors
    [T.hat - 1.0, [-0.6, 2.1, 15.6], [2.2, 1.5, 11.3], 40, 'cut'],                 // the hat on the post
    [T.end0 - 0.1, [19, 10, 21], [0, 2.2, 0], 50, 'cut'],                       // the finished greenhouse
  ].map(([t, p, q, f, cut]) => ({ t, p: V(...p), q: V(...q), f, cut: !!cut }));
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1], push = (s, u) => ({ p: s.p.clone().lerp(s.q, 0.06 * u), q: s.q.clone(), f: s.f });
    if (!b) return push(a, ease(k(t, a.t, DUR)));
    if (b.cut) return push(a, ease(k(t, a.t, b.t)));
    const dist = a.p.distanceTo(b.p), M = clamp(1.3 + dist / 18, 1.5, 2.6), mv = Math.min(M, (b.t - a.t) * 0.75), ts = b.t - mv;
    const A = push(a, ease(k(t, a.t, ts))); if (t < ts) return A;
    const u = ease(k(t, ts, b.t)), Bv = push(b, 0), mid = A.p.clone().lerp(Bv.p, 0.5); mid.y += Math.min(3, dist * 0.08);
    const p = A.p.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.multiplyScalar(2 * u * (1 - u))).add(Bv.p.clone().multiplyScalar(u * u));
    p.y = Math.max(p.y, 0.5);
    return { p, q: A.q.clone().lerp(Bv.q, u), f: lerp(A.f, Bv.f, u) };
  }
  window.__camAt = camAt;

  // ---------- update
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), E0 = new THREE.Euler(), dark = new THREE.Color();
  const win = (t, a, b, fi = 0.4, fo = 0.4) => sm(k(t, a - fi, a)) * (1 - sm(k(t, b, b + fo)));
  let MOOD = {};
  function update(t) {
    sN = 0;
    const C = camAt(t), stormA = win(t, T.storm - 0.8, T.arches - 0.4, 0.6, 0.8);
    const shake = 0.015 + 0.05 * stormA;
    C.p.add(V(B.n1(t * 7) * shake, B.n1(t * 6 + 3) * shake, B.n1(t * 5 + 7) * shake * 0.5));
    cam.position.copy(C.p); cam.up.set(0, 1, 0); cam.lookAt(C.q); cam.fov = C.f; cam.near = 0.05; cam.far = 2500; cam.updateProjectionMatrix();

    // ---- moods: hail (grey), storm, two nights, a harsh hot day, rain (dry beat, gutters)
    const hailA = win(t, 0.3, T.poly2 + 0.6, 0.8, 0.8), rainA = Math.max(win(t, T.dry0 - 0.2, T.hoses - 0.6), win(t, T.gutters - 0.6, T.hat - 0.8, 0.4, 0.8)), wetA = Math.max(rainA, stormA);
    const nightA = Math.max(win(t, T.cold0 - 0.1, T.hot0 - 0.15, 0.2, 0.15), win(t, T.mold0 - 0.1, T.zone0 - 0.15, 0.2, 0.15));
    const hotA = win(t, T.hot0, T.rise, 0.3, 2.5);
    const gloom = Math.max(hailA * 0.55, stormA * 0.85, rainA * 0.6);
    MOOD = { nightA, hotA, gloom };
    sun.intensity = lerp(lerp(3.3, 0.7, gloom), 0.25, nightA) + 1.2 * hotA; sun.color.setHex(0xffd8aa).lerp(dark.setHex(0x8aa8ff), nightA);
    hemi.intensity = lerp(lerp(0.38, 0.3, gloom), 0.32, nightA); hemi.color.setHex(0xc4d8ff).lerp(dark.setHex(0x4a68b0), nightA);
    skyU.top.value.setHex(0x3f7cc8).lerp(dark.setHex(0x4c5662), gloom).lerp(dark.setHex(0x0c1630), nightA);
    skyU.hor.value.setHex(0xe8dfd6).lerp(dark.setHex(0x848b92), gloom).lerp(dark.setHex(0x2a3a5a), nightA);
    scene.fog.color.setHex(0xc9d2dc).lerp(dark.setHex(0x737b83), gloom).lerp(dark.setHex(0x1a2438), nightA); scene.fog.near = lerp(120, 50, gloom); scene.fog.far = lerp(900, 350, gloom);
    clouds.forEach(s => s.material.color.setHex(0xffffff).lerp(dark.setHex(0x5a6068), gloom).lerp(dark.setHex(0x1a2030), nightA));
    const span = 26; sun.target.position.set(0, 1, 0); sun.position.copy(sun.target.position).add(SUN.clone().multiplyScalar(120)); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 300 }); sun.shadow.camera.updateProjectionMatrix();
    const cd = C.p.distanceTo(C.q);
    Object.assign(B.POST, { focus: cd, aperture: cd < 7 ? 0.2 : 0.1, maxBlur: 9, bloom: lerp(0.16, 0.35, nightA), thr: lerp(1.3, 0.9, nightA), sat: lerp(lerp(1.08, 0.85, gloom), 0.8, nightA) + 0.1 * hotA, con: 1.12, exp: lerp(lerp(0.95, 0.85, gloom), 0.9, nightA), ao: 1.0, aoR: 0.6, mb: [0, 0] });

    // ---- 1) stakes + sheets: in, hail bounces, the storm lifts and rips them off; gone when the arches come
    const stakeOn = t > T.stakes - 0.3 && t < T.arches - 0.4;
    STK.forEach(s => { const u = eout(k(t, T.stakes - 0.2 + s.t0 * 1.3, T.stakes + 0.3 + s.t0 * 1.3)); s.m.visible = stakeOn && u > 0.01; s.m.scale.set(1, Math.max(0.01, u), 1);
      const lean = 0.35 * sm(k(t, T.rips + s.t0, T.rips + 1.2 + s.t0)) * (hash(s.x * 3 + s.z) > 0.4 ? 1 : 0.3); s.m.rotation.set(lean * 0.4, 0, -lean * Math.sign(s.x || 1));
      if (u > 0.1 && u < 0.9) puff(V(s.x, 0.15, s.z), 0xb8a07a, 0.7, 0.5 * (1 - u)); });
    const sheetLevel = 2.72;
    SHEETS.forEach(s => { const a = T.sheets - 0.2 + s.i * 0.45, u = eout(k(t, a, a + 0.8)); s.gq.visible = stakeOn && u > 0.01 && t < T.rips + 3.2;
      let y = lerp(7, sheetLevel, u), rx = 0, rz = 0, x = 0;
      const lift = sm(k(t, T.under - 0.2 + s.i * 0.15, T.rips)); rz = 0.14 * lift * Math.sin(t * 9 + s.i) + 0.12 * lift; y += 0.4 * lift * (0.5 + 0.5 * Math.sin(t * 7 + s.i * 2));
      const fly = k(t, T.rips + s.i * 0.2, T.rips + 2.6 + s.i * 0.2); if (fly > 0) { x = -26 * fly * fly - 2 * fly; y += 9 * fly; rz += fly * 5 * (1 + s.i * 0.3); rx = fly * 2.2 * (s.i % 2 ? 1 : -1); }
      s.gq.position.set(x, y, s.z); s.gq.rotation.set(rx, 0, rz); });
    const roofOn = stakeOn && t > T.sheets + 1.6 && t < T.under;              // the sheets stop the hail
    // ---- hail: falls (bounces off the sheets once they are on), piles up on the ground in the hook
    const hailOn = hailA > 0.02;
    hailI.visible = hailOn;
    if (hailOn) for (let i = 0; i < HAILN; i++) { const x = C.q.x + (hash(i) - 0.5) * 26, z = C.q.z + (hash(i * 3) - 0.5) * 26 + 2, onR = roofOn && Math.abs(x) < GW + 0.15 && Math.abs(z) < GZ;
      const hit = onR ? sheetLevel + 0.03 : 0.05, c0 = (t * 0.9 + hash(i * 7)) % 1, top = 16;
      let y, xx = x, zz = z; if (c0 < 0.75) y = top - (top - hit) * Math.pow(c0 / 0.75, 1.6); else { const b = (c0 - 0.75) / 0.25; y = hit + (onR ? 0.6 : 0.25) * Math.sin(Math.PI * b) * (1 - b * 0.3); xx += b * 0.3 * (hash(i * 5) - 0.5); zz += b * 0.3 * (hash(i * 9) - 0.5); }
      M4.compose(V(xx, y, zz), Q0.identity(), V(1, 1, 1).multiplyScalar(hailA > 0.3 ? 1 : hailA * 3)); hailI.setMatrixAt(i, M4); }
    hailI.instanceMatrix.needsUpdate = true;
    const pile = sm(k(t, T.hail, T.city + 0.5)) * (1 - sm(k(t, T.stakes - 0.6, T.stakes)));
    hailG.visible = pile > 0.01; if (hailG.visible) { for (let i = 0; i < HAILG; i++) { const x = (hash(i * 1.3) - 0.5) * 22, z = (hash(i * 2.7) - 0.5) * 26, on = hash(i * 4.4) < pile; M4.compose(V(x, inside(x, z) ? 0.24 : 0.03, z), Q0.identity(), on ? V(1, 0.7, 1) : V(0, 0, 0)); hailG.setMatrixAt(i, M4); } hailG.instanceMatrix.needsUpdate = true; }
    // ---- rain (storm, dry beat, gutters): stops at the cover once it is on
    const coverOn = t > T.bracing;
    rain.visible = wetA > 0.03;
    if (rain.visible) { for (let i = 0; i < 1400; i++) { const x = C.q.x + (hash(i) - 0.5) * 30, z = C.q.z + (hash(i * 3) - 0.5) * 30 + 3, y0 = 15 - ((t * 15 + hash(i * 7) * 16) % 16), sl = stormA * 0.35 + 0.06;
      const xx = x + (15 - y0) * sl, stop = coverOn && inside(xx, z) && y0 < roofY(xx) + 0.05; M4.compose(V(xx, y0, z), Q0.setFromAxisAngle(V(0, 0, 1), -sl), stop ? V(0, 0, 0) : V(1, 1, 1)); rain.setMatrixAt(i, M4); }
      rain.instanceMatrix.needsUpdate = true; rainM.opacity = 0.5 * wetA; }

    // ---- 2) arches rise back to front, purlins + X braces, cover rolls on, concrete feet, sides close
    const frameOn = t > T.arches - 0.3;
    ARCHES.forEach((m, i) => { const a = T.arches - 0.2 + i * 0.22; reveal(m, frameOn ? eio(k(t, a, a + 0.75)) : 0); });
    PURL.forEach((m, i) => { const a = T.xbars - 0.4 + i * 0.1; reveal(m, frameOn ? eio(k(t, a, a + 0.9)) : 0); });
    XB.forEach((m, i) => { const a = T.xbars + 0.1 + (i % 6) * 0.22 + (i >= 6 ? 0.2 : 0); reveal(m, frameOn ? eio(k(t, a, a + 0.55)) : 0); });
    const cvU = eio(k(t, T.bracing - 0.5, T.bracing + 1.4)); covers.forEach(m => reveal(m, cvU));
    VENTS.forEach(v => { v.piv.visible = cvU > 0.98 || (cvU > 0 && v.z < lerp(-GZ, GZ, cvU) - 2.4); });
    FEET.forEach((f, i) => { const a = T.feet - 0.3 + (i % 9) * 0.1 + (i % 2) * 0.05, u = eout(k(t, a, a + 0.45)); f.m.visible = u > 0.01; f.m.position.set(f.x, -0.3 + 0.5 * u, f.z);
      if (u > 0.05 && u < 0.95) puff(V(f.x, 0.1, f.z), 0xc8c4bc, 0.6, 0.6); });
    const sideU = eio(k(t, T.close - 0.1, T.sides + 0.9)), endU = eio(k(t, T.sides - 0.1, T.sides + 0.9));
    // side curtains: closed (full) until the side vents roll up in the skylight beat
    const rollU = eio(k(t, T.sides2 - 0.1, T.sides2 + 1.3));
    WALLS.forEach(w => { const on = sideU > 0.01; w.fix.visible = on; w.cur.visible = on && rollU < 0.99; w.roll.visible = on;
      w.fix.scale.set(Math.max(0.01, sideU), 1, 1); w.cur.scale.set(Math.max(0.01, sideU), Math.max(0.01, 1 - rollU * 0.98), 1);
      const flap = 0.08 * win(t, T.gust - 0.3, T.cold0 - 0.3) * Math.sin(t * 11 + w.s); w.cur.position.x = w.s * (GW + flap);
      w.roll.position.y = lerp(0.45 + 0.07, EH - 0.02, rollU) ; });
    ENDS.forEach(m => { m.visible = endU > 0.01; m.scale.set(1, Math.max(0.01, endU), 1); }); door.visible = endU > 0.5;
    // ---- roof vents: open in the skylight beat and stay open
    const ventU = eio(k(t, T.windows - 0.1, T.windows + 1.2));
    VENTS.forEach((v, i) => { v.pan.rotation.z = v.ang + 0.85 * eio(k(t, T.windows - 0.1 + i * 0.15, T.windows + 1.0 + i * 0.15)); });
    // ---- insect screens: slide over the roof band (back to front) and the side openings
    const scU = eio(k(t, T.screen - 0.1, T.screen + 1.2)), scS = eio(k(t, T.screen + 0.6, T.air + 0.8));
    reveal(scrRoof, scU); scrSide.forEach(m => { m.visible = scS > 0.01; m.scale.set(Math.max(0.01, scS), 1, 1); });

    // ---- 3) heater + sensor (night). The heater glows while the sensor says cold; off at "off"
    const htU = eout(k(t, T.heater - 0.3, T.heater + 0.3)); heater.visible = htU > 0.01; heater.scale.setScalar(Math.max(0.01, htU));
    const snU = eout(k(t, T.sensor - 0.3, T.sensor + 0.2)); sensor.visible = snU > 0.01; sensor.scale.setScalar(Math.max(0.01, snU)); wire.visible = t > T.sensor + 0.2;
    const heatOn = (t > T.auto - 0.2 && t < T.off + 0.1) || (nightA > 0.5 && t > T.mold0 && t < T.zone0 && false);
    const glow = heatOn ? 0.75 + 0.25 * Math.sin(t * 9) : 0; glowM.emissiveIntensity = lerp(glowM.emissiveIntensity, glow * 3, 0.5); heatLight.intensity = glow * 6;
    ledM.color.setHex(t < T.auto - 0.2 ? 0x40a0ff : heatOn ? 0xff4020 : 0x40ff70);
    if (heatOn) for (let i = 0; i < 10; i++) { const ph = (t * 0.6 + i / 10) % 1; puff(V(3.6 + (hash(i * 3) - 0.5) * 0.6 - ph * 2.2, 1.0 + ph * 1.2, -8.4 + ph * 3.5), 0xff9a50, 0.8 + ph, 0.32 * (1 - ph)); }

    // ---- 4) hot day: light streaks in, heat (red puffs) bounces under the roof; then out through the vents, cool air in below
    const lightA = win(t, T.light - 0.2, T.sky0 + 0.5, 0.4, 0.6), heatA = win(t, T.intoHeat - 0.3, T.below + 1.5, 0.5, 1.2) + 0.6 * win(t, T.unb - 0.6, T.car - 0.6, 0.5, 0.3);
    if (lightA > 0.01) for (let i = 0; i < 26; i++) { const ph = (t * 0.9 + hash(i * 3)) % 1, x = (hash(i * 5) - 0.5) * 10, z = (hash(i * 7) - 0.5) * 16;
      for (let j = 0; j < 3; j++) { const yy = RH + 2 - (ph + j * 0.12) * (RH + 1.5); if (yy < 0.3) continue; puff(V(x + (RH - yy) * 0.25, yy, z), 0xffe9a0, 0.35, 0.5 * lightA * (1 - j * 0.3)); } }
    const ventOpen = ventU > 0.4;
    if (heatA > 0.01) for (let i = 0; i < 46; i++) { const x0 = (hash(i * 11) - 0.5) * 10, z0 = (hash(i * 13) - 0.5) * 17, ph = (t * 0.35 + hash(i * 17)) % 1;
      let p; if (!ventOpen) { const y = 0.6 + 3.4 * Math.abs(Math.sin(ph * Math.PI * 2)); p = V(x0 + Math.sin(t + i) * 0.4, Math.min(y, roofY(x0) - 0.35), z0); }
      else { const vx = 1.0 + 0.4 * hash(i); p = V(lerp(x0, vx, sm(ph * 1.4)), 0.8 + ph * 6.2, z0); }
      puff(p, 0xff5a2a, 1.1, 0.34 * Math.min(1, heatA) * (ventOpen ? 1 - ph : 1)); }
    const coolA = win(t, T.below - 0.6, T.skyl + 1.0, 0.5, 0.8);
    if (coolA > 0.01) for (let i = 0; i < 30; i++) { const s = i % 2 ? 1 : -1, ph = (t * 0.45 + hash(i * 19)) % 1, z0 = (hash(i * 23) - 0.5) * 17;
      puff(V(s * lerp(GW + 3, GW - 4, ph), 0.6 + 0.6 * ph, z0), 0x7ac8ff, 0.9, 0.38 * coolA * Math.sin(ph * Math.PI)); }
    // heat shimmer over the car
    const carA = win(t, T.car - 0.5, T.light - 0.3, 0.3, 0.2);
    if (carA > 0.01) for (let i = 0; i < 14; i++) { const ph = (t * 0.7 + i / 14) % 1; puff(V(4.2 + (hash(i * 3) - 0.5) * 3.4, 1.8 + ph * 1.4, 15.2 + (hash(i * 5) - 0.5) * 1.2), 0xffb070, 0.9, 0.25 * carA * Math.sin(ph * Math.PI)); }

    // ---- 5) dry soil + cracks; hoses unroll along the beds, drips; wet spots
    const dryA = win(t, T.dries - 0.6, T.roots + 0.6, 0.6, 1.0);
    SOIL.color.setHex(0x6a4a32).lerp(dark.setHex(0xb49a74), dryA).lerp(dark.setHex(0x3a2614), win(t, T.rot - 1.2, T.drainage + 0.3, 0.6, 1.2));
    SOIL.roughness = lerp(0.95, 0.35, win(t, T.rot - 1.2, T.drainage + 0.3, 0.6, 1.2));
    BEDS.forEach(b => { b.ck.material.opacity = 0.85 * dryA; b.ck.visible = dryA > 0.01; });
    HOSES.forEach((h, i) => { const a = T.hoses - 0.2 + i * 0.18; reveal(h.m, eio(k(t, a, a + 1.2))); });
    header.visible = t > T.hoses - 0.3;
    const dripOn = t > T.drip - 0.3 && (t < T.rot0 + 0.6 || (t > T.fert && t < T.fertig + 1.5)) , fertOn = sm(k(t, T.fert + 0.5, T.drop - 0.2));
    if (dripOn && cd < 14) PL.forEach((p, i) => { if (Math.abs(p.z - C.q.z) > 7 || Math.abs(p.x - C.q.x) > 4) return; const ph = (t * 1.3 + hash(i * 3)) % 1;
      puff(V(p.x + 0.22, 0.24 - ph * 0.02, p.z + 0.05), fertOn > 0.5 && t > T.fert ? 0x6aff8a : 0x8cc8ff, 0.07 + 0.08 * (1 - ph), 0.95 * Math.sin(ph * Math.PI)); });
    const wetSpot = sm(k(t, T.drip, T.roots)) * (1 - sm(k(t, T.drainage, T.weak0)));
    wetSpots.material.opacity = 0.7 * wetSpot; wetSpots.visible = wetSpot > 0.01;
    HOSES.forEach(h => { h.fm.material.opacity = 0.85 * fertOn * (1 - sm(k(t, T.fertig + 1.0, T.bugs0))); h.fm.visible = h.fm.material.opacity > 0.01; h.fm.material.map.offset.y = -t * 0.6; h.fm.material.map.repeat.set(1, 40); });
    const ftU = eout(k(t, T.fert - 0.3, T.fert + 0.3)); fertTank.visible = ftU > 0.01; fertTank.scale.setScalar(Math.max(0.01, ftU));
    // ---- 6) puddles, then they run to the front channel and out of the pipe
    const pudA = win(t, T.rot - 1.2, T.drainage + 0.8, 0.6, 1.0);
    puddles.forEach((pm, i) => flow(pm, t, t > T.drain ? 1.6 : 0.05, 0.75 * pudA));
    DCH.forEach((d, i) => { const a = T.drain0 + i * 0.07, u = eout(k(t, a - 0.3, a + 0.2)); d.visible = u > 0.01; d.position.y = -0.3 + 0.3 * u; });
    outlet.visible = t > T.drain0 + 0.4;
    const outA = win(t, T.drain, T.weak0 + 0.3, 0.3, 0.8); flow(chWater, t, 2.0, 0.8 * outA); flow(ditch, t, 2.5, 0.75 * outA);
    if (outA > 0.05) for (let j = 0; j < 8; j++) { const ph = (t * 1.6 + j / 8) % 1; puff(V(7.65 + ph * 0.5, 0.3 - ph * ph * 0.3, 9.45), 0x9ccaff, 0.5, 0.95 * outA * (1 - ph)); }

    // ---- 7) bugs swarm in through the open vents and the sides; after the screen they bump against it
    const bugA = win(t, T.bugs0 - 0.2, T.sins + 1.2, 0.3, 0.6), screened = t > T.screen + 0.6;
    BUGS.forEach((s, i) => { s.visible = bugA > 0.01 && (cd < 30); if (!s.visible) return;
      const side = hash(i * 3) > 0.5, z = (hash(i * 5) - 0.5) * 17, tgt = PL[Math.floor(hash(i * 7) * PL.length)];
      const wob = V(Math.sin(t * 9 + i) * 0.15, Math.sin(t * 11 + i * 2) * 0.12, Math.cos(t * 8 + i) * 0.15);
      if (screened) { const x = side ? GW + 0.3 + 0.25 * Math.abs(Math.sin(t * 6 + i)) : 1.6 + 0.3 * Math.abs(Math.sin(t * 6 + i)), y = side ? 0.6 + 1.6 * hash(i * 9) : RH + 0.4 + 0.3 * hash(i * 9);
        s.position.set(x, y, z).add(wob); }
      else { const u = clamp(((t - T.bugs0) * 0.4 + hash(i * 11) * 0.8)), st = side ? V(GW + 6, 1.5, z) : V(4, RH + 5, z), via = side ? V(GW, 1.3, z) : V(1.4, RH - 0.1, z), en = V(tgt.x, 0.6 + 0.6 * hash(i), tgt.z);
        const a = u < 0.5 ? st.clone().lerp(via, u * 2) : via.clone().lerp(en, (u - 0.5) * 2); s.position.copy(a).add(wob); }
      s.scale.setScalar(0.12); s.material.opacity = bugA; });

    // ---- 8) mould night: vapour rises from the leaves; the fans come on and blow it along, it clears
    const fanU = eout(k(t, T.fins - 0.2, T.fins + 0.6)); FANS.forEach((f, i) => { const u = eout(k(t, T.fins - 0.2 + i * 0.12, T.fins + 0.5 + i * 0.12)); f.gq.visible = u > 0.01; f.gq.position.y = 3.65 + 2 * (1 - u); f.bl.rotation.z = t > T.leaves && t > T.fins ? t * 22 : 0; });
    const vapA = win(t, T.vapor - 0.4, T.fans + 0.6, 0.5, 1.0), blow = sm(k(t, T.fins + 0.4, T.fins + 1.4));
    if (vapA > 0.01) for (let i = 0; i < 70; i++) { const p = PL[Math.floor(hash(i * 3.7) * PL.length)], ph = (t * 0.25 + hash(i * 5)) % 1;
      puff(V(p.x + Math.sin(t * 0.5 + i) * 0.3, 0.7 + ph * 2.4, p.z + blow * ((ph * 9 + i) % 6 - 3)), 0xdde6ee, 1.0 + ph, 0.22 * vapA * Math.sin(ph * Math.PI) * (1 - 0.5 * blow)); }

    // ---- 9) rooms: partitions rise; the wet wall runs; the fan pulls cool air across the back room
    const ptU = PARTS.map((p, i) => { const u = eout(k(t, T.rooms - 0.2 + i * 0.4, T.rooms + 0.7 + i * 0.4)); p.visible = u > 0.01; p.position.y = -RH * (1 - u); return u; });
    const padU = eout(k(t, T.wet - 0.4, T.wet + 0.3)); pad.visible = padU > 0.01; pad.scale.set(1, Math.max(0.01, padU), 1);
    pad.userData.wf.material.opacity = 0.65 * sm(k(t, T.wet + 0.3, T.wet + 0.9)); pad.userData.wf.material.map.offset.y = t * 0.8; pad.userData.wf.visible = pad.userData.wf.material.opacity > 0.01;
    const bfU = eout(k(t, T.fan - 0.3, T.fan + 0.3)); bigFan.visible = bfU > 0.01; bigFan.scale.setScalar(Math.max(0.01, bfU)); bigBl.rotation.x = t > T.fan + 0.3 ? t * 18 : 0;
    const coolR = sm(k(t, T.wet + 0.5, T.cool));
    if (coolR > 0.01 && t < T.pollen0) for (let i = 0; i < 26; i++) { const ph = (t * 0.32 + hash(i * 7)) % 1, z0 = -6.7 + (hash(i * 9) - 0.5) * 4.5;
      puff(V(lerp(-GW + 0.3, GW - 0.4, ph), 0.7 + 1.4 * hash(i * 13), z0), 0x5ab8ff, 0.55, 0.3 * coolR * Math.sin(ph * Math.PI)); }

    // ---- 10) pollination: tomato flowers, the trolley buzzes along the aisle, fruit sets behind it; bees for the strawberries
    const vibZ = lerp(-7, 5, k(t, T.vibr - 0.2, T.vpoll + 1.0)), trU = t > T.vibr - 0.6 && t < T.bees0 - 0.1;
    trolley.visible = trU; trolley.position.set(1.8, 0, vibZ); trolley.scale.setScalar(1.25); trolley.rotation.y = 0;
    wands.forEach((w, i) => { w.arm.rotation.z = 0.06 * Math.sin(t * 90 + i); w.arm.position.y = 1.12 + 0.03 * Math.sin(t * 71); });
    if (trU) for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, ph = (t * 2 + i / 6) % 1; puff(V(1.8 + s * (0.7 + ph * 0.4), 1.0 + ph * 0.4, vibZ + (hash(i) - 0.5) * 0.4), 0xffe040, 0.16 + ph * 0.15, 0.9 * (1 - ph)); }
    const beeA = t > T.boxes + 0.4 ? sm(k(t, T.boxes + 0.4, T.boxes + 1.4)) : 0;
    HIVES.forEach((h, i) => { const u = eout(k(t, T.boxes - 0.3 + i * 0.35, T.boxes + 0.3 + i * 0.35)); h.gq.visible = u > 0.01; h.gq.position.y = 2.5 * (1 - u); });
    const outB = win(t, T.bscreen - 0.8, T.hive0 + 0.2, 0.3, 0.3);
    BEES.forEach((s, i) => { s.visible = (beeA > 0.01 && t < T.add0 + 0.5) || outB > 0.01; if (!s.visible) return;
      if (beeA > 0.01) { const h = HIVES[i % 2], f = FLW[(i * 37) % FLW.length].p.tom ? FLW[(i * 41 + 3) % (FLW.length / 2)] : FLW[(i * 37) % FLW.length], ph = (t * 0.25 + hash(i * 3)) % 1, u = Math.sin(ph * Math.PI);
        s.position.set(lerp(h.x, f.x, u) + Math.sin(t * 13 + i) * 0.06, lerp(0.6, f.y + 0.06, u) + 0.25 * Math.sin(u * Math.PI), lerp(h.z, f.z, u) + Math.cos(t * 11 + i) * 0.06); }
      else { s.position.set(-GW - 0.3 - 0.25 * Math.abs(Math.sin(t * 5 + i)), 0.6 + 1.6 * hash(i * 9), -1 + 8 * (hash(i * 5) - 0.3)).add(V(0, Math.sin(t * 9 + i) * 0.1, Math.cos(t * 7 + i) * 0.12)); }
      s.scale.setScalar(0.09); s.material.opacity = Math.max(beeA, outB); });

    // ---- plants: growth + each problem's tint/squash, healed by its fix
    const grow = lerp(0.72, 1.0, t / DUR);
    PL.forEach((p, i) => { CC.copy(GREEN).offsetHSL(0.02 * (hash(i * 5) - 0.5), 0, 0.06 * (hash(i * 9) - 0.5)); let sy = 1, s = 1;
      EV.forEach(e => { if (t < e.a - 0.1 || t > e.b + 1.6 || !e.sel(p) || hash(i * 13 + e.a) > e.fr) return; const d = sm(k(t, e.a, e.a + 1.3)) * (1 - sm(k(t, e.b, e.b + 1.4)));
        if (d <= 0) return; CC.lerp(e.col, d); sy *= lerp(1, e.sy, d); s *= lerp(1, 0.92, d); });
      const base = p.tom ? V(1, 1, 1) : V(1.6, 1.6, 1.6), lean = (1 - sy) * 0.5, MI = p.tom ? tomI : strI;
      E0.set(lean * Math.sin(i * 2.1), hash(i) * 6.28, lean * Math.cos(i * 2.1) + Math.sin(t * 2.3 + p.z) * 0.02 * (1 + 4 * stormA)); Q0.setFromEuler(E0);
      M4.compose(V(p.x, 0.2, p.z), Q0, base.multiplyScalar(grow * s).multiply(V(1, sy, 1))); MI.setMatrixAt(p.k, M4); MI.setColorAt(p.k, CC); });
    [tomI, strI].forEach(m => { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    // flowers: tomatoes from the pollen beat (yellow), strawberries from the bee beat (white); fruit: tomatoes after the trolley passes, strawberries after the bees
    const tomFl = sm(k(t, T.pollen0 - 0.5, T.pollen0 + 0.5)), strFl = sm(k(t, T.bees0 - 0.6, T.bees0 + 0.3));
    FLW.forEach((f, i) => { const tom = f.p.tom; let fl = tom ? tomFl : strFl, fr = 0;
      if (tom) { const pass = f.p.z < vibZ - 0.3 && t > T.vibr - 0.2 ? 1 : 0, ts = T.vibr - 0.2 + (f.p.z + 7) / 12 * (T.vpoll + 1.2 - T.vibr); fr = f.p.x > 2 && f.p.x < 3.5 || f.p.x < 1.5 ? (pass ? sm(k(t, ts + 0.3, ts + 1.2)) : 0) : sm(k(t, T.vpoll - 1, T.vpoll + 0.5)); if (t > T.bees0) fr = 1; }
      else fr = sm(k(t, T.polli - 1.2 + hash(i) * 0.8, T.polli + 0.3 + hash(i) * 0.8));
      fl *= 1 - 0.8 * fr; const g2 = f.p.tom ? grow : grow;
      M4.compose(V(f.x, 0.2 + f.y * g2, f.z), Q0.identity(), V(1, 1, 1).multiplyScalar(fl > 0.02 ? fl : 0)); flowers.setMatrixAt(i, M4); flowers.setColorAt(i, CC.setHex(tom ? 0xffd81a : 0xffffff));
      const fs = fr > 0.02 ? (tom ? 0.5 + 0.6 * fr : 0.35 + 0.25 * fr) : 0; M4.compose(V(f.x, 0.2 + f.y * g2 - 0.08, f.z), Q0.identity(), V(fs, fs * (tom ? 1 : 1.2), fs)); fruit.setMatrixAt(i, M4);
      fruit.setColorAt(i, CC.setHex(tom ? 0x5aa83a : 0x7aa040).lerp(dark.setHex(tom ? 0xd8301a : 0xe02a2a), sm(clamp(fr * 1.5 - 0.4)))); });
    flowers.instanceMatrix.needsUpdate = true; flowers.instanceColor.needsUpdate = true; fruit.instanceMatrix.needsUpdate = true; fruit.instanceColor.needsUpdate = true;

    // ---- 11) gutters (rain runs along them, pours from the downpipes), sensors, the hat lands on the post
    GUT.forEach((gq, i) => { const u = eout(k(t, T.gutters - 0.3 + i * 0.3, T.gutters + 0.4 + i * 0.3)); gq.gq.visible = u > 0.01; gq.gq.scale.set(1, 1, Math.max(0.01, u));
      const wtA = sm(k(t, T.gutters + 0.6, T.gutters + 1.2)) * (1 - sm(k(t, T.end0 - 0.5, T.end0 + 0.5))); gq.gq.userData.wt.material.opacity = 0.75 * wtA; gq.gq.userData.wt.material.map.offset.y = -t * 1.4; gq.gq.userData.wt.visible = wtA > 0.01;
      if (wtA > 0.05) [-1, 1].forEach(q => { for (let j = 0; j < 5; j++) { const ph = (t * 1.8 + j / 5) % 1; puff(V(gq.s * (GW + 0.16) + gq.s * ph * 0.4, 0.15 + 0.1 * (1 - ph), q * (GZ + 0.15) + q * ph * 0.3), 0x9ccaff, 0.3, 0.8 * wtA * (1 - ph)); } }); });
    SENS.forEach((s, i) => { const u = eout(k(t, T.sensors - 0.2 + i * 0.25, T.sensors + 0.3 + i * 0.25)); s.visible = u > 0.01; s.scale.set(1, Math.max(0.01, u), 1); });
    const hu = k(t, T.hat - 0.6, T.hat + 0.2), top = 1.5;
    hat.visible = t > T.hat - 0.7; hat.position.set(HATP.x, top + 3.2 * Math.pow(1 - eout(hu), 1) + (hu >= 1 ? 0.03 * Math.sin(k(t, T.hat + 0.2, T.hat + 0.8) * Math.PI) : 0), HATP.z);
    hat.rotation.set(0.25 * (1 - hu) + (hu >= 1 ? 0.06 * Math.sin(k(t, T.hat + 0.2, T.hat + 0.9) * Math.PI * 3) * (1 - k(t, T.hat + 0.2, T.hat + 0.9)) : 0), t * 2 * (1 - hu), 0.15 * (1 - hu));
    hatPost.visible = t > T.add0 - 0.5 || t < T.stakes;
    hatPost.visible = true;
    car.visible = true;

    for (let i = sN; i < SPR.length; i++) SPR[i].visible = false;
  }

  // ---------- overlay: small temperature badges only (a mini thermometer + the number), vignette, a warm tint on the hot day
  const FONT = B.FONT;
  function thermo(x, y, a, deg, name, hot) {
    if (a <= 0) return;
    const col = hot ? '#ff5a2a' : '#3aa8ff', w = 270, h = 104;
    g.save(); g.globalAlpha = a; g.translate(x, y);
    g.fillStyle = 'rgba(14,18,24,0.82)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 24) : g.rect(0, 0, w, h); g.fill();
    g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    const f = clamp((deg + 5) / 60);
    g.fillStyle = '#e9edf2'; g.beginPath(); g.roundRect ? g.roundRect(26, 16, 18, 56, 9) : g.rect(26, 16, 18, 56); g.fill(); g.beginPath(); g.arc(35, 78, 15, 0, 7); g.fill();
    g.fillStyle = col; g.fillRect(31, 70 - 50 * f, 8, 50 * f + 4); g.beginPath(); g.arc(35, 78, 10, 0, 7); g.fill();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `30px ${FONT}`; g.fillStyle = '#cfd6de'; g.fillText(name, 68, 28);
    g.font = `56px ${FONT}`; g.fillStyle = hot ? '#ff8a5a' : '#8ad0ff'; g.fillText(Math.round(deg) + '°C', 66, 70);
    g.restore();
  }
  function overlay(t) {
    B.vignette(MOOD.nightA > 0.5 ? 0.3 : 0.12);
    B.tint(0.22 * (MOOD.hotA || 0), '#ff8a3a', 'soft-light');
    // night/heater: -2 -> 14 while the heater runs
    const a1 = win(t, T.cold0 + 0.3, T.hot0 - 0.3, 0.3, 0.3);
    if (a1 > 0) { const d = lerp(-2, 14, sm(k(t, T.auto, T.off))); thermo(40, 150, a1, d, 'INSIDE', d > 10); }
    const a2 = win(t, T.unb - 0.6, T.skyl + 0.8, 0.3, 0.3);
    if (a2 > 0 && !(t > T.car - 0.45 && t < T.light - 0.3)) { const d = lerp(lerp(28, 48, sm(k(t, T.unb - 0.6, T.unb + 1.2))), 26, sm(k(t, T.rise, T.skyl))); thermo(40, 150, a2, d, 'INSIDE', d > 30); }
    const a3 = win(t, T.car - 0.3, T.light - 0.4, 0.2, 0.2); if (a3 > 0) thermo(40, 150, a3, 62, 'IN THE CAR', true);
    const a4 = win(t, T.cool - 0.6, T.pollen0 - 0.2, 0.3, 0.3); if (a4 > 0) thermo(40, 150, a4, lerp(34, 22, sm(k(t, T.cool - 0.6, T.cool + 1.2))), 'BACK ROOM', false);
  }

  const dimEnv = () => scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) o.material.envMapIntensity = 0.4; });
  B.run({ hdriBackground: false, update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hail', 0, L0('poly')], ['Polycarbonate', L0('poly'), L0('wind')], ['Storm + bracing', L0('wind'), L0('cold')], ['Thermostat', L0('cold'), L0('hot')],
      ['Skylights', L0('hot'), L0('dry')], ['Drip irrigation', L0('dry'), L0('rot')], ['Drainage', L0('rot'), L0('weak')], ['Fertigation', L0('weak'), L0('bugs')],
      ['Insect screen', L0('bugs'), L0('mold')], ['Circulation fans', L0('mold'), L0('zone')], ['Sectors', L0('zone'), L0('pollen')], ['Vibration pollination', L0('pollen'), L0('bees')],
      ['Bees', L0('bees'), L0('add')], ['Finish', L0('add'), DUR]],
    warm: [1, 30, 60, 90, 120, 150], ready: async () => { dimEnv(); } });
})();
