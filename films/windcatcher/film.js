// "Windcatcher": a mud-brick house + a tower that catches the wind + water under the floor = a cool house with no power.
// Built up step by step ("So we... / But..."), with a cutaway of the house and glowing air streaks (orange hot, blue cool).
// three.js on an offscreen WebGL canvas, copied onto the 1080x1920 page canvas (#c) with captions, labels and step tags.
// window.renderOut(t) draws second t synchronously; everything is a pure function of t (no state between frames).
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const { cue, DUR, lines, words } = window.TL;
  const cv = document.getElementById('c'), g = cv.getContext('2d');

  // ---------- helpers
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eio = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eout = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  const bounce = x => { x = clamp(x); const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
  const k = (t, a, b) => clamp((t - a) / (b - a));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rad = d => d * Math.PI / 180;
  const h2 = (x, y) => hash(x * 57.31 + y * 311.7);
  function pnoise(x, y, P) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = a => ((a % P) + P) % P, x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1);
    return lerp(lerp(h2(x0, y0), h2(x1, y0), u), lerp(h2(x0, y1), h2(x1, y1), u), v);
  }
  const fbm = (u, v, P, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * pnoise(u * P * f, v * P * f, P * f); a *= 0.5; f *= 2; } return s / (1 - Math.pow(0.5, o)); };

  // ---------- renderer (offscreen)
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const R = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H, false);
  if ('outputColorSpace' in R) R.outputColorSpace = THREE.SRGBColorSpace; else R.outputEncoding = THREE.sRGBEncoding;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.localClippingEnabled = true;
  if ('useLegacyLights' in R) R.useLegacyLights = false;
  const srgb = tex => { if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding; return tex; };

  // ---------- post: HDR target with depth -> depth of field -> bloom -> tone mapping + a clean, saturated grade
  const POST = { focus: 10, aperture: 0.3, maxBlur: 12, bloom: 0.45, thr: 1.0 };
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
    outMat.uniforms.bloom.value = POST.bloom; pass(outMat, null);
  }

  const scene = new THREE.Scene();
  const FOGC = new THREE.Color(0xe8d8bc);
  scene.fog = new THREE.Fog(0xe8d8bc, 60, 420);
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 600);

  // ---------- sky (fallback when the HDRI is missing)
  const skyU = { top: { value: new THREE.Color('#3f86d8') }, hor: { value: new THREE.Color('#f2dfbd') }, sunDir: { value: V(0.62, 0.78, 0.1).normalize() } };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, hor, sunDir; varying vec3 vd;
      void main(){ float h = clamp(vd.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(clamp(h,0.0,1.0), 0.5));
        float s = max(dot(normalize(vd), sunDir), 0.0); c += vec3(1.0,0.9,0.72) * (pow(s, 500.0)*3.5 + pow(s, 10.0)*0.35);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMat);

  // ---------- light: hard desert sun from the +x side (the wind's side too)
  const SUN0 = V(0.62, 0.78, 0.25).normalize();
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.4);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 80 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  sun.target.position.set(0, 2.5, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd6e6ff, 0xc9a06a, 0.35); scene.add(hemi);
  const roomL = new THREE.PointLight(0xffb070, 0, 9, 1.6); roomL.position.set(0.2, 2.6, -0.8); scene.add(roomL);
  const coolL = new THREE.PointLight(0x7cc4ff, 0, 5, 1.6); coolL.position.set(-1.6, 0.6, -0.4); scene.add(coolL);

  // ---------- textures: Poly Haven CC0 (tex/), an HDRI (hdri/), procedural canvases (rug, water ripples)
  const TLd = new THREE.TextureLoader(), pending = [];
  function tex(name, rx, ry, color) {
    const t = TLd.load('tex/' + name + (color === false ? '_nor_gl' : '_diff') + '.jpg');
    pending.push(new Promise(ok => { const i = setInterval(() => { if (t.image && t.image.complete !== false && t.image.width) { clearInterval(i); ok(); } }, 30); }));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    return color === false ? t : srgb(t);
  }
  function rtex(name, rx, ry) { const t = TLd.load('tex/' + name + '_rough.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    pending.push(new Promise(ok => { const i = setInterval(() => { if (t.image && t.image.width) { clearInterval(i); ok(); } }, 30); })); return t; }
  const pbr = (name, rx, ry, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex(name, rx, ry), normalMap: tex(name, rx, ry, false), roughness: 0.9 }, o));
  const pbr3 = (name, rx, ry, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex(name, rx, ry), normalMap: tex(name, rx, ry, false), roughnessMap: rtex(name, rx, ry), roughness: 1 }, o));
  const xhr = (url, type) => new Promise((ok, no) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = type;
    r.onload = () => (r.status === 200 || r.status === 0) && r.response ? ok(r.response) : no(new Error(url)); r.onerror = () => no(new Error(url)); r.send(); });
  let hdrTex = null;
  pending.push(xhr('hdri/kiara_5_noon_2k.hdr', 'arraybuffer').then(buf => {
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
    const u0 = Math.atan2(SUN0.z, SUN0.x) / (2 * Math.PI) + 0.5, shift = Math.round((u0 - (bx + 0.5) / w) * w);
    const el = Math.min(((by + 0.5) / h - 0.5) * Math.PI, rad(62)), az = Math.atan2(SUN0.z, SUN0.x);
    SUN0.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    const half = new Uint16Array(w * h * 4); let hr = 0, hg = 0, hb = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3, xx = ((x + shift) % w + w) % w, q = (y * w + xx) * 4;
      half[q] = THREE.DataUtils.toHalfFloat(Math.min(f[o], 6e4)); half[q + 1] = THREE.DataUtils.toHalfFloat(Math.min(f[o + 1], 6e4)); half[q + 2] = THREE.DataUtils.toHalfFloat(Math.min(f[o + 2], 6e4)); half[q + 3] = 15360;
      if (y === (h >> 1) + 8) { hr += f[o]; hg += f[o + 1]; hb += f[o + 2]; }
    }
    hdrTex = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
    hdrTex.mapping = THREE.EquirectangularReflectionMapping; hdrTex.magFilter = hdrTex.minFilter = THREE.LinearFilter; hdrTex.generateMipmaps = false;
    if ('colorSpace' in hdrTex) hdrTex.colorSpace = THREE.LinearSRGBColorSpace; hdrTex.needsUpdate = true;
    FOGC.setRGB(hr / w, hg / w, hb / w); scene.fog.color.copy(FOGC);
  }));
  function procTex(N, fn, strength, rep) {
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
  }
  // a Persian-style rug: deep red field, a cream border, a dark-blue medallion
  const rugT = procTex(512, (u, v) => {
    const bx = Math.min(u, 1 - u), by = Math.min(v, 1 - v), b = Math.min(bx, by), n = fbm(u, v, 16, 3);
    const du = u - 0.5, dv = (v - 0.5) * 1.6, md = Math.abs(du) + Math.abs(dv), ring = Math.sin(md * 60) * 0.5 + 0.5;
    let c = [150, 28, 30];
    if (b < 0.035) c = [40, 30, 60]; else if (b < 0.09) c = (Math.sin((u + v) * 120) > 0) ? [228, 200, 150] : [40, 50, 110]; else if (b < 0.105) c = [228, 200, 150];
    else if (md < 0.22) c = md < 0.1 ? [228, 200, 150] : ring > 0.5 ? [30, 45, 105] : [150, 28, 30];
    const l = 0.85 + 0.25 * n; return [c[0] * l, c[1] * l, c[2] * l, n * 0.6];
  }, 1.2, [1, 1]);
  const rippleT = procTex(256, (u, v) => { const n = fbm(u, v, 6, 4); return [255, 255, 255, n]; }, 4, [2, 6]);
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

  // ---------- the cutaway: house parts keep z <= cutPlane.constant (100 = the whole house)
  const cutPlane = new THREE.Plane(V(0, 0, -1), 100);
  const CL = [cutPlane];
  const M = {
    sand: pbr3('coast_sand_01', 0.35, 0.35, { color: 0xf6dcb8 }),
    mud: pbr3('clay_plaster', 1.2, 1.0, { color: 0xf0c99a, clippingPlanes: CL, side: THREE.DoubleSide }),
    mudN: pbr3('clay_plaster', 1.2, 1.0, { color: 0xf0c99a }),
    cap: new THREE.MeshStandardMaterial({ map: tex('clay_plaster', 2, 2), color: 0xb98458, roughness: 1 }),
    plank: pbr('weathered_planks', 1, 1, { clippingPlanes: CL }),
    plankN: pbr('weathered_planks', 1, 1),
    groove: pbr3('clay_plaster', 1, 3, { color: 0x9a7650, side: THREE.BackSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f8db8, roughness: 0.06, metalness: 0.1, normalMap: rippleT.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.88, envMapIntensity: 1.6 }),
    rug: new THREE.MeshStandardMaterial({ map: rugT.map, normalMap: rugT.normalMap, roughness: 1, clippingPlanes: CL }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 }),
  };
  const shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  // a box from corner [x0,y0,z0] to [x1,y1,z1]
  const boxAt = (x0, y0, z0, x1, y1, z1, mat, parent) => { const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); (parent || scene).add(m); return m; };
  // the solid face where the cut goes through a wall (z = 0)
  const capAt = (x0, y0, x1, y1, parent) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), M.cap);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.003); m.receiveShadow = true; parent.add(m); parent.userData.caps = (parent.userData.caps || []).concat(m); return m; };

  // ---------- the ground: open desert, with a slot in the floor for the water channel
  const GX = [-2.0, -1.3], GZ = [-1.6, 1.6], GD = 0.45;   // the channel (under the tower shaft)
  const gShape = new THREE.Shape(); gShape.moveTo(-300, -300); gShape.lineTo(300, -300); gShape.lineTo(300, 300); gShape.lineTo(-300, 300);
  const gHole = new THREE.Path(); gHole.moveTo(GX[0], GZ[0]); gHole.lineTo(GX[0], GZ[1]); gHole.lineTo(GX[1], GZ[1]); gHole.lineTo(GX[1], GZ[0]); gShape.holes.push(gHole);
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(gShape), M.sand); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grooveBox = new THREE.Mesh(new THREE.BoxGeometry(GX[1] - GX[0], GD, GZ[1] - GZ[0] + 0.02), M.groove);
  grooveBox.position.set((GX[0] + GX[1]) / 2, -GD / 2, 0); grooveBox.receiveShadow = true; scene.add(grooveBox);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(GX[1] - GX[0] - 0.01, GZ[1] - GZ[0]), M.water); water.rotation.x = -Math.PI / 2; water.position.set((GX[0] + GX[1]) / 2, -GD, 0); scene.add(water);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(GX[1] - GX[0] + 0.02, GZ[1] - GZ[0] + 0.02), pbr3('coast_sand_01', 0.2, 0.9, { color: 0xf6dcb8 }));
  lid.rotation.x = -Math.PI / 2; lid.position.set((GX[0] + GX[1]) / 2, 0.003, 0); lid.receiveShadow = true; scene.add(lid);
  // soft contact shadows
  const aoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  // stones and scrub
  for (let i = 0; i < 26; i++) {
    const a = hash(i + 3) * 6.283, r = 5 + hash(i + 9) * 22, s = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + hash(i + 70) * 0.3, 1), M.mudN));
    s.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); s.scale.y = 0.55; s.rotation.y = hash(i) * 6; scene.add(s);
  }

  // ---------- the house: thick mud-brick walls (rise on "house"), a flat roof (drops in on "mud")
  // room inside x[-2.6, 2.6], z[-1.6, 1.6]; walls 0.5 thick; ceiling 3.4; roof to 3.75
  const WH = 3.4, RT = 3.75;
  const wallsG = new THREE.Group(); scene.add(wallsG);
  boxAt(-3.1, 0, -2.1, 3.1, WH, -1.6, M.mud, wallsG);                         // back
  boxAt(-3.1, 0, -1.6, -2.6, WH, 1.6, M.mud, wallsG); capAt(-3.1, 0, -2.6, WH, wallsG);   // left
  // right wall, with the vent opening near the ceiling (z[-1.3, -0.5], y[2.5, 3.1])
  const VZ = [-1.3, -0.5], VY = [2.5, 3.1];
  boxAt(2.6, 0, -1.6, 3.1, VY[0], 1.6, M.mud, wallsG); boxAt(2.6, VY[1], -1.6, 3.1, WH, 1.6, M.mud, wallsG);
  boxAt(2.6, VY[0], -1.6, 3.1, VY[1], VZ[0], M.mud, wallsG); boxAt(2.6, VY[0], VZ[1], 3.1, VY[1], 1.6, M.mud, wallsG);
  capAt(2.6, 0, 3.1, WH, wallsG);
  // front, with a door (cut away with the front half)
  boxAt(-3.1, 0, 1.6, 0.4, WH, 2.1, M.mud, wallsG); boxAt(1.4, 0, 1.6, 3.1, WH, 2.1, M.mud, wallsG); boxAt(0.4, 2.3, 1.6, 1.4, WH, 2.1, M.mud, wallsG);
  boxAt(0.42, 0, 1.78, 1.38, 2.28, 1.86, M.plank, wallsG);
  // small high windows on the front
  [-2.0, 2.2].forEach(x => boxAt(x - 0.3, 2.3, 2.08, x + 0.3, 2.8, 2.12, M.dark, wallsG));
  // the rug and a low bench inside
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(0.9, 0.006, -0.55); rug.receiveShadow = true; wallsG.add(rug);
  boxAt(1.6, 0, -1.55, 2.5, 0.42, -0.95, M.plank, wallsG);
  const roofG = new THREE.Group(); scene.add(roofG);
  // roof around the tower's shaft (shaft x[-2.25, -1.35], z[-0.45, 0.45])
  const SX = [-2.25, -1.35], SZ = [-0.45, 0.45];
  boxAt(-3.15, WH, -2.15, SX[0], RT, 2.15, M.mud, roofG); boxAt(SX[1], WH, -2.15, 3.15, RT, 2.15, M.mud, roofG);
  boxAt(SX[0], WH, -2.15, SX[1], RT, SZ[0], M.mud, roofG); boxAt(SX[0], WH, SZ[1], SX[1], RT, 2.15, M.mud, roofG);
  capAt(-3.15, WH, SX[0], RT, roofG); capAt(SX[1], WH, 3.15, RT, roofG);
  // a low parapet round the roof
  boxAt(-3.15, RT, -2.15, 3.15, RT + 0.28, -1.95, M.mud, roofG); boxAt(-3.15, RT, 1.95, 3.15, RT + 0.28, 2.15, M.mud, roofG);
  boxAt(-3.15, RT, -1.95, -2.95, RT + 0.28, 1.95, M.mud, roofG); boxAt(2.95, RT, -1.95, 3.15, RT + 0.28, 1.95, M.mud, roofG);
  capAt(-3.15, RT, -2.95, RT + 0.28, roofG); capAt(2.95, RT, 3.15, RT + 0.28, roofG);
  // the vent's shutter (hinged at the top, swings out on "vent")
  const shutter = new THREE.Group(); shutter.position.set(3.12, VY[1], (VZ[0] + VZ[1]) / 2); scene.add(shutter);
  boxAt(-0.07, -(VY[1] - VY[0]), -(VZ[1] - VZ[0]) / 2, 0.01, 0, (VZ[1] - VZ[0]) / 2, M.plankN, shutter);

  // ---------- the tower (rises from the roof on "tower"); its +x face opens on "openings"
  const TW = [-2.4, -1.2], TZ = [-0.6, 0.6], TH = 3.9, OY = [2.25, 3.45];   // in the tower group: y from the roof top
  const towerG = new THREE.Group(); towerG.position.y = RT; scene.add(towerG);
  boxAt(TW[0], 0, TZ[0], SX[0], TH, TZ[1], M.mud, towerG); capAt(TW[0], 0, SX[0], TH, towerG);
  boxAt(SX[1], 0, TZ[0], TW[1], OY[0], TZ[1], M.mud, towerG); boxAt(SX[1], OY[1], TZ[0], TW[1], TH, TZ[1], M.mud, towerG);
  capAt(SX[1], 0, TW[1], OY[0], towerG); capAt(SX[1], OY[1], TW[1], TH, towerG);
  boxAt(TW[0], 0, TZ[0], TW[1], TH, SZ[0], M.mud, towerG); boxAt(TW[0], 0, SZ[1], TW[1], TH, TZ[1], M.mud, towerG);
  boxAt(TW[0] - 0.1, TH, TZ[0] - 0.1, TW[1] + 0.1, TH + 0.22, TZ[1] + 0.1, M.mud, towerG); capAt(TW[0] - 0.1, TH, TW[1] + 0.1, TH + 0.22, towerG);
  // decorative bands
  [1.2, 2.0].forEach(y => {   // bands round the outside only (the shaft stays open)
    boxAt(TW[0] - 0.04, y, TZ[0] - 0.04, TW[1] + 0.04, y + 0.08, TZ[0] + 0.02, M.mud, towerG); boxAt(TW[0] - 0.04, y, TZ[1] - 0.02, TW[1] + 0.04, y + 0.08, TZ[1] + 0.04, M.mud, towerG);
    boxAt(TW[0] - 0.04, y, TZ[0], TW[0] + 0.02, y + 0.08, TZ[1], M.mud, towerG); boxAt(TW[1] - 0.02, y, TZ[0], TW[1] + 0.04, y + 0.08, TZ[1], M.mud, towerG); });
  const cover = boxAt(SX[1] + 0.01, OY[0], SZ[0], TW[1] - 0.01, OY[1], SZ[1], M.mud, towerG);
  const fins = [-0.3, 0, 0.3].map(z => boxAt(SX[1], OY[0], z - 0.03, TW[1], OY[1], z + 0.03, M.mud, towerG));

  // ---------- the neighbours (rise on the fun fact): a town of windcatchers
  const town = [];
  [[-14, -16, 1.1, 0.3], [9, -20, 1.0, -0.2], [-26, -9, 1.3, 0.5], [22, -12, 1.2, 0.1], [-6, -32, 1.5, -0.4], [16, -34, 1.3, 0.3],
    [-20, -28, 1.0, 0.2], [30, -26, 1.4, -0.3], [-34, -20, 1.2, 0.1], [4, -46, 1.6, 0.4]].forEach(([x, z, s, ry], i) => {
    const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry; scene.add(G);
    const w = 5 + hash(i) * 3, d = 4 + hash(i + 5) * 2, h = 3.2 + hash(i + 9);
    boxAt(-w / 2, 0, -d / 2, w / 2, h, d / 2, M.mudN, G);
    const tx = -w / 2 + 0.8 + hash(i + 3) * (w - 2.4), th = 3.5 + hash(i + 7) * 3 * s;
    boxAt(tx, h, -0.7, tx + 1.4, h + th, 0.7, M.mudN, G); boxAt(tx - 0.1, h + th, -0.8, tx + 1.5, h + th + 0.22, 0.8, M.mudN, G);
    [-0.4, 0, 0.4].forEach(zz => boxAt(tx + 1.38, h + th - 1.3, zz - 0.12, tx + 1.42, h + th - 0.2, zz + 0.12, M.dark, G));
    G.userData.s = s; town.push(G);
  });

  // ---------- the air: glowing streaks along a path (outside -> tower -> down the shaft -> over the water -> across -> out the vent)
  const pathA = new THREE.CatmullRomCurve3([V(17, 6.5, -0.2), V(7, 6.6, -0.2), V(0.2, 6.65, -0.2), V(-1.5, 6.5, -0.2), V(-1.8, 5.6, -0.2), V(-1.8, 3.8, -0.2),
    V(-1.8, 1.6, -0.2), V(-1.7, 0.45, -0.2), V(-1.2, 0.18, -0.25), V(-0.2, 0.3, -0.4), V(1.0, 0.8, -0.6), V(2.0, 2.0, -0.85), V(2.75, 2.8, -0.9), V(3.7, 3.3, -0.9), V(4.8, 4.8, -0.9), V(5.6, 7.2, -0.9)], false, 'centripetal');
  const pathB = new THREE.CatmullRomCurve3([V(17, 6.4, -0.2), V(6, 6.4, -0.2), V(0.4, 6.8, -0.2), V(-1.0, 8.4, -0.2), V(-2.6, 8.6, -0.2), V(-5, 7.4, -0.2), V(-17, 6.6, -0.2)], false, 'centripetal');
  const nearS = (curve, p) => { let best = 1e9, bs = 0; for (let i = 0; i <= 600; i++) { const d = curve.getPointAt(i / 600).distanceTo(p); if (d < best) { best = d; bs = i / 600; } } return bs; };
  const S = { enter: nearS(pathA, V(-1.2, 6.55, -0.2)), ceil: nearS(pathA, V(-1.8, 3.4, -0.2)), groove: nearS(pathA, V(-1.45, 0.25, -0.2)),
    floorEnd: nearS(pathA, V(0.6, 0.6, -0.5)), vent: nearS(pathA, V(2.9, 2.9, -0.9)) };
  const NS = 340;
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false, clippingPlanes: CL, fog: false });
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), streakMat, NS); streaks.frustumCulled = false; scene.add(streaks);
  streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < NS; i++) streaks.setColorAt(i, new THREE.Color(1, 1, 1));
  // hot haze in the room and cool mist over the water
  const haze = Array.from({ length: 22 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex, color: 0xff7a2a, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    scene.add(s); return s; });
  const mist = Array.from({ length: 14 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTex, color: 0xbfe6ff, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    scene.add(s); return s; });
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = V(1, 1, 1), tmpC = new THREE.Color(), ZA = V(0, 0, 1);
  const HOT = new THREE.Color(2.2, 0.75, 0.2), COOL = new THREE.Color(0.12, 0.62, 2.8), WIND = new THREE.Color(2.0, 1.85, 1.6);

  // ---------- times (all from the words of the script)
  const LN = id => window.TL.line(id);
  const T = {
    house: LN('house').t0, mud: cue('house', 'mud'),
    hotL: LN('hot').t0, hot: cue('hot', 'hot'),
    towerL: LN('tower').t0, tower: cue('tower', 'tower'), roof: cue('tower', 'roof'),
    closedL: LN('closed').t0, closed: cue('closed', 'closed'), nothing: cue('closed', 'nothing'),
    openL: LN('open').t0, openC: cue('open', 'openings'), wind: cue('open', 'wind'),
    downL: LN('down').t0, hits: cue('down', 'hits'), pushed: cue('down', 'pushed'), downEnd: LN('down').t1,
    stillL: LN('still').t0, stillHot: cue('still', 'hot'),
    waterL: LN('water').t0, channel: cue('water', 'channel'), waterW: cue('water', 'water'), floor: cue('water', 'floor'),
    coolL: LN('cool').t0, cold: cue('cool', 'cold'), cools: cue('cool', 'cools'),
    stuckL: LN('stuck').t0, warm: cue('stuck', 'warm'), nowhere: cue('stuck', 'nowhere'),
    ventL: LN('vent').t0, vent: cue('vent', 'vent'), rises: cue('vent', 'rises'),
    loopL: LN('loop').t0, factL: LN('fact').t0, iran: cue('fact', 'iran'), hundreds: cue('fact', 'hundreds'),
    payoff: LN('payoff').t0, end: LN('end').t0,
  };
  // the hook: the finished house in the heat; the wall is cut open on "inside"; the camera climbs to the tower on "tower"
  const HK = { out: cue('hook', 'out'), inside: cue('hook', 'inside'), secret: cue('hook', 'secret'), towerW: cue('hook', 'tower'), H1: T.house - 0.12 };
  const hookState = t => t < HK.H1 ? { bt: Math.min(T.loopL + 1 + t * 0.2, T.factL - 0.1) } : null;

  // ---------- camera: a different kind of shot for every step
  const FOV = 40, ASP = W / H;
  const distFor = (w, f = FOV) => w / 2 / (Math.tan(rad(f / 2)) * ASP);
  const shot = (p, q, w, f = FOV) => ({ Q: V(...q), d: V(...p).sub(V(...q)).normalize(), w, f });
  const VIEWS = [
    [0, [9, 1.6, 13], [0, 3.2, 0], 11, 6],                                  // hook: the house in the heat, low
    [HK.inside - 0.35, [2.6, 2.8, 12], [-0.4, 2.2, 0], 8.2, 5],           // hook: cut open, cool inside
    [HK.secret - 0.1, [4, 6.5, 12], [-1.4, 5.4, 0], 6.4, -6],             // hook: up to the tower
    [HK.H1, [12, 3.2, 15], [0, 1.8, 0], 13, 6],                            // wide: the house rises
    [T.hotL, [1.6, 2.0, 11], [0, 1.7, 0], 7.6, -4],                        // the cut: hot, still air
    [T.towerL, [5.5, 0.6, 8.5], [-1.8, 5.2, 0], 7.5, 5],                   // low hero: the tower rises
    [T.closedL, [4, 7.5, 17], [-0.5, 6.4, 0], 13, -4],                     // wide: the wind goes over
    [T.openL, [4, 7.6, 6], [-1.8, 6.5, 0], 3.6, 6],                        // close: the openings
    [T.hits - 0.3, [1.2, 4.8, 12], [-1.0, 3.4, 0], 8.6, -4],               // the whole path: down into the house
    [T.stillL, [1.2, 1.6, 6.5], [-0.6, 1.2, 0], 4.6, 5],                   // inside: still hot
    [T.waterL, [-0.4, 5.2, 5.5], [-1.65, 0, 0], 3.8, -6],                  // from above: the water channel
    [T.coolL, [1.6, 0.5, 5.2], [-1.3, 0.45, 0], 4.2, 5],                   // low, over the water
    [T.stuckL, [2.2, 0.9, 7], [0.6, 2.6, 0], 5.2, -4],                     // looking up: trapped heat
    [T.ventL, [8, 3.4, 5.5], [2.9, 2.9, -0.9], 5.2, 6],                    // outside: the vent opens
    [T.loopL, [3, 4.6, 15], [0, 3.6, 0], 11, 0],                           // the whole loop (orbit)
    [T.factL, [22, 16, 34], [0, 2.5, -8], 42, 4],                          // a town of windcatchers
    [T.payoff, [10, 3.5, 12], [-0.5, 4, 0], 11, 0],                        // orbit
    [T.end, [7, 11, 16], [-0.5, 4.2, 0], 14, 0],                           // crane up
  ].map(([t0, p, q, w, dr]) => [t0, shot(p, q, w), dr]);
  const GLIDE = 0.7;
  function camAt(t) {
    let i = 0; while (i + 1 < VIEWS.length && VIEWS[i + 1][0] <= t) i++;
    const view = j => {
      const [t0, Sx, dr] = VIEWS[j], t1 = j + 1 < VIEWS.length ? VIEWS[j + 1][0] : DUR, u = sm(k(t, t0, t1 + GLIDE));
      return { Q: Sx.Q.clone(), d: Sx.d.clone().applyAxisAngle(V(0, 1, 0), rad(dr) * u), w: Sx.w * (1 - 0.07 * u), f: Sx.f };
    };
    let { Q, d, w, f } = view(i);
    if (i > 0 && t < VIEWS[i][0] + GLIDE) {
      const a = view(i - 1), e = eio(k(t, VIEWS[i][0], VIEWS[i][0] + GLIDE));
      Q = a.Q.lerp(Q, e); d = a.d.lerp(d, e).normalize(); w = lerp(a.w, w, e); f = lerp(a.f, f, e);
    }
    if (t > T.loopL + GLIDE && t < T.factL) d.applyAxisAngle(V(0, 1, 0), -sm(k(t, T.loopL + GLIDE, T.factL + 0.5)) * rad(30));
    if (t > T.payoff + GLIDE && t < T.end) d.applyAxisAngle(V(0, 1, 0), sm(k(t, T.payoff + GLIDE, T.end + 0.5)) * rad(35));
    let punch = 0;
    for (const pt of [T.mud, T.tower, T.openC, T.channel, T.vent, HK.inside]) punch += Math.sin(Math.PI * clamp((t - pt + 0.05) / 0.9)) * 0.05;
    w *= 1 - punch;
    Q.x += Math.sin(t * 0.9) * 0.02; Q.y += Math.sin(t * 1.3 + 1) * 0.015;
    const P = Q.clone().add(d.clone().multiplyScalar(distFor(w, f)));
    if (P.y < 0.25) P.y = 0.25;
    cam.position.copy(P); cam.lookAt(Q); cam.fov = f; cam.updateProjectionMatrix();
    POST.focus = P.distanceTo(Q); POST.aperture = 0.3;
  }

  // ---------- state of the build at time t (ht: real time, for the hook)
  function build(t, ht, Hs) {
    const wk = eout(k(t, T.house - 0.15, T.mud + 0.2));
    wallsG.visible = wk > 0.002; wallsG.scale.y = Math.max(0.002, wk);
    const rp = k(t, T.mud - 0.05, T.mud + 0.75); roofG.visible = t >= T.mud - 0.05; roofG.position.y = (1 - bounce(rp)) * 5;
    // the cut: a wipe on "hot" (in the hook: on "inside"); closed again at the very end
    let c = 100;
    if (Hs) { if (ht >= HK.inside - 0.35) c = lerp(2.4, 0, eio(k(ht, HK.inside - 0.35, HK.inside + 0.35))); }
    else {
      if (t >= T.hot - 0.45) c = lerp(2.4, 0, eio(k(t, T.hot - 0.45, T.hot + 0.3)));
      if (t >= T.end + 0.5) c = t >= T.end + 1.2 ? 100 : lerp(0, 2.4, eio(k(t, T.end + 0.5, T.end + 1.2)));
    }
    cutPlane.constant = c;
    const capsOn = c < 0.01;
    [wallsG, roofG, towerG].forEach(G => G.userData.caps.forEach(m => { m.visible = capsOn; }));
    // the tower rises out of the roof
    const tk = eout(k(t, T.tower - 0.35, T.roof + 0.35));
    towerG.visible = tk > 0.002; towerG.scale.y = Math.max(0.002, tk);
    // the openings: the cover panel is knocked out, the fins stay
    const ok = eio(k(t, T.openC - 0.1, T.openC + 0.7));
    cover.visible = ok < 0.999; cover.position.set((SX[1] + TW[1]) / 2 + ok * 1.6, (OY[0] + OY[1]) / 2 - ok * ok * 4, 0); cover.rotation.z = -ok * 1.2;
    // the channel is dug (the lid slides away) and fills with water
    const dk = eio(k(t, T.channel - 0.25, T.channel + 0.4));
    lid.visible = dk < 0.999; lid.scale.y = 1 - dk; lid.position.z = -(GZ[1] - GZ[0]) / 2 * dk;
    const wl = eio(k(t, T.waterW - 0.15, T.floor + 0.4));
    water.visible = wl > 0.01; water.position.y = lerp(-GD + 0.01, -0.1, wl);
    M.water.normalMap.offset.set(ht * 0.02, -ht * 0.35);
    // the vent's shutter swings open
    shutter.rotation.z = eio(k(t, T.vent - 0.2, T.vent + 0.5)) * 1.25;
    // the town rises on the fun fact
    town.forEach((G, i) => { const r = eout(k(t, T.factL + 0.15 + i * 0.1, T.factL + 0.85 + i * 0.1)); G.visible = r > 0.002; G.scale.set(1, Math.max(0.002, r), 1); });
  }

  // ---------- heat and cold at time t
  function environment(t) {
    const coolK = sm(k(t, T.cold - 0.3, T.cools + 0.6));
    const ventK = sm(k(t, T.rises - 0.3, T.rises + 1.4));
    const hotK = sm(k(t, T.hot - 0.3, T.hot + 0.5)) * (1 - 0.75 * coolK);
    const trapK = sm(k(t, T.warm - 0.3, T.warm + 0.4)) * (1 - ventK);
    roomL.intensity = 16 * (1 - 0.4 * coolK) * (cutPlane.constant < 1 ? 1 : 0.2);
    roomL.color.set(0xffb070).lerp(new THREE.Color(0xcfe4ff), coolK * 0.7);
    coolL.intensity = 10 * coolK;
    sun.position.copy(SUN0).multiplyScalar(40).add(sun.target.position);
    return { coolK, ventK, hotK, trapK };
  }

  // ---------- the air at time t
  function particles(t, env, ht, Hs) {
    const windOn = Hs ? 1 : sm(k(t, T.closedL - 0.4, T.closedL + 0.3));
    const byW = Hs ? 0 : 1 - sm(k(t, T.openC - 0.1, T.openC + 0.6));   // share of streaks going over the closed tower
    let sMax = Hs ? 1 : lerp(S.enter, S.floorEnd, eio(k(t, T.openC, T.pushed + 0.5)));
    if (!Hs && t > T.vent + 0.1) sMax = lerp(S.floorEnd, 1, eio(k(t, T.vent + 0.1, T.rises + 1.1)));
    const coolK = Hs ? 1 : env.coolK, ventK = Hs ? 1 : env.ventK;
    for (let i = 0; i < NS; i++) {
      const by = hash(i + 50) < byW, curve = by ? pathB : pathA;
      const rate = (by ? 0.075 : 0.06) * (0.85 + hash(i + 60) * 0.3), u = (ht * rate + hash(i + 70)) % 1;
      const p = curve.getPointAt(u), tg = curve.getTangentAt(u);
      // spread: a wide band outside, a tight stream inside the shaft and the room
      const inside = by ? 0 : sm(k(u, S.enter - 0.03, S.enter + 0.02)) * (1 - sm(k(u, S.vent + 0.02, S.vent + 0.1)));
      const sy = lerp(by ? 1.3 : 0.9, 0.22, inside), sz = lerp(0.6, 0.28, inside);
      p.y += (hash(i + 80) - 0.5) * 2 * sy; p.z += (hash(i + 90) - 0.5) * 2 * sz - (inside > 0.5 ? 0.05 : 0);
      let a = windOn * sm(u / 0.04) * sm((1 - u) / 0.05);
      if (!by) a *= 1 - sm((u - (sMax - 0.035)) / 0.035);
      const len = (0.35 + hash(i + 100) * 0.55) * (inside > 0.5 ? 0.55 : 1), th = 0.022 + hash(i + 110) * 0.02;
      tmpQ.setFromUnitVectors(ZA, tg);
      tmpM.compose(p, tmpQ, tmpS.set(th * a, th * a, len * a + 1e-4)); streaks.setMatrixAt(i, tmpM);
      // colour: wind outside; hot once inside; blue after the water; warming again before the vent
      tmpC.copy(WIND);
      if (!by && u > S.enter - 0.02) {
        const cold = coolK * sm(k(u, S.groove - 0.01, S.groove + 0.03)) * (1 - 0.75 * sm(k(u, S.floorEnd + 0.04, S.vent)));
        tmpC.copy(HOT).lerp(COOL, cold);
        if (u < S.enter + 0.02) tmpC.copy(WIND).lerp(tmpC, sm(k(u, S.enter - 0.02, S.enter + 0.02)));
      }
      streaks.setColorAt(i, tmpC);
    }
    streaks.instanceMatrix.needsUpdate = true; streaks.instanceColor.needsUpdate = true;
    // hot haze in the room (sinks to the ceiling when trapped; leaves through the vent)
    const cutOpen = cutPlane.constant < 1 ? 1 : 0;
    haze.forEach((s, i) => {
      const life = (ht * (0.12 + hash(i + 200) * 0.08) + hash(i + 201)) % 1;
      let x = -2.2 + hash(i + 202) * 4.6, y = 0.6 + hash(i + 203) * 2.4, z = -1.4 + hash(i + 204) * 1.2;
      const trap = Hs ? 0 : env.trapK; y = lerp(y, 2.6 + hash(i + 205) * 0.6, trap);
      if (!Hs && env.ventK > 0) { const o = env.ventK * life; x = lerp(x, 3.6 + life * 1.5, o); y = lerp(y, 3.2 + life * 2, o); z = lerp(z, -0.9, o); }
      s.position.set(x + Math.sin(ht * 0.7 + i) * 0.15, y + Math.sin(ht * 0.9 + i * 2) * 0.1, z);
      s.scale.setScalar(0.9 + life * 0.8);
      const a = Hs ? 0 : Math.max(env.hotK * 0.7, env.trapK) * (1 - env.ventK * 0.8);
      s.material.opacity = 0.16 * a * Math.sin(Math.PI * life) * cutOpen; s.visible = s.material.opacity > 0.002;
    });
    mist.forEach((s, i) => {
      const life = (ht * (0.2 + hash(i + 300) * 0.1) + hash(i + 301)) % 1;
      s.position.set(-1.65 + (hash(i + 302) - 0.5) * 0.9 + life * 0.8, 0.05 + life * 0.5, -1.4 + hash(i + 303) * 1.3);
      s.scale.setScalar(0.4 + life * 0.6);
      s.material.opacity = 0.22 * coolK * Math.sin(Math.PI * life) * cutOpen * (water.visible ? 1 : 0); s.visible = s.material.opacity > 0.002;
    });
  }

  // ---------- 2D on top: captions, labels, step tags, the hook's thermometers
  const KEYC = '#ffd23f', FONT = 'Anton';
  const groups = [];
  lines.forEach(L => { let cur = [];
    words.filter(w => w.line === L.i).forEach(w => { cur.push(w); if (cur.length === 3 || /[.,?:!]$/.test(w.w)) { groups.push(cur); cur = []; } });
    if (cur.length) groups.push(cur); });
  function captions(t) {
    let gi = -1; for (let i = 0; i < groups.length; i++) if (groups[i][0].t0 <= t + 0.02) gi = i;
    if (gi < 0) return; const gr = groups[gi], next = groups[gi + 1];
    if (t > gr[gr.length - 1].t1 + 0.35 && (!next || t < next[0].t0)) return;
    const pop = eout(k(t, gr[0].t0 - 0.02, gr[0].t0 + 0.12));
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
  }
  function project(p) { const v = p.clone().project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }; }
  function label(t, text, p3, t0, t1, side = 1, col = KEYC) {
    const a = eout(k(t, t0, t0 + 0.3)) * (1 - sm(k(t, t1 - 0.25, t1)));
    if (a <= 0) return; const p = project(p3); if (!p.ok) return;
    g.save(); g.globalAlpha = a; g.font = `58px ${FONT}`; const w = g.measureText(text).width + 52, h = 84;
    const lx = clamp(p.x + side * 120 - (side < 0 ? w : 0), 30, W - w - 30), ly = clamp(p.y - 220, 240, H - 560);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(lx + (side < 0 ? w : 0), ly + h / 2); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(16,22,30,0.88)'; g.beginPath(); g.roundRect ? g.roundRect(lx, ly, w, h, 18) : g.rect(lx, ly, w, h); g.fill();
    g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(text, lx + 26, ly + h / 2 + 3); g.restore();
  }
  // a small temperature badge (a mini thermometer + the number), so it never covers the picture
  function thermo(x, y, a, deg, name, hot) {
    if (a <= 0) return;
    const col = hot ? '#ff5a2a' : '#3aa8ff', w = 250, h = 104;
    g.save(); g.globalAlpha = a; g.translate(x, y);
    g.fillStyle = 'rgba(14,18,24,0.82)'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 24) : g.rect(0, 0, w, h); g.fill();
    g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    // the mini thermometer
    const f = clamp((deg - 15) / 35);
    g.fillStyle = '#e9edf2'; g.beginPath(); g.roundRect ? g.roundRect(26, 16, 18, 56, 9) : g.rect(26, 16, 18, 56); g.fill(); g.beginPath(); g.arc(35, 78, 15, 0, 7); g.fill();
    g.fillStyle = col; g.fillRect(31, 70 - 50 * f, 8, 50 * f + 4); g.beginPath(); g.arc(35, 78, 10, 0, 7); g.fill();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `30px ${FONT}`; g.fillStyle = '#cfd6de'; g.fillText(name, 68, 28);
    g.font = `56px ${FONT}`; g.fillStyle = hot ? '#ff8a5a' : '#8ad0ff'; g.fillText(Math.round(deg) + '°C', 66, 70);
    g.restore();
  }
  const STEPS = [
    [T.house, T.hotL, 'STEP 1: THICK MUD WALLS', 0], [T.hotL, T.towerL, 'PROBLEM: HOT, STILL AIR', 1], [T.towerL, T.closedL, 'STEP 2: A TALL TOWER', 0],
    [T.closedL, T.openL, 'PROBLEM: IT IS CLOSED', 1], [T.openL, T.stillL, 'STEP 3: OPEN IT TO THE WIND', 0], [T.stillL, T.waterL, 'PROBLEM: THE WIND IS HOT', 1],
    [T.waterL, T.stuckL, 'STEP 4: WATER UNDER THE FLOOR', 0], [T.stuckL, T.ventL, 'PROBLEM: HOT AIR IS TRAPPED', 1], [T.ventL, T.loopL, 'STEP 5: A VENT', 0],
    [T.loopL, T.factL, 'RESULT: A COOL HOUSE', 2], [T.factL, T.payoff, 'YAZD, IRAN', 2], [T.payoff, DUR + 1, 'NO ELECTRICITY', 2],
  ];
  function stepTag(t) {
    const st = STEPS.find(([a, b]) => t >= a && t < b); if (!st) return;
    const [a, b, text, kind] = st, ap = eout(k(t, a, a + 0.25)), al = ap * (1 - sm(k(t, b - 0.15, b)));
    if (al <= 0) return;
    g.save(); g.globalAlpha = al; g.font = `58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 64, h = 92, x = W / 2, y = 150 - 30 * (1 - ap);
    g.fillStyle = kind === 1 ? 'rgba(255,106,26,0.96)' : 'rgba(14,18,24,0.86)';
    g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, 20) : g.rect(x - w / 2, y - h / 2, w, h); g.fill();
    if (kind !== 1) { g.strokeStyle = kind === 2 ? '#5ab8ff' : '#ff7a1a'; g.lineWidth = 4; g.stroke(); }
    g.fillStyle = kind === 1 ? '#111' : kind === 2 ? '#7cc8ff' : '#ff8a2a'; g.fillText(text, x, y + 4); g.restore();
  }
  // finishing: a light vignette, a warm haze in the heat, the hook's flash
  const vign = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const gr = x.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.16)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H); return c; })();
  function finish(t, env, Hs) {
    const heat = Hs ? 0.1 * (1 - sm(k(t, HK.inside - 0.3, HK.inside + 0.3))) : 0.06 * env.hotK;
    if (heat > 0) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = heat * 3; g.fillStyle = '#ff9a3c'; g.fillRect(0, 0, W, H); g.restore(); }
    g.drawImage(vign, 0, 0);
    stepTag(t);
    const fl = [HK.inside, HK.H1].reduce((a, ft) => Math.max(a, 1 - Math.abs(t - ft) / 0.14), 0);
    if (fl > 0) { g.save(); g.globalAlpha = fl * 0.8; g.fillStyle = '#fff6e6'; g.fillRect(0, 0, W, H); g.restore(); }
  }

  // ---------- scenes on VideoHub's timeline
  window.VH_SCENES = [
    ['Hook', 0, HK.H1], ['Mud house', HK.H1, T.hotL], ['Hot inside', T.hotL, T.towerL], ['Tower', T.towerL, T.closedL], ['Closed', T.closedL, T.openL],
    ['Openings', T.openL, T.downL], ['Wind down', T.downL, T.stillL], ['Still hot', T.stillL, T.waterL], ['Water channel', T.waterL, T.stuckL],
    ['Trapped heat', T.stuckL, T.ventL], ['Vent', T.ventL, T.loopL], ['Loop', T.loopL, T.factL], ['Town of towers', T.factL, T.payoff], ['Ending', T.payoff, DUR],
  ].map(([name, t0, t1]) => ({ name, t0: +t0.toFixed(2), t1: +t1.toFixed(2) }));

  window.renderOut = function (t) {
    t = clamp(+t || 0, 0, DUR);
    const Hs = hookState(t), bt = Hs ? Hs.bt : t;
    build(bt, t, Hs);
    const env = environment(bt);
    particles(bt, env, t, Hs);
    camAt(t);
    renderPost(scene, cam);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(glc, 0, 0, W, H);
    finish(t, env, Hs);
    label(t, 'WIND', V(7, 7.4, -0.2), T.closed - 0.2, T.openL, 1, '#ffffff');
    label(t, 'WINDCATCHER', V(-1.8, RT + TH + 0.2, 0), T.tower + 0.3, T.closedL, -1);
    label(t, 'OPENINGS', V(-1.2, RT + 2.85, -0.2), T.openC + 0.4, T.downL + 0.3, 1);
    label(t, 'HOT AIR', V(-0.2, 1.4, -0.6), T.stillHot - 0.1, T.waterL, 1, '#ff8a3a');
    label(t, 'WATER CHANNEL', V(-1.65, -0.12, 0.6), T.waterW + 0.2, T.coolL + 0.4, 1, '#7cc8ff');
    label(t, 'COOL AIR', V(-0.2, 0.35, -0.4), T.cools - 0.1, T.stuckL, 1, '#7cc8ff');
    label(t, 'TRAPPED HEAT', V(0.6, 3.0, -0.8), T.warm, T.ventL + 0.2, -1, '#ff8a3a');
    label(t, 'HOT AIR OUT', V(3.6, 3.4, -0.9), T.rises, T.loopL + 0.3, -1, '#ff8a3a');
    if (Hs) {
      thermo(40, 60, eout(k(t, 0.3, 0.6)) * (1 - sm(k(t, HK.H1 - 0.3, HK.H1))), lerp(32, 45, eout(k(t, 0.3, 1.5))), 'OUTSIDE', true);
      thermo(W - 290, 60, eout(k(t, HK.inside + 0.1, HK.inside + 0.4)) * (1 - sm(k(t, HK.H1 - 0.3, HK.H1))), lerp(45, 29, eio(k(t, HK.inside + 0.2, HK.inside + 1.6))), 'INSIDE', false);
    }
    captions(t);
  };

  (async () => {
    const font = new FontFace(FONT, 'url(fonts/Anton-Regular.ttf)'); await font.load(); document.fonts.add(font);
    await Promise.all(pending);
    const pm = new THREE.PMREMGenerator(R);
    if (hdrTex) { scene.environment = pm.fromEquirectangular(hdrTex).texture; scene.background = hdrTex; }
    else { const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(sky.geometry, skyMat)); scene.environment = pm.fromScene(skyScene, 0.02).texture; scene.add(sky); }
    window.renderOut(0); window.renderOut(20);
    window.READY = true;
  })();
})();
