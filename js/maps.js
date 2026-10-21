// The world: the overworld, towns, castles and dungeons, with every person in them and the story of the five chapters.
// Maps are rows of characters; TILE says what each character is. Story scripts are async functions given the game API `A`.
import { T } from './i18n.js';

export const TILE = {
  '.': 'grass', ',': 'path', F: 'flowers', T: 'tree', w: 'water', _: 'stone', '=': 'wood', r: 'carpet', X: 'cwall', '#': 'wall', ':': 'floor',
  d: 'door', c: 'counter', B: 'bed', t: 'table', o: 'barrel', k: 'throne', p: 'pillar', S: 'statue', g: 'grave', '|': 'fence', V: 'crack',
  '<': 'stairsup', '>': 'stairsdown', A: 'altar', L: 'lava', '~': 'sea', m: 'miasma', ' ': 'void', f: 'forest', h: 'hills', '^': 'mountain',
  s: 'sand', v: 'swamp', b: 'bridge', x: 'rock', C: 'castle', O: 'town', H: 'village', D: 'cave', W: 'tower', Q: 'shrine', Z: 'darkcastle',
};
export const WALK = new Set(['grass', 'path', 'flowers', 'stone', 'wood', 'carpet', 'floor', 'door', 'stairsup', 'stairsdown', 'sand', 'swamp', 'lava', 'forest', 'hills', 'bridge',
  'castle', 'town', 'village', 'cave', 'tower', 'shrine', 'darkcastle']);
function rng(s) { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const grid = (w, h, ch) => Array.from({ length: h }, () => Array(w).fill(ch));
const rows = (g) => g.map((r) => r.join(''));

// ---------------------------------------------------------------- the overworld
// four corner kingdoms (chapters 1-4), each sealed by a rock in its mountain pass until chapter 5; the middle belongs to the hero
export const PLACES = [
  { id: 'c1_castle', x: 8, y: 5, icon: 'C', name: ['布雷索城', 'Bressel Castle'] }, { id: 'c1_village', x: 11, y: 14, icon: 'O', name: ['薊村', 'Thistle'] },
  { id: 'c1_cave_1', x: 17, y: 8, icon: 'D', name: ['幽暗洞窟', 'Gloom Cave'] },
  { id: 'c2_palace', x: 46, y: 5, icon: 'C', name: ['桑達王宮', 'Sandar Palace'] }, { id: 'c2_spring', x: 42, y: 14, icon: 'O', name: ['泉之鎮', 'Springvale'] },
  { id: 'c2_cave_1', x: 41, y: 6, icon: 'D', name: ['西爾峰洞窟', 'Windpeak Cave'] }, { id: 'c2_arena', x: 55, y: 15, icon: 'O', name: ['競技之都', 'Arena City'] },
  { id: 'c3_lake', x: 9, y: 29, icon: 'O', name: ['湖畔鎮', 'Lakeside'] }, { id: 'c3_mine_1', x: 5, y: 40, icon: 'D', name: ['舊礦坑', 'Old Mine'] },
  { id: 'c4_oasis', x: 47, y: 32, icon: 'O', name: ['綠洲鎮', 'Oasis'] }, { id: 'c4_tower_1', x: 54, y: 41, icon: 'W', name: ['鍊金之塔', 'Alchemist\'s Tower'] },
  { id: 'c5_hidden', x: 30, y: 11, icon: 'H', name: ['隱之村', 'Hidden Village'] }, { id: 'c5_cross', x: 30, y: 28, icon: 'O', name: ['十字路鎮', 'Crossroads'] },
  { id: 'c5_shrine_1', x: 25, y: 38, icon: 'Q', name: ['天空神殿', 'Sky Shrine'] }, { id: 'c5_dark_1', x: 30, y: 4, icon: 'Z', name: ['魔王城', 'Dark Castle'] },
];
export const WW = 60, WH = 46;
function buildWorld() {
  const R = rng(4242), t = grid(WW, WH, '.');
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < WW && y < WH) t[y][x] = c; };
  // ground cover from smooth noise
  const nz = (x, y) => (Math.sin(x * 0.45 + 1.3) + Math.sin(y * 0.37 + 0.4) + Math.sin((x + y) * 0.23 + 2.1) + Math.sin((x - y) * 0.31)) / 4 + (R() - 0.5) * 0.35;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const n = nz(x, y); if (n > 0.42) t[y][x] = 'f'; else if (n < -0.5) t[y][x] = 'h'; }
  // the southern-eastern desert, the south-western lake and marsh
  for (let y = 24; y < WH; y++) for (let x = 39; x < WW; x++) if (t[y][x] !== 'h' || R() < 0.6) t[y][x] = R() < 0.06 ? 'h' : 's';
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { if ((x - 14) ** 2 / 20 + (y - 34) ** 2 / 8 < 1) t[y][x] = '~'; if ((x - 6) ** 2 / 6 + (y - 30) ** 2 / 3 < 1) t[y][x] = 'v'; }
  // sea all around, with a ragged coast
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const e = Math.min(x, y, WW - 1 - x, WH - 1 - y); if (e < 2 || (e === 2 && R() < 0.45)) t[y][x] = '~'; }
  // mountain ridges sealing the four corners
  const ridge = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (t[y][x] !== '~') t[y][x] = '^'; };
  ridge(21, 1, 21, 21); ridge(1, 21, 21, 21); ridge(38, 1, 38, 21); ridge(38, 21, 58, 21);
  ridge(21, 23, 21, 44); ridge(1, 23, 21, 23); ridge(38, 23, 38, 44); ridge(38, 23, 58, 23);
  ridge(1, 22, 21, 22); ridge(38, 22, 58, 22);
  // the eastern river, crossed by a bridge
  for (let y = 1; y < 21; y++) { set(50, y, '~'); if (y > 9 && y < 21) set(51, y, '~'); }
  set(50, 12, 'b'); set(51, 12, 'b');
  // the mountain ring around the hidden village, open to the south
  for (let a = 0; a < 64; a++) { const x = Math.round(30 + Math.cos(a / 64 * Math.PI * 2) * 4), y = Math.round(11 + Math.sin(a / 64 * Math.PI * 2) * 3.3); if (!(y >= 13 && Math.abs(x - 30) <= 1)) set(x, y, '^'); }
  for (let y = 9; y <= 13; y++) for (let x = 27; x <= 33; x++) if (t[y][x] !== '^') t[y][x] = '.';
  // the dark castle on its blighted plateau
  for (let y = 1; y <= 8; y++) for (let x = 25; x <= 35; x++) { const d = Math.hypot(x - 30, (y - 4) * 1.2); if (d <= 2.2) t[y][x] = 'm'; else if (d <= 5) t[y][x] = '^'; }
  set(30, 4, 'Z'); for (let y = 5; y <= 9; y++) set(30, y, y <= 6 ? 'm' : '.'); set(30, 3, 'm');
  // the passes (rocks until chapter 5) and the clear ground around them
  const passes = [[21, 10], [38, 10], [21, 33], [38, 33]];
  for (const [x, y] of passes) for (let dx = -2; dx <= 2; dx++) set(x + dx, y, '.');     // the rock itself is a BARRIER drawn on top
  // the places, with clear ground to walk up to them
  for (const p of PLACES) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (t[p.y + dy] && !['^', '~', 'm', 'Z'].includes(t[p.y + dy][p.x + dx]) && !(p.icon === 'H' && dy < 0)) t[p.y + dy][p.x + dx] = t[p.y + dy][p.x + dx] === 's' ? 's' : '.'; set(p.x, p.y, p.icon); }
  set(30, 12, '.'); set(30, 13, '.'); set(30, 14, '.'); set(30, 15, '.');
  return rows(t);
}
// rocks that block the passes, the bridge and the blight until a flag is set
export const BARRIERS = [
  { x: 21, y: 10, flag: 'open', tile: 'rock' }, { x: 38, y: 10, flag: 'open', tile: 'rock' }, { x: 21, y: 33, flag: 'open', tile: 'rock' }, { x: 38, y: 33, flag: 'open', tile: 'rock' },
  { x: 50, y: 12, flag: 'c2_voice', tile: 'rock' },
];
// which monsters live where on the overworld
export function worldZone(x, y) {
  if (x <= 21 && y <= 21) return 'n1'; if (x >= 38 && y <= 21) return 'e2'; if (x <= 21 && y >= 23) return 'w3'; if (x >= 38 && y >= 23) return 's4';
  return y >= 12 && y <= 31 ? 'c5a' : 'c5b';
}

// ---------------------------------------------------------------- towns (generated around four buildings)
const SHOPKEEPER = { inn: 'merchant', item: 'merchant', equip: 'soldier', church: 'priestn', house: 'woman', tavern: 'man' };
function makeTown(o) {
  const W = 20, H = 15, t = grid(W, H, '.');
  for (let x = 0; x < W; x++) { t[0][x] = 'T'; t[H - 1][x] = 'T'; } for (let y = 0; y < H; y++) { t[y][0] = 'T'; t[y][W - 1] = 'T'; }
  for (let y = 1; y < H; y++) { t[y][9] = ','; t[y][10] = ','; } for (let x = 1; x < W - 1; x++) { t[6][x] = ','; t[13][x] = ','; }
  t[0][9] = ','; t[0][10] = ',';
  const npcs = [], slots = { tl: [2, 1], tr: [12, 1], bl: [2, 8], br: [12, 8] };
  for (const [k, kind] of Object.entries(o.buildings)) {
    const [x, y] = slots[k];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) t[y + j][x + i] = j === 0 || j === 4 || i === 0 || i === 5 ? '#' : '=';
    t[y + 4][x + 2] = 'd';
    if (kind === 'inn') { t[y + 1][x + 1] = 'B'; t[y + 1][x + 4] = 'B'; }
    if (kind === 'item' || kind === 'equip') for (let i = 1; i <= 4; i++) t[y + 2][x + i] = 'c';
    if (kind === 'church') { t[y + 1][x + 3] = 'A'; t[y + 1][x + 1] = 'S'; }
    if (kind === 'house') { t[y + 1][x + 4] = 'B'; t[y + 2][x + 1] = 't'; t[y + 1][x + 1] = 'o'; }
    if (kind === 'tavern') { t[y + 2][x + 1] = 't'; t[y + 2][x + 4] = 't'; t[y + 1][x + 4] = 'o'; t[y + 1][x + 1] = 'o'; }
    const kx = x + 2, ky = kind === 'item' || kind === 'equip' ? y + 1 : y + 2;
    const keeper = o.keepers && o.keepers[k];
    if (keeper !== null) npcs.push(Object.assign({ x: kx, y: ky, look: SHOPKEEPER[kind], dir: 'down', role: kind }, keeper || {}));
  }
  for (const [x, y, c] of o.deco || []) t[y][x] = c;
  return { w: W, h: H, tiles: rows(t), npcs: npcs.concat(o.npcs || []), theme: 'town', music: 'town', town: true };
}
const shopKeeper = (list, text) => ({ talk: (A) => A.shop(typeof list === 'function' ? list(A) : list, text) });
const innKeeper = (price) => ({ talk: (A) => A.inn(price) });
const priest = { talk: (A) => A.church() };

const rancher = (x, y) => ({ x, y, look: 'merchant', dir: 'down', talk: async (A) => {
  if (!A.flag('ranch_tip')) {
    A.set('ranch_tip');
    await A.says([T('牧場主人：「你知道嗎？被打倒的魔物，有時候會站起來，想要跟著你走。」', 'Rancher: "Did you know? A beaten monster will sometimes get up and want to follow you."'),
      T('牧場主人：「魔物最多四隻可以跟著旅行，其他的就交給我們魔物牧場照顧吧。不管在哪個章節，都可以來這裡接牠們喔。」', 'Rancher: "Up to four can travel with you; leave the rest with us at the Monster Ranch. You can fetch them here in any chapter."')]);
  }
  return A.ranch();
} });

