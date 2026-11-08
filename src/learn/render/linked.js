import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const NODE_W = 56;
export const NODE_H = 40;
export const GAP_X = 36;
export const PAD = 16;
const POINTER_ROW = 16;
const LANE_GAP = 12;

export function slotX(slot) {
  return PAD + slot * (NODE_W + GAP_X);
}

// Depth of the longest arc for a list that holds `capacity` nodes. The arcs
// above and below the row share it, so the box never depends on the step.
export function arcDepth(capacity) {
  return 14 + 7 * capacity;
}

const num = (value) => Math.round(value * 10) / 10;

// state: { header: {key,next,prev}, nodes: [{key,value,next,prev}] in list order,
//   pending: {key,value,next,prev,at} | null, pointers: {name: key|null}, capacity }
// The header is slot 0, nodes[i] is slot i + 1. A pending node sits in the lane
// below the row, centred in the gap before slot `at`. Arrows come from each
// node's own next/prev fields, so a half-linked list shows half-linked.
export function renderLinked(state, hl = {}) {
  const nodes = state.nodes || [];
  const capacity = Math.max(state.capacity || 0, nodes.length, 1);
  const slots = capacity + 1;
  const depth = arcDepth(capacity);
  const hasLane = 'pending' in state;
  const pointerRows = 'pointers' in state ? Math.max(1, Object.keys(state.pointers).length) : 0;
  const rowTop = PAD + depth;
  const rowBottom = rowTop + NODE_H;
  const below = Math.max(depth, 14 + pointerRows * POINTER_ROW);
  const laneTop = rowBottom + below + LANE_GAP;
  const svgWidth = slotX(slots) - GAP_X + PAD;
  const svgHeight = (hasLane ? laneTop + NODE_H : rowBottom + below) + PAD;

  const header = state.header ? { ...state.header, header: true } : null;
  const all = new Map();
  const place = (node, x, y, extra) => all.set(node.key, { node, x, y, ...extra });
  if (header) place(header, slotX(0), rowTop, { slot: 0 });
  nodes.forEach((node, i) => place(node, slotX(i + 1), rowTop, { slot: i + 1 }));
  if (state.pending) place(state.pending, slotX(state.pending.at) - GAP_X / 2 - NODE_W / 2, laneTop, { lane: true, slot: state.pending.at - 0.5 });

  const lit = new Set(hl.edge || []);
  const edge = (a, field) => {
    const target = a.node[field];
    const cls = `edge ${field}${lit.has(`${a.node.key}.${field}`) ? ' is-new' : ''}`;
    const up = field === 'next';
    if (target == null || !all.get(target)) {
      const sx = a.x + (up ? 0.8 : 0.2) * NODE_W;
      const sy = up || a.lane ? a.y : a.y + NODE_H;
      const dir = a.lane || up ? -1 : 1;
      return `<g class="${cls} is-null"><path d="M${num(sx)} ${num(sy)}V${num(sy + dir * 10)}"/><path class="tick" d="M${num(sx - 5)} ${num(sy + dir * 10)}H${num(sx + 5)}"/></g>`;
    }
    const b = all.get(target);
    let d;
    if (a.lane || b.lane) {
      // Different rows: join the bottom of the row node with the top of the lane node.
      const fx = up ? 0.7 : 0.3;
      const sx = a.x + fx * NODE_W;
      const tx = b.x + fx * NODE_W;
      const sy = a.lane ? a.y : a.y + NODE_H;
      const ty = b.lane ? b.y : b.y + NODE_H;
      const mid = (ty - sy) / 2;
      d = `M${num(sx)} ${num(sy)}C${num(sx)} ${num(sy + mid)} ${num(tx)} ${num(ty - mid)} ${num(tx)} ${num(ty)}`;
    } else if (up && b.slot === a.slot + 1) {
      d = `M${num(a.x + NODE_W)} ${num(a.y + 12)}H${num(b.x)}`;
    } else if (!up && b.slot === a.slot - 1) {
      d = `M${num(a.x)} ${num(a.y + NODE_H - 12)}H${num(b.x + NODE_W)}`;
    } else {
      const span = Math.abs(b.slot - a.slot);
      const h = span === 0 ? 22 : 14 + ((depth - 14) * Math.min(span, capacity)) / capacity;
      const sx = a.x + (up ? 0.8 : 0.2) * NODE_W;
      const tx = b.x + (up ? 0.2 : 0.8) * NODE_W;
      const sy = up ? a.y : a.y + NODE_H;
      const ty = up ? b.y : b.y + NODE_H;
      const dir = up ? -1 : 1;
      const bulge = span === 0 ? 10 : 0;
      d = `M${num(sx)} ${num(sy)}C${num(sx + bulge)} ${num(sy + dir * h)} ${num(tx - bulge)} ${num(ty + dir * h)} ${num(tx)} ${num(ty)}`;
    }
    return `<path class="${cls}" d="${d}" marker-end="url(#linked-arrow)"/>`;
  };

  const edgeMarkup = [...all.values()].map((entry) => edge(entry, 'next') + edge(entry, 'prev')).join('');
  const defs = '<defs><marker id="linked-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';
  const laneLabel = hasLane ? `<text class="lane-label" x="${PAD}" y="${laneTop + NODE_H / 2 + 4}">new node</text>` : '';

  const itemMarkup = [...all.values()].map(({ node, x, y, lane }) => {
    const extra = [];
    if (node.key === state.header?.key) extra.push('is-header');
    if (lane) extra.push('is-lane');
    if ((hl.removed || []).includes(node.key)) extra.push('is-removed');
    const cls = ['item', ...extra, ...classesFor(node.key, hl)].join(' ');
    const text = node.key === state.header?.key ? 'header' : escapeHtml(node.value);
    return `<g class="${cls}" data-key="${escapeHtml(node.key)}" style="transform:translate(${num(x)}px,${num(y)}px)"><rect width="${NODE_W}" height="${NODE_H}" rx="6"/><text x="${NODE_W / 2}" y="${NODE_H / 2 + 5}" text-anchor="middle">${text}</text></g>`;
  }).join('');

  const stack = new Map();
  const pointerMarkup = Object.entries(state.pointers || {})
    .filter(([, key]) => key != null && all.has(key))
    .map(([name, key]) => {
      const row = stack.get(key) || 0;
      stack.set(key, row + 1);
      const target = all.get(key);
      const y = (target.lane ? target.y + NODE_H : rowBottom) + 3 + row * POINTER_ROW;
      return `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${num(target.x + NODE_W / 2)}px,${num(y)}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`;
    }).join('');

  const label = `Circular doubly linked list with header, ${nodes.length} node${nodes.length === 1 ? '' : 's'}: ${nodes.map((node) => node.value).join(', ') || 'empty'}`;
  return `<svg class="viz viz-linked" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${defs}${laneLabel}${edgeMarkup}</g><g class="layer-items">${itemMarkup}${pointerMarkup}</g></svg>`;
}
