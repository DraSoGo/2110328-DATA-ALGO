import test from 'node:test';
import assert from 'node:assert/strict';
import { COL_H, renderColumn, slotY } from '../src/learn/render/column.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (...values) => values.map((value, i) => ({ key: `k${i}`, value }));
const place = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));

test('index 0 is the bottom slot and higher indexes sit above it', () => {
  const svg = renderColumn({ cells: cells(10, 20, 30), capacity: 4 });
  assert.equal(Number(place(svg, 'k0')[3]) > Number(place(svg, 'k1')[3]), true);
  assert.equal(Number(place(svg, 'k2')[3]), slotY(2, 4));
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 1);
  assert.match(svg, /class="viz viz-column"/);
});

test('pointers sit beside their slot, and index -1 uses the reserved row', () => {
  const full = renderColumn({ cells: cells(1, 2), pointers: { top: 1 } });
  const empty = renderColumn({ cells: [], capacity: 2, pointers: { top: -1 } });
  const y = (svg) => Number(svg.match(/data-key="ptr-top" style="transform:translate\(([-\d.]+)px,([-\d.]+)px\)/)[2]);
  assert.equal(y(full), slotY(1, 2) + COL_H / 2 + 4);
  assert.equal(y(empty), slotY(-1, 2) + COL_H / 2 + 4);
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  assert.equal(box(full), box(empty));
});

test('highlights become classes and the registry exposes the renderer', () => {
  const svg = renderColumn({ cells: cells(1, 2) }, { active: [1] });
  assert.equal(place(svg, 'k1')[1], 'item is-active');
  assert.equal(RENDERERS.column, renderColumn);
});
