import test from 'node:test';
import assert from 'node:assert/strict';
import { NODE_H, NODE_W, renderLinked, slotX } from '../src/learn/render/linked.js';
import { RENDERERS } from '../src/learn/render/index.js';

function build(values, extra = {}) {
  const keys = values.map((_, i) => `n${i}`);
  const order = ['h', ...keys];
  const next = (i) => order[(i + 1) % order.length];
  const prev = (i) => order[(i + order.length - 1) % order.length];
  return {
    header: { key: 'h', next: next(0), prev: prev(0) },
    nodes: values.map((value, i) => ({ key: keys[i], value, next: next(i + 1), prev: prev(i + 1) })),
    pending: null,
    pointers: { it: null },
    capacity: 5,
    ...extra,
  };
}

const at = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const count = (svg, re) => (svg.match(re) || []).length;

test('header is slot 0 and nodes follow in list order, keyed', () => {
  const svg = renderLinked(build([10, 20, 30]));
  assert.equal(Number(at(svg, 'h')[2]), slotX(0));
  assert.equal(Number(at(svg, 'n0')[2]), slotX(1));
  assert.equal(Number(at(svg, 'n2')[2]), slotX(3));
  assert.equal(at(svg, 'n1')[1], 'item');
  assert.match(at(svg, 'h')[1], /is-header/);
  assert.match(svg, /class="viz viz-linked"/);
  assert.equal(RENDERERS.linked, renderLinked);
});

test('every next and prev field becomes an arrow', () => {
  const svg = renderLinked(build([10, 20, 30]));
  assert.equal(count(svg, /<path class="edge next"/g), 4);
  assert.equal(count(svg, /<path class="edge prev"/g), 4);
});

test('an empty list is a header pointing at itself', () => {
  const svg = renderLinked(build([]));
  assert.equal(count(svg, /<path class="edge next"/g), 1);
  assert.equal(count(svg, /<path class="edge prev"/g), 1);
});

test('null pointers draw a ground stub instead of an arrow', () => {
  const state = build([10], { pending: { key: 'p', value: 5, next: null, prev: null, at: 1 } });
  const svg = renderLinked(state);
  assert.equal(count(svg, /edge next is-null/g), 1);
  assert.equal(count(svg, /edge prev is-null/g), 1);
});

test('a pending node sits in a lane below the row, centred in the gap', () => {
  const state = build([10, 20], { pending: { key: 'p', value: 99, next: 'n1', prev: 'n0', at: 2 } });
  const svg = renderLinked(state);
  const row = Number(at(svg, 'n0')[3]);
  assert.equal(Number(at(svg, 'p')[3]) > row + NODE_H, true);
  const centre = Number(at(svg, 'p')[2]) + NODE_W / 2;
  assert.equal(centre > slotX(1) + NODE_W && centre < slotX(2), true);
  assert.match(at(svg, 'p')[1], /is-lane/);
  assert.equal(count(svg, /<path class="edge next"/g), 4);
});

test('half-linked arrows follow the real fields', () => {
  const state = build([10, 20], { pending: { key: 'p', value: 99, next: 'n1', prev: null, at: 2 } });
  state.nodes[0].next = 'p';
  const svg = renderLinked(state, { edge: ['n0.next'] });
  assert.equal(count(svg, /edge next is-new/g), 1);
  assert.equal(count(svg, /edge prev is-null/g), 1);
});

test('iterator markers are keyed ptr-<name> and follow the node', () => {
  const svg = renderLinked(build([10, 20, 30], { pointers: { it: 'n1' } }));
  const m = svg.match(/data-key="ptr-it" style="transform:translate\(([-\d.]+)px,([-\d.]+)px\)/);
  assert.equal(Number(m[1]), slotX(2) + NODE_W / 2);
  assert.match(svg, /↑it/);
  const none = renderLinked(build([10], { pointers: { it: null } }));
  assert.equal(none.includes('ptr-it'), false);
});

test('highlights become classes', () => {
  const svg = renderLinked(build([10, 20]), { active: ['n0'], compare: ['n1'], removed: ['n1'] });
  assert.equal(at(svg, 'n0')[1], 'item is-active');
  assert.match(at(svg, 'n1')[1], /is-removed/);
  assert.match(at(svg, 'n1')[1], /is-compare/);
});

test('the viewBox depends on capacity, not on the step', () => {
  const sizes = new Set([
    renderLinked(build([])),
    renderLinked(build([1, 2, 3])),
    renderLinked(build([1, 2], { pending: { key: 'p', value: 3, next: 'h', prev: 'n1', at: 3 }, pointers: { it: 'h' } })),
  ].map(box));
  assert.equal(sizes.size, 1);
  assert.notEqual(box(renderLinked(build([1], { capacity: 8 }))), box(renderLinked(build([1], { capacity: 5 }))));
});

test('values and keys are escaped', () => {
  const state = build(['<b>"x"&']);
  state.nodes[0].key = 'k"><x';
  state.header.next = state.nodes[0].key;
  const svg = renderLinked(state);
  assert.equal(svg.includes('<b>'), false);
  assert.match(svg, /&lt;b&gt;&quot;x&quot;&amp;/);
  assert.equal(svg.includes('k"><x'), false);
});
