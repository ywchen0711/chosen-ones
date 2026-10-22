// Characters, spells, items, equipment, monsters and the monster groups of each area.
// Names are [中文, English].

// ---------------------------------------------------------------- the chosen ones
// base stats at level 1 and growth per level; spells learned at a level; what each can equip
// monsters who join the party ('mon_<monster>') get their sheet made the first time it is looked up
export const CHARS = new Proxy({
  hero:  { name: ['艾倫', 'Allen'], job: ['勇者', 'Hero'], look: 'hero', hp: [30, 7.5], mp: [6, 3], str: [10, 2.5], def: [8, 1.7], agi: [8, 1.6],
    spells: { 2: 'heal', 5: 'evac', 7: 'zoom', 10: 'zap', 14: 'healmore', 18: 'multiheal', 22: 'thunder' } },
  kaldor: { name: ['卡爾德', 'Kaldor'], job: ['王宮戰士', 'Royal Knight'], look: 'kaldor', hp: [40, 9], mp: [0, 0], str: [12, 2.8], def: [10, 2.1], agi: [5, 1.0], spells: {} },
  pupu:   { name: ['噗噗', 'Pupu'], job: ['好史萊姆', 'Good Slime'], look: 'pupu', hp: [22, 4], mp: [10, 3], str: [5, 1.0], def: [6, 1.2], agi: [9, 1.6], spells: { 1: 'heal', 4: 'cure', 6: 'sleep' } },
  rhea:   { name: ['莉雅', 'Rhea'], job: ['武鬥公主', 'Martial Princess'], look: 'rhea', hp: [32, 7], mp: [0, 0], str: [11, 2.7], def: [7, 1.4], agi: [14, 2.3], spells: {}, crit: 10 },
  barlow: { name: ['巴洛', 'Barlow'], job: ['老魔法師', 'Old Wizard'], look: 'barlow', hp: [18, 4], mp: [12, 4.2], str: [5, 0.8], def: [5, 1.0], agi: [7, 1.2],
    spells: { 1: 'fire', 3: 'sleep', 6: 'ice', 9: 'fireball', 12: 'icestorm', 16: 'inferno', 20: 'bang' } },
  cass:   { name: ['卡斯', 'Cass'], job: ['神官', 'Priest'], look: 'cass', hp: [24, 5], mp: [10, 3.6], str: [7, 1.4], def: [7, 1.4], agi: [6, 1.1],
    spells: { 1: 'heal', 3: 'cure', 6: 'sap', 9: 'healmore', 12: 'buff', 15: 'revive', 19: 'multiheal' } },
  tolle:  { name: ['托爾', 'Tolle'], job: ['商人', 'Merchant'], look: 'tolle', hp: [30, 7], mp: [0, 0], str: [9, 2.2], def: [9, 1.9], agi: [4, 0.9], spells: {}, gold: 1.25 },
  mira:   { name: ['米菈', 'Mira'], job: ['舞孃', 'Dancer'], look: 'mira', hp: [20, 4.6], mp: [12, 4], str: [6, 1.2], def: [6, 1.1], agi: [12, 2.1],
    spells: { 1: 'fire', 4: 'fireball', 8: 'bang', 12: 'inferno', 17: 'kaboom' } },
  thea:   { name: ['希雅', 'Thea'], job: ['占卜師', 'Fortune Teller'], look: 'thea', hp: [22, 5], mp: [10, 3.6], str: [6, 1.2], def: [6, 1.2], agi: [9, 1.5],
    spells: { 1: 'heal', 3: 'oomph', 5: 'sleep', 8: 'healmore', 12: 'buff', 16: 'multiheal' } },
  orin:   { name: ['奧林', 'Orin'], job: ['武術家', 'Brawler'], look: 'orin', hp: [38, 8.6], mp: [0, 0], str: [12, 2.6], def: [11, 2.0], agi: [6, 1.1], spells: {} },
}, { get: (t, k) => { if (typeof k === 'string' && !(k in t) && k.startsWith('mon_') && MONSTERS[k.slice(4)]) t[k] = monChar(k.slice(4)); return t[k]; } });
export const xpFor = (lv) => Math.round(10 * Math.pow(lv - 1, 2.4));      // total experience to reach a level
export const MAX_LV = 50;

// ---------------------------------------------------------------- spells
// target: one / group (all monsters of that kind) / all (every monster) / ally / party / self; field: usable outside battle
export const SPELLS = {
  heal:      { name: ['治療', 'Heal'], mp: 3, kind: 'heal', amt: [28, 40], target: 'ally', field: true },
  healmore:  { name: ['大治療', 'Midheal'], mp: 6, kind: 'heal', amt: [80, 110], target: 'ally', field: true },
  multiheal: { name: ['全體治療', 'Multiheal'], mp: 16, kind: 'heal', amt: [70, 95], target: 'party', field: true },
  cure:      { name: ['解毒', 'Squelch'], mp: 2, kind: 'cure', target: 'ally', field: true },
  revive:    { name: ['復活', 'Zing'], mp: 12, kind: 'revive', target: 'dead', field: true },
  fire:      { name: ['火球', 'Frizz'], mp: 2, kind: 'dmg', amt: [12, 18], target: 'one', el: 'fire' },
  fireball:  { name: ['火焰', 'Frizzle'], mp: 5, kind: 'dmg', amt: [26, 36], target: 'group', el: 'fire' },
  inferno:   { name: ['大火焰', 'Kafrizz'], mp: 10, kind: 'dmg', amt: [80, 110], target: 'one', el: 'fire' },
  ice:       { name: ['冰刃', 'Crack'], mp: 3, kind: 'dmg', amt: [18, 26], target: 'group', el: 'ice' },
  icestorm:  { name: ['冰風暴', 'Crackle'], mp: 8, kind: 'dmg', amt: [44, 58], target: 'group', el: 'ice' },
  bang:      { name: ['爆炎', 'Bang'], mp: 6, kind: 'dmg', amt: [22, 32], target: 'all', el: 'fire' },
  kaboom:    { name: ['大爆炎', 'Kaboom'], mp: 15, kind: 'dmg', amt: [80, 100], target: 'all', el: 'fire' },
  zap:       { name: ['迅雷', 'Zap'], mp: 6, kind: 'dmg', amt: [36, 50], target: 'group', el: 'bolt' },
  thunder:   { name: ['天雷', 'Kazap'], mp: 15, kind: 'dmg', amt: [120, 150], target: 'all', el: 'bolt' },
  sleep:     { name: ['睡眠', 'Snooze'], mp: 3, kind: 'sleep', target: 'group' },
  sap:       { name: ['降防', 'Sap'], mp: 3, kind: 'sap', target: 'group' },
  oomph:     { name: ['攻擊提升', 'Oomph'], mp: 6, kind: 'oomph', target: 'ally' },
  buff:      { name: ['守護', 'Kabuff'], mp: 4, kind: 'buff', target: 'party' },
  evac:      { name: ['脫出', 'Evac'], mp: 4, kind: 'evac', target: 'self', field: true, fieldOnly: true },
  zoom:      { name: ['傳送', 'Zoom'], mp: 4, kind: 'zoom', target: 'self', field: true, fieldOnly: true },
};

