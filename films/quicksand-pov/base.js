// Shared engine for the vertical 3D shorts (1080x1920): renderer, post (depth of field, bloom, clean grade), an HDRI sky,
// texture helpers, a shot-based camera, captions, labels, small badges, tags and a big counter.
// A film's film.js calls BASE.run({ update(t), overlay(t), shots, ... }). Everything is a pure function of t.
// Master copy: C:\Users\Musa\Documents\VideoHub\tools\vh-engine\base.js (each film keeps its own copy).
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const B = window.BASE = { W, H };
  const cv = document.getElementById('c'), g = cv.getContext('2d'); B.g = g;

  // ---------- helpers
  const clamp = B.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = B.lerp = (a, b, k) => a + (b - a) * k;
  B.sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  B.eio = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  B.eout = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  B.ein = x => { x = clamp(x); return x * x * x; };
  B.bounce = x => { x = clamp(x); const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
  B.k = (t, a, b) => clamp((t - a) / (b - a));
  const hash = B.hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const V = B.V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rad = B.rad = d => d * Math.PI / 180;
  const h2 = (x, y) => hash(x * 57.31 + y * 311.7);
  function pnoise(x, y, P) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = a => ((a % P) + P) % P, x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1);
    return lerp(lerp(h2(x0, y0), h2(x1, y0), u), lerp(h2(x0, y1), h2(x1, y1), u), v);
  }
  B.fbm = (u, v, P, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * pnoise(u * P * f, v * P * f, P * f); a *= 0.5; f *= 2; } return s / (1 - Math.pow(0.5, o)); };
  // smooth 1D noise in time (camera shake etc.)
  B.n1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };

  // ---------- renderer (offscreen) + post
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const R = B.R = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H, false);
  if ('outputColorSpace' in R) R.outputColorSpace = THREE.SRGBColorSpace; else R.outputEncoding = THREE.sRGBEncoding;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.localClippingEnabled = true;
  if ('useLegacyLights' in R) R.useLegacyLights = false;
  const srgb = B.srgb = tex => { if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding; return tex; };
  const POST = B.POST = { focus: 10, aperture: 0.3, maxBlur: 12, bloom: 0.45, thr: 1.0, sat: 1.2, con: 1.06 };
  const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const rtMain = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  rtMain.depthTexture = new THREE.DepthTexture(W, H); rtMain.depthTexture.type = THREE.UnsignedIntType;
  const rtDof = new THREE.WebGLRenderTarget(W, H, rtOpt);
  const BW = W / 4, BH = H / 4;
  const rtB = [new THREE.WebGLRenderTarget(BW, BH, rtOpt), new THREE.WebGLRenderTarget(BW, BH, rtOpt)];
  const rtC = [new THREE.WebGLRenderTarget(BW / 2, BH / 2, rtOpt), new THREE.WebGLRenderTarget(BW / 2, BH / 2, rtOpt)];
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; postScene.add(quad);
  const QV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pmat = (fs, uniforms, tone) => new THREE.ShaderMaterial({ vertexShader: QV, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: !!tone });
  const dofMat = pmat(`#include <packing>
    uniform sampler2D tColor, tDepth; uniform float near, far, focus, aperture, maxBlur; uniform vec2 px; varying vec2 vUv;
    float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
    float coc(float z){ return clamp(abs(z - focus) / max(z, 0.001) * aperture, 0.0, 1.0) * maxBlur; }
    void main(){
      float z0 = vz(vUv), c0 = coc(z0);
      vec3 acc = texture2D(tColor, vUv).rgb; float ws = 1.0;
      if (c0 > 0.6) {
        for (int i = 0; i < 40; i++) {
          float fi = float(i) + 0.5, r = sqrt(fi / 40.0) * c0, a = fi * 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * px;
          float zs = vz(uv), cs = coc(zs);
          float w = zs < z0 - 0.02 ? clamp(cs - r + 1.0, 0.0, 1.0) : 1.0;
          acc += texture2D(tColor, uv).rgb * w; ws += w;
        }
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`, { tColor: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, near: { value: 0.1 }, far: { value: 600 }, focus: { value: 10 }, aperture: { value: 0.3 }, maxBlur: { value: 12 }, px: { value: new THREE.Vector2(1 / W, 1 / H) } });
  const brightMat = pmat(`uniform sampler2D t; uniform float thr; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c = 0.25 * (texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb + texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb + texture2D(t, vUv + px * vec2(1.0, 1.0)).rgb);
      float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * max(l - thr, 0.0) / max(l, 1e-4), 1.0); }`,
    { t: { value: null }, thr: { value: 1 }, px: { value: new THREE.Vector2(1 / W, 1 / H) } });
  const blurMat = pmat(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227;
      c += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * 0.316;
      c += (texture2D(t, vUv + dir * 3.231).rgb + texture2D(t, vUv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0); }`, { t: { value: null }, dir: { value: new THREE.Vector2() } });
  const outMat = pmat(`uniform sampler2D tA, tB, tC; uniform float bloom, sat, con; varying vec2 vUv;
    void main(){ gl_FragColor = vec4(texture2D(tA, vUv).rgb + bloom * (texture2D(tB, vUv).rgb * 0.6 + texture2D(tC, vUv).rgb * 0.8), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 c = gl_FragColor.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat); c = (c - 0.5) * con + 0.5; gl_FragColor.rgb = clamp(c, 0.0, 1.0);
    }`, { tA: { value: rtDof.texture }, tB: { value: rtB[0].texture }, tC: { value: rtC[0].texture }, bloom: { value: 0.45 }, sat: { value: 1.2 }, con: { value: 1.06 } }, true);
  const pass = (mat, target) => { quad.material = mat; R.setRenderTarget(target); R.render(postScene, postCam); };
  function blur2(rts, w, h, n) { for (let i = 0; i < n; i++) {
    blurMat.uniforms.t.value = rts[0].texture; blurMat.uniforms.dir.value.set(1 / w, 0); pass(blurMat, rts[1]);
    blurMat.uniforms.t.value = rts[1].texture; blurMat.uniforms.dir.value.set(0, 1 / h); pass(blurMat, rts[0]); } }
  function renderPost(scene, cam) {
    R.setRenderTarget(rtMain); R.render(scene, cam);
    dofMat.uniforms.near.value = cam.near; dofMat.uniforms.far.value = cam.far;
    dofMat.uniforms.focus.value = POST.focus; dofMat.uniforms.aperture.value = POST.aperture; dofMat.uniforms.maxBlur.value = POST.maxBlur;
    pass(dofMat, rtDof);
    brightMat.uniforms.t.value = rtDof.texture; brightMat.uniforms.thr.value = POST.thr; brightMat.uniforms.px.value.set(1 / W, 1 / H); pass(brightMat, rtB[0]);
    blur2(rtB, BW, BH, 2);
    brightMat.uniforms.t.value = rtB[0].texture; brightMat.uniforms.thr.value = 0; brightMat.uniforms.px.value.set(1 / BW, 1 / BH); pass(brightMat, rtC[0]);
    blur2(rtC, BW / 2, BH / 2, 3);
    outMat.uniforms.bloom.value = POST.bloom; outMat.uniforms.sat.value = POST.sat; outMat.uniforms.con.value = POST.con; pass(outMat, null);
  }

  const scene = B.scene = new THREE.Scene();
  const cam = B.cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);

  // ---------- loading: textures, an HDRI, the font
  const TLd = new THREE.TextureLoader(), pending = B.pending = [];
  const waitImg = t => pending.push(new Promise(ok => { const i = setInterval(() => { if (t.image && t.image.width) { clearInterval(i); ok(); } }, 30); }));
  B.tex = function (name, rx, ry, kind = 'diff') {   // kind: diff | nor_gl | rough
    const t = TLd.load('tex/' + name + '_' + kind + '.jpg'); waitImg(t);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    return kind === 'diff' ? srgb(t) : t;
  };
  B.pbr = (name, rx, ry, o = {}, rough = true) => new THREE.MeshStandardMaterial(Object.assign({ map: B.tex(name, rx, ry), normalMap: B.tex(name, rx, ry, 'nor_gl') },
    rough ? { roughnessMap: B.tex(name, rx, ry, 'rough'), roughness: 1 } : { roughness: 0.9 }, o));
  const xhr = B.xhr = (url, type) => new Promise((ok, no) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = type;
    r.onload = () => (r.status === 200 || r.status === 0) && r.response ? ok(r.response) : no(new Error(url)); r.onerror = () => no(new Error(url)); r.send(); });
  B.hdrTex = null; B.fogColor = new THREE.Color(0xe8d8bc);
  // Radiance .hdr: decoded and turned so its sun sits at azimuth of `sunDir` (returns the sun's real elevation in sunDir)
  B.loadHDR = function (url, sunDir, maxEl = 62) {
    pending.push(xhr(url, 'arraybuffer').then(buf => {
      const b = new Uint8Array(buf); let p = 0; const line = () => { let s = ''; while (b[p] !== 10) s += String.fromCharCode(b[p++]); p++; return s; };
      while (line() !== '') { }
      const dim = line().split(' '), h = +dim[1], w = +dim[3], sc = new Uint8Array(w * 4), f = new Float32Array(w * h * 3);
      for (let y = 0; y < h; y++) {
        p += 4;
        for (let c = 0; c < 4; c++) { let x = 0; while (x < w) { let n = b[p++]; if (n > 128) { n -= 128; const v = b[p++]; while (n--) sc[(x++) * 4 + c] = v; } else while (n--) sc[(x++) * 4 + c] = b[p++]; } }
        const row = h - 1 - y;
        for (let x = 0; x < w; x++) { const e = sc[x * 4 + 3], m = e ? Math.pow(2, e - 136) : 0, o = (row * w + x) * 3; f[o] = sc[x * 4] * m; f[o + 1] = sc[x * 4 + 1] * m; f[o + 2] = sc[x * 4 + 2] * m; }
      }
      let best = 0, bx = 0, by = 0;
      for (let y = h >> 1; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 3, l = f[o] + f[o + 1] + f[o + 2]; if (l > best) { best = l; bx = x; by = y; } }
      const u0 = Math.atan2(sunDir.z, sunDir.x) / (2 * Math.PI) + 0.5, shift = Math.round((u0 - (bx + 0.5) / w) * w);
      const el = Math.min(((by + 0.5) / h - 0.5) * Math.PI, rad(maxEl)), az = Math.atan2(sunDir.z, sunDir.x);
      sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
      const half = new Uint16Array(w * h * 4); let hr = 0, hg = 0, hb = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 3, xx = ((x + shift) % w + w) % w, q = (y * w + xx) * 4;
        half[q] = THREE.DataUtils.toHalfFloat(Math.min(f[o], 6e4)); half[q + 1] = THREE.DataUtils.toHalfFloat(Math.min(f[o + 1], 6e4)); half[q + 2] = THREE.DataUtils.toHalfFloat(Math.min(f[o + 2], 6e4)); half[q + 3] = 15360;
        if (y === (h >> 1) + 8) { hr += f[o]; hg += f[o + 1]; hb += f[o + 2]; }
      }
      const tx = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
      tx.mapping = THREE.EquirectangularReflectionMapping; tx.magFilter = tx.minFilter = THREE.LinearFilter; tx.generateMipmaps = false;
      if ('colorSpace' in tx) tx.colorSpace = THREE.LinearSRGBColorSpace; tx.needsUpdate = true;
      B.hdrTex = tx; B.fogColor.setRGB(hr / w, hg / w, hb / w);
    }));
  };
  // a canvas texture: fn(u, v, i, j) -> [r, g, b, height]; returns {map, normalMap}
  B.procTex = function (N, fn, strength, rep) {
    const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N);
    const hg = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = fn(i / N, j / N, i, j), o = (j * N + i) * 4;
      im.data[o] = clamp(r[0], 0, 255); im.data[o + 1] = clamp(r[1], 0, 255); im.data[o + 2] = clamp(r[2], 0, 255); im.data[o + 3] = 255; hg[j * N + i] = r[3];
    }
    x.putImageData(im, 0, 0);
    const nc = document.createElement('canvas'); nc.width = nc.height = N; const nx = nc.getContext('2d'), nm = nx.createImageData(N, N);
    const Hh = (i, j) => hg[((j + N) % N) * N + ((i + N) % N)];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const dx = (Hh(i + 1, j) - Hh(i - 1, j)) * strength, dy = (Hh(i, j + 1) - Hh(i, j - 1)) * strength, l = Math.sqrt(dx * dx + dy * dy + 1), o = (j * N + i) * 4;
      nm.data[o] = (-dx / l * 0.5 + 0.5) * 255; nm.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; nm.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; nm.data[o + 3] = 255;
    }
    nx.putImageData(nm, 0, 0);
    const map = srgb(new THREE.CanvasTexture(c)), nor = new THREE.CanvasTexture(nc);
    [map, nor].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; });
    return { map, normalMap: nor };
  };
  B.blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  B.shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  // models (vendor/three-addons.js): a glTF (Poly Haven) or an FBX (Mixamo). Returns a group now; it fills before READY.
  const ADD = () => window.THREE_ADDONS || {};
  B.gltf = function (url, onLoad) {
    const holder = new THREE.Group();
    pending.push(new Promise(ok => new (ADD().GLTFLoader)().load(url, gl => { holder.add(gl.scene); holder.gltfData = gl; B.shadowed(gl.scene); if (onLoad) onLoad(gl, holder); ok(); },
      undefined, e => { console.error('gltf', url, e); ok(); })));
    return holder;
  };
  B.fbx = function (url, onLoad) {
    const holder = new THREE.Group();
    pending.push(new Promise(ok => new (ADD().FBXLoader)().load(url, obj => { holder.add(obj); holder.fbxData = obj; if (onLoad) onLoad(obj, holder); ok(); },
      undefined, e => { console.error('fbx', url, e); holder.userData.missing = true; ok(); })));
    return holder;
  };
  // the meshes of a loaded model, merged into instanced copies: B.instances(holder, [[x,y,z,rotY,scale], ...]) after READY
  B.instanceModel = function (holder, places, parent) {
    const out = [];
    holder.updateMatrixWorld(true);
    holder.traverse(m => { if (!m.isMesh) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, places.length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
      const M0 = m.matrixWorld.clone(), M1 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      places.forEach(([x, y, z, ry, sc], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0); M1.compose(new THREE.Vector3(x, y, z), q, s.setScalar(sc || 1)).multiply(M0); im.setMatrixAt(i, M1); });
      (parent || scene).add(im); out.push(im); });
    return out;
  };
  B.boxAt = (x0, y0, z0, x1, y1, z1, mat, parent) => { const m = B.shadowed(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); (parent || scene).add(m); return m; };

  // ---------- camera: shots = [[t0, camSide [x,y,z], target [x,y,z], frame width at target (m), drift deg, fov?], ...]
  const ASP = W / H;
  B.distFor = (w, f = 40) => w / 2 / (Math.tan(rad(f / 2)) * ASP);
  B.makeShots = list => list.map(([t0, p, q, w, dr = 0, f = 40]) => ({ t0, Q: V(...q), d: V(...p).sub(V(...q)).normalize(), w, dr, f }));
  B.shotCam = function (shots, t, o = {}) {
    const glide = o.glide != null ? o.glide : 0.7, push = o.push != null ? o.push : 0.07, end = o.end || 1e9;
    let i = 0; while (i + 1 < shots.length && shots[i + 1].t0 <= t) i++;
    const view = j => { const s = shots[j], t1 = j + 1 < shots.length ? shots[j + 1].t0 : end, u = B.sm(B.k(t, s.t0, t1 + glide));
      return { Q: s.Q.clone(), d: s.d.clone().applyAxisAngle(V(0, 1, 0), rad(s.dr) * u), w: s.w * (1 - push * u), f: s.f }; };
    let { Q, d, w, f } = view(i);
    if (i > 0 && t < shots[i].t0 + glide && !shots[i].cut) {
      const a = view(i - 1), e = B.eio(B.k(t, shots[i].t0, shots[i].t0 + glide));
      Q = a.Q.lerp(Q, e); d = a.d.lerp(d, e).normalize(); w = lerp(a.w, w, e); f = lerp(a.f, f, e);
    }
    return { Q, d, w, f };
  };
  B.place = function ({ Q, d, w, f }, roll = 0, minY = -1e9) {
    const P = Q.clone().add(d.clone().multiplyScalar(B.distFor(w, f)));
    if (P.y < minY) P.y = minY;
    cam.position.copy(P); cam.up.set(0, 1, 0); cam.lookAt(Q); if (roll) cam.rotateZ(roll); cam.fov = f; cam.updateProjectionMatrix();
    POST.focus = P.distanceTo(Q);
    return P;
  };

  // ---------- 2D overlays
  const KEYC = B.KEYC = '#ffd23f', FONT = B.FONT = 'Anton';
  const rr = B.rr = (X, Y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(X, Y, w, h, r) : g.rect(X, Y, w, h); };
  let groups = null;
  B.captions = function (t) {
    const { lines, words } = window.TL;
    if (!groups) { groups = []; lines.forEach(L => { let cur = [];
      words.filter(w => w.line === L.i).forEach(w => { cur.push(w); if (cur.length === 3 || /[.,?:!]$/.test(w.w)) { groups.push(cur); cur = []; } });
      if (cur.length) groups.push(cur); }); }
    let gi = -1; for (let i = 0; i < groups.length; i++) if (groups[i][0].t0 <= t + 0.02) gi = i;
    if (gi < 0) return; const gr = groups[gi], next = groups[gi + 1];
    if (t > gr[gr.length - 1].t1 + 0.35 && (!next || t < next[0].t0)) return;
    const pop = B.eout(B.k(t, gr[0].t0 - 0.02, gr[0].t0 + 0.12));
    g.save(); g.translate(W / 2, H * 0.73); g.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
    g.font = `104px ${FONT}`; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const txt = gr.map(w => w.w.toUpperCase());
    const sp = 26, widths = txt.map(s => g.measureText(s).width), total = widths.reduce((a, b) => a + b, 0) + sp * (txt.length - 1);
    if (total > W * 0.9) { const s = W * 0.9 / total; g.scale(s, s); }
    let x = -total / 2;
    txt.forEach((w, i) => {
      const said = t >= gr[i].t0 - 0.02;
      g.lineWidth = 16; g.strokeStyle = 'rgba(0,0,0,0.92)'; g.strokeText(w, x, 0);
      g.fillStyle = gr[i].key ? KEYC : '#ffffff'; g.globalAlpha = said ? 1 : 0.55; g.fillText(w, x, 0); g.globalAlpha = 1;
      x += widths[i] + sp;
    });
    g.restore();
  };
  B.project = p => { const v = p.clone().project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }; };
  // a label with a pointer line to a 3D point
  B.label = function (t, text, p3, t0, t1, side = 1, col = KEYC, dy = -220) {
    const a = B.eout(B.k(t, t0, t0 + 0.3)) * (1 - B.sm(B.k(t, t1 - 0.25, t1)));
    if (a <= 0) return; const p = B.project(p3); if (!p.ok) return;
    g.save(); g.globalAlpha = a; g.font = `56px ${FONT}`; const w = g.measureText(text).width + 50, h = 82;
    const lx = clamp(p.x + side * 110 - (side < 0 ? w : 0), 30, W - w - 30), ly = clamp(p.y + dy, 240, H - 560);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(lx + (side < 0 ? w : 0), ly + h / 2); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(16,22,30,0.88)'; rr(lx, ly, w, h, 18); g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(text, lx + 25, ly + h / 2 + 3); g.restore();
  };
  // a pill at the top centre (a step, a chapter, a year)
  B.tag = function (t, text, t0, t1, kind = 0, y = 150) {
    const ap = B.eout(B.k(t, t0, t0 + 0.25)), al = ap * (1 - B.sm(B.k(t, t1 - 0.15, t1)));
    if (al <= 0) return;
    g.save(); g.globalAlpha = al; g.font = `58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 64, h = 92, x = W / 2, yy = y - 30 * (1 - ap);
    g.fillStyle = kind === 1 ? 'rgba(255,106,26,0.96)' : kind === 3 ? 'rgba(220,30,30,0.95)' : 'rgba(14,18,24,0.86)'; rr(x - w / 2, yy - h / 2, w, h, 20); g.fill();
    if (kind === 0 || kind === 2) { g.strokeStyle = kind === 2 ? '#5ab8ff' : '#ff7a1a'; g.lineWidth = 4; g.stroke(); }
    g.fillStyle = kind === 1 ? '#111' : kind === 3 ? '#fff' : kind === 2 ? '#7cc8ff' : '#ff8a2a'; g.fillText(text, x, yy + 4); g.restore();
  };
  // a small badge: a title and a value (corner info, never covers the picture)
  B.badge = function (x, y, a, title, value, col = '#ff8a2a', w = 250) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(x, y);
    g.fillStyle = 'rgba(14,18,24,0.82)'; rr(0, 0, w, 104, 24); g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `30px ${FONT}`; g.fillStyle = '#cfd6de'; g.fillText(title, 24, 28);
    g.font = `56px ${FONT}`; g.fillStyle = col; g.fillText(value, 22, 70);
    g.restore();
  };
  // a big number (a depth, a year, a magnitude) with a small caption
  B.counter = function (x, y, a, value, sub, col = '#ffffff', size = 150, align = 'center') {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.textAlign = align; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    g.font = `${size}px ${FONT}`; g.lineWidth = size * 0.14; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(value, x, y); g.fillStyle = col; g.fillText(value, x, y);
    if (sub) { g.font = `${Math.round(size * 0.3)}px ${FONT}`; g.lineWidth = 10; g.strokeText(sub, x, y + size * 0.42); g.fillStyle = '#e9edf2'; g.fillText(sub, x, y + size * 0.42); }
    g.restore();
  };
  B.flash = (t, times, col = '#fff6e6', dur = 0.14, amt = 0.8) => { const fl = times.reduce((a, ft) => Math.max(a, 1 - Math.abs(t - ft) / dur), 0);
    if (fl > 0) { g.save(); g.globalAlpha = fl * amt; g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); } };
  B.tint = (a, col, op = 'soft-light') => { if (a <= 0) return; g.save(); g.globalCompositeOperation = op; g.globalAlpha = Math.min(1, a); g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); };
  const vign = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const gr = x.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H); return c; })();
  B.vignette = (a = 0.16) => { g.save(); g.globalAlpha = a; g.drawImage(vign, 0, 0); g.restore(); };

  // ---------- run: film = { update(t) -> sets the scene and camera, overlay(t), scenes: [[name, t0, t1]], warm: [t...] }
  B.run = function (film) {
    const { DUR } = window.TL;
    window.VH_SCENES = (film.scenes || []).map(([name, t0, t1]) => ({ name, t0: +t0.toFixed(2), t1: +t1.toFixed(2) }));
    window.renderOut = function (t) {
      t = clamp(+t || 0, 0, DUR);
      film.update(t);
      renderPost(scene, cam);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.drawImage(glc, 0, 0, W, H);
      if (film.overlay) film.overlay(t);
      B.captions(t);
    };
    (async () => {
      const font = new FontFace(FONT, 'url(fonts/Anton-Regular.ttf)'); await font.load(); document.fonts.add(font);
      await Promise.all(pending);
      if (film.ready) await film.ready();
      const pm = new THREE.PMREMGenerator(R);
      if (B.hdrTex && film.hdriBackground !== false) { scene.environment = pm.fromEquirectangular(B.hdrTex).texture; scene.background = B.hdrTex; }
      else if (B.hdrTex) scene.environment = pm.fromEquirectangular(B.hdrTex).texture;
      else if (film.envScene) scene.environment = pm.fromScene(film.envScene, 0.02).texture;
      (film.warm || [0, DUR / 2]).forEach(t => window.renderOut(t));
      window.READY = true;
    })();
  };
})();