// ---------------------------------------------------------------- dungeons (rooms and corridors from a seed)
function makeDungeon(seed, theme, opts = {}) {
  const W = opts.w || 26, H = opts.h || 18, R = rng(seed), t = grid(W, H, '#'), rooms = [];
  const cw = Math.floor((W - 2) / 3), chh = Math.floor((H - 2) / 2);
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 3; cx++) {
    const w = 4 + Math.floor(R() * (cw - 5)), h = 3 + Math.floor(R() * (chh - 4)), x = 1 + cx * cw + 1 + Math.floor(R() * (cw - w - 1)), y = 1 + cy * chh + 1 + Math.floor(R() * (chh - h - 1));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) t[y + j][x + i] = ':';
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }
  const dig = (a, b) => { let x = a.cx, y = a.cy; const hFirst = R() < 0.5; const go = (tx, ty) => { while (x !== tx) { x += Math.sign(tx - x); t[y][x] = ':'; } while (y !== ty) { y += Math.sign(ty - y); t[y][x] = ':'; } }; if (hFirst) { go(b.cx, y); go(b.cx, b.cy); } else { go(x, b.cy); go(b.cx, b.cy); } };
  // a snake through all six rooms, plus a couple of loops
  const order = [0, 1, 2, 5, 4, 3]; for (let i = 0; i < 5; i++) dig(rooms[order[i]], rooms[order[i + 1]]);
  if (R() < 0.7) dig(rooms[0], rooms[3]); if (R() < 0.5) dig(rooms[1], rooms[4]);
  if (theme === 'cave' || theme === 'dark') for (let i = 0; i < 6; i++) { const r = rooms[Math.floor(R() * 6)]; const x = r.x + Math.floor(R() * r.w), y = r.y + Math.floor(R() * r.h); if (theme === 'dark' && t[y][x] === ':' && R() < 0.5) t[y][x] = 'L'; }
  const start = rooms[order[0]], end = rooms[order[5]], mid = [rooms[order[1]], rooms[order[2]], rooms[order[3]], rooms[order[4]]];
  return { w: W, h: H, t, start, end, mid, R };
}
// a whole dungeon: floors linked by stairs; the last floor's far room holds the climax
function dungeon(id, seed, theme, floors, o) {
  const out = {};
  for (let f = 1; f <= floors; f++) {
    const d = makeDungeon(seed + f * 101, theme, o.size), mid = d.mid;
    // stairs go in a room's top row with solid wall behind them (as close to the middle as possible)
    const nook = (r) => { const xs = []; for (let x = r.x; x < r.x + r.w; x++) if (d.t[r.y - 1][x] === '#') xs.push(x); xs.sort((a, b) => Math.abs(a - r.cx) - Math.abs(b - r.cx)); return xs.length ? [xs[0], r.y] : [r.cx, r.cy]; };
    [d.start.cx, d.start.cy] = nook(d.start);
    d.t[d.start.cy][d.start.cx] = '<';
    if (f < floors) { [d.end.cx, d.end.cy] = nook(d.end); d.t[d.end.cy][d.end.cx] = '>'; }
    const fo = (o.floors && o.floors[f]) || {};
    const chests = (fo.chests || []).map((c, i) => { const r = mid[i % mid.length], x = r.x + (i % 2 ? r.w - 1 : 0), y = r.y + (i >= 2 ? r.h - 1 : 0); return { x, y, ...c, id: `${id}_${f}_${i}` }; });
    const anchor = { start: [d.start.cx, d.start.cy], end: [d.end.cx, d.end.cy], mid: mid.map((r) => [r.cx, r.cy]) };
    const used = new Set([`${d.start.cx},${d.start.cy}`, `${d.end.cx},${d.end.cy}`, ...chests.map((c) => `${c.x},${c.y}`)]);
    const open = (x, y) => d.t[y] && d.t[y][x] === ':' && !used.has(`${x},${y}`);
    const near = (x, y) => { for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && open(x + dx, y + dy)) return [x + dx, y + dy]; return [x, y]; };
    for (const s of fo.tiles || []) { let [x, y] = s.at(anchor); if (!(x === d.end.cx && y === d.end.cy)) [x, y] = near(x, y); d.t[y][x] = s.c; used.add(`${x},${y}`); }
    const npcs = (fo.npcs || []).map((n) => { let [x, y] = typeof n.at === 'function' ? n.at(anchor) : n.at; if (!(x === d.end.cx && y === d.end.cy)) [x, y] = near(x, y); used.add(`${x},${y}`); return { ...n, x, y }; });
    const warps = [{ x: d.start.cx, y: d.start.cy, up: true, to: f === 1 ? 'world' : `${id}_${f - 1}`, end: f > 1 }];
    if (f < floors) warps.push({ x: d.end.cx, y: d.end.cy, to: `${id}_${f + 1}`, start: true });
    out[`${id}_${f}`] = { w: d.w, h: d.h, tiles: rows(d.t), theme, dungeon: true, music: o.music || 'dungeon', enc: o.enc, bg: o.bg, name: o.name, floor: f, warps, chests, npcs, anchor, entry: anchor.start, exitPlace: id + '_1' };
  }
  return out;
}

// ---------------------------------------------------------------- castles (drawn by hand)
const CASTLE = [
  'XXXXXXXXXXXXXXXXXXXX', 'X___p___rkr___p____X', 'X_______rrr________X', 'X___p___rrr___p____X', 'X_______rrr________X', 'XXXXX___rrr___XXXXXX',
  'X__BX___rrr___X_o_oX', 'X___d___rrr___d____X', 'X__BX___rrr___X_o__X', 'XXXXX___rrr___XXXXXX', '.TT.X___rrr___X.TT..', '....XX__rrr__XX.....',
  '.F.......,,.......F.', '...T.....,,.....T...', '.........,,.........', '.........,,.........'];
const PALACE = [
  'XXXXXXXXXXXXXXXXXXXX', 'X___p___rkr___p____X', 'X_______rrr________X', 'X___p___rrr___p____X', 'X_______rrr________X', 'XXXXX___rrr___XXXXXX',
  'X_B_X___rrr___X_B_tX', 'X___d___rrr___d____X', 'X_t_X___rrr___X____V', 'XXXXX___rrr___XXXXXX', '.TT.X___rrr___X.TT..', '....XX__rrr__XX.....',
  '.F.......,,.......F.', '...T.....,,.....T...', '.........,,.........', '.........,,.........'];

// ---------------------------------------------------------------- shops by chapter
const ITEMS1 = ['herb', 'antidote', 'wing', 'holywater'];
const EQUIP = {
  thistle: (A) => (A.ch() < 5 ? ['stick', 'dagger', 'boomerang', 'copper', 'clothes', 'travel', 'leather', 'potlid', 'lshield', 'hat', 'bandana', 'gloves', 'sandals', 'charm']
    : ['copper', 'spear', 'flail', 'chain', 'scale', 'lshield', 'bronzeshield', 'hat', 'helm', 'ironfist', 'boots', 'charm']),
  spring: () => ['stick', 'claw', 'copper', 'holyknife', 'rapier', 'leather', 'travel', 'silk', 'lshield', 'hat', 'bandana', 'gloves', 'sandals', 'boots'],
  arena: (A) => (A.ch() < 5 ? ['spear', 'claw', 'flail', 'magicstaff', 'chain', 'scale', 'silk', 'ishield', 'bronzeshield', 'tiara', 'hood', 'ironfist', 'boots', 'charm', 'agiring']
    : ['steel', 'bastard', 'flamesword', 'battleaxe', 'ironclaw', 'dragonclaw', 'sagestaff', 'steelmail', 'magicrobe', 'mshield', 'helm', 'steelhelm', 'powergloves', 'silverboots', 'guardneck', 'strring']),
  lake: (A) => (A.ch() < 5 ? ['copper', 'spear', 'flail', 'chain', 'iron', 'ishield', 'scaleshield', 'helm', 'ironboots', 'antidotal', 'strring']
    : ['zombie', 'demonclaw', 'platinum', 'platmail', 'mirrorarmor', 'mshield', 'tiara', 'sagestaff', 'steelfist', 'wingboots', 'critring', 'lifering']),
  oasis: (A) => (A.ch() < 5 ? ['whip', 'rapier', 'chainwhip', 'magicstaff', 'silk', 'cloak', 'magicrobe', 'ishield', 'tiara', 'hairband', 'silkgloves', 'wakering', 'agiring']
    : ['chainwhip', 'starwhip', 'sagestaff', 'wizardwand', 'thunderstaff', 'dancer', 'magicrobe', 'angelrobe', 'mshield', 'tiara', 'hairband', 'prayerring', 'goldneck']),
  cross: () => ['copper', 'spear', 'steel', 'bastard', 'ironclaw', 'whip', 'magicstaff', 'thunderstaff', 'chain', 'iron', 'silk', 'ishield', 'helm', 'steelhelm', 'ironfist', 'silverboots',
    'strring', 'agiring', 'antidotal', 'goldneck', 'luckbell'],
};
const ITEMS5 = ['herb', 'antidote', 'wing', 'holywater'];

