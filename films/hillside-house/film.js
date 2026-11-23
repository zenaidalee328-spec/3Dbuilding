// "Hillside House": one slope, one house. The hill attacks seven ways; each defence is built on the spot:
// pilotis -> crest channel -> hydraulic staircase -> piles (cutaway) -> soil nails + shotcrete -> deep drains -> rockfall net,
// then a booster pump + tank and an inclined elevator. No people. Look = the approved look test (warm low sun, AO, haze).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const c = (l, w, n) => cue(l, w, n), L0 = id => LN(id).t0;
  const T = {
    lift: c('pil', 'lift'), short: c('pil', 'short'), tall: c('pil', 'tall'), level: c('pil', 'level'), z1: L0('pil2') + 0.5,
    rain0: L0('rain'), washes: c('rain', 'washes'), ditch: c('rain', 'ditch'), around: c('rain', 'around'), z2: L0('rain2') + 0.5,
    stair0: L0('stair'), digs: c('stair', 'digs'), stairs: c('stair', 'staircase'), step: c('stair', 'step'), z3: L0('stair2') + 0.5,
    creep0: L0('creep'), creeps: c('creep', 'creeps'), bend: c('creep', 'bend'), drill: c('creep', 'drill'), rockw: c('creep', 'rock'), steel: c('creep', 'steel'), z4: L0('creep2') + 0.6,
    slide0: L0('slide'), week: c('slide', 'week'), slide: c('slide', 'slide'), stitch: c('slide', 'stitch'), bars: c('slide', 'bars'), spray: c('slide', 'spray'), z5: L0('slide2') + 0.6,
    drain0: L0('drain'), builds: c('drain', 'builds'), push: c('drain', 'push'), drainw: c('drain', 'drain'), z6: L0('drain2') + 0.6,
    rock0: L0('rock'), rolls: c('rock', 'rolls'), stretch: c('rock', 'stretch'), net: c('rock', 'net'), never: c('rock', 'never'), knows: c('rock', 'knows'),
    pump0: L0('pump'), pump: c('pump', 'pump'), tank: c('pump', 'tank'), cart: c('pump', 'cart'), groc: c('pump', 'groceries'), hill: c('pump', 'hill'),
    end0: L0('end'), first: c('end', 'first'),
  };
  // the cutaway (section through the hill at x = 3.6) is shown in these windows (each starts/ends on a hard cut)
  const SECW = [[T.creep0 - 0.05, T.week - 0.4], [T.stitch - 0.1, T.spray - 0.1], [T.drain0 - 0.1, T.rock0 - 0.1]];
  const secOn = t => SECW.some(([a, b]) => t >= a && t < b);

  // ---------- the slope: falls toward +z (the street), a plateau on top (z < -26), the street flat below (z > 14)
  const sp = x => Math.log(1 + Math.exp(x * 1.5)) / 1.5, SL = 0.42, ZT = -26, ZB = 13;
  const baseY = z => -SL * (z - sp(z - ZB) + sp(ZT - z));
  const STREETY = baseY(40);
  function hAt(x, z) {
    let y = baseY(z); const rid = 1 - sm(k(z, 10, 14));
    y -= 0.0035 * x * x * rid;
    y += 0.35 * (B.fbm(x / 60 + 3, z / 60 + 1, 8, 3) - 0.5) * rid;
    if (z < -40) y += 8 * sm(k(-z, 40, 120));
    return y;
  }
  const FL = 2.4;                                   // floor level of the lifted house
  const SX = 3.6, CZ0 = -13.5, CZ1 = 9;             // the cutaway: plane x = SX, between z CZ0 and CZ1
  const CLIP = [new THREE.Plane(V(-1, 0, 0), SX), new THREE.Plane(V(0, 0, -1), CZ0), new THREE.Plane(V(0, 0, 1), -CZ1)];
  const clipM = m => { m.clippingPlanes = CLIP; m.clipIntersection = true; return m; };
  {
    const geo = new THREE.PlaneGeometry(240, 240, 400, 400); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z); p.setY(i, y);
      const n = B.fbm(x / 9 + 5, z / 9 + 2, 8, 3);
      if (z > 15 && z < 21) cc.setHSL(0.6, 0.04, lerp(0.2, 0.24, n));                                   // asphalt
      else if (z > 13.6 && z < 23) cc.setHSL(0.1, 0.06, lerp(0.58, 0.64, n));                           // pavements
      else if (Math.abs(x) < 5.2 && Math.abs(z) < 4.2) cc.setHSL(0.08, 0.3, lerp(0.3, 0.36, n));        // the trodden ground under the house
      else cc.setHSL(lerp(0.2, 0.25, n), 0.55, lerp(0.27, 0.37, n));                                    // meadow
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, clipM(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))); m.receiveShadow = true; scene.add(m);
  }

  // ---------- sky, haze, far hills, light (the look test)
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
  const SUN = V(-0.62, 0.48, 0.45).normalize();
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
  const WT = noiseTex(235, 14, 16);
  const WHITE = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, map: WT.map, roughness: 0.85, envMapIntensity: 0.45 });
  const GLASS = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.2, roughness: 0.06, envMapIntensity: 1.3 });
  const WOOD = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.8, envMapIntensity: 0.4 });
  const STEEL = new THREE.MeshStandardMaterial({ color: 0x8c9298, metalness: 0.7, roughness: 0.35, envMapIntensity: 0.6 });
  const DARK = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.6, envMapIntensity: 0.4 });
  const RT = noiseTex(140, 70, 6);
  const ROCK = new THREE.MeshStandardMaterial({ color: 0x9a948a, map: RT.map, normalMap: RT.normalMap, roughness: 0.95, envMapIntensity: 0.4 });
  const sh = o => B.shadowed(o);
  const stripeTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(140,190,230,0.55)'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * hash(i * 3)})`; x.fillRect(hash(i) * 64, hash(i * 7) * 256, 1 + 2 * hash(i * 5), 14 + 40 * hash(i * 9)); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // a water ribbon lying on the ground along a polyline [[x, z], ...]; its stripes run downstream
  function ribbon(pts, w, lift = 0.06) {
    const P = [], uv = [], idx = []; let L = 0;
    pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) L += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
      [-1, 1].forEach(s => { const x = q[0] + nx * w / 2 * s, z = q[1] + nz * w / 2 * s; P.push(x, hAt(x, z) + lift, z); uv.push((s + 1) / 2, L / 5); });
      if (i) { const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } });
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gq.setIndex(idx);
    const tx = stripeTex.clone(); tx.needsUpdate = true;
    const m = new THREE.Mesh(gq, clipM(new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
    m.renderOrder = 2; scene.add(m); return m;
  }
  const flow = (rb, t, speed, op, col) => { rb.visible = op > 0.01; rb.material.opacity = op; rb.material.map.offset.y = -t * speed / 5; if (col != null) rb.material.color.setHex(col); };
  const line = (a, b, n = 24, fn) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [lerp(a[0], b[0], u) + (fn ? fn(u) : 0), lerp(a[1], b[1], u)]; });

  // ---------- 1) the house (modern box, glass front, balcony) + 9 columns (pilotis); columns hang from the floor
  const house = new THREE.Group(); scene.add(house);
  { const slab = new THREE.Mesh(rbox(9.2, 0.35, 7.2, 0.05), CONC); slab.position.y = 0.175; house.add(slab);
    const body = new THREE.Mesh(rbox(8.6, 3.0, 6.6, 0.04), WHITE); body.position.y = 1.85; house.add(body);
    const roof = new THREE.Mesh(rbox(9.6, 0.32, 7.6, 0.05), WHITE); roof.position.y = 3.5; house.add(roof);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.5), GLASS); glass.position.set(-1.2, 1.65, 3.31); house.add(glass);
    for (let i = 0; i <= 4; i++) { const mu = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.5, 0.06), DARK); mu.position.set(-4.0 + i * 1.4, 1.65, 3.33); house.add(mu); }
    const clad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.08), WOOD); clad.position.set(3.0, 1.85, 3.33); house.add(clad);
    [[-4.31, -1.2], [-4.31, 1.4], [4.31, 0.2]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), GLASS); w.position.set(x, 2.0, z); w.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2; house.add(w); });
    const bal = new THREE.Mesh(rbox(6.0, 0.22, 1.9, 0.04), CONC); bal.position.set(-1.2, 0.24, 4.25); house.add(bal);
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.0), new THREE.MeshStandardMaterial({ color: 0x9fc0d0, transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
    rail.position.set(-1.2, 0.85, 5.18); house.add(rail);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.06, 0.08), STEEL); top.position.set(-1.2, 1.36, 5.18); house.add(top);
    const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), new THREE.MeshStandardMaterial({ color: 0x4e7a34, roughness: 0.9 })); plant.position.set(-3.8, 0.75, 4.6); house.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 12), DARK); pot.position.set(-3.8, 0.55, 4.6); house.add(pot); }
  sh(house);
  const COLS = []; { const cg = new THREE.CylinderGeometry(0.22, 0.22, 1, 16); cg.translate(0, -0.5, 0);
    [-3.6, 0, 3.6].forEach(x => [-2.6, 0, 2.6].forEach((z, j) => { const m = new THREE.Mesh(cg, CONC); m.castShadow = m.receiveShadow = true; scene.add(m);
      COLS.push({ m, x, z, row: j, len: FL - hAt(x, z) + 0.25 }); })); }

  // ---------- 2) the crest channel (a concrete U across the slope above the house), z = -14.5, x -15 .. 14
  const CHZ = -14.5, CHX0 = -15, CHX1 = 14;
  const chan = []; for (let x = CHX0; x < CHX1; x += 1) { const gq = new THREE.Group(), y = hAt(x + 0.5, CHZ);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 1.3), CONC); b.position.y = 0.05; gq.add(b);
    [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.14), CONC); w.position.set(0, 0.3, s * 0.6); gq.add(w); });
    gq.position.set(x + 0.5, y, CHZ); scene.add(sh(gq)); chan.push(gq); }
  const runUp = [], runLo = []; for (let i = 0; i < 7; i++) { const x0 = -7 + i * 2.3 + hash(i) * 0.8, wig = u => 0.5 * Math.sin(u * 7 + i);
    runUp.push(ribbon(line([x0, -25], [x0, CHZ - 0.7], 20, wig), 0.9)); runLo.push(ribbon(line([x0 + wig(0.5), CHZ + 0.7], [x0 * 0.7, -3.4], 16, u => 0.3 * Math.sin(u * 9 + i)), 0.9)); }
  const chanWater = ribbon(line([CHX0, CHZ], [CHX1, CHZ], 40), 1.0, 0.2);
  // ---------- 3) downhill at x = 14.5: fast water (later muddy), the hole by the neighbour, then the hydraulic staircase
  const STX = 14.5;
  const downWater = ribbon(line([STX, CHZ], [STX, 13.2], 50, u => 0.35 * Math.sin(u * 11)), 1.4);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x24170e, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }));
  crater.rotation.x = -Math.PI / 2 + Math.atan(SL); crater.position.set(17.2, hAt(17.2, 3.8) + 0.05, 3.8); scene.add(crater);
  const neighbour = new THREE.Group(); scene.add(neighbour);
  { const y = hAt(23, 4) - 0.6; const b = new THREE.Mesh(rbox(6, 3.2, 6, 0.04), new THREE.MeshStandardMaterial({ color: 0xe2d2bc, roughness: 0.9 })); b.position.set(23, y + 1.6, 4); neighbour.add(b);
    const rg = new THREE.CylinderGeometry(4.4, 4.4, 6.6, 3, 1); rg.rotateX(Math.PI / 2); rg.rotateZ(Math.PI / 2); const r = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x8a3c2c, roughness: 0.8 })); r.scale.set(1, 0.38, 1); r.rotation.y = Math.PI / 2; r.position.set(23, y + 3.95, 4); neighbour.add(r);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), GLASS); w.position.set(19.98, y + 1.8, 4); w.rotation.y = -Math.PI / 2; neighbour.add(w); }
  sh(neighbour);
  const shed = new THREE.Group(); scene.add(shed); { const b = new THREE.Mesh(rbox(1.5, 1.7, 1.3, 0.03), WOOD); b.position.y = 0.85; shed.add(b); const r = new THREE.Mesh(rbox(1.8, 0.12, 1.6, 0.03), DARK); r.position.y = 1.75; shed.add(r); }
  shed.position.set(18.4, hAt(18.4, 5.2), 5.2); sh(shed);
  const STEPS = []; { const SL0 = CHZ + 0.4, N = 25, D = (13.4 - SL0) / N;
    for (let i = 0; i < N; i++) { const z0 = SL0 + i * D, y = hAt(STX, z0) + 0.08, gq = new THREE.Group();
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, D + 0.02), CONC); s.position.y = -0.8; gq.add(s);
      [-1, 1].forEach(q => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, D + 0.02), CONC); w.position.set(q * 1.4, -0.55, 0); gq.add(w); });
      const wt = new THREE.Mesh(new THREE.PlaneGeometry(2.5, D), new THREE.MeshBasicMaterial({ map: (() => { const tx = stripeTex.clone(); tx.needsUpdate = true; return tx; })(), transparent: true, opacity: 0, depthWrite: false }));
      wt.rotation.x = -Math.PI / 2; wt.position.y = 0.03; gq.add(wt); gq.userData.w = wt;
      gq.position.set(STX, y, z0 + D / 2); scene.add(sh(gq)); STEPS.push(gq); } }

  // ---------- 4) the cutaway: section faces with soil layers (topsoil, clay, rock), piles, the drill
  const nTop = z => 1.3 + 0.6 * (B.fbm(z / 40 + 7, 2.3, 8, 3) - 0.5), nRock = z => 5 + 1.6 * (B.fbm(z / 50 + 1, 5.1, 8, 3) - 0.5);
  const secG = new THREE.Group(); scene.add(secG);
  function face(axis, c0, a0, a1, top) {          // axis 'x': plane x = c0, spanning z a0..a1; axis 'z': plane z = c0, spanning x a0..a1
    const NS = 260, NY = 150, P = [], C = [], idx = [], cc = new THREE.Color();
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NS; i++) { const s = lerp(a0, a1, i / NS), ty = top(s) + 0.04, y = lerp(-24, ty, Math.pow(j / NY, 0.55)), d = ty - y;
      const zz = axis === 'x' ? s : c0, n = B.fbm(s / 6 + 2, y / 6 + 9, 8, 3), dt = nTop(zz), dr = nRock(zz);
      if (d < 0.1) cc.setHSL(0.24, 0.45, 0.3); else if (d < dt) cc.setHSL(0.07, 0.42, lerp(0.17, 0.24, n)); else if (d < dr) cc.setHSL(0.085, 0.45, lerp(0.33, 0.42, n));
      else { const cr = B.fbm(s / 9 + 1, y / 9 + 4, 8, 3); cc.setHSL(0.09, 0.06, lerp(0.44, 0.56, n) - (cr > 0.68 ? 0.08 : 0)); }
      if (axis === 'x') P.push(c0, y, s); else P.push(s, y, c0); C.push(cc.r, cc.g, cc.b); }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NS; i++) { const a = j * (NS + 1) + i; idx.push(a, a + 1, a + NS + 1, a + 1, a + NS + 2, a + NS + 1); }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); gq.setIndex(idx); gq.computeVertexNormals();
    const m = new THREE.Mesh(gq, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, color: 0xd8d8d8 })); secG.add(m); return m;
  }
  face('x', SX, CZ0, CZ1, z => hAt(SX, z)); face('z', CZ0, SX, 70, x => hAt(x, CZ0)); face('z', CZ1, SX, 70, x => hAt(x, CZ1));
  const PILES = [-2.6, 0, 2.6].map(z => { const gy = hAt(SX, z), by = gy - nRock(z) - 1.6, L = gy - by;
    const pg = new THREE.CylinderGeometry(0.34, 0.34, 1, 20); pg.translate(0, 0.5, 0); const pile = new THREE.Mesh(pg, CONC); pile.position.set(SX, by, z); scene.add(pile);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, L, 10, 8, true), new THREE.MeshBasicMaterial({ color: 0x9a5a34, wireframe: true, transparent: true })); cage.position.set(SX + 0.02, by + L / 2, z); scene.add(cage);
    const aug = new THREE.Group(); { const hp = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 * 9; hp.push(V(Math.cos(a) * 0.32, -i / 120 * 4.2, Math.sin(a) * 0.32)); }
      aug.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 240, 0.06, 6), STEEL)); const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8), STEEL); core.position.y = -1.6; aug.add(core); }
    scene.add(aug); return { z, gy, by, L, pile, cage, aug }; });
  // ---------- 5) soil nails (in the cutaway) + shotcrete skin + nail heads; the tension crack
  const NAILD = V(0, -0.26, -0.966), NAILZ = [-5.2, -6.8, -8.4, -10.0, -11.6];
  const NAILS = NAILZ.map(z => { const P0 = V(SX + 0.05, hAt(SX, z) - 0.05, z), gq = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 8), STEEL); bar.rotation.x = Math.PI / 2; bar.position.z = 3; gq.add(bar);
    const grout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 12), new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.9, transparent: true, opacity: 0.85 })); grout.rotation.x = Math.PI / 2; grout.position.z = 3; gq.add(grout); gq.userData.grout = grout;
    gq.position.copy(P0); gq.lookAt(P0.clone().add(NAILD)); scene.add(gq); return { gq, P0 }; });
  const SKX0 = -9.5, SKX1 = 9.5, SKZ0 = -12.2, SKZ1 = -4.2;
  const skin = (() => { const gq = new THREE.PlaneGeometry(SKX1 - SKX0, SKZ1 - SKZ0, 80, 40); gq.rotateX(-Math.PI / 2); const p = gq.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (SKX0 + SKX1) / 2, z = p.getZ(i) + (SKZ0 + SKZ1) / 2; p.setXYZ(i, x, hAt(x, z) + 0.1 + 0.03 * hash(i), z); }
    gq.computeVertexNormals(); const st = noiseTex(170, 50, 24); const m = new THREE.Mesh(gq, clipM(new THREE.MeshStandardMaterial({ color: 0xbab6ae, map: st.map, normalMap: st.normalMap, roughness: 0.95, envMapIntensity: 0.4 })));
    m.receiveShadow = true; scene.add(m); return m; })();
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.06), clipM(STEEL.clone()), 60); { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(); let n = 0;
    for (let x = -8; x <= 8.1; x += 2) NAILZ.forEach(z => { const y = hAt(x, z) + 0.14; Q.setFromUnitVectors(V(0, 0, 1), V(0, 1, SL).normalize()); M4.compose(V(x, y, z), Q, V(1, 1, 1)); heads.setMatrixAt(n++, M4); }); heads.count = n; scene.add(heads); }
  const skinStrip = (() => { const P = [], idx = [], N = 80; for (let i = 0; i <= N; i++) { const z = lerp(SKZ1, SKZ0, i / N), y = hAt(SX, z) + 0.1; P.push(SX + 0.06, y + 0.04, z, SX + 0.06, y - 0.22, z); if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setIndex(idx); gq.computeVertexNormals();
    const m = new THREE.Mesh(gq, new THREE.MeshStandardMaterial({ color: 0xb4b0a8, roughness: 0.95, side: THREE.DoubleSide })); scene.add(m); return m; })();
  const crack = ribbon(line([-9, -12.6], [9, -12.6], 36, u => 0.25 * Math.sin(u * 37) + 0.15 * Math.sin(u * 91)), 0.3, 0.07);
  crack.material.map = null; crack.material.color.setHex(0x1a120c);
  // ---------- 6) groundwater behind the skin (a blue region in the cutaway) + deep drain pipes
  const waterU = { fill: { value: 0 } };
  const gw = (() => { const P = [], A = [], idx = [], NS = 60, NY = 30;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NS; i++) { const z = lerp(-13.2, -4.4, i / NS), s = hAt(SX, z) - 0.25, r = hAt(SX, z) - nRock(z); P.push(SX + 0.08, lerp(r, s, j / NY), z); A.push(s, r); }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NS; i++) { const a = j * (NS + 1) + i; idx.push(a, a + 1, a + NS + 1, a + 1, a + NS + 2, a + NS + 1); }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gq.setAttribute('sr', new THREE.Float32BufferAttribute(A, 2)); gq.setIndex(idx);
    const m = new THREE.Mesh(gq, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: waterU,
      vertexShader: 'attribute vec2 sr; varying vec2 vSR; varying float vY; void main(){ vSR = sr; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float fill; varying vec2 vSR; varying float vY; void main(){ float lev = mix(vSR.y, vSR.x, fill); if (vY > lev) discard; float e = smoothstep(lev - 0.25, lev, vY); gl_FragColor = vec4(mix(vec3(0.06,0.24,0.62), vec3(0.35,0.6,0.95), e), 0.6); }' }));
    m.renderOrder = 3; scene.add(m); return m; })();
  const PIPED = V(0, 0.1, -0.995).normalize(), PIPEZ = [-5.6, -8.2, -10.8];
  const perfTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#e8e6e0'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#3a3a3a';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(8 + i * 16 + (j % 2) * 8, 8 + j * 16, 3, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 18); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const PIPEM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: perfTex, roughness: 0.6, envMapIntensity: 0.5 });
  const PIPES = PIPEZ.map(z => { const P0 = V(SX + 0.12, hAt(SX, z) - 0.6, z), gq = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 7.5, 14), PIPEM); p.rotation.x = Math.PI / 2; p.position.z = 3.75 - 0.4; gq.add(p);
    gq.position.copy(P0); gq.lookAt(P0.clone().add(PIPED)); scene.add(gq); return { gq, P0 }; });
  const outlets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), clipM(PIPEM.clone()), 20); { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, -0.1, 1).normalize()); let n = 0;
    for (let x = -7; x <= 7.1; x += 3.5) PIPEZ.forEach(z => { M4.compose(V(x, hAt(x, z) + 0.1, z + 0.1), Q, V(1, 1, 1)); outlets.setMatrixAt(n++, M4); }); outlets.count = n; scene.add(outlets); }
  // ---------- 7) the rockfall net (posts + steel mesh) and the boulder
  const NETZ = -19, NX0 = -10, NX1 = 10, NETH = 3.2;
  const posts = []; for (let x = NX0; x <= NX1 + 0.1; x += 4) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, NETH + 0.4, 10), STEEL); p.geometry.translate(0, (NETH + 0.4) / 2, 0); p.position.set(x, hAt(x, NETZ) - 0.3, NETZ); p.rotation.x = -0.12; p.castShadow = true; scene.add(p); posts.push(p); }
  const netTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.strokeStyle = '#d0d4d8'; x.lineWidth = 7;
    x.beginPath(); x.moveTo(0, 64); x.lineTo(64, 0); x.lineTo(128, 64); x.lineTo(64, 128); x.closePath(); x.stroke(); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 4); return t; })();
  const netGeo = new THREE.PlaneGeometry(NX1 - NX0, NETH, 60, 12); const NET0 = netGeo.attributes.position.array.slice();
  const netM = new THREE.Mesh(netGeo, new THREE.MeshStandardMaterial({ color: 0xaab0b6, map: netTex, alphaMap: netTex, transparent: true, alphaTest: 0.3, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
  netM.position.set(0, 0, NETZ); netM.castShadow = true; scene.add(netM);
  const boulder = (() => { const gq = new THREE.IcosahedronGeometry(0.95, 3), p = gq.attributes.position, v = V(0, 0, 0);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.22 * (B.fbm(v.x * 0.6 + 3, v.y * 0.6 + v.z * 0.4, 4, 3) - 0.5) * 2); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
    gq.computeVertexNormals(); const m = new THREE.Mesh(gq, ROCK); m.castShadow = true; scene.add(m); return m; })();
  // ---------- 8) booster pump + pipe up to a tank on top + a pipe down to the house; the inclined elevator (rails, cart, groceries)
  const PX = -11;
  const pumpHouse = new THREE.Group(); scene.add(pumpHouse); { const b = new THREE.Mesh(rbox(2.4, 2.2, 2.2, 0.04), CONC); b.position.y = 1.1; pumpHouse.add(b); const d = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), DARK); d.position.set(0, 0.8, 1.11); pumpHouse.add(d);
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x2a6cc8, roughness: 0.4, metalness: 0.3 })); pm.rotation.z = Math.PI / 2; pm.position.set(1.5, 0.45, 0.2); pumpHouse.add(pm); }
  pumpHouse.position.set(PX - 0.8, STREETY, 16.2); sh(pumpHouse);
  const upPath = new THREE.CatmullRomCurve3([V(PX + 0.6, STREETY + 0.45, 16), ...Array.from({ length: 30 }, (_, i) => { const z = lerp(14, -29, i / 29); return V(PX, hAt(PX, z) + 0.25, z); })]);
  const pipeUp = new THREE.Mesh(new THREE.TubeGeometry(upPath, 300, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0x3a6ea8, roughness: 0.5, metalness: 0.3 })); pipeUp.castShadow = true; scene.add(pipeUp);
  const upFlow = new THREE.Mesh(new THREE.TubeGeometry(upPath, 300, 0.16, 10), new THREE.MeshBasicMaterial({ map: (() => { const t = stripeTex.clone(); t.needsUpdate = true; t.repeat.set(30, 1); return t; })(), transparent: true, opacity: 0, depthWrite: false })); scene.add(upFlow);
  const TANKP = V(PX, hAt(PX, -31), -31);
  const tank = new THREE.Group(); scene.add(tank); { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.2, 28), STEEL); b.position.y = 1.6; tank.add(b); const r = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.6, 28), STEEL); r.position.y = 3.5; tank.add(r); }
  tank.position.copy(TANKP); sh(tank);
  const downPath = new THREE.CatmullRomCurve3([V(PX + 1.2, TANKP.y + 0.4, -30.4), ...Array.from({ length: 16 }, (_, i) => { const u = i / 15, x = lerp(PX + 2, -3.2, u), z = lerp(-29.5, -3.4, u); return V(x, hAt(x, z) + 0.25, z); }), V(-3.2, FL + 0.6, -3.35)]);
  const pipeDown = new THREE.Mesh(new THREE.TubeGeometry(downPath, 200, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x3a6ea8, roughness: 0.5, metalness: 0.3 })); pipeDown.castShadow = true; scene.add(pipeDown);
  const downFlow = new THREE.Mesh(new THREE.TubeGeometry(downPath, 200, 0.13, 8), new THREE.MeshBasicMaterial({ map: (() => { const t = stripeTex.clone(); t.needsUpdate = true; t.repeat.set(20, 1); return t; })(), transparent: true, opacity: 0, depthWrite: false })); scene.add(downFlow);
  const RX = -6.6, RA = V(RX, STREETY + 0.55, 15.6), RB = V(RX, FL + 0.25, -0.6), RDIR = RB.clone().sub(RA), RLEN = RDIR.length(); RDIR.normalize();
  const rails = new THREE.Group(); scene.add(rails);
  { const Q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), RDIR), mid = RA.clone().lerp(RB, 0.5);
    [-0.5, 0.5].forEach(o => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, RLEN, 0.14), STEEL); r.quaternion.copy(Q); r.position.copy(mid).add(V(o, 0, 0)); rails.add(r); });
    for (let i = 0; i <= 8; i++) { const p = RA.clone().lerp(RB, i / 8), gy = hAt(RX, p.z), hh = p.y - gy; if (hh < 0.15) continue; [-0.5, 0.5].forEach(o => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, hh, 0.12), STEEL); s.position.set(RX + o, gy + hh / 2, p.z); rails.add(s); }); }
    const land = new THREE.Mesh(rbox(1.6, 0.18, 2.0, 0.03), CONC); land.position.set(RX + 0.1, FL + 0.2, -1.6); rails.add(land);
    const winch = new THREE.Mesh(rbox(1.0, 0.8, 0.8, 0.05), DARK); winch.position.set(RX, FL + 0.7, -2.4); rails.add(winch);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, RLEN, 4), DARK); cable.quaternion.copy(Q); cable.position.copy(mid).add(V(0, 0.12, 0)); rails.add(cable); }
  sh(rails);
  const cart = new THREE.Group(); scene.add(cart);
  { const base = new THREE.Mesh(rbox(1.3, 0.12, 1.2, 0.03), STEEL); base.position.y = 0.3; cart.add(base);
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.12), STEEL); wedge.position.set(0, 0.05, 0.5); cart.add(wedge);
    [[-0.6, -0.55], [0.6, -0.55], [-0.6, 0.55], [0.6, 0.55]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), STEEL); p.position.set(x, 0.8, z); cart.add(p); });
    const rl = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 1.15), new THREE.MeshStandardMaterial({ color: 0xd8a020, roughness: 0.5 })); rl.position.y = 1.25; cart.add(rl);
    const BAG = new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.9 });
    [[-0.3, 0.1], [0.25, -0.15], [0.2, 0.3]].forEach(([x, z], i) => { const b = new THREE.Mesh(rbox(0.42, 0.55, 0.3, 0.03), BAG); b.position.set(x, 0.64, z); b.rotation.y = i * 0.4; cart.add(b);
      const veg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshStandardMaterial({ color: [0x4e9a30, 0xd84a20, 0xe8c040][i], roughness: 0.7 })); veg.position.set(x, 0.95, z); cart.add(veg); }); }
  sh(cart);
  // street dressing: a garage at street level, lamp posts, lane marks
  { const gar = new THREE.Group(); const b = new THREE.Mesh(rbox(4.2, 2.8, 5, 0.04), WHITE); b.position.y = 1.4; gar.add(b); const d = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a5e64, metalness: 0.5, roughness: 0.4 })); d.position.set(0, 1.1, 2.51); gar.add(d);
    gar.position.set(-3.5, STREETY, 12.4); scene.add(sh(gar));
    for (let x = -30; x <= 30; x += 4) { const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.15), new THREE.MeshBasicMaterial({ color: 0xe8e4d8 })); m.position.set(x, STREETY + 0.02, 18); scene.add(m); }
    [-20, 22, 34].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 8), DARK); p.position.set(x, STREETY + 2.5, 14.3); scene.add(sh(p)); const a = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.2), DARK); a.position.set(x, STREETY + 5, 14.8); scene.add(a); }); }

  // ---------- plants: blade grass on the slope (clipped by the cutaway), flowers, trees around
  const WIND = { t: { value: 0 }, amp: { value: 0.08 }, dir: { value: new THREE.Vector2(1, 0.3) } };
  const swayify = m => { m.onBeforeCompile = s => { Object.assign(s.uniforms, { wT: WIND.t, wA: WIND.amp, wD: WIND.dir });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float wT, wA; uniform vec2 wD;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;\n#else\n float ph = 0.0;\n#endif\n float sw = (sin(wT * 2.3 + ph) * 0.6 + 0.4) * wA * position.y;\n transformed.xz += wD * sw;'); };
    m.customProgramCacheKey = () => 'sway'; return m; };
  let skinGrass = null;
  function plants() {
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Color();
    const put = (geo, mat, n, ok, sc, col, seed) => { const im = new THREE.InstancedMesh(geo, mat, n); let cnt = 0;
      for (let i = 0; cnt < n && i < n * 6; i++) { const x = (hash(seed + i * 1.37) - 0.5) * 90, z = -46 + hash(seed + i * 2.11) * 60; if (!ok(x, z)) continue;
        Q.setFromEuler(E.set((hash(i * 3) - 0.5) * 0.3, hash(i * 5) * 6.28, (hash(i * 7) - 0.5) * 0.3)); const s = sc(i); M4.compose(V(x, hAt(x, z), z), Q, V(s, s * (0.75 + 0.5 * hash(i * 11)), s)); im.setMatrixAt(cnt, M4);
        if (col) im.setColorAt(cnt, col(i, C)); cnt++; }
      im.count = cnt; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; };
    const blade = (() => { const gq = new THREE.PlaneGeometry(0.05, 0.36, 1, 4); gq.translate(0, 0.18, 0); const p = gq.attributes.position, cl = [];
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36; p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.08); cl.push(0.35 + 0.65 * y, 0.35 + 0.65 * y, 0.35 + 0.65 * y); }
      gq.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); gq.computeVertexNormals(); return gq; })();
    const GM = clipM(swayify(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 })));
    const inSkin = (x, z) => x > SKX0 && x < SKX1 && z > SKZ0 && z < SKZ1;
    const free = (x, z) => z < 13.4 && !(Math.abs(x) < 5 && Math.abs(z) < 4) && !(Math.abs(x - STX) < 1.7 && z > CHZ - 1) && !(Math.abs(z - CHZ) < 0.9 && x > CHX0 - 0.6 && x < CHX1 + 0.6)
      && !(Math.abs(x - RX) < 0.9 && z > -1 && z < 15) && !(Math.abs(x + 3.5) < 2.5 && z > 9 && z < 14.5);
    const gcol = (i, cc) => cc.setHSL(0.22 + 0.06 * hash(i * 13), 0.55, 0.32 + 0.12 * hash(i * 17));
    put(blade, GM, 170000, (x, z) => free(x, z) && !inSkin(x, z), () => 1.1, gcol, 11);
    skinGrass = put(blade, GM, 16000, (x, z) => free(x, z) && inSkin(x, z), () => 1.1, gcol, 51);
    const FL2 = [0xffffff, 0xfff1a8, 0xffc8e0, 0xffffff];
    put(new THREE.IcosahedronGeometry(0.04, 1), clipM(new THREE.MeshStandardMaterial({ roughness: 0.6 })), 4000, (x, z) => free(x, z) && !inSkin(x, z), () => 1, (i, cc) => cc.set(FL2[i % 4]), 33).position.y = 0.33;
    const cyG = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(Math.max(0.02, 1.4 * Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62 + 0.25), 1.4) * (1 - u * 0.75)), u * 8)); }
      const gq = new THREE.LatheGeometry(pts, 20); gq.translate(0, 1.4, 0); return gq; })();
    const roG = (() => { const gq = new THREE.IcosahedronGeometry(2.6, 4), p = gq.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.18 * (B.fbm(v.x * 0.35 + 2, v.z * 0.35 + v.y * 0.3 + 5, 4, 3) - 0.5) * 2; v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
      gq.translate(0, 4.2, 0); gq.computeVertexNormals(); return gq; })();
    const trG = new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6); trG.translate(0, 1.2, 0);
    const cy = [], ro = []; for (let i = 0; i < 320; i++) { const x = (hash(i * 4.1) - 0.5) * 220, z = -150 + hash(i * 8.3) * 200;
      const ok = (z < -36 || Math.abs(x) > 30 || z > 25) && !(z > 13 && z < 24); if (!ok) continue; (hash(i * 2.2) < 0.45 ? cy : ro).push([x, hAt(x, z), z, 0.8 + 0.6 * hash(i * 9.1)]); }
    [[-21, -8], [24, -12], [-24, 6], [28, 14.0 - 4]].forEach(([x, z], i) => ro.push([x, hAt(x, z), z, 0.9 + 0.2 * i]));
    const tput = (gq, base, list, hue, s0) => { const im = new THREE.InstancedMesh(gq, clipM(new THREE.MeshStandardMaterial({ color: base, roughness: 0.85 })), list.length);
      list.forEach(([x, y, z, s], i) => { M4.compose(V(x, y - 0.2, z), Q.setFromAxisAngle(V(0, 1, 0), s * 9), V(s, s * (0.85 + 0.35 * hash(i * 1.7)), s)); im.setMatrixAt(i, M4); if (hue != null) im.setColorAt(i, C.setHSL(hue + 0.04 * hash(i), s0, 0.32 + 0.12 * hash(i * 5))); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im); };
    tput(cyG, 0xffffff, cy, 0.24, 0.35); tput(roG, 0xffffff, ro, 0.2, 0.42); tput(trG, 0x5a4232, cy.concat(ro));
  }

  // ---------- sprites (dust, foam, drips, spray) and rain
  const mkPool = n => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const SPR = mkPool(800); let sN = 0;
  const puff = (p, col, size, op) => { if (sN >= SPR.length) return; const s = SPR[sN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = op; };
  function dust(t, t0, p, n = 8, r = 2, col = 0xb89a76, life = 1.2, size = 2) { const u = (t - t0) / life; if (u < 0 || u > 1) return;
    for (let i = 0; i < n; i++) { const a = hash(t0 * 7 + i) * 6.283, rr = r * (0.5 + 0.7 * hash(t0 * 3 + i * 1.7)) * eout(u);
      puff(V(p.x + Math.cos(a) * rr, p.y + 0.3 + u * r * 0.5 * hash(i + t0), p.z + Math.sin(a) * rr), col, size * (0.6 + u), 0.7 * (1 - u) * (1 - u)); } }
  const rainM = new THREE.MeshBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.45, depthWrite: false });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), rainM, 1200); rain.frustumCulled = false; scene.add(rain);

  // ---------- camera shots [arrive t, camera, target, fov, cut?]
  const SHOTS = [
    [0.0, [13, -3.2, 28], [0, 1.2, -3], 48],                                  // from the street: the crooked house on the bare slope
    [T.lift - 0.9, [15, 1.0, 25], [-0.5, 1.4, 0], 48],                       // the house lifts, the columns grow (whole house in frame)
    [T.z1 - 0.3, [10.5, 2.0, 17], [0, 2.0, 0], 46],                          // pilotis
    [T.rain0 - 0.1, [19, 15, 15], [1, 2.5, -10], 50],                            // high: the rain runs down onto the house; the channel is cut across
    [T.ditch - 0.5, [-15, 12.5, -3.5], [1, 5.8, -14.5], 50],                   // down the line of the channel: it is cut across the slope
    [T.digs - 0.4, [18, -3.4, 26], [14.5, 1.5, -4], 50, 'cut'],                      // from the street: the fast water, the hole, the staircase builds
    [T.step - 0.3, [18.5, 1.2, 11], [14.5, 0.2, -1], 48],                     // close on the steps: the water slows step by step
    [T.creep0 - 0.05, [31, 1.0, -0.3], [SX, -2.2, -0.3], 48, 'cut'],            // CUTAWAY: soil creeps, the drill goes down to rock, piles
    [T.week - 0.4, [-17, 13, 3], [0, 3.5, -9], 50, 'cut'],                      // a week of rain: the crack across the slope
    [T.stitch - 0.1, [27, 4.0, -7.6], [SX, 0.6, -8.2], 48, 'cut'],           // CUTAWAY: soil nails driven in
    [T.spray - 0.1, [-16, 13, 2], [0, 3.5, -8.5], 50, 'cut'],                    // the concrete skin spreads over the slope
    [T.drain0 - 0.1, [27, 4.0, -7.6], [SX, 0.6, -8.2], 48, 'cut'],           // CUTAWAY: water builds up, the drains go in
    [T.rock0 - 0.1, [11, 14, -7], [0.5, 9.5, -24], 48, 'cut'],                // the loose rock on the edge above
    [T.stretch - 0.3, [16, 14.5, -4], [0, 8, -19.5], 50],                       // the net goes up, the rock hits it
    [T.knows - 0.05, [7.5, 3.2, 12.5], [0, 2.6, 0], 46, 'cut'],               // the house never knew
    [T.pump0 - 0.1, [-24, 1.5, 24], [-9, 3, -10], 50, 'cut'],              // from the street: pump, pipe up to the tank, the rails
    [T.cart - 0.3, [-21, 3.5, 7], [-6.6, -0.5, 6], 50],                    // the cart climbs with the groceries
    [T.end0, [24, 12, 30], [0, 1.5, -6], 50],                                 // wide: everything we built
    [T.first - 0.6, [32, 22, 36], [0, 1, -8], 50],
  ].map(([t, p, q, f, cut]) => ({ t, p: V(...p), q: V(...q), f, cut: !!cut }));
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1], push = (s, u) => ({ p: s.p.clone().lerp(s.q, 0.05 * u), q: s.q.clone(), f: s.f });
    if (!b) return push(a, ease(k(t, a.t, DUR)));
    if (b.cut) return push(a, ease(k(t, a.t, b.t)));
    const dist = a.p.distanceTo(b.p), M = clamp(1.3 + dist / 18, 1.5, 2.6), mv = Math.min(M, (b.t - a.t) * 0.75), ts = b.t - mv;
    const A = push(a, ease(k(t, a.t, ts))); if (t < ts) return A;
    const u = ease(k(t, ts, b.t)), Bv = push(b, 0), mid = A.p.clone().lerp(Bv.p, 0.5); mid.y += Math.min(4, dist * 0.1);
    const p = A.p.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.multiplyScalar(2 * u * (1 - u))).add(Bv.p.clone().multiplyScalar(u * u));
    p.y = Math.max(p.y, hAt(p.x, p.z) + 0.6);
    return { p, q: A.q.clone().lerp(Bv.q, u), f: lerp(A.f, Bv.f, u) };
  }
  window.__camAt = camAt;

  // ---------- update
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), dark = new THREE.Color(), TH = Math.atan(SL);
  let shake = 0;
  function update(t) {
    sN = 0;
    const SEC = secOn(t);
    CLIP[2].constant = SEC ? -CZ1 : 1e4;                                   // turn the cutaway on/off
    secG.visible = SEC;
    // camera (+ shakes on impacts)
    const C = camAt(t); shake = 0.02 + 0.25 * Math.max(0, 1 - Math.abs(t - T.slide - 0.1) / 0.5) + 0.18 * Math.max(0, 1 - Math.abs(t - T.never) / 0.35);
    C.p.add(V(B.n1(t * 7) * shake, B.n1(t * 6 + 3) * shake, B.n1(t * 5 + 7) * shake * 0.5));
    cam.position.copy(C.p); cam.up.set(0, 1, 0); cam.lookAt(C.q); cam.fov = C.f; cam.near = 0.1; cam.far = 2500; cam.updateProjectionMatrix();
    // moods: the rain (two spells), grey
    const rainA = sm(k(t, T.rain0 - 0.3, T.rain0 + 0.4)) * (1 - sm(k(t, T.z2 - 0.2, T.z2 + 0.6))), rainB = sm(k(t, T.week - 0.4, T.week + 0.2)) * (1 - sm(k(t, T.z5 - 0.3, T.z5 + 0.5)));
    const wet = Math.max(rainA * 0.8, rainB) * (SEC ? 0.4 : 1), gloom = wet * 0.7;
    sun.intensity = lerp(3.3, 0.6, gloom); hemi.intensity = lerp(0.38, 0.3, gloom);
    skyU.top.value.setHex(0x3f7cc8).lerp(dark.setHex(0x4c5662), gloom); skyU.hor.value.setHex(0xe8dfd6).lerp(dark.setHex(0x848b92), gloom);
    scene.fog.color.setHex(0xc9d2dc).lerp(dark.setHex(0x737b83), gloom); scene.fog.near = lerp(120, 50, gloom); scene.fog.far = lerp(900, 350, gloom);
    clouds.forEach(s => s.material.color.setHex(0xffffff).lerp(dark.setHex(0x5a6068), gloom));
    const span = 34; sun.target.position.set(0, 1, -4); sun.position.copy(sun.target.position).add(SUN.clone().multiplyScalar(150)); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
    const cd = C.p.distanceTo(C.q);
    Object.assign(B.POST, { focus: cd, aperture: cd < 8 ? 0.22 : 0.12, maxBlur: 9, bloom: 0.16, thr: 1.3, sat: lerp(1.08, 0.85, gloom), con: 1.12, exp: lerp(0.95, 0.85, gloom), ao: 1.2, aoR: 0.8, mb: [0, 0] });
    WIND.t.value = t; WIND.amp.value = 0.06 + 0.1 * wet;
    for (let i = 0; i < 1200; i++) { const x = C.q.x + (hash(i) - 0.5) * 34, z = C.q.z + (hash(i * 3) - 0.5) * 34, y = C.q.y + 16 - ((t * 15 + hash(i * 7) * 22) % 22);
      M4.compose(V(x + (16 - y) * 0.08, y, z), Q0.identity(), wet > 0.03 ? V(1, 1, 1) : V(0, 0, 0)); rain.setMatrixAt(i, M4); }
    rain.instanceMatrix.needsUpdate = true; rainM.opacity = 0.5 * wet;

    // 1) house: crooked on the ground -> lifted level -> columns grow down to the ground (short ones up high, tall ones down low)
    const lu = eio(k(t, T.lift - 0.1, T.short - 0.25));
    house.position.set(0, lerp(0.15, FL, lu), lerp(0.0, 0, lu)); house.rotation.set(lerp(TH, 0, lu), 0, lerp(0.05, 0, lu));
    if (t > T.lift - 0.1 && t < T.lift + 0.9) dust(t, T.lift - 0.05, V(0, 0.2, 0), 14, 4, 0xb89a76, 1.2, 2.6);
    const creepA = 0.08 * sm(k(t, T.creeps, T.bend + 0.5)) * (1 - sm(k(t, T.steel, T.z4)));
    COLS.forEach((cl, i) => { const t0 = cl.row === 0 ? T.short - 0.1 : T.tall - 0.1 + (cl.row - 1) * 0.35, u = eout(k(t, t0, t0 + 0.6));
      cl.m.visible = u > 0.01; cl.m.position.set(cl.x, FL, cl.z); cl.m.scale.set(1, Math.max(0.01, cl.len * u), 1); cl.m.rotation.x = -creepA * (cl.x > 3 ? 1 : 0.6);
      if (u > 0.95 && t < t0 + 1.3) dust(t, t0 + 0.6, V(cl.x, hAt(cl.x, cl.z), cl.z), 5, 0.8, 0xb89a76, 0.7, 0.9); });

    // 2) rain runoff down the slope; the crest channel is cut across (left to right), then carries the water sideways
    const chU = k(t, T.ditch - 0.1, T.around - 0.1);
    chan.forEach((s, i) => { const u = eout(clamp(chU * chan.length - i)); s.visible = u > 0.01; s.position.y = hAt(s.position.x, CHZ) - (1 - u) * 1.2;
      if (u > 0.05 && u < 0.9) dust(t, T.ditch - 0.1 + i / chan.length * (T.around - T.ditch), V(s.position.x, s.position.y, CHZ), 3, 0.7, 0x9a7a56, 0.6, 0.9); });
    const runA = Math.max(rainA, rainB * 0.8) * (SEC ? 0 : 1), chanOn = t > T.around - 0.3;
    runUp.forEach(r => flow(r, t, 3.2, 0.6 * runA, 0xffffff));
    runLo.forEach(r => flow(r, t, 3.2, 0.6 * rainA * (1 - sm(k(t, T.around - 0.3, T.around + 0.5))) * (SEC ? 0 : 1), 0xd8c0a0));
    flow(chanWater, t, 4, chanOn ? 0.75 * Math.max(runA, 0.35 * sm(k(t, T.around - 0.3, T.around + 0.3)) * (1 - sm(k(t, T.creep0 - 0.2, T.creep0)))) : 0, 0xffffff);
    if (t > T.washes && t < T.ditch + 0.5) COLS.forEach((cl, i) => { if (cl.row) dust(t, Math.floor(t * 3) / 3 + i * 0.01, V(cl.x, hAt(cl.x, cl.z) - 0.1, cl.z + 0.3), 2, 0.5, 0x6a4a2a, 0.6, 0.6); });
    // 3) the water rushes down at x = 14.5 (muddy, digging), the hole opens by the neighbour, the staircase rises top to bottom
    const stU = k(t, T.stairs - 0.15, T.stairs + 1.5), stOK = !SEC;
    const downA = sm(k(t, T.around, T.around + 0.6)) * (1 - sm(k(t, T.stairs + 0.6, T.stairs + 1.6)));
    flow(downWater, t, 9, stOK ? 0.8 * downA : 0, t > T.digs - 0.4 ? 0xa87c50 : 0xffffff);
    const hole = eout(k(t, T.digs + 0.2, T.digs + 1.4)); crater.visible = stOK && hole > 0.01 && t < T.stairs + 1.6; crater.scale.setScalar(0.05 + 1.6 * hole);
    if (t > T.digs + 0.2 && t < T.digs + 2) dust(t, T.digs + 0.2, V(17.2, hAt(17.2, 3.8), 3.8), 10, 1.8, 0x8a6a46, 1.4, 1.6);
    neighbour.visible = shed.visible = stOK; shed.rotation.set(0.25 * hole, 0, -0.32 * hole); shed.position.y = hAt(18.4, 5.2) - 0.35 * hole;
    STEPS.forEach((s, i) => { const u = eout(clamp(stU * STEPS.length * 0.45 - i * 0.45)); s.visible = stOK && u > 0.01; s.position.y = hAt(STX, s.position.z - 0.55) + 0.08 - (1 - u) * 1.6;
      const wOn = sm(k(t, T.step - 0.6 + i * 0.02, T.step)) * (1 - sm(k(t, T.creep0 - 0.3, T.creep0))); s.userData.w.material.opacity = 0.7 * wOn; s.userData.w.material.map.offset.y = -t * 1.2;
      if (wOn > 0.1 && stOK) { const fs = lerp(1.1, 0.35, i / STEPS.length); puff(V(STX + (hash(i + Math.floor(t * 8)) - 0.5) * 1.6, s.position.y + 0.15, s.position.z + 0.55), 0xffffff, fs * (0.8 + 0.4 * hash(i * 3 + Math.floor(t * 10))), 0.75 * wOn); } });

    // 4) cutaway: soil creeps (chevrons in the overlay, columns lean), the auger drills to rock, steel cage, concrete fills
    PILES.forEach((p, i) => { const dr = k(t, T.drill - 0.1 + i * 0.12, T.rockw + 0.5), on = SEC && t > T.drill - 0.2 && t < T.steel;
      p.aug.visible = on; const depth = lerp(0, p.L + 0.3, eio(dr)); p.aug.position.set(SX + 0.02, p.gy - depth + 4.2, p.z); p.aug.rotation.y = t * 14;
      if (on && dr > 0 && dr < 1) dust(t, Math.floor(t * 4) / 4 + i * 0.03, V(SX + 0.3, p.gy, p.z), 3, 0.6, 0x7a5a3a, 0.5, 0.7);
      const cg = sm(k(t, T.steel - 0.2, T.steel + 0.2)); p.cage.visible = SEC && cg > 0.05 && t > T.creep0; p.cage.material.opacity = cg;
      const fill = eio(k(t, T.steel + 0.3, T.z4 - 0.1)); p.pile.visible = fill > 0.01 && (SEC || t > T.z4); p.pile.scale.set(1, Math.max(0.01, p.L * fill), 1); });
    // 5) the crack (week of rain) + nails driven in + the skin sprayed on (top to bottom)
    const crk = eout(k(t, T.slide - 0.2, T.slide + 0.4)); crack.material.opacity = SEC || t > T.spray + 1.2 ? 0 : 0.9 * crk; crack.visible = crack.material.opacity > 0.01;
    if (t > T.slide - 0.2 && t < T.slide + 1.2 && !SEC) for (let x = -8; x <= 8; x += 2) dust(t, T.slide - 0.2 + x * 0.01, V(x, hAt(x, -12.6), -12.6), 3, 1.0, 0x8a6a46, 1.0, 1.2);
    NAILS.forEach((n, i) => { const u = eio(k(t, T.stitch + 0.1 + i * 0.18, T.bars + 0.4 + i * 0.12)); n.gq.visible = (SEC && t > T.stitch - 0.2) || t > T.spray; n.gq.position.copy(n.P0).addScaledVector(NAILD, -6 + 6 * u);
      n.gq.userData.grout.visible = t > T.bars + 0.4; });
    const skU = eio(k(t, T.spray - 0.05, T.z5 - 0.1)), skN = skin.geometry.index.count; skin.visible = skU > 0.01; skin.geometry.setDrawRange(0, Math.floor(skU * skN / 6) * 6);
    if (skinGrass) skinGrass.visible = skU < 0.5;
    heads.visible = skU > 0.95; skinStrip.visible = SEC && t > T.drain0 - 0.2;
    if (skU > 0 && skU < 1) for (let i = 0; i < 4; i++) { const zz = lerp(SKZ0, SKZ1, skU), xx = (hash(i + Math.floor(t * 9)) - 0.5) * 18; puff(V(xx, hAt(xx, zz) + 0.6, zz), 0xd0ccc4, 1.6, 0.5); }
    // 6) groundwater rises behind the skin, the drains are pushed in, it drains out (drips)
    waterU.fill.value = sm(k(t, T.builds - 0.1, T.push)) * (1 - 0.85 * sm(k(t, T.drainw - 0.3, T.z6 + 0.3))); gw.visible = SEC && t > T.drain0 - 0.2;
    PIPES.forEach((p, i) => { const u = eio(k(t, T.push + i * 0.18, T.push + 1.0 + i * 0.18)); p.gq.visible = SEC && t > T.push - 0.1; p.gq.position.copy(p.P0).addScaledVector(PIPED, -7 + 7 * u);
      if (p.gq.visible && t > T.drainw - 0.3) for (let j = 0; j < 4; j++) { const ph = (t * 1.6 + j / 4 + i * 0.3) % 1; puff(V(SX + 0.25, p.P0.y - ph * 1.6, p.P0.z + 0.1 + ph * 0.3), 0x8cc4ff, 0.22, 0.85 * (1 - ph)); } });
    outlets.visible = t > T.z6;
    // 7) the boulder teeters, rolls; the posts rise, the net stretches left to right; the hit, the bulge, it settles
    const NS = k(t, T.stretch, T.net + 0.5);
    posts.forEach((p, i) => { const u = eout(clamp(NS * 3 - i * 0.35)); p.visible = u > 0.01; p.scale.set(1, Math.max(0.01, u), 1); });
    const nu = eio(k(t, T.stretch + 0.3, T.net + 0.7)); netM.visible = nu > 0.01; netM.scale.set(Math.max(0.01, nu), 1, 1); netM.position.x = NX0 * (1 - nu);
    const z0 = -27.2, zHit = NETZ - 1.05, ru = k(t, T.rolls, T.never), rz = lerp(z0, zHit, Math.pow(ru, 1.25)), bx = 0.6 + 0.4 * Math.sin(ru * 5);
    let rb = 0; if (t > T.never) { rb = Math.sin(k(t, T.never, T.never + 0.7) * Math.PI) * 0.9; }
    const rzz = t > T.never ? zHit + rb * 0.6 - 0.5 * sm(k(t, T.never + 0.5, T.never + 1.5)) : rz;
    boulder.visible = t > T.rock0 - 0.2 && t < T.pump0 + 0.5; boulder.position.set(bx, hAt(bx, rzz) + 0.85 + (ru > 0 && ru < 1 ? 0.5 * Math.abs(Math.sin(ru * Math.PI * 5)) * (1 - ru) : 0), rzz);
    boulder.rotation.x = (rzz - z0) / 0.95; if (t < T.rolls) boulder.rotation.x = 0.06 * Math.sin(t * 9);
    { const P = netGeo.attributes.position, bulge = (t > T.never ? Math.sin(k(t, T.never - 0.05, T.never + 0.9) * Math.PI) * 1.1 + 0.25 * sm(k(t, T.never + 0.5, T.never + 1.0)) : 0);
      for (let i = 0; i < P.count; i++) { const x = NET0[i * 3], y = NET0[i * 3 + 1], dx = (x - bx) / 2.6, dy = (y + NETH / 2 - 1.0) / 1.8, b = bulge * Math.exp(-dx * dx - dy * dy);
        P.setXYZ(i, x, y + NETH / 2 + hAt(clamp(x * nu + NX0 * (1 - nu), -12, 12), NETZ) - 0.1, b); } P.needsUpdate = true; netGeo.computeVertexNormals(); }
    if (t > T.never - 0.05 && t < T.never + 0.9) dust(t, T.never - 0.05, V(bx, hAt(bx, NETZ) + 0.6, NETZ - 0.6), 12, 2.2, 0x9a8a72, 0.9, 1.8);
    if (ru > 0 && ru < 1) dust(t, Math.floor(t * 5) / 5, V(bx, hAt(bx, rz) + 0.1, rz), 2, 0.6, 0xa08a6a, 0.5, 0.8);
    // 8) pump + pipes (grow up the hill), water flows up then down; the rails, the cart climbs
    const pu = eio(k(t, T.pump - 0.3, T.tank + 0.2)); pipeUp.visible = pu > 0.01; pipeUp.geometry.setDrawRange(0, Math.floor(pu * pipeUp.geometry.index.count / 6) * 6);
    pumpHouse.visible = t > T.pump0 - 0.5 || t > T.end0; pumpHouse.scale.setScalar(Math.max(0.01, eout(k(t, T.pump0 - 0.5, T.pump0 + 0.1))));
    tank.visible = t > T.tank - 0.6; tank.scale.setScalar(Math.max(0.01, eout(k(t, T.tank - 0.6, T.tank))));
    const pd = eio(k(t, T.tank, T.tank + 0.9)); pipeDown.visible = pd > 0.01; pipeDown.geometry.setDrawRange(0, Math.floor(pd * pipeDown.geometry.index.count / 6) * 6);
    upFlow.material.opacity = 0.7 * sm(k(t, T.tank - 0.4, T.tank)); upFlow.material.map.offset.x = -t * 1.2; upFlow.visible = upFlow.material.opacity > 0.01;
    downFlow.material.opacity = 0.7 * sm(k(t, T.tank + 0.8, T.tank + 1.2)); downFlow.material.map.offset.x = -t * 1.2; downFlow.visible = downFlow.material.opacity > 0.01;
    const rl = eout(k(t, T.cart - 0.5, T.cart + 0.3)); rails.visible = rl > 0.01; rails.position.y = -(1 - rl) * 3;
    const cu = eio(k(t, T.groc - 0.2, T.hill + 0.8)); cart.visible = t > T.cart - 0.2; const cp = RA.clone().lerp(RB, cu); cart.position.set(RX, cp.y - 0.25, cp.z); cart.scale.setScalar(Math.max(0.01, eout(k(t, T.cart - 0.2, T.cart + 0.2))));
    for (let i = sN; i < SPR.length; i++) SPR[i].visible = false;
  }

  // ---------- overlay: the creep chevrons in the cutaway, vignette
  function overlay(t) {
    B.vignette(0.12);
    if (secOn(t) && t > T.creeps - 0.2 && t < T.drill) { const a = sm(k(t, T.creeps - 0.2, T.creeps + 0.2)) * (1 - sm(k(t, T.drill - 0.3, T.drill)));
      for (let i = 0; i < 6; i++) { const z = -4.4 + ((i * 1.6 + t * 0.9) % 9.6), p0 = B.project(V(SX + 0.2, hAt(SX, z) - 0.65, z)), p1 = B.project(V(SX + 0.2, hAt(SX, z + 0.5) - 0.65, z + 0.5)); if (!p0.ok) continue;
        const an = Math.atan2(p1.y - p0.y, p1.x - p0.x); g.save(); g.translate(p0.x, p0.y); g.rotate(an); g.globalAlpha = a * 0.9; g.strokeStyle = '#fff3d6'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-12, -16); g.lineTo(8, 0); g.lineTo(-12, 16); g.stroke(); g.restore(); } }
    B.tint(Math.max(0, 1 - Math.abs(t - T.never) / 0.12) * 0.25, '#ffffff', 'screen');
  }

  const dimEnv = () => scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) o.material.envMapIntensity = 0.4; });
  B.run({ hdriBackground: false, update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hook', 0, L0('pil')], ['1 Pilotis', L0('pil'), L0('rain')], ['2 Crest channel', L0('rain'), L0('stair')], ['3 Hydraulic staircase', L0('stair'), L0('creep')],
      ['4 Piles', L0('creep'), L0('slide')], ['5 Soil nailing', L0('slide'), L0('drain')], ['6 Deep drains', L0('drain'), L0('rock')], ['7 Rockfall net', L0('rock'), L0('pump')],
      ['Pump + lift', L0('pump'), L0('end')], ['End', L0('end'), DUR]],
    warm: [1, 20, 40, 60], ready: async () => { plants(); dimEnv(); } });
})();