// ---------------------------------------------------------------- items and equipment
// slot: w weapon, a armour, s shield, h helmet; who: the characters who can equip it ('*' = everyone)
const W = (zh, en, atk, price, who, extra = {}) => ({ name: [zh, en], slot: 'w', atk, price, who, ...extra });
const A = (zh, en, def, price, who, slot = 'a', extra = {}) => ({ name: [zh, en], slot, def, price, who, ...extra });
const FIGHT = 'hero kaldor tolle orin', SWORD = 'hero kaldor tolle', MAGE = 'barlow cass mira thea pupu', ALL = '*';
export const ITEMS = {
  herb:      { name: ['藥草', 'Medicinal Herb'], use: 'heal', amt: [30, 40], price: 8, field: true },
  antidote:  { name: ['解毒草', 'Antidotal Herb'], use: 'cure', price: 10, field: true },
  holywater: { name: ['聖水', 'Holy Water'], use: 'repel', price: 20, field: true },
  wing:      { name: ['奇美拉之翼', 'Chimaera Wing'], use: 'zoom', price: 25, field: true },
  elfwater:  { name: ['精靈之水', 'Elfin Elixir'], use: 'mp', amt: [30, 40], price: 300, field: true },
  leaf:      { name: ['世界樹之葉', 'Yggdrasil Leaf'], use: 'revive', price: 2000, field: true },
  ruby:      { name: ['紅寶石', 'Ruby'], price: 600, gem: true },
  sapphire:  { name: ['藍寶石', 'Sapphire'], price: 900, gem: true },
  // key items
  songstone: { name: ['歌之石', 'Song Stone'], key: true },
  goldstatue:{ name: ['黃金像', 'Golden Statue'], price: 3000, gem: true },
  letter:    { name: ['士兵的信', 'Soldier\'s Letter'], key: true },
  starstone: { name: ['星之石', 'Star Stone'], key: true },
  locket:    { name: ['舊墜子', 'Old Locket'], key: true },
  desertrose:{ name: ['沙漠玫瑰', 'Desert Rose'], key: true },
  feather:   { name: ['莉娜的羽毛帽', 'Lina\'s Feather Cap'], key: true },
  // weapons
  stick:     W('橡木杖', 'Oaken Staff', 4, 15, MAGE + ' ' + FIGHT),
  dagger:    W('短劍', 'Dagger', 8, 40, ALL),
  copper:    W('銅劍', 'Copper Sword', 12, 100, SWORD + ' orin'),
  claw:      W('鐵爪', 'Iron Claw', 14, 120, 'rhea orin'),
  whip:      W('皮鞭', 'Leather Whip', 10, 90, 'mira thea'),
  spear:     W('鐵矛', 'Iron Spear', 20, 300, FIGHT),
  magicstaff:W('魔法杖', 'Magic Staff', 14, 500, MAGE),
  ironclaw:  W('鋼爪', 'Steel Claw', 30, 900, 'rhea orin'),
  steel:     W('鋼劍', 'Steel Sword', 34, 1500, SWORD),
  chainwhip: W('鎖鏈鞭', 'Chain Whip', 26, 1200, 'mira thea'),
  battleaxe: W('戰斧', 'Battle Axe', 44, 2800, 'kaldor tolle orin'),
  zombie:    W('破邪之劍', 'Zombie Slayer', 50, 4200, SWORD),
  demonclaw: W('魔獸之爪', 'Beast Claw', 52, 5000, 'rhea orin'),
  sagestaff: W('賢者之杖', 'Sage\'s Staff', 32, 4000, MAGE),
  platinum:  W('白金劍', 'Platinum Sword', 62, 7000, SWORD),
  skysword:  W('天空之劍', 'Sword of Heaven', 90, 0, 'hero'),
  // armour
  clothes:   A('布衣', 'Plain Clothes', 4, 10, ALL),
  leather:   A('皮甲', 'Leather Armour', 8, 70, ALL),
  silk:      A('絲綢法衣', 'Silk Robe', 12, 180, MAGE),
  chain:     A('鎖子甲', 'Chain Mail', 16, 350, FIGHT + ' rhea'),
  iron:      A('鐵鎧', 'Iron Armour', 25, 1000, FIGHT),
  magicrobe: A('魔法法衣', 'Magic Robe', 24, 1400, MAGE + ' rhea'),
  steelmail: A('鋼鎧', 'Steel Armour', 36, 2600, FIGHT),
  dancer:    A('舞孃之衣', 'Dancer\'s Costume', 30, 2400, 'mira rhea thea'),
  platmail:  A('白金鎧', 'Platinum Mail', 48, 6000, FIGHT),
  skyarmor:  A('天空之鎧', 'Armour of Heaven', 70, 0, 'hero'),
  // shields and helmets
  potlid:    A('鍋蓋', 'Pot Lid', 2, 10, ALL, 's'),
  lshield:   A('皮盾', 'Leather Shield', 4, 60, ALL, 's'),
  ishield:   A('鐵盾', 'Iron Shield', 12, 700, FIGHT + ' rhea', 's'),
  mshield:   A('魔法盾', 'Magic Shield', 18, 2000, ALL, 's'),
  skyshield: A('天空之盾', 'Shield of Heaven', 40, 0, 'hero', 's'),
  hat:       A('皮帽', 'Leather Hat', 2, 20, ALL, 'h'),
  helm:      A('鐵盔', 'Iron Helmet', 9, 900, FIGHT, 'h'),
  tiara:     A('金冠', 'Golden Tiara', 10, 1200, 'rhea mira thea cass barlow', 'h'),
  skyhelm:   A('天空之盔', 'Helm of Heaven', 22, 0, 'hero', 'h'),
  // more weapons (bonus: added to strength / agility; fx: a special power, see FX)
  boomerang: W('回力鏢', 'Boomerang', 10, 150, ALL),
  holyknife: W('聖銀短刀', 'Silver Knife', 18, 420, ALL),
  rapier:    W('細劍', 'Rapier', 22, 560, 'hero rhea mira tolle', { bonus: { agi: 4 } }),
  flail:     W('鏈錘', 'Flail', 26, 680, 'kaldor tolle orin'),
  thunderstaff: W('雷電之杖', 'Thunder Staff', 24, 1800, MAGE),
  bastard:   W('雙手大劍', 'Bastard Sword', 40, 2200, SWORD),
  dragonclaw:W('龍之爪', 'Dragon Claw', 42, 2600, 'rhea orin'),
  wizardwand:W('巫師之杖', 'Wizard\'s Wand', 28, 2400, MAGE, { bonus: { agi: 3 } }),
  starwhip:  W('星光之鞭', 'Starlight Whip', 38, 3000, 'mira thea'),
  flamesword:W('火焰之劍', 'Flame Sword', 48, 3600, SWORD),
  demonaxe:  W('魔神之斧', 'Demon Axe', 80, 9000, 'kaldor tolle orin'),
  miracle:   W('奇蹟之劍', 'Miracle Sword', 72, 9500, SWORD, { fx: 'regen' }),
  // more armour
  travel:    A('旅人之衣', 'Traveller\'s Clothes', 6, 40, ALL),
  scale:     A('鱗甲', 'Scale Armour', 12, 240, FIGHT + ' rhea'),
  cloak:     A('魔法斗篷', 'Magic Cloak', 18, 900, MAGE + ' rhea'),
  mirrorarmor: A('魔鏡之鎧', 'Mirror Armour', 42, 4500, FIGHT),
  angelrobe: A('天使之袍', 'Angel Robe', 40, 5000, MAGE + ' rhea', 'a', { fx: 'regen' }),
  dragonmail:A('龍鱗之鎧', 'Dragon Mail', 58, 9000, FIGHT),
  // more shields and helmets
  bronzeshield: A('青銅盾', 'Bronze Shield', 7, 250, ALL, 's'),
  scaleshield:  A('鱗盾', 'Scale Shield', 9, 400, ALL, 's'),
  dragonshield: A('龍之盾', 'Dragon Shield', 26, 3500, FIGHT + ' rhea', 's'),
  goddess:   A('女神之盾', 'Goddess Shield', 34, 9000, ALL, 's', { fx: 'mpregen' }),
  bandana:   A('頭巾', 'Bandana', 3, 40, ALL, 'h'),
  hood:      A('魔法帽', 'Wizard\'s Hat', 6, 300, MAGE, 'h'),
  hairband:  A('疾風髮帶', 'Gale Hairband', 8, 1600, 'rhea mira thea', 'h', { bonus: { agi: 8 } }),
  steelhelm: A('鋼盔', 'Steel Helmet', 14, 2000, FIGHT, 'h'),
  greathelm: A('大魔頭盔', 'Great Helm', 22, 8000, FIGHT, 'h'),
  // gauntlets: a little defence and a little attack
  gloves:    A('皮手套', 'Leather Gloves', 2, 30, ALL, 'g', { atk: 1 }),
  silkgloves:A('絲手套', 'Silk Gloves', 4, 400, MAGE, 'g', { bonus: { agi: 3 } }),
  ironfist:  A('鐵護手', 'Iron Gauntlets', 5, 500, FIGHT + ' rhea', 'g', { atk: 3 }),
  powergloves: A('力量手套', 'Power Gloves', 6, 2400, FIGHT + ' rhea', 'g', { atk: 8 }),
  steelfist: A('鋼護手', 'Steel Gauntlets', 10, 2800, FIGHT, 'g', { atk: 5 }),
  kaiser:    A('帝王護手', 'Kaiser Gauntlets', 14, 8000, FIGHT + ' rhea', 'g', { atk: 12 }),
  // boots: a little defence and some speed
  sandals:   A('草鞋', 'Straw Sandals', 1, 20, ALL, 'b', { bonus: { agi: 1 } }),
  boots:     A('皮靴', 'Leather Boots', 3, 120, ALL, 'b', { bonus: { agi: 2 } }),
  ironboots: A('鐵靴', 'Iron Boots', 8, 800, FIGHT, 'b'),
  silverboots: A('銀靴', 'Silver Boots', 10, 2600, ALL, 'b', { bonus: { agi: 4 } }),
  wingboots: A('疾風之靴', 'Wind Boots', 5, 3000, ALL, 'b', { bonus: { agi: 12 } }),
  pegasus:   A('天馬之靴', 'Pegasus Boots', 12, 9000, ALL, 'b', { bonus: { agi: 20 } }),
  // rings
  strring:   A('力量戒指', 'Ring of Strength', 0, 900, ALL, 'r', { bonus: { str: 5 } }),
  agiring:   A('敏捷戒指', 'Ring of Speed', 0, 900, ALL, 'r', { bonus: { agi: 8 } }),
  wakering:  A('清醒之戒', 'Ring of Waking', 0, 1200, ALL, 'r', { fx: 'nosleep' }),
  lifering:  A('生命戒指', 'Ring of Life', 0, 2500, ALL, 'r', { fx: 'regen' }),
  prayerring:A('祈禱戒指', 'Prayer Ring', 0, 2500, ALL, 'r', { fx: 'mpregen' }),
  critring:  A('會心戒指', 'Ring of Fury', 0, 3500, ALL, 'r', { fx: 'crit' }),
  sagering:  A('賢者之戒', 'Sage\'s Ring', 0, 8000, ALL, 'r', { fx: 'xp' }),
  // necklaces
  charm:     A('護身符', 'Lucky Charm', 3, 200, ALL, 'n'),
  antidotal: A('解毒項鍊', 'Antidote Pendant', 1, 600, ALL, 'n', { fx: 'nopoison' }),
  goldneck:  A('黃金項鍊', 'Gold Necklace', 2, 1500, ALL, 'n', { fx: 'gold' }),
  luckbell:  A('幸運鈴鐺', 'Lucky Bell', 2, 2000, ALL, 'n', { fx: 'luck' }),
  guardneck: A('守護項鍊', 'Guardian Pendant', 10, 3000, ALL, 'n'),
  starpendant: A('星之墜飾', 'Star Pendant', 6, 8000, ALL, 'n', { bonus: { str: 6, agi: 6 } }),
  // after the ending: what the Abyss King leaves behind
  doomblade: W('終焉之劍', 'Doomblade', 110, 0, SWORD + ' rhea orin', { fx: 'crit' }),
  abysscrown:A('深淵之冠', 'Abyss Crown', 30, 0, ALL, 'h', { fx: 'regen' }),
  voidring:  A('虛空之戒', 'Void Ring', 4, 0, ALL, 'r', { bonus: { str: 10, agi: 10 }, fx: 'mpregen' }),
};
// the eight equipment slots, and what the special powers do
export const SLOTS = [['w', '武器', 'Weapon'], ['a', '鎧甲', 'Armour'], ['s', '盾牌', 'Shield'], ['h', '頭盔', 'Helmet'], ['g', '護手', 'Gauntlets'], ['b', '靴子', 'Boots'], ['r', '戒指', 'Ring'], ['n', '項鍊', 'Necklace']];
export const FX = {
  regen: ['每回合回復 HP', 'Regains HP each round'], mpregen: ['每回合回復 MP', 'Regains MP each round'], crit: ['容易打出會心一擊', 'More excellent hits'],
  nopoison: ['不會中毒', 'Immune to poison'], nosleep: ['不會睡著', 'Immune to sleep'], gold: ['戰鬥金幣 +25%', 'Battle gold +25%'],
  xp: ['經驗值 +15%', 'Experience +15%'], luck: ['掉寶率提升（每人可疊加）', 'More treasure drops (stacks per wearer)'],
};
// what each item is, for the menus and shops
const DESC = {
  herb: ['藥效溫和的草藥，恢復一名同伴約 30～40 HP。', 'A gentle remedy: restores about 30-40 HP to one ally.'],
  antidote: ['苦苦的草，嚼下去能解除一名同伴的中毒。', 'A bitter herb that cures one ally of poison.'],
  holywater: ['在野外灑下，一段時間內弱小的魔物不會靠近。', 'Sprinkle it outdoors and weak monsters keep away a while.'],
  wing: ['往天上一拋，就能飛回去過的城鎮。', 'Toss it skyward to fly back to a town you have visited.'],
  elfwater: ['精靈釀的清水，恢復一名同伴約 30～40 MP。', 'Water brewed by elves: restores about 30-40 MP to one ally.'],
  leaf: ['世界樹的葉子，能讓倒下的同伴復活。', 'A leaf of the World Tree: brings a fallen ally back.'],
  ruby: ['閃閃發亮的紅寶石。商店會出好價錢收購。', 'A gleaming ruby. Shops will pay well for it.'],
  sapphire: ['深藍色的寶石，比紅寶石更值錢。', 'A deep blue gem, worth even more than a ruby.'],
  goldstatue: ['純金打造的雕像，非常沉重，也非常值錢。', 'A statue of solid gold: very heavy and worth a fortune.'],
  songstone: ['會唱歌的神秘石頭，據說能讓失去聲音的人再次開口。', 'A stone that sings. They say it gives a lost voice back.'],
  letter: ['年輕士兵寫給住在薊村東邊的母親的信。', 'A young soldier\'s letter to his mother in east Thistle.'],
  starstone: ['在黑暗中發出微光的石頭。托爾的兒子想送給媽媽。', 'A stone that glows in the dark. Tolle\'s son wants it for his mum.'],
  locket: ['在礦坑深處找到的舊墜子，背面刻著名字。', 'An old locket found deep in the mine, a name on its back.'],
  desertrose: ['只在沙漠開的花，像玫瑰一樣的石頭結晶。', 'A crystal that blooms like a rose, found only in the desert.'],
  feather: ['沾滿灰塵的羽毛帽。莉娜曾經戴著它。', 'A dusty feathered cap. Lina used to wear it.'],
  stick: ['一根結實的橡木杖，誰都拿得動。', 'A sturdy oak staff anyone can swing.'],
  dagger: ['輕巧的短劍，人人都能用。', 'A light blade anyone can use.'],
  copper: ['新手劍士的第一把劍。', 'The first sword of many a young fighter.'],
  claw: ['套在拳頭上的鐵爪，適合武鬥家。', 'Iron claws worn over the fists, for brawlers.'],
  whip: ['舞孃姐妹愛用的皮鞭。', 'A leather whip, favoured by the dancing sisters.'],
  spear: ['長長的鐵矛，能在敵人靠近前出手。', 'A long iron spear that strikes before the foe gets close.'],
  magicstaff: ['注入魔力的手杖，魔法師也能拿來打人。', 'A staff full of magic; casters can hit with it too.'],
  ironclaw: ['鋼鐵打造的利爪，比鐵爪銳利得多。', 'Claws of steel, far sharper than iron ones.'],
  steel: ['鍛造精良的鋼劍，戰士的好夥伴。', 'A well-forged steel sword, a fighter\'s friend.'],
  chainwhip: ['前端綁著鐵鏈的鞭子，打起來很痛。', 'A whip tipped with chain. It stings.'],
  battleaxe: ['沉重的雙刃戰斧，需要力氣才揮得動。', 'A heavy double-bladed axe for the strong.'],
  zombie: ['受過祝福的劍，能斬斷邪惡之物。', 'A blessed blade made to cut down the unholy.'],
  demonclaw: ['以魔獸之牙打造的爪，鋒利無比。', 'Claws made from a great beast\'s fangs. Wickedly sharp.'],
  sagestaff: ['賢者使用過的手杖，蘊含強大的力量。', 'A staff once held by a sage, humming with power.'],
  platinum: ['白金打造的名劍，閃耀著光芒。', 'A shining blade of platinum.'],
  skysword: ['傳說中天空勇者的劍。只有勇者能使用。', 'The legendary sword of the hero of the skies. Hero only.'],
  boomerang: ['丟出去會飛回來的木製武器。', 'A wooden weapon that comes back when thrown.'],
  holyknife: ['用聖銀打造的短刀，閃著清澈的光。', 'A short knife of hallowed silver, clear and bright.'],
  rapier: ['細長輕巧的劍，揮起來身手更加靈活。', 'A slender, light sword that keeps you quick on your feet.'],
  flail: ['鐵鏈連著鐵球的武器，砸下去力道驚人。', 'An iron ball on a chain. It lands hard.'],
  thunderstaff: ['杖頭封著雷電之力的手杖。', 'A staff with lightning sealed in its head.'],
  bastard: ['需要兩手握住的大劍，威力十足。', 'A great sword gripped with both hands. Hits hard.'],
  dragonclaw: ['用龍的爪子打造的拳爪。', 'Fist claws made from a dragon\'s talons.'],
  wizardwand: ['巫師的魔杖，讓持有者的動作更敏捷。', 'A wizard\'s wand that quickens its holder.'],
  starwhip: ['像星光一樣閃爍的長鞭。', 'A long whip that glitters like starlight.'],
  flamesword: ['劍身燃燒著火焰的魔劍。', 'A magic sword wreathed in flame.'],
  demonaxe: ['魔神的巨斧，擁有恐怖的破壞力。', 'A demon lord\'s great axe, terrible in power.'],
  miracle: ['會帶來奇蹟的劍，持有者的傷口會慢慢癒合。', 'A sword of miracles: its bearer\'s wounds slowly close.'],
  clothes: ['普通的布衣。總比什麼都不穿好。', 'Plain cloth clothes. Better than nothing.'],
  leather: ['鞣製皮革做的護甲，輕便又耐用。', 'Tanned leather armour, light and tough.'],
  silk: ['用絲綢織成的法衣，魔法師愛穿。', 'A silken robe, loved by spellcasters.'],
  chain: ['用鐵環編成的鎖子甲。', 'Mail woven from iron rings.'],
  iron: ['厚重的鐵鎧，防禦力很高。', 'Heavy iron armour with solid protection.'],
  magicrobe: ['織入魔力的法衣，輕巧又堅固。', 'A robe woven with magic, light yet strong.'],
  steelmail: ['鋼鐵打造的鎧甲，戰士的首選。', 'Steel plate, the fighter\'s choice.'],
  dancer: ['舞孃的華麗衣裳，意外地很堅固。', 'A dancer\'s dazzling costume, surprisingly tough.'],
  platmail: ['白金打造的鎧甲，閃亮又堅固。', 'Armour of platinum, bright and strong.'],
  skyarmor: ['傳說中天空勇者的鎧甲。只有勇者能穿。', 'The legendary armour of the hero of the skies. Hero only.'],
  travel: ['旅人穿的結實衣服。', 'Hard-wearing clothes for the road.'],
  scale: ['用魔物鱗片做成的鎧甲。', 'Armour made from monster scales.'],
  cloak: ['能擋住攻擊的魔法斗篷。', 'A magic cloak that turns blows aside.'],
  mirrorarmor: ['表面像鏡子一樣光亮的鎧甲。', 'Armour polished bright as a mirror.'],
  angelrobe: ['天使的長袍，穿著的人每回合會恢復 HP。', 'An angel\'s robe: its wearer regains HP each round.'],
  dragonmail: ['用龍鱗打造的鎧甲，堅不可摧。', 'Armour of dragon scales. Nearly unbreakable.'],
  potlid: ['廚房裡的鍋蓋。可以當盾牌用……大概。', 'A kitchen pot lid. It works as a shield… sort of.'],
  lshield: ['輕便的皮盾。', 'A light leather shield.'],
  ishield: ['結實的鐵盾。', 'A sturdy iron shield.'],
  mshield: ['施了魔法的盾牌，誰都能用。', 'An enchanted shield anyone can carry.'],
  skyshield: ['傳說中天空勇者的盾。只有勇者能用。', 'The legendary shield of the hero of the skies. Hero only.'],
  hat: ['簡單的皮帽。', 'A simple leather hat.'],
  helm: ['保護頭部的鐵盔。', 'An iron helmet to guard your head.'],
  tiara: ['黃金打造的頭冠，適合公主和舞孃。', 'A golden tiara fit for princesses and dancers.'],
  skyhelm: ['傳說中天空勇者的頭盔。只有勇者能戴。', 'The legendary helm of the hero of the skies. Hero only.'],
  bronzeshield: ['青銅打造的圓盾。', 'A round shield of bronze.'],
  scaleshield: ['用魔物鱗片做成的盾牌。', 'A shield made from monster scales.'],
  dragonshield: ['用龍鱗打造的盾牌，連火焰也擋得住。', 'A shield of dragon scales that even holds back fire.'],
  goddess: ['女神祝福過的盾，持有者每回合會恢復 MP。', 'A shield blessed by the goddess: its bearer regains MP each round.'],
  bandana: ['綁在頭上的布巾。', 'A cloth tied round the head.'],
  hood: ['魔法師戴的尖帽子。', 'A pointed wizard\'s hat.'],
  hairband: ['像風一樣輕的髮帶，讓人動作更快。', 'A hairband light as the wind. Makes you quicker.'],
  steelhelm: ['鋼鐵打造的頭盔。', 'A helmet of steel.'],
  greathelm: ['魔物頭骨般的巨大頭盔，防禦力極高。', 'A huge helm shaped like a fiend\'s skull. Very strong.'],
  gloves: ['皮製手套，拳頭打起來更有力。', 'Leather gloves that put a little weight behind a punch.'],
  silkgloves: ['絲質手套，讓施法的手更靈巧。', 'Silk gloves that keep a caster\'s hands nimble.'],
  ironfist: ['鐵製護手，能保護手臂也能打人。', 'Iron gauntlets: guard your arms, hit a bit harder.'],
  powergloves: ['能讓力量湧出的手套，攻擊大幅提升。', 'Gloves that pour strength into your blows.'],
  steelfist: ['鋼製護手，攻守兼備。', 'Steel gauntlets, good for attack and defence.'],
  kaiser: ['古代帝王使用的護手，攻擊力極高。', 'Gauntlets of an ancient emperor. Fearsome blows.'],
  sandals: ['草編的鞋子，走起來輕快一點。', 'Woven straw sandals, a little light on the feet.'],
  boots: ['結實的皮靴。', 'Sturdy leather boots.'],
  ironboots: ['沉重的鐵靴，防禦不錯但不會變快。', 'Heavy iron boots: good guard, no extra speed.'],
  silverboots: ['銀色的靴子，又輕又堅固。', 'Silver boots, light and strong.'],
  wingboots: ['穿上後腳步像風一樣快。', 'Boots that make your feet as quick as the wind.'],
  pegasus: ['傳說中天馬的靴子，速度大幅提升。', 'Boots of the winged horse. A huge burst of speed.'],
  strring: ['戴上後力氣會變大的戒指。', 'A ring that makes its wearer stronger.'],
  agiring: ['戴上後動作會變快的戒指。', 'A ring that makes its wearer faster.'],
  wakering: ['戴上後不會被催眠的戒指。', 'A ring that keeps its wearer from falling asleep.'],
  lifering: ['戴上後每回合會慢慢恢復 HP。', 'A ring that restores a little HP each round.'],
  prayerring: ['戴上後每回合會慢慢恢復 MP。', 'A ring that restores a little MP each round.'],
  critring: ['戴上後更容易打出會心一擊。', 'A ring that makes excellent hits more likely.'],
  sagering: ['賢者的戒指，戰鬥獲得的經驗值增加。', 'A sage\'s ring: more experience from battles.'],
  charm: ['保佑平安的護身符。', 'A lucky charm to keep you safe.'],
  antidotal: ['戴上後不會中毒的項鍊。', 'A pendant that keeps poison away.'],
  goldneck: ['黃金項鍊，戰鬥獲得的金幣增加。', 'A gold necklace: more gold from battles.'],
  luckbell: ['叮噹作響的鈴鐺。每多一人戴（含馬車），掉寶率就多加一倍。', 'A jingling bell. Each wearer, wagon included, adds the base drop chance again.'],
  guardneck: ['有守護之力的項鍊，防禦力很高。', 'A pendant with a guardian\'s power. Strong defence.'],
  starpendant: ['星星形狀的墜飾，同時提升力量和速度。', 'A star-shaped pendant that raises strength and speed.'],
  doomblade: ['深淵之王的劍，斬斷一切的終焉之刃。容易打出會心一擊。', 'The Abyss King\'s blade, the edge that ends all things. Lands excellent hits often.'],
  abysscrown: ['深淵之王的王冠。戴著的人每回合會恢復 HP。', 'The Abyss King\'s crown. Its wearer regains HP each round.'],
  voidring: ['從虛空中取出的戒指，大幅提升力量和速度，每回合恢復 MP。', 'A ring drawn out of the void: much more strength and speed, and MP each round.'],
};
for (const [k, d] of Object.entries(DESC)) if (ITEMS[k]) ITEMS[k].desc = d;
// the lines an item's info box shows, as [中文, English] pairs: gear gets a line of stats and powers first
export function itemLines(k) {
  const it = ITEMS[k], out = []; if (!it) return out;
  if (it.slot) {
    const sl = SLOTS.find(([s]) => s === it.slot), zh = [sl[1]], en = [sl[2]];
    if (it.atk) { zh.push(`攻擊+${it.atk}`); en.push(`ATK +${it.atk}`); }
    if (it.def) { zh.push(`防禦+${it.def}`); en.push(`DEF +${it.def}`); }
    for (const [s, v] of Object.entries(it.bonus || {})) { zh.push(`${{ str: '力量', agi: '速度', def: '體質' }[s]}+${v}`); en.push(`${{ str: 'STR', agi: 'AGI', def: 'RES' }[s]} +${v}`); }
    if (it.fx) { zh.push(FX[it.fx][0]); en.push(FX[it.fx][1]); }
    out.push([zh.join('  '), en.join('  ')]);
  }
  if (it.desc) out.push(it.desc);
  return out;
}
export const GOLD_RATE = 1.5;          // battle gold (50% more than the monster table says)
export const XP_RATE = 1;              // battle experience (the monster table times this)
export const canEquip = (it, cid) => it.who === '*' || it.who.split(' ').includes(cid);