// ---------------------------------------------------------------- everything
export function buildMaps() {
  const M = {};
  M.world = { w: WW, h: WH, tiles: buildWorld(), theme: 'town', world: true, music: 'field', bg: 'field', name: ['世界', 'The World'] };

  // ======================= chapter 1: the royal knight =======================
  M.c1_castle = { w: 20, h: 16, tiles: CASTLE, theme: 'castle', music: 'castle', name: ['布雷索城', 'Bressel Castle'], save: [9, 2],
    npcs: [
      { x: 9, y: 1, look: 'king', dir: 'down', talk: async (A) => {
        if (A.ch() === 1 && !A.flag('c1_saved')) {
          await A.says([T('國王：「卡爾德，你來了。」', 'King: "Kaldor, you have come."'),
            T('國王：「南邊的薊村，孩子們接二連三地失蹤了。村民說，夜裡常聽見東邊的幽暗洞窟傳來怪聲。」', 'King: "In Thistle, to the south, children have been vanishing one after another. The villagers hear strange sounds from Gloom Cave to the east at night."'),
            T('國王：「去查明真相，把孩子們平安帶回來吧！」', 'King: "Find out what is happening and bring the children home safely!"')]);
        } else if (A.ch() === 1) {
          await A.says([T('國王：「做得好，卡爾德！孩子們都平安回家了。」', 'King: "Well done, Kaldor! The children are home safe."'),
            T('國王：「不過……救出的孩子說，那魔物在找「將來會成為勇者的孩子」。」', 'King: "But… the children say the monster was searching for \'the child who will become the Hero\'."'),
            T('國王：「古老的預言說，邪惡的帝王將會甦醒，而唯有被命運引導的勇者能夠阻止他。」', 'King: "An old prophecy says an evil emperor will rise, and only a Hero guided by fate can stop him."'),
            T('國王：「卡爾德，我命你前去尋找那位勇者，並保護他！」', 'King: "Kaldor, I command you: go and find this Hero, and protect them!"')]);
          A.addGold(300); await A.say(T('卡爾德得到了 300 枚金幣。', 'Kaldor receives 300 gold.'));
          return A.chapterEnd(1);
        } else { await A.say(T('國王：「勇者啊，卡爾德就拜託你了。」', 'King: "Hero, I entrust Kaldor to you."')); }
        await A.saveOffer(T('國王', 'King'));
      } },
      { x: 7, y: 4, look: 'guard', dir: 'down', talk: (A) => A.say(T('衛兵：「這裡是布雷索城，北國的守護。」', 'Guard: "This is Bressel Castle, the shield of the north."')) },
      { x: 11, y: 4, look: 'guard', dir: 'down', talk: (A) => A.say(T('衛兵：「國王陛下可以為你記錄冒險之書。」', 'Guard: "His Majesty can record your Adventure Log."')) },
      { x: 13, y: 2, look: 'oldman', dir: 'left', talk: (A) => A.say(A.ch() === 1 ? T('大臣：「出了城往南走，就是薊村。洞窟在城的東邊。」', 'Minister: "Leave the castle and head south to reach Thistle. The cave lies east of the castle."') : T('大臣：「世界正被黑暗籠罩……」', 'Minister: "Darkness is falling across the world…"')) },
      { x: 2, y: 7, look: 'soldier', dir: 'right', move: true, talk: (A) => A.say(T('士兵：「藥草要多帶幾個！洞窟裡的骷髏兵可不好對付。」', 'Soldier: "Carry plenty of herbs! The skeletons in that cave are no joke."')) },
      { x: 17, y: 7, look: 'woman', dir: 'left', move: true, talk: (A) => A.say(T('侍女：「卡爾德大人總是這麼認真呢。」', 'Maid: "Sir Kaldor is always so serious."')) },
      // side story: a young soldier's letter home
      { x: 16, y: 3, look: 'soldier', dir: 'down', when: (A) => A.ch() === 1, talk: async (A) => {
        if (!A.flag('c1q_letter')) {
          await A.says([T('年輕士兵：「卡爾德大人……我有一件事想拜託您。」', 'Young soldier: "Sir Kaldor… may I ask you a favour?"'),
            T('年輕士兵：「我娘住在薊村，最近病倒了。可是我在守城，走不開……」', 'Young soldier: "My mother lives in Thistle, and she\'s fallen ill. But I\'m on guard duty and can\'t leave…"'),
            T('年輕士兵：「能幫我把這封信交給她嗎？她不識字，請您唸給她聽就好。」', 'Young soldier: "Could you take her this letter? She can\'t read — would you read it to her?"')]);
          if (await A.ask(T('要幫他送信嗎？', 'Deliver the letter?'), [T('交給我', 'Leave it to me'), T('現在不行', 'Not now')]) !== 0) return;
          A.set('c1q_letter'); A.give('letter'); return A.say(T('收下了士兵的信。（他的母親住在薊村的東邊。）', 'You take the Soldier\'s Letter. (His mother lives on the east side of Thistle.)'));
        }
        if (A.has('letter')) return A.say(T('年輕士兵：「拜託您了。我娘住在村子東邊的小屋旁。」', 'Young soldier: "Please. My mother lives by the little house on the east side of the village."'));
        if (A.flag('c1q_letter_done') && !A.flag('c1q_letter_end')) {
          await A.says([T('年輕士兵：「我娘她……說了什麼？」', 'Young soldier: "Did my mother… say anything?"'), T('卡爾德把母親的話一字一句地轉達了。', 'Kaldor passes on her words, one by one.'),
            T('年輕士兵：「……『你是娘的驕傲』……」士兵用袖子擦了擦眼睛。', 'Young soldier: "…\'You are my pride\'…" He rubs his eyes with his sleeve.'),
            T('年輕士兵：「謝謝您，卡爾德大人。等這次的事件平息，我一定回家看她。」', 'Young soldier: "Thank you, Sir Kaldor. When this is over, I\'ll go home to see her."'),
            T('年輕士兵：「這是我娘給我的護身符……現在，我想讓守護大家的您帶著它。」', 'Young soldier: "This charm was from my mother… I\'d like you to carry it now, since you protect us all."')]);
          A.set('c1q_letter_end'); A.give('charm'); A.give('herb', 2); A.sfx('chest');
          return A.say(T('得到了護身符和兩個藥草！', 'Received a Lucky Charm and two Medicinal Herbs!'));
        }
        return A.say(T('年輕士兵：「下個月我就能休假回家了！我要幫娘修屋頂。」', 'Young soldier: "Next month I get leave to go home! I\'ll fix Mother\'s roof."'));
      } },
    ] };
  M.c1_village = makeTown({ buildings: { tl: 'inn', tr: 'item', bl: 'church', br: 'equip' }, deco: [[8, 1, 'F'], [18, 10, 'g'], [18, 11, 'g'], [1, 9, 'w'], [1, 10, 'w']],
    keepers: { tl: innKeeper(4), tr: shopKeeper(ITEMS1), bl: priest, br: shopKeeper(EQUIP.thistle) },
    npcs: [
      { x: 8, y: 3, look: 'woman', dir: 'down', when: (A) => A.ch() === 1, talk: (A) => A.say(A.flag('c1_saved') ? T('母親：「謝謝你，騎士大人！我的提姆回來了！」', 'Mother: "Thank you, sir knight! My Tim is home!"') : T('母親：「我的兒子提姆不見了……有人看見他往東邊的洞窟走去。」', 'Mother: "My son Tim is missing… someone saw him walking toward the cave in the east."')) },
      { x: 11, y: 10, look: 'oldman', dir: 'down', talk: (A) => A.say(A.ch() === 1 ? T('老人：「洞窟深處好像住著會說話的史萊姆，不知是好是壞。」', 'Old man: "They say a talking slime lives deep in the cave. Who knows if it\'s friend or foe."') : T('老人：「勇者？……那是很久以前的預言了。」', 'Old man: "A Hero? …That is an old prophecy."')) },
      { x: 5, y: 7, look: 'child', dir: 'down', move: true, talk: (A) => A.say(A.flag('c1_saved') ? T('小孩：「洞窟裡好可怕！可是騎士大人好帥！」', 'Kid: "The cave was so scary! But the knight was so cool!"') : T('小孩：「大家都不敢出門玩了……」', 'Kid: "Nobody dares to go out and play anymore…"')) },
      { x: 14, y: 7, look: 'man', dir: 'down', move: true, talk: (A) => A.say(T('村民：「城堡在北邊，國王陛下很關心我們。」', 'Villager: "The castle is to the north. His Majesty cares about us."')) },
      // side story: the soldier's mother
      { x: 18, y: 4, look: 'woman', dir: 'left', talk: async (A) => {
        if (A.has('letter')) {
          await A.says([T('老婦人：「咳、咳……騎士大人？這是……我兒子的信？」', 'Old woman: "Cough, cough… sir knight? This is… a letter from my boy?"'),
            T('卡爾德唸出了信：「娘，我很好。城裡的飯很好吃，大家對我都很好。」', 'Kaldor reads it aloud: "Mother, I am well. The food at the castle is good and everyone is kind to me."'),
            T('「我現在守護著國王，也守護著村子裡的孩子們。」', '"I guard the king now, and the children of the village too."'),
            T('「等我放假，就回家幫您修屋頂。請您一定要好好吃藥。」', '"When I get leave I\'ll come home and fix the roof. Please, please take your medicine."'),
            T('老婦人：「那孩子……從小就怕黑，現在竟然在守護別人了……」', 'Old woman: "That boy… he was afraid of the dark when he was little, and now he guards others…"'),
            T('老婦人：「騎士大人，請轉告他：你是娘的驕傲。娘會好起來，等你回家。」', 'Old woman: "Sir knight, tell him this: you are my pride. I will get better, and wait for you to come home."')]);
          A.take('letter'); A.set('c1q_letter_done'); return A.say(T('（回城堡告訴年輕士兵吧。）', '(Go back and tell the young soldier.)'));
        }
        if (A.flag('c1q_letter_end') && A.ch() === 5) return A.say(T('老婦人：「我兒子已經當上隊長了喔，呵呵。屋頂也修好了。」', 'Old woman: "My boy is a captain now, you know. Ho ho. And the roof is fixed."'));
        if (A.flag('c1q_letter_done')) return A.say(T('老婦人：「收到兒子的信，我覺得病都好了一半呢。」', 'Old woman: "Since I got my boy\'s letter, I feel half better already."'));
        return A.say(T('老婦人：「咳、咳……我的兒子在城裡當兵，不知道過得好不好……」', 'Old woman: "Cough, cough… my son is a soldier at the castle. I wonder if he\'s all right…"'));
      } },
      // side story: Tim's dog
      { x: 16, y: 7, look: 'child', dir: 'down', when: (A) => A.ch() === 1 && A.flag('c1_saved'), talk: async (A) => {
        if (!A.flag('c1q_dog_found')) {
          A.set('c1q_dog_ask');
          return A.says([T('提姆：「騎士大人……我的狗小黑不見了。」', 'Tim: "Sir knight… my dog Kuro is missing."'), T('提姆：「魔物把我抓走的時候，小黑一直追著我叫……後來就沒看到牠了。」', 'Tim: "When the monster took me, Kuro chased after us barking… and then he was gone."'),
            T('提姆：「牠一定還在洞窟裡等我……」', 'Tim: "I bet he\'s still in the cave, waiting for me…"')]);
        }
        if (!A.flag('c1q_dog_end')) {
          await A.says([T('小黑：「汪！汪汪！」', 'Kuro: "Woof! Woof woof!"'), T('提姆：「小黑！！」提姆緊緊抱住了小黑。', 'Tim: "Kuro!!" Tim throws his arms round the big grey dog.'),
            T('提姆：「原來你一直守在洞窟裡……對不起，對不起……謝謝你。」', 'Tim: "You were guarding the cave all this time… I\'m sorry, I\'m so sorry… thank you."'),
            T('提姆的母親：「騎士大人，這是我丈夫以前穿的靴子。他是村裡跑得最快的人……請收下吧。」', 'Tim\'s mother: "Sir knight, these boots were my late husband\'s. He was the fastest runner in the village… please take them."')]);
          A.set('c1q_dog_end'); A.give('boots'); A.sfx('chest'); return A.say(T('得到了皮靴！', 'Received Leather Boots!'));
        }
        return A.say(T('提姆：「我和小黑以後要一起當騎士！」', 'Tim: "When we grow up, Kuro and I are going to be knights!"'));
      } },
      { x: 17, y: 7, look: 'mon:wolf', dir: 'down', when: (A) => A.flag('c1q_dog_found'), talk: (A) => A.say(T('小黑：「汪！」（尾巴搖個不停。）', 'Kuro: "Woof!" (His tail won\'t stop wagging.)')) },
      rancher(1, 4),
      // chapter 5: Kaldor waits at the inn
      { x: 3, y: 4, look: 'kaldor', dir: 'down', when: (A) => A.ch() === 5 && !A.flag('r_kaldor'), talk: async (A) => {
        await A.says([T('卡爾德：「你……莫非就是預言中的勇者？」', 'Kaldor: "You… could you be the Hero of the prophecy?"'), T('卡爾德：「我奉國王之命一直在尋找你。從今天起，我的劍就為你而揮！」', 'Kaldor: "By my king\'s command I have searched for you. From today, my sword is yours!"')]);
        A.set('r_kaldor'); await A.join('kaldor');
      } },
    ] });
  Object.assign(M, dungeon('c1_cave', 11, 'cave', 2, { enc: 'cave1', bg: 'cave', name: ['幽暗洞窟', 'Gloom Cave'],
    floors: {
      1: { chests: [{ item: 'herb' }, { gold: 60 }, { item: 'antidote' }],
        npcs: [
          { at: (a) => a.mid[3], look: 'mon:wolf', dir: 'down', when: (A) => A.ch() === 1 && A.flag('c1q_dog_ask') && !A.flag('c1q_dog_found'), talk: async (A) => {
            await A.says([T('一隻灰色的大狗守在岔路前。牠的腳受了傷，卻仍然朝著洞窟深處低吼。', 'A big grey dog stands guard at the fork. Its leg is hurt, but it still growls toward the depths of the cave.'),
              T('大狗聞到卡爾德身上提姆的味道，突然搖起了尾巴。', 'It catches Tim\'s scent on Kaldor, and suddenly its tail starts wagging.'),
              T('（是提姆的狗小黑！牠一直守在這裡，不讓魔物再靠近孩子們回家的路。）', '(It\'s Tim\'s dog, Kuro! He has stood here all along, keeping the monsters off the children\'s way home.)'),
              T('卡爾德：「好孩子……你做得很好。我們回家吧。」', 'Kaldor: "Good boy… you did well. Let\'s go home."')]);
            A.set('c1q_dog_found'); await A.say(T('小黑一跛一跛地跑出了洞窟，往村子奔去。', 'Kuro limps out of the cave and races off toward the village.'));
          } },{ at: (a) => a.mid[1], look: 'pupu', dir: 'down', when: (A) => A.ch() === 1 && !A.flag('pupu'), talk: async (A) => {
          await A.says([T('史萊姆：「噗噗！別、別打我！我是好史萊姆！」', 'Slime: "Pu-pu! D-don\'t hit me! I\'m a good slime!"'), T('史萊姆：「我叫噗噗。我想變成人類……跟著騎士大人說不定就能實現夢想！」', 'Slime: "My name is Pupu. I want to become human… maybe if I follow a knight, my dream will come true!"')]);
          if (await A.ask(T('要讓噗噗加入嗎？', 'Let Pupu join?'), [T('好', 'Yes'), T('不要', 'No')]) === 0) { A.set('pupu'); await A.join('pupu'); } else await A.say(T('噗噗：「嗚……我會在這裡等你改變心意的。」', 'Pupu: "Boo… I\'ll wait here till you change your mind."'));
        } }] },
      2: { chests: [{ item: 'leather' }, { item: 'wing' }, { item: 'skyhelm', when: (A) => A.ch() === 5 }],
        npcs: [
          { at: (a) => a.end, look: 'mon:shade', dir: 'down', when: (A) => !A.flag('c1_boss'), talk: async (A) => {
            await A.says([T('影魔：「嘿嘿嘿……又有獵物上門了。」', 'Shadow Fiend: "Heh heh heh… more prey walks in."'), T('影魔：「我們在找那個會成為勇者的孩子。在找到之前，一個也不放走！」', 'Shadow Fiend: "We seek the child who will become the Hero. Until we find them, no one leaves!"')]);
            if (await A.battle([['shade', 1]], { bg: 'cave' }) !== 'win') return;
            A.set('c1_boss'); await A.say(T('影魔：「勇者……終究會被暗帝大人……」影魔消失了。', 'Shadow Fiend: "The Hero… will fall to the Dark Emperor…" The fiend fades away.'));
          } },
          { at: (a) => [a.end[0] + 1, a.end[1] + 1], look: 'child', dir: 'up', when: (A) => A.ch() === 1 && !A.flag('c1_saved'), talk: async (A) => {
            if (!A.flag('c1_boss')) return A.say(T('孩子：「好可怕……救救我們！」', 'Child: "It\'s so scary… please save us!"'));
            await A.says([T('提姆：「騎士大人！謝謝你救了我們！」', 'Tim: "Sir knight! Thank you for saving us!"'), T('孩子們一溜煙地跑回了村子。', 'The children run all the way back to the village.')]);
            A.set('c1_saved'); await A.say(T('（回城向國王報告吧。）', '(Report to the king at the castle.)'));
          } },
        ] } } }));

  // ======================= chapter 2: the martial princess =======================
  M.c2_palace = { w: 20, h: 16, tiles: PALACE, theme: 'castle', music: 'castle', name: ['桑達王宮', 'Sandar Palace'], save: [9, 2],
    checks: { '19,8': async (A) => {
      if (A.ch() !== 2 || A.flag('c2_escape')) return false;
      await A.say(T('牆上有一道裂縫。', 'There\'s a crack in the wall.'));
      if (await A.ask(T('要一腳踢破牆壁嗎？', 'Kick the wall down?'), [T('踢！', 'Kick it!'), T('算了', 'No')]) !== 0) return true;
      A.sfx('boom'); A.setTile(19, 8, '_'); A.set('c2_escape');
      await A.says([T('碰！！牆壁被莉雅一腳踢出了一個大洞！', 'CRASH!! Rhea kicks a great hole through the wall!'), T('巴洛：「公、公主殿下！您又來了……」', 'Barlow: "P-princess! Not again…"'), T('卡斯：「看來是攔不住了。巴洛老師，我們也跟著去吧。」', 'Cass: "There\'s no stopping her. Master Barlow, let\'s go with her."'), T('巴洛：「唉……只好陪公主走一趟了。」', 'Barlow: "Sigh… I suppose we must."')]);
      await A.join('barlow'); await A.join('cass');
      return true;
    } },
    npcs: [
      { x: 9, y: 1, look: 'king', dir: 'down', when: (A) => A.ch() < 5 && !A.flag('c2_won'), talk: async (A) => {
        if (!A.flag('c2_voice')) {
          await A.say(T('國王：「…………！」（國王似乎說不出話來。）', 'King: "…………!" (The king cannot seem to speak.)'));
          if (A.has('songstone')) {
            A.take('songstone'); await A.says([T('莉雅把歌之石交給了國王。石頭發出柔和的歌聲……', 'Rhea gives the Song Stone to the king. It sings softly…'), T('國王：「啊……啊！我能說話了！莉雅，謝謝妳！」', 'King: "Ah… ah! I can speak! Thank you, Rhea!"'), T('國王：「妳想參加競技之都的武術大會吧？好吧，我會下令開放東邊的橋。」', 'King: "You want to fight in the tournament at Arena City, don\'t you? Very well. I will order the eastern bridge opened."')]);
            A.set('c2_voice');
          }
        } else await A.say(T('國王：「莉雅，去吧！讓世人見識桑達公主的實力！」', 'King: "Go, Rhea! Show the world the strength of Sandar\'s princess!"'));
        if (A.flag('c2_escape')) await A.saveOffer(T('國王', 'King'));
      } },
      { x: 13, y: 2, look: 'queen', dir: 'left', when: (A) => A.ch() < 5 && !A.flag('c2_won'), talk: (A) => A.say(A.flag('c2_voice') ? T('王后：「國王的聲音回來了，真是太好了。」', 'Queen: "The king has his voice back. How wonderful."') : T('王后：「國王突然失去了聲音……據說西爾峰洞窟深處有能喚回聲音的歌之石。」', 'Queen: "The king suddenly lost his voice… they say the Song Stone, deep in Windpeak Cave, can bring it back."')) },
      { x: 9, y: 11, look: 'guard', dir: 'up', when: (A) => A.ch() < 5 && !A.flag('c2_escape'), talk: (A) => A.say(T('衛兵：「公主殿下，國王有令，不准您出城！」', 'Guard: "Princess, the king forbids you to leave the castle!"')) },
      { x: 10, y: 11, look: 'guard', dir: 'up', when: (A) => A.ch() < 5 && !A.flag('c2_escape'), talk: (A) => A.say(T('衛兵：「請回房間去吧！」', 'Guard: "Please go back to your room!"')) },
      { x: 2, y: 7, look: 'barlow', dir: 'right', when: (A) => A.ch() === 2 && !A.flag('c2_escape'), talk: (A) => A.say(T('巴洛：「公主殿下，今天也要好好念書喔。」', 'Barlow: "Princess, please study hard today too."')) },
      { x: 3, y: 8, look: 'cass', dir: 'up', when: (A) => A.ch() === 2 && !A.flag('c2_escape'), talk: (A) => A.say(T('卡斯：「公主好像又在打什麼主意了……」', 'Cass: "Looks like the princess is plotting something again…"')) },
      { x: 17, y: 8, look: 'woman', dir: 'left', when: (A) => A.ch() === 2 && !A.flag('c2_escape'), talk: (A) => A.say(T('侍女：「公主殿下，您的房間牆壁好像有裂痕……您不會又想……」', 'Maid: "Princess, there\'s a crack in your bedroom wall… you\'re not thinking of…"')) },
    ],
    onEnter: async (A) => {
      if (A.ch() === 2 && A.flag('c2_won') && !A.flag('c2_end')) {
        A.set('c2_end'); A.music('sad');
        await A.says([T('……王宮裡安靜得可怕。', '…The palace is terribly quiet.'), T('國王、王后、士兵、侍女——所有的人都不見了。', 'The king, the queen, the soldiers, the maids — everyone is gone.'), T('莉雅：「父王！大家去哪裡了！？」', 'Rhea: "Father! Where is everyone!?"'), T('巴洛：「這是……魔物的氣息……」', 'Barlow: "This is… the scent of monsters…"'), T('卡斯：「公主殿下，我們一定會把大家找回來的。」', 'Cass: "Princess, we will find them all. I promise."')]);
        return A.chapterEnd(2);
      }
    } };
  M.c2_spring = makeTown({ buildings: { tl: 'item', tr: 'inn', bl: 'equip', br: 'church' }, deco: [[1, 2, 'F'], [18, 2, 'F'], [11, 9, 'w'], [11, 10, 'w']],
    keepers: { tl: shopKeeper(ITEMS1), tr: innKeeper(8), bl: shopKeeper(EQUIP.spring), br: priest },
    npcs: [
      { x: 8, y: 3, look: 'man', dir: 'down', talk: (A) => A.say(T('鎮民：「聽說國王突然說不出話來了，好可憐。」', 'Townsman: "I hear the king suddenly lost his voice. Poor man."')) },
      { x: 11, y: 4, look: 'oldman', dir: 'down', talk: (A) => A.say(T('老人：「西北方的西爾峰洞窟最深處，供奉著會唱歌的石頭。」', 'Old man: "In the depths of Windpeak Cave, to the north-west, there is a stone that sings."')) },
      { x: 14, y: 7, look: 'soldier', dir: 'down', move: true, talk: (A) => A.say(A.flag('c2_voice') ? T('士兵：「東邊的橋開放了！競技之都就在河的對岸。」', 'Soldier: "The eastern bridge is open! Arena City is across the river."') : T('士兵：「通往競技之都的橋被國王下令封鎖了。」', 'Soldier: "The king has closed the bridge to Arena City."')) },
      { x: 5, y: 7, look: 'woman', dir: 'down', move: true, talk: (A) => A.say(T('姑娘：「公主殿下真的一腳踢破了牆壁嗎？好厲害！」', 'Girl: "Did the princess really kick through the wall? Amazing!"')) },
      // side story: Barlow's old friend
      { x: 18, y: 4, look: 'sage', dir: 'left', talk: async (A) => {
        if (A.ch() === 2 && A.flag('c2_escape') && !A.flag('c2q_friend')) {
          await A.says([T('老魔法師：「這腳步聲……還有這股燒焦鬍子的味道……巴洛？是你嗎？」', 'Old wizard: "Those footsteps… and that smell of singed beard… Barlow? Is that you?"'),
            T('巴洛：「梅爾文！好久不見了，老朋友。」', 'Barlow: "Melvin! It has been so long, old friend."'),
            T('梅爾文：「五十年前，我們約好要一起爬上西爾峰，看山頂的晚霞。」', 'Melvin: "Fifty years ago we promised to climb Windpeak together and watch the sunset from the top."'),
            T('梅爾文：「可是我的眼睛在那之後就看不見了……那個約定，也就一直沒能實現。」', 'Melvin: "But my eyes failed soon after… and that promise was never kept."'),
            T('巴洛：「……梅爾文，我說給你聽。西爾峰的晚霞是金色的，像整片天空都在燃燒。」', 'Barlow: "…Melvin, let me tell you. The sunset over Windpeak is gold, as if the whole sky were on fire."'),
            T('巴洛：「山腳下的村子亮起燈火，像星星落在了地上。風很冷，可是很溫柔。」', 'Barlow: "The villages below light their lamps, like stars fallen to earth. The wind is cold, but gentle."'),
            T('梅爾文：「……是嗎。原來是那樣的景色啊。」老人的眼角泛著淚光。', 'Melvin: "…I see. So that is how it looks." Tears shine at the corners of his eyes.'),
            T('梅爾文：「謝謝你，巴洛。這是我年輕時戴的帽子，它比我更適合繼續旅行。」', 'Melvin: "Thank you, Barlow. Here — the hat I wore when I was young. It ought to keep travelling, more than I."')]);
          A.set('c2q_friend'); A.give('hood'); A.give('elfwater'); A.sfx('chest');
          return A.say(T('得到了魔法帽和精靈之水！', 'Received a Wizard\'s Hat and an Elfin Elixir!'));
        }
        if (A.flag('c2q_friend')) return A.say(T('梅爾文：「巴洛那傢伙，還是那麼愛說故事。下次再說給我聽吧。」', 'Melvin: "Barlow always did love telling stories. Tell me another one next time."'));
        return A.say(T('老魔法師：「我的眼睛看不見了……不過聽得出來，妳是個很有精神的孩子。」', 'Old wizard: "My eyes no longer see… but I can hear you\'re a lively one."'));
      } },
      // side story: a mother waiting for her son
      { x: 1, y: 4, look: 'woman', dir: 'right', talk: async (A) => {
        if (A.ch() !== 2) return A.say(T('婦人：「阿德現在每天都幫我挑水呢。」', 'Woman: "Ade fetches my water every day now."'));
        if (A.flag('c2q_son_back') && !A.flag('c2q_son_end')) {
          await A.says([T('阿德：「娘……我回來了。我輸了，輸得一塌糊塗……」', 'Ade: "Mother… I\'m home. I lost. I lost badly…"'), T('婦人：「傻孩子……你能平安回來，娘就什麼都不要了。」', 'Woman: "Silly boy… you\'re home safe. That\'s all I ever wanted."'),
            T('母子倆抱在一起，哭了很久很久。', 'Mother and son hold each other and cry for a long, long time.'),
            T('阿德：「公主殿下，謝謝您。這是我在競技場戴過的護手……希望它能幫上您。」', 'Ade: "Princess, thank you. These are the gauntlets I wore in the arena… I hope they help you."')]);
          A.set('c2q_son_end'); A.give('ironfist'); A.sfx('chest'); return A.say(T('得到了鐵護手！', 'Received Iron Gauntlets!'));
        }
        if (A.flag('c2q_son_end')) return A.say(T('婦人：「阿德說，等公主殿下回來，要再跟您比一場呢。」', 'Woman: "Ade says he wants a rematch when you come back, Princess."'));
        A.set('c2q_son_ask');
        return A.says([T('婦人：「我的兒子阿德說要成為最強的鬥士，去了競技之都……已經一年沒有消息了。」', 'Woman: "My son Ade went to Arena City to become the strongest fighter… I haven\'t heard from him in a year."'),
          T('婦人：「不管他是輸是贏，我只想知道他平不平安……」', 'Woman: "Win or lose, I only want to know he\'s safe…"')]);
      } },
      { x: 1, y: 5, look: 'man', dir: 'up', when: (A) => A.flag('c2q_son_back'), talk: (A) => A.say(T('阿德：「輸了也沒關係……我現在明白了。謝謝您，公主殿下。」', 'Ade: "It\'s all right to lose… I understand that now. Thank you, Princess."')) },
      rancher(16, 7),
    ] });
  M.c2_spring.onEnter = async (A) => {
    if (A.ch() === 2 && !A.flag('c2_out')) {
      A.set('c2_out');
      await A.says([T('莉雅：「哇——！這就是城牆外面的世界！」', 'Rhea: "Wow! So this is the world outside the walls!"'), T('巴洛：「公主殿下，請別跑太遠……老夫的腰……」', 'Barlow: "Princess, please don\'t run so far ahead… my poor back…"'),
        T('卡斯：「呵呵，先在鎮上打聽一下國王陛下的病吧。」', 'Cass: "Heh. Let\'s ask around town about His Majesty\'s illness first."')]);
    }
  };
  Object.assign(M, dungeon('c2_cave', 23, 'cave', 2, { enc: 'cave2', bg: 'cave', name: ['西爾峰洞窟', 'Windpeak Cave'],
    floors: { 1: { chests: [{ item: 'magicstaff' }, { item: 'herb' }, { gold: 150 }] },
      2: { chests: [{ item: 'chain' }, { item: 'elfwater' }],
        tiles: [{ at: (a) => a.end, c: 'A' }],
        npcs: [{ at: (a) => [a.end[0], a.end[1] + 1], look: 'sage', dir: 'up', when: (A) => A.ch() === 2 && !A.has('songstone') && !A.flag('c2_voice'), talk: async (A) => {
          await A.says([T('隱者：「妳是為了國王的聲音而來的吧。」', 'Hermit: "You came for the king\'s voice, didn\'t you."'), T('隱者：「這是歌之石。願它的歌聲帶回妳父親的聲音。」', 'Hermit: "This is the Song Stone. May its song return your father\'s voice."')]);
          A.give('songstone'); await A.say(T('得到了歌之石！', 'Received the Song Stone!'));
        } }] } } }));
  M.c2_arena = makeTown({ buildings: { tl: 'tavern', tr: 'inn', bl: 'equip', br: 'item' }, deco: [[8, 1, 'S'], [12, 7, 'F'], [8, 9, 'F']],
    keepers: { tl: { look: 'soldier', talk: async (A) => {
      if (A.ch() !== 2) return A.say(T('接待員：「武術大會這陣子停辦了。」', 'Receptionist: "The tournament is on hold for now."'));
      if (A.flag('c2_won')) return A.say(T('接待員：「冠軍莉雅公主萬歲！……咦，聽說桑達王宮好像出了什麼事？」', 'Receptionist: "Long live our champion, Princess Rhea! …Wait, I heard something has happened at Sandar Palace?"'));
      await A.says([T('接待員：「歡迎來到武術大會！要連贏四場才能成為冠軍。」', 'Receptionist: "Welcome to the tournament! Win four bouts in a row to become champion."'), T('接待員：「比賽中途不能休息喔。」', 'Receptionist: "No resting between bouts."')]);
      if (await A.ask(T('要參加嗎？', 'Will you enter?'), [T('參加', 'Enter'), T('不了', 'Not yet')]) !== 0) return;
      const bouts = [[['gladiator', 1]], [['wolf', 3]], [['vulture', 1]], [['ironclaw', 1]]];
      for (let i = 0; i < bouts.length; i++) {
        await A.say(T(`第 ${i + 1} 戰，開始！`, `Bout ${i + 1}, begin!`));
        if (i === 3) await A.say(T('鐵爪將軍：「哼，公主？小丫頭也想當冠軍？讓我把妳撕碎吧！」', 'General Ironclaw: "Hmph, a princess? A little girl wants to be champion? I\'ll tear you apart!"'));
        const r = await A.battle(bouts[i], { bg: 'castle', noFlee: true, noRecruit: true });
        if (r !== 'win') return;
      }
      A.set('c2_won');
      await A.says([T('接待員：「冠軍是——桑達王國的莉雅公主！！」', 'Receptionist: "Your champion — Princess Rhea of Sandar!!"'), T('觀眾的歡呼聲響徹了整個競技場。', 'The roar of the crowd fills the arena.'), T('士兵：「公、公主殿下！王宮出大事了！請您快回去！」', 'Soldier: "P-princess! Something terrible has happened at the palace! Please hurry back!"')]);
    } }, tr: innKeeper(10), bl: shopKeeper(EQUIP.arena), br: shopKeeper(ITEMS1) },
    npcs: [
      { x: 8, y: 4, look: 'man', dir: 'down', move: true, talk: (A) => A.say(T('鬥士：「今年的大會有個叫鐵爪將軍的怪物參賽，強得嚇人。」', 'Fighter: "This year a monster called General Ironclaw has entered. He\'s terrifyingly strong."')) },
      { x: 11, y: 10, look: 'woman', dir: 'down', move: true, talk: (A) => A.say(T('觀眾：「聽說鐵爪將軍其實是某個帝王派來找勇者的……」', 'Spectator: "They say Ironclaw was sent by some emperor to hunt for the Hero…"')) },
      // side story: the young fighter who could not go home
      { x: 16, y: 7, look: 'man', dir: 'left', when: (A) => A.ch() === 2 && !A.flag('c2q_son_back'), talk: async (A) => {
        if (!A.flag('c2q_son_ask')) return A.say(T('年輕鬥士：「我要在這裡變強……變強之前，絕不回家。」', 'Young fighter: "I\'ll get strong here… and I won\'t go home until I do."'));
        await A.says([T('年輕鬥士：「……妳說我娘在找我？」', 'Young fighter: "…My mother is looking for me?"'), T('阿德：「我在第一戰就輸了。沒臉回去見她……我說過要成為最強的。」', 'Ade: "I lost my very first bout. I can\'t face her… I swore I\'d be the strongest."'),
          T('莉雅：「我練功的時候也輸過好幾百次！輸了，就再站起來嘛！」', 'Rhea: "I\'ve lost hundreds of times in training! When you lose, you just get back up!"'),
          T('莉雅：「而且，你娘才不在乎你是不是最強。她只是想看到你。」', 'Rhea: "Besides, your mother doesn\'t care if you\'re the strongest. She just wants to see you."'),
          T('阿德：「……公主殿下……」', 'Ade: "…Princess…"'), T('阿德：「好，我這就回泉水鎮！」', 'Ade: "Right. I\'m going home to Springvale!"')]);
        A.set('c2q_son_back');
      } },
      { x: 5, y: 7, look: 'rhea', dir: 'down', when: (A) => A.ch() === 5 && !A.flag('r_rhea'), talk: async (A) => {
        await A.says([T('莉雅：「你就是勇者？太好了！我們一直在找你！」', 'Rhea: "You\'re the Hero? Great! We\'ve been looking for you!"'), T('巴洛：「王宮的大家被魔族擄走了。要救他們，就得打倒那個暗帝。」', 'Barlow: "Our people were taken by the demons. To save them, we must defeat that Dark Emperor."'), T('卡斯：「勇者大人，請讓我們同行！」', 'Cass: "Hero, please let us come with you!"')]);
        A.set('r_rhea'); await A.join('rhea'); await A.join('barlow'); await A.join('cass');
      } },
    ] });

  // ======================= chapter 3: the merchant =======================
  M.c3_lake = makeTown({ buildings: { tl: 'house', tr: 'item', bl: 'equip', br: 'inn' }, deco: [[1, 9, 'w'], [1, 10, 'w'], [1, 11, 'w'], [18, 2, 'F'], [8, 10, 'o'], [8, 11, 'o']],
    keepers: { tl: { look: 'woman', talk: async (A) => {
      if (A.ch() === 5) return A.say(T('妮爾：「我先生在店裡喔。勇者大人，請好好照顧他。」', 'Nell: "My husband is at the shop. Please take good care of him, Hero."'));
      await A.says(A.flag('c3_shop') ? [T('妮爾：「親愛的，恭喜你！我們終於有自己的店了！」', 'Nell: "Darling, congratulations! We finally have our own shop!"')]
        : [T('妮爾：「親愛的，你的夢想是開一間全世界最棒的武器店吧？」', 'Nell: "Darling, your dream is to open the finest weapon shop in the world, isn\'t it?"'), T('妮爾：「鎮上的老店主說要退休了，只要 3000 枚金幣就肯把店賣給你喔。」', 'Nell: "The old shopkeeper says he\'s retiring and will sell you his shop for 3000 gold."'), T('妮爾：「西邊的舊礦坑據說有很多寶石，賣掉就能湊到錢了！」', 'Nell: "They say the Old Mine to the west is full of gems. Sell them and you\'ll have the money!"')]);
      await A.saveOffer(T('妮爾', 'Nell'));
    } }, tr: shopKeeper(ITEMS1), bl: shopKeeper(EQUIP.lake), br: innKeeper(10) },
    npcs: [
      { x: 8, y: 7, look: 'oldman', dir: 'down', talk: async (A) => {
        if (A.ch() === 5) {
          if (A.flag('r_tolle')) return A.say(T('老店主：「托爾的店生意很好喔，快去看看吧！」', 'Old shopkeeper: "Tolle\'s shop is doing great business. Go and see!"'));
          await A.says([T('托爾：「歡迎光臨托爾商店！……咦？你是……勇者大人！？」', 'Tolle: "Welcome to Tolle\'s Emporium! …Eh? You\'re… the Hero!?"'), T('托爾：「我聽說了預言的事。店交給妮爾就好——讓我跟你們一起去吧！做生意的頭腦和一把好斧頭，都會派上用場的！」', 'Tolle: "I\'ve heard of the prophecy. Nell can run the shop — let me come with you! A merchant\'s head and a good axe will come in handy!"')]);
          A.set('r_tolle'); return A.join('tolle');
        }
        if (A.flag('c3_shop')) return A.say(T('老店主：「店就交給你了，托爾。」', 'Old shopkeeper: "The shop is yours now, Tolle."'));
        await A.say(T('老店主：「我老了，這家店就以 3000 金幣讓給有心人吧。」', 'Old shopkeeper: "I\'m old now. I\'ll sell this shop to someone with heart, for 3000 gold."'));
        if (await A.ask(T('要買下店面嗎？（3000 G）', 'Buy the shop? (3000 G)'), [T('買！', 'Buy it!'), T('還不夠', 'Not yet')]) !== 0) return;
        if (!A.pay(3000)) return A.say(T('老店主：「錢還不夠喔。去礦坑找找寶石吧。」', 'Old shopkeeper: "Not enough yet. Try finding gems in the mine."'));
        A.set('c3_shop'); A.music('inn');
        await A.says([T('托爾買下了店面！', 'Tolle buys the shop!'), T('托爾：「太好了！從今天起，這裡就是托爾商店！」', 'Tolle: "Wonderful! From today, this is Tolle\'s Emporium!"'), T('托爾的店生意興隆，沒過多久，他就成了遠近馳名的大商人。', 'The shop prospers, and before long Tolle is a famous merchant.'), T('他用賺來的錢出資，開通了連接世界各地的山中隧道——', 'With his fortune he pays to dig tunnels through the mountains, linking every corner of the world —'), T('一條為了勇者而開的路。', 'a road opened for the Hero.')]);
        return A.chapterEnd(3);
      } },
      { x: 11, y: 4, look: 'child', dir: 'down', move: true, talk: async (A) => {
        // side story: a birthday present for Nell
        if (A.ch() !== 3) return A.say(T('托爾的兒子：「爸爸是全世界最棒的商人！」', 'Tolle\'s son: "My dad is the best merchant in the whole world!"'));
        if (A.has('starstone')) {
          await A.says([T('托爾的兒子：「哇——！好漂亮！跟星星一樣！」', 'Tolle\'s son: "Wow! It\'s beautiful! Just like a star!"'), T('兒子捧著星之石，跑進了家裡。', 'The boy runs into the house, holding the Star Stone in both hands.'),
            T('妮爾：「這是……星之石？你們還記得我說過的話……」', 'Nell: "This is… a Star Stone? You remembered what I said…"'),
            T('妮爾：「小時候在礦坑邊看到的光……我以為這種小事，早就被忘記了。」', 'Nell: "The light I saw by the mine when I was little… I thought such a small thing was long forgotten."'),
            T('托爾：「我們家的事，怎麼會是小事。」', 'Tolle: "Nothing about our family is a small thing."'),
            T('妮爾：「……謝謝。這是我收過最棒的生日禮物。」', 'Nell: "…Thank you. It\'s the best birthday present I\'ve ever had."'),
            T('妮爾：「這是我偷偷存下來的錢。拿去吧，當作開店的資金！」', 'Nell: "Here — money I\'ve been saving in secret. Put it toward the shop!"')]);
          A.take('starstone'); A.set('c3q_star'); A.addGold(300); A.sfx('chest'); return A.say(T('得到了 300 枚金幣！', 'Received 300 gold!'));
        }
        if (A.flag('c3q_star')) return A.say(T('托爾的兒子：「媽媽每天晚上都把星之石放在窗邊喔。」', 'Tolle\'s son: "Every night Mum puts the Star Stone on the windowsill."'));
        A.set('c3q_star_ask');
        return A.says([T('托爾的兒子：「爸爸！下禮拜是媽媽的生日喔！」', 'Tolle\'s son: "Dad! It\'s Mum\'s birthday next week!"'),
          T('托爾的兒子：「媽媽說，她小時候在礦坑附近看過會發光的「星之石」，好想再看一次。」', 'Tolle\'s son: "Mum says when she was little she saw a glowing Star Stone near the mine. She wishes she could see one again."'),
          T('托爾的兒子：「爸爸去礦坑的時候，可以幫我找找嗎？拜託！」', 'Tolle\'s son: "When you go to the mine, can you look for one? Please!"')]);
      } },
      // side story: the miner's widow
      { x: 18, y: 4, look: 'woman', dir: 'left', talk: async (A) => {
        if (A.has('locket')) {
          await A.says([T('寡婦：「這、這個墜子……是我先生的！」', 'Widow: "Th-this locket… it was my husband\'s!"'),
            T('寡婦：「十年前礦坑崩塌，他再也沒有回來。出門前他還說，晚上要回來吃我煮的燉菜……」', 'Widow: "Ten years ago the mine fell in, and he never came home. That morning he said he\'d be back for my stew…"'),
            T('寡婦：「墜子裡……是我們的結婚畫像。他一直把它帶在身上……」', 'Widow: "Inside… is our wedding portrait. He always kept it with him…"'),
            T('托爾：「這是您的東西，請收下吧。」', 'Tolle: "This belongs to you. Please, take it."'),
            T('寡婦：「謝謝你，托爾。你一定會成為了不起的商人——因為你懂得什麼東西是無價的。」', 'Widow: "Thank you, Tolle. You\'ll be a great merchant — because you know what can\'t be bought."'),
            T('寡婦：「這條項鍊是他送我的。現在，請你帶著它，去實現你的夢想吧。」', 'Widow: "He gave me this necklace. Now please take it, and go make your dream come true."')]);
          A.take('locket'); A.set('c3q_locket'); A.give('goldneck'); A.sfx('chest'); return A.say(T('得到了黃金項鍊！', 'Received a Gold Necklace!'));
        }
        if (A.flag('c3q_locket')) return A.say(T('寡婦：「每天晚上，我都會對著墜子跟他說說話。」', 'Widow: "Every night I talk to him a little, holding the locket."'));
        if (A.ch() === 3) A.set('c3q_locket_ask');
        return A.say(T('寡婦：「我先生是礦工……十年前，在舊礦坑的最深處……」', 'Widow: "My husband was a miner… ten years ago, deep in the Old Mine…"'));
      } },
      rancher(1, 4),
      { x: 14, y: 7, look: 'man', dir: 'down', move: true, talk: (A) => A.say(T('鎮民：「商人托爾賣東西的時候總能賣個好價錢呢。」', 'Townsman: "Tolle always gets a good price when he sells things."')) },
      { x: 5, y: 7, look: 'soldier', dir: 'down', talk: (A) => A.say(T('礦工：「礦坑最深處有個會動的巨大石像，大家都不敢再進去了。」', 'Miner: "There\'s a giant moving statue at the bottom of the mine. Nobody dares go in anymore."')) },
    ] });
  Object.assign(M, dungeon('c3_mine', 37, 'cave', 2, { enc: 'mine', bg: 'cave', name: ['舊礦坑', 'Old Mine'],
    floors: { 1: { chests: [{ item: 'ruby' }, { item: 'herb' }, { gold: 220 }, { item: 'ishield' }, { item: 'starstone', when: (A) => A.ch() === 3 && A.flag('c3q_star_ask') }] },
      2: { chests: [{ item: 'sapphire' }, { item: 'elfwater' }, { item: 'ruby' }, { item: 'locket', when: (A) => A.ch() === 3 && A.flag('c3q_locket_ask') }],
        npcs: [
          { at: (a) => a.end, look: 'mon:minegolem', dir: 'down', when: (A) => !A.flag('c3_boss'), talk: async (A) => {
            await A.say(T('巨大的石像緩緩地動了起來……！', 'The giant statue slowly begins to move…!'));
            if (await A.battle([['minegolem', 1]], { bg: 'cave' }) !== 'win') return;
            A.set('c3_boss'); await A.say(T('石像崩塌了。後面露出了一座閃閃發光的黃金像！', 'The statue crumbles. Behind it gleams a golden statue!'));
          } },
          { at: (a) => [a.end[0], a.end[1] + 1], look: 'mon:metal', dir: 'down', when: (A) => A.flag('c3_boss') && !A.flag('c3_statue') && A.ch() === 3, talk: async (A) => { A.set('c3_statue'); A.give('goldstatue'); A.sfx('chest'); await A.say(T('得到了黃金像！賣掉一定很值錢！', 'Got the Golden Statue! It must be worth a fortune!')); } },
        ] } } }));

  // ======================= chapter 4: the sisters =======================
  M.c4_oasis = makeTown({ buildings: { tl: 'tavern', tr: 'inn', bl: 'equip', br: 'church' }, deco: [[1, 8, 'w'], [1, 9, 'w'], [1, 10, 'w'], [1, 11, 'w'], [1, 2, 'T'], [18, 2, 'T']],
    keepers: { tl: { look: 'dancerw', talk: async (A) => {
      if (A.ch() === 4 && !A.flag('c4_done')) return A.says([T('劇場老闆：「米菈的舞蹈是我們綠洲的寶。可是她的眼神裡總帶著悲傷……」', 'Theatre owner: "Mira\'s dancing is the treasure of our oasis. But there\'s always sorrow in her eyes…"'), T('劇場老闆：「她們的父親艾德根，被弟子巴爾加殺害了。巴爾加就住在南方沙漠的鍊金之塔裡。」', 'Theatre owner: "Their father Edgan was murdered by his apprentice, Barga. Barga lives in the Alchemist\'s Tower in the southern desert."')]);
      return A.say(T('劇場老闆：「米菈和希雅回來了！今晚的舞會一定很熱鬧。」', 'Theatre owner: "Mira and Thea are back! Tonight\'s show will be wonderful."'));
    } }, tr: innKeeper(15), bl: shopKeeper(EQUIP.oasis), br: priest },
    npcs: [
      { x: 15, y: 4, look: 'orin', dir: 'left', when: (A) => A.ch() === 4 && !A.flag('orin'), talk: async (A) => {
        await A.says([T('奧林：「米菈、希雅！是要去找巴爾加報仇吧？」', 'Orin: "Mira, Thea! You\'re going after Barga, aren\'t you?"'), T('奧林：「艾德根老師對我恩重如山。我奧林的拳頭，就借給妳們吧！」', 'Orin: "Master Edgan was everything to me. Let my fists be yours!"')]);
        A.set('orin'); await A.join('orin');
      } },
      { x: 8, y: 3, look: 'man', dir: 'down', move: true, talk: (A) => A.say(T('商人：「沙漠裡的沙蟲會從腳下冒出來，要小心。」', 'Trader: "Sand vipers burst up from under your feet in the desert. Be careful."')) },
      { x: 11, y: 11, look: 'woman', dir: 'down', move: true, talk: (A) => A.say(T('婦人：「艾德根大人研究的是能讓生物進化的秘法……巴爾加就是為了那個才下手的。」', 'Woman: "Lord Edgan was studying the secret of evolution… that is why Barga killed him."')) },
      { x: 5, y: 7, look: 'oldman', dir: 'down', talk: (A) => A.say(T('老人：「鍊金之塔在綠洲的東南方。塔頂就是巴爾加的實驗室。」', 'Old man: "The Alchemist\'s Tower lies south-east of the oasis. Barga\'s laboratory is at the top."')) },
      // side story: the little dancer
      { x: 18, y: 4, look: 'child', dir: 'left', talk: async (A) => {
        if (A.has('desertrose')) {
          await A.says([T('莎拉：「沙漠玫瑰！姐姐們真的幫我找到了！」', 'Sara: "A desert rose! You really found one!"'), T('米菈陪著莎拉，把花放在了她母親的墓前。', 'Mira walks with Sara and lays the flower on her mother\'s grave.'),
            T('米菈：「莎拉，妳想學跳舞嗎？……來，先踏出這一步。」', 'Mira: "Sara, do you want to learn to dance? …Here, take this first step."'),
            T('莎拉笑著轉了一圈，裙擺在夕陽下閃閃發光。', 'Sara laughs and twirls, her skirt glittering in the setting sun.'),
            T('希雅：「姐姐，好久沒看到妳這樣笑了。」', 'Thea: "Sister, I haven\'t seen you smile like that in so long."'),
            T('米菈：「……是啊。說不定，我們也該為了活著的人跳舞。」', 'Mira: "…You\'re right. Maybe we should dance for the living, too."'),
            T('莎拉：「這是媽媽的戒指。媽媽說，跳舞的人不能睡著！送給姐姐！」', 'Sara: "This was Mum\'s ring. She said a dancer must never fall asleep! It\'s for you!"')]);
          A.take('desertrose'); A.set('c4q_rose'); A.give('wakering'); A.sfx('chest'); return A.say(T('得到了清醒之戒！', 'Received a Ring of Waking!'));
        }
        if (A.flag('c4q_rose')) return A.say(T('莎拉：「等我長大，要和米菈姐姐一起上台！」', 'Sara: "When I grow up I\'ll dance on stage with Mira!"'));
        if (A.ch() === 4) A.set('c4q_rose_ask');
        return A.says([T('小女孩：「我叫莎拉。我也想像米菈姐姐一樣跳舞……」', 'Little girl: "I\'m Sara. I want to dance like Mira…"'),
          T('莎拉：「媽媽以前也是舞孃。我想在媽媽的墓前放一朵沙漠玫瑰……可是那種花，只開在鍊金之塔裡。」', 'Sara: "Mum was a dancer too. I want to put a desert rose on her grave… but they only grow inside the Alchemist\'s Tower."')]);
      } },
      rancher(16, 7),
      { x: 15, y: 4, look: 'mira', dir: 'left', when: (A) => A.ch() === 5 && !A.flag('r_mira'), talk: async (A) => {
        await A.says([T('米菈：「你就是勇者？命運真是奇妙呢。」', 'Mira: "You\'re the Hero? Fate is a strange thing."'), T('希雅：「我的水晶球裡一直映著你的身影。暗帝索爾札——他就是父親之仇的真正元兇。」', 'Thea: "Your face has been in my crystal ball for a long time. Solzar, the Dark Emperor — he is the true cause of our father\'s death."'), T('奧林：「我們三個都跟你走！」', 'Orin: "All three of us are with you!"')]);
        A.set('r_mira'); await A.join('mira'); await A.join('thea'); await A.join('orin');
      } },
    ] });
  Object.assign(M, dungeon('c4_tower', 53, 'tower', 3, { enc: 'tower', bg: 'tower', name: ['鍊金之塔', 'Alchemist\'s Tower'], size: { w: 22, h: 16 },
    floors: { 1: { chests: [{ item: 'herb' }, { gold: 400 }, { item: 'silk' }, { item: 'desertrose', when: (A) => A.ch() === 4 && A.flag('c4q_rose_ask') }] },
      2: { chests: [{ item: 'magicrobe' }, { item: 'elfwater' }, { item: 'ishield' }],
        // side story: their father's last words
        npcs: [{ at: (a) => a.mid[2], look: 'sage', dir: 'down', when: (A) => A.ch() === 4 && !A.flag('c4q_edgan'), talk: async (A) => {
          await A.says([T('書架前，浮現出一個朦朧的身影……', 'Before the bookshelves, a faint figure shimmers into view…'), T('希雅：「……父親？」', 'Thea: "…Father?"'),
            T('艾德根：「米菈、希雅……我的女兒們。妳們長大了呢。」', 'Edgan: "Mira, Thea… my daughters. How you have grown."'),
            T('艾德根：「我知道妳們是為了我而來的。但是，答應我一件事——」', 'Edgan: "I know you came here for my sake. But promise me one thing —"'),
            T('艾德根：「不要讓仇恨吞沒了妳們。米菈的舞，希雅的笑容，是我這一生最驕傲的寶物。」', 'Edgan: "Do not let hatred swallow you. Mira\'s dancing and Thea\'s smile were the proudest treasures of my life."'),
            T('米菈：「父親……我們好想您……」', 'Mira: "Father… we miss you so much…"'),
            T('艾德根：「我一直都在妳們身邊。……去吧。活下去，然後要幸福地活下去。」', 'Edgan: "I am always beside you. …Go now. Live — and live happily."'),
            T('身影化作點點光芒消失了。原地留下了一枚戒指。', 'The figure scatters into motes of light. A ring is left where he stood.')]);
          A.set('c4q_edgan'); A.give('prayerring'); A.sfx('chest'); await A.say(T('得到了祈禱戒指！', 'Received a Prayer Ring!'));
        } }] },
      3: { chests: [{ item: 'leaf' }, { item: 'skyshield', when: (A) => A.ch() === 5 }],
        npcs: [{ at: (a) => a.end, look: 'mon:barga', dir: 'down', when: (A) => !A.flag('c4_boss'), talk: async (A) => {
          await A.says([T('巴爾加：「喲，這不是老師的女兒們嗎？來為那老頭子報仇？」', 'Barga: "Well, if it isn\'t the master\'s daughters. Come to avenge the old man?"'), T('巴爾加：「進化之秘法早已獻給了偉大的暗帝索爾札大人！妳們就去陪老頭子吧！」', 'Barga: "The secret of evolution now belongs to the great Dark Emperor Solzar! Go and join your father!"')]);
          if (await A.battle([['barga', 1]], { bg: 'tower' }) !== 'win') return;
          A.set('c4_boss'); A.music('sad');
          await A.says([T('巴爾加：「可……可惡……索爾札大人……會替我……」', 'Barga: "Cu… curse you… Lord Solzar… will avenge…"'), T('巴爾加化作了塵土。', 'Barga crumbles to dust.'), T('希雅：「父親……我們替您報仇了。」', 'Thea: "Father… we have avenged you."'), T('米菈：「可是，真正的仇人是那個暗帝。希雅，我們走吧——去找能打倒他的人。」', 'Mira: "But the real enemy is that Dark Emperor. Thea, let\'s go — and find the one who can defeat him."')]);
          if (A.flag('c4q_edgan')) await A.say(T('希雅：「姐姐，父親說要我們幸福地活下去……我們一定做得到的。」', 'Thea: "Sister, Father told us to live happily… I know we can."'));
          return A.chapterEnd(4);
        } }] } } }));

  // ======================= chapter 5: the hero =======================
  M.c5_hidden = Object.assign(makeTown({ buildings: { tl: 'house', tr: 'house', bl: 'church', br: 'house' }, deco: [[1, 2, 'F'], [18, 2, 'F'], [8, 9, 'F'], [12, 7, 'F']],
    keepers: { tl: { look: 'woman', when: (A) => !A.flag('c5_attack'), talk: (A) => A.say(T('媽媽：「今天的劍術練習也很努力呢。快去找莉娜玩吧。」', 'Mother: "You trained hard with the sword today. Go and play with Lina."')) },
      tr: { look: 'oldman', when: (A) => !A.flag('c5_attack'), talk: (A) => A.c5Attack() }, bl: { look: 'priestn', when: (A) => !A.flag('c5_attack'), talk: (A) => A.church() }, br: { look: 'man', when: (A) => !A.flag('c5_attack'), talk: (A) => A.say(T('爸爸：「孩子，總有一天你會知道自己的使命。」', 'Father: "Child, one day you will know your destiny."')) } },
    npcs: [
      { x: 8, y: 7, look: 'dancerw', dir: 'down', when: (A) => !A.flag('c5_attack'), talk: (A) => A.say(T('莉娜：「嘿嘿，我學會了變身魔法喔！看——我變成你的樣子了！」', 'Lina: "Hee hee, I learned a transformation spell! Look — now I look just like you!"')) },
      { x: 11, y: 3, look: 'soldier', dir: 'down', when: (A) => !A.flag('c5_attack'), talk: (A) => A.say(T('劍術老師：「這座村子藏在山中，是為了保護你啊。」', 'Sword master: "This village is hidden in the mountains to protect you."')) },
      { x: 4, y: 11, look: 'man', dir: 'down', when: (A) => A.flag('c5_attack'), talk: (A) => A.say(A.flag('c5q_feather') ? T('（村子已經化為廢墟……只剩下風聲。）', '(The village lies in ruins… only the wind remains.)')
        : T('（村子已經化為廢墟……莉娜以前常站的地方，好像有什麼東西在發光。）', '(The village lies in ruins… where Lina used to stand, something glints.)')) },
    ] }), {
    // side story: Lina's feather cap
    checks: {
      '8,7': async (A) => {
        if (!A.flag('c5_attack') || A.flag('c5q_feather')) return;
        await A.says([T('地上有一頂沾滿灰塵的羽毛帽……是莉娜的帽子。', 'A dusty feathered cap lies on the ground… Lina\'s cap.'), T('（莉娜變成你的樣子，替你引開了魔物……）', '(Lina took your shape and led the monsters away from you…)')]);
        A.set('c5q_feather'); A.give('feather'); await A.say(T('撿起了莉娜的羽毛帽。', 'You pick up Lina\'s Feather Cap.'));
      },
      '8,9': async (A) => {
        if (!A.flag('c5_attack') || A.flag('c5q_lina')) return;
        if (!A.has('feather') || !A.flag('skysword')) return A.say(T('花叢在風中輕輕搖曳。（總有一天，再回到這裡吧。）', 'The flowers sway in the wind. (Someday, come back here.)'));
        A.music('sad');
        await A.says([T('你把莉娜的羽毛帽，輕輕放在了花叢旁。', 'You gently set Lina\'s cap down beside the flowers.'), T('一陣溫暖的風吹過，花朵輕輕地搖曳。', 'A warm breeze passes, and the flowers nod.'),
          T('「……不要哭喔。我一直都在這裡。」', '"…Don\'t cry. I\'m always right here."'), T('彷彿聽見了莉娜的聲音。', 'It is as if you heard Lina\'s voice.'),
          T('帽子上的一根羽毛，閃著溫暖的光，落在你的手心。', 'One feather from the cap glows softly and drifts into your hand.')]);
        A.take('feather'); A.set('c5q_lina'); A.give('lifering'); A.sfx('chest'); await A.say(T('得到了生命戒指！', 'Received a Ring of Life!'));
        A.music('town');
      },
    },
    onEnter: async (A) => { if (A.ch() === 5 && !A.flag('c5_intro')) { A.set('c5_intro'); await A.says([T('這裡是藏在群山之中的小村子。', 'This is a little village hidden among the mountains.'), T('你在這裡長大，每天跟著劍術老師練劍，和青梅竹馬的莉娜一起玩耍。', 'You grew up here, training with the sword master every day and playing with your childhood friend Lina.'), T('（去村長家看看吧。村長住在右上方的房子。）', '(Visit the elder. He lives in the house at the top right.)')]); } } });
  M.c5_cross = makeTown({ buildings: { tl: 'inn', tr: 'item', bl: 'equip', br: 'church' }, deco: [[8, 9, 'S'], [1, 2, 'F'], [18, 11, 'F']],
    keepers: { tl: innKeeper(20), tr: shopKeeper(ITEMS5), bl: shopKeeper(EQUIP.cross), br: priest },
    npcs: [
      { x: 8, y: 3, look: 'oldman', dir: 'down', talk: (A) => A.say(T('占星師：「被命運引導的夥伴，散落在世界的四個角落：北方的王國、東方的競技之都、西方的湖畔、南方的綠洲。」', 'Astrologer: "Your companions, guided by fate, are scattered to the four corners: the northern kingdom, the eastern Arena City, the western Lakeside and the southern Oasis."')) },
      { x: 11, y: 4, look: 'merchant', dir: 'down', talk: (A) => A.say(T('馬車商人：「夥伴多了就用馬車吧！最多四人上陣，其餘的人坐在馬車裡，隨時可以換人。不過洞窟和塔裡進不去喔。」', 'Wagon merchant: "With a big party you\'ll want a wagon! Four fight up front; the rest ride along and can swap in anytime — just not in caves and towers."')) },
      { x: 14, y: 7, look: 'sage', dir: 'down', talk: (A) => A.say(A.flag('skysword') ? T('賢者：「天空之劍已經甦醒，北方魔王城的瘴氣消散了！」', 'Sage: "The Sword of Heaven has awakened. The blight around the Dark Castle in the north is gone!"') : T('賢者：「南方的天空神殿沉睡著天空之劍。只有聚齊所有被引導者，神殿的門才會打開。」', 'Sage: "The Sword of Heaven sleeps in the Sky Shrine to the south. Only when all the guided ones are gathered will its doors open."')) },
      { x: 5, y: 7, look: 'woman', dir: 'down', move: true, talk: (A) => A.say(T('旅人：「山中的隧道開通之後，四面八方的旅人都聚到這裡來了。」', 'Traveller: "Since the mountain tunnels opened, travellers from every corner come through here."')) },
      // side story: a campfire for the chosen ones
      { x: 18, y: 4, look: 'man', dir: 'left', talk: async (A) => {
        if (A.flag('c5q_camp')) return A.say(T('吟遊詩人：「那一夜的營火，我會寫成歌，唱給後世的人聽。」', 'Bard: "I will make a song of that campfire night, and sing it for those who come after."'));
        if (!['r_kaldor', 'r_rhea', 'r_tolle', 'r_mira'].every((f) => A.flag(f))) return A.say(T('吟遊詩人：「等所有被引導的人都聚齊了，再來聽我唱歌吧。」', 'Bard: "When all the guided ones are gathered, come and hear me sing."'));
        A.music('inn');
        await A.says([T('吟遊詩人：「被引導的人們啊，今晚就在這裡升起營火吧。」', 'Bard: "Guided ones, light a campfire here tonight."'), T('夜深了。大家圍著營火坐了下來。', 'Night falls. Everyone sits down around the fire.'),
          T('卡爾德：「我曾經只是為了國王的命令而揮劍。現在，我是為了你們。」', 'Kaldor: "Once I swung my sword because my king commanded it. Now I swing it for all of you."'),
          T('莉雅：「我要找回父王和王宮的大家！還要讓全世界的人都能笑著練功！」', 'Rhea: "I\'ll bring back Father and everyone from the palace! And make a world where everyone can train with a smile!"'),
          T('巴洛：「老夫答應了一位老朋友，要把旅途上的風景，全都說給他聽。」', 'Barlow: "I promised an old friend I would describe every sight of this journey to him."'),
          T('卡斯：「我只是祈禱，每個人都能平安地回家。」', 'Cass: "I only pray that everyone gets home safely."'),
          T('托爾：「妮爾和兒子在等我。我要當一個讓他們驕傲的爸爸。」', 'Tolle: "Nell and my boy are waiting. I want to be a father they can be proud of."'),
          T('米菈：「父親要我們幸福地活下去。所以我要為了明天而跳舞。」', 'Mira: "Father told us to live happily. So I will dance for tomorrow."'),
          T('希雅：「水晶球裡映出的未來……是大家一起回家的畫面喔。」', 'Thea: "The future in my crystal ball… shows all of us going home together."'),
          T('奧林：「……我的拳頭，會守護這堆營火。」', 'Orin: "…My fists will guard this fire."'),
          T('你看著每個人被火光照亮的臉，想起了莉娜。', 'You look at their faces in the firelight, and think of Lina.'), T('——你已經不再是一個人了。', '— You are not alone any more.'),
          T('吟遊詩人：「這是星之墜飾，獻給今晚的勇者們。」', 'Bard: "This Star Pendant is for tonight\'s heroes."')]);
        A.set('c5q_camp'); A.give('starpendant'); A.sfx('chest'); await A.say(T('得到了星之墜飾！', 'Received a Star Pendant!'));
        A.music('town');
      } },
      rancher(1, 4),
    ] });
  M.c5_cross.onEnter = async (A) => {
    if (!A.flag('c5_cross_seen')) {
      A.set('c5_cross_seen');
      await A.says([T('你一個人走出了群山。', 'You walk out of the mountains alone.'), T('莉娜的笑容、村子的燈火……都已經不在了。', 'Lina\'s smile, the lamps of the village… all of it is gone.'),
        T('但是在前方，一定有等待著你的人。', 'But somewhere ahead, there are people waiting for you.')]);
    }
  };
  // first visits that set the scene
  M.c1_village.onEnter = async (A) => {
    if (A.ch() === 1 && !A.flag('c1_thistle')) {
      A.set('c1_thistle');
      await A.says([T('薊村一片寂靜，連狗叫聲都聽不見。', 'Thistle is silent. Not even a dog barks.'), T('家家戶戶緊閉門窗，只有一位母親站在路邊，一直望著東方的洞窟。', 'Every door and shutter is closed. Only one mother stands by the road, staring east toward the cave.')]);
    }
  };
  M.c3_lake.onEnter = async (A) => {
    if (A.ch() === 3 && A.has('goldstatue') && !A.flag('c3_home')) {
      A.set('c3_home');
      await A.says([T('托爾抱著沉甸甸的黃金像，回到了湖畔鎮。', 'Tolle comes home to Lakeside, hugging the heavy golden statue.'), T('托爾：「這下就湊得到錢了……妮爾、兒子，你們等著！」', 'Tolle: "Now I can raise the money… Nell, son, just you wait!"')]);
    }
  };
  M.c4_oasis.onEnter = async (A) => {
    if (A.ch() === 4 && !A.flag('c4_show')) {
      A.set('c4_show');
      await A.says([T('綠洲劇場的舞台上，米菈的舞蹈讓全場屏住了呼吸。', 'On the oasis stage, Mira\'s dance holds the whole theatre breathless.'), T('每一次旋轉，都像是在對天上的父親訴說著什麼。', 'Every turn seems to be telling something to their father in the sky.'),
        T('希雅：（姐姐又在跳那支舞了……父親最喜歡的那支。）', 'Thea: (She\'s dancing that one again… Father\'s favourite.)'), T('演出結束後，姐妹倆在後台緊緊握住了彼此的手。', 'After the show, the sisters hold hands tightly backstage.'),
        T('米菈：「希雅，是時候了。我們去找巴爾加。」', 'Mira: "Thea, it\'s time. Let\'s go and find Barga."')]);
    }
  };
  Object.assign(M, dungeon('c5_shrine', 71, 'shrine', 2, { enc: 'shrine', bg: 'shrine', name: ['天空神殿', 'Sky Shrine'], music: 'castle',
    floors: { 1: { chests: [{ item: 'skyarmor' }, { item: 'elfwater' }, { item: 'leaf' }] },
      2: { chests: [{ item: 'elfwater' }, { gold: 2000 }], tiles: [{ at: (a) => [a.end[0], a.end[1] - 1], c: 'A' }],
        npcs: [{ at: (a) => a.end, look: 'mon:guardian', dir: 'down', when: (A) => !A.flag('skysword'), talk: async (A) => {
          await A.says([T('天空守護者：「被選中的勇者啊……天空之劍不會交給弱者。」', 'Sky Guardian: "Chosen Hero… the Sword of Heaven will not go to the weak."'), T('天空守護者：「向我證明你們的力量吧！」', 'Sky Guardian: "Prove your strength to me!"')]);
          if (await A.battle([['guardian', 1]], { bg: 'shrine' }) !== 'win') return;
          A.set('skysword'); A.give('skysword'); A.sfx('chest');
          await A.says([T('天空守護者：「……很好。拿去吧，勇者。」', 'Sky Guardian: "…Well done. Take it, Hero."'), T('得到了天空之劍！', 'Received the Sword of Heaven!'), T('劍身綻放出耀眼的光芒——遙遠北方的黑暗瘴氣，被光芒一掃而空！', 'The blade blazes with light — and far to the north, the dark blight is swept away!')]);
        } }] } } }));
  Object.assign(M, dungeon('c5_dark', 97, 'dark', 3, { enc: 'dark', bg: 'dark', name: ['魔王城', 'Dark Castle'], music: 'boss', size: { w: 26, h: 18 },
    floors: { 1: { chests: [{ item: 'leaf' }, { item: 'elfwater' }, { gold: 3000 }] }, 2: { chests: [{ item: 'leaf' }, { item: 'elfwater' }, { item: 'platmail' }] },
      3: { tiles: [{ at: (a) => [a.end[0], a.end[1] - 1], c: 'k' }],
        npcs: [{ at: (a) => a.end, look: 'mon:solzar', dir: 'down', when: (A) => !A.flag('won'), talk: async (A) => {
          await A.says([T('索爾札：「終於來了啊，勇者。」', 'Solzar: "So you have finally come, Hero."'), T('索爾札：「人類貪婪、醜陋，只會互相殘殺。我要用進化之秘法成為新世界的神，把這個世界交給魔族！」', 'Solzar: "Humans are greedy and ugly; all they do is kill one another. With the secret of evolution I will become the god of a new world, and give it to my kind!"'), T('索爾札：「被命運引導的人們……就在這裡，結束你們的命運吧！」', 'Solzar: "You who are guided by fate… let your fate end here!"')]);
          if (await A.battle([['solzar', 1]], { bg: 'dark', final: true }) !== 'win') return;
          A.set('won'); return A.ending();
        } }] } } }));
  // where each map's edges and stairs lead
  for (const p of PLACES) if (M[p.id]) { M[p.id].place = p; if (!M[p.id].name) M[p.id].name = p.name; }
  return M;
}
export const CHAPTERS = {
  1: { title: ['第一章　王宮戰士卡爾德', 'Chapter 1: Kaldor, Royal Knight'], start: ['c1_castle', 9, 4, 'up'], party: [['kaldor', 1, { w: 'copper', a: 'clothes' }]], gold: 120, bag: { herb: 2 },
    intro: [['北國布雷索王國。', 'The northern kingdom of Bressel.'], ['南方的薊村，孩子們接連失蹤……', 'In Thistle, to the south, children are vanishing…'], ['國王召來了忠誠的王宮戰士——卡爾德。', 'The king summons his loyal knight — Kaldor.'], ['卡爾德從小在城裡長大，是個不善言詞、卻比誰都溫柔的人。', 'Kaldor grew up in the castle: a man of few words, and kinder than anyone.'], ['他還不知道，這將是一段改變世界的旅程的開始。', 'He does not yet know this is the start of a journey that will change the world.']] },
  2: { title: ['第二章　武鬥公主莉雅', 'Chapter 2: Rhea, the Martial Princess'], start: ['c2_palace', 17, 7, 'left'], party: [['rhea', 3, { w: 'claw', a: 'clothes' }]], joinLater: { barlow: [3, { w: 'stick', a: 'clothes' }], cass: [3, { w: 'stick', a: 'leather' }] }, gold: 140, bag: { herb: 3 },
    intro: [['東方的桑達王國。', 'The eastern kingdom of Sandar.'], ['公主莉雅比起刺繡，更喜歡拳腳功夫。', 'Princess Rhea prefers fighting to embroidery.'], ['她的夢想，是成為世界上最強的武術家。', 'Her dream is to become the strongest fighter in the world.'], ['可是最近，疼愛她的父王突然說不出話來了。', 'But lately, the father who dotes on her has suddenly lost his voice.'], ['莉雅望著房間牆上的裂縫，下定了決心。', 'Rhea looks at the crack in her bedroom wall, and makes up her mind.']] },
  3: { title: ['第三章　商人托爾', 'Chapter 3: Tolle the Merchant'], start: ['c3_lake', 4, 4, 'up'], party: [['tolle', 3, { w: 'copper', a: 'leather' }]], gold: 120, bag: { herb: 2 },
    intro: [['西方的湖畔鎮。', 'Lakeside, in the west.'], ['在武器店打工的托爾，有個大大的夢想——', 'Tolle, who works at the weapon shop, has a big dream —'], ['開一間屬於自己的店。', 'to open a shop of his own.'], ['為了溫柔的妻子妮爾，和最愛爸爸的兒子。', 'For his gentle wife Nell, and the son who adores him.'], ['托爾今天也早早出了門。', 'Today, as always, Tolle sets out early.']] },
  4: { title: ['第四章　米菈與希雅', 'Chapter 4: Mira and Thea'], start: ['c4_oasis', 4, 4, 'up'], party: [['mira', 4, { w: 'whip', a: 'clothes' }], ['thea', 4, { w: 'stick', a: 'clothes' }]], joinLater: { orin: [6, { w: 'claw', a: 'chain' }] }, gold: 160, bag: { herb: 3 },
    intro: [['南方沙漠的綠洲鎮。', 'An oasis town in the southern desert.'], ['舞孃米菈和占卜師希雅，是鍊金術師艾德根的女兒。', 'Mira the dancer and Thea the fortune teller are the daughters of the alchemist Edgan.'], ['姐妹倆在劇場工作，一心只想找到殺父仇人——巴爾加。', 'The sisters work at the theatre, living for one thing: to find their father\'s killer, Barga.'], ['米菈的舞讓人著迷，希雅的占卜從不出錯。', 'Mira\'s dancing enchants everyone; Thea\'s fortunes are never wrong.'], ['可是姐妹倆，已經很久沒有真心地笑過了。', 'But it has been a long time since either sister truly smiled.']] },
  5: { title: ['第五章　被引導的人們', 'Chapter 5: The Chosen Ones'], start: ['c5_hidden', 4, 4, 'up'], party: [['hero', 3, { w: 'copper', a: 'leather' }]], gold: 120, bag: { herb: 3 },
    intro: [['你，就是預言中的勇者。', 'You are the Hero of the prophecy.'], ['四個章節的人們，都被命運引導著……', 'The people of the four chapters have all been guided by fate…'], ['走向同一個目的地。', 'toward the same destination.'], ['而在群山深處的小村子裡，一個少年正在練劍。', 'And in a little village deep in the mountains, a young person is practising with a sword.'], ['他還不知道，平凡的日子，今天就要結束了。', 'They do not yet know that their ordinary days end today.']] },
};
export const ENDING = [
  ['暗帝索爾札倒下了。', 'Solzar, the Dark Emperor, has fallen.'],
  ['魔王城崩塌，籠罩世界的黑暗散去，被擄走的人們紛紛回到了家鄉。', 'The Dark Castle crumbles, the darkness lifts, and the captives return home.'],
  ['卡爾德回到布雷索城，被封為騎士團長。噗噗據說終於變成了人類的模樣。', 'Kaldor returns to Bressel and is made Captain of the Knights. Pupu, they say, finally became human.'],
  ['莉雅與父王重逢。巴洛和卡斯依然每天被她的拳頭追著跑。', 'Rhea is reunited with her father. Barlow and Cass are still chased by her fists every day.'],
  ['托爾的商店成了世界第一的大商店，妮爾和兒子都以他為傲。', 'Tolle\'s Emporium becomes the greatest shop in the world, and Nell and his son are proud of him.'],
  ['米菈和希雅回到綠洲，在父親的墓前獻上了花。奧林守護著她們的劇場。', 'Mira and Thea return to the oasis and lay flowers on their father\'s grave. Orin guards their theatre.'],
  ['薊村的老婦人病好了，她的兒子當上了衛兵隊長。提姆和小黑每天都在村口練劍。', 'In Thistle the old woman is well again, and her son is Captain of the Guard. Tim and Kuro practise swordplay at the village gate every day.'],
  ['巴洛常去泉水鎮，把旅途上的風景一一說給梅爾文聽。', 'Barlow often visits Springvale, describing every sight of the journey to Melvin.'],
  ['綠洲的劇場裡，多了一個跟著米菈跳舞的小女孩。', 'At the oasis theatre, a little girl now dances alongside Mira.'],
  ['魔物牧場的魔物們，也在陽光下快樂地奔跑著。', 'And at the Monster Ranch, the monsters run happily in the sunshine.'],
  ['而勇者——回到了群山中的村子。', 'And the Hero — returns to the village in the mountains.'],
  ['廢墟中，一朵小小的花，正在風中搖曳。', 'Among the ruins, a small flower sways in the wind.'],
  ['「歡迎回來。」似乎有人這麼說。', '"Welcome home," someone seems to say.'],
  ['── 完 ──', '── THE END ──'],
];
