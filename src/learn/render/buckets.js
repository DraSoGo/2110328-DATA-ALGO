import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const ROW = 40;
export const NODE_W = 44;
export const NODE_H = 30;
export const BUCKET_W = 48;
export const GAP_X = 24;
export const PAD = 16;
const LABEL_W = 26;
const INFO_H = 26;
const LANE_GAP = 10;

export const LEFT = PAD + LABEL_W;
export const CHAIN_X = LEFT + BUCKET_W + GAP_X;

export function nodeX(j) {
  return CHAIN_X + j * (NODE_W + GAP_X);
}

const num = (value) => Math.round(value * 10) / 10;

// state: { buckets: [[{key,value}]], capacity, maxChain, tmp: [{key,value}], maxLoad }
// Bucket i is row i. Its chain is drawn to the right, first node nearest the bucket.
// `capacity` (bucket rows) and `maxChain` (nodes per row) fix the viewBox.
// `tmp` is the holding row above the buckets that rehash copies values into.
// Optional `pointers: { name: where }` draws iterator-style labels. `where` is a bucket row index
// (the name sits inside that bucket's slot; an index past the last bucket marks end()), a node key
// (the name sits under that node), or { bucket, at } for position `at` in the chain of `bucket`
// (at = chain length is the end of the chain). Names that land in the same place share one label.
export function renderBuckets(state, hl = {}) {
  const buckets = state.buckets || [];
  const tmp = state.tmp || [];
  const rows = Math.max(state.capacity || 0, buckets.length, 1);
  const chain = Math.max(state.maxChain || 0, tmp.length, 1, ...buckets.map((b) => b.length));
  const hasTmp = 'tmp' in state;
  const top = PAD + (hasTmp ? ROW + LANE_GAP : 0);
  const rowY = (i) => top + i * ROW;
  const svgWidth = nodeX(chain) - GAP_X + PAD + 14;
  const svgHeight = top + rows * ROW + INFO_H + PAD;
  const midY = (y) => y + ROW / 2;
  const ground = (x, y) => `<path class="edge" d="M${num(x)} ${num(y)}H${num(x + 10)}"/><path class="edge ground" d="M${num(x + 10)} ${num(y - 6)}V${num(y + 6)}"/>`;
  const arrow = (x1, x2, y) => `<path class="edge" d="M${num(x1)} ${num(y)}H${num(x2)}" marker-end="url(#buckets-arrow)"/>`;

  const lit = new Set(hl.bucket || []);
  let slotMarkup = '';
  let edgeMarkup = '';
  for (let i = 0; i < rows; i += 1) {
    const live = i < buckets.length;
    const y = rowY(i);
    const cls = ['slot', live ? '' : 'spare', lit.has(i) ? 'is-active' : ''].filter(Boolean).join(' ');
    slotMarkup += `<rect class="${cls}" x="${LEFT}" y="${num(y + (ROW - NODE_H) / 2)}" width="${BUCKET_W}" height="${NODE_H}" rx="6"/>`;
    if (!live) continue;
    slotMarkup += `<text class="index" x="${LEFT - 8}" y="${num(midY(y) + 4)}" text-anchor="end">${i}</text>`;
    const length = buckets[i].length;
    let from = LEFT + BUCKET_W;
    for (let j = 0; j < length; j += 1) {
      edgeMarkup += arrow(from, nodeX(j), midY(y));
      from = nodeX(j) + NODE_W;
    }
    edgeMarkup += ground(from, midY(y));
  }
  if (hasTmp) slotMarkup += `<text class="lane-label" x="${PAD}" y="${PAD + ROW / 2 + 4}">tmp</text>`;

  const total = buckets.reduce((sum, b) => sum + b.length, 0) + tmp.length;
  const load = buckets.length ? total / buckets.length : 0;
  const info = 'maxLoad' in state
    ? `<text class="info" x="${PAD}" y="${top + rows * ROW + 18}">n = ${total}   m = ${buckets.length}   load factor n/m = ${load.toFixed(2)}   (max ${Number(state.maxLoad).toFixed(1)})</text>`
    : '';
  const defs = '<defs><marker id="buckets-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';

  const spot = (where) => {
    if (typeof where === 'number') return { x: LEFT + BUCKET_W / 2, y: midY(rowY(where)) + 4, text: '' };
    const under = (bucket, at) => ({ x: nodeX(at) + NODE_W / 2, y: rowY(bucket) + (ROW + NODE_H) / 2 + 9, text: '↑' });
    if (where && typeof where === 'object') return under(where.bucket, where.at);
    for (let i = 0; i < buckets.length; i += 1) {
      const j = buckets[i].findIndex((cell) => cell.key === where);
      if (j >= 0) return under(i, j);
    }
    return null;
  };
  const groups = new Map();
  for (const [name, where] of Object.entries(state.pointers || {})) {
    const at = where == null ? null : spot(where);
    if (!at) continue;
    const id = `${at.x},${at.y}`;
    groups.set(id, { ...at, names: [...(groups.get(id)?.names || []), name] });
  }
  const pointerMarkup = [...groups.values()].map(({ x, y, text, names }) => `<g class="pointer" data-key="ptr-${escapeHtml(names.join('+'))}" style="transform:translate(${num(x)}px,${num(y)}px)"><text text-anchor="middle" style="font-size:10px">${text}${escapeHtml(names.join(','))}</text></g>`).join('');

  const node = (cell, x, y) => `<g class="${['item', ...classesFor(cell.key, hl)].join(' ')}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${num(x)}px,${num(y)}px)"><rect width="${NODE_W}" height="${NODE_H}" rx="6"/><text x="${NODE_W / 2}" y="${NODE_H / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`;
  const itemMarkup = buckets.map((cells, i) => cells.map((cell, j) => node(cell, nodeX(j), rowY(i) + (ROW - NODE_H) / 2)).join('')).join('')
    + tmp.map((cell, j) => node(cell, nodeX(j), PAD + (ROW - NODE_H) / 2)).join('')
    + pointerMarkup;

  const label = `Hash table with ${buckets.length} buckets and ${total} keys: ${buckets.map((b, i) => `${i}: ${b.map((c) => c.value).join(' ') || 'empty'}`).join('; ')}`;
  return `<svg class="viz viz-buckets" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${defs}${slotMarkup}${edgeMarkup}${info}</g><g class="layer-items">${itemMarkup}</g></svg>`;
}