// ---------------------------------------------------------------- monsters
// art: the drawing (see art.js) and its colours; acts: what it does in battle (weighted); boss: can't be fled
// drop: [item, 1 in N]
const M = (zh, en, art, col, hp, atk, def, agi, xp, gold, acts = [['attack', 1]], extra = {}) => ({ name: [zh, en], art, col, hp, atk, def, agi, xp, gold, acts, ...extra });
export const MONSTERS = {
  // chapter 1: the northern kingdom
  slime:    M('史萊姆', 'Slime', 'slime', ['#3a8cff', '#9ad0ff'], 8, 9, 4, 4, 1, 2, undefined, { drop: ['herb', 12] }),
  drakee:   M('吸血蝙蝠', 'Dracky', 'bat', ['#7a4ab8', '#c8a0ff'], 11, 11, 5, 10, 2, 3),
  rabbit:   M('角兔', 'Hornrabbit', 'rabbit', ['#e8d8b8', '#ff8a8a'], 14, 13, 6, 9, 3, 4),
  shroom:   M('毒蘑菇', 'Toadstool', 'shroom', ['#d84a4a', '#f4e8d0'], 16, 12, 7, 4, 3, 5, [['attack', 3], ['poison', 1]], { drop: ['antidote', 10] }),
  lantern:  M('燈籠幽靈', 'Lamp Ghost', 'ghost', ['#f0a030', '#fff0a0'], 20, 15, 9, 11, 5, 6, [['attack', 3], ['fire', 1]]),
  skeleton: M('骷髏兵', 'Skeleton', 'skeleton', ['#e8e4d8', '#6a5a4a'], 26, 20, 12, 6, 7, 8),
  bubble:   M('毒泡泡', 'Bubble Slime', 'slime', ['#4ab84a', '#b8f0a0'], 18, 15, 8, 7, 4, 5, [['attack', 2], ['poison', 1]]),
  imp:      M('小惡魔', 'Imp', 'imp', ['#c84a4a', '#ffc070'], 22, 15, 10, 12, 6, 9, [['attack', 3], ['fire', 1], ['heal', 1]]),
  shade:    M('影魔', 'Shadow Fiend', 'ghost', ['#3a2a5a', '#b080ff'], 170, 28, 16, 12, 140, 200, [['attack', 3], ['darkfire', 2], ['call:drakee', 1]], { boss: true, size: 1.4 }),
  // chapter 2: the eastern palace
  wolf:     M('野狼', 'Wild Wolf', 'wolf', ['#7a7a8a', '#d0d0e0'], 18, 15, 7, 15, 10, 12),
  chimera:  M('奇美拉', 'Chimaera', 'bird', ['#d8783a', '#ffe08a'], 21, 16, 9, 17, 12, 14, [['attack', 3], ['fire', 1]], { drop: ['wing', 10] }),
  mage:     M('魔術師', 'Magician', 'mage', ['#4a3a9a', '#ffd070'], 17, 12, 7, 12, 13, 16, [['attack', 1], ['fire', 2], ['sleep', 1]]),
  mandrake: M('曼陀羅草', 'Mandrake', 'plant', ['#3aa04a', '#ff7ab0'], 24, 15, 10, 5, 14, 15, [['attack', 3], ['sleep', 1]]),
  knight:   M('鐵甲騎士', 'Iron Knight', 'knight', ['#8a96a8', '#d84a4a'], 59, 31, 25, 10, 22, 25),
  viper:    M('毒蛇', 'Viper', 'snake', ['#5ab04a', '#f0e04a'], 48, 32, 17, 18, 20, 20, [['attack', 3], ['poison', 1]]),
  gladiator:M('角鬥士', 'Gladiator', 'knight', ['#b08a3a', '#3a3a3a'], 120, 40, 28, 18, 60, 60, [['attack', 3], ['double', 1]], { boss: true }),
  vulture:  M('禿鷹術士', 'Vulture Mage', 'bird', ['#5a4a3a', '#d0b090'], 110, 34, 22, 22, 60, 60, [['attack', 2], ['fireball', 2], ['heal', 1]], { boss: true }),
  ironclaw: M('鐵爪將軍', 'General Ironclaw', 'beast', ['#5a5a6a', '#ff5a3a'], 300, 42, 28, 22, 450, 500, [['attack', 3], ['double', 2], ['roar', 1]], { boss: true, size: 1.4 }),
  // chapter 3: the western lakes
  scorpion: M('毒蠍', 'Scorpion', 'scorpion', ['#b0783a', '#4a2a1a'], 20, 14, 11, 12, 25, 30, [['attack', 3], ['poison', 1]]),
  bigshroom:M('大蘑菇', 'Funghoul', 'shroom', ['#8a4ab8', '#f0e0ff'], 21, 12, 7, 8, 22, 28, [['attack', 2], ['sleep', 1]]),
  statue:   M('活石像', 'Living Statue', 'golem', ['#9a9a8a', '#e0d8a0'], 53, 30, 30, 6, 30, 40),
  bat2:     M('吸血大蝙蝠', 'Drackmage', 'bat', ['#3a3a7a', '#ff6a8a'], 16, 13, 6, 22, 22, 25, [['attack', 2], ['ice', 1]]),
  minegolem:M('礦坑巨像', 'Mine Golem', 'golem', ['#8a6a4a', '#ffb040'], 278, 46, 28, 8, 700, 800, [['attack', 3], ['quake', 1]], { boss: true, size: 1.5 }),
  // chapter 4: the southern desert
  sandworm: M('沙蟲', 'Sand Viper', 'snake', ['#d8b06a', '#8a4a2a'], 30, 16, 10, 14, 40, 45, [['attack', 3], ['poison', 1]]),
  boneknight:M('骸骨騎士', 'Bone Knight', 'skeleton', ['#d8d0b8', '#6a2a8a'], 29, 18, 12, 12, 45, 50, [['attack', 3], ['double', 1]]),
  darkpriest:M('黑暗神官', 'Dark Priest', 'mage', ['#2a2a3a', '#ff4a4a'], 24, 13, 10, 16, 42, 48, [['attack', 1], ['fireball', 1], ['heal', 1]], { drop: ['elfwater', 20] }),
  bigscorp: M('鐵甲蠍', 'Iron Scorpion', 'scorpion', ['#4a5a7a', '#c0c8e0'], 27, 17, 15, 15, 40, 46),
  tsand:    M('巨沙蟲', 'Giant Sand Viper', 'snake', ['#b8803a', '#5a2a1a'], 79, 42, 26, 14, 78, 70, [['attack', 3], ['poison', 1]]),
  tbone:    M('骸骨將軍', 'Bone General', 'skeleton', ['#e8e0c8', '#3a1a6a'], 75, 46, 32, 12, 86, 76, [['attack', 3], ['double', 1]]),
  tpriest:  M('黑暗主教', 'Dark Bishop', 'mage', ['#1a1a2a', '#ff7a2a'], 61, 35, 26, 16, 80, 72, [['attack', 1], ['fireball', 1], ['heal', 1]]),
  tscorp:   M('鋼甲蠍', 'Steel Scorpion', 'scorpion', ['#3a4a6a', '#e0e8ff'], 70, 44, 39, 15, 78, 70),
  barga:    M('鍊金師巴爾加', 'Barga the Alchemist', 'mage', ['#6a1a3a', '#ffd040'], 700, 58, 38, 24, 1300, 1200, [['attack', 2], ['fireball', 2], ['inferno', 1], ['icestorm', 1]], { boss: true, size: 1.4 }),
  // chapter 5: the whole world
  ogre:     M('食人魔', 'Ogre', 'beast', ['#6a8a3a', '#e0c070'], 130, 70, 40, 20, 90, 80),
  drake:    M('小龍', 'Drake', 'dragon', ['#3a9a5a', '#f0d070'], 160, 78, 50, 24, 120, 100, [['attack', 2], ['breath', 1]]),
  ghostknight:M('幽靈騎士', 'Phantom Knight', 'knight', ['#4a4a7a', '#8affd0'], 140, 75, 60, 22, 110, 90),
  archimp:  M('大惡魔', 'Arch Imp', 'imp', ['#4a2a8a', '#ff5ad0'], 120, 65, 45, 30, 100, 110, [['attack', 2], ['bang', 1], ['heal', 1]]),
  irongolem:M('鐵巨人', 'Iron Golem', 'golem', ['#5a6a7a', '#40d0ff'], 200, 85, 90, 10, 150, 120),
  darkmage: M('暗黑法師', 'Dark Sorcerer', 'mage', ['#1a1a3a', '#80c0ff'], 150, 70, 50, 26, 130, 130, [['attack', 1], ['icestorm', 1], ['heal', 1]], { drop: ['elfwater', 12] }),
  metal:    M('金屬史萊姆', 'Metal Slime', 'slime', ['#b8c0d0', '#ffffff'], 8, 30, 999, 140, 1350, 10, [['attack', 2], ['fire', 1], ['flee', 3]], { metal: true }),
  demonknight:M('魔族騎士', 'Demon Knight', 'knight', ['#3a1a2a', '#ff3a3a'], 260, 110, 85, 35, 300, 200, [['attack', 3], ['double', 1]]),
  blackdragon:M('黑龍', 'Black Dragon', 'dragon', ['#2a2a3a', '#ff5a3a'], 320, 120, 80, 30, 380, 220, [['attack', 2], ['breath', 1]]),
  guardian: M('天空守護者', 'Sky Guardian', 'dragon', ['#d8e0ff', '#ffd040'], 2200, 100, 70, 40, 3000, 2000, [['attack', 3], ['breath', 1], ['heal', 1], ['double', 1]], { boss: true, size: 1.6 }),
  solzar:   M('暗帝索爾札', 'Solzar, Dark Emperor', 'lord', ['#2a1a4a', '#ffd040'], 2600, 115, 78, 50, 0, 0, [['attack', 2], ['inferno', 1], ['icestorm', 1], ['bang', 1], ['heal', 1]], { boss: true, size: 1.6, next: 'solzar2' }),
  solzar2:  M('魔獸索爾札', 'Solzar Unbound', 'demon', ['#4a1a2a', '#ff6a2a'], 3600, 130, 86, 44, 0, 0, [['attack', 2], ['double', 2], ['breath', 1], ['kaboom', 1], ['roar', 1]], { boss: true, size: 1.9 }),
};
// what monsters leave behind: [item, 1 in N]; bosses always drop theirs (N = 1)
const DROPS = {
  slime: [['herb', 8]], drakee: [['herb', 10], ['gloves', 24]], rabbit: [['sandals', 14], ['herb', 10]], shroom: [['antidote', 6], ['bandana', 24]],
  lantern: [['holywater', 10], ['charm', 28]], skeleton: [['dagger', 16], ['leather', 20]], bubble: [['antidote', 6], ['boots', 30]], imp: [['wing', 12], ['ruby', 50]],
  shade: [['strring', 1]],
  wolf: [['herb', 8], ['boots', 20]], chimera: [['wing', 8], ['bandana', 20]], mage: [['hood', 20], ['elfwater', 40]], mandrake: [['herb', 6], ['silkgloves', 30]],
  knight: [['bronzeshield', 18], ['ironfist', 30]], viper: [['antidote', 6], ['scale', 30]], gladiator: [['flail', 16], ['ironboots', 30]],
  vulture: [['wing', 6], ['hairband', 40]], ironclaw: [['agiring', 1], ['ruby', 2]],
  scorpion: [['antidote', 6], ['scaleshield', 24]], bigshroom: [['herb', 5], ['wakering', 50]], statue: [['ruby', 20], ['ironboots', 24]],
  bat2: [['elfwater', 30], ['cloak', 30]], minegolem: [['goldneck', 1], ['sapphire', 2]],
  sandworm: [['antidote', 5], ['silverboots', 40]], boneknight: [['steelhelm', 24], ['bastard', 40]], darkpriest: [['holywater', 8], ['prayerring', 50]],
  bigscorp: [['scaleshield', 16], ['steelfist', 40]], tsand: [['antidote', 4], ['silverboots', 24]], tbone: [['steelhelm', 16], ['bastard', 24]], tpriest: [['elfwater', 12], ['prayerring', 30]], tscorp: [['scaleshield', 10], ['steelfist', 24]], barga: [['lifering', 1], ['luckbell', 2]],
  ogre: [['herb', 5], ['powergloves', 30]], drake: [['dragonshield', 30], ['dragonclaw', 40]], ghostknight: [['mirrorarmor', 40], ['flamesword', 50]],
  archimp: [['elfwater', 20], ['critring', 60]], irongolem: [['steelfist', 20], ['guardneck', 40]], darkmage: [['wizardwand', 30], ['angelrobe', 50]],
  metal: [['sagering', 4], ['pegasus', 8], ['luckbell', 6]], demonknight: [['demonaxe', 30], ['kaiser', 30], ['greathelm', 30]],
  blackdragon: [['dragonmail', 20], ['starpendant', 40], ['leaf', 10]], guardian: [['goddess', 1], ['miracle', 1]],
};
for (const [k, list] of Object.entries(DROPS)) MONSTERS[k].drops = list;

