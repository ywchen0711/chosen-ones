// HD-2D: the field as a little lit diorama. Pixel-art tiles become a ground plane, walls and trees and mountains stand up in 3D,
// the people are pixel billboards that cast shadows, and the picture gets tilt-shift depth of field, bloom, a vignette and floating motes.
// The 2D canvas still draws every window and word on top. If WebGL is missing the game keeps its flat 2D look.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { tile } from './art.js';

const PITCH = 50 * Math.PI / 180, FOV = 30, DIST = 23;
const LEAN = PITCH * 0.45, STRETCH = 1 / Math.cos(PITCH - LEAN);     // billboards lean back a little and are stretched to look upright
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- little pictures made here
function pix(c) { const g = c.getContext('2d'); return { g, R: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, disc: (cx, cy, r, col) => { g.fillStyle = col; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) g.fillRect(cx + x, cy + y, 1, 1); } }; }
function treeCanvas(kind) {
  const c = mk(24, 32), { R, disc } = pix(c);
  if (kind === 'pine') {
    R(10, 24, 4, 8, '#2a1a10'); R(11, 24, 2, 8, '#6a4a2a');
    for (const [y, w] of [[4, 4], [9, 7], [14, 9], [19, 11]]) { R(12 - w - 1, y - 1, w * 2 + 2, 7, '#10301a'); R(12 - w, y, w * 2, 5, '#1e5a2a'); R(12 - w, y, w, 2, '#3a8a3a'); }
    R(11, 1, 2, 3, '#10301a');
    return c;
  }
  R(9, 21, 6, 11, '#2a1a10'); R(10, 21, 4, 11, '#6a4a2a'); R(10, 21, 1, 11, '#8a6a3a');
  for (const [x, y, r] of [[12, 11, 10], [5, 16, 6], [19, 16, 6]]) disc(x, y, r + 1, '#143a18');
  for (const [x, y, r] of [[12, 11, 10], [5, 16, 6], [19, 16, 6]]) disc(x, y, r, '#2a6a2a');
  disc(10, 9, 6, '#3a8a34'); disc(8, 7, 3, '#5aaa48'); R(7, 5, 2, 1, '#8ad070'); R(16, 13, 2, 1, '#4a9a3e'); R(14, 17, 3, 2, '#22582a');
  return c;
}
function glowCanvas(core, edge) {
  const c = mk(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, core); gr.addColorStop(0.35, edge); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c;
}
function chestCanvas(open) {
  const c = mk(16, 16), { R } = pix(c);
  R(1, 5, 14, 11, '#1a1424'); R(2, 6, 12, 9, '#8a4a1a'); R(2, 6, 12, 1, '#c8782a'); R(2, 10, 12, 1, '#5a2a10');
  if (open) { R(2, 2, 12, 4, '#1a1424'); R(3, 3, 10, 2, '#6a3a14'); R(3, 6, 10, 3, '#2a1408'); R(5, 6, 6, 2, '#ffd040'); }
  else { R(2, 6, 12, 3, '#b0602a'); R(7, 8, 2, 3, '#ffd040'); R(2, 12, 12, 1, '#ffd040'); }
  return c;
}
const specks = new Map();
function speckCanvas(base, dark, light) {
  const k = base + dark + light; if (specks.has(k)) return specks.get(k);
  const c = mk(16, 16), { R } = pix(c); R(0, 0, 16, 16, base);
  for (let i = 0; i < 26; i++) R(Math.floor(hash(i, 3) * 16), Math.floor(hash(i, 7) * 16), 1, 1, i % 3 ? dark : light);
  specks.set(k, c); return c;
}
const TOPS = { town: ['#a8a296', '#8a8478', '#c4beb2'], castle: ['#8a8a98', '#6a6a78', '#a8a8b8'], cave: ['#3a2c1e', '#2a2014', '#5a4630'], tower: ['#5a4a5a', '#463a46', '#7a6a7a'],
  dark: ['#2a1a36', '#1a0e24', '#4a2a5a'], shrine: ['#9aaad0', '#7a8ab0', '#c0d0f0'] };

