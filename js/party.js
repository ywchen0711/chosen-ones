// Party members: stats from level, experience and level-ups, equipment, the shared bag. No drawing here (node can test it).
import { CHARS, ITEMS, SPELLS, xpFor, MAX_LV, canEquip } from './data.js';

export const statAt = (id, lv) => {
  const c = CHARS[id], f = (k) => Math.floor(c[k][0] + c[k][1] * (lv - 1));
  return { maxhp: f('hp'), maxmp: f('mp'), str: f('str'), def: f('def'), agi: f('agi') };
};
export const spellsAt = (id, lv) => Object.entries(CHARS[id].spells).filter(([l]) => +l <= lv).map(([, s]) => s);
export function newMember(id, lv = 1, eq = {}) {
  const st = statAt(id, lv);
  return { id, lv, xp: xpFor(lv), hp: st.maxhp, mp: st.maxmp, ...st, eq: { w: null, a: null, s: null, h: null, ...eq }, spells: spellsAt(id, lv), poison: false };
}
export const atk = (m) => m.str + (m.eq.w ? ITEMS[m.eq.w].atk : 0);
export const defense = (m) => m.def + ['a', 's', 'h'].reduce((s, k) => s + (m.eq[k] ? ITEMS[m.eq[k]].def : 0), 0) + Math.floor(m.agi / 4);
export const alive = (m) => m.hp > 0;
// experience: returns the level-ups that happened, each with what grew and which spells were learned
export function gainXp(m, n) {
  const ups = [];
  m.xp += n;
  while (m.lv < MAX_LV && m.xp >= xpFor(m.lv + 1)) {
    const before = statAt(m.id, m.lv); m.lv++;
    const after = statAt(m.id, m.lv), learned = spellsAt(m.id, m.lv).filter((s) => !m.spells.includes(s));
    for (const k of ['maxhp', 'maxmp', 'str', 'def', 'agi']) m[k] = after[k];
    m.hp += after.maxhp - before.maxhp; m.mp += after.maxmp - before.maxmp;
    m.spells.push(...learned);
    ups.push({ lv: m.lv, gain: Object.fromEntries(['maxhp', 'maxmp', 'str', 'def', 'agi'].map((k) => [k, after[k] - before[k]])), learned });
  }
  return ups;
}
export const healFull = (m) => { if (m.hp > 0 || m.revive) { m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; } };
// the bag: { item: count }
export const bagAdd = (bag, it, n = 1) => { bag[it] = (bag[it] || 0) + n; };
export const bagTake = (bag, it, n = 1) => { if ((bag[it] || 0) < n) return false; bag[it] -= n; if (!bag[it]) delete bag[it]; return true; };
export { canEquip };
export const knows = (m, sp) => m.spells.includes(sp) && SPELLS[sp];
