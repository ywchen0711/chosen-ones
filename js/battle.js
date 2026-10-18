// Battles in the classic first-person style: monsters in front, the party's status above, messages below.
import { T, EN } from './i18n.js';
import { MONSTERS, SPELLS, ITEMS, CHARS, GOLD_RATE } from './data.js';
import { atk, defense, alive, gainXp, bagTake, agiOf, hasFx } from './party.js';
import { monster as monsterArt, backdrop } from './art.js';
import { box, text, say, menu, S as SC, VW } from './ui.js';

const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const nm = (x) => (x.mon ? x.label : T(CHARS[x.id].name));
const msg = (s) => say(s, { auto: 0.55, fast: true });

function mkMon(id) {
  const d = MONSTERS[id];
  return { mon: true, id, d, name: T(d.name), label: T(d.name), hp: d.hp, maxhp: d.hp, sleep: 0, sap: false, fade: 0, flash: 0, gone: false };
}
function label(mons) {
  const by = {};
  for (const m of mons) (by[m.id] = by[m.id] || []).push(m);
  for (const list of Object.values(by)) list.forEach((m, i) => { m.label = list.length > 1 ? `${m.name}${'ABCDEFGH'[i]}` : m.name; });
}
const liveMons = (B) => B.mons.filter((m) => m.hp > 0 && !m.gone);
const liveParty = (G) => G.active().filter(alive);

// ---------------------------------------------------------------- drawing
function drawBattle(G, B, g, dt) {
  const W = VW * SC, H = 240 * SC;
  B.shake = Math.max(0, B.shake - dt);
  const sx = B.shake > 0 ? (Math.random() - 0.5) * 10 : 0, sy = B.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
  g.save(); g.translate(sx, sy);
  if (G.hd) {      // HD-2D: the blurred diorama shows through; the monsters stand on a soft pool of light
    const gr = g.createRadialGradient(128 * SC, 150 * SC, 10 * SC, 128 * SC, 150 * SC, 130 * SC); gr.addColorStop(0, 'rgba(255,240,210,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 48 * SC, W, 150 * SC);
  } else {
    g.fillStyle = '#000'; g.fillRect(-20, -20, W + 40, H + 40);
    g.drawImage(backdrop(B.bg, 248 * SC, 112 * SC), 4 * SC, 48 * SC);
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(4 * SC, 48 * SC, 248 * SC, 112 * SC);
  }
  // monsters in a row
  const ms = B.mons.filter((m) => !m.gone || m.fade > 0);
  const sizes = ms.map((m) => 54 * (m.d.size || 1)), total = sizes.reduce((s, x) => s + x * 0.92, 0);
  let x = 128 - total / 2;
  ms.forEach((m, i) => {
    const sz = sizes[i], cx = x + sz * 0.46; x += sz * 0.92;
    m.cx = cx; m.cy = 150 - sz * 0.5;
    if (m.gone) m.fade = Math.max(0, m.fade - dt * 2.2);
    if (m.flash > 0) m.flash -= dt;
    const blinkOff = m.flash > 0 && Math.floor(m.flash * 20) % 2 === 0;
    if (blinkOff) return;
    g.save(); g.globalAlpha = m.gone ? m.fade : 1;
    const bob = m.sleep > 0 ? 0 : Math.sin(B.time * 2.5 + i) * 1.2;
    const img = monsterArt(m.d.art, m.d.col, m.flash > 0);
    if (G.hd && !m.gone) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx * SC, 151 * SC, sz * 0.38 * SC, sz * 0.09 * SC, 0, 0, 7); g.fill(); }
    g.drawImage(img, (cx - sz / 2) * SC, (150 - sz + bob) * SC, sz * SC, sz * SC);
    if (m.sleep > 0) text('Zzz', cx + sz * 0.3, 150 - sz, { color: '#a8d0ff', size: 7 * SC });
    g.restore();
  });
  // damage numbers
  for (const p of B.pops) { p.t += dt; g.globalAlpha = Math.max(0, 1 - p.t / 0.9); text(String(p.n), p.x, p.y - p.t * 18, { align: 'center', color: p.col, size: 10 * SC }); g.globalAlpha = 1; }
  B.pops = B.pops.filter((p) => p.t < 0.9);
  // the party's status windows
  const act = G.active(), w = Math.floor(248 / Math.max(3, act.length));
  act.forEach((m, i) => {
    const bx = 4 + i * w; box(bx, 2, w - 2, 44);
    const col = m.hp <= 0 ? '#ff5a5a' : m.hp < m.maxhp / 4 ? '#ffd040' : '#fff';
    text(nm(m).slice(0, EN ? 7 : 4), bx + 7, 8, { color: col });
    text(`H${String(m.hp).padStart(4)}`, bx + 7, 20, { color: col, size: 7 * SC });
    text(`M${String(m.mp).padStart(4)}`, bx + 7, 31, { color: col, size: 7 * SC });
    if (m.sleep > 0 || m.poison) text(m.sleep > 0 ? 'Z' : '☠', bx + w - 14, 8, { color: '#a8d0ff', size: 7 * SC });
    if (B.turn === m) text('▼', bx + w / 2 - 4, 38, { color: '#ffe080', size: 6 * SC });
  });
  g.restore();
  B.time += dt;
}
function pop(B, who, n, col = '#fff') {
  if (who.mon) B.pops.push({ x: who.cx, y: who.cy, n, col, t: 0 });
  else B.shake = 0.25;
}

