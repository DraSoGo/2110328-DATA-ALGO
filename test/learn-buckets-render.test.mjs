import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_X, NODE_H, NODE_W, ROW, nodeX, renderBuckets } from '../src/learn/render/buckets.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cell = (key, value) => ({ key, value });
const sample = (extra = {}) => ({
  buckets: [[cell('a', 14), cell('b', 7)], [], [cell('c', 9)]],
  capacity: 5,
  maxChain: 4,
  tmp: [],
  maxLoad: 1,
  ...extra,
});
const at = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const count = (svg, re) => (svg.match(re) || []).length;

test('each chain sits in its bucket row, first node nearest the bucket', () => {
  const svg = renderBuckets(sample());
  assert.equal(Number(at(svg, 'a')[2]), CHAIN_X);
  assert.equal(Number(at(svg, 'b')[2]), nodeX(1));
  assert.equal(Number(at(svg, 'c')[2]), CHAIN_X);
  assert.equal(Number(at(svg, 'c')[3]) - Number(at(svg, 'a')[3]), 2 * ROW);
  assert.equal(Number(at(svg, 'a')[3]), Number(at(svg, 'b')[3]));
  assert.match(svg, /class="viz viz-buckets"/);
  assert.equal(RENDERERS.buckets, renderBuckets);
});

test('arrows: one per node plus a ground per bucket', () => {
  const svg = renderBuckets(sample());
  assert.equal(count(svg, /marker-end/g), 3);
  assert.equal(count(svg, /class="edge ground"/g), 3);
});

test('buckets beyond the table size are spare slots without index labels', () => {
  const svg = renderBuckets(sample());
  assert.equal(count(svg, /class="slot"/g), 3);
  assert.equal(count(svg, /class="slot spare"/g), 2);
  assert.equal(count(svg, /class="index"/g), 3);
});

test('bucket highlights and key highlights become classes', () => {
  const svg = renderBuckets(sample(), { bucket: [2], active: ['a'], compare: ['b'] });
  assert.equal(count(svg, /class="slot is-active"/g), 1);
  assert.equal(at(svg, 'a')[1], 'item is-active');
  assert.equal(at(svg, 'b')[1], 'item is-compare');
});

test('tmp row sits above the buckets', () => {
  const svg = renderBuckets(sample({ tmp: [cell('t', 5)] }));
  assert.equal(Number(at(svg, 't')[3]) < Number(at(svg, 'a')[3]) - ROW + NODE_H, true);
  assert.equal(Number(at(svg, 't')[2]), CHAIN_X);
  assert.match(svg, />tmp</);
});

test('info line shows load factor', () => {
  const svg = renderBuckets(sample());
  assert.match(svg, /n = 3 +m = 3 +load factor n\/m = 1\.00/);
});

test('viewBox is constant for one capacity and grows only with it', () => {
  const small = renderBuckets(sample());
  const other = renderBuckets(sample({ buckets: [[cell('a', 1)], [], [], [], []], tmp: [cell('t', 2), cell('u', 3)] }));
  assert.equal(box(small), box(other));
  assert.notEqual(box(small), box(renderBuckets(sample({ capacity: 11 }))));
  assert.notEqual(box(small), box(renderBuckets(sample({ maxChain: 9 }))));
});

test('values and keys are escaped', () => {
  const svg = renderBuckets(sample({ buckets: [[cell('k"><x', '<i>&')]] }));
  assert.equal(svg.includes('<i>'), false);
  assert.match(svg, /&lt;i&gt;&amp;/);
  assert.equal(svg.includes('k"><x'), false);
  assert.ok(NODE_W > 0 && NODE_H > 0);
});

test('pointers: bucket index, node key and chain position, sharing a label when they coincide', () => {
  const svg = renderBuckets(sample({ pointers: { bkt: 0, val: 'b', end: { bucket: 2, at: 1 }, tmp: 'b', gone: null, lost: 'nope' } }));
  assert.equal(count(svg, /class="pointer"/g), 3);
  assert.match(svg, />bkt</);
  assert.match(svg, />↑val,tmp</);
  assert.match(svg, />↑end</);
  assert.equal(svg.includes('gone'), false);
  assert.equal(svg.includes('lost'), false);
  const keys = [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(count(renderBuckets(sample()), /class="pointer"/g), 0);
  assert.equal(box(svg), box(renderBuckets(sample())));
});