// ---------------------------------------------------------------- look of each kind of place
const LOOK = {
  world:  { sky: '#9ec8f0', fogN: 30, fogF: 52, sun: 2.9, sunCol: '#fff2dc', amb: 1.25, sky2: '#bcd8ff', gnd: '#6a7a4a', dark: false, sat: 0.94, mote: '#fff6c0', motes: 70, tint: [1.03, 1.0, 0.95] },
  town:   { sky: '#a8c8e0', fogN: 28, fogF: 50, sun: 2.8, sunCol: '#ffe8c8', amb: 1.3, sky2: '#cfe0ff', gnd: '#7a6a4a', dark: false, sat: 1.02, mote: '#fff0b0', motes: 90, tint: [1.05, 1.0, 0.93] },
  castle: { sky: '#3a3440', fogN: 27, fogF: 48, sun: 1.7, sunCol: '#ffe0b0', amb: 1.15, sky2: '#c8c0d8', gnd: '#5a4a3a', dark: false, mote: '#ffe8a0', motes: 60, tint: [1.06, 0.99, 0.92], torches: true },
  cave:   { sky: '#000000', fogN: 22, fogF: 38, sun: 0.35, sunCol: '#8aa0ff', amb: 0.5, sky2: '#4a5a8a', gnd: '#2a1a10', dark: true, mote: '#ffc070', motes: 60, tint: [1.04, 0.98, 0.9], torches: true },
  tower:  { sky: '#000000', fogN: 22, fogF: 38, sun: 0.45, sunCol: '#b0a0ff', amb: 0.6, sky2: '#6a5a9a', gnd: '#2a2030', dark: true, mote: '#e0c0ff', motes: 60, tint: [1.0, 0.97, 1.03], torches: true },
  dark:   { sky: '#0a0412', fogN: 22, fogF: 38, sun: 0.6, sunCol: '#c080ff', amb: 1.0, sky2: '#9a6ac8', gnd: '#1a0a1a', dark: true, mote: '#ff6ad0', motes: 80, tint: [1.05, 0.92, 1.05], torches: true, torchCol: '#ff4a3a' },
  shrine: { sky: '#dfe8ff', fogN: 26, fogF: 46, sun: 2.4, sunCol: '#f0f4ff', amb: 1.6, sky2: '#ffffff', gnd: '#8a90b0', dark: false, mote: '#ffffff', motes: 110, tint: [0.98, 1.0, 1.06] },
};

// ---------------------------------------------------------------- post effects
const DOF = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.5 }, nearW: { value: 0.36 }, farW: { value: 0.3 }, maxR: { value: 6 }, all: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform float focus, nearW, farW, maxR, all; varying vec2 vUv;
    void main(){
      float d = vUv.y - focus;
      float a = d > 0.0 ? smoothstep(farW * 0.3, farW, d) : smoothstep(nearW * 0.3, nearW, -d);
      float r = max(a, all) * maxR;
      vec4 c = vec4(0.0); float ws = 0.0;
      for (int i = -6; i <= 6; i++) { float f = float(i); float w = exp(-f * f / 14.0); c += texture2D(tDiffuse, vUv + dir * f * r / 6.0) * w; ws += w; }
      gl_FragColor = c / ws;
    }`,
};
const GRADE = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.42 }, sat: { value: 1.12 }, contrast: { value: 1.08 }, dark: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: DOF.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat, contrast, dark; uniform vec3 tint; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      c = max(vec3(0.0), (c - 0.18) * contrast + 0.18) * tint;
      vec2 v = vUv - 0.5; c *= 1.0 - vig * dot(v, v) * 2.4;
      gl_FragColor = vec4(c * (1.0 - dark), 1.0);
    }`,
};

