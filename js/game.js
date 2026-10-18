// The engine: title, chapters, walking the world and towns, talking, menus, shops, inns, churches, saving, and the ending.
import { T, EN, LANG, setLang } from './i18n.js';
import { CHARS, ITEMS, SPELLS, ZONES } from './data.js';
import { newMember, atk, defense, alive, healFull, bagAdd, bagTake, canEquip, statAt } from './party.js';
import { tile, person, wagon as wagonSprite, monster as monsterArt, LOOKS } from './art.js';
import { buildMaps, TILE, WALK, PLACES, BARRIERS, worldZone, CHAPTERS, ENDING } from './maps.js';
import { battle } from './battle.js';
import { music, sfx, toggleMute, isMuted, unlock } from './audio.js';
import * as UI from './ui.js';
const { say, says, ask, menu, box, text, S: SC, VW, VH } = UI;

const canvas = document.getElementById('game'), g = canvas.getContext('2d');
canvas.width = VW * SC; canvas.height = VH * SC; g.imageSmoothingEnabled = false;
UI.setCtx(g);
const MAPS = buildMaps();
const KEY = 'co.save.v1', GAME = 'chosen-ones';

// ---------------------------------------------------------------- state
let S = null;                 // the saved game
let MAP = null, mapId = null, tilesNow = null;
const P = { x: 0, y: 0, dir: 'down', moving: null, frame: 0, trail: [] };
let mode = 'title', scene = null, running = 0, ftime = 0, fade = 0, npcState = new Map();
const nameOf = (id) => (id === 'hero' ? S.name : T(CHARS[id].name));
const members = () => [...S.active, ...S.wagon].map((id) => S.members[id]);
const leader = () => S.members[S.active.find((id) => S.members[id].hp > 0) || S.active[0]];

// ---------------------------------------------------------------- saving
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (cloud) try { cloud.touch(GAME, KEY); } catch (e) { /* ignore */ } }
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; } };
let cloud = null;
(async () => { try { cloud = await import('/save.js'); if (await cloud.pull(GAME, KEY) && mode === 'title') titleMenu(); } catch (e) { cloud = null; } })();

