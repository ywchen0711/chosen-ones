// Little chiptune themes and sound effects with WebAudio (square and triangle waves), muted with M or the ♪ button.
let ac = null, master = null, muted = false, cur = null, timer = null;
try { muted = localStorage.getItem('co.mute') === '1'; } catch (e) { /* ignore */ }
function ctx() {
  if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.18; master.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (n) => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0; const s = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; return 440 * Math.pow(2, (s - 69) / 12); };
function tone(f, t, d, type = 'square', vol = 0.5) {
  if (!f) return;
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d * 0.95);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t + d);
}
// a theme: melody and bass as "note:beats" lists
const THEMES = {
  title:   { bpm: 92, mel: 'G4:1 C5:1 E5:1 G5:2 E5:1 F5:1 D5:2 G4:1 B4:1 D5:1 F5:2 E5:1 D5:1 C5:3 R:1', bass: 'C3:4 G2:4 G2:4 C3:4' },
  field:   { bpm: 120, mel: 'E5:1 G5:1 C6:2 B5:1 A5:1 G5:2 F5:1 A5:1 G5:1 E5:1 D5:4 E5:1 G5:1 C6:2 D6:1 C6:1 B5:2 A5:1 B5:1 C6:1 A5:1 G5:4', bass: 'C3:2 G3:2 C3:2 G3:2 F3:2 C3:2 G2:2 G3:2 C3:2 G3:2 E3:2 A3:2 F3:2 G3:2 C3:4' },
  town:    { bpm: 104, mel: 'C5:1 E5:1 G5:1 E5:1 F5:2 A5:2 G5:1 E5:1 C5:1 E5:1 D5:4 C5:1 E5:1 G5:1 C6:1 B5:2 G5:2 F5:1 E5:1 D5:1 B4:1 C5:4', bass: 'C3:4 F3:4 C3:4 G2:4 C3:4 G2:4 F3:2 G3:2 C3:4' },
  castle:  { bpm: 84, mel: 'C5:2 G4:1 C5:1 E5:2 D5:1 C5:1 D5:2 G4:2 B4:2 D5:2 C5:3 R:1', bass: 'C3:4 C3:4 G2:4 C3:4' },
  dungeon: { bpm: 96, mel: 'A4:1 C5:1 E5:1 A5:1 G#5:2 E5:2 F5:1 D5:1 B4:1 G#4:1 A4:4', bass: 'A2:4 E2:4 D3:2 E3:2 A2:4' },
  battle:  { bpm: 168, mel: 'A4:1 A4:1 C5:1 E5:1 D5:1 C5:1 B4:1 G#4:1 A4:1 E5:1 A5:2 G5:1 F5:1 E5:1 D5:1 C5:1 B4:1 C5:1 D5:1 E5:4', bass: 'A2:2 A3:2 A2:2 A3:2 F2:2 F3:2 E2:2 E3:2 A2:2 A3:2 D3:2 E3:2 A2:4' },
  boss:    { bpm: 176, mel: 'D5:1 D5:1 F5:1 D5:1 G#5:2 A5:2 G5:1 F5:1 E5:1 F5:1 D5:4 D5:1 F5:1 A5:1 D6:1 C#6:2 A5:2 Bb5:1 A5:1 G5:1 E5:1 F5:4', bass: 'D2:2 D3:2 D2:2 D3:2 Bb2:2 Bb3:2 A2:2 A3:2 D2:2 D3:2 G2:2 A2:2 D2:4' },
  boss2:   { bpm: 190, mel: 'E5:1 F5:1 E5:1 D#5:1 E5:1 B5:1 G5:1 E5:1 C6:1 B5:1 A5:1 G5:1 F#5:1 G5:1 A5:2 E5:1 F5:1 G5:1 A5:1 B5:2 C6:2 B5:4', bass: 'E2:2 E3:2 E2:2 E3:2 C3:2 C3:2 B2:2 B2:2 E2:2 E3:2 A2:2 B2:2 E2:4' },
  sad:     { bpm: 70, mel: 'A4:2 C5:1 B4:1 A4:2 E4:2 F4:2 E4:1 D4:1 E4:4', bass: 'A2:4 D3:4 A2:4 E2:4' },
  ending:  { bpm: 88, mel: 'C5:1 E5:1 G5:2 A5:1 G5:1 E5:2 F5:1 E5:1 D5:1 C5:1 D5:4 C5:1 E5:1 G5:2 C6:2 B5:1 A5:1 G5:1 F5:1 E5:1 D5:1 C5:4', bass: 'C3:4 F3:4 G3:4 G2:4 C3:4 F3:4 G3:4 C3:4' },
};
const JINGLE = {
  win:     'C5:0.5 E5:0.5 G5:0.5 C6:1.5',
  levelup: 'G4:0.5 C5:0.5 E5:0.5 G5:0.5 E5:0.5 G5:1.5',
  inn:     'C5:0.75 E5:0.75 G5:0.75 C6:0.75 G5:0.75 C6:2',
  item:    'E5:0.5 A5:0.5 C#6:1',
  save:    'G4:0.5 B4:0.5 D5:0.5 G5:1.5',
};
const parse = (s) => s.trim().split(/\s+/).map((x) => { const [n, b] = x.split(':'); return [n, +b]; });
function schedule(th, t0) {
  const beat = 60 / th.bpm; let t = t0;
  for (const [n, b] of parse(th.mel)) { if (n !== 'R') tone(freq(n), t, b * beat * 0.95, 'square', 0.32); t += b * beat; }
  let tb = t0; for (const [n, b] of parse(th.bass)) { tone(freq(n), tb, b * beat * 0.9, 'triangle', 0.55); tb += b * beat; }
  return Math.max(t, tb) - t0;
}
export function music(name) {
  if (name === cur && name !== 'win') return;
  if (JINGLE[name]) { jingle(name); return; }
  cur = name; clearTimeout(timer);
  const a = ctx(); if (!a || !THEMES[name]) return;
  const loop = () => { const len = schedule(THEMES[name], a.currentTime + 0.05); timer = setTimeout(() => { if (cur === name) loop(); }, len * 1000 - 40); };
  loop();
}
export function stopMusic() { cur = null; clearTimeout(timer); }
function jingle(name) {
  const a = ctx(); if (!a) return;
  const back = cur; cur = null; clearTimeout(timer);
  let t = a.currentTime + 0.05; for (const [n, b] of parse(JINGLE[name])) { tone(freq(n), t, b * 0.2, 'square', 0.4); t += b * 0.2; }
  if (back && name !== 'win') timer = setTimeout(() => music(back), (t - a.currentTime) * 1000 + 200);
}
export function sfx(name) {
  const a = ctx(); if (!a) return; const t = a.currentTime;
  const S = { hit: [[220, 0.05, 'square'], [110, 0.08, 'square']], hurt: [[120, 0.08, 'sawtooth'], [80, 0.1, 'sawtooth']], kill: [[660, 0.05], [440, 0.05], [220, 0.12]],
    spell: [[880, 0.05, 'triangle'], [1320, 0.05, 'triangle'], [1760, 0.08, 'triangle']], heal: [[660, 0.06, 'triangle'], [880, 0.06, 'triangle'], [1100, 0.1, 'triangle']],
    step: [[90, 0.03, 'triangle']], ok: [[990, 0.04]], door: [[300, 0.05], [200, 0.08]], boom: [[80, 0.3, 'sawtooth']], chest: [[523, 0.06], [659, 0.06], [784, 0.1]], levelup: [] }[name];
  if (!S) return; let tt = t; for (const [f, d, ty] of S) { tone(f, tt, d, ty || 'square', 0.4); tt += d; }
}
export function toggleMute() { muted = !muted; try { localStorage.setItem('co.mute', muted ? '1' : '0'); } catch (e) { /* ignore */ } ctx(); if (master) master.gain.value = muted ? 0 : 0.18; return muted; }
export const isMuted = () => muted;
export const unlock = () => ctx();
