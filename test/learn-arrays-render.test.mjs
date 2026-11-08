import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, PAD, slotX } from '../src/learn/render/array.js';
import { renderArrays } from '../src/learn/render/arrays.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (prefix, ...values) => values.map((value, i) => (value === null ? null : { key: `${prefix}${i}`, value }));
const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];

test('is registered and draws one keyed item per cell in every row', () => {
  assert.equal(RENDERERS.arrays, renderArrays);
  const svg = renderArrays({ rows: [{ name: 'a', cells: cells('a', 3, null, 5) }, { name: 'tmp', cells: cells('t', null, 4, null) }] });
  assert.deepEqual(keys(svg), ['a0', 'a2', 't1']);
  assert.match(svg, /class="layer-static"/);
  assert.match(svg, /class="layer-items"/);
  assert.equal(Number(groupFor(svg, 'a2')[2]), slotX(2));
  assert.equal(Number(groupFor(svg, 't1')[2]), slotX(1));
  assert.equal(Number(groupFor(svg, 't1')[3]) > Number(groupFor(svg, 'a0')[3]) + CELL, true);
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 3);
});

test('row 0 takes top-level highlights, other rows use hl.rows', () => {
  const rows = [{ name: 'a', cells: cells('a', 1, 2) }, { name: 'b', cells: cells('b', 1, 2) }];
  const svg = renderArrays({ rows }, { active: [0], rows: [{}, { compare: [1], done: [0] }] });
  assert.equal(groupFor(svg, 'a0')[1], 'item is-active');
  assert.equal(groupFor(svg, 'b1')[1], 'item is-compare');
  assert.equal(groupFor(svg, 'b0')[1], 'item is-done');
  assert.equal(groupFor(svg, 'a1')[1], 'item');
});

test('pointers are keyed per row, shown at index n via capacity, and keep the viewBox fixed', () => {
  const make = (pointers) => renderArrays({ capacity: 4, rows: [{ name: 'a', cells: cells('a', 1, 2, 3), pointers }] });
  const none = make({ lo: null, hi: null });
  const at = make({ lo: 0, hi: 3 });
  assert.equal(box(none), box(at));
  assert.deepEqual(keys(at), ['a0', 'a1', 'a2', 'ptr-0-lo', 'ptr-0-hi']);
  const x = (svg, name) => Number(svg.match(new RegExp(`data-key="ptr-0-${name}" style="transform:translate\\(([-\\d.]+)px`))[1]);
  const width = Number(box(at).split(' ')[2]);
  assert.equal(x(at, 'hi') < width, true);
  assert.equal(x(at, 'hi'), slotX(3) + CELL / 2);
});

test('span lane is reserved up front and a bracket spans lo..hi', () => {
  const rows = [{ name: 'a', cells: cells('a', 1, 2, 3) }];
  assert.equal(box(renderArrays({ span: null, rows })), box(renderArrays({ span: { lo: 0, hi: 1 }, rows })));
  assert.equal(box(renderArrays({ rows })) === box(renderArrays({ span: null, rows })), false);
  const svg = renderArrays({ span: { lo: 1, hi: 2 }, rows });
  assert.match(svg, new RegExp(`class="span" d="M${slotX(1)} `));
  assert.equal(Number(groupFor(svg, 'a0')[3]) >= PAD, true);
});

test('base shifts the index labels and bars mode uses the shared range', () => {
  const svg = renderArrays({ mode: 'bars', range: { low: 0, high: 10 }, rows: [{ name: 'u', base: 1, cells: cells('u', 10, 5) }] });
  assert.match(svg, /class="index"[^>]*>1<\/text>/);
  assert.match(svg, /class="viz viz-arrays is-bars"/);
  const height = (key) => Number(svg.match(new RegExp(`data-key="${key}"[^>]*><rect width="${CELL}" height="(\\d+)"`))[1]);
  assert.equal(height('u0') > height('u1'), true);
});

test('escapes names and values', () => {
  const svg = renderArrays({ rows: [{ name: '<b>', cells: [{ key: 'k"1', value: '<i>' }] }] });
  assert.equal(svg.includes('<b>'), false);
  assert.equal(svg.includes('<i>'), false);
  assert.match(svg, /data-key="k&quot;1"/);
});