// monster groups for each area: [[monster, min, max], ...]
export const ZONES = {
  n1:   [[['slime', 1, 3]], [['drakee', 1, 2]], [['slime', 1, 2], ['drakee', 1, 1]], [['rabbit', 1, 2]], [['shroom', 1, 1], ['slime', 1, 2]]],
  cave1:[[['lantern', 1, 2]], [['skeleton', 1, 2]], [['bubble', 2, 3]], [['imp', 1, 2], ['drakee', 1, 1]], [['skeleton', 1, 1], ['lantern', 1, 1]]],
  e2:   [[['wolf', 1, 2]], [['chimera', 1, 2]], [['mage', 1, 2], ['wolf', 1, 1]], [['mandrake', 1, 2]], [['rabbit', 2, 3]]],
  cave2:[[['knight', 1, 2]], [['viper', 1, 2]], [['mage', 2, 2], ['mandrake', 1, 1]], [['knight', 1, 1], ['chimera', 1, 2]]],
  w3:   [[['scorpion', 1, 2]], [['bigshroom', 1, 3]], [['bat2', 2, 3]], [['scorpion', 1, 1], ['bigshroom', 1, 2]]],
  mine: [[['statue', 1, 2]], [['bat2', 2, 3]], [['scorpion', 2, 2]], [['statue', 1, 1], ['bigshroom', 1, 2]]],
  s4:   [[['sandworm', 1, 2]], [['bigscorp', 1, 2]], [['darkpriest', 1, 2], ['sandworm', 1, 1]], [['boneknight', 1, 2]]],
  tower:[[['tbone', 1, 2]], [['tpriest', 2, 2]], [['tscorp', 1, 1], ['tbone', 1, 1]], [['tsand', 2, 3]]],
  c5a:  [[['slime', 2, 4]], [['wolf', 1, 3]], [['chimera', 2, 3]], [['scorpion', 1, 2], ['mage', 1, 1]]],
  c5b:  [[['ogre', 1, 2]], [['drake', 1, 1]], [['ghostknight', 1, 2]], [['archimp', 1, 2]], [['metal', 1, 2]], [['ogre', 1, 1], ['archimp', 1, 1]]],
  shrine:[[['irongolem', 1, 2]], [['darkmage', 1, 2]], [['ghostknight', 2, 2]], [['metal', 1, 3]], [['drake', 1, 2]]],
  dark: [[['demonknight', 1, 2]], [['blackdragon', 1, 1]], [['darkmage', 2, 2]], [['irongolem', 1, 1], ['demonknight', 1, 1]], [['metal', 2, 3]]],
};

