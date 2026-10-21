// Windows, text and menus in the classic style: black boxes with a white rounded border. Every call returns a promise,
// so story scripts and battles read top to bottom: `await say('…')`, `const i = await menu([...])`.
import { EN } from './i18n.js';

export const S = 3;                         // canvas pixels per logical pixel (logical screen 256 x 240)
export const VW = 256, VH = 240;
export const FONT = EN ? '"DotGothic16", "Courier New", monospace' : '"DotGothic16", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
let ctx = null;
export const setCtx = (c) => { ctx = c; };
export const stack = [];                    // open windows; the top one gets the keys
export const busy = () => stack.length > 0;

export function box(x, y, w, h) {
  const g = ctx; g.save(); g.scale(S, S);
  g.fillStyle = 'rgba(0,0,0,0.92)'; g.beginPath(); g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, h - 4, 3); g.stroke();
  g.restore();
}
export function text(str, x, y, opts = {}) {
  const g = ctx; g.save();
  g.font = `${opts.size || 8 * S}px ${FONT}`; g.textBaseline = 'top'; g.textAlign = opts.align || 'left';
  g.fillStyle = opts.color || '#fff'; g.fillText(str, x * S, y * S);
  g.restore();
}
export function measure(str, size = 8 * S) { ctx.save(); ctx.font = `${size}px ${FONT}`; const w = ctx.measureText(str).width / S; ctx.restore(); return w; }
// wrap text to a width (logical px); CJK breaks anywhere, English at spaces
export function wrap(str, width) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    const tokens = EN ? para.split(/(\s+)/) : [...para];
    for (const tk of tokens) {
      if (measure(line + tk) > width && line.trim()) { out.push(line.trimEnd()); line = tk.trimStart(); } else line += tk;
    }
    out.push(line);
  }
  return out;
}
let blink = 0;
export const tickUI = (dt) => { blink += dt; for (const w of stack) w.tick && w.tick(dt); };
export const drawUI = () => { for (const w of stack) w.draw(); };
export let backAt = 0;                       // when B / Esc was last pressed (battles use it to stop auto-attack)
export function key(k) { if (k === 'back') backAt = performance.now(); const w = stack[stack.length - 1]; if (w && w.key) w.key(k); }
const push = (w) => { stack.push(w); return w; };
const pop = (w) => { const i = stack.indexOf(w); if (i >= 0) stack.splice(i, 1); };
const cursor = (x, y) => { if (Math.floor(blink * 2.5) % 2 === 0) text('▶', x, y); };

// ---------------------------------------------------------------- messages
// say(text): a message window at the bottom; the text types out, then a ▼ waits for a key.
// opts.auto = seconds: closes by itself (battle messages); opts.keep: leaves the window open for a following ask()
let lastMsg = null;
export function say(str, opts = {}) {
  return new Promise((resolve) => {
    const x = 8, y = opts.top ? 8 : 160, w = 240, h = 72;
    const lines = wrap(str, w - 22), shown = { n: 0 };
    let t = 0, waitT = 0;
    const total = lines.join('').length;
    const win = push({
      lines, tick(dt) { t += dt; shown.n = Math.min(total, Math.floor(t * (opts.fast ? 140 : 60))); if (shown.n >= total) { waitT += dt; if (opts.auto != null && waitT >= opts.auto) done(); } },
      draw() {
        box(x, y, w, h); let left = shown.n;
        const vis = lines.slice(Math.max(0, lines.length - 4));
        let skip = lines.length - vis.length; for (let i = 0; i < skip; i++) left -= lines[i].length;
        vis.forEach((ln, i) => { if (left <= 0) return; text(ln.slice(0, left), x + 10, y + 9 + i * 14); left -= ln.length; });
        if (shown.n >= total && opts.auto == null && Math.floor(blink * 2.5) % 2 === 0) text('▼', x + w / 2 - 4, y + h - 13);
      },
      key(k) { if (k !== 'ok' && k !== 'back') return; if (shown.n < total) { t = 999; return; } if (opts.auto == null || k) done(); },
    });
    function done() { pop(win); lastMsg = null; resolve(); }
    lastMsg = win;
  });
}
// a list of things to say, one after another
export async function says(list, opts) { for (const s of list) await say(s, opts); }