// ---------------------------------------------------------------- maps
function enterMap(id, x, y, dir) {
  mapId = id; MAP = MAPS[id]; tilesNow = MAP.tiles.map((r) => r.split(''));
  for (const [k, v] of Object.entries((S.mapEdits || {})[id] || {})) { const [tx, ty] = k.split(',').map(Number); tilesNow[ty][tx] = v; }
  P.x = x; P.y = y; P.dir = dir || P.dir; P.moving = null; P.trail = [];
  S.map = id; S.x = x; S.y = y; S.dir = P.dir;
  npcState = new Map();
  if (MAP.place && (MAP.town || MAP.save)) { S.visited = S.visited || []; if (!S.visited.includes(MAP.place.id)) S.visited.push(MAP.place.id); }
  music(MAP.music || 'field');
  if (MAP.onEnter) runScript(MAP.onEnter);
}
const tileAt = (x, y) => { if (!tilesNow || y < 0 || x < 0 || y >= MAP.h || x >= MAP.w) return null; return TILE[tilesNow[y][x]] || 'void'; };
const npcsHere = () => (MAP.npcs || []).filter((n) => !n.when || n.when(A));
function npcAt(x, y) { for (const n of npcsHere()) { const s = npcState.get(n) || n; if (s.x === x && s.y === y) return n; } return null; }
const chestAt = (x, y) => (MAP.chests || []).find((c) => c.x === x && c.y === y && (!c.when || c.when(A)));
function barrierAt(x, y) { if (!MAP.world) return null; const b = BARRIERS.find((q) => q.x === x && q.y === y); return b && !S.flags[b.flag] ? b : null; }
function walkable(x, y) {
  const t = tileAt(x, y);
  if (t === null) return !MAP.world && !MAP.dungeon;        // walking off a town's edge leaves it
  if (t === 'miasma') return !!S.flags.skysword;
  if (barrierAt(x, y)) return false;
  if (!WALK.has(t)) return false;
  if (npcAt(x, y) || chestAt(x, y)) return false;
  return true;
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------------------------------------------------------------- the script API (used by maps.js)
const ABORT = new Error('abort');
const A = {
  T, say, says, ask, menu, sfx, music,
  ch: () => S.ch, flag: (k) => !!S.flags[k], set: (k, v = true) => { S.flags[k] = v; }, unset: (k) => { delete S.flags[k]; },
  gold: () => S.gold, addGold: (n) => { S.gold += n; }, pay: (n) => { if (S.gold < n) return false; S.gold -= n; return true; },
  give: (it, n = 1) => bagAdd(S.bag, it, n), has: (it) => (S.bag[it] || 0) > 0, take: (it) => bagTake(S.bag, it),
  setTile: (x, y, c) => { tilesNow[y][x] = c; S.mapEdits = S.mapEdits || {}; (S.mapEdits[mapId] = S.mapEdits[mapId] || {})[`${x},${y}`] = c; },
  async join(id) {
    const ch = CHAPTERS[S.ch];
    if (!S.members[id]) { const [lv, eq] = (ch.joinLater && ch.joinLater[id]) || [1, {}]; S.members[id] = newMember(id, Math.max(lv, id === 'pupu' ? leader().lv : lv), eq); }
    const m = S.members[id]; healFull(m); if (m.hp <= 0) m.hp = m.maxhp;
    if (S.active.length < 4) S.active.push(id); else S.wagon.push(id);
    sfx('levelup'); music('inn');
    await say(T(`${nameOf(id)}加入了隊伍！`, `${nameOf(id)} joins the party!`) + (S.active.includes(id) ? '' : T('（坐上了馬車）', ' (riding in the wagon)')));
  },
  async battle(spec, opts = {}) {
    const r = await battle(G, spec, opts);
    if (r === 'lose') { await wipe(); throw ABORT; }
    music(MAP.music || 'field');
    return r;
  },
  inn, shop, church, saveOffer,
  chapterEnd: (n) => chapterEnd(n), ending: () => ending(), c5Attack: () => c5Attack(),
};
async function runScript(fn) {
  running++;
  try { await fn(A); } catch (e) { if (e !== ABORT) { console.error(e); window.__err = String(e.stack || e); } }
  finally { running--; }
}

// ---------------------------------------------------------------- what battles need from the game
const G = {
  active: () => S.active.map((id) => S.members[id]), wagonAlive: () => S.wagon.map((id) => S.members[id]).filter(alive),
  get bag() { return S.bag; }, ch: () => S.ch, tactic: () => S.tactic || 'normal',
  isAuto: (m) => S.ch === 5 && m.id !== 'hero' && (S.tactic || 'normal') !== 'manual',
  async chooseTactic() { const k = ['normal', 'careful', 'nomp', 'manual']; const i = await menu(TACTICS(), { x: 80, y: 100, title: T('作戰', 'Tactics'), start: k.indexOf(S.tactic || 'normal') }); if (i >= 0) S.tactic = k[i]; },
  setScene: (s) => { scene = s; }, music, sfx, addGold: (n) => { S.gold += n; }, give: (it) => bagAdd(S.bag, it),
  inDungeon: () => !!(MAP && MAP.dungeon),
  swapInFromWagon() { const out = S.active.filter((id) => S.members[id].hp <= 0), fresh = S.wagon.filter((id) => S.members[id].hp > 0); S.active = fresh.slice(0, 4); S.wagon = S.wagon.filter((id) => !S.active.includes(id)).concat(out); },
};
const TACTICS = () => [T('全力進攻', 'Show no mercy'), T('小心作戰', 'Focus on healing'), T('不用法術', 'Don\'t use magic'), T('聽我指揮', 'Follow orders')];

// ---------------------------------------------------------------- inns, shops, churches, saving
async function inn(price) {
  const n = S.active.length + S.wagon.length, cost = price * n;
  if (await ask(T(`歡迎光臨旅店。住一晚 ${cost} 金幣，要休息嗎？`, `Welcome, travellers. A night is ${cost} gold for the party. Will you stay?`), [T('住宿', 'Stay'), T('不用', 'No')]) !== 0) return say(T('歡迎再來。', 'Come again.'));
  if (S.gold < cost) return say(T('哎呀，金幣不夠呢。', 'Oh dear, you haven\'t enough gold.'));
  S.gold -= cost; fade = 1.6; music('inn');
  for (const m of members()) if (m.hp > 0) { m.hp = m.maxhp; m.mp = m.maxmp; }
  await UI.sleep(1.4);
  await say(T('早安！昨晚睡得好嗎？', 'Good morning! Did you sleep well?'));
  music(MAP.music);
}
async function saveOffer(who) {
  if (await ask(T(`${who}：「要記錄到冒險之書嗎？」`, `${who}: "Shall I record your Adventure Log?"`), [T('記錄', 'Save'), T('不用', 'No')]) === 0) {
    S.savePoint = { map: mapId, x: P.x, y: P.y, dir: P.dir }; save(); sfx('ok'); music('save');
    await say(T('冒險之書已經記錄好了。', 'Your Adventure Log has been recorded.'));
  }
}
async function church() {
  for (;;) {
    const i = await ask(T('神父：「神的子民啊，有什麼事嗎？」', 'Priest: "Child of the gods, what do you seek?"'), [T('記錄冒險', 'Save'), T('復活', 'Revive'), T('解毒', 'Cure poison'), T('沒事', 'Nothing')]);
    if (i === 0) { S.savePoint = { map: mapId, x: P.x, y: P.y, dir: P.dir }; save(); music('save'); await say(T('冒險之書已經記錄好了。願神保佑你。', 'Your Adventure Log is recorded. May the gods be with you.')); }
    else if (i === 1) {
      const dead = members().filter((m) => m.hp <= 0); if (!dead.length) { await say(T('沒有需要復活的人。', 'No one needs reviving.')); continue; }
      for (const m of dead) { const c = m.lv * 10; if (await ask(T(`要讓${nameOf(m.id)}復活嗎？需要 ${c} 金幣。`, `Revive ${nameOf(m.id)} for ${c} gold?`), [T('好', 'Yes'), T('不要', 'No')]) !== 0) continue; if (S.gold < c) { await say(T('金幣不夠。', 'Not enough gold.')); continue; } S.gold -= c; m.hp = m.maxhp; sfx('heal'); await say(T(`${nameOf(m.id)}復活了！`, `${nameOf(m.id)} lives again!`)); }
    } else if (i === 2) { const p = members().filter((m) => m.poison); if (!p.length) { await say(T('沒有人中毒。', 'No one is poisoned.')); continue; } if (S.gold < 10 * p.length) { await say(T('金幣不夠。', 'Not enough gold.')); continue; } S.gold -= 10 * p.length; for (const m of p) m.poison = false; await say(T('毒已經解除了。', 'The poison is gone.')); }
    else return say(T('願神保佑你。', 'May the gods be with you.'));
  }
}
const sellPrice = (it) => Math.floor((ITEMS[it].price || 0) * (S.active.includes('tolle') || S.ch === 3 ? 0.75 : 0.5));
async function shop(list) {
  for (;;) {
    const i = await ask(T('老闆：「歡迎光臨！要買什麼嗎？」', 'Shopkeeper: "Welcome! What can I do for you?"'), [T('買', 'Buy'), T('賣', 'Sell'), T('離開', 'Leave')]);
    if (i === 0) {
      const ii = await menu(list.map((k) => ({ label: T(ITEMS[k].name), right: `${ITEMS[k].price}G` })), { x: 40, y: 8, title: `${S.gold} G`, info: (it) => { const k = list[list.indexOf(list.find((x) => T(ITEMS[x].name) === it.label))]; if (k && ITEMS[k].slot) equipInfo(k); } });
      if (ii < 0) continue;
      const k = list[ii], it = ITEMS[k];
      if (S.gold < it.price) { await say(T('金幣好像不夠呢。', 'You don\'t seem to have enough gold.')); continue; }
      S.gold -= it.price; bagAdd(S.bag, k); sfx('ok');
      if (it.slot) {
        const who = members().filter((m) => canEquip(it, m.id));
        if (who.length && await ask(T('要現在裝備嗎？', 'Equip it now?'), [T('好', 'Yes'), T('不用', 'No')]) === 0) {
          const wi = await menu(who.map((m) => ({ label: nameOf(m.id) })), { x: 140, y: 40 }); if (wi >= 0) equip(who[wi], k);
        }
      }
      await say(T('謝謝惠顧！', 'Thank you!'));
    } else if (i === 1) {
      const items = Object.keys(S.bag).filter((k) => ITEMS[k] && !ITEMS[k].key && ITEMS[k].price);
      if (!items.length) { await say(T('沒有可以賣的東西。', 'You have nothing to sell.')); continue; }
      const ii = await menu(items.map((k) => ({ label: `${T(ITEMS[k].name)} ×${S.bag[k]}`, right: `${sellPrice(k)}G` })), { x: 40, y: 8, title: `${S.gold} G` });
      if (ii < 0) continue;
      const k = items[ii]; if (await ask(T(`${T(ITEMS[k].name)}的話，可以用 ${sellPrice(k)} 金幣收購。要賣嗎？`, `I'll give you ${sellPrice(k)} gold for the ${T(ITEMS[k].name)}. Sell it?`), [T('賣', 'Sell'), T('不賣', 'No')]) !== 0) continue;
      bagTake(S.bag, k); S.gold += sellPrice(k); sfx('ok');
    } else return say(T('歡迎再來！', 'Come again!'));
  }
}
// show who could use a piece of equipment and how much better it is
function equipInfo(k) {
  const it = ITEMS[k]; box(150, 150, 98, 84); let y = 157;
  for (const m of members().slice(0, 5)) {
    const can = canEquip(it, m.id), cur = m.eq[it.slot] ? ITEMS[m.eq[it.slot]] : null, d = it.slot === 'w' ? it.atk - (cur ? cur.atk : 0) : it.def - (cur ? cur.def : 0);
    text(nameOf(m.id).slice(0, EN ? 6 : 3), 157, y, { color: can ? '#fff' : '#777', size: 7 * SC });
    text(can ? (d > 0 ? `+${d}` : String(d)) : '—', 240, y, { align: 'right', color: can ? (d > 0 ? '#7fff8a' : '#ccc') : '#777', size: 7 * SC });
    y += 14;
  }
}
function equip(m, k) { const it = ITEMS[k]; if (!bagTake(S.bag, k)) return; const old = m.eq[it.slot]; if (old) bagAdd(S.bag, old); m.eq[it.slot] = k; }

// ---------------------------------------------------------------- the field menu
async function fieldMenu() {
  const opts = [['items', T('道具', 'Items')], ['spells', T('法術', 'Spells')], ['equip', T('裝備', 'Equip')], ['status', T('狀態', 'Status')]];
  if (S.ch === 5) { opts.push(['tactics', T('作戰', 'Tactics')]); if (S.active.length + S.wagon.length > 4) opts.push(['party', T('隊伍', 'Party')]); }
  opts.push(['system', T('系統', 'System')]);
  const close = UI.panel(() => { box(176, 8, 72, 40); text(`${S.gold}`, 240, 14, { align: 'right' }); text('G', 182, 14, { color: '#ffe080' }); text(T(`第${S.ch}章`, `Ch. ${S.ch}`), 182, 30, { color: '#aaa', size: 7 * SC }); });
  try {
    for (;;) {
      const i = await menu(opts.map((o) => o[1]), { x: 8, y: 8 });
      if (i < 0) return;
      const k = opts[i][0];
      if (k === 'items') await itemMenu(); else if (k === 'spells') await spellMenu(); else if (k === 'equip') await equipMenu(); else if (k === 'status') await statusMenu();
      else if (k === 'tactics') await G.chooseTactic(); else if (k === 'party') await partyMenu(); else if (k === 'system') { if (await systemMenu()) return; }
    }
  } finally { close(); }
}
const pickMember = (title, list = members()) => menu(list.map((m) => ({ label: nameOf(m.id), right: `${m.hp}/${m.maxhp}` })), { x: 80, y: 8, title });
async function itemMenu() {
  const keys = Object.keys(S.bag); if (!keys.length) return say(T('沒有任何道具。', 'You have no items.'));
  const i = await menu(keys.map((k) => ({ label: T(ITEMS[k].name), right: `×${S.bag[k]}` })), { x: 60, y: 8, rows: 10 });
  if (i < 0) return;
  const k = keys[i], it = ITEMS[k];
  if (it.slot) { const who = members().filter((m) => canEquip(it, m.id)); if (!who.length) return say(T('沒有人能裝備這個。', 'No one can equip that.')); const w = await pickMember(T('誰要裝備？', 'Who equips it?'), who); if (w >= 0) { equip(who[w], k); sfx('ok'); } return; }
  if (!it.use) return say(T(`${T(it.name)}：看起來很貴重。`, `${T(it.name)}: it looks valuable.`));
  if (it.use === 'zoom') { if (await zoomTo()) bagTake(S.bag, k); return; }
  if (it.use === 'repel') { bagTake(S.bag, k); S.repel = 120; return say(T('灑下了聖水。弱小的魔物不會靠近了。', 'You sprinkle the holy water. Weak monsters will keep away.')); }
  const w = await pickMember(T('給誰用？', 'On whom?')); if (w < 0) return;
  const m = members()[w];
  if (it.use === 'heal') { if (m.hp <= 0) return say(T('沒有效果。', 'Nothing happens.')); bagTake(S.bag, k); const n = Math.min(m.maxhp - m.hp, it.amt[0] + Math.floor(Math.random() * (it.amt[1] - it.amt[0]))); m.hp += n; sfx('heal'); return say(T(`${nameOf(m.id)}恢復了 ${n} 點 HP。`, `${nameOf(m.id)} recovers ${n} HP.`)); }
  if (it.use === 'mp') { bagTake(S.bag, k); const n = Math.min(m.maxmp - m.mp, it.amt[0]); m.mp += n; return say(T(`${nameOf(m.id)}恢復了 ${n} 點 MP。`, `${nameOf(m.id)} recovers ${n} MP.`)); }
  if (it.use === 'cure') { bagTake(S.bag, k); m.poison = false; return say(T(`${nameOf(m.id)}的毒解除了。`, `${nameOf(m.id)} is cured.`)); }
  if (it.use === 'revive') { if (m.hp > 0) return say(T('沒有效果。', 'Nothing happens.')); bagTake(S.bag, k); m.hp = m.maxhp; sfx('heal'); return say(T(`${nameOf(m.id)}復活了！`, `${nameOf(m.id)} lives again!`)); }
}
async function spellMenu() {
  const casters = members().filter((m) => m.hp > 0 && m.spells.some((s) => SPELLS[s].field)); if (!casters.length) return say(T('沒有人會用法術。', 'No one can cast field spells.'));
  const ci = await pickMember(T('誰施法？', 'Who casts?'), casters); if (ci < 0) return;
  const c = casters[ci], sp = c.spells.filter((s) => SPELLS[s].field);
  const si = await menu(sp.map((s) => ({ label: T(SPELLS[s].name), right: String(SPELLS[s].mp), disabled: c.mp < SPELLS[s].mp })), { x: 100, y: 40 }); if (si < 0) return;
  const s = SPELLS[sp[si]];
  if (s.kind === 'zoom') { if (await zoomTo()) c.mp -= s.mp; return; }
  if (s.kind === 'evac') { if (!MAP.dungeon) return say(T('這裡無法使用。', 'You can\'t use that here.')); c.mp -= s.mp; return exitDungeon(); }
  const targets = s.target === 'party' ? members().filter(alive) : null;
  let t = null; if (!targets) { const ti = await pickMember(T('對誰施法？', 'On whom?')); if (ti < 0) return; t = members()[ti]; }
  c.mp -= s.mp; sfx('heal');
  for (const m of targets || [t]) {
    if (s.kind === 'heal' && m.hp > 0) { const n = Math.min(m.maxhp - m.hp, s.amt[0] + Math.floor(Math.random() * (s.amt[1] - s.amt[0]))); m.hp += n; await say(T(`${nameOf(m.id)}恢復了 ${n} 點 HP。`, `${nameOf(m.id)} recovers ${n} HP.`)); }
    else if (s.kind === 'cure') { m.poison = false; await say(T(`${nameOf(m.id)}的毒解除了。`, `${nameOf(m.id)} is cured.`)); }
    else if (s.kind === 'revive' && m.hp <= 0) { m.hp = Math.ceil(m.maxhp / 2); await say(T(`${nameOf(m.id)}復活了！`, `${nameOf(m.id)} lives again!`)); }
    else await say(T('沒有效果。', 'Nothing happens.'));
  }
}
async function equipMenu() {
  const mi = await pickMember(T('誰的裝備？', 'Whose equipment?')); if (mi < 0) return;
  const m = members()[mi], slots = [['w', T('武器', 'Weapon')], ['a', T('鎧甲', 'Armour')], ['s', T('盾牌', 'Shield')], ['h', T('頭盔', 'Helmet')]];
  for (;;) {
    const close = UI.panel(() => { box(8, 150, 240, 82); text(nameOf(m.id), 16, 156, { color: '#ffe080' }); text(`${T('攻擊力', 'Attack')} ${atk(m)}`, 16, 172); text(`${T('防禦力', 'Defence')} ${defense(m)}`, 16, 186); text(`Lv ${m.lv}`, 16, 200); });
    const si = await menu(slots.map(([k, l]) => ({ label: l, right: m.eq[k] ? T(ITEMS[m.eq[k]].name) : '—' })), { x: 8, y: 40, w: 240 });
    close(); if (si < 0) return;
    const slot = slots[si][0], opts = Object.keys(S.bag).filter((k) => ITEMS[k] && ITEMS[k].slot === slot && canEquip(ITEMS[k], m.id));
    const ii = await menu([{ label: T('（卸下）', '(remove)') }, ...opts.map((k) => ({ label: T(ITEMS[k].name), right: String(slot === 'w' ? ITEMS[k].atk : ITEMS[k].def) }))], { x: 60, y: 60 });
    if (ii < 0) continue;
    if (ii === 0) { if (m.eq[slot]) { bagAdd(S.bag, m.eq[slot]); m.eq[slot] = null; } } else equip(m, opts[ii - 1]);
  }
}
async function statusMenu() {
  const mi = await pickMember(T('看誰的狀態？', 'Whose status?')); if (mi < 0) return;
  const m = members()[mi], next = (await import('./data.js')).xpFor(m.lv + 1) - m.xp;
  const close = UI.panel(() => {
    box(8, 8, 240, 224); text(nameOf(m.id), 18, 16, { color: '#ffe080' }); text(T(CHARS[m.id].job), 238, 16, { align: 'right', color: '#aaa' });
    const rowsS = [[T('等級', 'Level'), m.lv], ['HP', `${m.hp} / ${m.maxhp}`], ['MP', `${m.mp} / ${m.maxmp}`], [T('力量', 'Strength'), m.str], [T('速度', 'Agility'), m.agi], [T('體質', 'Resilience'), m.def],
      [T('攻擊力', 'Attack'), atk(m)], [T('防禦力', 'Defence'), defense(m)], [T('經驗值', 'Experience'), m.xp], [T('距下一級', 'To next level'), Math.max(0, next)]];
    rowsS.forEach(([k, v], i) => { text(k, 18, 34 + i * 13); text(String(v), 140, 34 + i * 13, { align: 'right' }); });
    ['w', 'a', 's', 'h'].forEach((k, i) => text(m.eq[k] ? T(ITEMS[m.eq[k]].name) : '—', 150, 34 + i * 13, { color: '#ccc', size: 7 * SC }));
    text(T('法術', 'Spells'), 150, 92, { color: '#ffe080', size: 7 * SC });
    m.spells.forEach((s, i) => text(T(SPELLS[s].name), 150 + (i % 2) * 48, 104 + Math.floor(i / 2) * 12, { size: 7 * SC }));
    if (m.poison) text(T('中毒', 'Poisoned'), 18, 170, { color: '#8aff8a' });
  });
  await UI.waitKey(); close();
}
async function partyMenu() {
  if (MAP.dungeon) return say(T('馬車進不了這裡。', 'The wagon can\'t come in here.'));
  for (;;) {
    const all = [...S.active, ...S.wagon];
    const i = await menu(all.map((id, k) => ({ label: `${k < S.active.length ? '⚔' : '🛞'} ${nameOf(id)}`, right: `Lv${S.members[id].lv}` })), { x: 40, y: 8, title: T('選兩個人交換位置', 'Pick two to swap') });
    if (i < 0) return;
    const j = await menu(all.map((id, k) => ({ label: `${k < S.active.length ? '⚔' : '🛞'} ${nameOf(id)}`, disabled: k === i })), { x: 140, y: 8, title: T('和誰交換？', 'Swap with?') });
    if (j < 0) continue;
    [all[i], all[j]] = [all[j], all[i]];
    if (all[0] !== 'hero' && !all.slice(0, 4).includes('hero')) { await say(T('勇者必須在前線。', 'The Hero must stay at the front.')); continue; }
    S.active = all.slice(0, 4); S.wagon = all.slice(4);
  }
}
async function systemMenu() {
  const i = await menu([T('音樂：' + (isMuted() ? '關' : '開'), 'Music: ' + (isMuted() ? 'off' : 'on')), EN ? '中文' : 'English', T('回到標題', 'Title screen')], { x: 80, y: 60 });
  if (i === 0) toggleMute();
  if (i === 1) { save(); setLang(EN ? 'zh' : 'en'); }
  if (i === 2 && await ask(T('回到標題畫面？（沒記錄的進度會消失）', 'Return to the title? (Unsaved progress is lost)'), [T('是', 'Yes'), T('否', 'No')]) === 0) { titleMenu(); return true; }
  return false;
}
async function zoomTo() {
  const places = (S.visited || []).map((id) => PLACES.find((p) => p.id === id)).filter((p) => p && (S.ch === 5 || regionOf(p) === S.ch));
  if (!places.length || MAP.dungeon) { await say(T('這裡無法使用。', 'You can\'t use that here.')); return false; }
  const i = await menu(places.map((p) => T(p.name)), { x: 80, y: 40, title: T('要去哪裡？', 'Where to?') }); if (i < 0) return false;
  const p = places[i]; fade = 1; sfx('spell'); await UI.sleep(0.4);
  enterMap('world', p.x, p.y + 1, 'down'); return true;
}
const regionOf = (p) => (p.x <= 21 && p.y <= 21 ? 1 : p.x >= 38 && p.y <= 21 ? 2 : p.x <= 21 && p.y >= 23 ? 3 : p.x >= 38 && p.y >= 23 ? 4 : 5);
function exitDungeon() { const p = PLACES.find((q) => q.id === MAP.exitPlace); fade = 1; enterMap('world', p.x, p.y + 1, 'down'); }

// ---------------------------------------------------------------- moving about
function tryMove(dir) {
  P.dir = dir;
  const [dx, dy] = DIRS[dir], nx = P.x + dx, ny = P.y + dy;
  if (!walkable(nx, ny)) return;
  P.trail.unshift([P.x, P.y, P.dir]); P.trail.length = Math.min(P.trail.length, 8);
  P.moving = { fx: P.x, fy: P.y, t: 0 }; P.x = nx; P.y = ny; P.frame ^= 1;
}
async function arrived() {
  S.x = P.x; S.y = P.y; S.dir = P.dir;
  const t = tileAt(P.x, P.y);
  // off the edge of a town or castle
  if (t === null) { const p = MAP.place; enterMap('world', p.x, p.y + 1, 'down'); return; }
  // a place on the world map
  if (MAP.world) { const p = PLACES.find((q) => q.x === P.x && q.y === P.y); if (p) return enterPlace(p); }
  // stairs
  const w = (MAP.warps || []).find((q) => q.x === P.x && q.y === P.y);
  if (w) {
    sfx('door'); fade = 0.6;
    if (w.to === 'world') return exitDungeon();
    const m = MAPS[w.to], [x, y] = w.end ? m.anchor.end : m.anchor.start;
    return enterMap(w.to, x, y, P.dir);
  }
  // poison hurts on the move
  for (const m of members()) if (m.poison && m.hp > 1) m.hp = Math.max(1, m.hp - 1);
  if (t === 'swamp') for (const m of members()) if (m.hp > 1) m.hp -= 1;
  if (t === 'lava') { fade = 0.25; for (const m of members()) if (m.hp > 1) m.hp = Math.max(1, m.hp - 4); }
  // monsters
  const zone = MAP.world ? worldZone(P.x, P.y) : MAP.enc;
  if (zone && !window.__noEnc) {
    if (S.repel > 0) S.repel--;
    S.steps -= t === 'forest' || t === 'hills' ? 1.5 : t === 'sand' || t === 'swamp' ? 1.25 : 1;
    if (S.steps <= 0 && (!S.repel || Math.random() < 0.15)) {
      S.steps = 10 + Math.random() * 22;
      const group = ZONES[zone][Math.floor(Math.random() * ZONES[zone].length)].map(([id, a, b]) => [id, a + Math.floor(Math.random() * (b - a + 1))]);
      const bg = MAP.bg || (t === 'sand' ? 'desert' : 'field');
      await runScript(async () => { await A.battle(group, { bg }); });
    }
  }
}
async function enterPlace(p) {
  if (p.id === 'c5_shrine_1') {
    const all = ['kaldor', 'rhea', 'barlow', 'cass', 'tolle', 'mira', 'thea', 'orin'].every((id) => S.active.includes(id) || S.wagon.includes(id));
    if (!all) { P.x = p.x; P.y = p.y + 1; await runScript(() => say(T('神殿的大門被神秘的光芒封住了……似乎需要聚齊所有被引導的夥伴。', 'The shrine doors are sealed by a mysterious light… all of the guided companions must be gathered.'))); return; }
  }
  const m = MAPS[p.id]; sfx('door'); fade = 0.6;
  if (m.dungeon) { const [x, y] = m.anchor.start; return enterMap(p.id, x, y, 'down'); }
  return enterMap(p.id, 9, m.h - 1, 'up');
}
async function check() {
  const [dx, dy] = DIRS[P.dir], fx = P.x + dx, fy = P.y + dy;
  let n = npcAt(fx, fy);
  if (!n && tileAt(fx, fy) === 'counter') n = npcAt(fx + dx, fy + dy);           // talk across a counter
  if (n && n.talk) { const st = npcState.get(n); if (st) st.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[P.dir]; return runScript(n.talk); }
  const c = chestAt(fx, fy);
  if (c) return runScript(async () => {
    if (S.flags['chest_' + c.id]) return say(T('寶箱是空的。', 'The chest is empty.'));
    S.flags['chest_' + c.id] = true; sfx('chest');
    if (c.gold) { S.gold += c.gold; return say(T(`打開了寶箱。得到了 ${c.gold} 枚金幣！`, `You open the chest. Inside: ${c.gold} gold!`)); }
    bagAdd(S.bag, c.item); return say(T(`打開了寶箱。得到了${T(ITEMS[c.item].name)}！`, `You open the chest. Inside: ${T(ITEMS[c.item].name)}!`));
  });
  const ck = MAP.checks && MAP.checks[`${fx},${fy}`];
  if (ck) return runScript(async (a) => { await ck(a); });
}

// ---------------------------------------------------------------- party wipe, chapters, the ending
async function wipe() {
  scene = null; music('sad');
  await say(T('全滅了……', 'The party has been wiped out…'));
  S.gold = Math.floor(S.gold / 2);
  for (const m of members()) { m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; }
  const sp = S.savePoint || { map: CHAPTERS[S.ch].start[0], x: CHAPTERS[S.ch].start[1], y: CHAPTERS[S.ch].start[2] };
  fade = 1.5; enterMap(sp.map, sp.x, sp.y, 'down');
  await say(T('……醒來的時候，已經回到了最後記錄的地方。金幣少了一半。', '…You wake at the place you last saved. Half your gold is gone.'));
}
async function chapterEnd(n) {
  music('win');
  S.done = S.done || []; if (!S.done.includes(n)) S.done.push(n);
  await say(T(`── 第${n}章　完 ──`, `── End of Chapter ${n} ──`));
  if (n === 1 && S.active.includes('pupu')) await say(T('噗噗：「我要留在城堡裡繼續修行！騎士大人，再見了！」', 'Pupu: "I\'ll stay at the castle and keep training! Goodbye, sir knight!"'));
  for (const m of members()) healFull(m);
  startChapter(n + 1);
  throw ABORT;
}
function startChapter(n) {
  const C = CHAPTERS[n];
  S.ch = n; S.active = []; S.wagon = []; S.gold = C.gold; S.bag = { ...C.bag }; S.steps = 20; S.repel = 0; S.savePoint = null;
  if (n === 5) { S.flags.open = true; S.tactic = 'normal'; }
  for (const [id, lv, eq] of C.party) { S.members[id] = S.members[id] || newMember(id, lv, eq); S.active.push(id); }
  save();
  mode = 'card'; cardT = 0; cardCh = n;
}
let cardT = 0, cardCh = 1;
async function beginChapter() {
  const C = CHAPTERS[cardCh];
  const [m, x, y, d] = C.start; enterMap(m, x, y, d); mode = 'field';
  await runScript(async () => { await says(C.intro.map((l) => T(l))); });
}
async function c5Attack() {
  await says([T('村長：「孩子……你終於長大了。」', 'Elder: "Child… you have finally grown up."'), T('村長：「你其實是天界之人與人類所生的孩子，是預言中拯救世界的勇者。」', 'Elder: "You are the child of a heavenly being and a human — the Hero of the prophecy who will save the world."'), T('村長：「所以我們把你藏在這深山之中……」', 'Elder: "That is why we hid you here in the mountains…"')]);
  music('boss'); scene = { draw(gg) { gg.fillStyle = `rgba(80,0,0,${0.35 + Math.sin(ftime * 8) * 0.15})`; gg.fillRect(0, 0, VW * SC, VH * SC); } };
  await says([T('「魔物來襲了！！」', '"Monsters! Monsters are attacking!!"'), T('劍術老師：「快！把勇者藏到地下室去！」', 'Sword master: "Quick! Hide the Hero in the cellar!"'), T('莉娜：「……我會用變身魔法變成你的樣子，把魔物引開。」', 'Lina: "…I\'ll use my transformation spell to look like you, and lead the monsters away."'), T('莉娜：「別擔心。我們一定會再見面的。」', 'Lina: "Don\'t worry. We\'ll meet again."')]);
  scene = { draw(gg) { gg.fillStyle = '#000'; gg.fillRect(0, 0, VW * SC, VH * SC); } }; music('sad');
  await says([T('……地下室外傳來了可怕的聲音。', '…Terrible sounds echo outside the cellar.'), T('「找到勇者了！殺了他！」', '"We found the Hero! Kill them!"'), T('……然後，一切歸於寂靜。', '…Then, silence.')]);
  S.flags.c5_attack = true; scene = null; fade = 2;
  await says([T('走出地下室，村子已經化為一片廢墟。', 'When you climb out of the cellar, the village lies in ruins.'), T('莉娜和大家……都不見了。', 'Lina and everyone… are gone.'), T('你握緊了劍——踏上了旅程。', 'You grip your sword — and set out on your journey.'), T('（出了村子往南走，就能到十字路鎮。）', '(South of the village lies Crossroads.)')]);
  S.savePoint = { map: 'c5_cross', x: 9, y: 13, dir: 'up' }; save();
}
let endT = 0;
async function ending() { music('ending'); mode = 'ending'; endT = 0; S.cleared = true; save(); throw ABORT; }

// ---------------------------------------------------------------- the title
let titleSel = 0;
function titleMenu() {
  mode = 'title'; scene = null; UI.stack.length = 0; music('title');
  const has = !!load();
  (async () => {
    const opts = [...(has ? [T('繼續冒險', 'Continue')] : []), T('新的冒險', 'New Adventure'), EN ? '中文' : 'English', T('音樂：', 'Music: ') + (isMuted() ? T('關', 'off') : T('開', 'on'))];
    const i = await menu(opts, { x: 88, y: 150, cancel: false });
    const k = has ? i : i + 1;
    if (k === 0) { S = load(); if (!S.map || !MAPS[S.map]) { mode = 'card'; cardT = 0; cardCh = S.ch; return; } mode = 'field'; enterMap(S.map, S.x, S.y, S.dir || 'down'); return; }
    if (k === 1) {
      if (has && await ask(T('要開始新的冒險嗎？原本的冒險之書會被覆蓋。', 'Start a new adventure? Your Adventure Log will be overwritten.'), [T('開始', 'Start'), T('取消', 'Cancel')]) !== 0) return titleMenu();
      let name = T('艾倫', 'Allen');
      try { const n = prompt(T('請輸入勇者的名字（第五章登場）', 'Name your Hero (they appear in Chapter 5)'), name); if (n && n.trim()) name = n.trim().slice(0, 8); } catch (e) { /* ignore */ }
      S = { v: 1, name, ch: 1, flags: {}, members: {}, active: [], wagon: [], gold: 0, bag: {}, visited: [], steps: 20, repel: 0 };
      return startChapter(1);
    }
    if (k === 2) return setLang(EN ? 'zh' : 'en');
    toggleMute(); titleMenu();
  })();
}

// ---------------------------------------------------------------- drawing
const T16 = 16 * SC;
function drawField() {
  const camX = P.moving ? P.moving.fx + (P.x - P.moving.fx) * P.moving.t : P.x, camY = P.moving ? P.moving.fy + (P.y - P.moving.fy) * P.moving.t : P.y;
  const ox = VW / 2 - 8 - camX * 16, oy = VH / 2 - 8 - camY * 16, frame = Math.floor(ftime * 2) % 2, theme = MAP.theme || 'town';
  g.fillStyle = MAP.world ? '#2a5ac8' : MAP.dungeon ? '#000' : '#1a1a1a'; g.fillRect(0, 0, VW * SC, VH * SC);
  const x0 = Math.floor(-ox / 16) - 1, y0 = Math.floor(-oy / 16) - 1;
  for (let y = y0; y < y0 + 17; y++) for (let x = x0; x < x0 + 18; x++) {
    let tn = tileAt(x, y);
    if (tn === null) { if (MAP.world) tn = 'sea'; else if (MAP.dungeon) continue; else tn = MAP.town ? 'tree' : 'grass'; }
    if (tn === 'miasma' && S.flags.skysword) tn = 'grass';
    const b = barrierAt(x, y); if (b) tn = b.tile;
    if (['castle', 'town', 'village', 'cave', 'tower', 'shrine', 'darkcastle'].includes(tn) && !MAP.world) tn = 'floor';
    g.drawImage(tile(tn, theme, frame), Math.round((ox + x * 16) * SC), Math.round((oy + y * 16) * SC), T16, T16);
  }
  // chests
  for (const c of MAP.chests || []) {
    if (c.when && !c.when(A)) continue;
    const open = S.flags['chest_' + c.id], X = (ox + c.x * 16) * SC, Y = (oy + c.y * 16) * SC;
    g.fillStyle = '#5a3a1a'; g.fillRect(X + 2 * SC, Y + 5 * SC, 12 * SC, 9 * SC);
    g.fillStyle = open ? '#2a1a0a' : '#c8782a'; g.fillRect(X + 3 * SC, Y + 6 * SC, 10 * SC, open ? 3 * SC : 7 * SC);
    if (!open) { g.fillStyle = '#ffd040'; g.fillRect(X + 7 * SC, Y + 8 * SC, 2 * SC, 3 * SC); }
  }
  // people
  const sprites = [];
  for (const n of npcsHere()) {
    let st = npcState.get(n); if (!st) { st = { x: n.x, y: n.y, dir: n.dir || 'down', hx: n.x, hy: n.y, t: Math.random() * 3 }; npcState.set(n, st); }
    if (n.move && !running && !UI.busy()) { st.t -= 1 / 60; if (st.t <= 0) { st.t = 1.5 + Math.random() * 3; const ds = Object.keys(DIRS), d = ds[Math.floor(Math.random() * 4)], [dx, dy] = DIRS[d], nx = st.x + dx, ny = st.y + dy; st.dir = d; if (Math.abs(nx - st.hx) <= 2 && Math.abs(ny - st.hy) <= 2 && tileAt(nx, ny) && WALK.has(tileAt(nx, ny)) && !(nx === P.x && ny === P.y) && !npcAt(nx, ny) && !chestAt(nx, ny)) { st.x = nx; st.y = ny; } } }
    sprites.push({ y: st.y, draw: () => {
      const X = (ox + st.x * 16) * SC, Y = (oy + st.y * 16) * SC;
      if (n.look.startsWith('mon:')) { const md = MONSTERS_ART[n.look.slice(4)]; const sz = 22 * (md.size || 1); g.drawImage(monsterArt(md.art, md.col), X + (8 - sz / 2) * SC, Y + (14 - sz) * SC, sz * SC, sz * SC); }
      else g.drawImage(person(n.look, st.dir, Math.floor(ftime * 2 + n.x) % 2), X, Y - 2 * SC, T16, T16);
    } });
  }
  // the party: the leader, followers in a line, the wagon at the back (chapter 5, outdoors)
  const ids = S.active.filter((id) => S.members[id].hp > 0), followers = Math.min(ids.length - 1, 3);
  const showWagon = S.ch === 5 && S.wagon.length && !MAP.dungeon;
  const pos = (k) => { if (k === 0) return [camX, camY, P.dir]; const tr = P.trail[k - 1]; if (!tr) return null; const prev = k === 1 ? [P.x, P.y] : P.trail[k - 2]; const t = P.moving ? P.moving.t : 1; return [tr[0] + (prev[0] - tr[0]) * (P.moving ? t : 0), tr[1] + (prev[1] - tr[1]) * (P.moving ? t : 0), tr[2]]; };
  for (let k = followers + (showWagon ? 1 : 0); k >= 0; k--) {
    const q = pos(k); if (!q) continue;
    const [x, y, d] = q, X = (ox + x * 16) * SC, Y = (oy + y * 16) * SC;
    sprites.push({ y: y - 0.01 * k, draw: () => { if (k === followers + 1 && showWagon) g.drawImage(wagonSprite(d, P.frame), X, Y - 2 * SC, T16, T16); else g.drawImage(person(CHARS[ids[k] || ids[0]].look, k === 0 ? P.dir : d, P.moving ? P.frame : 0), X, Y - 2 * SC, T16, T16); } });
  }
  sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
  // the place name when on the world map, the party's HP when stopped
  if (MAP.world) { const p = PLACES.find((q) => Math.abs(q.x - P.x) + Math.abs(q.y - P.y) <= 1); if (p) { box(8, 8, Math.max(72, UI.measure(T(p.name)) + 24), 24); text(T(p.name), 18, 14); } }
  else if (MAP.name && ftime - enteredAt < 2.2) { box(8, 8, Math.max(80, UI.measure(T(MAP.name)) + 24), 24); text(T(MAP.name) + (MAP.floor ? ` ${MAP.floor}F` : ''), 18, 14); }
  if (!P.moving && !running && !UI.busy() && idleT > 1.2) {
    const act = S.active.map((id) => S.members[id]), w = Math.min(60, 248 / act.length);
    act.forEach((m, i) => { const bx = 4 + i * w; box(bx, 196, w - 2, 40); const col = m.hp <= 0 ? '#ff5a5a' : m.hp < m.maxhp / 4 ? '#ffd040' : '#fff'; text(nameOf(m.id).slice(0, EN ? 7 : 4), bx + 6, 201, { color: col, size: 7 * SC }); text(`H ${m.hp}`, bx + 6, 213, { color: col, size: 7 * SC }); text(`M ${m.mp}`, bx + 6, 224, { color: col, size: 7 * SC }); });
  }
}
let enteredAt = 0, idleT = 0;
import { MONSTERS as MONSTERS_ART } from './data.js';
function drawTitle() {
  const W = VW * SC, H = VH * SC, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a1440'); gr.addColorStop(1, '#3a1a5a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = (i * 97) % VW, y = (i * 53) % 130; g.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(ftime + i))})`; g.fillRect(x * SC, y * SC, SC, SC); }
  text(T('天命之路', 'Chosen Ones'), 128, 42, { align: 'center', size: 26 * SC, color: '#ffe080' });
  text(T('五章物語', 'A Tale in Five Chapters'), 128, 80, { align: 'center', size: 10 * SC, color: '#fff' });
  ['kaldor', 'rhea', 'barlow', 'cass', 'tolle', 'mira', 'thea', 'orin', 'hero'].forEach((id, i) => g.drawImage(person(CHARS[id].look, 'down', Math.floor(ftime * 2 + i) % 2), (24 + i * 24) * SC, 112 * SC, T16 * 1.2, T16 * 1.2));
  text('© ' + T('像素遊樂場', 'Pixel Playground'), 128, 226, { align: 'center', size: 6 * SC, color: '#888' });
}
function drawCard() {
  const C = CHAPTERS[cardCh]; g.fillStyle = '#000'; g.fillRect(0, 0, VW * SC, VH * SC);
  const a = Math.min(1, cardT / 0.8); g.globalAlpha = a;
  text(T(C.title).split(/[　:]/)[0] + (EN ? '' : ''), 128, 86, { align: 'center', size: 12 * SC, color: '#ffe080' });
  text(T(C.title).split(/[　:]\s?/).slice(1).join(' '), 128, 112, { align: 'center', size: 13 * SC });
  if (cardT > 1.5 && Math.floor(ftime * 2) % 2) text(T('按確定鍵開始', 'Press OK to begin'), 128, 180, { align: 'center', size: 7 * SC, color: '#aaa' });
  g.globalAlpha = 1;
}
function drawEnding() {
  g.fillStyle = '#000'; g.fillRect(0, 0, VW * SC, VH * SC);
  const lines = ENDING.map((l) => T(l)), y0 = 250 - endT * 14;
  let y = y0; for (const l of lines) { for (const w of UI.wrap(l, 220)) { if (y > -20 && y < 260) text(w, 128, y, { align: 'center', color: w.includes('──') ? '#ffe080' : '#fff' }); y += 14; } y += 18; }
  if (y < 0) { text(T('── 完 ──', '── THE END ──'), 128, 110, { align: 'center', size: 14 * SC, color: '#ffe080' }); if (Math.floor(ftime * 2) % 2) text(T('按確定鍵回到標題', 'Press OK for the title'), 128, 150, { align: 'center', size: 7 * SC, color: '#aaa' }); }
}

// ---------------------------------------------------------------- the loop
let last = performance.now(), lastRaf = performance.now();
// animation frames drive the game; if they stall (a hidden tab, a headless test) a timer keeps it going
const rafLoop = (t) => { lastRaf = performance.now(); frame(t); requestAnimationFrame(rafLoop); };
setInterval(() => { if (performance.now() - lastRaf > 150) frame(performance.now()); }, 33);
function frame() {
  const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; ftime += dt;
  g.imageSmoothingEnabled = false;
  if (mode === 'title') drawTitle();
  else if (mode === 'card') { cardT += dt; drawCard(); }
  else if (mode === 'ending') { endT += dt; drawEnding(); }
  else if (mode === 'field' && MAP) {
    if (P.moving) { P.moving.t += dt / 0.17; if (P.moving.t >= 1) { P.moving = null; if (!running) arrived(); } }
    if (!P.moving && !running && !UI.busy() && !scene) { const d = heldDir(); if (d) { tryMove(d); idleT = 0; } else idleT += dt; }
    if (!scene) drawField();
    if (scene) scene.draw(g, dt);
  }
  if (fade > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; g.fillRect(0, 0, VW * SC, VH * SC); fade -= dt * 1.6; }
  UI.tickUI(dt); UI.drawUI();
}
let prevMap = null;
setInterval(() => { if (mapId !== prevMap) { prevMap = mapId; enteredAt = ftime; } }, 50);

// ---------------------------------------------------------------- input
const held = new Set(), order = [];
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
  z: 'ok', Z: 'ok', Enter: 'ok', ' ': 'ok', x: 'back', X: 'back', Escape: 'back', Backspace: 'back', m: 'mute', M: 'mute' };
