import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, GAP, PAD, HEAD_H, cellKey, pos, renderTable } from '../src/learn/render/table.js';
import { RENDERERS } from '../src/learn/render/index.js';

const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1];

test('registered as table', () => {
  assert.equal(RENDERERS.table, renderTable);
});

test('2D grid places keyed cells at their row and column', () => {
  const svg = renderTable({ cells: [[1, 2, 3], [4, 5, 6]] });
  assert.match(svg, /^<svg class="viz viz-table" xmlns/);
  assert.deepEqual(keys(svg), ['c-0-0', 'c-0-1', 'c-0-2', 'c-1-0', 'c-1-1', 'c-1-2']);
  const cell = groupFor(svg, cellKey(1, 2));
  assert.equal(Number(cell[2]), PAD + 2 * (CELL + GAP));
  assert.equal(Number(cell[3]), PAD + 1 * (CELL + GAP));
  assert.match(svg, />6<\/text>/);
  assert.match(svg, /class="layer-static"/);
  assert.match(svg, /class="layer-items"/);
});

test('flat array is one row; null cells are dashed slots without items', () => {
  const svg = renderTable({ cells: [0, 1, null, null] });
  assert.deepEqual(keys(svg), ['c-0-0', 'c-0-1']);
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 2);
});

test('headers are drawn, shift the grid, and are escaped', () => {
  const plain = renderTable({ cells: [[1]] });
  const svg = renderTable({ cells: [[1]], rowHeaders: ['<b>&'], colHeaders: ['"x"'] });
  assert.match(svg, /&lt;b&gt;&amp;/);
  assert.match(svg, /&quot;x&quot;/);
  assert.doesNotMatch(svg, /<b>/);
  assert.equal(Number(groupFor(svg, 'c-0-0')[3]), PAD + HEAD_H);
  assert.equal(Number(groupFor(svg, 'c-0-0')[2]) > Number(groupFor(plain, 'c-0-0')[2]), true);
});

test('hl lists map to cell classes', () => {
  const hl = { active: [pos(0, 0)], compare: [pos(0, 1)], done: [pos(1, 0)], path: [pos(1, 1)], shaded: [pos(0, 0)] };
  const svg = renderTable({ cells: [[1, 2], [3, 4]] }, hl);
  assert.match(groupFor(svg, 'c-0-0')[1], /is-active/);
  assert.match(groupFor(svg, 'c-0-0')[1], /is-shaded/);
  assert.match(groupFor(svg, 'c-0-1')[1], /is-compare/);
  assert.match(groupFor(svg, 'c-1-0')[1], /is-done/);
  assert.match(groupFor(svg, 'c-1-1')[1], /is-path/);
});

test('arrows are keyed items and do not change the viewBox', () => {
  const state = { cells: [[1, 2], [3, null]] };
  const plain = renderTable(state);
  const svg = renderTable(state, { arrows: [['0-1', '1-1'], ['1-0', '1-1']] });
  assert.deepEqual(keys(svg).filter((key) => key.startsWith('arrow-')), ['arrow-0', 'arrow-1']);
  assert.equal(viewBox(svg), viewBox(plain));
});

test('viewBox depends on the table size and headers, not on cell values or highlights', () => {
  const full = renderTable({ cells: [[1, 2, 3], [4, 5, 6]], rowHeaders: ['a', 'b'], colHeaders: [1, 2, 3], caption: 'x' }, { active: ['0-0'] });
  const empty = renderTable({ cells: [[null, null, null], [null, null, null]], rowHeaders: ['a', 'b'], colHeaders: [1, 2, 3], caption: '' });
  assert.equal(viewBox(full), viewBox(empty));
  assert.notEqual(viewBox(full), viewBox(renderTable({ cells: [[1, 2, 3], [4, 5, 6]], rowHeaders: ['a', 'b'], colHeaders: [1, 2, 3] })));
});

test('a declared caption reserves width and longer captions are squeezed into it', () => {
  const short = renderTable({ cells: [[1]], caption: '' });
  const width = Number(viewBox(short).split(' ')[2]);
  assert.ok(width >= 16 * 2 + 40 * 7.9, `caption room ${width}`);
  assert.doesNotMatch(renderTable({ cells: [[1]], caption: 'Take items 2, 4: weight 8 <= 8, price 10' }), /textLength/);
  const long = renderTable({ cells: [[1]], caption: 'x'.repeat(80) });
  assert.equal(viewBox(long), viewBox(short));
  assert.match(long, new RegExp(`textLength="${width - 32}" lengthAdjust="spacingAndGlyphs"`));
});

test('caption is escaped', () => {
  assert.match(renderTable({ cells: [[1]], caption: '<i>' }), /&lt;i&gt;<\/text>/);
});

test('board mode draws every square as a cell with a checker class', () => {
  const svg = renderTable({ board: true, cells: [['', '♛'], ['', '']] }, { shaded: ['1-1'] });
  assert.equal(keys(svg).length, 4);
  assert.match(svg, /viz-table is-board/);
  assert.match(groupFor(svg, 'c-0-0')[1], /is-light/);
  assert.match(groupFor(svg, 'c-0-1')[1], /is-dark/);
  assert.match(groupFor(svg, 'c-1-1')[1], /is-shaded/);
  assert.equal((svg.match(/class="slot/g) || []).length, 0);
  assert.match(svg, />♛<\/text>/);
});