// ---------------------------------------------------------------- the renderer
export function create(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, 256 / 240, 1, 120);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 240), 0.5, 0.55, 0.78); composer.addPass(bloom);
  const dofH = new ShaderPass(DOF), dofV = new ShaderPass(DOF); dofV.uniforms.dir.value.set(0, 1);
  composer.addPass(dofH); composer.addPass(dofV);
  const grade = new ShaderPass(GRADE); composer.addPass(grade);
  composer.addPass(new OutputPass());

  // lights that are always there (changing how many lights exist would recompile every material)
  const hemi = new THREE.HemisphereLight('#ffffff', '#555555', 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const lantern = new THREE.PointLight('#ffc070', 0, 11, 1.2); scene.add(lantern);
  const torchLights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight('#ff9a40', 0, 7, 1.6); scene.add(l); return l; });

  const texCache = new Map();
  const tex = (c, mip = true) => {
    let t = texCache.get(c); if (t) return t;
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    if (mip) { t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; } else { t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    texCache.set(c, t); return t;
  };
  const glowTex = { warm: tex(glowCanvas('rgba(255,250,220,1)', 'rgba(255,170,60,0.55)'), false), white: tex(glowCanvas('rgba(255,255,255,1)', 'rgba(200,220,255,0.4)'), false), red: tex(glowCanvas('rgba(255,230,220,1)', 'rgba(255,60,40,0.6)'), false) };
  const blobTex = tex(glowCanvas('rgba(0,0,0,0.75)', 'rgba(0,0,0,0.5)'), false);
  const chestImg = [chestCanvas(false), chestCanvas(true)];

  // billboards: bottom-centred planes that lean back toward the camera
  const boardGeo = new THREE.PlaneGeometry(1, 1); boardGeo.translate(0, 0.5, 0); boardGeo.scale(1, STRETCH, 1); boardGeo.rotateX(-LEAN);
  const blobGeo = new THREE.PlaneGeometry(1, 0.55); blobGeo.rotateX(-Math.PI / 2);

  let world = null;                    // everything built for the current map
  const own = [];                      // geometries, materials and textures to free when the map changes
  const keep = (x) => { own.push(x); return x; };
  const lambert = (o) => keep(new THREE.MeshLambertMaterial(o));

  function clear() {
    if (world) scene.remove(world.root);
    for (const x of own) x.dispose && x.dispose();
    own.length = 0; world = null;
  }

  // ---------------------------------------------------------------- building a map
  // info: { key, w, h, theme, kind, at(x, y) -> tile id or null, margin }
  function build(info) {
    clear(); cam = null;
    const wallMemo = {};
    const L = LOOK[info.kind] || LOOK.town, root = new THREE.Group(), M = info.margin;
    const x0 = -M, y0 = -M, W = info.w + 2 * M, H = info.h + 2 * M;
    const at = (x, y) => info.at(x, y);
    const FLAT = new Set(['grass', 'path', 'flowers', 'stone', 'wood', 'carpet', 'floor', 'sand', 'swamp', 'lava', 'bridge', 'sea', 'water', 'miasma', 'stairsup', 'stairsdown']);
    const floorNear = (x, y) => { for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [-1, 1]]) { const t = at(x + dx, y + dy); if (t && FLAT.has(t) && !t.startsWith('stairs')) return t; } return 'floor'; };
    const groundOf = (t, x, y) => {
      if (FLAT.has(t)) return t;
      if (['tree', 'forest', 'mountain', 'hills', 'rock', 'castle', 'town', 'village', 'cave', 'tower', 'shrine', 'grave', 'fence'].includes(t)) return 'grass';
      if (t === 'darkcastle') return 'miasma';
      if (t === 'wall' || t === 'cwall' || t === 'crack') return t;
      if (t === 'door') { const n = [at(x, y + 1), at(x, y - 1)].find((q) => q && FLAT.has(q)); return n || 'floor'; }
      return floorNear(x, y);
    };
    // in dungeons only the walls that face a walkable tile are built; the solid rock beyond is left to the dark (or the sky)
    const isWallT = (t) => t === 'wall' || t === 'cwall' || t === 'crack';
    const buried = (x, y) => info.dungeon && [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].every(([dx, dy]) => { const n = at(x + dx, y + dy); return !n || isWallT(n); });
    // the ground: two frames (water and lava ripple) plus a glow map for lava and miasma
    const ground = [0, 1].map(() => mk(W * 16, H * 16)), glow = mk(W * 16, H * 16), gg = glow.getContext('2d');
    gg.fillStyle = '#000'; gg.fillRect(0, 0, glow.width, glow.height);
    let anyGlow = false;
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + W; x++) {
      const t = at(x, y); if (t === null || (isWallT(t) && buried(x, y))) continue;
      const gid = groundOf(t, x, y), X = (x - x0) * 16, Y = (y - y0) * 16;
      ground.forEach((c, f) => c.getContext('2d').drawImage(tile(gid, info.theme, f), X, Y));
      if (gid === 'lava' || gid === 'miasma') { gg.globalAlpha = gid === 'lava' ? 1 : 0.55; gg.drawImage(tile(gid, info.theme, 0), X, Y); anyGlow = true; }
    }
    gg.globalAlpha = 1;
    // soft patches of light and shade so wide fields don't look printed
    if (!info.dungeon) for (const c of ground) {
      const g2 = c.getContext('2d');
      for (let i = 0; i < W * H / 5; i++) {
        const px = hash(i, 11) * c.width, py = hash(i, 13) * c.height, r = 24 + hash(i, 17) * 56, dark = hash(i, 19) < 0.55;
        const gr = g2.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, dark ? 'rgba(10,40,10,0.13)' : 'rgba(255,240,170,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g2.fillStyle = gr; g2.fillRect(px - r, py - r, 2 * r, 2 * r);
      }
    }
    const groundTex = ground.map((c) => keep(new THREE.CanvasTexture(c)));
    for (const t of groundTex) { t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; }
    const glowTx = keep(new THREE.CanvasTexture(glow)); glowTx.colorSpace = THREE.SRGBColorSpace; glowTx.magFilter = THREE.NearestFilter;
    const groundMat = lambert({ alphaTest: 0.5, map: groundTex[0], emissiveMap: anyGlow ? glowTx : null, emissive: anyGlow ? '#ffffff' : '#000000', emissiveIntensity: 1.3 });
    const gp = keep(new THREE.PlaneGeometry(W, H)); gp.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(gp, groundMat); groundMesh.position.set(x0 + W / 2, 0, y0 + H / 2); groundMesh.receiveShadow = true; root.add(groundMesh);

    // things that stand up
    const walls = {}, trees = [], pines = [], mountains = [], hills = [], rocks = [], torchSpots = [], glows = [];
    const PLACE = new Set(['castle', 'town', 'village', 'cave', 'tower', 'shrine', 'darkcastle']);
    let grow = 1, cx = 0, cy = 0;      // world-map places are drawn a bit bigger than their tile
    const add = (mesh, x, y, cast = true) => { if (grow !== 1) { x = cx + (x - cx) * grow; y = cy + (y - cy) * grow; mesh.scale.multiplyScalar(grow); mesh.position.multiplyScalar(grow); } mesh.position.x += x + 0.5; mesh.position.z += y + 0.5; mesh.castShadow = cast; mesh.receiveShadow = true; root.add(mesh); return mesh; };
    const box = (w, h, d, mat, y = 0) => { const g = keep(new THREE.BoxGeometry(w, h, d)); g.translate(0, y + h / 2, 0); return new THREE.Mesh(g, mat); };
    const cyl = (r1, r2, h, n, mat, y = 0) => { const g = keep(new THREE.CylinderGeometry(r1, r2, h, n)); g.translate(0, y + h / 2, 0); return new THREE.Mesh(g, mat); };
    const cone = (r, h, n, mat, y = 0, rot = 0) => { const g = keep(new THREE.ConeGeometry(r, h, n)); g.rotateY(rot); g.translate(0, y + h / 2, 0); return new THREE.Mesh(g, mat); };
    const C = {}; const col = (c, o = {}) => C[c + JSON.stringify(o)] || (C[c + JSON.stringify(o)] = lambert({ color: c, flatShading: true, ...o }));
    const glowMat = (c) => col(c, { emissive: c, emissiveIntensity: 2.2 });
    const wallH = info.dungeon ? 1.1 : 0.9;
    const isWall = (t) => t === 'wall' || t === 'cwall' || t === 'crack';
    // trees lean back and stand tall, so they hide the tiles just north of them: in towns and castles a tree right below open
    // ground (a road, a doorway, someone walking) is a low hedge, growing to full height five rows away
    const open = (t) => t && t !== 'tree' && t !== 'forest' && !isWall(t);
    const hedge = (x, y) => { if (info.kind === 'world') return 1; for (let k = 1; k <= 5; k++) if ([-1, 0, 1].some((d) => open(at(x + d, y - k)))) return [0.28, 0.4, 0.52, 0.66, 0.82][k - 1]; return 1; };
    // neighbours stand at clearly different depths: overlapping boards in one plane fought over every pixel and flickered
    const stagger = (x, y) => ((x * 7 + y * 3) % 4 + 4) % 4;
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + W; x++) {
      const t = at(x, y); if (!t || (isWallT(t) && buried(x, y))) continue;
      const r = hash(x, y); cx = x; cy = y; grow = PLACE.has(t) ? 1.55 : 1;
      switch (t) {
        case 'wall': case 'cwall': case 'crack': (walls[t] = walls[t] || []).push([x, y]);
          if ((L.torches || info.dungeon) && FLAT.has(at(x, y + 1) || '') && !isWall(at(x, y + 1)) && r < 0.22 && !torchSpots.some((s) => Math.abs(s[0] - x) + Math.abs(s[1] - y) < 4)) torchSpots.push([x, y]);
          break;
        case 'tree': (r < 0.25 && !info.town ? pines : trees).push([x + 0.5 + (r - 0.5) * 0.2, y + 0.42 + stagger(x, y) * 0.07, 1.05 + r * 0.25, hedge(x, y)]); break;
        case 'forest': for (let k = 0; k < 3; k++) { const q = hash(x * 3 + k, y * 7 - k); (q < 0.4 ? pines : trees).push([x + 0.2 + ((k * 0.37 + q * 0.5) % 0.75), y + 0.25 + k * 0.28 + stagger(x, y) * 0.04, 0.62 + q * 0.18]); } break;
        case 'mountain': mountains.push([x + 0.5, y + 0.5, 0.9 + r * 0.35, r]); break;
        case 'hills': hills.push([x + 0.3, y + 0.35, 0.8], [x + 0.72, y + 0.75, 0.6]); break;
        case 'rock': rocks.push([x + 0.5, y + 0.5, 1]); break;
        case 'door': if (isWall(at(x - 1, y)) || isWall(at(x + 1, y))) add(box(1, wallH * 0.28, 1, wallMats(isWall(at(x - 1, y)) ? at(x - 1, y) : at(x + 1, y)), wallH * 0.72), x, y); break;
        // a stairwell cut into the wall behind: low walls either side, steps climbing to a dark archway (or the dark of the way down)
        case 'stairsup': case 'stairsdown': {
          const up = t === 'stairsup', back = at(x, y - 1), sides = wallMats(isWall(back) ? back : 'wall'), stone = col(up ? '#a89a82' : '#5e5448');
          const step = [stone, stone, stone, stone, col('#4a3e34'), col('#4a3e34')];
          if (up) for (let i = 0; i < 4; i++) add(box(0.74, 0.05 + i * 0.06, 0.25, step), x, y + 0.375 - i * 0.25);
          for (const s of [-1, 1]) add(box(0.12, up ? 0.5 : 0.3, 1, sides), x + s * 0.44, y);
          if (isWall(back)) { add(box(0.68, wallH * 0.8, 0.04, col('#07050a')), x, y - 0.48, false); add(box(0.84, 0.1, 0.08, stone, wallH * 0.8), x, y - 0.46, false); }
          break;
        }
        case 'counter': add(box(1, 0.5, 0.8, [col('#7a4a28'), col('#7a4a28'), col('#c89060'), col('#5a3a20'), col('#8a5a30'), col('#8a5a30')]), x, y); break;
        case 'table': { const m = add(box(0.86, 0.08, 0.7, col('#c89060'), 0.4), x, y); for (const [dx, dz] of [[-0.35, -0.28], [0.35, -0.28], [-0.35, 0.28], [0.35, 0.28]]) add(box(0.08, 0.4, 0.08, col('#5a3a20')), x + dx, y + dz); void m; break; }
        case 'bed': add(box(0.88, 0.3, 0.92, [col('#6a3a18'), col('#6a3a18'), keep(new THREE.MeshLambertMaterial({ map: tex(tile('bed', info.theme, 0)) })), col('#5a3a20'), col('#4a7ad8'), col('#6a3a18')]), x, y); add(box(0.88, 0.5, 0.08, col('#7a4a20')), x, y - 0.44); break;
        case 'barrel': add(cyl(0.3, 0.27, 0.62, 10, col('#9a6a3a')), x, y); add(cyl(0.31, 0.31, 0.05, 10, col('#4a2a14'), 0.12), x, y); add(cyl(0.31, 0.31, 0.05, 10, col('#4a2a14'), 0.46), x, y); break;
        case 'pillar': add(box(0.7, 0.14, 0.7, col('#b8b4a8')), x, y); add(cyl(0.24, 0.27, 1.5, 10, col('#e8e4d8', { flatShading: false })), x, y); add(box(0.66, 0.14, 0.66, col('#d0ccc0'), 1.5), x, y); break;
        case 'statue': add(box(0.62, 0.3, 0.62, col('#7a7a7a')), x, y); add(cyl(0.12, 0.18, 0.55, 8, col('#b8b8b8'), 0.3), x, y); add(cyl(0.13, 0.13, 0.22, 8, col('#c8c8c8'), 0.85), x, y); add(box(0.5, 0.08, 0.12, col('#b0b0b0'), 0.66), x, y); break;
        case 'grave': add(box(0.46, 0.62, 0.14, col('#9a9a9a')), x, y + 0.1); add(box(0.62, 0.08, 0.3, col('#6a6a6a')), x, y + 0.1); break;
        case 'fence': { const vert = at(x, y - 1) === 'fence' || at(x, y + 1) === 'fence', horiz = at(x - 1, y) === 'fence' || at(x + 1, y) === 'fence', v = vert && !horiz;
          for (const hgt of [0.22, 0.42]) add(box(v ? 0.07 : 1, 0.07, v ? 1 : 0.07, col('#c89060'), hgt), x, y);
          add(box(0.1, 0.55, 0.1, col('#8a5a30')), x, y); break; }
        case 'throne': add(box(0.8, 0.36, 0.66, col('#c8a030')), x, y); add(box(0.62, 0.08, 0.5, col('#d83a4a'), 0.36), x, y); add(box(0.8, 1.05, 0.14, col('#c8a030')), x, y - 0.28); add(box(0.56, 0.75, 0.04, col('#d83a4a'), 0.3), x, y - 0.2); break;
        case 'altar': add(box(0.9, 0.5, 0.62, col('#e8e8f0')), x, y); add(box(0.96, 0.08, 0.08, col('#d8b040'), 0.42), x, y + 0.3); add(new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.1)), glowMat('#ffd040')), x, y).position.y = 0.72; glows.push({ x: x + 0.5, y: 0.75, z: y + 0.5, tex: 'warm', s: 0.45, gem: true }); torchSpots.push([x, y, 'altar']); break;
        case 'castle': { const st = col('#d8d8e0'), roof = col('#3a5ad8');
          add(box(0.8, 0.42, 0.55, st), x, y); for (const s of [-1, 1]) { add(cyl(0.13, 0.15, 0.78, 8, st), x + s * 0.36, y - 0.05); add(cone(0.19, 0.3, 8, roof, 0.78), x + s * 0.36, y - 0.05); }
          add(box(0.3, 0.72, 0.3, col('#c8c8d4')), x, y - 0.12); add(cone(0.24, 0.32, 4, col('#d84a3a'), 0.72, Math.PI / 4), x, y - 0.12); add(box(0.18, 0.22, 0.04, col('#3a2a1a')), x, y + 0.27); break; }
        case 'town': for (const [dx, dz, rc] of [[-0.24, -0.18, '#d84a3a'], [0.22, -0.24, '#3a7ad8'], [0.08, 0.22, '#d8a03a']]) { add(box(0.3, 0.24, 0.3, col('#f0e0c0')), x + dx, y + dz); add(cone(0.26, 0.2, 4, col(rc), 0.24, Math.PI / 4), x + dx, y + dz); glows.push({ x: x + 0.5 + dx * grow, y: 0.12 * grow, z: y + 0.5 + (dz + 0.16) * grow, tex: 'warm', s: 0.18 }); } break;
        case 'village': for (const [dx, dz] of [[-0.2, -0.1], [0.24, 0.2]]) { add(box(0.28, 0.2, 0.28, col('#e0d0a8')), x + dx, y + dz); add(cone(0.24, 0.22, 4, col('#8a6a3a'), 0.2, Math.PI / 4), x + dx, y + dz); } trees.push([x + 0.75, y + 0.3, 0.55]); break;
        case 'cave': { const m = add(cyl(0.2, 0.5, 0.55, 7, col('#7a6a5a')), x, y); m.scale.set(1, 1, 0.8); add(box(0.24, 0.24, 0.04, col('#120a08'), 0), x, y + 0.36, false); break; }
        case 'tower': add(cyl(0.2, 0.24, 1.35, 10, col('#a8a0b8')), x, y); add(cyl(0.26, 0.26, 0.1, 10, col('#8a80a0'), 1.35), x, y); add(cone(0.24, 0.35, 10, col('#5a4a8a'), 1.45), x, y); add(box(0.08, 0.1, 0.02, glowMat('#ffd070'), 0.95), x, y + 0.22, false); break;
        case 'shrine': add(box(0.86, 0.1, 0.66, col('#e8eef8')), x, y); for (const [dx, dz] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) add(cyl(0.05, 0.05, 0.5, 6, col('#ffffff'), 0.1), x + dx, y + dz); add(cone(0.56, 0.32, 4, col('#7a9ae0'), 0.6, Math.PI / 4), x, y); glows.push({ x: x + 0.5, y: 0.35, z: y + 0.5, tex: 'white', s: 0.5 }); break;
        case 'darkcastle': { const st = col('#2a2236'), sp = col('#3a1a4a');
          add(box(0.82, 0.5, 0.56, st), x, y); for (const s of [-1, 1]) { add(cyl(0.12, 0.15, 1.0, 6, st), x + s * 0.38, y - 0.08); add(cone(0.16, 0.42, 6, sp, 1.0), x + s * 0.38, y - 0.08); }
          add(box(0.3, 0.95, 0.3, st), x, y - 0.14); add(cone(0.22, 0.55, 4, sp, 0.95, Math.PI / 4), x, y - 0.14);
          for (const [dx, hy] of [[-0.38, 0.7], [0.38, 0.7], [0, 0.65], [0, 0.18]]) add(box(0.07, 0.09, 0.02, glowMat('#ff3a2a'), hy), x + dx, y + (dx ? 0.08 : 0.02) + (hy < 0.3 ? 0.27 : 0), false);
          glows.push({ x: x + 0.5, y: 0.7 * grow, z: y + 0.4, tex: 'red', s: 1.4 * grow }); break; }
        default: break;
      }
    }
    function wallMats(t) {
      if (wallMemo[t]) return wallMemo[t];
      const side = tex(tile(t, info.theme, 0)), T = info.dungeon && L.dark ? ['#1c1822', '#121018', '#2c2634'] : TOPS[info.theme] || TOPS.town;
      const top = tex(speckCanvas(T[0], T[1], T[2]));
      const s = keep(new THREE.MeshLambertMaterial({ map: side })), tp = keep(new THREE.MeshLambertMaterial({ map: top }));
      return (wallMemo[t] = [s, s, tp, tp, s, s]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const instanced = (geo, mat, list, place, opts = {}) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => { place(p, v, q, sc); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
      im.castShadow = opts.cast !== false; im.receiveShadow = true;
      if (opts.depth) im.customDepthMaterial = opts.depth;
      root.add(im); return im;
    };
    for (const [t, list] of Object.entries(walls)) {
      const g = keep(new THREE.BoxGeometry(1, wallH, 1)); g.translate(0, wallH / 2, 0);
      instanced(g, wallMats(t), list, ([x, y], P, Q, S) => { P.set(x + 0.5, 0, y + 0.5); Q.identity(); S.set(1, 1, 1); });
    }
    const treeBoard = (img, w, h) => {
      const g = keep(new THREE.PlaneGeometry(w, h)); g.translate(0, h / 2, 0); g.scale(1, STRETCH, 1); g.rotateX(-LEAN);
      const t = tex(img), mat = lambert({ map: t, alphaTest: 0.5, side: THREE.DoubleSide });
      return [g, mat, keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 }))];
    };
    {
      const [g, m, d] = treeBoard(treeCanvas('round'), 1.5, 2);
      instanced(g, m, trees, ([x, y, s, h = 1], P, Q, S) => { P.set(x, 0, y); Q.identity(); S.set(s, s * h, s * h); }, { depth: d });
      const [g2, m2, d2] = treeBoard(treeCanvas('pine'), 1.3, 1.9);
      instanced(g2, m2, pines, ([x, y, s, h = 1], P, Q, S) => { P.set(x, 0, y); Q.identity(); S.set(s, s * h, s * h); }, { depth: d2 });
    }
    {
      const g = keep(new THREE.ConeGeometry(0.62, 1.2, 6)); g.translate(0, 0.6, 0);
      instanced(g, col('#8a7a68'), mountains, ([x, y, s, r], P, Q, S) => { P.set(x, 0, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 3); S.set(s, s, s); });
      const g2 = keep(new THREE.ConeGeometry(0.27, 0.5, 6)); g2.translate(0, 0.95, 0);
      instanced(g2, col('#f4f4ff'), mountains, ([x, y, s, r], P, Q, S) => { P.set(x, 0.02, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 3); S.set(s * 1.02, s, s * 1.02); });
      const g3 = keep(new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2));
      instanced(g3, col('#5e9a3a', { flatShading: false }), hills, ([x, y, s], P, Q, S) => { P.set(x, 0, y); Q.identity(); S.set(s * 0.9, s * 0.5, s * 0.8); });
      const g4 = keep(new THREE.DodecahedronGeometry(0.4)); g4.translate(0, 0.25, 0);
      instanced(g4, col('#8a8a8a'), rocks, ([x, y, s], P, Q, S) => { P.set(x, 0, y); Q.setFromEuler(new THREE.Euler(0.3, x, 0.2)); S.set(s, s * 0.8, s); });
    }
    // torches on dungeon walls (a flame that glows; the nearest few also light the room)
    const flames = [];
    for (const [x, y, kind] of torchSpots) {
      if (kind === 'altar') { flames.push({ x: x + 0.5, y: 1.6, z: y + 0.9, col: '#ffd070', sprite: null, power: 0.25 }); continue; }
      add(box(0.08, 0.22, 0.12, col('#3a2a1a'), wallH * 0.5), x, y + 0.53, false);
      const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: L.torchCol ? glowTex.red : glowTex.warm, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffffff' })));
      sp.position.set(x + 0.5, wallH * 0.5 + 0.32, y + 1.1); sp.scale.set(0.45, 0.6, 1); root.add(sp);
      flames.push({ x: x + 0.5, y: wallH * 0.5 + 0.4, z: y + 1.25, col: L.torchCol || '#ff9a40', sprite: sp });
    }
    for (const gl of glows) {
      const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex[gl.tex], blending: THREE.AdditiveBlending, depthWrite: false })));
      sp.position.set(gl.x, gl.y, gl.z); sp.scale.set(gl.s, gl.s, 1); root.add(sp); gl.sprite = sp;
    }
    // floating motes: pollen in daylight, embers and dust in the dark
    const N = L.motes, mp = new Float32Array(N * 3), seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) { mp[i * 3] = (hash(i, 1) - 0.5) * 26; mp[i * 3 + 1] = hash(i, 2) * 3; mp[i * 3 + 2] = (hash(i, 3) - 0.5) * 22; seeds[i] = hash(i, 4) * 10; }
    const pg = keep(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(pg, keep(new THREE.PointsMaterial({ map: glowTex.white, color: L.mote, size: 0.16, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));
    motes.frustumCulled = false; root.add(motes);

    scene.add(root);
    scene.background = new THREE.Color(L.sky); scene.fog = new THREE.Fog(L.sky, L.fogN, L.fogF);
    hemi.color.set(L.sky2); hemi.groundColor.set(L.gnd); hemi.intensity = L.amb;
    sun.color.set(L.sunCol); sun.intensity = L.sun;
    grade.uniforms.tint.value.set(...L.tint); grade.uniforms.sat.value = L.sat || 1.1;
    world = { key: info.key, root, L, groundMat, groundTex, flames, glows, motes, mp, seeds, base: mp.slice(), dark: L.dark };
  }

  // ---------------------------------------------------------------- sprites (people, monsters, chests, the wagon)
  const pool = [];
  function spriteMesh(i) {
    if (pool[i]) return pool[i];
    const mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(boardGeo, mat); m.castShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
    const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    scene.add(m); scene.add(blob);
    return (pool[i] = { m, blob });
  }
  // how bright a spot is in a dark dungeon (the billboards are unlit, so they are tinted by hand)
  function lightAt(x, z, cx, cz) {
    if (!world || !world.dark) return 1;
    let b = world.L.amb * 0.45 + 0.08;
    const d = Math.hypot(x - cx, z - cz); b += Math.max(0, 1 - d / 7) * 1.0;
    for (const f of world.flames) { const e = Math.hypot(x - f.x, z - f.z); b += Math.max(0, 1 - e / 4.5) * 0.6; }
    return Math.min(1.05, b);
  }

  // ---------------------------------------------------------------- one frame
  let cam = null, battleK = 0, lastT = 0, frameNo = 0;
  const tgt = new THREE.Vector3(), snap = new THREE.Vector3();
  // the sun's own axes, for snapping its shadow map to whole texels
  const SUN_OFF = new THREE.Vector3(-9, 22, 11), LZ = SUN_OFF.clone().normalize();
  const LX = new THREE.Vector3(0, 1, 0).cross(LZ).normalize(), LY = LZ.clone().cross(LX).normalize();
  const TEXEL = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
  function render(st) {
    if (!world || world.key !== st.map.key) build(st.map);
    const dt = Math.min(0.1, Math.max(0, st.t - lastT)); lastT = st.t;
    const W = world;
    // ripple water and lava
    const f = Math.floor(st.t * 2) % 2; if (W.groundMat.map !== W.groundTex[f]) W.groundMat.map = W.groundTex[f];
    // camera: a diorama view that eases after the party; in battle it leans in and the scene goes soft
    battleK += ((st.battle ? 1 : 0) - battleK) * Math.min(1, dt * 4);
    if (!cam || st.snap) cam = { x: st.camX, y: st.camY };
    const k = st.title ? 1 : Math.min(1, dt * 10);
    cam.x += (st.camX - cam.x) * k; cam.y += (st.camY - cam.y) * k;
    const pitch = PITCH - battleK * 0.22, dist = DIST - battleK * 6;
    tgt.set(cam.x + 0.5, 0, cam.y + 0.5 + battleK * 0.5);
    camera.position.set(tgt.x, tgt.y + dist * Math.sin(pitch), tgt.z + dist * Math.cos(pitch)); camera.lookAt(tgt);
    // sun and shadows follow the camera, but only in whole shadow-map texels: sliding it smoothly made every shadow edge
    // (trees above all) shimmer while the party walked
    const a = Math.round(tgt.dot(LX) / TEXEL) * TEXEL, b = Math.round(tgt.dot(LY) / TEXEL) * TEXEL, c = tgt.dot(LZ);
    snap.copy(LX).multiplyScalar(a).addScaledVector(LY, b).addScaledVector(LZ, c);
    sun.position.copy(snap).add(SUN_OFF); sun.target.position.copy(snap); sun.target.updateMatrixWorld();
    // light: the lantern in the dark, the nearest torches
    lantern.position.set(st.camX + 0.5, 1.3, st.camY + 0.7); lantern.intensity = W.dark ? 10 : 0;
    const near = W.flames.map((fl) => [Math.hypot(fl.x - tgt.x, fl.z - tgt.z), fl]).sort((a, b) => a[0] - b[0]);
    torchLights.forEach((l, i) => {
      const n = near[i]; if (!n || n[0] > 14) { l.intensity = 0; return; }
      const fl = n[1], flick = 0.85 + Math.sin(st.t * 13 + i * 2) * 0.08 + Math.sin(st.t * 23 + i) * 0.06;
      l.position.set(fl.x, fl.y, fl.z); l.color.set(fl.col); l.intensity = (W.dark ? 5 : 2.5) * flick * (fl.power || 1);
    });
    for (const fl of W.flames) if (fl.sprite) { const s = 0.42 + Math.sin(st.t * 17 + fl.x) * 0.04; fl.sprite.scale.set(s, s * 1.35, 1); }
    for (const gl of W.glows) if (gl.gem) gl.sprite.material.opacity = 0.75 + Math.sin(st.t * 3) * 0.25;
    // motes drift up and sway, wrapping around the camera
    const P = W.mp, B = W.base;
    for (let i = 0; i < W.seeds.length; i++) {
      const s = W.seeds[i], yy = (B[i * 3 + 1] + st.t * (0.12 + (s % 1) * 0.15)) % 3.2;
      let xx = B[i * 3] + Math.sin(st.t * 0.6 + s) * 0.6, zz = B[i * 3 + 2] + Math.cos(st.t * 0.5 + s * 1.3) * 0.4;
      xx = ((xx - tgt.x + 13) % 26 + 26) % 26 + tgt.x - 13; zz = ((zz - tgt.z + 11) % 22 + 22) % 22 + tgt.z - 11;
      P[i * 3] = xx; P[i * 3 + 1] = yy + 0.1; P[i * 3 + 2] = zz;
    }
    W.motes.geometry.attributes.position.needsUpdate = true;
    W.motes.material.opacity = 0.55 + Math.sin(st.t * 1.7) * 0.25;
    // the people
    const list = st.sprites;
    list.forEach((sp, i) => {
      const { m, blob } = spriteMesh(i), img = sp.chest !== undefined ? chestImg[sp.chest ? 1 : 0] : sp.img, t = tex(img, false);
      if (m.material.map !== t) { m.material.map = t; m.customDepthMaterial.map = t; m.material.needsUpdate = true; m.customDepthMaterial.needsUpdate = true; }
      const s = sp.size || 1, x = sp.x + 0.5, z = sp.y + 0.62;
      m.visible = blob.visible = true;
      m.position.set(x, sp.lift || 0, z); m.scale.set(s, s, s);
      const b = lightAt(x, z, st.camX + 0.5, st.camY + 0.5); m.material.color.setRGB(b, b, b);
      blob.position.set(x, 0.015, z - 0.02); blob.scale.set(s * 0.8, 1, s * 0.8); blob.material.opacity = sp.chest !== undefined ? 0.35 : 0.5;
    });
    for (let i = list.length; i < pool.length; i++) { pool[i].m.visible = false; pool[i].blob.visible = false; }
    // post effects
    const px = renderer.getPixelRatio() * (canvas.clientWidth / 256 || 3);
    dofH.uniforms.maxR.value = dofV.uniforms.maxR.value = 2.6 * px;
    for (const p of [dofH, dofV]) { p.uniforms.all.value = battleK * 0.7; p.uniforms.focus.value = 0.47; }
    dofH.uniforms.dir.value.set(1 / (canvas.width || 768), 0); dofV.uniforms.dir.value.set(0, 1 / (canvas.height || 720));
    grade.uniforms.dark.value = battleK * 0.35;
    bloom.strength = W.dark ? 0.75 : 0.45;
    composer.render(dt);
    frameNo++;
  }
  function resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  return { render, resize, get frames() { return frameNo; } };
}