function heldDir() { for (let i = order.length - 1; i >= 0; i--) if (held.has(order[i])) return order[i]; return null; }
function press(k) {
  unlock();
  if (k === 'mute') { toggleMute(); return; }
  if (UI.busy()) { UI.key(k); return; }
  if (mode === 'card' && k === 'ok' && cardT > 0.8) { beginChapter(); return; }
  if (mode === 'ending' && k === 'ok' && endT > 30) { titleMenu(); return; }
  if (mode !== 'field' || running || P.moving || scene) return;
  if (k === 'ok') check(); else if (k === 'back') runScript(fieldMenu);
}
addEventListener('keydown', (e) => { const k = KEYMAP[e.key]; if (!k) return; e.preventDefault(); if (['up', 'down', 'left', 'right'].includes(k)) { if (!held.has(k)) { held.add(k); order.push(k); if (UI.busy()) UI.key(k); } } else if (!e.repeat) press(k); });
addEventListener('keyup', (e) => { const k = KEYMAP[e.key]; if (k) { held.delete(k); const i = order.indexOf(k); if (i >= 0) order.splice(i, 1); } });
// touch: the on-screen pad
for (const b of document.querySelectorAll('[data-k]')) {
  const k = b.dataset.k, dir = ['up', 'down', 'left', 'right'].includes(k);
  const on = (e) => { e.preventDefault(); unlock(); if (dir) { held.add(k); order.push(k); if (UI.busy()) UI.key(k); } else press(k); b.classList.add('on'); };
  const off = (e) => { e.preventDefault(); if (dir) { held.delete(k); const i = order.indexOf(k); if (i >= 0) order.splice(i, 1); } b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
}
// repeat menu movement while a direction is held
let rep = 0; setInterval(() => { const d = heldDir(); if (d && UI.busy()) { rep++; if (rep > 4) UI.key(d); } else rep = 0; }, 90);

titleMenu();
requestAnimationFrame(rafLoop);
// for tests
window.__co = { get dbg() { return { mode, cardT, busy: UI.busy(), stack: UI.stack.length, running }; }, clearUI: () => { UI.stack.length = 0; }, setLv: (lv) => { for (const m of Object.values(S.members)) Object.assign(m, newMember(m.id, lv, m.eq)); }, get S() { return S; }, set S(v) { S = v; }, A, G, enterMap, startChapter, beginChapter, press, get mode() { return mode; }, get map() { return mapId; }, get P() { return P; }, MAPS, battle: (spec) => runScript(() => A.battle(spec, {})), save, get running() { return running; }, get busy() { return UI.busy(); } };
