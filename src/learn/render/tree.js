// Binary tree renderer (BST now; AVL and red-black later).
//
// state = {
//   nodes: [{ key, label, left, right, color?, badge? }],
//          key    unique, stable node identity (a node keeps its key when it moves or rotates)
//          label  text shown in the circle
//          left / right   key of the child, or null / undefined
//          color  'red' | 'black' optional (red-black trees): adds class is-red / is-black
//          (labels longer than 3 characters, such as map "k:v", get class is-long and a smaller font)
//          badge  optional small text at the node's upper right (balance factor, height, visit order)
//   root: key | null,
//   pointers?: { name: nodeKey | null },  // drawn as "↑name" under the node; null pointers are not drawn.
//                                         // Declaring the object reserves label rows, so keep the same names every frame.
//   capacity: max number of nodes the module allows   } fixed for one module run:
//   maxDepth: deepest depth allowed (root = 0)         } they size the viewBox
//   (`slots` is not used by this renderer.)
// }
// hl = { active, compare, moved, done }: arrays of NODE KEYS -> classes is-active / is-compare / is-moved / is-done.
//
// Layout: x = in-order rank of the node, centred in the canvas; y = depth. Only nodes reachable from `root`
// are drawn. Node groups (layer-items) are keyed by node key, so any change of position animates.
// Edges are plain lines in layer-static (they redraw each frame and do not animate).
// The viewBox depends only on capacity, maxDepth and whether `pointers` is declared, never on the current tree.
// (If a tree outgrows its declared limits the box grows to fit; modules must enforce limits in check().)
import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const NODE_R = 18;
export const DX = 44;
export const DY = 56;
export const PAD = 16;
export const POINTER_ROW = 13;

export function layoutTree(state) {
  const byKey = new Map((state.nodes || []).map((node) => [node.key, node]));
  const placed = new Map();
  const edges = [];
  const seen = new Set();
  let rank = 0;
  const walk = (key, depth, parent) => {
    const node = byKey.get(key);
    if (!node || seen.has(key)) return;
    seen.add(key);
    walk(node.left, depth + 1, key);
    placed.set(key, { node, rank, depth });
    rank += 1;
    if (parent !== null) edges.push([parent, key]);
    walk(node.right, depth + 1, key);
  };
  walk(state.root ?? null, 0, null);
  return { placed, edges, count: rank, depth: Math.max(-1, ...[...placed.values()].map((p) => p.depth)) };
}

export function treeBox(state, laid) {
  const capacity = Math.max(state.capacity || 0, laid.count, 1);
  const maxDepth = Math.max(state.maxDepth || 0, laid.depth, 0);
  const pointerRows = 'pointers' in state ? Math.max(1, Object.keys(state.pointers || {}).length) : 0;
  return {
    capacity,
    width: 2 * PAD + 2 * NODE_R + (capacity - 1) * DX,
    height: 2 * PAD + 2 * NODE_R + maxDepth * DY + (pointerRows ? 6 + pointerRows * POINTER_ROW : 0),
  };
}

export function nodeMarkup(key, label, x, y, classes, badge) {
  const extra = badge === undefined || badge === null || badge === '' ? '' : `<text class="badge" x="${NODE_R - 2}" y="${-NODE_R + 2}">${escapeHtml(badge)}</text>`;
  return `<g class="${classes.join(' ')}" data-key="${escapeHtml(key)}" style="transform:translate(${x}px,${y}px)"><circle r="${NODE_R}"/><text y="5" text-anchor="middle">${escapeHtml(label)}</text>${extra}</g>`;
}

export function edgeMarkup(x1, y1, x2, y2) {
  return `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
}

export function renderTree(state, hl = {}) {
  const laid = layoutTree(state);
  const box = treeBox(state, laid);
  const offset = (box.capacity - laid.count) / 2;
  const at = (key) => {
    const { rank, depth } = laid.placed.get(key);
    return { x: PAD + NODE_R + (rank + offset) * DX, y: PAD + NODE_R + depth * DY };
  };

  const edgeMarkupAll = laid.edges.map(([from, to]) => {
    const a = at(from);
    const b = at(to);
    return edgeMarkup(a.x, a.y, b.x, b.y);
  }).join('');
  const nodeMarkupAll = [...laid.placed.entries()].map(([key, { node }]) => {
    const { x, y } = at(key);
    const classes = ['node', ...(node.color === 'red' || node.color === 'black' ? [`is-${node.color}`] : []), ...(String(node.label).length > 3 ? ['is-long'] : []), ...classesFor(key, hl)];
    return nodeMarkup(key, node.label, x, y, classes, node.badge);
  }).join('');

  const stack = new Map();
  const pointerMarkup = Object.entries(state.pointers || {})
    .filter(([, key]) => key !== null && key !== undefined && laid.placed.has(key))
    .map(([name, key]) => {
      const row = stack.get(key) || 0;
      stack.set(key, row + 1);
      const { x, y } = at(key);
      return `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${x}px,${y + NODE_R + 2 + row * POINTER_ROW}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`;
    }).join('');

  const inorder = [...laid.placed.values()].map((p) => p.node.label).join(', ');
  const label = laid.count ? `Binary tree of ${laid.count} node${laid.count === 1 ? '' : 's'}, in-order: ${inorder}` : 'Empty binary tree';
  return `<svg class="viz viz-tree" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.width} ${box.height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${edgeMarkupAll}</g><g class="layer-items">${nodeMarkupAll}${pointerMarkup}</g></svg>`;
}
