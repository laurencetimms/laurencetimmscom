// P888 MINES: 8x8, 10 mines. Vanilla DOM, no framework.
// Win only when every safe cell is open AND every mine is flagged AND no
// non-mine is flagged. First click is always safe (mines placed after it,
// excluding its neighbours). FLAG is a mode toggle, so no right-click needed.
const W = 8, H = 8, M = 10;

type Cell = { mine: boolean; adj: number; open: boolean; flag: boolean };
type Status = 'ready' | 'play' | 'won' | 'lost';

const panel = document.getElementById('p888') as HTMLElement;
const gridEl = document.getElementById('mines-grid') as HTMLElement;
const msgEl = document.getElementById('mines-msg') as HTMLElement;
const newBtn = document.getElementById('mines-new') as HTMLButtonElement;
const flagBtn = document.getElementById('mines-flag') as HTMLButtonElement;
const flagState = document.getElementById('mines-flag-state') as HTMLElement;

let board: Cell[] = [];
let status: Status = 'ready';
let flagMode = false;
let focusIdx = 0;
const buttons: HTMLButtonElement[] = [];

const empty = (): Cell[] =>
  Array.from({ length: W * H }, () => ({ mine: false, adj: 0, open: false, flag: false }));

function neighbours(i: number): number[] {
  const x = i % W, y = Math.floor(i / W), out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
  }
  return out;
}

function placeMines(first: number) {
  const banned = new Set([first, ...neighbours(first)]);
  let placed = 0;
  while (placed < M) {
    const r = Math.floor(Math.random() * W * H);
    if (banned.has(r) || board[r].mine) continue;
    board[r].mine = true;
    placed++;
  }
  board.forEach((c, i) => { c.adj = neighbours(i).filter((n) => board[n].mine).length; });
}

const allClear = () => board.filter((c) => c.open && !c.mine).length === W * H - M;
const isWon = () => allClear() && board.every((c) => (c.mine ? c.flag : !c.flag));

function act(i: number) {
  if (status === 'won' || status === 'lost') return;
  const c = board[i];
  if (flagMode) {
    // Can't flag before the first click (no mines placed yet).
    if (!c.open && status !== 'ready') c.flag = !c.flag;
    if (isWon()) status = 'won';
    return render();
  }
  if (c.flag || c.open) return;
  if (status === 'ready') { placeMines(i); status = 'play'; }
  if (c.mine) {
    board.forEach((x) => { if (x.mine) x.open = true; });
    status = 'lost';
    return render();
  }
  const stack = [i];
  while (stack.length) {
    const k = stack.pop() as number;
    if (board[k].open || board[k].flag) continue;
    board[k].open = true;
    if (board[k].adj === 0) neighbours(k).forEach((n) => { if (!board[n].open) stack.push(n); });
  }
  if (isWon()) status = 'won';
  render();
}

function label(c: Cell) {
  if (c.open) {
    if (c.mine) return 'mine';
    return c.adj ? `${c.adj} ${c.adj === 1 ? 'mine' : 'mines'} nearby` : 'clear';
  }
  return c.flag ? 'flagged' : 'hidden';
}

function render() {
  board.forEach((c, i) => {
    const b = buttons[i];
    b.className = 'mines-cell' +
      (c.open ? (c.mine ? ' is-open is-mine' : ` is-open${c.adj ? ' n' + c.adj : ''}`) : c.flag ? ' is-flag' : '');
    b.textContent = c.open ? (c.mine ? '*' : c.adj ? String(c.adj) : '') : c.flag ? 'F' : '';
    b.setAttribute('aria-label', `Row ${Math.floor(i / W) + 1}, column ${(i % W) + 1}: ${label(c)}`);
    b.tabIndex = i === focusIdx ? 0 : -1;
  });
  const flags = board.filter((c) => c.flag).length;
  let msg = 'CLICK A SQUARE', col = '';
  if (status === 'play') msg = `MINES ${M} FLAGS ${flags}`;
  if (status === 'play' && allClear()) { msg = `NOW FLAG ${M - flags}`; col = 'y'; }
  if (status === 'won') { msg = 'CLEARED!'; col = 'g'; }
  if (status === 'lost') { msg = 'BOOM'; col = 'r'; }
  msgEl.textContent = msg;
  msgEl.className = col;
  flagBtn.setAttribute('aria-pressed', String(flagMode));
  flagState.textContent = flagMode ? ': ON' : ': OFF';
}

function reset() {
  board = empty();
  status = 'ready';
  flagMode = false;
  render();
}

for (let i = 0; i < W * H; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.addEventListener('click', () => { focusIdx = i; act(i); });
  b.addEventListener('keydown', (e) => {
    const x = i % W, y = Math.floor(i / W);
    let t = -1;
    if (e.key === 'ArrowLeft' && x > 0) t = i - 1;
    else if (e.key === 'ArrowRight' && x < W - 1) t = i + 1;
    else if (e.key === 'ArrowUp' && y > 0) t = i - W;
    else if (e.key === 'ArrowDown' && y < H - 1) t = i + W;
    else if (e.key === 'Home') t = y * W;
    else if (e.key === 'End') t = y * W + W - 1;
    else return;
    e.preventDefault();
    if (t >= 0) { focusIdx = t; render(); buttons[t].focus(); }
  });
  buttons.push(b);
  gridEl.appendChild(b);
}

newBtn.addEventListener('click', reset);
flagBtn.addEventListener('click', () => { flagMode = !flagMode; render(); });

reset();
panel.hidden = false; // hidden until JS runs: no dead board without scripts