// ---------------------------------------------------------------- menus
// menu(items, opts): items = [{ label, disabled, right }] or strings. Resolves to the index, or -1 on cancel.
export function menu(items, opts = {}) {
  items = items.map((it) => (typeof it === 'string' ? { label: it } : it));
  return new Promise((resolve) => {
    const cols = opts.cols || 1, rows = Math.ceil(items.length / cols), per = opts.rows || Math.min(rows, 9);
    const colW = opts.colW || Math.max(...items.map((it) => measure(it.label) + (it.right ? measure(it.right) + 14 : 0))) + 22;
    const w = opts.w || Math.min(240, colW * cols + 12), h = per * 14 + 14 + (opts.title ? 14 : 0);
    const x = opts.x ?? 8, y = Math.max(4, Math.min(opts.y ?? 8, VH - 4 - h));   // never past the bottom of the screen
    let sel = Math.min(opts.start || 0, items.length - 1), top = 0;
    const win = push({
      draw() {
        box(x, y, w, h);
        if (opts.title) text(opts.title, x + w / 2, y + 7, { align: 'center', color: '#ffe080' });
        const oy = y + 8 + (opts.title ? 14 : 0), cw = (w - 12) / cols;
        for (let r = 0; r < per; r++) for (let c = 0; c < cols; c++) {
          const i = (top + r) * cols + c, it = items[i]; if (!it) continue;
          const ix = x + 6 + c * cw, iy = oy + r * 14;
          text(it.label, ix + 10, iy, { color: it.disabled ? '#777' : '#fff' });
          if (it.right) text(it.right, ix + cw - 4, iy, { align: 'right', color: it.disabled ? '#777' : '#ddd' });
          if (i === sel && !opts.inactive) cursor(ix, iy);
        }
        if (rows > per) { if (top > 0) text('▲', x + w - 12, y + 4, { size: 6 * S }); if (top + per < rows) text('▼', x + w - 12, y + h - 10, { size: 6 * S }); }
        if (opts.info) opts.info(items[sel], sel);
      },
      key(k) {
        const n = items.length;
        if (k === 'up') sel = (sel - cols + n) % n; else if (k === 'down') sel = (sel + cols) % n;
        else if (k === 'left' && cols > 1) sel = (sel - 1 + n) % n; else if (k === 'right' && cols > 1) sel = (sel + 1) % n;
        else if (k === 'ok') { if (items[sel].disabled) return; pop(win); resolve(sel); return; }
        else if (k === 'back' && opts.cancel !== false) { pop(win); resolve(-1); return; }
        const row = Math.floor(sel / cols); if (row < top) top = row; if (row >= top + per) top = row - per + 1;
        if (opts.onMove) opts.onMove(items[sel], sel);
      },
    });
    win.close = () => { pop(win); };
  });
}
// a question with choices beside the message (Yes / No)
export function ask(str, options) {
  return new Promise((resolve) => {
    const x = 8, y = 160, w = 240, h = 72, lines = wrap(str, w - 22), total = lines.join('').length;
    let t = 0, opened = false;
    const win = push({
      tick(dt) {
        t += dt;
        if (!opened && t * 60 >= total) { opened = true; menu(options, { x: 196 - Math.max(...options.map((o) => measure(o))), y: 158 - options.length * 14 - 14 }).then((i) => { pop(win); resolve(i < 0 ? options.length - 1 : i); }); }
      },
      draw() { box(x, y, w, h); let left = Math.min(total, Math.floor(t * 60)); lines.slice(-4).forEach((ln, i) => { if (left <= 0) return; text(ln.slice(0, left), x + 10, y + 9 + i * 14); left -= ln.length; }); },
      key(k) { if (k === 'ok') t = 999; },
    });
  });
}
// a panel that just shows something until closed by the caller
export function panel(drawFn) { const w = push({ draw: drawFn }); return () => pop(w); }
// wait for any key (used under panels)
export function waitKey() { return new Promise((resolve) => { const w = push({ draw() {}, key(k) { if (k === 'ok' || k === 'back') { pop(w); resolve(k); } } }); }); }
export const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