// ================================================================ the big bestiary and armoury
// Everything below is made from fixed seeds and tables, so every id stays the same between versions (saves keep working).
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- more things to use, and treasures to sell
Object.assign(ITEMS, {
  strongherb: { name: ['上藥草', 'Strong Herb'], use: 'heal', amt: [70, 90], price: 40, field: true },
  specialherb:{ name: ['特藥草', 'Special Herb'], use: 'heal', amt: [150, 190], price: 150, field: true },
  panacea:    { name: ['萬靈藥', 'Panacea'], use: 'heal', amt: [400, 500], price: 800, field: true },
  magicwater: { name: ['魔法聖水', 'Magic Water'], use: 'mp', amt: [12, 18], price: 90, field: true },
  prayerwater:{ name: ['祈禱之水', 'Prayer Water'], use: 'mp', amt: [70, 90], price: 1200, field: true },
  moonherb:   { name: ['月光草', 'Moonwort'], use: 'cure', price: 30, field: true },
  phoenix:    { name: ['不死鳥之羽', 'Phoenix Plume'], use: 'revive', price: 900, field: true },
});
const TREASURES = [['pearl', '珍珠', 'Pearl', 300], ['emerald', '翡翠', 'Emerald', 1200], ['amber', '琥珀', 'Amber', 450], ['topaz', '黃玉', 'Topaz', 700], ['amethyst', '紫水晶', 'Amethyst', 800],
  ['moonstone', '月長石', 'Moonstone', 1500], ['stardust', '星砂', 'Stardust', 2000], ['goldnugget', '金塊', 'Gold Nugget', 1000], ['silverbar', '銀塊', 'Silver Bar', 500], ['oldcoin', '古錢幣', 'Old Coin', 150],
  ['dragonhorn', '龍之角', 'Dragon Horn', 3000], ['fairyfeather', '妖精之羽', 'Fairy Feather', 350], ['ghostcloth', '幽靈之布', 'Ghost Cloth', 250]];
for (const [k, zh, en, price] of TREASURES) ITEMS[k] = { name: [zh, en], price, gem: true };
// what each kind of monster leaves behind
export const MAT = { slime: ['slimejelly', '史萊姆果凍', 'Slime Jelly', 20], bat: ['batwing', '蝙蝠翅膀', 'Bat Wing', 30], rabbit: ['rabbitfur', '兔毛', 'Rabbit Fur', 40], shroom: ['spore', '蘑菇孢子', 'Spore Pouch', 30],
  ghost: ['ectoplasm', '靈氣結晶', 'Ectoplasm', 120], skeleton: ['bonechip', '骨片', 'Bone Chip', 50], imp: ['imphorn', '小惡魔之角', 'Imp Horn', 80], wolf: ['wolffang', '狼牙', 'Wolf Fang', 90],
  bird: ['plume', '怪鳥之羽', 'Roc Plume', 90], mage: ['magebead', '魔法珠', 'Magic Bead', 150], plant: ['seed', '魔花種子', 'Fiend Seed', 60], knight: ['crest', '騎士徽章', 'Knight\'s Crest', 300],
  snake: ['snakeskin', '蛇皮', 'Snakeskin', 120], beast: ['pelt', '魔獸毛皮', 'Beast Pelt', 250], scorpion: ['sting', '蠍子毒針', 'Scorpion Sting', 160], golem: ['core', '巨像之核', 'Golem Core', 600],
  dragon: ['scale2', '龍鱗片', 'Dragon Scale', 2500] };