// ---------------------------------------------------------------- choosing what to do
async function chooseTarget(G, B, kind, actor) {
  if (kind === 'one' || kind === 'group') {
    const ms = liveMons(B);
    const items = kind === 'group' ? [...new Set(ms.map((m) => m.id))].map((id) => ({ label: `${T(MONSTERS[id].name)} ×${ms.filter((m) => m.id === id).length}`, id })) : ms.map((m) => ({ label: m.label, m }));
    const i = await menu(items, { x: 8, y: 160 });
    if (i < 0) return undefined;
    return kind === 'group' ? ms.find((m) => m.id === items[i].id) : items[i].m;
  }
  if (kind === 'ally' || kind === 'dead') {
    const ps = G.active(); const i = await menu(ps.map((p) => ({ label: `${nm(p)}  ${p.hp}/${p.maxhp}`, disabled: kind === 'dead' ? p.hp > 0 : p.hp <= 0 })), { x: 8, y: 160 });
    return i < 0 ? undefined : ps[i];
  }
  return null;
}
async function chooseCommand(G, B, m) {
  for (;;) {
    const ci = await menu([T('攻擊', 'Attack'), T('法術', 'Spells'), T('防禦', 'Defend'), T('道具', 'Items')], { x: 8, y: 160, title: nm(m) });
    if (ci < 0) return null;                               // back to the previous member
    if (ci === 0) { const t = await chooseTarget(G, B, 'one', m); if (t === undefined) continue; return { type: 'attack', t }; }
    if (ci === 2) return { type: 'defend' };
    if (ci === 1) {
      const sp = m.spells.filter((s) => !SPELLS[s].fieldOnly);
      if (!sp.length) { await say(T(`${nm(m)}不會法術。`, `${nm(m)} knows no spells.`)); continue; }
      const si = await menu(sp.map((s) => ({ label: T(SPELLS[s].name), right: String(SPELLS[s].mp), disabled: m.mp < SPELLS[s].mp })), { x: 88, y: 100, cols: 2 });
      if (si < 0) continue;
      const s = SPELLS[sp[si]], t = await chooseTarget(G, B, s.target, m);
      if (t === undefined) continue;
      return { type: 'spell', sp: sp[si], t };
    }
    if (ci === 3) {
      const usable = Object.keys(G.bag).filter((k) => ITEMS[k] && ['heal', 'cure', 'mp', 'revive'].includes(ITEMS[k].use));
      if (!usable.length) { await say(T('沒有可以使用的道具。', 'Nothing you can use here.')); continue; }
      const ii = await menu(usable.map((k) => ({ label: T(ITEMS[k].name), right: `×${G.bag[k]}` })), { x: 88, y: 100 });
      if (ii < 0) continue;
      const t = await chooseTarget(G, B, ITEMS[usable[ii]].use === 'revive' ? 'dead' : 'ally', m);
      if (t === undefined) continue;
      return { type: 'item', it: usable[ii], t };
    }
  }
}
// what a companion does on their own (chapter 5 tactics)
function aiCommand(G, B, m) {
  const tac = G.tactic(), party = G.active(), hurt = party.filter((p) => p.hp > 0 && p.hp < p.maxhp * (tac === 'careful' ? 0.6 : 0.4)), dead = party.filter((p) => p.hp <= 0);
  const can = (s) => m.spells.includes(s) && m.mp >= SPELLS[s].mp;
  if (tac !== 'nomp') {
    if (dead.length && can('revive') && (tac === 'careful' || Math.random() < 0.6)) return { type: 'spell', sp: 'revive', t: dead[0] };
    if (hurt.length >= 2 && can('multiheal')) return { type: 'spell', sp: 'multiheal', t: null };
    if (hurt.length) { const t = hurt.sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0], need = t.maxhp - t.hp; for (const s of need > 60 ? ['healmore', 'heal'] : ['heal', 'healmore']) if (can(s)) return { type: 'spell', sp: s, t }; }
    if (tac === 'normal') {
      const ms = liveMons(B), atkSp = m.spells.filter((s) => SPELLS[s].kind === 'dmg' && can(s) && m.mp >= SPELLS[s].mp * 1.5);
      if (atkSp.length && Math.random() < 0.65 && !ms.every((x) => x.d.metal)) {
        const best = atkSp.sort((a, b) => (SPELLS[b].amt[0] * (SPELLS[b].target === 'one' ? 1 : Math.min(ms.length, 3))) - (SPELLS[a].amt[0] * (SPELLS[a].target === 'one' ? 1 : Math.min(ms.length, 3))))[0];
        return { type: 'spell', sp: best, t: ms.sort((a, b) => a.hp - b.hp)[0] };
      }
      if (can('sap') && ms.some((x) => x.d.boss && !x.sap)) return { type: 'spell', sp: 'sap', t: ms.find((x) => x.d.boss) };
      if (can('oomph') && ms.some((x) => x.d.boss)) { const t = party.filter((p) => p.hp > 0 && !p.oomph && CHARS[p.id].mp[0] === 0)[0]; if (t) return { type: 'spell', sp: 'oomph', t }; }
    }
  }
  const ms = liveMons(B);
  return { type: 'attack', t: ms.sort((a, b) => a.hp - b.hp)[0] };
}

