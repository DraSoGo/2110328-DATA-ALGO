import test from 'node:test';
import assert from 'node:assert/strict';
import { DX, DY, layoutTree, NODE_R, PAD, renderTree } from '../src/learn/render/tree.js';
import { RENDERERS } from '../src/learn/render/index.js';

const sample = (extra = {}) => ({
  nodes: [
    { key: 'a', label: 20, left: 'b', right: 'c' },
    { key: 'b', label: 10, left: null, right: null },
    { key: 'c', label: 30, left: null, right: null },
  ],
  root: 'a',
  capacity: 7,
  maxDepth: 3,
  ...extra,
});
const place = (svg, key) => {
  const m = svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
  return m && { classes: m[1], x: Number(m[2]), y: Number(m[3]) };
};
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];

test('x is the in-order rank (centred), y is the depth', () => {
  const laid = layoutTree(sample());
  assert.deepEqual([...laid.placed.entries()].map(([k, p]) => [k, p.rank, p.depth]), [['b', 1 - 1, 1], ['a', 1, 0], ['c', 2, 1]]);
  const svg = renderTree(sample());
  const offset = (7 - 3) / 2;
  assert.equal(place(svg, 'b').x, PAD + NODE_R + offset * DX);
  assert.equal(place(svg, 'a').x, PAD + NODE_R + (1 + offset) * DX);
  assert.equal(place(svg, 'c').x - place(svg, 'a').x, DX);
  assert.equal(place(svg, 'a').y, PAD + NODE_R);
  assert.equal(place(svg, 'b').y, PAD + NODE_R + DY);
});

test('edges are in the static layer, items are keyed by node key', () => {
  const svg = renderTree(sample());
  const [stat, items] = svg.split('<g class="layer-items">');
  assert.equal((stat.match(/<line class="edge"/g) || []).length, 2);
  assert.deepEqual([...items.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]), ['b', 'a', 'c']);
  assert.match(svg, /class="viz viz-tree"/);
  assert.equal(RENDERERS.tree, renderTree);
});

test('unreachable nodes and cycles are not drawn or looped on', () => {
  const state = sample();
  state.nodes.push({ key: 'x', label: 1 }, { key: 'loop', label: 2, left: 'loop' });
  assert.equal(place(renderTree(state), 'x'), null);
  assert.equal(layoutTree({ nodes: [{ key: 'q', label: 1, left: 'q', right: 'q' }], root: 'q' }).count, 1);
});

test('highlight and colour classes', () => {
  const state = sample();
  state.nodes[0].color = 'red';
  state.nodes[1].color = 'black';
  const svg = renderTree(state, { active: ['a'], compare: ['b'], moved: ['c'], done: ['a'] });
  assert.equal(place(svg, 'a').classes, 'node is-red is-active is-done');
  assert.equal(place(svg, 'b').classes, 'node is-black is-compare');
  assert.equal(place(svg, 'c').classes, 'node is-moved');
});

test('labels longer than 3 characters get the is-long class', () => {
  const state = sample();
  state.nodes[0].label = '12:34';
  state.nodes[1].label = -99;
  const svg = renderTree(state);
  assert.match(place(svg, 'a').classes, /\bis-long\b/);
  assert.doesNotMatch(place(svg, 'b').classes, /is-long/);
});

test('badge, pointers and escaping', () => {
  const state = sample({ pointers: { cur: 'c', par: null, '<p>': 'c' } });
  state.nodes[0].label = '<b>&"x"';
  state.nodes[0].badge = "+1'";
  const svg = renderTree(state);
  assert.match(svg, /&lt;b&gt;&amp;&quot;x&quot;/);
  assert.match(svg, /class="badge"[^>]*>\+1&#39;</);
  assert.doesNotMatch(svg, /<b>/);
  assert.ok(place(svg, 'ptr-cur'));
  assert.equal(place(svg, 'ptr-par'), null);
  assert.ok(place(svg, 'ptr-&lt;p&gt;'));
  assert.equal(place(svg, 'ptr-cur').y + 13, place(svg, 'ptr-&lt;p&gt;').y);
  assert.equal(place(svg, 'ptr-cur').y, place(svg, 'c').y + NODE_R + 2);
});

test('viewBox is constant for a module run whatever the tree looks like', () => {
  const empty = { nodes: [], root: null, capacity: 7, maxDepth: 3 };
  const chain = {
    nodes: [{ key: 'a', label: 1, right: 'b' }, { key: 'b', label: 2, right: 'c' }, { key: 'c', label: 3 }],
    root: 'a', capacity: 7, maxDepth: 3,
  };
  assert.equal(box(renderTree(empty)), box(renderTree(sample())));
  assert.equal(box(renderTree(chain)), box(renderTree(sample())));
  assert.notEqual(box(renderTree({ ...empty, maxDepth: 4 })), box(renderTree(empty)));
  assert.equal(box(renderTree({ ...empty, pointers: { a: null } })), box(renderTree({ ...sample(), pointers: { a: 'a' } })));
  assert.match(renderTree(empty), /aria-label="Empty binary tree"/);
});