for (const [k, zh, en, price] of Object.values(MAT)) ITEMS[k] = { name: [zh, en], price, gem: true };
const SELL = ['可以賣給商店。', 'Shops will buy it.'];
for (const [k, zh, en] of [
  ['strongherb', '效果更強的藥草，恢復一名同伴約 70～90 HP。', 'A stronger herb: restores about 70-90 HP to one ally.'],
  ['specialherb', '珍貴的藥草，恢復一名同伴約 150～190 HP。', 'A rare herb: restores about 150-190 HP to one ally.'],
  ['panacea', '萬能的靈藥，恢復一名同伴約 400～500 HP。', 'A cure-all: restores about 400-500 HP to one ally.'],
  ['magicwater', '帶著魔力的水，恢復一名同伴約 12～18 MP。', 'Water with magic in it: restores about 12-18 MP to one ally.'],
  ['prayerwater', '注滿祈禱的聖水，恢復一名同伴約 70～90 MP。', 'Water full of prayer: restores about 70-90 MP to one ally.'],
  ['moonherb', '月光下採的草，解除一名同伴的中毒。', 'Picked by moonlight: cures one ally of poison.'],
  ['phoenix', '不死鳥的羽毛，能讓倒下的同伴復活。', 'A phoenix feather: brings a fallen ally back.'],
]) ITEMS[k].desc = [zh, en];
for (const [k, zh, en] of [
  ['pearl', '從海裡採到的圓潤珍珠。', 'A smooth pearl from the sea.'], ['emerald', '翠綠色的寶石。', 'A brilliant green gem.'],
  ['amber', '封著古代小蟲的琥珀。', 'Amber with a tiny ancient insect inside.'], ['topaz', '金黃色的寶石。', 'A golden-yellow gem.'],
  ['amethyst', '紫色的水晶。', 'A purple crystal.'], ['moonstone', '在暗處發出淡淡藍光的寶石。', 'A gem that glows faint blue in the dark.'],
  ['stardust', '像星星碎片一樣閃爍的沙。', 'Sand that glitters like broken stars.'], ['goldnugget', '沉甸甸的金塊。', 'A heavy lump of gold.'],
  ['silverbar', '鑄成條狀的銀。', 'A bar of cast silver.'], ['oldcoin', '不知哪個時代的古老錢幣。', 'A coin from some forgotten age.'],
  ['dragonhorn', '龍的角，非常稀有。', 'A dragon\'s horn. Very rare.'], ['fairyfeather', '妖精掉下的羽毛，輕飄飄的。', 'A feather a fairy dropped, light as air.'],
  ['ghostcloth', '幽靈身上的布，摸起來冰冰涼涼。', 'Cloth from a ghost, cold to the touch.'],
  ['slimejelly', '史萊姆留下的果凍，黏呼呼的。', 'Wobbly jelly left by a slime.'], ['batwing', '蝙蝠的翅膀。', 'A bat\'s wing.'],
  ['rabbitfur', '柔軟的兔毛。', 'Soft rabbit fur.'], ['spore', '裝著蘑菇孢子的小袋子。', 'A little pouch of mushroom spores.'],
  ['ectoplasm', '幽靈留下的發光結晶。', 'A glowing crystal a ghost left behind.'], ['bonechip', '骷髏的骨頭碎片。', 'A chip of skeleton bone.'],
  ['imphorn', '小惡魔的角。', 'An imp\'s horn.'], ['wolffang', '銳利的狼牙。', 'A sharp wolf fang.'],
  ['plume', '怪鳥的大羽毛。', 'A great feather from a roc.'], ['magebead', '魔物術士身上的魔力珠子。', 'A bead of magic from a fiendish caster.'],
  ['seed', '魔花的種子。', 'A seed from a fiendish flower.'], ['crest', '魔物騎士的徽章。', 'A monster knight\'s crest.'],
  ['snakeskin', '蛇蛻下的皮。', 'A shed snakeskin.'], ['pelt', '魔獸厚厚的毛皮。', 'A beast\'s thick pelt.'],
  ['sting', '蠍子的毒針。小心別刺到。', 'A scorpion\'s sting. Mind the point.'], ['core', '魔像體內的核心。', 'The core from inside a golem.'],
  ['scale2', '堅硬的龍鱗。', 'A hard dragon scale.'],
]) ITEMS[k].desc = [zh + SELL[0], en + ' ' + SELL[1]];

// ---------------------------------------------------------------- generated gear: 8 tiers × many kinds × a few qualities
const POW = [0, 9, 14, 20, 27, 35, 46, 58, 72];                  // weapon attack at each tier; the rest follows from it
const PRICE = [0, 60, 180, 420, 900, 1600, 3000, 5000, 8500];
const MATS = [null, [['木', 'Wooden'], ['骨', 'Bone']], [['青銅', 'Bronze'], ['硬皮', 'Hardhide']], [['鐵', 'Iron'], ['狼牙', 'Fang']], [['銀', 'Silver'], ['精鋼', 'Fine Steel']],
  [['秘銀', 'Mithril'], ['月光', 'Moonlit']], [['魔晶', 'Crystal'], ['龍骨', 'Dragonbone']], [['星鐵', 'Stariron'], ['聖靈', 'Spirit']], [['神聖', 'Divine'], ['混沌', 'Chaos']]];
const r0 = Math.round;
// [id, slot, 中文, English, who can use it, stats at tier t]
const KINDS = [
  ['sword', 'w', '劍', 'Sword', SWORD, (t) => ({ atk: POW[t] })], ['claw', 'w', '爪', 'Claw', 'rhea orin', (t) => ({ atk: r0(POW[t] * 1.02) })],
  ['whip', 'w', '鞭', 'Whip', 'mira thea', (t) => ({ atk: r0(POW[t] * 0.85) })], ['staff', 'w', '杖', 'Staff', MAGE, (t) => ({ atk: r0(POW[t] * 0.6), bonus: { agi: t } })],
  ['axe', 'w', '斧', 'Axe', 'kaldor tolle orin', (t) => ({ atk: r0(POW[t] * 1.15) })], ['spear', 'w', '矛', 'Spear', FIGHT, (t) => ({ atk: r0(POW[t] * 0.95) })],
  ['knife', 'w', '短刀', 'Knife', ALL, (t) => ({ atk: r0(POW[t] * 0.7) })], ['hammer', 'w', '錘', 'Hammer', FIGHT, (t) => ({ atk: r0(POW[t] * 1.08) })],
  ['mail', 'a', '鎧', 'Mail', FIGHT, (t) => ({ def: r0(POW[t] * 0.8) })], ['robe', 'a', '法衣', 'Robe', MAGE + ' rhea', (t) => ({ def: r0(POW[t] * 0.62) })],
  ['garb', 'a', '戰衣', 'Garb', ALL, (t) => ({ def: r0(POW[t] * 0.55) })], ['shield', 's', '盾', 'Shield', ALL, (t) => ({ def: r0(POW[t] * 0.3) })],
  ['buckler', 's', '圓盾', 'Buckler', FIGHT + ' rhea', (t) => ({ def: r0(POW[t] * 0.38) })], ['helm', 'h', '頭盔', 'Helm', FIGHT, (t) => ({ def: r0(POW[t] * 0.3) })],
  ['cap', 'h', '帽', 'Cap', ALL, (t) => ({ def: r0(POW[t] * 0.2) })], ['gaunt', 'g', '護手', 'Gauntlets', ALL, (t) => ({ def: r0(POW[t] * 0.12), atk: Math.max(1, r0(POW[t] * 0.1)) })],
  ['boots', 'b', '靴', 'Boots', ALL, (t) => ({ def: r0(POW[t] * 0.1), bonus: { agi: Math.max(1, r0(POW[t] * 0.15)) } })],
  ['ring', 'r', '指環', 'Band', ALL, (t) => ({ def: r0(t * 1.4) })], ['amulet', 'n', '護符', 'Amulet', ALL, (t) => ({ def: r0(POW[t] * 0.14) })],
];
// [id, 中文, English, what it changes]
const QUALS = [['', '', '', null], ['mighty', '剛力', 'Mighty', (s, t) => { s.bonus = { ...s.bonus, str: Math.max(1, r0(t * 0.9)) }; }],
  ['gale', '疾風', 'Gale', (s, t) => { s.bonus = { ...s.bonus, agi: Math.max(2, r0(t * 1.6)) }; }], ['ward', '守護', 'Warding', (s, t) => { s.def = (s.def || 0) + Math.max(1, r0(t * 1.2)); }],
  ['flame', '火焰', 'Flame', (s) => { if (s.atk && !s.def) s.atk = r0(s.atk * 1.12) + 1; else s.def = r0((s.def || 0) * 1.1) + 1; }], ['frost', '冰霜', 'Frost', (s) => { s.def = r0((s.def || 0) * 1.15) + 1; }],
  ['blessed', '祝福', 'Blessed', (s, t, k) => { if (t >= 4) s.fx = ['regen', 'mpregen', 'nosleep', 'nopoison', 'crit', 'luck'][(t + k) % 6]; else s.bonus = { ...s.bonus, str: 1, agi: 1 }; }]];
const GEN_GEAR = 366;
const MAT_DESC = { 木: ['木頭做的', 'made of wood'], 骨: ['魔物骨頭做的', 'carved from monster bone'], 青銅: ['青銅打造的', 'cast in bronze'], 硬皮: ['硬化皮革製成的', 'of hardened hide'],
  鐵: ['鐵製的', 'forged of iron'], 狼牙: ['鑲著狼牙的', 'set with wolf fangs'], 銀: ['銀製的', 'of silver'], 精鋼: ['精鋼鍛造的', 'of fine steel'],
  秘銀: ['秘銀打造的', 'of mithril'], 月光: ['在月光下鍛造的', 'forged by moonlight'], 魔晶: ['魔晶雕成的', 'cut from magic crystal'], 龍骨: ['龍骨製成的', 'of dragonbone'],
  星鐵: ['星鐵鍛造的', 'of star iron'], 聖靈: ['寄宿著聖靈之力的', 'touched by spirits'], 神聖: ['神聖之力加持的', 'blessed by the gods'], 混沌: ['蘊含混沌之力的', 'steeped in chaos'] };