// ---------------------------------------------------------------- doing it
function hitMon(G, B, a, t, crit) {
  const A = atk(a) * (a.oomph ? 2 : 1), D = t.d.def * (t.sap ? 0.5 : 1);
  if (t.d.metal) return crit ? ri(3, 6) : Math.random() < 0.5 ? 1 : 0;
  if (crit) return Math.round(A * rand(0.95, 1.1));
  const base = (A - D / 2) / 2;
  return base < 2 ? ri(0, 1) : Math.max(1, Math.round(base * rand(0.85, 1.15)));
}
function hitMember(m, matk, power = 1) {
  const D = defense(m) * (m.buff ? 1.5 : 1), base = (matk - D / 2) / 2 * power;
  let dmg = base < 2 ? ri(0, 1) : Math.round(base * rand(0.85, 1.15));
  if (m.defending) dmg = Math.floor(dmg / 2);
  return Math.max(0, dmg);
}
async function damageMon(G, B, t, n) {
  t.hp = Math.max(0, t.hp - n); t.flash = 0.3; t.sleep = 0; pop(B, t, n, '#fff');
  await msg(n > 0 ? T(`${t.label}受到 ${n} 點傷害！`, `${t.label} takes ${n} damage!`) : T(`${t.label}毫髮無傷！`, `${t.label} takes no damage!`));
  if (t.hp <= 0) { t.gone = true; t.fade = 1; G.sfx('kill'); await msg(T(`打倒了${t.label}！`, `${t.label} is defeated!`)); }
}
async function damageMember(G, B, m, n) {
  m.hp = Math.max(0, m.hp - n); m.sleep = 0; pop(B, m, n); G.sfx('hurt');
  await msg(n > 0 ? T(`${nm(m)}受到 ${n} 點傷害！`, `${nm(m)} takes ${n} damage!`) : T(`${nm(m)}躲開了攻擊！`, `${nm(m)} dodges the blow!`));
  if (m.hp <= 0) { m.oomph = false; m.poison = false; await msg(T(`${nm(m)}倒下了……`, `${nm(m)} has fallen…`)); }
}
async function memberAct(G, B, m, c) {
  B.turn = m;
  if (c.type === 'defend') { await msg(T(`${nm(m)}擺出防禦姿勢。`, `${nm(m)} is on guard.`)); return; }
  if (c.type === 'attack') {
    let t = c.t; if (!t || t.hp <= 0 || t.gone) t = pick(liveMons(B)); if (!t) return;
    G.sfx('hit'); await msg(T(`${nm(m)}的攻擊！`, `${nm(m)} attacks!`));
    const crit = Math.random() < Math.max(CHARS[m.id].crit ? 1 / CHARS[m.id].crit : 1 / 32, hasFx(m, 'crit') ? 1 / 8 : 0);
    if (!crit && Math.random() < 0.03 + Math.max(0, t.d.agi - agiOf(m)) / 500) { await msg(T(`${t.label}閃開了！`, `${t.label} dodges!`)); return; }
    if (crit) await msg(T('會心一擊！', 'An excellent hit!'));
    await damageMon(G, B, t, hitMon(G, B, m, t, crit));
    return;
  }
  if (c.type === 'item') {
    const it = ITEMS[c.it]; if (!bagTake(G.bag, c.it)) return;
    await msg(T(`${nm(m)}使用了${T(it.name)}！`, `${nm(m)} uses ${T(it.name)}!`));
    await applyRestore(G, B, it.use, c.t, it.amt);
    return;
  }
  const s = SPELLS[c.sp];
  if (m.mp < s.mp) { await msg(T(`${nm(m)}的魔力不夠！`, `${nm(m)} hasn't enough MP!`)); return; }
  m.mp -= s.mp; G.sfx('spell');
  await msg(T(`${nm(m)}施展了${T(s.name)}！`, `${nm(m)} casts ${T(s.name)}!`));
  if (s.kind === 'dmg') {
    const ms = liveMons(B); let ts;
    if (s.target === 'all') ts = ms; else if (s.target === 'group') { const ref = c.t && c.t.hp > 0 && !c.t.gone ? c.t : pick(ms); ts = ms.filter((x) => x.id === ref.id); } else ts = [c.t && c.t.hp > 0 && !c.t.gone ? c.t : pick(ms)];
    for (const t of ts) { if (t.d.metal) { await msg(T(`${t.label}對法術毫無反應！`, `${t.label} shrugs off the spell!`)); continue; } await damageMon(G, B, t, ri(s.amt[0], s.amt[1])); }
  } else if (s.kind === 'sleep' || s.kind === 'sap') {
    const ms = liveMons(B), ref = c.t && c.t.hp > 0 ? c.t : pick(ms);
    for (const t of ms.filter((x) => x.id === ref.id)) {
      if (s.kind === 'sap') { t.sap = true; await msg(T(`${t.label}的防禦力下降了！`, `${t.label}'s defence falls!`)); }
      else if (Math.random() < (t.d.boss ? 0.15 : t.d.metal ? 0 : 0.6)) { t.sleep = ri(1, 3); await msg(T(`${t.label}睡著了！`, `${t.label} falls asleep!`)); }
      else await msg(T(`${t.label}沒有睡著。`, `${t.label} resists!`));
    }
  } else if (s.kind === 'oomph') { const t = c.t && c.t.hp > 0 ? c.t : m; t.oomph = true; await msg(T(`${nm(t)}的攻擊力提升了！`, `${nm(t)}'s attack rises!`)); }
  else if (s.kind === 'buff') { for (const p of liveParty(G)) p.buff = true; await msg(T('全隊的防禦力提升了！', 'The party\'s defence rises!')); }
  else if (s.kind === 'heal' && s.target === 'party') { for (const p of liveParty(G)) await applyRestore(G, B, 'heal', p, s.amt); }
  else await applyRestore(G, B, s.kind, c.t || m, s.amt);
}
async function applyRestore(G, B, use, t, amt) {
  if (!t) return;
  if (use === 'heal') { if (t.hp <= 0) { await msg(T('沒有效果。', 'Nothing happens.')); return; } const n = Math.min(t.maxhp - t.hp, ri(amt[0], amt[1])); t.hp += n; G.sfx('heal'); await msg(T(`${nm(t)}恢復了 ${n} 點 HP！`, `${nm(t)} recovers ${n} HP!`)); }
  else if (use === 'mp') { const n = Math.min(t.maxmp - t.mp, ri(amt[0], amt[1])); t.mp += n; await msg(T(`${nm(t)}恢復了 ${n} 點 MP！`, `${nm(t)} recovers ${n} MP!`)); }
  else if (use === 'cure') { t.poison = false; await msg(T(`${nm(t)}的毒解除了。`, `${nm(t)} is cured.`)); }
  else if (use === 'revive') { if (t.hp > 0) { await msg(T('沒有效果。', 'Nothing happens.')); return; } t.hp = use === 'revive' && amt ? t.maxhp : Math.ceil(t.maxhp / 2); G.sfx('heal'); await msg(T(`${nm(t)}復活了！`, `${nm(t)} is revived!`)); }
}
const MSP = { fire: [10, 16, 'one'], fireball: [16, 24, 'all'], inferno: [60, 80, 'one'], icestorm: [36, 48, 'all'], bang: [18, 26, 'all'], kaboom: [60, 80, 'all'], darkfire: [12, 18, 'all'], ice: [14, 20, 'all'] };
async function monsterAct(G, B, mo) {
  B.turn = null;
  if (mo.sleep > 0) { mo.sleep--; await msg(T(`${mo.label}正在睡覺。`, `${mo.label} is fast asleep.`)); return; }
  const party = liveParty(G); if (!party.length) return;
  const acts = mo.d.acts, tot = acts.reduce((s, a) => s + a[1], 0); let x = Math.random() * tot, act = acts[0][0];
  for (const [a, w] of acts) { x -= w; if (x < 0) { act = a; break; } }
  const target = () => pick(liveParty(G));
  if (act === 'flee') { mo.gone = true; mo.fade = 1; mo.fled = true; await msg(T(`${mo.label}逃走了！`, `${mo.label} runs away!`)); return; }
  if (act.startsWith('call:')) {
    if (liveMons(B).length >= 5) act = 'attack';
    else { const n = mkMon(act.slice(5)); B.mons.push(n); label(B.mons.filter((m) => !m.gone)); await msg(T(`${mo.label}呼叫了同伴！${n.label}出現了！`, `${mo.label} calls for help! ${n.label} appears!`)); return; }
  }
  if (act === 'heal') {
    const hurt = liveMons(B).filter((m) => m.hp < m.maxhp * 0.6 && !m.d.metal).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
    if (!hurt) act = 'attack';
    else { const n = Math.min(hurt.maxhp - hurt.hp, Math.round(Math.min(hurt.maxhp * 0.18, 60 + hurt.maxhp * 0.05))); hurt.hp += n; await msg(T(`${mo.label}施展了治療！${hurt.label}恢復了 ${n} 點 HP！`, `${mo.label} casts Heal! ${hurt.label} recovers ${n} HP!`)); return; }
  }
  if (act === 'attack' || act === 'double' || act === 'poison') {
    for (let k = 0; k < (act === 'double' ? 2 : 1); k++) {
      const t = target(); if (!t) return;
      await msg(k ? T(`${mo.label}再次攻擊！`, `${mo.label} attacks again!`) : T(`${mo.label}的攻擊！`, `${mo.label} attacks!`));
      if (Math.random() < 0.03 + Math.max(0, agiOf(t) - mo.d.agi) / 500) { await msg(T(`${nm(t)}閃開了！`, `${nm(t)} dodges!`)); continue; }
      await damageMember(G, B, t, hitMember(t, mo.d.atk));
      if (act === 'poison' && t.hp > 0 && !hasFx(t, 'nopoison') && Math.random() < 0.35) { t.poison = true; await msg(T(`${nm(t)}中毒了！`, `${nm(t)} is poisoned!`)); }
    }
    return;
  }
  if (act === 'sleep') { const t = target(); await msg(T(`${mo.label}施展了睡眠！`, `${mo.label} casts Snooze!`)); if (!hasFx(t, 'nosleep') && Math.random() < 0.5) { t.sleep = ri(1, 2); await msg(T(`${nm(t)}睡著了！`, `${nm(t)} falls asleep!`)); } else await msg(T(`${nm(t)}沒有睡著。`, `${nm(t)} resists!`)); return; }
  if (act === 'roar') { await msg(T(`${mo.label}發出震天咆哮！`, `${mo.label} lets out a terrible roar!`)); for (const p of liveParty(G)) if (Math.random() < 0.35) { p.sleep = 1; await msg(T(`${nm(p)}嚇得動彈不得！`, `${nm(p)} is frozen with fear!`)); } return; }
  if (act === 'breath' || act === 'quake') {
    await msg(act === 'breath' ? T(`${mo.label}噴出了火焰！`, `${mo.label} breathes fire!`) : T(`${mo.label}撼動大地！`, `${mo.label} shakes the ground!`));
    for (const p of liveParty(G)) await damageMember(G, B, p, Math.max(1, Math.round(mo.d.atk * rand(0.38, 0.52) * (p.buff ? 0.8 : 1))));
    return;
  }
  const sp = MSP[act];
  if (sp) {
    const nmS = { darkfire: T('黑暗火焰', 'Dark Flame') }[act] || T(SPELLS[act] ? SPELLS[act].name : act);
    await msg(T(`${mo.label}施展了${nmS}！`, `${mo.label} casts ${nmS}!`));
    for (const p of sp[2] === 'all' ? liveParty(G) : [target()]) await damageMember(G, B, p, ri(sp[0], sp[1]));
  }
}

