/* 3D-пространство окон: three.js r160 (локальная копия). Окна нарисованы в canvas-текстурах (wins.js).
   Устройства: корпус с толщиной и скруглённым ребром (ExtrudeGeometry), металлическая кромка (PBR), чёрная рамка с внутренней
   фаской, фронтальная камера, мягкий блик на стекле. Телефон, планшет, два монитора разной толщины; мессенджер и CRM остаются окнами.
   Вертикальный экран: сценарий «одна вещь на экран» (одно устройство крупно во всю ширину, смена по скроллу).
   Ловушки: цвета только через Color/setRGB, у PointLight нет нецелого decay (их тут и нет), pick(t) в wins.js защищён от NaN. */
import * as THREE from './vendor/three.module.js';

const MX = window.MX;
const MXW = window.MXW;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function sstep(a, b, v) { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }

/* Параметры устройств: pad рамка вокруг экрана, padB рамка снизу, rimW ширина металла, T толщина корпуса, bt скругление ребра */
const DEV = {
  window: { pad: 0.03, padB: 0.03, rad: 0.15, T: 0.05, bt: 0.014, rimW: 0.012, rim: '#6c7486', rough: 0.4, bez: '#0a0c10', cam: false },
  tablet: { pad: 0.115, padB: 0.115, rad: 0.24, T: 0.07, bt: 0.03, rimW: 0.016, rim: '#b3b9c6', rough: 0.3, bez: '#050609', cam: true },
  monitor: { pad: 0.075, padB: 0.2, rad: 0.12, T: 0.12, bt: 0.03, rimW: 0.014, rim: '#8d95a5', rough: 0.34, bez: '#050609', cam: true, back: true },
  slim: { pad: 0.055, padB: 0.15, rad: 0.09, T: 0.05, bt: 0.02, rimW: 0.012, rim: '#c9cdd6', rough: 0.28, bez: '#050609', cam: true },
  phone: { pad: 0.075, padB: 0.075, rad: 0.3, T: 0.09, bt: 0.042, rimW: 0.014, rim: '#a8aebb', rough: 0.26, bez: '#030407', cam: false, island: true, buttons: true }
};
const KIND = { chat: 'window', crm: 'window', inbox: 'tablet', agent: 'monitor', doc: 'slim', phone: 'phone' };

/* уступаем главному потоку между тяжёлыми шагами запуска (TBT): сборка среды, окон, первая отрисовка текстур, компиляция шейдеров */
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