const KIND_DESC = { sword: ['劍', 'A sword'], claw: ['拳爪', 'Fist claws'], whip: ['長鞭', 'A whip'], staff: ['手杖', 'A staff'], axe: ['戰斧', 'A war axe'],
  spear: ['長矛', 'A spear'], knife: ['短刀', 'A knife'], hammer: ['戰錘', 'A war hammer'], mail: ['鎧甲', 'Armour'], robe: ['法衣', 'A robe'],
  garb: ['戰衣', 'Battle garb'], shield: ['盾牌', 'A shield'], buckler: ['小圓盾', 'A buckler'], helm: ['頭盔', 'A helm'], cap: ['帽子', 'A cap'],
  gaunt: ['護手', 'Gauntlets'], boots: ['靴子', 'Boots'], ring: ['指環', 'A band'], amulet: ['護符', 'An amulet'] };
const QUAL_DESC = { mighty: ['能增加力量。', 'Adds strength.'], gale: ['讓動作更快。', 'Makes you quicker.'], ward: ['特別堅固。', 'Extra sturdy.'],
  flame: ['帶著火焰的熱度。', 'Warm with flame.'], frost: ['覆著一層寒霜。', 'Rimed with frost.'], blessed: ['受過祝福。', 'It has been blessed.'] };
const genDesc = (kid, mzh, qid) => { const m = MAT_DESC[mzh], k = KIND_DESC[kid], q = QUAL_DESC[qid] || ['', ''];
  return [`${m[0]}${k[0]}。${q[0]}`, `${k[1]}, ${m[1]}.${q[1] ? ' ' + q[1] : ''}`]; };
{
  const names = new Set(Object.values(ITEMS).flatMap((it) => it.name)), lists = [];
  for (let t = 1; t <= 8; t++) {
    const rnd = seeded(1000 + t), plain = [], rest = [];
    KINDS.forEach((k, ki) => QUALS.forEach((q, qi) => (qi ? rest : plain).push([k, ki, q, qi])));
    lists[t] = [...plain, ...shuffle(rest, rnd)];
  }
  let made = 0;
  for (let i = 0; made < GEN_GEAR && i < 200; i++) for (let t = 1; t <= 8 && made < GEN_GEAR; t++) {
    const e = lists[t][i]; if (!e) continue;
    const [[kid, slot, kzh, ken, who, stat], ki, [qid, qzh, qen, qf], qi] = e, [mzh, men] = MATS[t][(ki + qi) % 2];
    const name = [qzh + mzh + kzh, `${qen ? qen + ' ' : ''}${men} ${ken}`];
    if (names.has(name[0]) || names.has(name[1])) continue;
    names.add(name[0]); names.add(name[1]);
    const s = stat(t); if (qf) qf(s, t, ki);
    ITEMS[`g${t}_${kid}${qid ? '_' + qid : ''}`] = { name, slot, ...s, price: r0(PRICE[t] * (slot === 'w' || slot === 'a' ? 1 : 0.6) * (qi ? 1.3 : 1) * (s.fx ? 1.4 : 1)), who, tier: t, plain: !qi, gen: true, desc: genDesc(kid, mzh, qid) };
    made++;
  }
}
// a shop's share of the generated gear at one tier
export const genShop = (t, n = 6) => Object.keys(ITEMS).filter((k) => ITEMS[k].gen && ITEMS[k].tier === t && ITEMS[k].plain).slice(0, n);

// ---------------------------------------------------------------- generated monsters: kin of each area's monsters
// a variant keeps its area's balance: the strength of the monster it comes from, spread its own way, with a new look and name
const FAM = { slime: ['史萊姆', 'Slime'], bat: ['蝙蝠', 'Bat'], rabbit: ['角兔', 'Hornrabbit'], shroom: ['蘑菇怪', 'Shroom'], ghost: ['幽靈', 'Ghost'], skeleton: ['骷髏', 'Skeleton'],
  imp: ['小鬼', 'Imp'], wolf: ['狼', 'Wolf'], bird: ['怪鳥', 'Roc'], mage: ['術士', 'Sorcerer'], plant: ['魔花', 'Fiendflower'], knight: ['騎士', 'Knight'], snake: ['蛇', 'Serpent'],
  beast: ['魔獸', 'Beast'], scorpion: ['蠍', 'Scorpion'], golem: ['巨像', 'Golem'], dragon: ['龍', 'Wyrm'] };
// how each kind spreads its strength: [hp, attack, defence, agility]
const BUILD = { slime: [0.9, 0.95, 1, 1.05], bat: [0.8, 1, 0.85, 1.4], rabbit: [0.9, 1.05, 0.9, 1.2], shroom: [1.1, 0.95, 1, 0.8], ghost: [0.9, 1, 0.9, 1.15], skeleton: [1, 1.05, 1, 0.95],
  imp: [0.9, 1, 0.95, 1.2], wolf: [0.95, 1.08, 0.9, 1.25], bird: [0.9, 1, 0.9, 1.3], mage: [0.85, 0.95, 0.9, 1.1], plant: [1.15, 0.95, 1.05, 0.7], knight: [1.1, 1.02, 1.15, 0.85],
  snake: [1, 1.05, 0.95, 1.1], beast: [1.15, 1.08, 1, 0.95], scorpion: [1, 1, 1.15, 1], golem: [1.25, 1.05, 1.25, 0.6], dragon: [1.15, 1.08, 1.08, 1], lord: [1.2, 1.1, 1.1, 1.1], demon: [1.2, 1.1, 1.1, 1.1] };
