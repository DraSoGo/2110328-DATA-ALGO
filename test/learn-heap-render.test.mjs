import test from 'node:test';
import assert from 'node:assert/strict';
import { cellX, heapGeometry, heapNode, renderHeap } from '../src/learn/render/heap.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (...values) => values.map((value, i) => ({ key: `h${i}`, value }));
const place = (svg, key) => {
  const m = svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
  return m && { classes: m[1], x: Number(m[2]), y: Number(m[3]) };
};
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];

test('tree node i sits under its parent (children of i are 2i+1 and 2i+2)', () => {
  const g = heapGeometry({});
  const parent = heapNode(1, g);
  const left = heapNode(3, g);
  const right = heapNode(4, g);
  assert.equal((left.x + right.x) / 2, parent.x);
  assert.ok(left.y > parent.y && left.y === right.y);
  assert.equal(heapNode(0, g).x, g.width / 2 + 16);
  assert.equal(heapNode(15, g), null);
});

test('every element has a tree node and an array cell keyed by element key', () => {
  const svg = renderHeap({ cells: cells(9, 5, 7), capacity: 4 });
  const g = heapGeometry({ capacity: 4 });
  assert.equal(place(svg, 'h0').x, heapNode(0, g).x);
  assert.equal(place(svg, 'a-h2').x, cellX(2));
  assert.equal(place(svg, 'a-h2').y, g.arrayTop);
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 1);
  assert.equal((svg.match(/<line class="edge"/g) || []).length, 2);
  assert.match(svg, /class="viz viz-heap"/);
  assert.equal(RENDERERS.heap, renderHeap);
});

test('a swap moves both views', () => {
  const before = renderHeap({ cells: cells(1, 2), capacity: 2 });
  const swapped = renderHeap({ cells: [{ key: 'h1', value: 2 }, { key: 'h0', value: 1 }], capacity: 2 });
  assert.equal(place(swapped, 'h1').x, place(before, 'h0').x);
  assert.equal(place(swapped, 'a-h1').x, place(before, 'a-h0').x);
  assert.equal(place(swapped, 'h0').y, place(before, 'h1').y);
});

test('index highlights apply to the tree node and the array cell', () => {
  const svg = renderHeap({ cells: cells(1, 2, 3), capacity: 4 }, { active: [0], compare: [1, 2], moved: [2], done: [1] });
  assert.equal(place(svg, 'h0').classes, 'node is-active');
  assert.equal(place(svg, 'a-h0').classes, 'item is-active');
  assert.equal(place(svg, 'h1').classes, 'node is-compare is-done');
  assert.equal(place(svg, 'a-h2').classes, 'item is-compare is-moved');
});

test('viewBox stays fixed while the heap grows, shrinks and expands', () => {
  const sizes = [[0, 1], [3, 4], [8, 16], [15, 16]];
  const boxes = new Set(sizes.map(([n, capacity]) => box(renderHeap({ cells: cells(...Array(n).fill(1)), capacity }))));
  assert.equal(boxes.size, 1);
  assert.notEqual(box(renderHeap({ cells: [], capacity: 1, limit: 7 })), [...boxes][0]);
});

test('values are escaped and an empty heap renders', () => {
  const svg = renderHeap({ cells: [{ key: 'k<1>', value: '<i>' }], capacity: 1 });
  assert.match(svg, /&lt;i&gt;/);
  assert.match(svg, /data-key="k&lt;1&gt;"/);
  assert.match(renderHeap({ cells: [], capacity: 1 }), /array order: empty/);
});
