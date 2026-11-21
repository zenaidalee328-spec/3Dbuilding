// "Clay pot fridge": two clay pots + wet sand keep food cold by evaporation, built up step by step.
// three.js scene on an offscreen WebGL canvas, copied onto the 1080x1920 page canvas (#c) with captions and labels.
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
  // periodic value noise (tiles), for the procedural textures
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
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.12;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.localClippingEnabled = true;
  if ('useLegacyLights' in R) R.useLegacyLights = false;
  const srgb = tex => { if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding; return tex; };

  // ---------- post: the scene renders to an HDR target with depth, then depth of field, bloom and tone mapping
  const POST = { focus: 2, aperture: 0.9, maxBlur: 14, bloom: 0.35, thr: 1.0 };
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
          float w = zs < z0 - 0.02 ? clamp(cs - r + 1.0, 0.0, 1.0) : 1.0;   // a sharp thing in front does not smear
          acc += texture2D(tColor, uv).rgb * w; ws += w;
        }
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`, { tColor: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, near: { value: 0.03 }, far: { value: 200 }, focus: { value: 2 }, aperture: { value: 0.9 }, maxBlur: { value: 14 }, px: { value: new THREE.Vector2(1 / W, 1 / H) } });
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
    }`, { tA: { value: rtDof.texture }, tB: { value: rtB[0].texture }, tC: { value: rtC[0].texture }, bloom: { value: 0.35 }, sat: { value: 1.22 }, con: { value: 1.06 } }, true);
  const pass = (mat, target) => { quad.material = mat; R.setRenderTarget(target); R.render(postScene, postCam); };
  function blur2(rts, w, h, n) { for (let i = 0; i < n; i++) {
    blurMat.uniforms.t.value = rts[0].texture; blurMat.uniforms.dir.value.set(1 / w, 0); pass(blurMat, rts[1]);
    blurMat.uniforms.t.value = rts[1].texture; blurMat.uniforms.dir.value.set(0, 1 / h); pass(blurMat, rts[0]); } }
  function renderPost(scene, cam) {
    R.setRenderTarget(rtMain); R.render(scene, cam);
    Object.assign(dofMat.uniforms.near, { value: cam.near }); dofMat.uniforms.far.value = cam.far;
    dofMat.uniforms.focus.value = POST.focus; dofMat.uniforms.aperture.value = POST.aperture; dofMat.uniforms.maxBlur.value = POST.maxBlur;
    pass(dofMat, rtDof);
    brightMat.uniforms.t.value = rtDof.texture; brightMat.uniforms.thr.value = POST.thr; brightMat.uniforms.px.value.set(1 / W, 1 / H); pass(brightMat, rtB[0]);
    blur2(rtB, BW, BH, 2);
    brightMat.uniforms.t.value = rtB[0].texture; brightMat.uniforms.thr.value = 0; brightMat.uniforms.px.value.set(1 / BW, 1 / BH); pass(brightMat, rtC[0]);
    blur2(rtC, BW / 2, BH / 2, 3);
    outMat.uniforms.bloom.value = POST.bloom; pass(outMat, null);
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8d8bc, 25, 160);
  const cam = new THREE.PerspectiveCamera(46, W / H, 0.03, 200);

  // ---------- sky: hot, hazy desert blue; evening turns it orange
  const SKY = { top: new THREE.Color('#4a8ad2'), hor: new THREE.Color('#f2dfbd'), eTop: new THREE.Color('#33407a'), eHor: new THREE.Color('#ff9a55') };
  const skyU = { top: { value: SKY.top.clone() }, hor: { value: SKY.hor.clone() }, sunDir: { value: V(0.62, 0.78, 0.1).normalize() }, dim: { value: 1 } };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float dim; varying vec3 vd;
      void main(){ float h = clamp(vd.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(clamp(h,0.0,1.0), 0.5));
        c = mix(c, hor*0.9, clamp(-h*4.0,0.0,1.0));
        float s = max(dot(normalize(vd), sunDir), 0.0); c += vec3(1.0,0.9,0.72) * (pow(s, 500.0)*3.5 + pow(s, 10.0)*0.35) * dim;
        gl_FragColor = vec4(c * dim, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), skyMat);   // kept only as a fallback

  // ---------- light
  const SUN0 = V(0.62, 0.78, 0.1).normalize(), SUNE = V(0.85, 0.2, -0.45).normalize();
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 30 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
  sun.target.position.set(0.3, 0.4, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd6e6ff, 0xc9a06a, 0.15); scene.add(hemi);
  const coldGlow = new THREE.PointLight(0x9fd2ff, 0, 0.7, 2); coldGlow.position.set(0, 0.3, -0.08); scene.add(coldGlow);

  // ---------- textures: Poly Haven CC0 (tex/) + procedural canvases (sand, terracotta, cloth, reed)
  const TLd = new THREE.TextureLoader(), pending = [];
  function tex(name, rx, ry, color) {
    const t = TLd.load('tex/' + name + (color === false ? '_nor_gl' : '_diff') + '.jpg');
    pending.push(new Promise(ok => { const i = setInterval(() => { if (t.image && t.image.complete !== false && t.image.width) { clearInterval(i); ok(); } }, 30); }));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    return color === false ? t : srgb(t);
  }
  const pbr = (name, rx, ry, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex(name, rx, ry), normalMap: tex(name, rx, ry, false), roughness: 0.85 }, o));
  function rtex(name, rx, ry) { const t = TLd.load('tex/' + name + '_rough.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    pending.push(new Promise(ok => { const i = setInterval(() => { if (t.image && t.image.width) { clearInterval(i); ok(); } }, 30); })); return t; }
  const pbr3 = (name, rx, ry, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: tex(name, rx, ry), normalMap: tex(name, rx, ry, false), roughnessMap: rtex(name, rx, ry), roughness: 1 }, o));
  const xhr = (url, type) => new Promise((ok, no) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = type;
    r.onload = () => (r.status === 200 || r.status === 0) && r.response ? ok(r.response) : no(new Error(url)); r.onerror = () => no(new Error(url)); r.send(); });
  // Radiance .hdr (Poly Haven CC0): decoded here and turned so its sun sits where the scene's sun is
  let hdrTex = null;
  const FOGC = new THREE.Color(0xe8d8bc);
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
    const el = Math.min(((by + 0.5) / h - 0.5) * Math.PI, rad(68)), az = Math.atan2(SUN0.z, SUN0.x);
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
    FOGC.setRGB(hr / w, hg / w, hb / w);
  }));
  // a small glTF reader (Poly Haven CC0 models: one .bin, jpg textures, node translations)
  const pending2 = [];
  function gltf(dir, name) {
    const grp = new THREE.Group();
    pending.push(Promise.all([xhr(dir + name + '.gltf', 'json'), xhr(dir + name + '.bin', 'arraybuffer')]).then(([gj, bin]) => {
      const acc = i => { const a = gj.accessors[i], bv = gj.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
        const C = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
        return new THREE.BufferAttribute(new C(bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n), n); };
      const img = i => { const t = TLd.load(dir + gj.images[gj.textures[i].source].uri); t.flipY = false; t.anisotropy = 8;
        pending2.push(new Promise(ok => { const iv = setInterval(() => { if (t.image && t.image.width) { clearInterval(iv); ok(); } }, 30); })); return t; };
      const mats = gj.materials.map(m => { const pm = m.pbrMetallicRoughness, arm = img(pm.metallicRoughnessTexture.index);
        return new THREE.MeshStandardMaterial({ map: srgb(img(pm.baseColorTexture.index)), normalMap: img(m.normalTexture.index), roughnessMap: arm, metalnessMap: arm, aoMap: arm, side: THREE.DoubleSide }); });
      gj.scenes[0].nodes.forEach(ni => { const nd = gj.nodes[ni], pr = gj.meshes[nd.mesh].primitives[0], gm = new THREE.BufferGeometry();
        gm.setAttribute('position', acc(pr.attributes.POSITION)); gm.setAttribute('normal', acc(pr.attributes.NORMAL)); gm.setAttribute('uv', acc(pr.attributes.TEXCOORD_0)); gm.setIndex(acc(pr.indices));
        const m = shadowed(new THREE.Mesh(gm, mats[pr.material])); if (nd.translation) m.position.fromArray(nd.translation); grp.add(m); });
    }));
    return grp;
  }
  // fn(u, v, i, j) -> [r, g, b, height]; returns {map, normalMap}
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
  const sandT = procTex(512, (u, v, i, j) => {
    const n = fbm(u, v, 8, 5), rip = Math.sin(6.2832 * (v * 18 + u * 3 + n * 2.4));
    const grain = hash(i * 7.13 + j * 13.37), sp = grain > 0.985 ? -40 : grain < 0.01 ? 25 : 0, l = 0.84 + 0.3 * n + 0.04 * rip;
    return [222 * l + sp, 186 * l + sp, 132 * l + sp, rip * 0.35 + n * 1.2 + grain * 0.15];
  }, 2.2, [14, 14]);
  const clayT = procTex(512, (u, v, i, j) => {
    const n = fbm(u, v, 6, 5), ring = Math.sin(6.2832 * (v * 45 + n * 1.5)) * 0.5 + 0.5;
    const salt = sm((fbm(u + 0.3, v, 5, 4) - 0.62) * 5) * sm((v - 0.36) * 10) * (1 - sm((v - 0.58) * 10)) * 0.22;
    const grain = hash(i * 3.71 + j * 9.13), sp = grain > 0.98 ? -35 : 0, l = 0.8 + 0.34 * n + 0.05 * ring;
    return [lerp(182 * l, 226, salt) + sp, lerp(98 * l, 214, salt) + sp, lerp(60 * l, 196, salt) + sp, ring * 0.1 + n + grain * 0.25];
  }, 1.4, [3, 1]);
  const cutT = procTex(256, (u, v, i, j) => {
    const n = fbm(u, v, 10, 4), grain = hash(i * 5.1 + j * 2.7), l = 0.75 + 0.35 * n + (grain > 0.9 ? 0.1 : 0);
    return [158 * l, 80 * l, 50 * l, n + grain * 0.3];
  }, 1.5, [8, 8]);
  const clothT = procTex(256, (u, v, i, j) => {
    const wx = Math.sin(i * Math.PI / 2), wy = Math.sin(j * Math.PI / 2), w = (i >> 1) % 2 === (j >> 1) % 2 ? wx : wy, n = fbm(u, v, 4, 4);
    const l = 0.86 + 0.08 * w + 0.12 * n;
    const st = fbm(u + 0.5, v, 3, 3); return [200 * l - st * 30, 182 * l - st * 32, 150 * l - st * 30, w * 0.6 + n * 0.3];
  }, 2.5, [6, 6]);
  const reedT = procTex(256, (u, v) => {
    const n = fbm(u, v, 4, 3), s = Math.sin(6.2832 * (u * 40 + n * 0.6)), l = 0.72 + 0.2 * s + 0.2 * n;
    return [200 * l, 160 * l, 92 * l, s * 0.7 + n * 0.3];
  }, 3, [3, 2]);

  // wet look for any standard material: below/inside [lo, hi] in world height it gets darker and glossier
  function wettable(mat, U) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.wLo = U.lo; sh.uniforms.wHi = U.hi; sh.uniforms.wAmt = U.amt;
      sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vWy; uniform float wLo, wHi, wAmt;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n float wetF = smoothstep(wLo - 0.03, wLo + 0.01, vWy) * (1.0 - smoothstep(wHi - 0.01, wHi + 0.03, vWy)) * wAmt;\n diffuseColor.rgb *= mix(1.0, 0.48, wetF);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.28, wetF);');
    };
    mat.customProgramCacheKey = () => 'wettable';
    return mat;
  }
  const wetU = () => ({ lo: { value: -1 }, hi: { value: -1 }, amt: { value: 0 } });
  const potWet = wetU(), sandWet = wetU(), clothWet = { lo: { value: -1 }, hi: { value: 9 }, amt: { value: 0.9 } };

  // the cutaway: keeps z <= cutPlane.constant (100 = whole pot); the sand is also cut at its fill level
  const cutPlane = new THREE.Plane(V(0, 0, -1), 100), sandPlane = new THREE.Plane(V(0, -1, 0), 0);
  const M = {
    sand: pbr3('coast_sand_01', 60, 60, { color: 0xf3dcc0 }),
    plaster: pbr3('clay_plaster', 3, 0.8, { color: 0xffffff }),
    brick: pbr('red_brick_03', 2, 1, { roughness: 0.9, color: 0xd9b08a }),
    plank: pbr('weathered_planks', 1, 1.2, { roughness: 0.85 }),
    post: pbr('weathered_planks', 0.15, 1.2, { roughness: 0.9 }),
    clay: wettable(pbr3('red_plaster_weathered', 3, 2, { color: 0xffb488, side: THREE.DoubleSide, clippingPlanes: [cutPlane] }), potWet),
    clayIn: pbr3('red_plaster_weathered', 2, 2, { color: 0xffc8a8, side: THREE.DoubleSide, clippingPlanes: [cutPlane] }),
    clayCut: wettable(pbr3('red_plaster_weathered', 3, 3, { color: 0xd88a62, side: THREE.DoubleSide }), potWet),
    jar: pbr3('red_plaster_weathered', 3, 2, { color: 0xffb488, side: THREE.DoubleSide }),
    sandFill: wettable(pbr3('coast_sand_01', 2, 2, { color: 0xf3dcc0, side: THREE.DoubleSide, clippingPlanes: [cutPlane, sandPlane] }), sandWet),
    sandCut: wettable(pbr3('coast_sand_01', 3, 3, { color: 0xe6cba8, side: THREE.DoubleSide, clippingPlanes: [sandPlane] }), sandWet),
    cloth: wettable(new THREE.MeshStandardMaterial({ map: clothT.map, normalMap: tex('rough_linen', 3, 3, false), roughnessMap: rtex('rough_linen', 3, 3), roughness: 1, color: 0xffffff, side: THREE.DoubleSide, clippingPlanes: [cutPlane] }), clothWet),
    reed: pbr3('reed_roof_04', 2, 1.5, { color: 0xffffff }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }),
    tomato: new THREE.MeshPhysicalMaterial({ color: 0xc81e12, roughness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xff6040) }),
    rotten: new THREE.MeshStandardMaterial({ color: 0xd8261a, roughness: 0.4 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x2f5a1c, roughness: 0.6, side: THREE.DoubleSide }),
    carrot: new THREE.MeshStandardMaterial({ color: 0xe8701a, roughness: 0.55 }),
    pepper: new THREE.MeshPhysicalMaterial({ color: 0x3c9a2c, roughness: 0.25, clearcoat: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ color: 0xcfe9ff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.5, envMapIntensity: 2.5, depthWrite: false }),
    fly: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 }),
  };

  const shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  const box = (w, h, d, mat) => shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));

  // ---------- the courtyard
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), M.sand); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const backWall = box(10, 1.7, 0.35, M.plaster); backWall.position.set(0.4, 0.85, -2.5); scene.add(backWall);
  const sideWall = box(0.35, 1.7, 4.2, M.plaster); sideWall.position.set(-3.0, 0.85, -0.6); scene.add(sideWall);
  const door = box(1.0, 1.55, 0.06, M.plank); door.position.set(2.2, 0.775, -2.3); scene.add(door);
  const doorF = box(1.2, 0.12, 0.4, M.post); doorF.position.set(2.2, 1.6, -2.45); scene.add(doorF);
  const coping = box(10, 0.08, 0.42, M.plaster); coping.position.set(0.4, 1.72, -2.5); scene.add(coping);
  // soft contact shadows (ambient occlusion where things touch the ground)
  const aoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const contact = (x, z, r, o = 0.6) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: o, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.002, z); scene.add(m); return m; };
  // a few stones half buried in the sand
  for (let i = 0; i < 7; i++) {
    const s = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + hash(i + 70) * 0.1, 1), M.plaster));
    s.position.set(-2.4 + hash(i + 71) * 5, 0.02, -2.0 + hash(i + 72) * 2.4); s.scale.y = 0.45; s.rotation.y = hash(i) * 6; scene.add(s);
  }

  // ---------- pots: lathe profiles (r, y); a wall has an outside and an inside
  const BIG_O = [[0.001, 0], [0.19, 0], [0.225, 0.02], [0.31, 0.14], [0.355, 0.28], [0.35, 0.40], [0.318, 0.50], [0.298, 0.548], [0.305, 0.572], [0.328, 0.588], [0.334, 0.6]];
  const BIG_I = [[0.31, 0.602], [0.285, 0.585], [0.278, 0.55], [0.296, 0.50], [0.326, 0.40], [0.331, 0.28], [0.288, 0.15], [0.205, 0.045], [0.001, 0.038]];
  const SML_O = [[0.001, 0.07], [0.12, 0.07], [0.165, 0.11], [0.205, 0.24], [0.218, 0.40], [0.21, 0.52], [0.214, 0.585], [0.232, 0.605], [0.234, 0.615]];
  const SML_I = [[0.214, 0.618], [0.198, 0.6], [0.192, 0.55], [0.198, 0.40], [0.186, 0.25], [0.15, 0.13], [0.11, 0.093], [0.001, 0.09]];
  const v2 = a => a.map(([r, y]) => new THREE.Vector2(r, y));
  const smooth = (a, n = 64) => { const c = new THREE.CatmullRomCurve3(a.map(([r, y]) => V(r, y, 0)), false, 'centripetal'); return c.getPoints(n).map(q => [Math.max(0.001, q.x), q.y]); };
  const rAt = (pts, y) => {   // radius of a profile at height y (pts in any order)
    const s = pts.slice().sort((a, b) => a[1] - b[1]);
    if (y <= s[0][1]) return s[0][0]; if (y >= s[s.length - 1][1]) return s[s.length - 1][0];
    for (let i = 0; i < s.length - 1; i++) if (y <= s[i + 1][1]) return lerp(s[i][0], s[i + 1][0], (y - s[i][1]) / (s[i + 1][1] - s[i][1]));
  };
  const bigOut = y => rAt(BIG_O.slice(1, -1), y), bigIn = y => rAt(BIG_I.slice(0, -1), y), smlOut = y => rAt(SML_O.slice(1), y);
  const potG = new THREE.Group(); scene.add(potG);
  const potAO = contact(0, 0, 0.6, 0.75);
  function makePot(O, I, outMat, inMat) {
    O = smooth(O, 70); I = smooth(I, 60);
    const gr = new THREE.Group();
    const outer = shadowed(new THREE.Mesh(new THREE.LatheGeometry(v2(O), 128), outMat)); gr.add(outer);
    const inner = new THREE.Mesh(new THREE.LatheGeometry(v2(I), 128), inMat); inner.receiveShadow = true; gr.add(inner);
    // the cut face of the wall (both sides), shown when the cutaway is on
    const sh = new THREE.Shape(v2(O.concat(I)));
    const caps = new THREE.Group(); gr.add(caps);
    [1, -1].forEach(s => { const c = new THREE.Mesh(new THREE.ShapeGeometry(sh), M.clayCut); c.scale.x = s; c.receiveShadow = true; caps.add(c); });
    gr.userData.caps = caps; return gr;
  }
  const bigPot = makePot(BIG_O, BIG_I, M.clay, M.clayIn); potG.add(bigPot);
  const smallPot = makePot(SML_O, SML_I, M.clayIn, M.clayIn); potG.add(smallPot);
  // the sand between the pots: a ring from the bottom to the max fill; a horizontal plane trims it to the fill level
  const SAND_MAX = 0.545, SAND_MIN = 0.038;
  const sandProfile = (() => { const o = [], inn = [];
    for (let i = 0; i <= 30; i++) { const y = lerp(SAND_MIN, SAND_MAX + 0.01, i / 30); o.push([bigIn(y) - 0.002, y]); inn.push([y < 0.072 ? 0.001 : smlOut(y) + 0.002, y]); }
    return { o, inn }; })();
  const sandBody = new THREE.Mesh(new THREE.LatheGeometry(v2(sandProfile.o.concat(sandProfile.inn.slice().reverse())), 96), M.sandFill); sandBody.receiveShadow = true; potG.add(sandBody);
  const sandCaps = new THREE.Group(); potG.add(sandCaps);
  [1, -1].forEach(s => { const c = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(v2(sandProfile.o.concat(sandProfile.inn.slice().reverse())))), M.sandCut); c.scale.x = s; c.position.z = 0.001; sandCaps.add(c); });
  const sandTop = new THREE.Mesh(new THREE.BufferGeometry(), M.sandFill); sandTop.rotation.x = -Math.PI / 2; sandTop.receiveShadow = true; potG.add(sandTop);
  const ringCache = {};
  function setSandTop(L) {
    const key = Math.round(L * 400);
    if (!ringCache[key]) { const y = key / 400; ringCache[key] = new THREE.RingGeometry(y < 0.072 ? 0.001 : smlOut(y) + 0.002, bigIn(y) - 0.002, 96, 1); }
    sandTop.geometry = ringCache[key]; sandTop.position.y = L - 0.002;
  }
  // beads of water on the outside wall
  const NBEAD = 170;
  const beadMat = new THREE.MeshStandardMaterial({ color: 0x9a6a50, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.4, clippingPlanes: [cutPlane] });
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), beadMat, NBEAD); beads.frustumCulled = false; potG.add(beads);

  // ---------- food in the small pot (kept behind the cut, so the cutaway shows it)
  const tomT = procTex(256, (u, v, i, j) => {
    const n = fbm(u, v, 6, 4), top = sm((v - 0.72) * 5), stripe = 0.5 + 0.5 * Math.sin(u * 6.2832 * 6 + n * 2), sp = hash(i * 3.3 + j * 7.7) > 0.992 ? 1 : 0;
    const r = 205 + 30 * n - 20 * top * stripe, gC = 30 + 25 * n + 70 * top * (0.6 + 0.4 * stripe), b = 18 + 10 * n;
    return [r + sp * 40, gC + sp * 50, b + sp * 20, n * 0.6 + top * stripe * 0.4]; }, 0.8, [1, 1]);
  M.tomato.map = tomT.map; M.tomato.normalMap = tomT.normalMap; M.tomato.normalScale = new THREE.Vector2(0.3, 0.3); M.tomato.color.set(0xffffff);
  M.rotten.map = tomT.map; M.rotten.normalMap = tomT.normalMap;
  const tomGeo = (() => { const gm = new THREE.SphereGeometry(1, 48, 32), q = gm.attributes.position;   // lobed, with a dimple at the stem
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i), a = Math.atan2(z, x), lobe = 1 + 0.035 * Math.cos(a * 5) * (1 - y * y), dimple = 1 - 0.18 * Math.pow(Math.max(0, y), 14);
      q.setXYZ(i, x * lobe, y * dimple * 0.86, z * lobe); }
    gm.computeVertexNormals(); return gm; })();
  function tomato(r, mat) {
    const gr = new THREE.Group();
    const b = shadowed(new THREE.Mesh(mat === M.tomato ? tomGeo : new THREE.SphereGeometry(1, 48, 32), mat)); b.scale.set(r, r, r); gr.add(b);
    // the calyx: five thin curled sepals
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 + 0.3, pts = [];
      for (let j = 0; j <= 6; j++) { const s = j / 6; pts.push(V(Math.cos(a) * s * r * 0.55, r * 0.8 + 0.08 * r * Math.sin(s * 3.1) - s * s * 0.12 * r, Math.sin(a) * s * r * 0.55)); }
      const sep = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, r * 0.035, 4, false), M.leaf); sep.scale.set(1, 1, 1); gr.add(sep); }
    const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.06, r * 0.22, 8), M.leaf); st.position.y = r * 0.9; st.rotation.z = 0.25; gr.add(st);
    gr.userData.body = b; return gr;
  }
  const food = new THREE.Group(); potG.add(food);
  [[-0.07, 0.135, -0.06, 0.045], [0.06, 0.135, -0.09, 0.046], [0.0, 0.14, -0.15, 0.044], [-0.04, 0.215, -0.13, 0.042], [0.09, 0.2, -0.03, 0.04]].forEach(([x, y, z, r], i) => {
    const tm = tomato(r, M.tomato); tm.position.set(x, y, z); tm.rotation.set(hash(i) * 0.5, hash(i + 3) * 6, hash(i + 5) * 0.4); food.add(tm); });
  [[0.02, 0.27, -0.06, 0.6], [-0.08, 0.28, -0.04, -0.4]].forEach(([x, y, z, ry]) => {
    const prof = []; for (let j = 0; j <= 24; j++) { const s = j / 24; prof.push(new THREE.Vector2(Math.max(0.0008, 0.021 * Math.pow(1 - s, 0.8) * (1 + 0.06 * Math.sin(s * 90))), s * 0.19)); }
    const c = shadowed(new THREE.Mesh(new THREE.LatheGeometry(prof.reverse(), 20), M.carrot)); c.rotation.set(Math.PI / 2 - 0.35, ry, 0); c.position.set(x, y, z); food.add(c);
    for (let i = 0; i < 6; i++) { const sm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.002, 0.07, 4), M.leaf); sm2.position.set(Math.cos(i) * 0.004, -0.035, Math.sin(i) * 0.004); sm2.rotation.set(Math.cos(i * 2) * 0.35, 0, Math.sin(i * 2) * 0.35); c.add(sm2); } });
  const pep = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M.pepper)); pep.scale.set(0.045, 0.06, 0.045); pep.position.set(0.1, 0.13, -0.12); food.add(pep);

  // ---------- the rotting tomato on a plate in the sun (line "rot", "last")
  const plate = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 40), M.jar)); scene.add(plate);
  const rotG = tomato(0.05, M.rotten); scene.add(rotG);
  (function wrinkle() {   // a morph target: shrunk and wrinkled
    const gm = rotG.userData.body.geometry, p = gm.attributes.position, q = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 0.78 + 0.07 * Math.sin(x * 19 + y * 7) * Math.sin(z * 23 - y * 11) + 0.05 * Math.sin(x * 41 + z * 37 + y * 13);
      q[i * 3] = x * d; q[i * 3 + 1] = (y < 0 ? y * 0.9 : y * 0.62) * d; q[i * 3 + 2] = z * d;
    }
    const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.BufferAttribute(q, 3)); tmp.setIndex(gm.index); tmp.computeVertexNormals();
    gm.morphAttributes.position = [new THREE.BufferAttribute(q, 3)]; gm.morphAttributes.normal = [tmp.attributes.normal];
    rotG.userData.body.updateMorphTargets();
  })();
  const PLATE = V(0.62, 0, 0.42);
  plate.position.set(PLATE.x, 0.01, PLATE.z); rotG.position.set(PLATE.x, 0.06, PLATE.z); const plateAO = contact(PLATE.x, PLATE.z, 0.17, 0.6);
  const flies = [0, 1].map(() => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M.fly); f.scale.set(0.008, 0.006, 0.012); scene.add(f); return f; });

  // ---------- the jug that pours water into the sand (its group origin is the spout)
  const jug = new THREE.Group(); scene.add(jug);
  const pitcher = gltf('models/jug_01/', 'jug_01'); pitcher.scale.setScalar(1.25); pitcher.position.set(-0.122 * 1.25, -0.205 * 1.25, 0); jug.add(pitcher);
  if (0) (function () {
    const JO = [[0.001, 0], [0.085, 0], [0.105, 0.04], [0.115, 0.13], [0.095, 0.21], [0.06, 0.26], [0.066, 0.29]];
    const body = shadowed(new THREE.Mesh(new THREE.LatheGeometry(v2(JO), 48), M.alu)); body.position.set(-0.14, -0.29, 0); jug.add(body);
    const spout = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.09, 16, 1, true), M.alu)); spout.rotation.z = -1.0; spout.position.set(-0.04, -0.02, 0); jug.add(spout);
    const handle = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 8, 24, Math.PI), M.alu)); handle.rotation.z = Math.PI / 2; handle.position.set(-0.25, -0.13, 0); jug.add(handle);
  })();
  const SPOUT = V(0.19, 0.93, -0.05), JV = V(0.25, 0, 0), GRAV = 9.81;
  const streamAt = (s, land) => { const tt = s * Math.sqrt(2 * (SPOUT.y - land) / GRAV); return V(SPOUT.x + JV.x * tt, SPOUT.y - 0.5 * GRAV * tt * tt, SPOUT.z); };
  const streamCurve = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => streamAt(i / 11, SAND_MAX)));
  const stream = new THREE.Mesh(new THREE.TubeGeometry(streamCurve, 40, 0.007, 8, false), M.water); scene.add(stream);
  stream.userData = { seg: 40, rad: 8 };

  // ---------- the shade roof (reed mat on four posts), the wet cloth
  const shade = new THREE.Group(); scene.add(shade);
  const SHX = [-0.95, 2.05], SHZ = [-0.85, 1.35], SHY = 1.75;
  const posts = [[SHX[0], SHZ[0]], [SHX[1], SHZ[0]], [SHX[0], SHZ[1]], [SHX[1], SHZ[1]]].map(([x, z]) => { const p = box(0.08, SHY, 0.08, M.post); p.position.set(x, SHY / 2, z); shade.add(p); return p; });
  const roof = new THREE.Group(); shade.add(roof);
  const mat_ = box(SHX[1] - SHX[0] + 0.3, 0.035, SHZ[1] - SHZ[0] + 0.3, M.reed); roof.add(mat_);
  [SHZ[0], SHZ[1]].forEach(z => { const b = box(SHX[1] - SHX[0] + 0.2, 0.07, 0.07, M.post); b.position.set(0, -0.05, z - (SHZ[0] + SHZ[1]) / 2); roof.add(b); });
  const roofBase = V((SHX[0] + SHX[1]) / 2, SHY + 0.03, (SHZ[0] + SHZ[1]) / 2); roof.position.copy(roofBase);
  // cloth: a flat square that morphs into a cloth draped over the rim
  const clothGeo = new THREE.PlaneGeometry(0.95, 0.95, 64, 64); clothGeo.rotateX(-Math.PI / 2);
  (function drape() {
    const p = clothGeo.attributes.position, q = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), RIM = 0.33;
      let y, s = 1;
      if (r < RIM) y = 0.618 - 0.035 * (1 - (r / RIM) ** 2);
      else { const d = r - RIM; y = 0.618 - d * 1.35 + 0.03 * Math.sin(Math.atan2(z, x) * 7) * sm(d * 8); s = (RIM + d * 0.35) / r; }
      y += 0.004 * Math.sin(x * 60) * Math.sin(z * 55);
      q[i * 3] = x * s; q[i * 3 + 1] = y; q[i * 3 + 2] = z * s;
    }
    clothGeo.morphAttributes.position = [new THREE.BufferAttribute(q, 3)];
    const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.BufferAttribute(q, 3)); tmp.setIndex(clothGeo.index); tmp.computeVertexNormals();
    clothGeo.morphAttributes.normal = [tmp.attributes.normal];
  })();
  const cloth = shadowed(new THREE.Mesh(clothGeo, M.cloth)); cloth.updateMorphTargets(); scene.add(cloth);

  // background jars by the wall (decor)
  [[-2.1, -1.95, 1.5], [-1.55, -2.1, 1.15], [2.9, -1.9, 1.3]].forEach(([x, z, s], i) => {
    const j = makePot(BIG_O, BIG_I, M.jar, M.jar); j.userData.caps.visible = false; j.children.forEach(c => { if (c.material) c.material = M.jar; });
    j.scale.setScalar(s); j.position.set(x, 0, z); j.rotation.y = i; scene.add(j); contact(x, z, 0.6 * s, 0.7); });
  // the wooden bucket of wet sand by the pot
  const bucket = gltf('models/wooden_bucket_01/', 'wooden_bucket_01'); bucket.position.set(-0.75, 0, 0.35); bucket.rotation.y = 0.6; scene.add(bucket); contact(-0.75, 0.35, 0.3, 0.7);
  const bucketSand = new THREE.Mesh(new THREE.CircleGeometry(0.155, 40), wettable(pbr3('coast_sand_01', 0.5, 0.5, { color: 0xf3dcc0 }), { lo: { value: -1 }, hi: { value: 9 }, amt: { value: 1 } }));
  bucketSand.rotation.x = -Math.PI / 2; bucketSand.position.set(-0.75, 0.3, 0.35); bucketSand.receiveShadow = true; scene.add(bucketSand);

  // ---------- particles: sand pour, heat, wisps, mist, wind, flow of heat across the cut, splash
  function inst(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); return m; }
  const NSAND = 160;
  const sandGrains = inst(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xd8b47c, roughness: 0.9, clippingPlanes: [cutPlane] }), NSAND);
  const NSTR = 40, streaks = inst(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 5), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }), NSTR);
  const NSPL = 30, splash = inst(new THREE.SphereGeometry(1, 8, 6), beadMat.clone(), NSPL); splash.material.clippingPlanes = [];
  const NHEAT = 70, heatDots = inst(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NHEAT);
  const windM = inst(new THREE.BoxGeometry(1, 0.003, 0.003), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }), 40);
  function blobTex(rgb) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${rgb},0.9)`); gr.addColorStop(0.5, `rgba(${rgb},0.35)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
  const heatTex = blobTex('255,160,80'), steamTex = blobTex('255,255,255');
  const sprites = (n, map, add) => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); scene.add(s); return s; });
  const heatS = sprites(26, heatTex, true), wisps = sprites(30, steamTex, false), mist = sprites(28, steamTex, false);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = V(1, 1, 1), tmpC = new THREE.Color();
  const hotC = new THREE.Color(0xff6a1e), coolC = new THREE.Color(0x5ab4ff);
  const hide = (m, from, to) => { for (let i = from; i < to; i++) { tmpM.makeScale(0, 0, 0); m.setMatrixAt(i, tmpM); } m.instanceMatrix.needsUpdate = true; };

  // ---------- the worker: a simple cartoon builder who does each step (stands on the +x side, facing the pot)
  const WK = { x: 0.66, z: -0.34 };
  const wMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const WM = { skin: wMat(0xc98b62), shirt: wMat(0xe4e8ee), over: wMat(0x2f6fc0), boot: wMat(0x3a2a1e), hat: new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.4 }),
    eye: wMat(0x161616), sack: wMat(0xb89766), glove: wMat(0xe8c14a) };
  const cap = (r, len, m) => { const g0 = new THREE.CapsuleGeometry(r, len, 6, 12); g0.translate(0, -len / 2 - r, 0); return new THREE.Mesh(g0, m); };   // hangs down from its top
  const worker = new THREE.Group(); scene.add(worker);
  const hips = new THREE.Group(); hips.position.y = 0.8; worker.add(hips);
  const legs = [-1, 1].map(sd => { const L = new THREE.Group(); L.position.set(sd * 0.1, 0, 0); hips.add(L);
    L.add(cap(0.088, 0.6, WM.over)); const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.26), WM.boot); boot.position.set(0, -0.76, 0.04); L.add(boot); return L; });
  const torso = new THREE.Group(); hips.add(torso);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.34, 8, 18), WM.over); body.position.y = 0.3; body.scale.set(1, 1, 0.75); torso.add(body);
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.14, 20, 1, true), WM.shirt); shirt.position.y = 0.6; shirt.scale.set(1, 1, 0.75); torso.add(shirt);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), WM.shirt); shoulders.position.y = 0.66; shoulders.scale.set(1.05, 0.45, 0.75); torso.add(shoulders);
  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.04), WM.over); bib.position.set(0, 0.5, 0.15); torso.add(bib);
  [-1, 1].forEach(sd => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), WM.over); st.position.set(sd * 0.09, 0.66, 0.15); torso.add(st);
    const bt = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), WM.glove); bt.position.set(sd * 0.09, 0.58, 0.172); torso.add(bt); });
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.08, 12), WM.skin); neck.position.y = 0.02; head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), WM.skin); skull.position.y = 0.16; skull.scale.set(1, 1.05, 1); head.add(skull);
  [-1, 1].forEach(sd => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), WM.eye); e.position.set(sd * 0.05, 0.18, 0.128); head.add(e);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), WM.skin); ear.position.set(sd * 0.138, 0.15, 0); head.add(ear); });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), WM.skin); nose.position.set(0, 0.145, 0.142); head.add(nose);
  const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), WM.hat); hatTop.position.y = 0.21; head.add(hatTop);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.018, 28), WM.hat); brim.position.set(0, 0.215, 0.03); head.add(brim);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.28), WM.hat); ridge.position.y = 0.355; head.add(ridge);
  const UA = 0.29, LA = 0.28;
  const arms = [-1, 1].map(sd => { const sh = new THREE.Group(); sh.position.set(sd * 0.25, 0.63, 0); torso.add(sh);
    sh.add(cap(0.062, UA - 0.062, WM.shirt)); const el = new THREE.Group(); el.position.y = -UA; sh.add(el);
    el.add(cap(0.052, LA - 0.052, WM.skin)); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), WM.glove); hand.position.y = -LA - 0.02; hand.scale.set(1, 1.15, 0.8); el.add(hand);
    return { sd, sh, el }; });
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), WM.sack); sack.scale.set(1.25, 0.8, 0.8); scene.add(sack);
  shadowed(worker); shadowed(sack);
  const DOWN = V(0, -1, 0), _a = V(), _b = V(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
  // two-bone IK in the torso's space: the hand goes to `target` (world); the elbow points out and back
  function reach(arm, target, w) {
    if (w <= 0.001) { arm.sh.quaternion.identity(); arm.sh.rotation.set(0.08, 0, arm.sd * 0.12); arm.el.rotation.set(-0.25, 0, 0); return; }
    const S = arm.sh.position, Tl = torso.worldToLocal(target.clone());
    const rest = S.clone().add(V(arm.sd * 0.06, -0.58, 0.08)); Tl.lerp(rest, 1 - w);
    const v = Tl.clone().sub(S), d = clamp(v.length(), 0.08, UA + LA - 0.004), dir = v.normalize();
    const ca = clamp((UA * UA + d * d - LA * LA) / (2 * UA * d), -1, 1), al = Math.acos(ca);
    const pole = V(arm.sd * 0.9, -0.5, -0.6); const perp = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const E = S.clone().addScaledVector(dir, UA * Math.cos(al)).addScaledVector(perp, UA * Math.sin(al)), H2 = S.clone().addScaledVector(dir, d);
    arm.sh.quaternion.setFromUnitVectors(DOWN, _a.copy(E).sub(S).normalize());
    _qi.copy(arm.sh.quaternion).invert(); _b.copy(H2).sub(E).normalize().applyQuaternion(_qi);
    arm.el.quaternion.setFromUnitVectors(DOWN, _b);
  }

  // ---------- times (all from the words of the script)
  const LN = id => window.TL.line(id);
  const T = {
    rot: -100, tomatoes: -100, days: -100, rotEnd: -100,   // the rotting tomato now lives only in the hook
    potL: LN('pot').t0, clay: cue('pot', 'clay'), inside: cue('pot', 'inside'),
    gapL: LN('gap').t0, gap: cue('gap', 'gap'),
    sand: cue('sand', 'sand'), sandEnd: LN('sand').t1 + 0.4,
    dry: LN('dry').t0, dryHeat: cue('dry', 'heat'),
    waterL: LN('water').t0, pour: cue('water', 'pour'), soaked: cue('water', 'soaked'), waterEnd: LN('water').t1,
    seepL: LN('seep').t0, seep: cue('seep', 'seeps'), seepEnd: LN('seep').t1 + 0.4,
    cool: LN('cool').t0,
    evapL: LN('evap').t0, evap: cue('evap', 'evaporates'), colder: cue('evap', 'colder'),
    name: LN('name').t0,
    sunL: LN('sun').t0, sun: cue('sun', 'sun'), sunEnd: LN('sun').t1,
    shadeL: LN('shade').t0, shade: cue('shade', 'shade'), windW: cue('shade', 'wind'),
    top: LN('top').t0, drops: cue('top', 'drops'), topEnd: LN('top').t1,
    clothL: LN('cloth').t0, cloth: cue('cloth', 'cloth'),
    eveL: LN('dryout').t0, eve: cue('dryout', 'evening'), dries: cue('dryout', 'dries'),
    refillL: LN('refill').t0, refill: cue('refill', 'water'), twice: cue('refill', 'twice'), refillEnd: LN('refill').t1,
    fact: LN('fact').t0, ten: cue('fact', 'ten'), factEnd: LN('fact').t1,
    last: LN('last').t0, weeks: cue('last', 'weeks'), lastEnd: LN('last').t1,
    payoff: LN('payoff').t0, end: LN('end').t0,
  };

  // ---------- two hooks, back to back, so the user can pick one:
  // A (problem first): a macro of a tomato rotting in a sun time-lapse, then the wet cloth whips off the cold pot.
  // B (result first): the blazing courtyard at 45 degrees, then a whip into the cold pot: 45 outside, 24 inside.
  const HK = {
    aTom: cue('hookA', 'tomato'), aDays: cue('hookA', 'days'), uA: cue('hookA', 'unless') - 0.06, A1: LN('pot').t0 - 0.15,
  };
  HK.flashes = [HK.uA, HK.A1];
  function hookState(t) {
    if (t < HK.uA) return { kind: 'rot', rk: eio(k(t, HK.aTom - 0.2, HK.aDays + 0.4)), sunTurn: -2.2 * eio(k(t, HK.aTom - 0.4, HK.aDays + 0.6)), bt: T.rot + 0.4 };
    if (t < HK.A1) return { kind: 'pot', reveal: HK.uA, bt: T.payoff + 2 + (t - HK.uA) * 0.6 };
    return null;
  }
  // Camera like the 3D "how it's built" shorts: a normal lens, a little above eye level (8-35 deg down), the WHOLE object in
  // frame with its surroundings around it. Every view is a direction + a target + how many metres wide the frame is at the target.
  const FOV = 40, ASP = W / H;
  const distFor = (w, f = FOV) => w / 2 / (Math.tan(rad(f / 2)) * ASP);
  function shot(p, q, w, elMin, elMax, f = FOV) {
    const Q = V(...q), d = V(...p).sub(Q).normalize();
    if (elMin != null) { const el = clamp(Math.asin(d.y), rad(elMin), rad(elMax)), hz = Math.hypot(d.x, d.z) || 1;
      d.set(d.x / hz * Math.cos(el), Math.sin(el), d.z / hz * Math.cos(el)); }
    return { Q, d, w, f };
  }
  function hookCam(t, Hs) {
    if (Hs.kind === 'rot') { const m = sm(k(t, 0, HK.uA)), tip = [PLATE.x, 0.06, PLATE.z];
      const S = shot([PLATE.x + 0.42, 0.06 + 0.22, PLATE.z + 0.5], tip, 0.62 - 0.12 * m); return { ...S, roll: 0.03 * (1 - m) }; }
    const m = eout(k(t, Hs.reveal, Hs.reveal + 1.6));
    // the reveal looks down into the pot at the cold food, then pulls back to show the whole pot
    const o = eio(k(t, Hs.reveal + 0.9, Hs.reveal + 3.2));
    const A = shot([0.3, 1.12, 0.5], [0, 0.16, -0.06], 0.62 - 0.06 * m), B = shot([0.45, 0.8, 1.25], [0, 0.3, 0], 1.25);
    return { Q: A.Q.lerp(B.Q, o), d: A.d.lerp(B.d, o).normalize(), w: lerp(A.w, B.w, o), f: FOV, roll: 0.03 * (1 - m) };
  }
  // [start, camera side, target, frame width (m) at the target, lens fov, slow drift (deg over the shot)]
  const VIEWS = [
    [T.potL, [2.6, 1.05, 3.3], [0.25, 0.75, 0], 3.0, 40, 6],                 // wide: the yard and the worker
    [T.clay - 0.7, [0.85, 0.1, 1.35], [0, 0.42, 0], 1.6, 40, -4],            // low hero: the big pot lands
    [T.inside - 0.6, [1.5, 1.95, 0.08], [0, 0.4, 0.02], 0, 55, 4, 1],         // over the worker's shoulder (camera set by hand)
    [T.gapL - 0.2, [0.45, 0.5, 1.7], [0, 0.33, 0], 1.2, 40, 4],              // the cutaway
    [T.sand - 0.4, [-0.35, 1.7, 0.75], [0.05, 0.42, 0], 1.25, 45, -6],      // top-down into the ring
    [T.dry, [0.3, 0.42, 0.95], [0.2, 0.38, 0], 0.7, 40, 5],                  // close: the dry sand
    [T.waterL, [1.55, 1.9, 0.28], [0.05, 0.45, 0], 0, 55, -4, 1],            // over the shoulder: the pour
    [T.seepL, [-0.75, 0.32, 1.0], [-0.22, 0.3, 0], 0.85, 40, 6],            // close, low: the wet wall
    [T.cool, [0.2, 0.55, 1.4], [0, 0.32, 0], 1.15, 40, -4],
    [T.evapL, [0.85, 0.7, 1.55], [0, 0.38, 0], 1.3, 40, 6],
    [T.name, [0.9, 0.15, 1.5], [0, 0.5, 0], 1.6, 40, -5],                   // low hero
    [T.sunL, [-1.05, 0.2, 2.0], [0.3, 0.9, 0], 2.6, 45, 5],                 // looking up into the sun
    [T.shadeL, [2.8, 2.6, 3.6], [0.5, 0.75, 0.2], 3.8, 40, -6],             // high crane: the roof drops in
    [T.top, [0.25, 1.0, 0.45], [0, 0.4, 0], 1.0, 65, 8],                     // under the roof, looking down
    [T.clothL, [0.55, 0.5, 1.5], [0.15, 0.55, 0], 1.6, 45, -5],             // front, low: the worker lays the cloth
    [T.eveL - 0.2, [-1.3, 0.55, 2.6], [0.25, 0.65, 0], 2.5, 40, 5],         // wide, low, evening
    [T.refillL, [0.95, 0.85, 1.05], [0.15, 0.55, 0], 1.15, 50, -5],
    [T.fact, [1.45, 0.85, 2.45], [0.2, 0.55, 0], 2.0, 40, 6],
    [T.last, [0.95, 0.15, 1.0], [0.55, 0.12, 0.35], 0.62, 40, -5],          // close: the tomato
    [T.payoff, [2.3, 1.0, 3.0], [0.4, 0.75, 0.2], 3.0, 40, 0],
    [T.end, [1.2, 2.4, 4.0], [0.4, 0.7, 0.2], 3.6, 40, 0],                  // crane up
  ].map(([t0, p, q, w, f, dr, abs]) => [t0, shot(p, q, abs ? 2 * V(...p).distanceTo(V(...q)) * Math.tan(rad(f / 2)) * ASP : w, null, null, f), dr]);
  const GLIDE = 0.7;
  function camAt(t, Hs) {
    let Q, d, w, f = FOV, roll = 0;
    if (Hs) {
      ({ Q, d, w, f, roll } = hookCam(t, Hs));
      const shake = HK.flashes.reduce((a, ft) => a + Math.max(0, 1 - Math.abs(t - ft) / 0.25), 0) * 0.012;
      Q = Q.clone(); Q.x += Math.sin(t * 57) * shake; Q.y += Math.cos(t * 43) * shake;
    } else {
      let i = 0; while (i + 1 < VIEWS.length && VIEWS[i + 1][0] <= t) i++;
      const view = j => {   // a slow push-in and a slow drift round the pot over each view
        const [t0, S, dr] = VIEWS[j], t1 = j + 1 < VIEWS.length ? VIEWS[j + 1][0] : DUR, u = sm(k(t, t0, t1 + GLIDE));
        return { Q: S.Q.clone(), d: S.d.clone().applyAxisAngle(V(0, 1, 0), rad(dr) * u), w: S.w * (1 - 0.07 * u), f: S.f };
      };
      ({ Q, d, w, f } = view(i));
      if (i > 0 && t < VIEWS[i][0] + GLIDE) {
        const a = view(i - 1), e = eio(k(t, VIEWS[i][0], VIEWS[i][0] + GLIDE));
        Q = a.Q.lerp(Q, e); d = a.d.lerp(d, e).normalize(); w = lerp(a.w, w, e); f = lerp(a.f, f, e);
      }
      if (t > T.payoff + GLIDE && t < T.end) d.applyAxisAngle(V(0, 1, 0), -sm(k(t, T.payoff + GLIDE, T.end + 0.6)) * rad(45));   // payoff: a slow orbit
      let punch = 0;   // a small bump in on each new part
      for (const pt of [T.clay, T.inside, T.sand, T.pour, T.shade, T.cloth]) punch += Math.sin(Math.PI * clamp((t - pt + 0.05) / 0.9)) * 0.05;
      w *= 1 - punch;
      Q.x += Math.sin(t * 0.9) * 0.006; Q.y += Math.sin(t * 1.3 + 1) * 0.004;   // a gentle handheld drift
    }
    const P = Q.clone().add(d.clone().multiplyScalar(distFor(w, f)));
    if (P.y < 0.06) P.y = 0.06;
    cam.position.copy(P); cam.lookAt(Q); if (roll) cam.rotateZ(roll); cam.fov = f; cam.updateProjectionMatrix();
    POST.focus = P.distanceTo(Q); POST.aperture = Hs ? 0.7 : 0.35;
  }

  // ---------- state of the build at time t (ht: real time, for the hook's own moves)
  const sandLevel = t => lerp(SAND_MIN, SAND_MAX, eio(k(t, T.sand - 0.1, T.sandEnd)));
  function jugAt(t) {
    const win = [[T.waterL - 0.3, T.pour, T.waterEnd + 0.2], [T.refillL - 0.3, T.refill, T.refillEnd + 0.1]].find(([a, , p1]) => t >= a && t < p1 + 0.7);
    if (!win) return { vis: false, pour: 0 };
    const [a, p0, p1] = win, inK = eout(k(t, a, p0 - 0.3)), outK = eio(k(t, p1, p1 + 0.6));
    return { vis: true, off: V(0.7, 0.35, 0).multiplyScalar(1 - inK).add(V(0.7, 0.45, 0).multiplyScalar(outK)),
      tilt: 1.15 * eio(k(t, p0 - 0.45, p0)) * (1 - eio(k(t, p1 - 0.1, p1 + 0.35))),
      pour: sm(k(t, p0 - 0.05, p0 + 0.15)) * (1 - sm(k(t, p1 - 0.1, p1 + 0.15))), grow: k(t, p0 - 0.05, p0 + 0.2) };
  }
  function build(t, ht, Hs) {
    // pots: the big one drops on "clay", the small one is lowered in on "inside"
    const bp = k(t, T.clay - 0.55, T.clay + 0.15);
    bigPot.visible = t >= T.clay - 0.55; bigPot.position.y = (1 - bounce(bp)) * 1.2;
    const spk = eout(k(t, T.inside - 0.5, T.inside + 0.35));
    smallPot.visible = food.visible = t >= T.inside - 0.5; smallPot.position.y = food.position.y = (1 - spk) * 0.85;
    // the cut: a slicing wipe on "gap", undone at the end; none in the hook
    let c = 100;
    if (!Hs) {
      if (t >= T.gap - 0.35 && t < T.end + 0.9) c = lerp(0.6, 0, eio(k(t, T.gap - 0.35, T.gap + 0.35)));
      if (t >= T.end) c = lerp(0, 0.6, eio(k(t, T.end + 0.2, T.end + 0.9))), c = t >= T.end + 0.9 ? 100 : c;
    }
    cutPlane.constant = c;
    const capsOn = c < 0.004;
    bigPot.userData.caps.visible = smallPot.userData.caps.visible = capsOn;
    // sand fills the gap
    const L = sandLevel(t);
    sandPlane.constant = L;
    sandBody.visible = sandTop.visible = L > SAND_MIN + 0.004; sandCaps.visible = sandBody.visible && capsOn;
    if (sandTop.visible) setSandTop(L);
    // the jug
    const J = jugAt(t);
    jug.visible = J.vis; stream.visible = J.vis && J.pour > 0.01;
    if (J.vis) { jug.position.copy(SPOUT).add(J.off); jug.rotation.set(0, 0, -J.tilt); }
    if (stream.visible) { stream.geometry.setDrawRange(0, Math.ceil(clamp(J.grow) * 40) * 8 * 6); M.water.opacity = 0.45 * J.pour; }
    // shade: posts rise, the reed roof drops on "shade"
    posts.forEach((p, i) => { const r = eout(k(t, T.shade - 0.55 + i * 0.07, T.shade - 0.05 + i * 0.07)); p.visible = r > 0.001; p.scale.y = Math.max(0.001, r); p.position.y = SHY / 2 * r; });
    const rp = k(t, T.shade - 0.1, T.shade + 0.6); roof.visible = t >= T.shade - 0.1; roof.position.copy(roofBase); roof.position.y += (1 - bounce(rp)) * 1.4;
    // cloth: drops and drapes on "cloth"; in the hook it whips off
    let cy = 0, cm = 1, cvis = t >= T.cloth - 0.5, crx = 0, cx = 0;
    if (!Hs || !Hs.reveal) { const cp = k(t, T.cloth - 0.5, T.cloth + 0.4); cy = (1 - eout(cp)) * 0.6; cm = eio(k(t, T.cloth - 0.1, T.cloth + 0.5)); }
    else { const w = eio(k(ht, Hs.reveal - 0.05, Hs.reveal + 0.55)); cy = w * 0.45; cx = -w * 0.9; crx = -w * 0.8; cm = 1 - w; cvis = w < 0.7; }
    cloth.visible = cvis; cloth.position.set(cx, cy, 0); cloth.rotation.set(0, 0, -crx); cloth.morphTargetInfluences[0] = cm;
    // rotten tomato + plate: shown in the "rot" and "last" lines
    const rotOn = (t >= T.rot - 0.3 && t < T.potL + 0.6) || (t >= T.last - 0.2 && t < T.payoff + 0.3);
    plate.visible = rotG.visible = rotOn;
    const rk = Hs && Hs.rk != null ? Hs.rk : t < T.potL + 1 ? eio(k(t, T.tomatoes - 0.1, T.days + 0.5)) : 1;
    rotG.userData.body.morphTargetInfluences[0] = rk;
    M.rotten.color.set(0xd8261a).lerp(new THREE.Color(0x4a2c14), rk * 0.85); M.rotten.roughness = 0.35 + 0.5 * rk;
    rotG.position.y = 0.06 - 0.012 * rk;
    poseWorker(t, Hs, J);
    flies.forEach((f, i) => { const a = t * (5 + i * 1.7) + i * 2, rr = 0.07 + 0.03 * Math.sin(t * 3 + i);
      f.visible = rotOn && rk > 0.4; f.position.set(PLATE.x + Math.cos(a) * rr, 0.13 + 0.03 * Math.sin(t * 7 + i * 3), PLATE.z + Math.sin(a) * rr); f.rotation.y = -a; });
  }

  // what the worker's hands do at time t: [weight, left target, right target, lean, look-at]
  function poseWorker(t, Hs, J) {
    worker.visible = false;   // the user did not like the character: it stays out of the film
    sack.visible = false;
    if (!worker.visible) return;
    worker.position.set(WK.x, 0, WK.z); worker.rotation.y = -Math.PI / 2 - 0.35;   // faces the pot (-x), turned a little toward the camera side
    const win = (a, b, f = 0.3) => sm(k(t, a - f, a)) * (1 - sm(k(t, b, b + f)));
    let w = 0, L = null, Rr = null, lean = 0, look = V(0, 0.45, 0);
    const set = (ww, l, r, ln) => { if (ww > w) { w = ww; L = l; Rr = r; lean = ln * ww; } };
    // the big pot: set down on "clay"; the small pot: lowered in on "inside"
    const by = bigPot.position.y, sy = smallPot.position.y;
    set(win(T.clay - 0.55, T.clay + 0.25), V(0.2, by + 0.5, -0.24), V(0.26, by + 0.5, 0.2), 0.45);
    set(win(T.inside - 0.5, T.inside + 0.4), V(0.12, sy + 0.6, -0.16), V(0.16, sy + 0.6, 0.15), 0.4);
    // sand: tips a sack over the gap
    const sk = win(T.sand - 0.35, T.sandEnd - 0.2);
    if (sk > 0.01) { sack.visible = true; const tip = eio(k(t, T.sand - 0.3, T.sand + 0.2));
      sack.position.set(0.32, 1.02 + 0.08 * Math.sin(t * 3), -0.02); sack.rotation.set(0, 0, 0.3 + 0.9 * tip);
      set(sk, V(0.22, 1.05, -0.12), V(0.46, 1.0, 0.1), 0.15); look = V(0.2, 0.55, 0); }
    // water: holds the jug (handle and belly)
    if (J && J.vis) { const jp = jug.position, tl = jug.rotation.z;
      const hR = V(0.3, 0.02, 0.04).applyAxisAngle(V(0, 0, 1), tl).add(jp), hL = V(0.14, -0.14, -0.08).applyAxisAngle(V(0, 0, 1), tl).add(jp);
      set(1, hL, hR, 0.25); look = V(0.05, 0.6, 0); }
    // shade: pushes the reed roof up into place
    set(win(T.shade - 0.25, T.shade + 0.7), V(0.62, roof.position.y - 0.02, -0.25), V(0.66, roof.position.y - 0.02, 0.2), -0.05);
    if (t > T.shade - 0.25 && t < T.shade + 1) look = V(0.6, 1.8, 0);
    // cloth: lays it over the top
    set(win(T.cloth - 0.6, T.cloth + 0.45), V(0.1, cloth.position.y + 0.66, -0.2), V(0.14, cloth.position.y + 0.66, 0.2), 0.4);
    // evening: wipes his brow in the heat
    const br = win(T.dries - 0.2, T.dries + 1.0);
    if (br > 0.01) { const hp = head.getWorldPosition(V()); set(br, null, hp.clone().add(V(-0.08, 0.2, 0.02 * Math.sin(t * 9))), -0.05); }
    // end: thumbs up (right hand up by the shoulder)
    set(win(T.end - 0.1, DUR + 1), null, V(WK.x - 0.25, 1.45, WK.z + 0.25), -0.05);
    torso.rotation.x = lean + 0.02 * Math.sin(t * 1.7);   // breathing
    hips.position.y = 0.8 - 0.08 * Math.max(0, lean) + 0.004 * Math.sin(t * 1.7);
    legs.forEach((lg, i) => { lg.rotation.x = -0.5 * Math.max(0, lean) * (i ? 1 : 0.8); });
    worker.updateMatrixWorld(true);
    reach(arms[0], L || V(), L ? w : 0); reach(arms[1], Rr || V(), Rr ? w : 0);
    // the head looks at the work
    const hp = head.getWorldPosition(V()), lk = torso.worldToLocal(look.clone()).sub(head.position);
    head.rotation.set(clamp(-Math.atan2(lk.y, Math.hypot(lk.x, lk.z)), -0.7, 0.6), clamp(Math.atan2(lk.x, lk.z), -1, 1), 0);
  }

  // ---------- light, sky, wetness at time t
  function environment(t, sunTurn = 0) {
    const eveK = sm(k(t, T.eve - 0.7, T.eve + 0.4)) * (1 - sm(k(t, T.refill - 0.6, T.refill + 0.3)));
    const dir = SUN0.clone().lerp(SUNE, eveK).normalize().applyAxisAngle(V(0, 1, 0), sunTurn);
    skyU.sunDir.value.copy(dir); sun.position.copy(dir).multiplyScalar(12).add(sun.target.position);
    sun.color.set(0xfff0d6).lerp(new THREE.Color(0xff9a4a), eveK);
    sun.intensity = 3.3 * (1 - 0.35 * eveK);
    hemi.intensity = 0.6 * (1 - 0.4 * eveK);
    skyU.top.value.copy(SKY.top).lerp(SKY.eTop, eveK); skyU.hor.value.copy(SKY.hor).lerp(SKY.eHor, eveK);
    skyU.dim.value = 1 - 0.2 * eveK; scene.fog.color.copy(FOGC).lerp(new THREE.Color(0.9, 0.45, 0.2), eveK * 0.6);
    if ('backgroundIntensity' in scene) scene.backgroundIntensity = 1 - 0.45 * eveK;
    R.toneMappingExposure = 1.12 - 0.15 * eveK;
    // sun line: harsh direct sun, before the shade exists
    const sunK = sm(k(t, T.sunL, T.sun + 0.4)) * (1 - sm(k(t, T.shade, T.shade + 0.8)));
    // sand wetness: soaked from the top down by the pour; dries in the evening; refilled
    const pourWet = eio(k(t, T.pour, T.soaked + 0.6)), dryK = sm(k(t, T.dries - 0.4, T.dries + 0.8)) * (1 - sm(k(t, T.refill, T.refill + 1.4)));
    const L = sandLevel(t);
    sandWet.hi.value = L + 0.05; sandWet.lo.value = lerp(L + 0.02, SAND_MIN - 0.05, pourWet); sandWet.amt.value = (t >= T.pour ? 1 : 0) * (1 - 0.8 * dryK);
    // the outside of the big pot: water seeps through from the bottom up; the sun dries it; evening dries it
    const seepK = eio(k(t, T.seep - 0.2, T.seepEnd));
    potWet.lo.value = -1; potWet.hi.value = lerp(0.0, 0.64, seepK);
    potWet.amt.value = (t >= T.seep - 0.2 ? 1 : 0) * (1 - 0.55 * sunK) * (1 - 0.65 * dryK);
    // evaporation strength and how cold the inside is
    const evapK = sm(k(t, T.evap - 0.4, T.evap + 0.6)) * potWet.amt.value * seepK;
    const coolK = sm(k(t, T.evap, T.colder + 1.2)) * (1 - 0.6 * sunK) * (1 - 0.5 * dryK);
    coldGlow.intensity = 0.35 * coolK * (cutPlane.constant < 1 ? 1 : 0.4);
    return { eveK, sunK, dryK, evapK, coolK, L };
  }

  // ---------- particles at time t
  function particles(t, env, ht, Hs) {
    // beads on the wet outside wall, some sliding down
    const bOn = potWet.amt.value;
    for (let i = 0; i < NBEAD; i++) {
      const ph = hash(i + 900) * 6.2832, y0 = 0.07 + hash(i + 901) * 0.5, slide = hash(i + 902) > 0.75 ? ((t * (0.05 + hash(i) * 0.05) + hash(i + 903)) % 1) * 0.1 : 0;
      const y = y0 - slide, r = bigOut(y) + 0.003, s = (0.0035 + hash(i + 904) * 0.005) * bOn * (y < potWet.hi.value - 0.02 ? 1 : 0) * (bigPot.visible && bigPot.position.y < 0.01 ? 1 : 0);
      tmpQ.identity(); tmpM.compose(V(Math.sin(ph) * r, y, Math.cos(ph) * r), tmpQ, tmpS.set(s * 0.8, s * (1 + slide * 6), s * 0.8)); beads.setMatrixAt(i, tmpM);
    }
    beads.instanceMatrix.needsUpdate = true;
    // sand pouring into the gap (sweeping round the ring)
    const sp = sm(k(t, T.sand - 0.35, T.sand)) * (1 - sm(k(t, T.sandEnd - 0.5, T.sandEnd - 0.1)));
    if (sp > 0.01) for (let i = 0; i < NSAND; i++) {
      const life = (t * 1.6 + hash(i + 100)) % 1, a = t * 3.2 - life * 0.6 + (hash(i + 101) - 0.5) * 0.35, top = 1.25;
      const y = top - life * life * (top - env.L), r = 0.27 + (hash(i + 102) - 0.5) * 0.03, s = (0.004 + hash(i + 103) * 0.004) * sp;
      tmpQ.identity(); tmpM.compose(V(Math.sin(a) * r, y, Math.cos(a) * r), tmpQ, tmpS.setScalar(y > env.L ? s : 0)); sandGrains.setMatrixAt(i, tmpM);
    } else hide(sandGrains, 0, NSAND);
    sandGrains.instanceMatrix.needsUpdate = true;
    // water stream streaks + splash
    const J = jugAt(t);
    const UP = V(0, 1, 0);
    for (let i = 0; i < NSTR; i++) {
      const s = ((t * 2.2 + hash(i + 300)) % 1), p = streamAt(s, SAND_MAX), p2 = streamAt(Math.min(1, s + 0.06), SAND_MAX), d = p2.clone().sub(p), len = d.length();
      const on = J.pour * (s < J.grow ? 1 : 0);
      tmpQ.setFromUnitVectors(UP, d.normalize()); tmpM.compose(p.add(p2).multiplyScalar(0.5).add(V((hash(i) - 0.5) * 0.006, 0, (hash(i + 1) - 0.5) * 0.006)), tmpQ, tmpS.set(on, len * on + 1e-4, on)); streaks.setMatrixAt(i, tmpM);
    }
    streaks.instanceMatrix.needsUpdate = true;
    const land = streamAt(1, SAND_MAX);
    for (let i = 0; i < NSPL; i++) {
      const L = ((t * 3 + hash(i + 400)) % 1) * 0.22, a = hash(i + 401) * 6.283, out = 0.12 + hash(i + 402) * 0.25, up = 0.35 + hash(i + 403) * 0.6;
      const y = SAND_MAX + up * L - 0.5 * GRAV * L * L, s = y > SAND_MAX ? (0.002 + hash(i + 404) * 0.003) * J.pour * (J.grow >= 1 ? 1 : 0) : 0;
      tmpQ.identity(); tmpM.compose(V(land.x + Math.cos(a) * out * L, y, land.z + Math.sin(a) * out * L), tmpQ, tmpS.setScalar(s)); splash.setMatrixAt(i, tmpM);
    }
    splash.instanceMatrix.needsUpdate = true;
    // heat flowing out across the cut: from the food, through the wet sand, out of the wall
    const hOn = env.evapK * (cutPlane.constant < 0.01 ? 1 : 0) * (1 - sm(k(t, T.sunL, T.sunL + 0.3)) * (1 - sm(k(t, T.payoff, T.payoff + 0.5))));
    for (let i = 0; i < NHEAT; i++) {
      const life = (t * (0.32 + hash(i + 500) * 0.15) + hash(i + 501)) % 1, side = i % 2 ? 1 : -1, y = 0.13 + hash(i + 502) * 0.38;
      const x = side * lerp(0.08, bigOut(y) + 0.05, life), s = 0.0065 * hOn * Math.sin(Math.PI * Math.min(1, life * 1.15));
      tmpQ.identity(); tmpM.compose(V(x, y + Math.sin(life * 9 + i) * 0.006, 0.014), tmpQ, tmpS.setScalar(Math.max(0, s))); heatDots.setMatrixAt(i, tmpM);
      heatDots.setColorAt(i, tmpC.copy(hotC).lerp(new THREE.Color(0xffd27a), life));
    }
    heatDots.instanceMatrix.needsUpdate = true; if (heatDots.instanceColor) heatDots.instanceColor.needsUpdate = true;
    // wisps of vapour leaving the wet wall (drift with the wind)
    const wk = Hs ? (Hs.reveal ? 1 : Hs.kind === 'wide' ? 0.6 : 0) : env.evapK;
    wisps.forEach((s, i) => {
      const life = (t * (0.28 + hash(i + 600) * 0.12) + hash(i + 601)) % 1, ph = (hash(i + 602) - 0.5) * 3.6 + Math.PI, y0 = 0.12 + hash(i + 603) * 0.42;
      const r = bigOut(y0) + 0.02 + life * 0.1, y = y0 + life * 0.45;
      s.position.set(Math.sin(ph) * r - life * 0.15, y, Math.cos(ph) * r * (cutPlane.constant < 1 ? 1 : (hash(i + 604) > 0.5 ? 1 : -1)));
      s.scale.setScalar(0.14 + life * 0.26); s.material.opacity = wk * 0.13 * Math.sin(Math.PI * life); s.visible = wk > 0.01;
    });
    // heat shimmer: on the dry sand ("dry"), around the pot in the sun ("sun"), dropping in through the open top ("top")
    const dryH = sm(k(t, T.dry, T.dryHeat)) * (1 - sm(k(t, T.pour, T.pour + 0.6)));
    const topH = sm(k(t, T.top, T.drops)) * (1 - sm(k(t, T.cloth - 0.2, T.cloth + 0.3)));
    heatS.forEach((s, i) => {
      const life = (t * 0.6 + hash(i + 700)) % 1, a = hash(i + 701) * 6.283;
      let p, o = 0, sc = 0.2;
      if (Hs && !Hs.reveal) { const rot = Hs.kind === 'rot';
        p = rot ? V(PLATE.x + (hash(i + 702) - 0.5) * 0.5, 0.03 + life * 0.3, PLATE.z + (hash(i + 703) - 0.5) * 0.4) : V(0.3 + hash(i + 702) * 2.2, 0.05 + life * 0.6, 0.4 + hash(i + 703) * 1.8);
        o = rot ? 0.16 : 0.22; sc = rot ? 0.08 + life * 0.12 : 0.3 + life * 0.3; }
      else if (topH > 0.01 && i < 14) { p = V((hash(i + 702) - 0.5) * 0.3, 1.0 - life * 0.62, (hash(i + 703) - 0.5) * 0.3 - 0.05); o = topH * 0.4; sc = 0.12 + 0.08 * (1 - life); }
      else if (env.sunK > 0.01) { const y = 0.1 + life * 0.8; p = V(Math.sin(a) * 0.45, y, Math.cos(a) * 0.45); o = env.sunK * 0.3; sc = 0.25 + life * 0.25; }
      else if (dryH > 0.01) { p = V(Math.sin(a) * 0.27, env.L + life * 0.35, Math.cos(a) * 0.27 * (a > 1.6 && a < 4.7 ? 1 : -1)); o = dryH * 0.35; sc = 0.12 + life * 0.15; }
      s.visible = o > 0.005; if (p) { s.position.copy(p); s.scale.setScalar(sc); s.material.opacity = o * Math.sin(Math.PI * life); }
    });
    // the hook: cold mist pours over the rim and down the outside once the cloth is off
    const mk = Hs && Hs.reveal ? sm(k(ht, Hs.reveal + 0.1, Hs.reveal + 0.6)) : 0;
    mist.forEach((s, i) => {
      const life = (ht * (0.45 + hash(i + 800) * 0.2) + hash(i + 801)) % 1, ph = hash(i + 802) * 6.283, r = 0.24 + life * 0.18, y = 0.64 - life * life * 0.55 + (life < 0.2 ? 0.03 : 0);
      s.position.set(Math.sin(ph) * r, y, Math.cos(ph) * r); s.scale.setScalar(0.18 + life * 0.3); s.material.opacity = mk * 0.5 * Math.sin(Math.PI * life); s.visible = mk > 0.01;
    });
    // wind under the roof
    const wind = Math.max(sm(k(t, T.windW - 0.3, T.windW + 0.3)) * (1 - sm(k(t, T.top, T.top + 0.4))), sm(k(t, T.payoff, T.payoff + 0.6)) * (1 - sm(k(t, T.end + 0.5, T.end + 1))));
    windM.visible = wind > 0.01 && !Hs;
    for (let i = 0; i < 40; i++) {
      const life = (t * 0.9 + hash(i + 40)) % 1, len = 0.25 + hash(i) * 0.4;
      tmpQ.identity(); tmpM.compose(V(2.4 - life * 4.4, 0.15 + hash(i + 5) * 1.2, -0.8 + hash(i + 9) * 1.8), tmpQ, tmpS.set(len, 1, 1).multiplyScalar(Math.sin(Math.PI * life) * wind + 1e-4));
      windM.setMatrixAt(i, tmpM);
    }
    windM.instanceMatrix.needsUpdate = true;
  }

  // ---------- 2D on top: captions, labels, thermometers, day counter
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
  function project(p) { const v = p.clone().project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 }; }
  function label(t, text, p3, t0, t1, side = 1) {
    const a = eout(k(t, t0, t0 + 0.3)) * (1 - sm(k(t, t1 - 0.25, t1)));
    if (a <= 0) return; const p = project(p3); if (!p.ok) return;
    g.save(); g.globalAlpha = a; g.font = `58px ${FONT}`; const w = g.measureText(text).width + 52, h = 84;
    const lx = clamp(p.x + side * 120 - (side < 0 ? w : 0), 30, W - w - 30), ly = clamp(p.y - 220, 240, H - 400);
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(lx + (side < 0 ? w : 0), ly + h / 2); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(16,22,30,0.88)'; g.beginPath(); g.roundRect ? g.roundRect(lx, ly, w, h, 18) : g.rect(lx, ly, w, h); g.fill();
    g.strokeStyle = KEYC; g.lineWidth = 4; g.stroke();
    g.fillStyle = KEYC; g.textBaseline = 'middle'; g.fillText(text, lx + 26, ly + h / 2 + 3); g.restore();
  }
  function thermo(x, y, a, deg, name, hot) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(x, y);
    const rr = (X, Y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(X, Y, w, h, r) : g.rect(X, Y, w, h); g.fill(); };
    g.fillStyle = 'rgba(16,22,30,0.86)'; rr(-40, -110, 220, 690, 40);
    g.font = `52px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.fillText(name, 70, -40);
    g.fillStyle = '#e9edf2'; rr(40, 0, 60, 380, 30); g.beginPath(); g.arc(70, 420, 58, 0, 7); g.fill();
    const f = clamp((deg - 15) / 35), col = hot ? '#ff4b1f' : '#3aa0ff';
    g.fillStyle = col; g.beginPath(); g.arc(70, 420, 44, 0, 7); g.fill(); g.fillRect(56, 380 - 360 * f, 28, 360 * f + 20);
    g.font = `76px ${FONT}`; g.fillStyle = hot ? '#ff7a4a' : '#7cc4ff'; g.fillText(Math.round(deg) + '°C', 70, 555);
    g.restore();
  }
  const TEMPK = [[T.potL + 0.4, 40], [T.sand + 0.5, 39], [T.dryHeat, 43], [T.pour + 0.8, 38], [T.seep + 0.8, 35], [T.evap + 0.5, 31], [T.colder, 26],
    [T.sun + 0.3, 34], [T.shade + 0.6, 27], [T.drops, 31], [T.cloth + 0.4, 25], [T.dries + 0.3, 32], [T.refill + 0.8, 25]];
  const insideDeg = t => TEMPK.reduce((d, [kt, v]) => lerp(d, v, eio(k(t, kt - 0.3, kt + 0.6))), 40);
  function insideHud(t) {
    const a = eout(k(t, T.potL + 0.3, T.potL + 0.6)) * (1 - sm(k(t, T.payoff + 1.5, T.payoff + 1.9)));
    if (a <= 0) return;
    const d = insideDeg(t), dd = d - insideDeg(t - 0.7);
    thermo(W - 250, 300, a, d, 'INSIDE', d > 33);
    if (Math.abs(dd) > 0.8) {
      g.save(); g.globalAlpha = a * clamp((Math.abs(dd) - 0.8) / 1.5); g.font = `84px ${FONT}`; g.textAlign = 'center'; g.lineJoin = 'round';
      const txt = (dd > 0 ? '+' : '') + Math.round(dd) + '°'; g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText(txt, W - 360, 560);
      g.fillStyle = dd > 0 ? '#ff5a2a' : '#5ab8ff'; g.fillText(txt, W - 360, 560); g.restore();
      if (dd > 0) { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); gr.addColorStop(0, 'rgba(255,40,0,0)'); gr.addColorStop(1, `rgba(255,40,0,${Math.min(0.3, dd * 0.05)})`);
        g.save(); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
    }
  }
  function dayCounter(t, t0, t1, d0, d1, tEnd) {
    const a = eout(k(t, t0, t0 + 0.3)) * (1 - sm(k(t, tEnd - 0.3, tEnd))); if (a <= 0) return;
    const d = Math.round(lerp(d0, d1, eio(k(t, t0 + 0.3, t1)))), pop = 1 + 0.12 * Math.max(0, 1 - ((t * 6) % 1) * 3) * (t < t1 ? 1 : 0);
    g.save(); g.globalAlpha = a; g.translate(250, 330); g.scale(pop, pop); g.rotate(-0.04);
    g.font = `120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const w = g.measureText('DAY ' + d).width;
    g.fillStyle = '#ffd23f'; g.fillRect(-w / 2 - 30, -78, w + 60, 156); g.fillStyle = '#111'; g.fillText('DAY ' + d, 0, 6); g.restore();
  }

  // ---------- scenes on VideoHub's timeline
  window.VH_SCENES = [
    ['Hook', 0, HK.A1], ['Two pots', HK.A1, T.gapL], ['Air gap (cutaway)', T.gapL, T.sand - 0.3],
    ['Sand', T.sand - 0.3, T.waterL], ['Water + seep', T.waterL, T.cool], ['Evaporative cooling', T.cool, T.sunL],
    ['Sun + shade', T.sunL, T.top], ['Wet cloth', T.top, T.eveL], ['Evening + refill', T.eveL, T.fact],
    ['Fun fact', T.fact, T.last], ['Weeks fresh', T.last, T.payoff], ['Payoff', T.payoff, T.end], ['Ending', T.end, DUR],
  ].map(([name, t0, t1]) => ({ name, t0: +t0.toFixed(2), t1: +t1.toFixed(2) }));

  // ---------- finishing: sun flare, vignette, grain, flashes, the hook's stamps
  const vign = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const gr = x.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.16)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H); return c; })();
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), im = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = hash(i * 0.731) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); return c; })();
  function flare(amount) {
    if (amount <= 0.01) return;
    const s = project(cam.position.clone().addScaledVector(skyU.sunDir.value, 50)); if (!s.ok) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 560); gr.addColorStop(0, `rgba(255,236,200,${0.55 * amount})`); gr.addColorStop(0.25, `rgba(255,190,120,${0.18 * amount})`); gr.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    [[0.4, 60, '255,200,140'], [0.75, 34, '160,220,255'], [1.25, 90, '255,170,110'], [1.6, 24, '200,255,200']].forEach(([f, r, c]) => {
      const gx = s.x + (cx - s.x) * f * 2, gy = s.y + (cy - s.y) * f * 2, gg = g.createRadialGradient(gx, gy, 0, gx, gy, r);
      gg.addColorStop(0, `rgba(${c},${0.22 * amount})`); gg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gg; g.fillRect(gx - r, gy - r, r * 2, r * 2); });
    g.restore();
  }
  function stamp(t, text, hi, t0, t1, y) {
    const a = eout(k(t, t0, t0 + 0.18)) * (1 - sm(k(t, t1 - 0.12, t1))); if (a <= 0) return;
    const pop = 1 + 0.35 * (1 - eout(k(t, t0, t0 + 0.22)));
    g.save(); g.translate(W / 2, y); g.rotate(-0.045); g.scale(pop, pop); g.globalAlpha = a;
    g.font = `150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width;
    g.fillStyle = hi; g.fillRect(-w / 2 - 34, -88, w + 68, 176);
    g.fillStyle = '#111'; g.fillText(text, 0, 6); g.restore();
  }
  // a cold blue tint over the hook's mist shot; a warm haze in the sun
  function grade(t, env, Hs) {
    const cold = Hs && Hs.reveal ? 0.16 * sm(k(t, Hs.reveal, Hs.reveal + 0.4)) : 0;
    if (cold > 0) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = cold * 3; g.fillStyle = '#4aa8ff'; g.fillRect(0, 0, W, H); g.restore(); }
    const warm = 0.08 * env.sunK + 0.1 * env.eveK + (Hs && !Hs.reveal ? 0.06 : 0);
    if (warm > 0) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = warm * 3; g.fillStyle = '#ff9a3c'; g.fillRect(0, 0, W, H); g.restore(); }
  }
  const bloomC = document.createElement('canvas'); bloomC.width = 270; bloomC.height = 480; const bgc = bloomC.getContext('2d');
  function bloom(a) {
    bgc.filter = 'none'; bgc.clearRect(0, 0, 270, 480); bgc.filter = 'blur(7px) brightness(1.15) saturate(1.1)'; bgc.drawImage(glc, 0, 0, 270, 480); bgc.filter = 'none';
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.drawImage(bloomC, 0, 0, W, H); g.restore();
  }
  function tag(t, text, t0, t1) {
    const a = sm(k(t, t0, t0 + 0.2)) * (1 - sm(k(t, t1 - 0.15, t1))); if (a <= 0) return;
    g.save(); g.globalAlpha = a * 0.9; g.font = `44px ${FONT}`; const w = g.measureText(text).width + 36;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(40, 60, w, 64); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 58, 94); g.restore();
  }
  const STEPS = [
    [T.potL, T.gapL, 'STEP 1: TWO CLAY POTS', 0], [T.gapL, T.sand - 0.4, 'PROBLEM: EMPTY AIR GAP', 1], [T.sand - 0.4, T.dry, 'STEP 2: FILL WITH SAND', 0],
    [T.dry, T.waterL, 'PROBLEM: DRY SAND', 1], [T.waterL, T.cool, 'STEP 3: SOAK THE SAND', 0], [T.cool, T.sunL, 'HOW IT COOLS', 0],
    [T.sunL, T.shadeL, 'PROBLEM: DIRECT SUN', 1], [T.shadeL, T.top, 'STEP 4: SHADE ROOF', 0], [T.top, T.clothL, 'PROBLEM: HOT AIR FROM ABOVE', 1],
    [T.clothL, T.eveL, 'STEP 5: WET CLOTH', 0], [T.eveL, T.refillL, 'PROBLEM: SAND DRIES OUT', 1], [T.refillL, T.fact, 'STEP 6: REFILL TWICE A DAY', 0],
    [T.fact, T.payoff, 'RESULT: 10°C COOLER', 2], [T.payoff, DUR + 1, 'NO ELECTRICITY', 2],
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
  function finish(t, env, Hs) {
    const hook = !!Hs;
    const sunny = 0;
        flare(Math.max(Hs ? (Hs.reveal ? 0.15 : 0.6) : 0, env.sunK * 0.8, sunny) * (1 - 0.4 * env.eveK));
    grade(t, env, Hs);
    g.drawImage(vign, 0, 0);
    stepTag(t);
    const fl = HK.flashes.reduce((a, ft) => Math.max(a, 1 - Math.abs(t - ft) / 0.16), 0);
    if (fl > 0) { g.save(); g.globalAlpha = fl; g.fillStyle = '#fff6e6'; g.fillRect(0, 0, W, H); g.restore(); }
  }

  window.renderOut = function (t) {
    t = clamp(+t || 0, 0, DUR);
    const Hs = hookState(t), bt = Hs ? Hs.bt : t;   // the hooks show the rotting tomato or the finished fridge
    build(bt, t, Hs);
    const env = environment(bt, Hs && Hs.sunTurn || 0);
    particles(bt, env, t, Hs);
    camAt(t, Hs);
    POST.bloom = 0.3 + 0.25 * env.sunK; renderPost(scene, cam);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(glc, 0, 0, W, H);
    finish(t, env, Hs);
    label(t, 'AIR GAP', V(0.27, 0.42, 0.0), T.gap, T.gap + 1.7, 1);
    label(t, 'SAND', V(-0.27, 0.36, 0.0), T.sand + 0.3, T.sandEnd + 0.4, -1);
    label(t, 'WET CLAY', V(-0.345, 0.3, -0.05), T.seep + 0.3, T.seepEnd + 0.6, -1);
    label(t, 'HEAT OUT', V(0.3, 0.32, 0.014), T.evap, T.colder + 0.5, 1);
    label(t, 'EVAPORATIVE COOLING', V(0.33, 0.5, -0.12), T.name, T.name + 1.5, -1);
    label(t, 'SHADE ROOF', V(0.75, SHY + 0.05, 0.0), T.shade + 0.4, T.shade + 2.2, 1);
    label(t, 'WET CLOTH', V(0.12, 0.6, -0.1), T.cloth + 0.3, T.cloth + 1.8, 1);
    label(t, 'TWICE A DAY', V(0.26, SAND_MAX, -0.04), T.twice, T.refillEnd + 0.4, -1);
    // thermometers
    thermo(W - 250, 300, eout(k(t, T.rot + 0.2, T.rot + 0.5)) * (1 - sm(k(t, T.rotEnd + 0.1, T.rotEnd + 0.4))), lerp(32, 40, eout(k(t, T.rot + 0.3, T.rot + 1.3))), 'AIR', true);
    const fa = eout(k(t, T.fact + 0.5, T.fact + 0.9)) * (1 - sm(k(t, T.factEnd + 0.1, T.factEnd + 0.5)));
    thermo(90, 300, fa, 40, 'AIR', true);
    // (the running INSIDE thermometer was on screen all the time and is gone)
    // the hook: air temperature + the days
    if (Hs) {
      thermo(W - 250, 300, eout(k(t, 0.3, 0.6)) * (1 - sm(k(t, HK.uA - 0.15, HK.uA))), lerp(30, 45, eout(k(t, 0.3, 1.4))), 'AIR', true);
      dayCounter(t, HK.aTom - 0.3, HK.aDays + 0.2, 1, 2, HK.uA);
    }
    dayCounter(t, T.rot + 0.3, T.days + 0.2, 1, 2, T.rotEnd + 0.4);
    dayCounter(t, T.last + 0.3, T.weeks + 0.3, 2, 21, T.lastEnd + 0.4);
    captions(t);
  };

  (async () => {
    const font = new FontFace(FONT, 'url(fonts/Anton-Regular.ttf)'); await font.load(); document.fonts.add(font);
    await Promise.all(pending); await Promise.all(pending2);
    const pm = new THREE.PMREMGenerator(R);
    if (hdrTex) { scene.environment = pm.fromEquirectangular(hdrTex).texture; scene.background = hdrTex; }
    else { const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(sky.geometry, skyMat)); scene.environment = pm.fromScene(skyScene, 0.02).texture; scene.add(sky); }
    window.renderOut(0); window.renderOut(30);
    window.READY = true;
  })();
})();