const BIG = ['knight', 'beast', 'golem', 'dragon'];
// [中文, English, colours, [hp, attack, defence, agility], the extra thing it does, the first area it may do it in, extras]
const PRE = [
  ['火焰', 'Flame', ['#e8502a', '#ffd060'], [1, 1.05, 1, 1], 'fire', 1], ['冰霜', 'Frost', ['#6ac8ff', '#e8f8ff'], [1, 1, 1.05, 1], 'ice', 3],
  ['雷光', 'Thunder', ['#f0d040', '#fff8b0'], [0.95, 1.05, 1, 1.2], 'double', 2], ['劇毒', 'Venom', ['#5ac040', '#d0ff70'], [1, 1, 1, 1], 'poison', 0],
  ['暗影', 'Shadow', ['#3a2a5a', '#b080ff'], [1, 1, 1, 1.1], 'darkfire', 4], ['黃金', 'Golden', ['#e0b030', '#fff0a0'], [1, 1, 1, 1], null, 0, { gold: 2 }],
  ['水晶', 'Crystal', ['#a0e0f0', '#ffffff'], [0.9, 1, 1.25, 1], null, 0], ['鋼鐵', 'Steel', ['#8a96a8', '#e0e8f0'], [1, 1, 1.3, 0.85], null, 0],
  ['巨大', 'Giant', ['#8a6a4a', '#e0c090'], [1.35, 1.05, 1, 0.75], null, 0, { size: 1.25 }], ['王者', 'King', ['#c03050', '#ffd040'], [1.15, 1.05, 1.05, 1], 'heal', 2, { xp: 1.3, size: 1.15 }],
  ['熔岩', 'Lava', ['#b02a1a', '#ffa030'], [1.1, 1.05, 1.05, 0.9], 'fireball', 3], ['森林', 'Forest', ['#3a8a3a', '#c0e070'], [1.05, 1, 1, 1], 'sleep', 2],
  ['沼澤', 'Swamp', ['#5a6a3a', '#a0b060'], [1.1, 1, 1, 0.9], 'poison', 0], ['夜行', 'Night', ['#2a2a4a', '#ffe060'], [0.9, 1, 0.95, 1.35], null, 0],
  ['血紅', 'Crimson', ['#a01a2a', '#ff8080'], [0.95, 1.15, 0.9, 1.05], null, 0], ['白銀', 'Silver', ['#c8d0e0', '#ffffff'], [1, 1, 1.15, 1.05], null, 0],
  ['古代', 'Ancient', ['#8a7a5a', '#d8c890'], [1.1, 1, 1.1, 0.9], 'heal', 3], ['狂暴', 'Berserk', ['#d04020', '#202020'], [1, 1.1, 0.85, 1.1], 'double', 1],
  ['幻影', 'Phantom', ['#9a8ac8', '#f0e8ff'], [0.85, 1, 0.9, 1.3], 'sleep', 3], ['聖光', 'Holy', ['#f0f0d0', '#ffd870'], [1, 0.95, 1.05, 1], 'heal', 1],
  ['星辰', 'Star', ['#3a4aa0', '#fff0a0'], [1, 1, 1, 1.1], 'bang', 7], ['寶石', 'Jewel', ['#c040c0', '#80ffff'], [0.9, 1, 1.1, 1.1], null, 0, { gem: true }],
  ['風暴', 'Storm', ['#5a7a9a', '#e0f0ff'], [0.95, 1.05, 0.95, 1.25], 'icestorm', 9], ['岩石', 'Rock', ['#7a6a5a', '#b0a090'], [1.1, 1, 1.25, 0.7], null, 0],
  ['海潮', 'Tide', ['#2a6ab0', '#80e0ff'], [1.05, 1, 1, 1], 'ice', 3], ['腐朽', 'Rotting', ['#6a5a3a', '#a0d060'], [1.15, 1, 0.9, 0.85], 'poison', 0],
  ['妖精', 'Fairy', ['#ff90d0', '#fff0ff'], [0.85, 0.95, 0.9, 1.3], 'sleep', 2], ['夢魘', 'Nightmare', ['#4a1a4a', '#ff40a0'], [1, 1.05, 1, 1.05], 'sleep', 4],
  ['煉獄', 'Hellfire', ['#5a0a0a', '#ff6a00'], [1.05, 1.08, 1, 1], 'inferno', 9], ['沙暴', 'Dust', ['#c8a060', '#fff0c0'], [1, 1, 1.05, 1.1], null, 0],
];
// areas in the order they are reached, the gear tier their monsters drop, and the level a monster from there joins at
const ZORDER = ['n1', 'cave1', 'e2', 'cave2', 'w3', 'mine', 's4', 'tower', 'c5a', 'c5b', 'shrine', 'dark'];
const ZTIER = [1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8], ZLV = [1, 3, 3, 6, 4, 6, 5, 9, 8, 20, 30, 40];
const CONS = (zi) => (zi <= 2 ? ['herb', 'antidote'] : zi <= 5 ? ['herb', 'strongherb', 'moonherb', 'magicwater'] : zi <= 8 ? ['strongherb', 'magicwater', 'holywater', 'phoenix'] : ['specialherb', 'panacea', 'prayerwater', 'phoenix', 'elfwater']);
const VARIANTS = {};                     // area → monster → its kin
export const GEN_MONSTERS = 456;
{
  const rnd = seeded(77), gems = TREASURES.map(([k]) => k), combos = [];
  for (const fam of Object.keys(FAM)) PRE.forEach((p, pi) => combos.push([fam, pi]));
  shuffle(combos, rnd);
  const used = new Set(Object.values(MONSTERS).map((m) => m.name[1])), perZone = GEN_MONSTERS / ZORDER.length;
  let n = 0;
  ZORDER.forEach((zone, zi) => {
    const bases = [...new Set(ZONES[zone].flat().map(([id]) => id))].filter((id) => !MONSTERS[id].boss && !MONSTERS[id].metal);
    const gear = Object.keys(ITEMS).filter((k) => ITEMS[k].tier === ZTIER[zi]), cons = CONS(zi);
    VARIANTS[zone] = {};
    for (let i = 0; i < perZone; i++) {
      const bid = bases[i % bases.length], base = MONSTERS[bid], ci = combos.findIndex(([fam]) => zi >= 3 || !BIG.includes(fam));
      const [fam, pi] = combos.splice(ci, 1)[0], [pzh, pen, col, mod, act, from, ex = {}] = PRE[pi], b = BUILD[fam];
      const name = [pzh + FAM[fam][0], `${pen} ${FAM[fam][1]}`]; if (used.has(name[1])) { i--; continue; } used.add(name[1]);
      // the same strength as the monster it comes from (hp × attack × √defence), a little either way
      let h = b[0] * mod[0], a = b[1] * mod[1], d = b[2] * mod[2]; const norm = Math.pow(h * a * Math.sqrt(d), 1 / 2.5), p = 0.9 + rnd() * 0.2;
      h = h / norm * p; a = a / norm * p; d = d / norm * p;
      const acts = base.acts.map(([x, w]) => [x, w]); let spell = false;
      if (act && zi >= from && !acts.some(([x]) => x === act)) { acts.push([act, Math.max(1, Math.round(acts.reduce((s, [, w]) => s + w, 0) / 3))]); spell = !['poison', 'double', 'heal'].includes(act); }
      const id = `v${String(++n).padStart(3, '0')}`, xpm = p * (ex.xp || 1) * (spell ? 1.08 : 1);
      MONSTERS[id] = M(name[0], name[1], fam, [col[0], i % 3 ? col[1] : base.col[1]], Math.max(4, r0(base.hp * h)), Math.max(4, r0(base.atk * a * (spell ? 0.92 : 1))), Math.max(1, r0(base.def * d)),
        Math.max(1, r0(base.agi * b[3] * mod[3])), Math.max(1, r0(base.xp * xpm)), Math.max(1, r0(base.gold * p * (ex.gold || 1))), acts, { base: bid, zone, lv: ZLV[zi], ...(ex.size ? { size: ex.size } : {}) });
      MONSTERS[id].drops = [[cons[i % cons.length], 8 + (i % 5)], [MAT[fam][0], 6], [gear[Math.floor(rnd() * gear.length)], 22 + (i % 4) * 6], ...(ex.gem ? [[gems[i % gems.length], 4]] : [])];
      (VARIANTS[zone][bid] = VARIANTS[zone][bid] || []).push(id);
    }
  });
  // the hand-made monsters join at the level of the first area they live in
  ZORDER.forEach((zone, zi) => { for (const grp of ZONES[zone]) for (const [id] of grp) if (MONSTERS[id].lv === undefined) MONSTERS[id].lv = ZLV[zi]; });
}
// ---------------------------------------------------------------- after the ending: the Abyss under the Dark Castle
// three depths (floors 1-3, 4-7, 8-10): the dark castle's monsters grown stronger, with the best gear to find
const ABYSS = [['abyss1', ['深淵', 'Abyssal'], '#4a2a7a', 1.9, 1.8, 44, null], ['abyss2', ['虛無', 'Void'], '#1a4a5a', 2.6, 2.6, 47, 'icestorm'], ['abyss3', ['終焉', 'Doom'], '#5a0a1a', 3.3, 3.6, 50, 'double']];
const ABYSS_BASES = ['demonknight', 'blackdragon', 'darkmage', 'irongolem', 'ghostknight', 'archimp', 'drake', 'ogre'];
{
  const rnd = seeded(4242), top = Object.keys(ITEMS).filter((k) => ITEMS[k].tier === 8), gems = TREASURES.map(([k]) => k);
  for (const [zone, [pzh, pen], col, s, r, lv, extra] of ABYSS) {
    const ids = ABYSS_BASES.map((bid, i) => {
      const b = MONSTERS[bid], id = `${zone}_${bid}`, acts = b.acts.map(([x, w]) => [x, w]);
      if (extra && !acts.some(([x]) => x === extra)) acts.push([extra, 1]);
      MONSTERS[id] = M(pzh + b.name[0], `${pen} ${b.name[1]}`, b.art, [col, b.col[1]], r0(b.hp * s), r0(b.atk * (1 + (s - 1) * 0.55)), r0(b.def * (1 + (s - 1) * 0.5)), r0(b.agi * 1.1),
        r0(b.xp * r), r0(b.gold * r), acts, { zone, lv, ...(b.size ? { size: b.size } : {}) });
      MONSTERS[id].drops = [[top[Math.floor(rnd() * top.length)], 18 + (i % 3) * 6], ['leaf', 30], [gems[i % gems.length], 10], [MAT[b.art][0], 6]];
      return id;
    });
    ZONES[zone] = [...ids.map((id) => [[id, 1, 2]]), [[ids[0], 1, 1], [ids[2], 1, 1]], [[ids[1], 1, 1], [ids[5], 1, 2]], [['metal', 2, 4]]];
  }
}
MONSTERS.abyssking = M('深淵之王', 'Abyss King', 'demon', ['#120a24', '#b060ff'], 8000, 165, 100, 58, 30000, 10000,
  [['attack', 3], ['double', 2], ['kaboom', 1], ['icestorm', 1], ['roar', 1], ['heal', 1]], { boss: true, size: 1.8 });
MONSTERS.abyssking.drops = [['doomblade', 1], ['abysscrown', 1], ['voidring', 1]];
// signature moves: every monster that would otherwise only swing at you gets the move its kind is known for
// heavy: a big blow that sometimes misses · stun: a blow that may leave you unable to act · drain: heals itself by half
// rage: its attack rises for the rest of the fight · sweep: hits everyone, lighter · daze: may stop several of you a turn
// bolt: raw magic that ignores armour
const SIG = {
  slime: ['stun', '黏液纏身', 'Goo Grab'], bat: ['drain', '吸血', 'Bloodsuck'], rabbit: ['heavy', '角突', 'Horn Thrust'],
  skeleton: ['heavy', '斷骨斬', 'Bone Cleave'], wolf: ['rage', '嚎叫', 'Howl'], knight: ['stun', '盾擊', 'Shield Bash'],
  golem: ['heavy', '重壓', 'Crush'], scorpion: ['stun', '麻痺尾針', 'Numbing Sting'], beast: ['sweep', '橫掃', 'Sweep'],
  shroom: ['daze', '孢子雲', 'Spore Cloud'], bird: ['sweep', '旋風', 'Gale'], imp: ['heavy', '小刀突刺', 'Knife Jab'],
  mage: ['bolt', '魔力彈', 'Arcane Bolt'], ghost: ['drain', '吸魂', 'Soul Drain'], snake: ['stun', '纏繞', 'Constrict'],
  plant: ['daze', '花粉', 'Pollen'], dragon: ['sweep', '尾擊', 'Tail Sweep'],
};
// what each kind of move does, for the status screen
export const SIGDESC = {
  heavy: ['強力一擊，偶爾落空', 'A big blow; may miss'], stun: ['攻擊並可能使對手定身', 'Hits; may stop a turn'],
  drain: ['攻擊並吸取 HP', 'Hits and drinks HP'], rage: ['提升自己的攻擊力', 'Raises its own attack'],
  sweep: ['攻擊全體敵人', 'Hits every foe'], daze: ['可能使全體頭昏', 'May daze everyone'], bolt: ['無視防禦的魔法', 'Magic past armour'],
};
for (const m of Object.values(MONSTERS)) {
  if (m.boss || !SIG[m.art] || !m.acts.every(([a]) => a === 'attack')) continue;
  const [act, zh, en] = SIG[m.art], w = m.acts.reduce((s, [, x]) => s + x, 0);
  // each kind has its own habit: from a 20% to a 40% chance a turn, drawn at random every turn
  const h = [...m.name[1]].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 997, 7), p = 0.2 + (h % 21) / 100;
  m.acts.push([act, w * p / (1 - p)]); m.sig = [zh, en]; m.sigAct = act;
}
// a random group for an area: half the time some of its monsters are their kin instead
export function encounter(zone, rnd = Math.random) {
  const opts = ZONES[zone], g = opts[Math.floor(rnd() * opts.length)], mix = rnd() < 0.5;
  return g.map(([id, a, b]) => { const vs = VARIANTS[zone] && VARIANTS[zone][id]; return [mix && vs && rnd() < 0.7 ? vs[Math.floor(rnd() * vs.length)] : id, a + Math.floor(rnd() * (b - a + 1))]; });
}

// ---------------------------------------------------------------- monsters in the party
// what a monster's attacks teach it as a companion: [level, spell]
const LEARN = { fire: [[1, 'fire'], [9, 'fireball']], fireball: [[1, 'fire'], [5, 'fireball'], [16, 'inferno']], inferno: [[1, 'fire'], [10, 'inferno']], ice: [[1, 'ice'], [12, 'icestorm']],
  icestorm: [[1, 'ice'], [8, 'icestorm']], bang: [[1, 'bang'], [18, 'kaboom']], kaboom: [[1, 'bang'], [12, 'kaboom']], darkfire: [[1, 'fire'], [6, 'bang']], heal: [[1, 'heal'], [10, 'healmore'], [20, 'multiheal']],
  sleep: [[2, 'sleep']], breath: [[1, 'fireball']], roar: [[4, 'sap']] };
export const canRecruit = (mid) => { const d = MONSTERS[mid]; return !!d && !d.boss && d.lv !== undefined && d.xp > 0; };
function monChar(mid) {
  const d = MONSTERS[mid], b = d.metal ? [0.5, 1, 2.2, 2.5] : BUILD[d.art] || [1, 1, 1, 1], spells = {};
  for (const [act] of d.acts) for (const [lv, sp] of LEARN[act] || []) if (!Object.values(spells).includes(sp)) { let l = lv; while (spells[l]) l++; spells[l] = sp; }
  const magic = Object.keys(spells).length > 0;
  return { name: d.name, job: ['魔物夥伴', 'Monster'], look: 'mon:' + mid, monster: mid, spells,
    hp: [24 * b[0], 6.8 * b[0]], mp: magic ? [8, 2.6] : [0, 0], str: [9 * b[1], 2.4 * b[1]], def: [7 * b[2], 1.7 * b[2]], agi: [7 * b[3], 1.5 * b[3]] };
}
