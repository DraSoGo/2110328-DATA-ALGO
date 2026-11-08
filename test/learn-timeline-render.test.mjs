import test from 'node:test';
import assert from 'node:assert/strict';
import { BAR_H, LABEL_W, PLOT_W, renderTimeline, xFor } from '../src/learn/render/timeline.js';
import { RENDERERS } from '../src/learn/render/index.js';

const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"><rect width="([-\\d.]+)" height="${BAR_H}"`));
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const base = (bars, extra = {}) => ({ max: 10, rows: ['A', 'B'], labelAt: 'in', bars, ...extra });

test('is registered; bars sit at x(from) with width proportional to length', () => {
  assert.equal(RENDERERS.timeline, renderTimeline);
  const svg = renderTimeline(base([{ key: 'b0', row: 0, from: 0, to: 5, text: 'A' }, { key: 'b1', row: 1, from: 5, to: 10 }]));
  assert.deepEqual(keys(svg), ['b0', 'b1']);
  assert.equal(Number(groupFor(svg, 'b0')[2]), LABEL_W);
  assert.equal(Number(groupFor(svg, 'b0')[4]), PLOT_W / 2);
  assert.equal(Number(groupFor(svg, 'b1')[2]), xFor(5, 10));
  assert.equal(Number(groupFor(svg, 'b1')[3]) > Number(groupFor(svg, 'b0')[3]), true);
  assert.match(svg, /class="layer-static"/);
});

test('highlights index into bars', () => {
  const svg = renderTimeline(base([{ key: 'x', row: 0, from: 0, to: 1 }, { key: 'y', row: 1, from: 0, to: 2 }]), { done: [0], compare: [1] });
  assert.equal(groupFor(svg, 'x')[1], 'item is-done');
  assert.equal(groupFor(svg, 'y')[1], 'item is-compare');
});

test('viewBox depends on rows and the mark lane, never on bar values', () => {
  const a = renderTimeline(base([{ key: 'x', row: 0, from: 0, to: 1 }], { mark: null }));
  const b = renderTimeline(base([{ key: 'x', row: 1, from: 3, to: 9 }], { mark: { at: 4, text: 'f = 4' } }));
  assert.equal(box(a), box(b));
  assert.equal(box(renderTimeline(base([]))) === box(a), false);
  assert.match(b, /class="mark"/);
  assert.match(b, />f = 4<\/text>/);
});

test('end labels sit after the bar, in labels at its left edge', () => {
  const bar = [{ key: 'x', row: 0, from: 0, to: 5, text: '42' }];
  assert.match(renderTimeline(base(bar, { labelAt: 'end' })), new RegExp(`<text x="${PLOT_W / 2 + 6}" `));
  assert.match(renderTimeline(base(bar)), /<text x="8" /);
});

test('ticks are every unit for small axes and thinned for large ones', () => {
  const ticks = (max) => (renderTimeline({ max, rows: ['r'], bars: [] }).match(/class="tick"/g) || []).length;
  assert.equal(ticks(10), 11);
  assert.equal(ticks(4096) < 12, true);
});

test('escapes labels and text', () => {
  const svg = renderTimeline({ max: 3, rows: ['<r>'], bars: [{ key: 'k', row: 0, from: 0, to: 1, text: '<t>' }] });
  assert.equal(svg.includes('<r>') || svg.includes('<t>'), false);
});
