import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const COL_W = 72;
export const COL_H = 36;
const GAP = 6;
const PAD = 16;
const LABEL_W = 34;
const POINTER_W = 80;
const LEFT = PAD + LABEL_W;

// Index 0 is the bottom slot. Index -1 is the reserved row under it, used by
// pointers such as top when the stack is empty.
export function slotY(index, slots) {
  return PAD + (slots - 1 - index) * (COL_H + GAP);
}

export function renderColumn(state, hl = {}) {
  const cells = state.cells || [];
  const slots = Math.max(cells.length, state.capacity || 0, 1);
  const reserve = 'pointers' in state ? GAP + COL_H : 0;
  const width = LEFT + COL_W + POINTER_W + PAD;
  const height = PAD + slots * (COL_H + GAP) - GAP + reserve + PAD;

  const slotMarkup = Array.from({ length: slots }, (_, index) => `<rect class="slot${!cells[index] ? ' spare' : ''}" x="${LEFT}" y="${slotY(index, slots)}" width="${COL_W}" height="${COL_H}" rx="6"/>`).join('');
  const labelMarkup = Array.from({ length: slots }, (_, index) => `<text class="index" x="${LEFT - 8}" y="${slotY(index, slots) + COL_H / 2 + 4}" text-anchor="end">${index}</text>`).join('');
  const itemMarkup = cells.map((cell, index) => (cell
    ? `<g class="${['item', ...classesFor(index, hl)].join(' ')}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${LEFT}px,${slotY(index, slots)}px)"><rect width="${COL_W}" height="${COL_H}" rx="6"/><text x="${COL_W / 2}" y="${COL_H / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`
    : '')).join('');
  const pointerMarkup = Object.entries(state.pointers || {})
    .filter(([, index]) => Number.isInteger(index))
    .map(([name, index]) => `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${LEFT + COL_W + 8}px,${slotY(index, slots) + COL_H / 2 + 4}px)"><text>← ${escapeHtml(name)}</text></g>`)
    .join('');

  const label = `Stack of ${cells.length}, bottom to top: ${cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`;
  return `<svg class="viz viz-column" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup}${labelMarkup}</g><g class="layer-items">${itemMarkup}${pointerMarkup}</g></svg>`;
}
