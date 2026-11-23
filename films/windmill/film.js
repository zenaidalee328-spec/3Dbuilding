// "Windmill": quern -> donkey mill -> sails on a post -> post mill -> brake -> tower mill -> fantail, all on ONE hilltop.
// Look = the approved look test (films/look-test): warm low sun, AO, painted meadow + blade grass, soft sky, haze.
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const c = (l, w, n) => cue(l, w, n), L0 = id => LN(id).t0;
  const T = {
    gorilla: c('hook', 'gorilla'), round: c('quern', 'round'), spin: c('quern', 'spin'), huge: c('donkey', 'huge'), donkey: c('donkey', 'donkey'),
    circles: c('circle', 'circles'), flour: c('circle', 'flour'), cong1: L0('hungry') - 0.9, eats: c('hungry', 'eats'), hungry: L0('hungry'),
    post0: L0('post'), hammer: c('post', 'hammer'), post: c('post', 'post'), nail: c('post', 'nail'), sails: c('post', 'sails'),
    wind: c('free', 'wind'), shift: L0('shift'), changes: c('shift', 'changes'), stop: c('shift', 'stop'),
    genius: L0('tailpole'), whole: c('tailpole', 'whole'), house: c('tailpole', 'house'), push: c('tailpole', 'push'), pole: c('tailpole', 'pole'),
    cong2: L0('storm') - 0.4, storm: c('storm', 'storm'), wildly: c('storm', 'wildly'), miller: c('storm', 'miller'), vanish: c('storm', 'vanishes'),
    brake0: L0('brake'), clamp: c('brake', 'clamp'), brake: c('brake', 'brake'), rubs: c('brake', 'rubs'), smokes: c('brake', 'smokes'),
    heavy0: L0('heavy'), bigger: c('heavy', 'bigger'), heavy: c('heavy', 'heavy'),
    tower0: L0('tower'), build: c('tower', 'build'), tower: c('tower', 'tower'), cap: c('tower', 'cap'), turns: c('tower', 'turns'),
    cong3: L0('tail') - 0.4, night: c('tail', 'night'), swings: c('tail', 'swings'), rips: c('tail', 'rips'),
    brain: L0('fan'), stick: c('fan', 'stick'), windmill: c('fan', 'windmill'), fan0: L0('fan'),
    shifts: c('fan2', 'shifts'), spins: c('fan2', 'spins'), cranks: c('fan2', 'cranks'), itself: c('fan2', 'itself'),
    final: L0('final'), edmund: c('final', 'edmund'),
  };

  // ---------- the hill: a flat round top (r 12), slopes down to a plain; wheat fields around the top
  const TOPR = 12;
  function hAt(x, z) {
    const r = Math.hypot(x, z); let y = r < TOPR ? 0 : -Math.pow((r - TOPR) / 46, 1.5) * 22;
    if (r > 58) y = -22 - (r - 58) * 0.02;
    y += 0.22 * (B.fbm(x / 50 + 3, z / 50 + 1, 8, 3) - 0.5) * sm((r - 6) / 8);
    return y;
  }
  const inPath = (x, z) => z > 0 && Math.abs(x - 0.5 * Math.sin(z * 0.05)) < 2.4;     // a dirt track running down the hill toward the camera side
  const WHEAT0 = 11, WHEAT1 = 46;
  {
    const geo = new THREE.PlaneGeometry(500, 500, 300, 300); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hAt(x, z), r = Math.hypot(x, z); p.setY(i, y);
      const n = B.fbm(x / 9 + 5, z / 9 + 2, 8, 3);
      if (inPath(x, z) || r < 4.2) cc.setHSL(0.08, 0.3, lerp(0.32, 0.4, n));                              // track + the trodden spot under the mills
      else if (r > WHEAT0 - 0.5 && r < WHEAT1) cc.setHSL(0.11, 0.55, lerp(0.38, 0.46, n));                // wheat-field soil (golden)
      else cc.setHSL(lerp(0.2, 0.25, n), 0.6, lerp(0.28, 0.38, n));                                         // meadow
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m);
  }

  // ---------- sky, haze, far hills, light (the look test)
  const FOG = new THREE.Color(0xc9d2dc); scene.fog = new THREE.Fog(FOG.clone(), 120, 900);
  const skyU = { top: { value: new THREE.Color(0x3f7cc8) }, hor: { value: new THREE.Color(0xe8dfd6) } };
  { const sm2 = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.32)), 1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), sm2); sky.renderOrder = -1; scene.add(sky);
    const mm = new THREE.MeshStandardMaterial({ color: 0x8e9fb8, roughness: 1, envMapIntensity: 0.3 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, r = 160 + 110 * hash(i * 7), h = 40 + 50 * hash(i * 2); const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), mm); m.position.set(Math.cos(a) * 760, h / 2 - 30, Math.sin(a) * 760); scene.add(m); } }
  const clouds = []; for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    const a = hash(i * 3.3) * 6.283; s.position.set(Math.cos(a) * 850, 200 + hash(i * 3) * 160, Math.sin(a) * 850); s.scale.set(260 + hash(i * 5) * 200, 70 + hash(i * 9) * 40, 1); scene.add(s); clouds.push(s); }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, color: 0xf4f2e0, transparent: true, depthWrite: false, fog: false })); moon.position.set(-260, 300, -700); moon.scale.setScalar(60); scene.add(moon);
  const SUN = V(-0.66, 0.42, 0.3).normalize();
  B.loadHDR('hdri/kloppenheim_06_2k.hdr', V(-0.66, 0.42, 0.3), 40);
  const sun = new THREE.DirectionalLight(0xffd8aa, 3.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xc4d8ff, 0x5a5a38, 0.38); scene.add(hemi);

  // ---------- helpers: rounded boxes, materials
  function rbox(w, h, d, r, seg = 3) {
    const gq = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = gq.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3();
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); inner.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(inner); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r); v.add(inner); p.setXYZ(i, v.x, v.y, v.z); }
    gq.computeVertexNormals(); return gq;
  }
  const noiseTex = (base, amt) => { const t = B.procTex(256, (u, v) => { const n = B.fbm(u, v, 8, 4), l = base + amt * n; return [l, l * 0.965, l * 0.91, n]; }, 1.2, [1, 1]); return t; };
  const STONE_T = noiseTex(205, 30);
  const STONE = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, map: STONE_T.map, normalMap: STONE_T.normalMap, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.88, envMapIntensity: 0.5 });
  const MILLSTONE = new THREE.MeshStandardMaterial({ color: 0x9a948a, map: STONE_T.map, normalMap: STONE_T.normalMap, roughness: 0.9, envMapIntensity: 0.4 });
  const WOOD = new THREE.MeshStandardMaterial({ color: 0x9a6c44, roughness: 0.85, envMapIntensity: 0.4 });
  const WOODD = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.85, envMapIntensity: 0.4 });
  const BOARDS = (() => { const t = B.procTex(256, (u, v) => { const plank = Math.floor(u * 8), e = (u * 8) % 1, n = B.fbm(u * 2 + plank, v * 0.4, 8, 3), l = (e < 0.06 ? 0.55 : 0.88 + 0.12 * hash(plank)) * (190 + 40 * n); return [l, l * 0.78, l * 0.56, e < 0.06 ? 0 : 0.6]; }, 2, [1, 1]);
    return new THREE.MeshStandardMaterial({ color: 0xe6d2b8, map: t.map, normalMap: t.normalMap, roughness: 0.85, envMapIntensity: 0.4 }); })();
  const CLOTH = new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.95, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 0.8, envMapIntensity: 0.4 });
  const sh = o => B.shadowed(o);

  // ---------- sails: a cross of four lattice sails with cloth (length L, built along +y, the hub at the origin, facing +z)
  function makeSails(L) {
    const gq = new THREE.Group();
    for (let s = 0; s < 4; s++) {
      const arm = new THREE.Group(); arm.rotation.z = s * Math.PI / 2; gq.add(arm);
      const stock = new THREE.Mesh(rbox(0.16, L, 0.16, 0.03, 1), WOOD); stock.position.y = L / 2 + 0.2; arm.add(stock);
      const fw = 1.35, f0 = 0.9;
      [0, fw].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, L - f0, 0.06), WOOD); r.position.set(0.12 + x, f0 + (L - f0) / 2 + 0.2, 0.05); arm.add(r); });
      for (let i = 0; i <= 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.12, 0.05, 0.05), WOOD); b.position.set(0.12 + fw / 2, f0 + 0.2 + i * (L - f0) / 7, 0.05); arm.add(b); }
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.06, L - f0 - 0.1), CLOTH); cl.position.set(0.12 + fw / 2, f0 + (L - f0) / 2 + 0.2, 0.08); arm.add(cl); arm.userData.cloth = cl;
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 14), WOODD); hub.rotation.x = Math.PI / 2; gq.add(hub);
    return sh(gq);
  }

  // ---------- 1) the saddle quern + rotary top stone
  const quern = new THREE.Group(); scene.add(quern);
  const saddle = new THREE.Mesh(rbox(1.0, 0.3, 0.6, 0.1), MILLSTONE); saddle.position.y = 0.15; quern.add(saddle);
  const rubber = new THREE.Mesh(rbox(0.36, 0.16, 0.24, 0.06), MILLSTONE); rubber.position.set(0, 0.36, 0); quern.add(rubber);
  const rotTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 28), MILLSTONE); rotTop.position.set(0, 0.38, 0); quern.add(rotTop);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), WOOD); handle.position.set(0.24, 0.17, 0); rotTop.add(handle);
  sh(quern);
  // ---------- 2) the donkey mill: a Pompeii hourglass (meta + catillus) with a beam
  const dmill = new THREE.Group(); scene.add(dmill);
  const meta = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.62, 1.0, 28), MILLSTONE); meta.position.y = 0.5; dmill.add(meta);
  const catillus = new THREE.Group(); dmill.add(catillus); catillus.position.y = 0.85;
  { const up = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.3, 0.6, 28, 1, true), MILLSTONE); up.position.y = 0.3; catillus.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.62, 0.6, 28, 1, true), MILLSTONE); lo.position.y = -0.3; catillus.add(lo);
    const beam = new THREE.Mesh(rbox(4.8, 0.14, 0.14, 0.03), WOOD); beam.position.y = 0.05; catillus.add(beam); }
  const base0 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.25, 30), STONE); base0.position.y = 0.12; dmill.add(base0);
  const pile = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 1 })); pile.position.set(1.05, 0.15, 0.2); dmill.add(pile);
  sh(dmill);
  const sheaves = new THREE.Group(); scene.add(sheaves); sheaves.position.set(-2.95, 0, 3.0);
  { const SM = new THREE.MeshStandardMaterial({ color: 0xd8b060, roughness: 0.9, envMapIntensity: 0.4 }), TM = new THREE.MeshStandardMaterial({ color: 0x9a7a3c, roughness: 0.9 });
    for (let i = 0; i < 7; i++) { const b = new THREE.Group(), a = i / 7 * 6.28, r = i ? 0.45 : 0; b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); b.rotation.set((hash(i) - 0.5) * 0.25, a, (hash(i * 3) - 0.5) * 0.25);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 10), SM); st.position.y = 0.45; const ears = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 10), SM); ears.position.y = 1.05;
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 14), TM); tie.rotation.x = Math.PI / 2; tie.position.y = 0.6; b.add(st, ears, tie); sheaves.add(b); } }
  sh(sheaves);
  // ---------- 3) the post, the post mill house (with tail pole + brake wheel), sails
  const POSTH = 8.2, HUBY = 7.7;
  const postG = new THREE.Group(); scene.add(postG);
  { const post = new THREE.Mesh(rbox(0.55, POSTH, 0.55, 0.06), WOODD); post.position.y = POSTH / 2; postG.add(post);
    [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4, s = new THREE.Mesh(rbox(0.22, 2.6, 0.22, 0.04), WOODD); s.position.set(Math.cos(a) * 0.85, 0.95, Math.sin(a) * 0.85); s.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62); postG.add(s); });
    const stones = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 28), MILLSTONE); stones.position.y = 0.2; stones.name = 'foot'; postG.add(stones); }
  sh(postG);
  const fixedSails = makeSails(4.4); scene.add(fixedSails);
  const house = new THREE.Group(); scene.add(house);
  const HW2 = 1.6, HD2 = 1.7, HB = 5.4, HT = 9.3;
  { const body = new THREE.Mesh(rbox(HW2 * 2, HT - HB, HD2 * 2, 0.05), BOARDS); body.position.y = (HB + HT) / 2; house.add(body);
    const roofG = new THREE.CylinderGeometry(HW2 * 1.25, HW2 * 1.25, HD2 * 2 + 0.4, 3, 1); roofG.rotateX(Math.PI / 2); roofG.rotateZ(Math.PI / 2);
    const roof = new THREE.Mesh(roofG, ROOF); roof.scale.set(1, 0.42, 1); roof.position.y = HT + 0.55; house.add(roof);
    const door = new THREE.Mesh(rbox(0.9, 1.6, 0.1, 0.03), WOODD); door.position.set(0, HB + 0.85, -HD2 - 0.04); house.add(door);
    const stairs = new THREE.Group(); for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(rbox(1.0, 0.08, 0.32, 0.02), WOOD); s.position.set(0, HB - 0.2 - i * 0.52, -HD2 - 0.3 - i * 0.42); stairs.add(s); }
    house.add(stairs);
    const pole = new THREE.Mesh(rbox(0.2, 0.2, 6.2, 0.04), WOODD); pole.position.set(0, HB - 2.1, -HD2 - 2.6); pole.rotation.x = -0.72; house.add(pole); house.userData.pole = pole;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 })); win.position.set(HW2 + 0.01, HB + 2.4, 0.3); win.rotation.y = Math.PI / 2; house.add(win); }
  const wheel = new THREE.Group(); house.add(wheel); wheel.position.set(0, HUBY, HD2 + 0.25);
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.11, 10, 36), WOOD); wheel.add(rim);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.09), WOOD); sp.rotation.z = i * Math.PI / 4; wheel.add(sp); }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 12), WOODD); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.4; wheel.add(shaft); }
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 36, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: 0x2e2e32, metalness: 0.7, roughness: 0.4 })); band.position.set(0, HUBY, HD2 + 0.25); band.rotation.z = -0.4; house.add(band);
  const houseSails = makeSails(4.4); houseSails.position.set(0, HUBY, HD2 + 0.75); house.add(houseSails);
  sh(house);
  // ---------- 4) the stone tower, its turning cap (sails + fantail)
  const TOWH = 10.5, TR0 = 3.1, TR1 = 2.3;
  const tower = new THREE.Group(); scene.add(tower);
  const TOWM = (() => { const t = B.procTex(512, (u, v) => { const rows = 10, row = Math.floor(v * rows), off = row % 2 ? 0.5 / 8 : 0, cu = (u + off) * 8, col = Math.floor(cu), fu = cu - col, fv = v * rows - row;
      const edge = Math.min(fu * 2.2, (1 - fu) * 2.2, fv, 1 - fv), mort = edge < 0.06 ? 1 : 0, s2 = 0.86 + 0.14 * hash(row * 13 + col * 7) + 0.1 * (B.fbm(u, v, 16, 4) - 0.5), l = mort ? 0.82 : s2;
      return [228 * l, 218 * l, 200 * l, mort ? 0 : 0.6]; }, 2.5, [1, 1]);
    t.map.repeat.set(3, 2); t.normalMap.repeat.set(3, 2); return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9, envMapIntensity: 0.45 }); })();
  const towBody = new THREE.Mesh(new THREE.CylinderGeometry(TR1, TR0, TOWH, 40, 1), TOWM); towBody.geometry.translate(0, TOWH / 2, 0); tower.add(towBody);
  { const door = new THREE.Mesh(rbox(1.0, 1.9, 0.2, 0.04), WOODD); door.position.set(0, 0.95, TR0 - 0.02); tower.add(door);
    [[4.2, 0.4], [7.2, -0.5]].forEach(([y, a]) => { const w = new THREE.Mesh(rbox(0.55, 0.75, 0.15, 0.03), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 })); const r = lerp(TR0, TR1, y / TOWH) - 0.02; w.position.set(Math.sin(a) * r, y, Math.cos(a) * r); w.rotation.y = a; tower.add(w); });
    const gallery = new THREE.Mesh(new THREE.TorusGeometry(TR1 + 0.35, 0.08, 6, 40), WOODD); gallery.rotation.x = Math.PI / 2; gallery.position.y = TOWH - 0.3; tower.add(gallery); }
  sh(tower);
  const capG = new THREE.Group(); scene.add(capG);
  { const capGeo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); const capM = new THREE.Mesh(capGeo, ROOF); capM.scale.set(TR1 + 0.25, 1.8, TR1 + 0.55); capG.add(capM);
    const rimC = new THREE.Mesh(new THREE.CylinderGeometry(TR1 + 0.3, TR1 + 0.3, 0.3, 40), WOODD); capG.add(rimC); }
  const capSails = makeSails(4.4); capSails.position.set(0, 0.9, TR1 + 0.75); capSails.rotation.x = -0.1; capG.add(capSails);
  const fanG = new THREE.Group(); capG.add(fanG); fanG.position.set(0, 0.5, -TR1 - 1.4);
  { const fr = new THREE.Mesh(rbox(0.12, 0.12, 1.6, 0.02), WOODD); fr.position.set(0, 0, 0.75); fanG.add(fr);
    const fanW = new THREE.Group(); fanW.rotation.y = Math.PI / 2; fanG.add(fanW); fanG.userData.w = fanW;
    for (let i = 0; i < 6; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.75, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.8, side: THREE.DoubleSide })); const a = i / 6 * Math.PI * 2;
      v.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0); v.rotation.set(0, 0.5, a - Math.PI / 2); fanW.add(v); }
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), WOODD); hb.rotation.x = Math.PI / 2; fanW.add(hb); }
  sh(capG);

  // ---------- plants: blade grass on the meadow, golden wheat in the fields (it sways with the wind), flowers, trees
  const WIND = { t: { value: 0 }, amp: { value: 0.1 }, dir: { value: new THREE.Vector2(1, 0) } };
  const swayify = m => { m.onBeforeCompile = s => { Object.assign(s.uniforms, { wT: WIND.t, wA: WIND.amp, wD: WIND.dir });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float wT, wA; uniform vec2 wD;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;\n#else\n float ph = 0.0;\n#endif\n float sw = (sin(wT * 2.3 + ph) * 0.6 + 0.4 + sin(wT * 5.1 + ph * 1.7) * 0.15) * wA * position.y;\n transformed.xz += wD * sw;'); };
    m.customProgramCacheKey = () => 'sway'; return m; };
  function plants() {
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Color();
    const put = (geo, mat, n, ok, sc, col, seed) => { const im = new THREE.InstancedMesh(geo, mat, n); let cnt = 0;
      for (let i = 0; cnt < n && i < n * 5; i++) { const a = hash(seed + i * 1.37) * 6.283, r = Math.sqrt(hash(seed + i * 2.11)) * 70, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!ok(x, z, r)) continue;
        Q.setFromEuler(E.set((hash(i * 3) - 0.5) * 0.3, hash(i * 5) * 6.28, (hash(i * 7) - 0.5) * 0.3)); const s = sc(i); M4.compose(V(x, hAt(x, z), z), Q, V(s, s * (0.75 + 0.5 * hash(i * 11)), s)); im.setMatrixAt(cnt, M4);
        if (col) im.setColorAt(cnt, col(i, C)); cnt++; }
      im.count = cnt; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; };
    const blade = (() => { const gq = new THREE.PlaneGeometry(0.05, 0.36, 1, 4); gq.translate(0, 0.18, 0); const p = gq.attributes.position, cl = [];
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36; p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.08); cl.push(0.35 + 0.65 * y, 0.35 + 0.65 * y, 0.35 + 0.65 * y); }
      gq.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); gq.computeVertexNormals(); return gq; })();
    const GM = swayify(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
    const meadow = (x, z, r) => r > 4.4 && !inPath(x, z) && (r < WHEAT0 - 0.3 || r > WHEAT1 + 1);
    put(blade, GM, 160000, meadow, () => 1.1, (i, cc) => cc.setHSL(0.22 + 0.06 * hash(i * 13), 0.55, 0.32 + 0.12 * hash(i * 17)), 11);
    // wheat: a stalk + an ear, golden, waving
    const wheatG = (() => { const st = new THREE.PlaneGeometry(0.035, 1.0, 1, 4); st.translate(0, 0.5, 0); const ear = new THREE.SphereGeometry(0.05, 6, 6); ear.scale(1, 3.2, 1); ear.translate(0, 1.08, 0);
      const a = st.toNonIndexed(), b = ear.toNonIndexed(), m = new THREE.BufferGeometry(); ['position', 'normal'].forEach(nm => { const A = a.attributes[nm].array, Bb = b.attributes[nm].array, o = new Float32Array(A.length + Bb.length); o.set(A); o.set(Bb, A.length); m.setAttribute(nm, new THREE.BufferAttribute(o, 3)); });
      const cl = new Float32Array(m.attributes.position.count * 3); for (let i = 0; i < m.attributes.position.count; i++) { const y = m.attributes.position.getY(i), l = y > 0.95 ? 1.0 : 0.55 + 0.4 * y; cl[i * 3] = l; cl[i * 3 + 1] = l; cl[i * 3 + 2] = l; }
      m.setAttribute('color', new THREE.BufferAttribute(cl, 3)); m.computeVertexNormals(); return m; })();
    const WM = swayify(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }));
    put(wheatG, WM, 140000, (x, z, r) => r > WHEAT0 && r < WHEAT1 && !inPath(x, z), i => 0.9 + 0.25 * hash(i * 9), (i, cc) => cc.setHSL(0.11 + 0.025 * hash(i * 13), 0.62, 0.5 + 0.12 * hash(i * 17)), 23);
    const FL = [0xffffff, 0xfff1a8, 0xffc8e0, 0xffffff];
    put(new THREE.IcosahedronGeometry(0.04, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 5000, meadow, () => 1, (i, cc) => cc.set(FL[i % 4]), 33).position.y = 0.33;
    // trees on the lower slopes: cypresses + lumpy round trees
    const cyG = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector2(Math.max(0.02, 1.4 * Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62 + 0.25), 1.4) * (1 - u * 0.75)), u * 8)); }
      const gq = new THREE.LatheGeometry(pts, 20); gq.translate(0, 1.4, 0); return gq; })();
    const roG = (() => { const gq = new THREE.IcosahedronGeometry(2.6, 4), p = gq.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.18 * (B.fbm(v.x * 0.35 + 2, v.z * 0.35 + v.y * 0.3 + 5, 4, 3) - 0.5) * 2; v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
      gq.translate(0, 4.2, 0); gq.computeVertexNormals(); return gq; })();
    const trG = new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6); trG.translate(0, 1.2, 0);
    const cy = [], ro = []; for (let i = 0; i < 260; i++) { const a = hash(i * 4.1) * 6.283, r = 50 + 140 * Math.sqrt(hash(i * 8.3)), x = Math.cos(a) * r, z = Math.sin(a) * r; (hash(i * 2.2) < 0.5 ? cy : ro).push([x, hAt(x, z), z, 0.8 + 0.6 * hash(i * 9.1)]); }
    const tput = (gq, base, list, hue, s0) => { const im = new THREE.InstancedMesh(gq, new THREE.MeshStandardMaterial({ color: base, roughness: 0.85 }), list.length);
      list.forEach(([x, y, z, s], i) => { M4.compose(V(x, y - 0.2, z), Q.setFromAxisAngle(V(0, 1, 0), s * 9), V(s, s * (0.85 + 0.35 * hash(i * 1.7)), s)); im.setMatrixAt(i, M4); if (hue != null) im.setColorAt(i, C.setHSL(hue + 0.04 * hash(i), s0, 0.32 + 0.12 * hash(i * 5))); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im); };
    tput(cyG, 0xffffff, cy, 0.24, 0.35); tput(roG, 0xffffff, ro, 0.2, 0.42); tput(trG, 0x5a4232, cy.concat(ro));
  }

  // ---------- sprites: flour/dust/smoke, rain, wind streaks, sparkle
  const mkPool = (n, add) => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.blobTex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); return s; });
  const SPR = mkPool(700, false); let sN = 0;
  const puff = (p, col, size, op) => { if (sN >= SPR.length) return; const s = SPR[sN++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size); s.material.color.set(col); s.material.opacity = op; };
  function dust(t, t0, p, n = 8, r = 2, col = 0xdcc6a2, life = 1.2, size = 2) { const u = (t - t0) / life; if (u < 0 || u > 1) return;
    for (let i = 0; i < n; i++) { const a = hash(t0 * 7 + i) * 6.283, rr = r * (0.5 + 0.7 * hash(t0 * 3 + i * 1.7)) * eout(u);
      puff(V(p.x + Math.cos(a) * rr, p.y + 0.3 + u * r * 0.5 * hash(i + t0), p.z + Math.sin(a) * rr), col, size * (0.6 + u), 0.7 * (1 - u) * (1 - u)); } }
  const streakM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.025, 3.2), streakM, 70); streaks.frustumCulled = false; scene.add(streaks);
  const rainM = new THREE.MeshBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.45, depthWrite: false });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 0.9, 0.015), rainM, 900); rain.frustumCulled = false; scene.add(rain);

  // ---------- people (Mixamo): hero (Remy, red shirt), the miller, a small crowd; the donkey (Quaternius, CC0)
  const CLIP = { walk: 'Walking', dig: 'Digging', push: 'Pushing', cheer: 'Cheering', idle: 'Breathing Idle', sleep: 'Sleeping Idle', look: 'Nervously Look Around', flail: 'Flailing Arms', run: 'Running', pull: 'Pull Heavy Object' };
  const clips = {}, bodies = {};
  const NO_PEOPLE = true;   // owner 2026-11-23: no human characters
  if (!NO_PEOPLE) Object.values(CLIP).forEach(f => B.fbx('mixamo/' + f + '.fbx', obj => { if (obj.animations && obj.animations[0]) clips[f] = obj.animations[0]; if (f === 'Walking') bodies.remy = obj; }));
  if (!NO_PEOPLE) { B.fbx('mixamo/char_peasant_man.fbx', o => { bodies.man = o; }); B.fbx('mixamo/char_peasant_girl.fbx', o => { bodies.girl = o; }); }
  const TOP = /top|shirt|torso|jacket|hood|sweat/i, BOT = /bottom|pant|jean|trouser|short/i;
  const people = {};
  function makePerson(key, body, h, look) {
    const SU = window.THREE_ADDONS.SkeletonUtils; const o = body; if (!o) return null;
    if (!o.userData.sized) { o.scale.setScalar(0.01); o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o, true); o.scale.multiplyScalar(h / Math.max(0.1, bb.max.y - bb.min.y)); o.userData.sized = true; }
    const cl = SU.clone(o), mats = [];
    cl.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
      const arr = (Array.isArray(m.material) ? m.material : [m.material]).map(mm => { const top = TOP.test(mm.name), bot = BOT.test(mm.name);
        const nm = new THREE.MeshStandardMaterial({ map: look && (top || bot) ? null : mm.map || null, normalMap: mm.normalMap || null, color: look && top ? look.top : look && bot ? look.bottom : 0xffffff, roughness: 0.8, transparent: !!mm.transparent, alphaTest: mm.transparent ? 0.3 : 0, envMapIntensity: 0.4 });
        nm.userData.map0 = nm.map; nm.userData.col0 = nm.color.getHex(); mats.push(nm); return nm; });
      m.material = Array.isArray(m.material) ? arr : arr[0]; } });
    const bones = {}; cl.traverse(m => { if (m.isSkinnedMesh) m.skeleton.bones.forEach(b => { bones[b.name.replace(/^mixamorig[:_]?/, '')] = b; }); });
    const holder = new THREE.Group(); holder.add(cl); scene.add(holder);
    const mixer = new THREE.AnimationMixer(cl), acts = {};
    Object.entries(clips).forEach(([f, clip]) => { const cc = clip.clone(); cc.tracks = cc.tracks.filter(tr => !/Hips\.position$/.test(tr.name) || key === 'hero');
      if (key === 'hero') cc.tracks.forEach(tr => { if (/Hips\.position$/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } } });
      const a = mixer.clipAction(cc); a.play(); a.weight = 0; acts[f] = a; });
    holder.visible = false;
    return { holder, mixer, acts, mats, bones };
  }
  function pose(P, x, y, z, hd, role, lt, w2) {
    if (!P) return; P.holder.visible = true; P.holder.position.set(x, y, z); P.holder.rotation.set(0, rad(hd), 0);
    Object.values(P.acts).forEach(a => { a.weight = 0; a.enabled = false; });
    const set = (r, tt, w) => { const ac = P.acts[CLIP[r]]; if (!ac) return; const d = ac.getClip().duration; ac.enabled = true; ac.weight = w; ac.time = ((tt % d) + d) % d; };
    set(role, lt, 1); if (w2) set(w2[0], w2[1], w2[2]);
    P.mixer.update(0);
  }
  let donkey = null, dMixer = null; const dActs = {};
  const donkeyHolder = B.gltf('models/donkey/donkey.glb', gl => {
    const o = gl.scene; o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); o.scale.multiplyScalar(1.35 / (bb.max.y - bb.min.y));
    o.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; if (m.material) m.material.envMapIntensity = 0.4; } });
    dMixer = new THREE.AnimationMixer(o); gl.animations.filter(a => !a.name.includes('|')).forEach(a => { const ac = dMixer.clipAction(a); ac.play(); ac.weight = 0; dActs[a.name] = ac; }); donkey = donkeyHolder; });
  scene.add(donkeyHolder); donkeyHolder.visible = false;
  function dpose(x, z, hd, name, lt) { if (!donkey) return; donkey.visible = true; donkey.position.set(x, hAt(x, z), z); donkey.rotation.y = rad(hd);
    Object.values(dActs).forEach(a => { a.weight = 0; a.enabled = false; }); const ac = dActs[name] || dActs.Idle; if (!ac) return; const d = ac.getClip().duration; ac.enabled = true; ac.weight = 1; ac.time = name === 'Death' ? Math.min(lt, d - 0.01) : ((lt % d) + d) % d; dMixer.update(0); }

  // ---------- the wind (radians: the direction it blows FROM, 0 = from the camera side +z), the sails' angle (integrated speed)
  const WFROM0 = -0.6, WFROM1 = 0.6;
  function windFrom(t) {
    let a = lerp(WFROM0, WFROM1, eio(k(t, T.changes, T.changes + 1.0)));
    a = lerp(a, 0, eio(k(t, T.build, T.turns)));                                         // the tower's cap faces the front
    a = lerp(a, Math.PI, eio(k(t, T.swings - 0.3, T.swings + 0.5)));                     // night: it swings behind
    a = lerp(a, WFROM1 + 0.1, eio(k(t, T.shifts - 0.2, T.shifts + 0.6)));                 // the fantail's wind
    return a;
  }
  function sailSpeed(t) {
    if (t < T.sails + 0.2) return 0;
    let w = 2.2 * sm(k(t, T.sails + 0.2, T.wind + 0.3));
    w *= 1 - sm(k(t, T.changes, T.stop));                                                // the wind moved: the sails stop
    w += 2.2 * sm(k(t, T.push + 0.6, T.pole + 0.6));                                     // pushed round to the wind: they turn again
    w += 6.5 * sm(k(t, T.storm - 0.2, T.wildly)) ;                                       // storm
    w *= 1 - sm(k(t, T.brake, T.rubs + 0.2));                                            // brake
    w = t > T.heavy0 ? 0 : w;
    if (t > T.cap) w = 2.0 * sm(k(t, T.cap, T.turns + 0.4));
    if (t > T.swings) w = lerp(w, -1.6, sm(k(t, T.swings, T.rips)));                     // wind from behind: they turn backwards
    if (t > T.spins) w = lerp(-1.6, 2.2, sm(k(t, T.spins, T.itself)));
    return w;
  }
  const SA = new Float32Array(Math.ceil((DUR + 1) * 120)); for (let i = 1; i < SA.length; i++) SA[i] = SA[i - 1] + sailSpeed(i / 120) / 120;
  const sailAngle = t => SA[clamp(Math.round(t * 120), 0, SA.length - 1)];
  // the post mill house yaw (faces the wind it was pushed into); the cap yaw
  const houseYaw = t => lerp(WFROM0, WFROM1, eio(k(t, T.push - 0.1, T.pole + 0.3)));
  const capYaw = t => { let a = lerp(WFROM1, 0, eio(k(t, T.turns - 0.3, T.turns + 0.6))); a = lerp(a, WFROM1 + 0.1, eio(k(t, T.cranks - 0.2, T.itself + 0.3))); return a; };

  // ---------- camera shots [arrive t, camera, target, fov, cut?]
  const SHOTS = [
    [0.0, [2.3, 1.35, 3.3], [0, 0.45, -0.3], 44],                    // the hero rubbing wheat at the saddle quern
    [T.round - 0.4, [1.7, 1.2, 2.6], [0, 0.45, -0.2], 44],             // the round stone drops on and spins
    [T.huge - 0.1, [5.8, 2.6, 8.0], [0.2, 0.9, 0.4], 48],                  // the donkey mill: stones, beam, the circle
    [T.hungry + 0.3, [1.6, 2.7, 15.5], [0.6, 3.8, 0], 52],               // WIDE: the donkey eats in front; the post drops in, sails, wind, the wind changes
    [T.genius - 0.3, [3.5, 2.0, 7.5], [0, 6.4, 0], 50],                 // genius: up at the stopped sails
    [T.whole - 0.1, [1.6, 2.9, 15.5], [0, 4.6, 0], 52],                // WIDE: the house drops on, pushed round
    [T.storm - 0.1, [-7.5, 2.6, 11.5], [0, 4.6, 0], 50],               // the storm, flour bursts
    [T.brake - 0.2, [5.5, 5.0, 11.5], [0.6, 7.3, 1.6], 46],             // the brake wheel smokes
    [T.bigger - 0.1, [0.3, 1.9, -11.8], [-3.4, 1.5, -4.6], 48],        // bigger sails; too heavy to push (from behind)
    [T.build - 0.1, [1.8, 3.4, 18.5], [0, 5.6, 0], 52],                // WIDE: the tower rises, the cap lands and turns
    [T.night - 0.1, [-8.5, 3.4, 15], [0, 7.5, 0], 50],                 // night, the wind from behind
    [T.brain - 0.4, [5.5, 2.5, 11], [0, 9.6, 0], 48],             // huge brain (hero close)
    [T.windmill, [13, 12.2, -9.5], [0, 10.4, -2.6], 40],                // high behind the cap: the fantail, it turns the cap
    [T.final, [1.8, 3.2, 19], [0, 5.6, 0], 50],                      // CONGRATULATIONS: the windmill
    [T.edmund, [15, 10, 30], [0, 6, 0], 46],                           // rising on the mill in its wheat
  ].map(([t, p, q, f, cut]) => ({ t, p: V(...p), q: V(...q), f, cut: !!cut }));
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
  function camAt(t) {
    let i = 0; while (i + 1 < SHOTS.length && SHOTS[i + 1].t <= t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1], push = (s, u) => ({ p: s.p.clone().lerp(s.q, 0.035 * u), q: s.q.clone(), f: s.f });
    if (!b) return push(a, ease(k(t, a.t, DUR)));
    if (b.cut) return push(a, ease(k(t, a.t, b.t)));
    const dist = a.p.distanceTo(b.p), M = clamp(1.3 + dist / 18, 1.5, 2.6), mv = Math.min(M, (b.t - a.t) * 0.75), ts = b.t - mv;
    const A = push(a, ease(k(t, a.t, ts))); if (t < ts) return A;
    const u = ease(k(t, ts, b.t)), Bv = push(b, 0), mid = A.p.clone().lerp(Bv.p, 0.5); mid.y += Math.min(4, dist * 0.1);
    const p = A.p.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.multiplyScalar(2 * u * (1 - u))).add(Bv.p.clone().multiplyScalar(u * u));
    p.y = Math.max(p.y, hAt(p.x, p.z) + 0.4);
    return { p, q: A.q.clone().lerp(Bv.q, u), f: lerp(A.f, Bv.f, u) };
  }
  window.__camAt = camAt;

  // ---------- update
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), dark = new THREE.Color();
  function update(t) {
    sN = 0;
    const C = camAt(t); const shk = 0.02; C.p.add(V(B.n1(t * 0.6) * shk, B.n1(t * 0.5 + 3) * shk, B.n1(t * 0.4 + 7) * shk));
    cam.position.copy(C.p); cam.up.set(0, 1, 0); cam.lookAt(C.q); cam.fov = C.f; cam.near = 0.1; cam.far = 2500; cam.updateProjectionMatrix();
    // moods: storm, night
    const storm = sm(k(t, T.storm - 0.4, T.storm + 0.4)) * (1 - sm(k(t, T.rubs, T.heavy0 + 0.3)));
    const night = sm(k(t, T.night - 0.6, T.night + 0.2)) * (1 - sm(k(t, T.final - 0.3, T.final + 0.5)));
    const gloom = Math.max(storm * 0.75, night);
    sun.intensity = lerp(3.3, 0.35, gloom); sun.color.setHex(night > 0.5 ? 0xa8b8ff : 0xffd8aa); hemi.intensity = lerp(0.38, 0.22, gloom); hemi.color.setHex(night > 0.5 ? 0x6070b0 : 0xc4d8ff);
    skyU.top.value.setHex(0x3f7cc8).lerp(dark.setHex(storm > night ? 0x46505c : 0x0c1430), gloom); skyU.hor.value.setHex(0xe8dfd6).lerp(dark.setHex(storm > night ? 0x7c848c : 0x2a3456), gloom);
    scene.fog.color.setHex(0xc9d2dc).lerp(dark.setHex(storm > night ? 0x6a727a : 0x1c2440), gloom); scene.fog.near = lerp(120, 40, storm); scene.fog.far = lerp(900, 300, storm);
    clouds.forEach(s => { s.material.color.setHex(0xffffff).lerp(dark.setHex(0x5a6068), storm); s.material.opacity = 0.5 * (1 - night); });
    moon.visible = night > 0.05; moon.material.opacity = night;
    const span = 26; sun.target.position.set(0, 3, 0); sun.position.copy(sun.target.position).add(SUN.clone().multiplyScalar(150)); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
    const cd = C.p.distanceTo(C.q);
    Object.assign(B.POST, { focus: cd, aperture: cd < 6 ? 0.28 : 0.16, maxBlur: 10, bloom: 0.18 + 0.25 * night, thr: 1.3, sat: lerp(1.08, 0.8, gloom), con: 1.12, exp: lerp(0.95, 0.8, gloom), ao: 1.2, aoR: 0.8, mb: [0, 0] });
    // the wind: streaks + waving plants
    const wf = windFrom(t), wdir = V(-Math.sin(wf), 0, -Math.cos(wf)), wpow = 0.5 + 1.4 * storm + 0.6 * sm(k(t, T.swings, T.rips)) * (1 - sm(k(t, T.itself, T.final)));
    WIND.t.value = t; WIND.amp.value = 0.06 + 0.12 * wpow; WIND.dir.value.set(wdir.x, wdir.z);
    const showStreaks = t > T.post0 && t < T.heavy0 || t > T.night - 0.5 && t < T.final;
    for (let i = 0; i < 70; i++) { const ph = ((t * (0.35 + 0.25 * wpow) + hash(i)) % 1), side = V(wdir.z, 0, -wdir.x), off = (hash(i * 3) - 0.5) * 22, hgt = 1 + hash(i * 5) * 11;
      const p = wdir.clone().multiplyScalar((ph - 0.5) * 40).add(side.multiplyScalar(off)).add(V(0, hgt, 0)); Q0.setFromUnitVectors(V(0, 0, 1), wdir);
      M4.compose(p, Q0, showStreaks ? V(1, 1, 0.6 + wpow * 0.5) : V(0, 0, 0)); streaks.setMatrixAt(i, M4); }
    streaks.instanceMatrix.needsUpdate = true; streakM.opacity = 0.35 * Math.sin(Math.PI * clamp((t * 0.4) % 1)) + 0.15;
    for (let i = 0; i < 900; i++) { const on = storm > 0.05, x = (hash(i) - 0.5) * 30, z = (hash(i * 3) - 0.5) * 30 + 4, y = 16 - ((t * 14 + hash(i * 7) * 16) % 16);
      M4.compose(V(x + wdir.x * (16 - y) * 0.3, y, z + wdir.z * (16 - y) * 0.3), Q0.identity(), on ? V(1, 1, 1) : V(0, 0, 0)); rain.setMatrixAt(i, M4); }
    rain.instanceMatrix.needsUpdate = true; rainM.opacity = 0.45 * storm;

    // 1) quern: saddle until the donkey mill; the round top stone from "round"
    const qOn = t < T.huge; quern.visible = qOn;
    const rt = eout(k(t, T.round - 0.1, T.round + 0.3)); rotTop.visible = t > T.round - 0.15; rotTop.position.y = 0.38 + (1 - rt) * 1.5; rubber.visible = t < T.round - 0.1;
    rotTop.rotation.y = Math.max(0, t - T.spin + 0.1) * 6;
    if (t < T.round) { rubber.position.x = Math.sin(t * 5) * 0.25; if (t > 0.3) dust(t, Math.floor(t * 2) / 2, V(rubber.position.x, 0.35, 0), 3, 0.3, 0xf4efe6, 0.5, 0.25); }
    if (t > T.spin) dust(t, Math.floor(t * 3) / 3, V(0.3, 0.3, 0.2), 3, 0.4, 0xf4efe6, 0.5, 0.25);
    // 2) donkey mill: grows on "huge", turns while the donkey circles, a flour pile grows; sinks when the post comes
    const dg = eout(k(t, T.huge - 0.4, T.huge + 0.2)), dsink = eio(k(t, T.post0 - 0.1, T.hammer + 0.2));
    dmill.visible = t > T.huge - 0.45 && dsink < 0.99; dmill.scale.setScalar(Math.max(0.01, dg)); dmill.position.y = -2.6 * dsink;
    catillus.rotation.y = 2.85 + clamp(t - T.donkey - 0.1, 0, T.cong1 + 0.3 - T.donkey - 0.1) * 0.58;
    pile.scale.setScalar(Math.max(0.01, sm(k(t, T.flour - 0.2, T.cong1 + 0.8)) * 1.3));
    if (t > T.flour - 0.2 && t < T.cong1 + 0.6) for (let i = 0; i < 3; i++) dust(t, Math.floor(t * 4) / 4 - i * 0.08, V(0.95, 0.5, 0.2), 3, 0.35, 0xf6f2ea, 0.6, 0.3);
    sheaves.visible = t > T.huge - 0.5; sheaves.children.forEach((b, i) => { b.visible = !(i % 2 && t > T.eats + 0.4 + i * 0.25); });
    // 3) the post drops into the hill; fixed sails pop on; then the house drops on and is pushed round
    const pd = eout(k(t, T.hammer - 0.1, T.post + 0.1)), psink = eio(k(t, T.tower0, T.build + 0.1));
    postG.visible = t > T.hammer - 0.15 && psink < 0.99; postG.position.y = (1 - pd) * 9 - 12 * psink;
    if (t > T.post && t < T.post + 1) dust(t, T.post + 0.05, V(0, 0.2, 0), 14, 3, 0xd8c8a8, 1.0, 2);
    const nailed = i => eout(k(t, T.nail + i * 0.22, T.nail + i * 0.22 + 0.2));
    fixedSails.visible = t > T.nail - 0.05 && t < T.house; fixedSails.position.set(0, HUBY, 0).add(V(Math.sin(WFROM0), 0, Math.cos(WFROM0)).multiplyScalar(0.55)); fixedSails.rotation.set(0, WFROM0, sailAngle(t));
    fixedSails.children.forEach((arm, i) => { if (arm.userData.cloth !== undefined || i < 4) arm.scale.setScalar(Math.max(0.001, i < 4 ? nailed(i) : 1)); });
    const hd = eout(k(t, T.whole - 0.1, T.house + 0.1));
    house.visible = t > T.whole - 0.15 && psink < 0.99; house.position.y = (1 - hd) * 9 - 12 * psink; house.rotation.y = houseYaw(t);
    if (t > T.house && t < T.house + 1) dust(t, T.house + 0.05, V(0, HB, 0), 10, 2.5, 0xd8c8a8, 0.9, 1.6);
    const big = 1 + 0.38 * eout(k(t, T.bigger - 0.1, T.bigger + 0.4));
    houseSails.rotation.z = sailAngle(t); houseSails.scale.set(big, big, 1);
    wheel.rotation.z = sailAngle(t);
    const clampB = eout(k(t, T.brake - 0.2, T.brake + 0.2)); band.scale.setScalar(lerp(1.12, 0.94, clampB)); band.visible = t > T.clamp - 0.2;
    if (t > T.rubs - 0.2 && t < T.heavy0 + 0.5) { const wp = wheel.getWorldPosition(new THREE.Vector3()); for (let i = 0; i < 4; i++) dust(t, Math.floor(t * 5) / 5 - i * 0.1, wp.clone().add(V(0.8, 0.9, 0)), 3, 1.0, t > T.smokes - 0.2 ? 0x6a6460 : 0xb0a8a0, 1.0, 0.9); }
    // the flour cloud in the storm
    if (t > T.miller - 0.2 && t < T.brake0 + 0.8) for (let i = 0; i < 7; i++) dust(t, Math.floor(t * 6) / 6 - i * 0.07, V(-1.6, 0.4, 1.4), 5, 1.8, 0xf6f2ea, 1.0, 1.8);
    // 4) the tower rises in courses, the cap lands, turns; at night it shakes and lifts; the fantail
    const tu = k(t, T.build - 0.05, T.tower + 0.9), course = Math.min(1, Math.ceil(tu * 14) / 14);
    tower.visible = tu > 0; towBody.scale.y = Math.max(0.001, course); tower.children.forEach(ch => { if (ch !== towBody) ch.visible = course >= 1 || ch.position.y < course * TOWH; });
    if (tu > 0 && tu < 1) dust(t, Math.floor(t * 4) / 4, V(0, course * TOWH, 0).add(V(TR0 * 0.6, 0, TR0 * 0.6)), 6, 2.5, 0xe0d0b8, 0.8, 2);
    const cl2 = eout(k(t, T.cap - 0.5, T.cap - 0.05)); capG.visible = t > T.cap - 0.55;
    const lift = sm(k(t, T.rips - 0.2, T.rips + 0.2)) * (1 - sm(k(t, T.rips + 0.5, T.fan0 + 0.2)));
    const shake = (t > T.swings && t < T.fan0 + 0.3) ? Math.sin(t * 31) * 0.035 * (0.4 + lift) : 0;
    capG.position.set(0, TOWH + (1 - cl2) * 6 + lift * 0.7, 0); capG.rotation.set(shake + lift * 0.12, capYaw(t), shake * 0.6);
    capSails.rotation.z = sailAngle(t); capSails.scale.set(1.38, 1.38, 1);
    const fz = eout(k(t, T.stick - 0.05, T.windmill + 0.1)); fanG.visible = fz > 0.01; fanG.scale.setScalar(Math.max(0.01, fz * 1.6));
    fanG.userData.w.rotation.z = t > T.spins - 0.3 ? (t - T.spins + 0.3) * 9 * (1 - 0.7 * sm(k(t, T.itself + 0.3, T.final + 0.5))) : 0;
    if (t > T.build - 0.3 && t < T.build + 0.6) dust(t, T.build - 0.2, V(0, 1, 0), 14, 4, 0xd8c8a8, 1.0, 2.5);

    // people + donkey
    {
      Object.values(people).forEach(P => { if (P) P.holder.visible = false; }); if (donkey) donkey.visible = false;
      const H = people.hero;
      if (t < T.huge - 0.3) { pose(H, 0, 0, -0.75, 0, 'dig', t * 1.2);                                  // rubbing / spinning, bent over the stones
        const ga = sm(k(t, T.gorilla - 0.1, T.gorilla + 0.25)) * (1 - sm(k(t, T.gorilla + 1.0, T.gorilla + 1.4)));
        ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'].forEach(b => { if (H && H.bones[b]) H.bones[b].scale.setScalar(1 + 0.75 * ga); }); }
      else { ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'].forEach(b => { if (H && H.bones[b]) H.bones[b].scale.setScalar(1); });
        if (t < T.cong1 - 0.1) pose(H, -2.4, 0, 2.2, 150, 'idle', t);
        else if (t < T.post0) pose(H, 1.3, 0, 2.6, 25, 'cheer', t - T.cong1);
        else if (t < T.changes) pose(H, 2.2, 0, 3.0, 200, 'idle', t);
        else if (t < T.genius - 0.6) pose(H, 2.2, 0, 3.0, 20, 'look', t);
        else if (t < T.whole) pose(H, 2.2, 0, 3.0, 20, 'idle', t);
        else if (t < T.cong2 - 0.2) { const yw = houseYaw(t), r = 5.9, ex = -Math.sin(yw) * r, ez = -Math.cos(yw) * r; pose(H, ex + Math.cos(yw) * 0.5, 0, ez - Math.sin(yw) * 0.5, rad2(yw) - 90, t < T.push - 0.4 ? 'walk' : 'push', t * 1.2); }
        else if (t < T.storm - 0.2) pose(H, 2.4, 0, 3.4, 25, 'cheer', t - T.cong2);
        else if (t < T.heavy0) { }
        else if (t < T.tower0) { const yw = houseYaw(t), r = 5.9, ex = -Math.sin(yw) * r, ez = -Math.cos(yw) * r, slip = Math.sin(t * 3) * 0.08;
          pose(H, ex - Math.cos(yw) * (0.5 + slip), 0, ez + Math.sin(yw) * (0.5 + slip), rad2(yw) + 90, 'push', t * 1.5); }
        else if (t < T.cong3 - 0.3) { }
        else if (t < T.night - 0.3) pose(H, 1.2, 0, 4.4, 180, 'cheer', t - T.cong3);
        else if (t < T.fan0 - 0.2) { }
        else if (t < T.shifts - 0.3) pose(H, 2.6, 0, 4.7, 20, 'idle', t);
        else if (t < T.final - 0.3) pose(H, 2.9, 0, 4.9, 120, 'sleep', t);
        else pose(H, 1.2, 0, 4.6, 180, 'cheer', t - T.final); }
      // the miller (storm): flour-white after "vanishes"
      const Mi = people.miller; if (Mi && t > T.storm - 0.3 && t < T.heavy0) { const white = sm(k(t, T.vanish, T.vanish + 0.6));
        Mi.mats.forEach(m => { m.map = white > 0.5 ? null : m.userData.map0; m.color.setHex(m.userData.col0).lerp(dark.setHex(0xf2f0ea), white); m.needsUpdate = white > 0.45 && white < 0.55; });
        pose(Mi, -1.6, 0, 1.4, 160, t < T.vanish + 0.8 ? 'flail' : 'walk', t, null); if (t > T.vanish + 0.8) Mi.holder.position.add(V(0.3, 0, 1).multiplyScalar((t - T.vanish - 0.8) * 1.1)); }
      // the crowd cheers at the congratulations
      const crowd = ['c1', 'c2', 'c3', 'c4'].map(k2 => people[k2]), spots = [[-1.2, 4.2, 170], [-2.6, 3.4, 150], [3.0, 3.6, 210], [0.2, 5.2, 180]];
      const cheerAt = (t0, t1, n) => { if (t > t0 && t < t1) crowd.slice(0, n).forEach((P, i) => pose(P, spots[i][0], 0, spots[i][1], spots[i][2], 'cheer', t - t0 + i * 0.4)); };
      cheerAt(T.cong3 - 0.3, T.night - 0.3, 4); cheerAt(T.final - 0.3, DUR + 1, 4);
      // the donkey: walks in, circles, dizzy, eats the wheat, lies down when the house is too heavy, cheers at the end
      // the donkey walks at a real walking pace (~1.4 m/s) and always faces where it goes (the model looks along +z)
      const face = (vx, vz) => rad2(Math.atan2(vx, vz)), DR = 2.4, W0 = 0.58, A0 = 2.85;
      const cS = T.donkey + 0.1, cE = T.cong1 + 0.3, aE = A0 + (cE - cS) * W0, E0 = V(Math.cos(aE) * DR, 0, -Math.sin(aE) * DR), EAT = V(-1.85, 0, 3.1);
      if (t > T.donkey - 1.6) {
        if (t < cS) { const u = k(t, T.donkey - 1.6, cS), x = lerp(-4.6, Math.cos(A0) * DR, u), z = lerp(-1.4, -Math.sin(A0) * DR, u); dpose(x, z, face(Math.cos(A0) * DR + 4.6, -Math.sin(A0) * DR + 1.4), 'Walk', t); }
        else if (t < cE) { const a = A0 + (t - cS) * W0; dpose(Math.cos(a) * DR, -Math.sin(a) * DR, face(-Math.sin(a), -Math.cos(a)), 'Walk', t); }
        else if (t < T.cong1 + 0.5) dpose(E0.x, E0.z, face(-Math.sin(aE), -Math.cos(aE)), 'Idle_Headlow', t);
        else if (t < T.eats - 0.1) { const u = k(t, T.cong1 + 0.5, T.eats - 0.1); dpose(lerp(E0.x, EAT.x, u), lerp(E0.z, EAT.z, u), face(EAT.x - E0.x, EAT.z - E0.z), 'Walk', t); }
        else if (t < T.heavy || t > T.final - 0.3) dpose(EAT.x, EAT.z, -90, 'Eating', t);
        else dpose(EAT.x, EAT.z, -90, 'Death', t - T.heavy);
      }
    }
    for (let i = sN; i < SPR.length; i++) SPR[i].visible = false;
  }
  const rad2 = a => a * 180 / Math.PI;

  // ---------- overlay: the idea sparkle, a light vignette, night blue
  function sparkle(t, t0, head) { const a = eout(k(t, t0, t0 + 0.2)) * (1 - sm(k(t, t0 + 1.3, t0 + 1.6))); if (a <= 0) return; const p = B.project(head); if (!p.ok) return;
    g.save(); g.translate(p.x, p.y - 40); const s = (0.9 + 0.4 * a) * (1 + 0.08 * Math.sin(t * 20)); g.scale(s, s); g.rotate(t * 1.5); g.globalAlpha = a; g.shadowColor = '#ffd23f'; g.shadowBlur = 50; g.fillStyle = '#fff6b0';
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 12 : 46, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill(); g.restore(); }
  function overlay(t) {
    B.vignette(0.12);
    
    const night = sm(k(t, T.night - 0.6, T.night + 0.2)) * (1 - sm(k(t, T.final - 0.3, T.final + 0.5))); B.tint(night * 0.35, '#1a2a6a', 'multiply');
    B.flash(t, [T.post, T.house], '#fff6e6', 0.12, 0.25);
  }

  const dimEnv = () => scene.traverse(o => { if (o.material && o.material.isMeshStandardMaterial && o.material.envMapIntensity === 1) o.material.envMapIntensity = 0.4; });
  B.run({ hdriBackground: false, update, overlay, captions: 'center', captionOpts: { font: 'Poppins', size: 60, y: H * 0.5 }, fonts: [['Poppins', 'fonts/Poppins-ExtraBold.ttf']],
    scenes: [['Hand quern', 0, L0('donkey')], ['Donkey mill', L0('donkey'), L0('post')], ['Sails on a post', L0('post'), L0('tailpole')], ['Post mill', L0('tailpole'), L0('storm')],
      ['Storm + brake', L0('storm'), L0('heavy')], ['Tower mill', L0('heavy'), L0('tail')], ['Night + fantail', L0('tail'), L0('final')], ['Congratulations', L0('final'), DUR]],
    warm: [1, 20, 40, 60], ready: async () => {
      plants(); dimEnv();
      if (!NO_PEOPLE) { people.hero = makePerson('hero', bodies.remy, 1.78, { top: 0xd8301e, bottom: 0x2e3440 });
      people.miller = makePerson('miller', bodies.man, 1.75); people.c1 = makePerson('c1', bodies.man, 1.75); people.c2 = makePerson('c2', bodies.girl, 1.65);
      people.c3 = makePerson('c3', bodies.man, 1.72); people.c4 = makePerson('c4', bodies.girl, 1.62); }
      Object.values(bodies).forEach(b => { if (b && b.parent) b.parent.visible = false; });
    } });
})();