async function boot() {
  /* сцена грузится позже первой отрисовки: если за это время включился запасной вид (таймаут, Save-Data), сцену не запускаем */
  if (MX.mode !== 'init') { return; }
  if (location.search.indexOf('no3d') >= 0) { MX.fallback(); return; }
  const cv = document.getElementById('stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!renderer.getContext()) { throw new Error('no context'); }
  } catch (e) { MX.fallback(); return; }

  const BG = new THREE.Color('#0b0d11');
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.FogExp2(BG, 0.04);

  /* мягкая студийная среда: излучающие панели (отражаются в металле кромок) */
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color('#0a0b10'), side: THREE.BackSide }));
  envScene.add(room);
  function panel(r, g, b, w, h, x, y, z, ry) {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    m.color.setRGB(r, g, b);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z); p.rotation.y = ry; envScene.add(p);
  }
  panel(8, 6, 3.4, 9, 5, 10, 7, 6, -0.9);
  panel(2.4, 3.2, 5, 8, 6, -12, 2, 3, 1.2);
  panel(5, 5, 5.4, 16, 1.4, 0, 9, -4, 0);
  panel(1.4, 2, 2.6, 12, 2.4, 0, -8, 8, 0);
  panel(3.2, 3.2, 3.6, 3, 14, 0, 0, 12, 0);
  await tick();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.04).texture;
  await tick();

  const key = new THREE.DirectionalLight(new THREE.Color('#ffe6c4'), 1.5);
  key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color('#9fb8ff'), 0.9);
  rim.position.set(-6, 2, 3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(new THREE.Color('#9db4d8'), new THREE.Color('#0b0d11'), 0.5));

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  const maxAni = renderer.capabilities.getMaxAnisotropy();
  let small = window.innerWidth < 700;
  let TS = 1.25;
  const isPortrait = function () { return window.innerWidth / window.innerHeight < 0.9; };

  /* ---------- устройства ---------- */
  function rrDraw(p, w, h, r, cx, cy) {
    const x = cx - w / 2, y = cy - h / 2;
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
    return p;
  }
  /* общие текстуры: блик на стекле и мягкая тень */
  function makeGlare() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const a = g.createLinearGradient(0, 0, 256, 256);
    a.addColorStop(0, 'rgba(255,255,255,0.13)'); a.addColorStop(0.28, 'rgba(255,255,255,0.05)'); a.addColorStop(0.31, 'rgba(255,255,255,0)');
    a.addColorStop(0.5, 'rgba(255,255,255,0)'); a.addColorStop(0.54, 'rgba(255,255,255,0.07)'); a.addColorStop(0.64, 'rgba(255,255,255,0.02)'); a.addColorStop(0.7, 'rgba(255,255,255,0)');
    g.fillStyle = a; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function makeBlob() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const a = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    a.addColorStop(0, 'rgba(0,0,0,0.6)'); a.addColorStop(0.55, 'rgba(0,0,0,0.22)'); a.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = a; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glareTex = makeGlare(), blobTex = makeBlob();

  function makeWin(d) {
    const sp = DEV[KIND[d.id] || 'window'];
    const g = new THREE.Group();
    const mats = [];
    function reg(m, base) { m.transparent = true; mats.push({ m: m, base: base == null ? 1 : base }); return m; }
    const geos = [];
    const sw = d.ww, sh = d.wh;
    const rs = Math.max(0.05, (d.id === 'phone' ? (d.W < 400 ? 44 : 54) / d.W : 22 / d.W) * d.ww);
    const outW = sw + 2 * sp.pad, outH = sh + sp.pad + sp.padB, oy = -(sp.padB - sp.pad) / 2;
    const bt = sp.bt, depth = sp.T - 2 * bt;
    /* корпус: металл, скруглённое ребро */
    const shrink = bt;
    const bodyShape = rrDraw(new THREE.Shape(), outW + 2 * sp.rimW - 2 * shrink, outH + 2 * sp.rimW - 2 * shrink, sp.rad + sp.rimW - shrink, 0, oy);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 6, curveSegments: 14 });
    const metal = reg(new THREE.MeshStandardMaterial({ color: new THREE.Color(sp.rim), metalness: 1, roughness: sp.rough, envMapIntensity: 1.5 }));
    const body = new THREE.Mesh(bodyGeo, metal);
    body.position.z = -0.012 - depth - bt;
    g.add(body); geos.push(bodyGeo);
    if (sp.back) {
      /* толстая спинка монитора, уже корпуса */
      const bs = rrDraw(new THREE.Shape(), outW * 0.8, outH * 0.74, sp.rad, 0, oy + 0.06);
      const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 10 });
      const back = new THREE.Mesh(bg, reg(new THREE.MeshStandardMaterial({ color: new THREE.Color('#2a2f3a'), metalness: 0.7, roughness: 0.5 })));
      back.position.z = body.position.z - 0.07 - 0.03;
      g.add(back); geos.push(bg);
    }
    /* рамка (bezel): чёрное стекло с отверстием под экран, внутренняя фаска ловит свет */
    const ringShape = rrDraw(new THREE.Shape(), outW - 0.01, outH - 0.01, sp.rad - 0.005, 0, oy);
    ringShape.holes.push(rrDraw(new THREE.Path(), sw + 0.012, sh + 0.012, rs, 0, 0));
    const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 14 });
    const ringMat = reg(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(sp.bez), metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }));
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = -0.007; g.add(ring); geos.push(ringGeo);
    /* экран с интерфейсом */
    const cvs = document.createElement('canvas');
    cvs.width = Math.round(d.W * TS); cvs.height = Math.round(d.H * TS);
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAni;
    const sm = reg(new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.02, toneMapped: false }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sm);
    screen.position.z = 0.0; g.add(screen); geos.push(screen.geometry);
    /* блик на стекле: мягкий диагональный градиент */
    const gm = reg(new THREE.MeshBasicMaterial({ map: glareTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 1);
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), gm);
    glare.position.z = 0.003; glare.renderOrder = 2; g.add(glare); geos.push(glare.geometry);
    /* камера и остальные детали */
    const black = new THREE.Color('#020306');
    if (sp.cam) {
      const cy = sh / 2 + sp.pad / 2;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), reg(new THREE.MeshBasicMaterial({ color: new THREE.Color('#161b28'), toneMapped: false })));
      lens.position.set(0, cy, 0.0125); g.add(lens); geos.push(lens.geometry);
      const lens2 = new THREE.Mesh(new THREE.CircleGeometry(0.018, 20), reg(new THREE.MeshBasicMaterial({ color: black, toneMapped: false })));
      lens2.position.set(0, cy, 0.0135); g.add(lens2); geos.push(lens2.geometry);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 12), reg(new THREE.MeshBasicMaterial({ color: new THREE.Color('#3b4e8c'), toneMapped: false })));
      gl.position.set(-0.005, cy + 0.005, 0.0145); g.add(gl); geos.push(gl.geometry);
    }
    if (sp.island) {
      const ig = new THREE.ShapeGeometry(rrDraw(new THREE.Shape(), 0.5, 0.15, 0.075, 0, sh / 2 - 0.2), 12);
      const isl = new THREE.Mesh(ig, reg(new THREE.MeshBasicMaterial({ color: black, toneMapped: false })));
      isl.position.z = 0.0045; g.add(isl); geos.push(ig);
      const lg = new THREE.CircleGeometry(0.03, 18);
      const lens = new THREE.Mesh(lg, reg(new THREE.MeshBasicMaterial({ color: new THREE.Color('#10172b'), toneMapped: false })));
      lens.position.set(0.15, sh / 2 - 0.2, 0.0055); g.add(lens); geos.push(lg);
    }
    if (sp.buttons) {
      const hw = outW / 2 + sp.rimW;
      [[-1, 0.5, 0.3], [-1, 0.05, 0.3], [1, 0.4, 0.46]].forEach(function (b) {
        const bg = new THREE.BoxGeometry(0.035, b[2], 0.05);
        const bm = new THREE.Mesh(bg, metal);
        bm.position.set(b[0] * (hw - 0.013), b[1], -0.012 - sp.T / 2); g.add(bm); geos.push(bg);
      });
    }
    if (sp.back) {
      /* логотип-полоска на подбородке монитора */
      const sg = new THREE.PlaneGeometry(0.34, 0.012);
      const strip = new THREE.Mesh(sg, reg(new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a4150'), toneMapped: false })));
      strip.position.set(0, -sh / 2 - sp.padB / 2, 0.0125); g.add(strip); geos.push(sg);
    }
    /* мягкая тень на фоне за устройством */
    const shg = new THREE.PlaneGeometry(outW * 1.35, outH * 1.35);
    const shd = new THREE.Mesh(shg, reg(new THREE.MeshBasicMaterial({ map: blobTex, depthWrite: false, toneMapped: false }), 0.9));
    shd.position.set(0.12, -0.2, -sp.T - 0.06); shd.renderOrder = -1; g.add(shd); geos.push(shg);

    g.position.set(d.pos[0], d.pos[1], d.pos[2]);
    g.rotation.y = d.ry;
    scene.add(g);
    return { d: d, g: g, cvs: cvs, tex: tex, mats: mats, geos: geos, last: -1e9 };
  }
  let wins = [];
  /* (пере)сборка окон: на вертикальном экране компактный макет, при смене ориентации окна строятся заново */
  let builtKey = null;
  function disposeWin(w) {
    scene.remove(w.g); w.tex.dispose();
    w.geos.forEach(function (x) { x.dispose(); });
    w.mats.forEach(function (x) { x.m.dispose(); });
  }
  function buildWins() {
    const compact = isPortrait();
    TS = compact ? 1.6 : Math.min(2, Math.max(1.6, (window.devicePixelRatio || 1) * 1.25));
    const k = compact + ':' + TS;
    if (builtKey === k && wins.length) { return false; }
    wins.forEach(disposeWin);
    builtKey = k;
    MXW.setMode(compact);
    wins = MXW.list.map(makeWin);
    return true;
  }
  buildWins();
  await tick();
  function paint(w, t) { MXW.paint(w.cvs, w.d, t, TS); w.tex.needsUpdate = true; }
  function paintAll(t) { wins.forEach(function (w) { paint(w, t); }); }

  /* ---------- траектория камеры (широкий экран) ---------- */
  const KEYS = [
    [[0.9, 0.3, 7.6], [0, 0, 0]],
    [[0, 0, 4.9], [0, 0, 0]],
    [[-0.9, 0.2, -0.9], [-3.4, 0.4, -3.2]],
    [[0, 0, -3.7], [0.4, -0.1, -7]],
    [[2.3, 0.3, -6.7], [4.6, 0.3, -9.6]],
    [[0.7, 0.1, -8.2], [0, 0, -13.5]],
    [[0, 0, -8.6], [0, 0, -13.5]],
    [[0.2, 0, -14.9], [0.1, -0.1, -18.2]],
    [[0.7, 0.3, -14.4], [0.1, -0.1, -18.2]]
  ];
  let mult = 0.78;
  const posC = new THREE.CatmullRomCurve3(KEYS.map(function (k) { return new THREE.Vector3(k[0][0], k[0][1], k[0][2]); }), false, 'catmullrom', 0.4);
  const lookC = new THREE.CatmullRomCurve3(KEYS.map(function (k) { return new THREE.Vector3(k[1][0], k[1][1], k[1][2]); }), false, 'catmullrom', 0.4);
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  function curve(p) { posC.getPoint(p, tmpP); lookC.getPoint(p, tmpL); }
  MX.pose = function (p) { curve(clamp(p, 0, 1)); return { x: tmpP.x, y: tmpP.y, z: tmpP.z }; };

  /* ---------- вертикальный экран: «одна вещь на экран» ----------
     Окна идут по порядку: мессенджер, входящие, агент, документ, CRM, телефон. Камера почти фронтальна к одному окну,
     окно занимает почти всю ширину (телефон: почти всю высоту свободной области), остальные скрыты; смена кадра по скроллу,
     между кадрами камера переезжает и окна плавно проявляются. Текст в текстурах рисуется в компактном макете 390 px с крупным кеглем. */
  const SWITCH = [0.19, 0.32, 0.45, 0.58, 0.8];
  const PW = 0.025;
  const topV = new THREE.Vector3();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), lA = new THREE.Vector3(), lB = new THREE.Vector3();
  let fitD = [];
  let W = 1, H = 1;
  function computeFit() {
    const asp = W / H, tv = Math.tan(camera.fov * Math.PI / 360), th = tv * asp;
    fitD = wins.map(function (w) {
      const d = w.d, sp = DEV[KIND[d.id] || 'window'];
      const ow = d.ww + 2 * (sp.pad + sp.rimW + 0.03), oh = d.wh + sp.pad + sp.padB + 0.08;
      const byW = ow / (0.94 * 2 * th), byH = oh / (0.76 * 2 * tv);
      return Math.max(byW, byH);
    });
  }
  function portraitFrame(p) {
    let f = 0, j;
    for (j = 0; j < SWITCH.length; j++) { f += sstep(SWITCH[j] - PW, SWITCH[j] + PW, p); }
    const i = Math.min(Math.floor(f), wins.length - 2), u = clamp(f - i, 0, 1);
    return { i: i, u: u };
  }
  function framePose(i, p, outP, outL) {
    const w = wins[i], d = w.d, s0 = i === 0 ? 0 : SWITCH[i - 1], s1 = i === wins.length - 1 ? 1 : SWITCH[i];
    const lp = clamp((p - s0) / (s1 - s0), 0, 1);
    const yaw = d.ry * 0.35 + 0.16 * (lp * 2 - 1);
    const D = fitD[i] || 8;
    outP.set(d.pos[0] + Math.sin(yaw) * D, d.pos[1] + 0.12, d.pos[2] + Math.cos(yaw) * D);
    outL.set(d.pos[0], d.pos[1], d.pos[2]);
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const asp = W / H, portrait = asp < 0.9;
    small = W < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = asp;
    camera.fov = portrait ? 52 : 40;
    mult = asp < 1.35 ? 0.66 : 0.78;
    scene.fog.density = portrait ? 0.012 : 0.04;
    camera.updateProjectionMatrix();
    if (wins.length) { computeFit(); }
  }
  resize();

  let cur = MX.p, px = 0, py = 0, tx = 0, ty = 0;
  /* параллакс от курсора только для мыши; на касании камеру ведёт скролл */
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') { return; }
    tx = (e.clientX / W - 0.5) * 2; ty = (e.clientY / H - 0.5) * 2;
  }, { passive: true });

  function setOpacity(w, o) {
    w.mats.forEach(function (x) { x.m.opacity = o * x.base; });
  }
  function applyCamera() {
    const p = clamp(cur, 0, 1), portrait = W / H < 0.9;
    const k = 1 - sstep(0, 0.11, p);
    if (portrait) {
      const fr = portraitFrame(p);
      framePose(fr.i, p, pA, lA); framePose(fr.i + 1, p, pB, lB);
      tmpP.copy(pA).lerp(pB, fr.u); tmpL.copy(lA).lerp(lB, fr.u);
      camera.position.copy(tmpP); camera.lookAt(tmpL);
      wins.forEach(function (w, idx) {
        const o = idx === fr.i ? 1 - fr.u : (idx === fr.i + 1 ? fr.u : 0);
        w.g.visible = o > 0.01;
        w.g.scale.setScalar(1 - 0.3 * k);
        w.g.rotation.y = w.d.ry * 0.35;
        setOpacity(w, o);
      });
      if (k > 0.001) {
        /* окно уходит вниз на 34% высоты; если подпись героя ниже, добавляем сдвиг, чтобы окно не наезжало на текст под кнопкой */
        camera.setViewOffset(W, H, 0, -H * 0.34 * k, W, H); camera.updateProjectionMatrix();
        const hb = MX.heroBottom || 0;
        if (hb > 0) {
          const w0 = wins[fr.u < 0.5 ? fr.i : fr.i + 1], sp0 = DEV[KIND[w0.d.id] || 'window'];
          camera.updateMatrixWorld(); w0.g.updateMatrixWorld(true);
          topV.set(0, w0.d.wh / 2 + sp0.pad + sp0.rimW, 0); w0.g.localToWorld(topV); topV.project(camera);
          const topPx = (1 - topV.y) / 2 * H, need = hb + 20;
          if (topPx < need) {
            camera.setViewOffset(W, H, 0, -(H * 0.34 * k + (need - topPx) * (1 - sstep(0.02, 0.08, p))), W, H);
          }
        }
      } else { camera.clearViewOffset(); }
      camera.updateProjectionMatrix();
      return;
    }
    curve(p);
    camera.position.copy(tmpP);
    camera.position.x += px * 0.18; camera.position.y -= py * 0.1;
    camera.lookAt(tmpL);
    if (k > 0.001) { camera.setViewOffset(W, H, -W * (W / H < 1.35 ? 0.1 : 0.24) * k, 0, W, H); } else { camera.clearViewOffset(); }
    camera.updateProjectionMatrix();
    /* прохождение сквозь окно: растворяем то, что рядом с камерой */
    wins.forEach(function (w) {
      const dist = camera.position.z - w.d.pos[2];
      const sc = 1 - (1 - mult) * sstep(0, 0.12, p);
      w.g.scale.setScalar(sc * (w.d.id === 'phone' ? 0.72 : 1));
      w.g.rotation.y = w.d.ry;
      let o = clamp(dist / 1.7, 0, 1);
      if (w.d.id !== 'chat') { o *= 0.12 + 0.88 * sstep(0.02, 0.13, p); }
      w.g.visible = o > 0.01 && dist < 30;
      setOpacity(w, o);
    });
  }

  let raf = 0, last = 0, onScreen = true, t0 = performance.now();
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    cur += (MX.p - cur) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(MX.p - cur) < 0.00005) { cur = MX.p; }
    px += (tx - px) * (1 - Math.exp(-dt * 2));
    py += (ty - py) * (1 - Math.exp(-dt * 2));
    applyCamera();
    const t = now - t0, portrait = W / H < 0.9;
    let painted = 0;
    wins.forEach(function (w) {
      const dist = camera.position.distanceTo(w.g.position);
      if (!MX.paused && w.g.visible && (portrait || dist < 12) && painted < (small ? 1 : 2) && now - w.last > (small ? 110 : 70)) { w.last = now; paint(w, t); painted++; }
    });
    renderer.render(scene, camera);
    if (onScreen && !document.hidden) { raf = requestAnimationFrame(frame); }
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function renderOnce() { cur = MX.p; applyCamera(); renderer.render(scene, camera); }

  /* изменение размера или ориентации: камера, рендерер, при смене макета окна строятся заново */
  let lastW = window.innerWidth, lastH = window.innerHeight, lastPortrait = isPortrait();
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  function onResize() {
    /* адресная строка телефона меняет только высоту: на касании такие события игнорируем (ни пересборки окон, ни рывка кадра) */
    const w = window.innerWidth, h = window.innerHeight, po = isPortrait();
    if (w === lastW && po === lastPortrait && (coarse ? Math.abs(h - lastH) < Math.max(160, lastH * 0.25) : h === lastH)) { return; }
    lastW = w; lastH = h; lastPortrait = po;
    resize();
    if (buildWins()) { computeFit(); paintAll(MX.reduce ? MXW.FIN : (performance.now() - t0)); }
    if (MX.reduce) { renderOnce(); } else { kick(); }
  }
  /* смена языка: шрифт под алфавит, перерисовка текстур, сценарии окон начинаются сначала */
  function onLang() {
    const L = window.MFI18N;
    const sample = L.t('sc.1.c1') + L.t('sc.1.a1') + L.t('crm.c3');
    const redo = function () { t0 = performance.now(); paintAll(MX.reduce ? MXW.FIN : 4000); if (MX.reduce) { renderOnce(); } else { kick(); } };
    redo();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('500 16px Manrope', sample), document.fonts.load('700 16px Manrope', sample), document.fonts.load('500 13px "JetBrains Mono"', sample)]).then(redo, function () {});
    }
  }

  computeFit();
  if (MX.reduce) {
    /* финальный осмысленный кадр, камера следует за скроллом без демпфирования */
    paintAll(MXW.FIN);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { paintAll(MXW.FIN); renderOnce(); }); }
    MX.onScroll = renderOnce;
    window.addEventListener('resize', onResize);
    renderOnce();
  } else {
    MX.onScroll = kick;
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { kick(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) { kick(); } }, { rootMargin: '100px' }).observe(document.getElementById('journey'));
    }
    for (const w of wins) { paint(w, 4000); await tick(); }
    if (renderer.compileAsync) { try { await renderer.compileAsync(scene, camera); } catch (e) { /* шейдеры скомпилируются при первом кадре */ } }
    if (MX.mode === 'fallback') { renderer.dispose(); return; }
    kick();
  }
  window.addEventListener('orientationchange', function () { window.setTimeout(onResize, 250); });
  window.MFI18N.onChange(onLang);
  MX.mode = 'webgl';
  MX.ready = true;
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); MX.mode = 'init'; MX.ready = false; MX.fallback(); });
}

boot().catch(function (err) { if (window.console) { console.warn('3D scene did not start, using the fallback', err); } MX.fallback(); });
