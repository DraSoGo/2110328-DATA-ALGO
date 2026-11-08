// Binary heap renderer: the heap drawn as a tree (index i, children 2i+1 and 2i+2, as in the course)
// with the backing array mData underneath.
//
// state = {
//   cells: [{ key, value }],   // mData[0..size-1] in array order; size = cells.length
//   capacity: number,          // mCap: allocated slots, drawn as dashed spare slots (a power of two)
//   limit?: number,            // max elements the module allows (default 15); fixes the canvas size
// }
// hl = { active, compare, moved, done }: arrays of ARRAY INDEXES, applied to both the tree node and the array cell.
//
// Each element has two keyed groups: the tree node `<key>` and the array cell `a-<key>`, so a swap moves both.
// The viewBox depends only on `limit`.
import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';
import { DY, edgeMarkup, NODE_R, nodeMarkup } from './tree.js';

export const CELL_W = 36;
export const CELL_H = 32;
export const CELL_GAP = 4;
export const PAD = 16;
const INDEX_ROW = 16;
const BAND = 30;

const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

export function heapGeometry(state) {
  const limit = Math.max(1, state.limit || 15);
  const slots = Math.max(nextPow2(limit), state.capacity || 0);
  const levels = Math.floor(Math.log2(limit)) + 1;
  const width = slots * (CELL_W + CELL_GAP) - CELL_GAP;
  const arrayTop = PAD + 2 * NODE_R + (levels - 1) * DY + BAND;
  return { slots, levels, width, arrayTop, height: arrayTop + CELL_H + INDEX_ROW + PAD };
}

export const cellX = (index) => PAD + index * (CELL_W + CELL_GAP);

// Centre of tree node i (null when the canvas has no level for it).
export function heapNode(index, geometry) {
  const depth = Math.floor(Math.log2(index + 1));
  if (depth >= geometry.levels) return null;
  const k = index + 1 - 2 ** depth;
  return { x: PAD + ((2 * k + 1) * geometry.width) / 2 ** (depth + 1), y: PAD + NODE_R + depth * DY };
}

export function renderHeap(state, hl = {}) {
  const cells = state.cells || [];
  const g = heapGeometry(state);
  const live = Math.max(cells.length, state.capacity || 0);
  const slotMarkup = Array.from({ length: live }, (_, index) => `<rect class="slot${!cells[index] ? ' spare' : ''}" x="${cellX(index)}" y="${g.arrayTop}" width="${CELL_W}" height="${CELL_H}" rx="6"/><text class="index" x="${cellX(index) + CELL_W / 2}" y="${g.arrayTop + CELL_H + 13}" text-anchor="middle">${index}</text>`).join('');
  const edges = cells.map((_, index) => {
    const parent = index === 0 ? null : heapNode((index - 1) >> 1, g);
    const child = heapNode(index, g);
    return parent && child ? edgeMarkup(parent.x, parent.y, child.x, child.y) : '';
  }).join('');

  const treeItems = cells.map((cell, index) => {
    const p = heapNode(index, g);
    return p ? nodeMarkup(cell.key, cell.value, p.x, p.y, ['node', ...classesFor(index, hl)], index) : '';
  }).join('');
  const arrayItems = cells.map((cell, index) => `<g class="${['item', ...classesFor(index, hl)].join(' ')}" data-key="a-${escapeHtml(cell.key)}" style="transform:translate(${cellX(index)}px,${g.arrayTop}px)"><rect width="${CELL_W}" height="${CELL_H}" rx="6"/><text x="${CELL_W / 2}" y="${CELL_H / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`).join('');

  const label = `Binary heap of ${cells.length}, array order: ${cells.map((cell) => cell.value).join(', ') || 'empty'}`;
  return `<svg class="viz viz-heap" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width + 2 * PAD} ${g.height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${edges}${slotMarkup}</g><g class="layer-items">${treeItems}${arrayItems}</g></svg>`;
}
