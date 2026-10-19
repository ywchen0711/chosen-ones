// Balance check: for each area of each chapter, the lowest level at which the chapter's party wins its random fights
// reliably (97%+) while losing at most about a third of its HP per fight. Run: node tools/balance.mjs
// The model is plain attacks on both sides with the game's damage formulas, which is close enough for pacing.
import { MONSTERS, ZONES, xpFor, encounter } from '../js/data.js';
import { newMember, atk, defense } from '../js/party.js';
import { CHAPTERS } from '../js/maps.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const hitMon = (m, d) => { const b = (atk(m) - d.def / 2) / 2; return b < 2 ? 0.5 : b; };
const hitMem = (m, a) => { const b = (a - defense(m) / 2) / 2; return b < 2 ? 0.5 : b; };
export function fight(party, group) {
  const ps = party.map((m) => ({ m, hp: m.maxhp })), ms = group.map((id) => ({ d: MONSTERS[id], hp: MONSTERS[id].hp }));
  for (let round = 0; round < 40; round++) {
    for (const p of ps) { if (p.hp <= 0) continue; const t = ms.filter((x) => x.hp > 0).sort((a, b) => a.hp - b.hp)[0]; if (!t) break; t.hp -= hitMon(p.m, t.d) * rnd(0.85, 1.15) * (Math.random() < 1 / 24 ? 2 : 1); }
    if (!ms.some((x) => x.hp > 0)) break;
    for (const x of ms) { if (x.hp <= 0) continue; const live = ps.filter((p) => p.hp > 0); if (!live.length) break; const p = live[ri(0, live.length - 1)]; if (Math.random() < 0.04) continue; p.hp -= hitMem(p.m, x.d.atk) * rnd(0.85, 1.15); }
    if (!ps.some((p) => p.hp > 0)) break;
  }
  const max = ps.reduce((s, p) => s + p.m.maxhp, 0), left = ps.reduce((s, p) => s + Math.max(0, p.hp), 0);
  return { win: !ms.some((x) => x.hp > 0) && ps.some((p) => p.hp > 0), lost: (max - left) / max, xp: group.reduce((s, id) => s + MONSTERS[id].xp, 0) };
}
// a group as the game rolls it (kin of the area's monsters included)
const groupOf = (zone) => { const out = []; for (const [id, n] of encounter(zone)) for (let i = n; i > 0; i--) out.push(id); return out; };
export function zoneStats(members, zone, n = 600) {
  let wins = 0, lost = 0, xp = 0;
  for (let i = 0; i < n; i++) { const r = fight(members, groupOf(zone)); if (r.win) wins++; lost += r.lost; xp += r.xp; }
  return { win: wins / n, lost: lost / n, xp: xp / n };
}
// the party (ids and the gear they would have by then) for each area
export const PLAN = [
  [1, 'n1', [['kaldor', { w: 'copper', a: 'clothes' }]]],
  [1, 'cave1', [['kaldor', { w: 'copper', a: 'leather', s: 'lshield' }], ['pupu', { w: 'stick' }]]],
  [2, 'e2', [['rhea', { w: 'claw', a: 'clothes' }]]],
  [2, 'cave2', [['rhea', { w: 'claw', a: 'leather' }], ['barlow', { w: 'stick', a: 'clothes' }], ['cass', { w: 'stick', a: 'leather' }]]],
  [3, 'w3', [['tolle', { w: 'stick', a: 'clothes' }]]],
  [3, 'mine', [['tolle', { w: 'spear', a: 'chain', s: 'lshield' }]]],
  [4, 's4', [['mira', { w: 'whip', a: 'clothes' }], ['thea', { w: 'stick', a: 'clothes' }]]],
  [4, 'tower', [['mira', { w: 'chainwhip', a: 'silk' }], ['thea', { w: 'magicstaff', a: 'silk' }], ['orin', { w: 'claw', a: 'chain' }]]],
  [5, 'c5a', [['hero', { w: 'copper', a: 'leather' }]]],
  [5, 'c5b', [['hero', { w: 'steel', a: 'iron', s: 'ishield', h: 'helm' }], ['kaldor', { w: 'steel', a: 'iron', s: 'ishield' }], ['rhea', { w: 'ironclaw', a: 'chain' }], ['cass', { w: 'magicstaff', a: 'silk' }]]],
];
export function fairLevel(members, zone) {
  for (let lv = 1; lv <= 50; lv++) { const ps = members.map(([id, eq]) => newMember(id, lv, eq)), s = zoneStats(ps, zone, 400); if (s.win >= 0.97 && s.lost <= 0.34) return { lv, ...s }; }
  return { lv: 99 };
}
if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) {
  for (const [ch, zone, members] of PLAN) {
    const f = fairLevel(members, zone), start = CHAPTERS[ch].party[0][1];
    const at = zoneStats(members.map(([id, eq]) => newMember(id, start, eq)), zone);
    console.log(`ch${ch} ${zone.padEnd(6)} fair at Lv ${String(f.lv).padStart(2)} (wins ${(f.win * 100 | 0)}%, loses ${(f.lost * 100 | 0)}% HP, ${f.xp | 0} xp a fight)   at the chapter's start Lv ${start}: wins ${(at.win * 100) | 0}%, loses ${(at.lost * 100) | 0}% HP`);
  }
  // bosses: the level at which the chapter's party wins 90% of the time, and about how many fights it takes to get there
  const BOSSES = [[1, 'shade', 'cave1', [['kaldor', { w: 'copper', a: 'leather', s: 'lshield', h: 'hat' }], ['pupu', { w: 'stick', a: 'clothes' }]]],
    [2, 'ironclaw', 'cave2', [['rhea', { w: 'spear', a: 'chain' }], ['barlow', { w: 'magicstaff', a: 'silk' }], ['cass', { w: 'spear', a: 'chain' }]]],
    [3, 'minegolem', 'mine', [['tolle', { w: 'spear', a: 'iron', s: 'ishield', h: 'helm' }]]],
    [4, 'barga', 'tower', [['mira', { w: 'chainwhip', a: 'magicrobe' }], ['thea', { w: 'chainwhip', a: 'magicrobe' }], ['orin', { w: 'ironclaw', a: 'iron' }]]]];
  for (const [ch, boss, zone, ms] of BOSSES) {
    let lv = 1; for (; lv < 50; lv++) { let w = 0; for (let i = 0; i < 300; i++) if (fight(ms.map(([id, eq]) => newMember(id, lv, eq)), [boss]).win) w++; if (w / 300 >= 0.9) break; }
    const start = CHAPTERS[ch].party[0][1], per = zoneStats(ms.map(([id, eq]) => newMember(id, lv, eq)), zone, 300).xp / ms.length;
    console.log(`ch${ch} boss ${boss.padEnd(9)} fair at Lv ${lv}: about ${Math.ceil((xpFor(lv) - xpFor(start)) / Math.max(1, per))} fights from the chapter's start`);
  }
}
