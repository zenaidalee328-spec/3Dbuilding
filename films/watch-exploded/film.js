// "Inside a watch": a mechanical watch taken apart in an exploded view: glass, hands, dial, the mainspring, the gear train,
// the runaway without an escapement, the escape wheel, the pallet fork, the balance wheel, the ruby jewels; then all the
// parts at once and back together. Every part is built in code. Uses base.js (BASE).
(function () {
  'use strict';
  const B = window.BASE, { W, H, V, k, sm, eio, eout, clamp, lerp, hash, rad, scene, cam, g } = B;
  const { cue, line: LN, DUR } = window.TL;
  const T = {}; ['hook', 'top', 'spring', 'train', 'problem', 'escape', 'pallet', 'balance', 'jewels', 'count', 'end'].forEach(id => { T[id] = LN(id).t0; T[id + 'E'] = LN(id).t1; });
  T.apart = cue('hook', 'apart'); T.seconds = cue('problem', 'seconds'); T.tick = cue('pallet', 'tick'); T.four = cue('balance', 'four'); T.together = cue('end', 'together');

  // ---------- studio light: the HDRI only for reflections, a dark backdrop
  const KEY = V(0.4, 0.85, 0.35).normalize();
  B.loadHDR('hdri/brown_photostudio_02_2k.hdr', KEY, 60);
  scene.background = new THREE.Color(0x0a0c11);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 40 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.01;
  key.position.set(4, 10, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 1.4); rim.position.set(-6, 3, -6); scene.add(rim);
  // a soft floor glow under the watch
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x14171e, roughness: 0.6, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.6; floor.receiveShadow = true; scene.add(floor);

  // ---------- materials
  const M = {
    brass: new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.22 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf0c870, metalness: 1, roughness: 0.18 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.2, envMapIntensity: 0.75 }),
    blued: new THREE.MeshStandardMaterial({ color: 0x2a4cc0, metalness: 1, roughness: 0.25 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xd0102a, roughness: 0.05, metalness: 0, clearcoat: 1, emissive: 0x500008, emissiveIntensity: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 0.95, thickness: 0.1, transparent: true, opacity: 0.35, clearcoat: 1 }),
  };
  // circular graining (perlage) on the main plate
  const perlT = B.procTex(512, (u, v) => { const cx = (u * 16) % 1 - 0.5, cy = (v * 16) % 1 - 0.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
    const sw = 0.5 + 0.5 * Math.sin(a * 18 + r * 40); return [212 + 8 * sw, 215 + 8 * sw, 220 + 8 * sw, sw * 0.15]; }, 0.8, [2, 2]);
  M.plate = new THREE.MeshStandardMaterial({ map: perlT.map, normalMap: perlT.normalMap, metalness: 1, roughness: 0.35, color: 0xd8dce2 });

  // ---------- geometry builders
  const flat = geo => { geo.rotateX(-Math.PI / 2); return geo; };   // Shape (xy) -> lies in xz, extrudes up (+y)
  function gearShape(r, n, toothH, holes) {
    const s = new THREE.Shape(), rr = r - toothH;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, d = 6.2832 / n;
      const pts = [[rr, a0], [rr, a0 + d * 0.18], [r, a0 + d * 0.3], [r, a0 + d * 0.6], [rr, a0 + d * 0.72]];
      pts.forEach(([R, a], j) => { const x = Math.cos(a) * R, y = Math.sin(a) * R; if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y); }); }
    s.closePath();
    const hole = (rad0) => { const p = new THREE.Path(); p.absarc(0, 0, rad0, 0, 6.2832, true); return p; };
    s.holes.push(hole(Math.max(0.03, r * 0.06)));
    if (holes && r > 0.22) for (let i = 0; i < 4; i++) { const a0 = i / 4 * 6.2832 + 0.25, a1 = a0 + 6.2832 / 4 - 0.5, p = new THREE.Path(), r0 = r * 0.25, r1 = r - toothH * 2.2;
      p.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); p.absarc(0, 0, r1, a0, a1, false); p.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0); p.absarc(0, 0, r0, a1, a0, true); s.holes.push(p); }
    return s;
  }
  const gearGeo = (r, n, th, holes = true) => { const g0 = new THREE.ExtrudeGeometry(gearShape(r, n, Math.max(0.025, r * 0.07), holes), { depth: th, bevelEnabled: false, curveSegments: 6 }); return flat(g0); };
  const mesh = (geo, mat) => B.shadowed(new THREE.Mesh(geo, mat));
  // a wheel: gear + pinion + arbor + jewels top and bottom
  function wheel(r, n, mat, pinR = 0.07) {
    const G = new THREE.Group();
    G.add(mesh(gearGeo(r, n, 0.04), mat));
    const pin = mesh(gearGeo(pinR, 8, 0.12, false), M.steel); pin.position.y = -0.12; G.add(pin);
    const arb = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 10), M.steel); arb.position.y = 0.02; G.add(arb);
    return G;
  }
  const spiral = (r0, r1, turns, y, tube, mat) => { const pts = []; for (let i = 0; i <= turns * 60; i++) { const u = i / (turns * 60), a = u * turns * 6.2832, r = lerp(r0, r1, u); pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 60, tube, 5, false), mat); };

  // ---------- the parts (assembled positions; each part is a group we move)
  const parts = {};
  const part = (name, obj, pos, explodeY) => { const G = new THREE.Group(); G.add(obj); G.position.copy(pos); scene.add(G); parts[name] = { G, base: pos.clone(), ey: explodeY }; return G; };
  // case + lugs + crown
  const caseG = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.9, 96, 1, true), M.steel); ring.position.y = 0.35; caseG.add(ring);
  const ringIn = mesh(new THREE.CylinderGeometry(2.02, 2.02, 0.9, 96, 1, true), M.steel); ringIn.material = M.steel.clone(); ringIn.material.side = THREE.BackSide; ringIn.position.y = 0.35; caseG.add(ringIn);
  const bezel = mesh(new THREE.TorusGeometry(2.12, 0.1, 16, 96), M.steel); bezel.rotation.x = Math.PI / 2; bezel.position.y = 0.8; caseG.add(bezel);
  const back = mesh(new THREE.CylinderGeometry(2.2, 2.1, 0.12, 96), M.steel); back.position.y = -0.12; caseG.add(back);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const l = mesh(new THREE.BoxGeometry(0.42, 0.3, 1.1), M.steel); l.position.set(sx * 1.2, 0.3, sz * 2.3); l.rotation.y = sx * sz * 0.12; caseG.add(l); });
  const crown = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 24), M.steel); crown.rotation.z = Math.PI / 2; crown.position.set(2.38, 0.35, 0); caseG.add(crown);
  part('case', caseG, V(0, 0, 0), -1.4);
  // main plate (with jewels where the arbors sit)
  const plate = mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.12, 96), M.plate); plate.position.y = 0.06;
  part('plate', plate, V(0, 0, 0), 0);
  // barrel (drum with teeth, open so the spring shows) + its lid
  const barrelG = new THREE.Group();
  barrelG.add(mesh(gearGeo(0.66, 72, 0.05), M.brass));
  const drum = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.26, 64, 1, true), M.brass); drum.material = M.brass.clone(); drum.material.side = THREE.DoubleSide; drum.position.y = 0.15; barrelG.add(drum);
  const spring = spiral(0.1, 0.56, 9, 0.15, 0.012, M.steel); spring.scale.y = 1; barrelG.add(spring);
  const springGlow = new THREE.PointLight(0xffa040, 0, 1.5, 2); springGlow.position.y = 0.3; barrelG.add(springGlow);
  part('barrel', barrelG, V(-0.78, 0.12, 0.55), 0.9);
  const lid = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.03, 64), M.brass); part('lid', lid, V(-0.78, 0.43, 0.55), 1.6);
  // the gear train
  part('center', wheel(0.55, 64, M.brass, 0.08), V(0, 0.46, 0), 1.4);
  part('third', wheel(0.45, 60, M.brass), V(0.64, 0.17, -0.5), 1.1);
  part('fourth', wheel(0.4, 60, M.brass), V(0.05, 0.46, -1.0), 1.7);
  // escape wheel: hooked steel teeth
  const escG = new THREE.Group(); (() => { const s = new THREE.Shape(), n = 20, r = 0.28, rr = 0.2;
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832, d = 6.2832 / n; const p = [[rr, a], [r, a + d * 0.55], [r * 0.97, a + d * 0.75], [rr * 1.02, a + d * 0.8]];
      p.forEach(([R, aa], j) => { const x = Math.cos(aa) * R, y = Math.sin(aa) * R; if (!i && !j) s.moveTo(x, y); else s.lineTo(x, y); }); }
    const h = new THREE.Path(); h.absarc(0, 0, 0.03, 0, 6.2832, true); s.holes.push(h);
    for (let i = 0; i < 4; i++) { const p = new THREE.Path(), a0 = i / 4 * 6.2832 + 0.3, a1 = a0 + 1.0; p.moveTo(Math.cos(a0) * 0.07, Math.sin(a0) * 0.07); p.absarc(0, 0, 0.16, a0, a1, false); p.absarc(0, 0, 0.07, a1, a0, true); s.holes.push(p); }
    escG.add(mesh(flat(new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false })), M.steel));
    const pin = mesh(gearGeo(0.06, 8, 0.12, false), M.steel); pin.position.y = -0.12; escG.add(pin);
    const arb = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 10), M.steel); escG.add(arb); })();
  part('escape', escG, V(0.82, 0.17, -1.12), 1.3);
  // pallet fork: an anchor with two ruby pallets and a fork tail
  const palG = new THREE.Group(); (() => { const s = new THREE.Shape();
    s.moveTo(-0.32, 0.06); s.lineTo(-0.05, 0.03); s.lineTo(0.4, 0.02); s.lineTo(0.46, 0.06); s.lineTo(0.46, -0.06); s.lineTo(0.4, -0.02); s.lineTo(-0.05, -0.03); s.lineTo(-0.32, -0.06);
    s.lineTo(-0.36, -0.2); s.lineTo(-0.3, -0.22); s.lineTo(-0.26, -0.06); s.lineTo(-0.26, 0.06); s.lineTo(-0.3, 0.22); s.lineTo(-0.36, 0.2); s.closePath();
    palG.add(mesh(flat(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false })), M.steel));
    [[-0.33, 0.21], [-0.33, -0.21]].forEach(([x, z]) => { const j = mesh(new THREE.BoxGeometry(0.06, 0.05, 0.035), M.ruby); j.position.set(x, 0.02, -z); palG.add(j); });
    const arb = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.35, 8), M.steel); palG.add(arb); })();
  palG.rotation.y = 2.6;
  part('pallet', palG, V(1.18, 0.2, -0.62), 1.6);
  // balance wheel + hairspring
  const balG = new THREE.Group();
  const balRing = mesh(new THREE.TorusGeometry(0.55, 0.045, 12, 72), M.gold); balRing.rotation.x = Math.PI / 2; balG.add(balRing);
  for (let i = 0; i < 3; i++) { const sp = mesh(new THREE.BoxGeometry(1.1, 0.03, 0.05), M.gold); sp.rotation.y = i / 3 * Math.PI; balG.add(sp); }
  for (let i = 0; i < 8; i++) { const s0 = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), M.gold); const a = i / 8 * 6.2832; s0.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); balG.add(s0); }
  balG.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 10), M.steel));
  const hair = spiral(0.06, 0.38, 11, -0.08, 0.006, M.blued); balG.add(hair);
  part('balance', balG, V(1.0, 0.56, 0.38), 2.4);
  // ruby jewels on top of the arbors (on the plate) + screws
  const jewelG = new THREE.Group();
  [[0, 0], [0.64, -0.5], [0.05, -1.0], [0.82, -1.12], [1.18, -0.62], [1.0, 0.38], [-0.78, 0.55]].forEach(([x, z]) => {
    const setting = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), M.gold); setting.position.set(x, 0.135, z); jewelG.add(setting);
    const j = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 20), M.ruby); j.position.set(x, 0.15, z); jewelG.add(j); });
  [[-1.5, 0.9], [1.6, 0.9], [-1.3, -1.2], [0.4, 1.6]].forEach(([x, z]) => { const sc = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), M.blued); sc.position.set(x, 0.14, z); jewelG.add(sc); });
  part('jewels', jewelG, V(0, 0, 0), 0.25);
  // the dial: deep blue sunburst, silver indices
  const dialT = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    const gr = x.createRadialGradient(512, 512, 40, 512, 512, 512); gr.addColorStop(0, '#2b4c9a'); gr.addColorStop(1, '#0d1a3c'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 360; i++) { x.strokeStyle = `rgba(255,255,255,${0.02 + 0.03 * hash(i)})`; x.beginPath(); x.moveTo(512, 512); x.lineTo(512 + Math.cos(i / 57.3) * 520, 512 + Math.sin(i / 57.3) * 520); x.stroke(); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.2832 - Math.PI / 2, big = i % 5 === 0; x.strokeStyle = '#e8ecf2'; x.lineWidth = big ? 16 : 4;
      x.beginPath(); x.moveTo(512 + Math.cos(a) * (big ? 380 : 440), 512 + Math.sin(a) * (big ? 380 : 440)); x.lineTo(512 + Math.cos(a) * 470, 512 + Math.sin(a) * 470); x.stroke(); }
    x.fillStyle = '#e8ecf2'; x.font = 'bold 54px Arial'; x.textAlign = 'center'; x.fillText('MECHANICAL', 512, 330); x.font = '30px Arial'; x.fillText('NO BATTERY', 512, 700);
    return B.srgb(new THREE.CanvasTexture(c)); })();
  const dial = mesh(new THREE.CylinderGeometry(1.98, 1.98, 0.05, 96), [new THREE.MeshStandardMaterial({ color: 0x0d1a3c, metalness: 0.6, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: dialT, metalness: 0.55, roughness: 0.32 }), new THREE.MeshStandardMaterial({ color: 0x0d1a3c })]);
  part('dial', dial, V(0, 0.68, 0), 3.0);
  // hands
  const handsG = new THREE.Group();
  const hand = (len, wid, mat, y) => { const G = new THREE.Group(); const m = mesh(new THREE.BoxGeometry(wid, 0.025, len), mat); m.position.z = -len / 2 + 0.12; G.add(m); G.position.y = y; handsG.add(G); return G; };
  const hourH = hand(1.05, 0.12, M.steel, 0.73), minH = hand(1.6, 0.08, M.steel, 0.76), secH = hand(1.8, 0.03, new THREE.MeshStandardMaterial({ color: 0xff3a2a, metalness: 0.3, roughness: 0.3 }), 0.79);
  const hub = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 20), M.steel); hub.position.y = 0.77; handsG.add(hub);
  hourH.rotation.y = -rad(305); minH.rotation.y = -rad(60);
  part('hands', handsG, V(0, 0, 0), 3.7);
  const crystal = mesh(new THREE.CylinderGeometry(2.08, 2.08, 0.08, 96), M.glass); crystal.castShadow = false;
  part('crystal', crystal, V(0, 0.9, 0), 4.4);

  // ---------- motion of the movement at time t
  const beatAt = t => { const b = t * 8, i = Math.floor(b), f = b - i; return i + sm(f / 0.18); };   // 8 beats a second (4 Hz), each a quick step
  function moveParts(t) {
    // the runaway (no escapement) and the slow time-lapse turn of the train
    const run = 0.6 * clamp(t - T.train, 0, T.problem - T.train) + 9 * Math.pow(clamp(t - T.problem, 0, T.escape - T.problem), 2);
    const runOn = t > T.train && t < T.escape;
    const b = beatAt(t), esc = -b * Math.PI / 20;
    const E = runOn ? -run * 30 : esc;
    parts.escape.G.rotation.y = E;
    parts.fourth.G.rotation.y = -E / 7.5;
    parts.third.G.rotation.y = E / 60;
    parts.center.G.rotation.y = runOn ? run : -E / 480;
    parts.barrel.G.rotation.y = runOn ? -run / 6 : E / 3000;
    spring.rotation.y = -(runOn ? run / 3 : 0) + 0.6 * sm(k(t, T.spring, T.spring + 2)) * Math.sin(t * 2);
    spring.scale.set(1 - 0.12 * sm(k(t, T.spring + 0.3, T.spring + 1.6)) * (1 - sm(k(t, T.problem, T.escape))), 1, 1 - 0.12 * sm(k(t, T.spring + 0.3, T.spring + 1.6)) * (1 - sm(k(t, T.problem, T.escape))));
    springGlow.intensity = 3 * sm(k(t, T.spring + 0.2, T.spring + 0.8)) * (1 - sm(k(t, T.train + 1, T.train + 2)));
    // pallet rocks once a beat; balance swings ~270 degrees, 4 times a second
    const side = Math.floor(t * 8) % 2 ? 1 : -1;
    parts.pallet.G.rotation.y = 2.6 + 0.16 * side * sm(clamp((t * 8 % 1) / 0.25));
    parts.balance.G.rotation.y = 4.4 * Math.sin(2 * Math.PI * 4 * t);
    hair.scale.set(1 + 0.08 * Math.sin(2 * Math.PI * 4 * t), 1, 1 + 0.08 * Math.sin(2 * Math.PI * 4 * t));
    secH.rotation.y = -Math.floor(t * 8) / 8 * (6.2832 / 60) - rad(20);
  }

  // ---------- where every part is (assembled / taken off / exploded / back together)
  const OUT = { escape: V(2.6, 0.4, -0.6), pallet: V(2.8, 0.6, 0.4), balance: V(2.6, 0.9, 1.6) };
  function placeParts(t) {
    const all = sm(k(t, T.count - 0.2, T.count + 0.9)) * (1 - eio(k(t, T.together - 0.4, T.endE - 0.2)));
    const off = (t0) => eio(k(t, t0, t0 + 0.8)) * (1 - eio(k(t, T.together - 0.4, T.endE - 0.2)));
    Object.entries(parts).forEach(([name, p]) => { p.G.position.copy(p.base); p.G.visible = true; });
    // the top comes off (crystal, hands, dial) and stays up and back
    const top = [['crystal', T.top - 0.1, 4.4], ['hands', T.top + 0.25, 3.7], ['dial', T.top + 0.6, 3.0]];
    top.forEach(([n, t0, ey]) => { const o = off(t0); parts[n].G.position.y += o * (ey * 0.5 + 0.5); parts[n].G.position.z -= o * 1.6; });
    parts.lid.G.position.y += off(T.spring - 0.3) * 1.2; parts.lid.G.position.x -= off(T.spring - 0.3) * 1.0;
    // the escapement leaves for the runaway and comes back one part at a time
    const away = (n, back) => sm(k(t, T.problem - 0.3, T.problem + 0.4)) * (1 - eio(k(t, back, back + 0.7)));
    [['escape', T.escape - 0.1], ['pallet', T.pallet - 0.1], ['balance', T.balance - 0.1]].forEach(([n, back]) => parts[n].G.position.add(OUT[n].clone().multiplyScalar(away(n, back))));
    // everything at once, exploded upwards
    if (all > 0) Object.entries(parts).forEach(([n, p]) => { if (['crystal', 'hands', 'dial'].includes(n)) return; p.G.position.y += p.ey * 1.15 * all; });
    if (all > 0) top.forEach(([n, t0, ey]) => { parts[n].G.position.y = lerp(parts[n].G.position.y, parts[n].base.y + ey * 1.15 + 0.6, all); parts[n].G.position.z = lerp(parts[n].G.position.z, 0, all); });
  }

  // ---------- camera
  const SH = B.makeShots([
    [0, [0.6, 3.4, 2.0], [0, 0.7, 0.1], 5.4, 10],
    [T.top + 0.2, [1.6, 3.0, 3.4], [0, 1.4, -0.7], 6.2, 6],
    [T.spring, [-0.2, 2.2, 2.0], [-0.78, 0.35, 0.55], 2.3, 10],
    [T.train, [1.5, 3.2, 2.4], [0.25, 0.35, -0.35], 4.2, -8],
    [T.problem, [1.4, 3.0, 2.8], [0.2, 0.35, -0.3], 4.8, 6],
    [T.escape, [2.0, 1.6, 0.4], [0.82, 0.2, -1.1], 1.7, 10],
    [T.pallet, [2.4, 1.4, 0.8], [1.05, 0.2, -0.8], 1.8, -10],
    [T.balance, [2.6, 1.8, 2.0], [1.0, 0.55, 0.38], 2.1, 10],
    [T.jewels, [1.5, 2.2, 2.4], [0.4, 0.15, -0.4], 2.6, 8],
    [T.count, [4.2, 3.0, 5.4], [0, 2.4, 0], 7.6, 20],
    [T.together - 0.2, [0.5, 3.6, 2.2], [0, 0.7, 0.1], 5.6, 10],
  ]);
  function update(t) {
    moveParts(t); placeParts(t);
    // the runaway: the gears blur
    const c = B.shotCam(SH, t, { end: DUR, glide: 0.75, push: 0.06 });
    if (t > T.problem && t < T.escape) { const s = 0.04 * sm(k(t, T.problem, T.seconds)); c.Q.x += B.n1(t * 30) * s; c.Q.z += B.n1(t * 33 + 5) * s; }
    B.place(c); cam.near = 0.05; cam.far = 100; cam.updateProjectionMatrix();
    B.POST.aperture = 0.9; B.POST.maxBlur = 14; B.POST.bloom = 0.3; B.POST.thr = 1.8;
    M.ruby.emissiveIntensity = 0.6 + 2.2 * sm(k(t, T.jewels, T.jewels + 0.5)) * (1 - sm(k(t, T.jewelsE, T.jewelsE + 0.5)));
  }

  function overlay(t) {
    B.vignette(0.3);
    B.label(t, 'MAINSPRING', V(-0.78, 0.35, 0.55), T.spring + 0.4, T.train, -1, '#ffd23f', -260);
    B.label(t, 'GEAR TRAIN', V(0.64, 0.25, -0.5), T.train + 0.3, T.problem, 1, '#ffd23f', -280);
    B.tag(t, 'SPINS OUT IN SECONDS', T.problem + 0.3, T.escape, 3, 150);
    B.label(t, 'ESCAPE WHEEL', V(0.82, 0.25, -1.12), T.escape + 0.3, T.pallet, -1, '#7cc8ff', -260);
    B.label(t, 'PALLET FORK', V(1.18, 0.25, -0.62), T.pallet + 0.2, T.balance, 1, '#7cc8ff', -260);
    B.tag(t, 'TICK', T.tick - 0.05, T.tick + 0.4, 0, 300); B.tag(t, 'TOCK', T.tick + 0.4, T.tick + 0.9, 0, 300);
    B.label(t, 'BALANCE WHEEL', V(1.0, 0.6, 0.38), T.balance + 0.3, T.jewels, -1, '#ffd23f', -280);
    B.badge(W - 290, 80, eout(k(t, T.four - 0.1, T.four + 0.2)) * (1 - sm(k(t, T.jewels - 0.2, T.jewels))), 'SWINGS', '4 / SEC', '#ffd23f');
    B.label(t, 'RUBY JEWELS', V(0.05, 0.16, -1.0), T.jewels + 0.3, T.count, 1, '#ff5a6a', -260);
    B.counter(W / 2, 300, eout(k(t, T.count + 0.3, T.count + 0.6)) * (1 - sm(k(t, T.end, T.end + 0.3))), '100+ PARTS', 'NO ELECTRICITY', '#ffd23f', 130);
    B.flash(t, [T.apart + 0.15], '#ffffff', 0.12, 0.35);
  }

  B.run({
    update, overlay, hdriBackground: false, warm: [1, 12, 25, 31],
    scenes: [['Hook', 0, T.top], ['Glass, hands, dial', T.top, T.spring], ['Mainspring', T.spring, T.train], ['Gear train', T.train, T.problem], ['Runaway', T.problem, T.escape],
      ['Escape wheel', T.escape, T.pallet], ['Pallet fork', T.pallet, T.balance], ['Balance wheel', T.balance, T.jewels], ['Jewels', T.jewels, T.count], ['Exploded', T.count, T.end], ['Back together', T.end, DUR]],
  });
})();
