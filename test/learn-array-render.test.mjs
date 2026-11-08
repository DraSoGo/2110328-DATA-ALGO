import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, GUTTER, PAD, renderArray, slotX } from '../src/learn/render/array.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (...values) => values.map((value, i) => ({ key: `k${i}`, value }));
const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));

test('slotX leaves a gutter for index -1 pointers', () => {
  assert.equal(slotX(0), GUTTER);
  assert.equal(slotX(-1) < GUTTER, true);
});

test('cells mode draws one keyed item per cell at its slot', () => {
  const svg = renderArray({ cells: cells(10, 20, 30) });
  assert.match(svg, /^<svg class="viz viz-array" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
  assert.deepEqual(keys(svg), ['k0', 'k1', 'k2']);
  assert.equal(Number(groupFor(svg, 'k1')[2]), slotX(1));
  assert.match(svg, />20<\/text>/);
  assert.match(svg, /class="layer-static"/);
  assert.match(svg, /class="layer-items"/);
});

test('capacity and empty cells draw dashed spare slots', () => {
  const svg = renderArray({ cells: [{ key: 'a', value: 1 }, null], capacity: 4 });
  assert.equal((svg.match(/<rect class="slot/g) || []).length, 4);
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 3);
  assert.deepEqual(keys(svg), ['a']);
});

test('highlights map to classes on the matching items', () => {
  const svg = renderArray({ cells: cells(1, 2, 3) }, { active: [0], compare: [1], moved: [1], done: [2] });
  assert.equal(groupFor(svg, 'k0')[1], 'item is-active');
  assert.equal(groupFor(svg, 'k1')[1], 'item is-compare is-moved');
  assert.equal(groupFor(svg, 'k2')[1], 'item is-done');
});

test('lifted item sits above its slot in the top lane', () => {
  const svg = renderArray({ cells: [{ key: 'a', value: 1 }, null], lifted: { key: 'b', value: 5, at: 1 } });
  const lifted = groupFor(svg, 'b');
  assert.equal(lifted[1], 'item is-lifted');
  assert.equal(Number(lifted[2]), slotX(1));
  assert.equal(Number(lifted[3]), PAD);
  assert.equal(Number(groupFor(svg, 'a')[3]) > PAD + CELL, true);
});

test('pointers are keyed and stack when they share an index', () => {
  const svg = renderArray({ cells: cells(1, 2), pointers: { i: 1, j: -1, k: 1 } });
  assert.deepEqual(keys(svg).filter((key) => key.startsWith('ptr-')), ['ptr-i', 'ptr-j', 'ptr-k']);
  const y = (name) => Number(svg.match(new RegExp(`data-key="ptr-${name}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)`))[2]);
  assert.equal(y('k') > y('i'), true);
  assert.equal(y('j'), y('i'));
});

test('bars mode scales heights by value', () => {
  const svg = renderArray({ mode: 'bars', cells: cells(1, 5, 3) });
  assert.match(svg, /class="viz viz-array is-bars"/);
  const height = (key) => Number(svg.match(new RegExp(`data-key="${key}"[^>]*><rect width="${CELL}" height="(\\d+)"`))[1]);
  assert.equal(height('k1') > height('k2') && height('k2') > height('k0'), true);
});

test('text content is escaped and the registry exposes the renderer', () => {
  const svg = renderArray({ cells: [{ key: 'x"y', value: '<b>' }] });
  assert.match(svg, /data-key="x&quot;y"/);
  assert.match(svg, />&lt;b&gt;<\/text>/);
  assert.equal(RENDERERS.array, renderArray);
});

test('a state that declares pointers keeps the same viewBox with or without them', () => {
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  assert.equal(box(renderArray({ cells: cells(1, 2), pointers: {} })), box(renderArray({ cells: cells(1, 2), pointers: { i: 0 } })));
});

test('cellWidth widens slots and items', () => {
  const svg = renderArray({ cells: cells(1, 2), cellWidth: 84 });
  assert.equal(Number(groupFor(svg, 'k1')[2]), slotX(1, 84));
  assert.match(svg, /<rect width="84"/);
});

test('every declared pointer name reserves a row', () => {
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  assert.equal(box(renderArray({ cells: cells(1, 2), pointers: { i: null, j: null } })), box(renderArray({ cells: cells(1, 2), pointers: { i: 0, j: 0 } })));
});
