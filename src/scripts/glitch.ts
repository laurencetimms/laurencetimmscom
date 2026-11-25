// Glitch easter egg. The real text is always in the HTML and never touched:
// each glitchable element ([data-glitch]) holds one text node; the glitch is
// drawn on an aria-hidden overlay positioned over a single character. Screen
// readers and crawlers therefore never see a glitched character.
const GLYPHS = ['%', '$', '*', '!', '#', '@', '&', '?', '+', '='];
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.querySelector<HTMLElement>('.m7');
const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-glitch]'));

function schedule() {
  setTimeout(run, 1500 + Math.random() * 3500);
}

function run() {
  if (reduced() || !root || targets.length === 0) return schedule();
  const el = targets[Math.floor(Math.random() * targets.length)];
  const node = el.firstChild;
  const text = node?.textContent ?? '';
  if (!node || node.nodeType !== Node.TEXT_NODE || !/[^ .]/.test(text)) return schedule();

  let idx = 0;
  do { idx = Math.floor(Math.random() * text.length); } while (text[idx] === ' ' || text[idx] === '.');

  const range = document.createRange();
  range.setStart(node, idx);
  range.setEnd(node, idx + 1);
  const r = range.getBoundingClientRect();
  const base = root.getBoundingClientRect();
  const cs = getComputedStyle(el);

  const ov = document.createElement('span');
  ov.className = `gl-ov gl-ov--${el.dataset.glitch === 'blue' ? 'blue' : 'black'}`;
  ov.setAttribute('aria-hidden', 'true');
  ov.style.cssText =
    `left:${r.left - base.left}px;top:${r.top - base.top}px;width:${r.width}px;height:${r.height}px;` +
    `font:${cs.font};color:${cs.color};line-height:${r.height}px`;
  root.appendChild(ov);

  const frames = 6 + Math.floor(Math.random() * 7);
  let n = 0;
  const tick = setInterval(() => {
    n++;
    if (n > frames || reduced()) {
      clearInterval(tick);
      ov.remove();
      schedule();
      return;
    }
    ov.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }, 55);
}

schedule();
