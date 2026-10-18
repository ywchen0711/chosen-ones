// Characters, spells, items, equipment, monsters and the monster groups of each area.
// Names are [中文, English].

// ---------------------------------------------------------------- the chosen ones
// base stats at level 1 and growth per level; spells learned at a level; what each can equip
export const CHARS = {
  hero:   { name: ['艾倫', 'Allen'], job: ['勇者', 'Hero'], look: 'hero', hp: [30, 7.5], mp: [6, 3], str: [10, 2.5], def: [8, 1.7], agi: [8, 1.6],
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
};
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
};
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
  wolf:     M('野狼', 'Wild Wolf', 'wolf', ['#7a7a8a', '#d0d0e0'], 30, 24, 12, 15, 10, 12),
  chimera:  M('奇美拉', 'Chimaera', 'bird', ['#d8783a', '#ffe08a'], 34, 26, 14, 17, 12, 14, [['attack', 3], ['fire', 1]], { drop: ['wing', 10] }),
  mage:     M('魔術師', 'Magician', 'mage', ['#4a3a9a', '#ffd070'], 28, 20, 12, 12, 13, 16, [['attack', 1], ['fire', 2], ['sleep', 1]]),
  mandrake: M('曼陀羅草', 'Mandrake', 'plant', ['#3aa04a', '#ff7ab0'], 40, 25, 16, 5, 14, 15, [['attack', 3], ['sleep', 1]]),
  knight:   M('鐵甲騎士', 'Iron Knight', 'knight', ['#8a96a8', '#d84a4a'], 62, 32, 26, 10, 22, 25),
  viper:    M('毒蛇', 'Viper', 'snake', ['#5ab04a', '#f0e04a'], 50, 34, 18, 18, 20, 20, [['attack', 3], ['poison', 1]]),
  gladiator:M('角鬥士', 'Gladiator', 'knight', ['#b08a3a', '#3a3a3a'], 120, 40, 28, 18, 60, 60, [['attack', 3], ['double', 1]], { boss: true }),
  vulture:  M('禿鷹術士', 'Vulture Mage', 'bird', ['#5a4a3a', '#d0b090'], 110, 34, 22, 22, 60, 60, [['attack', 2], ['fireball', 2], ['heal', 1]], { boss: true }),
  ironclaw: M('鐵爪將軍', 'General Ironclaw', 'beast', ['#5a5a6a', '#ff5a3a'], 300, 42, 28, 22, 450, 500, [['attack', 3], ['double', 2], ['roar', 1]], { boss: true, size: 1.4 }),
  // chapter 3: the western lakes
  scorpion: M('毒蠍', 'Scorpion', 'scorpion', ['#b0783a', '#4a2a1a'], 55, 38, 30, 12, 25, 30, [['attack', 3], ['poison', 1]]),
  bigshroom:M('大蘑菇', 'Funghoul', 'shroom', ['#8a4ab8', '#f0e0ff'], 60, 35, 20, 8, 22, 28, [['attack', 2], ['sleep', 1]]),
  statue:   M('活石像', 'Living Statue', 'golem', ['#9a9a8a', '#e0d8a0'], 70, 40, 40, 6, 30, 40),
  bat2:     M('吸血大蝙蝠', 'Drackmage', 'bat', ['#3a3a7a', '#ff6a8a'], 45, 36, 18, 22, 22, 25, [['attack', 2], ['ice', 1]]),
  minegolem:M('礦坑巨像', 'Mine Golem', 'golem', ['#8a6a4a', '#ffb040'], 300, 50, 30, 8, 700, 800, [['attack', 3], ['quake', 1]], { boss: true, size: 1.5 }),
  // chapter 4: the southern desert
  sandworm: M('沙蟲', 'Sand Viper', 'snake', ['#d8b06a', '#8a4a2a'], 90, 48, 30, 14, 40, 45, [['attack', 3], ['poison', 1]]),
  boneknight:M('骸骨騎士', 'Bone Knight', 'skeleton', ['#d8d0b8', '#6a2a8a'], 85, 52, 36, 12, 45, 50, [['attack', 3], ['double', 1]]),
  darkpriest:M('黑暗神官', 'Dark Priest', 'mage', ['#2a2a3a', '#ff4a4a'], 70, 40, 30, 16, 42, 48, [['attack', 1], ['fireball', 1], ['heal', 1]], { drop: ['elfwater', 20] }),
  bigscorp: M('鐵甲蠍', 'Iron Scorpion', 'scorpion', ['#4a5a7a', '#c0c8e0'], 80, 50, 45, 15, 40, 46),
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
// monster groups for each area: [[monster, min, max], ...]
export const ZONES = {
  n1:   [[['slime', 1, 3]], [['drakee', 1, 2]], [['slime', 1, 2], ['drakee', 1, 1]], [['rabbit', 1, 2]], [['shroom', 1, 1], ['slime', 1, 2]]],
  cave1:[[['lantern', 1, 2]], [['skeleton', 1, 2]], [['bubble', 2, 3]], [['imp', 1, 2], ['drakee', 1, 1]], [['skeleton', 1, 1], ['lantern', 1, 1]]],
  e2:   [[['wolf', 1, 2]], [['chimera', 1, 2]], [['mage', 1, 2], ['wolf', 1, 1]], [['mandrake', 1, 2]], [['rabbit', 2, 3]]],
  cave2:[[['knight', 1, 2]], [['viper', 1, 2]], [['mage', 2, 2], ['mandrake', 1, 1]], [['knight', 1, 1], ['chimera', 1, 2]]],
  w3:   [[['scorpion', 1, 2]], [['bigshroom', 1, 3]], [['bat2', 2, 3]], [['scorpion', 1, 1], ['bigshroom', 1, 2]]],
  mine: [[['statue', 1, 2]], [['bat2', 2, 3]], [['scorpion', 2, 2]], [['statue', 1, 1], ['bigshroom', 1, 2]]],
  s4:   [[['sandworm', 1, 2]], [['bigscorp', 1, 2]], [['darkpriest', 1, 2], ['sandworm', 1, 1]], [['boneknight', 1, 2]]],
  tower:[[['boneknight', 1, 2]], [['darkpriest', 2, 2]], [['bigscorp', 1, 1], ['boneknight', 1, 1]], [['sandworm', 2, 3]]],
  c5a:  [[['slime', 2, 4]], [['wolf', 1, 3]], [['chimera', 2, 3]], [['scorpion', 1, 2], ['mage', 1, 1]]],
  c5b:  [[['ogre', 1, 2]], [['drake', 1, 1]], [['ghostknight', 1, 2]], [['archimp', 1, 2]], [['metal', 1, 2]], [['ogre', 1, 1], ['archimp', 1, 1]]],
  shrine:[[['irongolem', 1, 2]], [['darkmage', 1, 2]], [['ghostknight', 2, 2]], [['metal', 1, 3]], [['drake', 1, 2]]],
  dark: [[['demonknight', 1, 2]], [['blackdragon', 1, 1]], [['darkmage', 2, 2]], [['irongolem', 1, 1], ['demonknight', 1, 1]], [['metal', 2, 3]]],
};
