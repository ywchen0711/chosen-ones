// node tools/test.mjs — the data and every map: sizes, tiles, people on open ground, every place reachable, battles winnable at sensible levels
import { buildMaps, TILE, WALK, PLACES, BARRIERS, CHAPTERS, WW, WH, worldZone } from '../js/maps.js';
import { CHARS, ITEMS, SPELLS, MONSTERS, ZONES, canEquip, SLOTS, FX } from '../js/data.js';
import { newMember, gainXp, atk, defense } from '../js/party.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const M = buildMaps();
// a fake script API that answers "who's here" questions for every chapter
const fakeA = (ch, flags = {}) => ({ ch: () => ch, flag: (k) => !!flags[k], has: () => false });

for (const [id, m] of Object.entries(M)) {
  ok(`${id}: ${m.w}x${m.h}`, m.tiles.length === m.h && m.tiles.every((r) => r.length === m.w), m.tiles.map((r) => r.length).join(','));
  const bad = [...new Set(m.tiles.join('').split('').filter((c) => !TILE[c]))];
  ok(`${id}: tiles known`, !bad.length, bad.join(''));
  const walk = (x, y) => m.tiles[y] && WALK.has(TILE[m.tiles[y][x]]);
  for (const n of m.npcs || []) {
    const t = TILE[m.tiles[n.y] && m.tiles[n.y][n.x]];
    if (!['wood', 'floor', 'grass', 'path', 'stone', 'carpet', 'throne', 'flowers'].includes(t)) ok(`${id}: ${n.look} at ${n.x},${n.y} stands on ${t}`, false);
  }
  for (const c of m.chests || []) ok(`${id}: chest ${c.id} on floor`, walk(c.x, c.y), `${c.x},${c.y} ${TILE[m.tiles[c.y][c.x]]}`);
  for (const c of m.chests || []) if (c.item) ok(`${id}: chest item ${c.item} exists`, !!ITEMS[c.item]);
  // every open tile can be reached from the entry (towns from the bottom gate, dungeons from the stairs)
  if (!m.world) {
    const start = m.dungeon ? m.anchor.start : [9, m.h - 1], seen = new Set([start.join()]), q = [start];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!seen.has(k) && walk(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
    const targets = [...(m.chests || []).map((c) => [c.x, c.y]), ...(m.npcs || []).map((n) => [n.x, n.y])];
    const unreach = targets.filter(([x, y]) => ![[1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`)));
    ok(`${id}: everyone and every chest can be reached`, !unreach.length, unreach.map((p) => p.join(',')).join(' '));
    if (m.dungeon && m.anchor) ok(`${id}: the far end is reachable`, seen.has(m.anchor.end.join()) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${m.anchor.end[0] + dx},${m.anchor.end[1] + dy}`)));
  }
}
// the overworld: with the passes closed each corner reaches its own places; opened, everything is connected
const W = M.world, wk = (x, y, flags) => { const t = TILE[W.tiles[y] && W.tiles[y][x]]; if (!t) return false; if (t === 'miasma') return !!flags.skysword; if (BARRIERS.some((b) => b.x === x && b.y === y && !flags[b.flag])) return false; return WALK.has(t); };
function reach(sx, sy, flags) { const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!seen.has(k) && wk(nx, ny, flags)) { seen.add(k); q.push([nx, ny]); } } } return seen; }
const at = (id) => PLACES.find((p) => p.id === id);
const r1 = reach(at('c1_castle').x, at('c1_castle').y, {});
ok('ch1: castle, village and cave connected', ['c1_village', 'c1_cave_1'].every((id) => r1.has(`${at(id).x},${at(id).y}`)));
ok('ch1: sealed in', !r1.has(`${at('c5_cross').x},${at('c5_cross').y}`) && !r1.has(`${at('c2_palace').x},${at('c2_palace').y}`));
const r2 = reach(at('c2_palace').x, at('c2_palace').y, {}), r2b = reach(at('c2_palace').x, at('c2_palace').y, { c2_voice: true });
ok('ch2: palace, town and cave connected; the arena only after the bridge opens', ['c2_spring', 'c2_cave_1'].every((id) => r2.has(`${at(id).x},${at(id).y}`)) && !r2.has(`${at('c2_arena').x},${at('c2_arena').y}`) && r2b.has(`${at('c2_arena').x},${at('c2_arena').y}`));
const r3 = reach(at('c3_lake').x, at('c3_lake').y, {});
ok('ch3: town and mine connected', r3.has(`${at('c3_mine_1').x},${at('c3_mine_1').y}`) && !r3.has(`${at('c5_cross').x},${at('c5_cross').y}`));
const r4 = reach(at('c4_oasis').x, at('c4_oasis').y, {});
ok('ch4: oasis and tower connected', r4.has(`${at('c4_tower_1').x},${at('c4_tower_1').y}`) && !r4.has(`${at('c5_cross').x},${at('c5_cross').y}`));
const r5 = reach(at('c5_hidden').x, at('c5_hidden').y, { open: true, c2_voice: true }), r5b = reach(at('c5_hidden').x, at('c5_hidden').y, { open: true, c2_voice: true, skysword: true });
ok('ch5: every place but the dark castle reachable', PLACES.filter((p) => p.id !== 'c5_dark_1').every((p) => r5.has(`${p.x},${p.y}`)), PLACES.filter((p) => !r5.has(`${p.x},${p.y}`)).map((p) => p.id).join(' '));
ok('ch5: the dark castle opens with the Sword of Heaven', !r5.has(`${at('c5_dark_1').x},${at('c5_dark_1').y}`) && r5b.has(`${at('c5_dark_1').x},${at('c5_dark_1').y}`));
// data
for (const [k, c] of Object.entries(CHARS)) for (const s of Object.values(c.spells)) ok(`${k} learns ${s}`, !!SPELLS[s]);
for (const z of Object.values(ZONES)) for (const grp of z) for (const [id] of grp) if (!MONSTERS[id]) ok(`zone monster ${id}`, false);
for (const m of Object.values(MONSTERS)) for (const [a] of m.acts) if (a.startsWith('call:') && !MONSTERS[a.slice(5)]) ok(`call ${a}`, false);
for (const ch of Object.values(CHAPTERS)) for (const [id, , eq] of ch.party) for (const it of Object.values(eq)) ok(`${id} can equip ${it}`, canEquip(ITEMS[it], id));
// rough balance: the party at the level a player would likely have vs each boss (damage per round both ways)
const party = (list) => list.map(([id, lv, eq]) => { const m = newMember(id, lv, eq); return m; });
const duel = (ps, boss) => { const B = MONSTERS[boss]; const dealt = ps.reduce((s, m) => s + Math.max(1, (atk(m) - B.def / 2) / 2), 0); const taken = Math.max(...ps.map((m) => Math.max(1, (B.atk - defense(m) / 2) / 2))); return { rounds: Math.ceil(B.hp / dealt), hpRounds: Math.floor(Math.min(...ps.map((m) => m.maxhp)) / taken) }; };
for (const [boss, ps] of [['shade', [['kaldor', 7, { w: 'copper', a: 'leather', s: 'lshield' }], ['pupu', 6, { w: 'stick' }]]], ['ironclaw', [['rhea', 11, { w: 'claw', a: 'chain' }], ['barlow', 10, { w: 'stick', a: 'silk' }], ['cass', 10, { w: 'stick', a: 'silk' }]]],
  ['minegolem', [['tolle', 12, { w: 'spear', a: 'chain', s: 'ishield' }]]], ['barga', [['mira', 15, { w: 'chainwhip', a: 'magicrobe' }], ['thea', 15, { w: 'chainwhip', a: 'magicrobe' }], ['orin', 15, { w: 'ironclaw', a: 'iron' }]]],
  ['solzar', [['hero', 32, { w: 'skysword', a: 'skyarmor', s: 'skyshield', h: 'skyhelm' }], ['kaldor', 32, { w: 'battleaxe', a: 'platmail', s: 'mshield', h: 'helm' }], ['rhea', 32, { w: 'demonclaw', a: 'dancer' }], ['cass', 32, { w: 'sagestaff', a: 'magicrobe', s: 'mshield' }]]]]) {
  const d = duel(party(ps), boss); console.log(`     ${boss}: ~${d.rounds} rounds to win; the weakest survives ~${d.hpRounds} hits`);
}
// ---- equipment and treasure
{
  const slots = new Set(SLOTS.map(([k]) => k)), gear = Object.entries(ITEMS).filter(([, it]) => it.slot);
  ok('every piece of gear has a known slot, a known power and someone who can wear it', gear.every(([, it]) => slots.has(it.slot) && (!it.fx || FX[it.fx]) && Object.keys(CHARS).some((c) => canEquip(it, c))));
  const drops = Object.values(MONSTERS).flatMap((d) => d.drops || []);
  ok('every monster that gives experience drops something', Object.entries(MONSTERS).every(([, d]) => !d.xp || (d.drops && d.drops.length)));
  ok('every drop is a real item with a sane chance', drops.every(([it, n]) => ITEMS[it] && n >= 1));
  ok('every item has a description in both languages', Object.values(ITEMS).every((it) => it.desc && it.desc[0] && it.desc[1]), Object.keys(ITEMS).filter((k) => !ITEMS[k].desc).join(' '));
  ok('bosses always drop their treasure', ['shade', 'ironclaw', 'minegolem', 'barga', 'guardian'].every((b) => MONSTERS[b].drops.some(([, n]) => n === 1)));
  ok('each of the eight slots has gear', SLOTS.every(([k]) => gear.filter(([, it]) => it.slot === k).length >= 5), SLOTS.map(([k]) => k + gear.filter(([, it]) => it.slot === k).length).join(' '));
  const m = newMember('kaldor', 20), base = [atk(m), defense(m)]; m.eq.g = 'powergloves'; m.eq.b = 'wingboots'; m.eq.r = 'strring';
  ok('gauntlets, boots and rings add to attack and defence', atk(m) === base[0] + 8 + 5 && defense(m) > base[1], `${base} -> ${atk(m)},${defense(m)}`);
}
// ---- difficulty: every chapter's first field is fair at the level the chapter starts at
{
  const { PLAN, fairLevel } = await import('./balance.mjs');
  const firsts = [...new Map(PLAN.map((p) => [p[0], p])).values()].map((p) => PLAN.find((q) => q[0] === p[0]));
  for (const [ch, zone, ms] of firsts) { const f = fairLevel(ms, zone), start = CHAPTERS[ch].party[0][1]; ok(`chapter ${ch}: the first field (${zone}) is fair from the start`, f.lv <= start + 1, `fair at Lv ${f.lv}, starts at Lv ${start}`); }
}
console.log(fails ? `test: ${fails} failed` : 'test: all passed');
process.exit(fails ? 1 : 0);
