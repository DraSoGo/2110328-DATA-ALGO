import { escapeHtml } from '../../lib/html.js';

export const CELL = 44;
export const GAP = 8;
export const PAD = 16;
export const GUTTER = 40;
const BAR_MAX = 120;
const BAR_MIN = 24;
const LABEL_SPACE = 22;
const POINTER_ROW = 16;
const HL_CLASSES = [['active', 'is-active'], ['compare', 'is-compare'], ['moved', 'is-moved'], ['done', 'is-done']];

export function slotX(index, width = CELL) {
  return GUTTER + index * (width + GAP);
}

export function classesFor(index, hl) {
  return HL_CLASSES.filter(([name]) => (hl[name] || []).includes(index)).map(([, className]) => className);
}

export function renderArray(state, hl = {}) {
  const cells = state.cells || [];
  const bars = state.mode === 'bars';
  const width = state.cellWidth || CELL;
  const x = (index) => slotX(index, width);
  const slots = Math.max(cells.length, state.capacity || 0, 1);
  const values = [...cells, state.lifted].filter(Boolean).map((cell) => Number(cell.value) || 0);
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const rowHeight = bars ? BAR_MAX : CELL;
  const itemHeight = (value) => (bars ? BAR_MIN + Math.round((((Number(value) || 0) - low) / (high - low)) * (BAR_MAX - BAR_MIN)) : CELL);
  const lane = 'lifted' in state ? rowHeight + PAD : 0;
  const BRACKET_SPACE = 30;
  const brackets = (state.brackets || []).filter((item) => item.to >= item.from);
  const rowTop = PAD + lane + (state.brackets ? BRACKET_SPACE : 0);
  const baseline = rowTop + rowHeight;

  const stack = new Map();
  const pointers = Object.entries(state.pointers || {})
    .filter(([, index]) => Number.isInteger(index))
    .map(([name, index]) => {
      const row = stack.get(index) || 0;
      stack.set(index, row + 1);
      return { name, index, row };
    });
  // Reserve one row per declared pointer name (even null ones) so the viewBox
  // stays fixed while pointers come and go or share an index.
  const pointerRows = 'pointers' in state ? Math.max(1, Object.keys(state.pointers).length) : 0;
  const svgWidth = x(slots) - GAP + PAD;
  const svgHeight = baseline + LABEL_SPACE + pointerRows * POINTER_ROW + PAD;

  const item = (cell, left, top, h, className) => `<g class="${className}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${left}px,${top}px)"><rect width="${width}" height="${h}" rx="6"/><text x="${width / 2}" y="${bars ? h - 8 : CELL / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`;

  const slotMarkup = Array.from({ length: slots }, (_, index) => `<rect class="slot${!cells[index] ? ' spare' : ''}" x="${x(index)}" y="${rowTop}" width="${width}" height="${rowHeight}" rx="6"/>`).join('');
  const labelMarkup = Array.from({ length: slots }, (_, index) => `<text class="index" x="${x(index) + width / 2}" y="${baseline + 15}" text-anchor="middle">${index}</text>`).join('');
  const itemMarkup = cells.map((cell, index) => {
    if (!cell) return '';
    const h = itemHeight(cell.value);
    return item(cell, x(index), baseline - h, h, ['item', ...classesFor(index, hl)].join(' '));
  }).join('');
  const liftedMarkup = state.lifted
    ? item(state.lifted, x(state.lifted.at), PAD + rowHeight - itemHeight(state.lifted.value), itemHeight(state.lifted.value), 'item is-lifted')
    : '';
  const pointerMarkup = pointers.map(({ name, index, row }) => `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${index < 0 ? GUTTER / 2 : x(index) + width / 2}px,${baseline + LABEL_SPACE + row * POINTER_ROW}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`).join('');

  // A labelled bracket over slots from..to (used by the Code tab to point at mSize, mCap ...).
  const bracketMarkup = brackets.map(({ from, to, label: text }) => {
    const x1 = x(from);
    const x2 = x(to) + width;
    const y = rowTop - 8;
    return `<g class="bracket"><path d="M${x1},${y + 6}V${y}H${x2}V${y + 6}"/><text x="${(x1 + x2) / 2}" y="${y - 6}" text-anchor="middle">${escapeHtml(text)}</text></g>`;
  }).join('');
  const label = `Array of ${cells.length}: ${cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`;
  return `<svg class="viz viz-array${bars ? ' is-bars' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${bracketMarkup}${slotMarkup}${labelMarkup}</g><g class="layer-items">${itemMarkup}${liftedMarkup}${pointerMarkup}</g></svg>`;
}