// ---------------------------------------------------------------- one battle
// spec: [[monster, count], ...]; resolves to 'win', 'lose' or 'flee'
export async function battle(G, spec, opts = {}) {
  const mons = []; for (const [id, n] of spec) for (let i = 0; i < n; i++) mons.push(mkMon(id));
  label(mons);
  const B = { mons, bg: opts.bg || 'field', shake: 0, pops: [], time: 0, turn: null, boss: mons.some((m) => m.d.boss) };
  G.setScene({ battle: true, draw: (g, dt) => drawBattle(G, B, g, dt) });
  G.music(B.boss ? 'boss' : 'battle');
  for (const p of G.active()) { p.buff = false; p.oomph = false; p.defending = false; p.sleep = 0; }
  const names = [...new Set(mons.map((m) => m.name))];
  await say(names.length === 1 && mons.length > 1 ? T(`${names[0]}們出現了！`, `${mons.length} ${names[0]}s appear!`) : names.length === 1 ? T(`${names[0]}出現了！`, `${names[0]} appears!`) : T(`${names.join('、')}出現了！`, `${names.join(', ')} appear!`), { auto: 0.9 });
  let result = null, round = 0;
  while (!result) {
    round++;
    // ---- what the party does
    let plan = [], flee = false;
    for (;;) {
      const top = await menu([T('戰鬥', 'Fight'), T('逃跑', 'Run'), ...(G.ch() === 5 ? [T('作戰', 'Tactics')] : [])], { x: 8, y: 160, cancel: false });
      if (top === 1) { flee = true; break; }
      if (top === 2) { await G.chooseTactic(); continue; }
      const act = G.active(); plan = []; let i = 0, back = false;
      while (i < act.length) {
        const m = act[i];
        if (m.hp <= 0 || m.sleep > 0) { plan[i] = null; i++; continue; }
        if (G.isAuto(m)) { plan[i] = 'ai'; i++; continue; }
        B.turn = m;
        const c = await chooseCommand(G, B, m);
        if (c === null) { do { i--; } while (i >= 0 && (!act[i] || act[i].hp <= 0 || plan[i] === 'ai' || act[i].sleep > 0)); if (i < 0) { back = true; break; } continue; }
        plan[i] = c; i++;
      }
      B.turn = null;
      if (!back) break;
    }
    if (flee) {
      if (B.boss || opts.noFlee) await msg(T('無法逃跑！', 'You can\'t escape!'));
      else {
        const pa = liveParty(G).reduce((s, p) => s + agiOf(p), 0) / Math.max(1, liveParty(G).length), ma = liveMons(B).reduce((s, m) => s + m.d.agi, 0) / Math.max(1, liveMons(B).length);
        await msg(T('一行人逃跑了……', 'The party tries to run…'));
        if (Math.random() < Math.min(0.92, 0.55 + (pa - ma) / 120 + round * 0.1)) { result = 'flee'; break; }
        await msg(T('但是被包圍了！', 'But they are blocked!'));
      }
    }
    // ---- everyone acts, fastest first
    const act = G.active(), actors = [];
    act.forEach((m, i) => { m.defending = plan[i] && plan[i].type === 'defend'; if (!flee && plan[i]) actors.push({ who: m, c: plan[i], s: agiOf(m) * rand(0.55, 1) }); });
    for (const mo of liveMons(B)) actors.push({ who: mo, s: mo.d.agi * rand(0.55, 1) });
    actors.sort((a, b) => b.s - a.s);
    for (const a of actors) {
      if (!liveMons(B).length || !liveParty(G).length) break;
      if (a.who.mon) { if (a.who.hp > 0 && !a.who.gone) await monsterAct(G, B, a.who); }
      else if (a.who.hp > 0) {
        if (a.who.sleep > 0) { a.who.sleep--; await msg(T(`${nm(a.who)}還在睡覺。`, `${nm(a.who)} is still asleep.`)); continue; }
        await memberAct(G, B, a.who, a.c === 'ai' ? aiCommand(G, B, a.who) : a.c);
      }
      // the last boss changes shape
      for (const mo of B.mons) if (mo.hp <= 0 && mo.d.next && !mo.changed) {
        mo.changed = true; G.sfx('boom'); B.shake = 1;
        await say(T('「這樣就想打倒我嗎……愚蠢的人類！」', '"You think that is enough to destroy me… foolish humans!"'));
        await say(T(`${mo.name}的身體開始扭曲變形……`, `${mo.name}'s body twists and swells…`));
        const n = mkMon(mo.d.next); B.mons.push(n); label([n]); G.music('boss2');
        await say(T(`${n.name}現身了！`, `${n.name} appears!`));
      }
    }
    for (const m of act) m.defending = false;
    if (!liveMons(B).length) result = 'win';
    else if (!liveParty(G).length) {
      // companions waiting in the wagon jump out (not in dungeons)
      const fresh = G.wagonAlive();
      if (fresh.length && !G.inDungeon()) { await say(T('馬車裡的夥伴衝了出來！', 'The companions in the wagon rush out!')); G.swapInFromWagon(); }
      else result = 'lose';
    } else for (const p of liveParty(G)) {
      if (p.poison) { const n = Math.max(1, Math.floor(p.maxhp / 16)); p.hp = Math.max(1, p.hp - n); }
      // equipment that heals at the end of each round
      if (hasFx(p, 'regen') && p.hp < p.maxhp) { const n = Math.min(p.maxhp - p.hp, Math.max(1, Math.floor(p.maxhp / 12))); p.hp += n; pop(B, p, n, '#7fff8a'); }
      if (hasFx(p, 'mpregen') && p.mp < p.maxmp) p.mp = Math.min(p.maxmp, p.mp + 3);
    }
  }
  // ---- after the battle
  if (result === 'win') {
    G.music('win');
    const beaten = B.mons.filter((m) => !m.fled);
    const xp = beaten.reduce((s, m) => s + m.d.xp, 0), gold = Math.round(beaten.reduce((s, m) => s + m.d.gold, 0) * GOLD_RATE * (G.active().some((p) => p.id === 'tolle') ? 1.25 : 1) * (G.active().some((p) => hasFx(p, 'gold')) ? 1.25 : 1));
    if (opts.victory) await say(opts.victory);
    else await say(T(`打倒了所有的怪物！`, 'All the monsters are defeated!'), { auto: 0.8 });
    const fighters = liveParty(G), share = Math.max(1, Math.floor(xp / Math.max(1, fighters.length)));
    if (xp) await say(T(`每個人獲得了 ${share} 點經驗值。`, `Each member earns ${share} experience.`));
    if (gold) { G.addGold(gold); await say(T(`得到了 ${gold} 枚金幣。`, `Found ${gold} gold.`)); }
    // treasure: each monster's drop table (a Lucky Bell doubles the chances)
    const luck = G.active().some((p) => hasFx(p, 'luck')) ? 2 : 1;
    for (const m of beaten) for (const [it, n] of m.d.drops || (m.d.drop ? [m.d.drop] : [])) if (Math.random() < Math.min(1, luck / n)) {
      G.give(it); G.sfx('item'); await say(T(`${m.label}留下了${T(ITEMS[it].name)}！`, `${m.label} dropped a ${T(ITEMS[it].name)}!`));
    }
    for (const p of [...fighters, ...G.wagonAlive()]) {
      for (const up of gainXp(p, hasFx(p, 'xp') ? Math.round(share * 1.15) : share)) {
        G.sfx('levelup');
        await say(T(`${nm(p)}升到了第 ${up.lv} 級！`, `${nm(p)} reaches level ${up.lv}!`));
        const g = up.gain; await say(T(`HP +${g.maxhp}  MP +${g.maxmp}  力量 +${g.str}  防禦 +${g.def}  速度 +${g.agi}`, `HP +${g.maxhp}  MP +${g.maxmp}  STR +${g.str}  DEF +${g.def}  AGI +${g.agi}`), { auto: 1.2 });
        for (const s of up.learned) await say(T(`${nm(p)}學會了${T(SPELLS[s].name)}！`, `${nm(p)} learns ${T(SPELLS[s].name)}!`));
      }
    }
  }
  for (const p of G.active()) { p.buff = false; p.oomph = false; p.defending = false; p.sleep = 0; }
  G.setScene(null);
  return result;
}
