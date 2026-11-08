import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import complexity from '../src/learn/algo/complexity.js';
import { RENDERERS } from '../src/learn/render/index.js';

const run = (N) => record(complexity.run({ N }));
const counts = (frame) => frame.state.bars.map((bar) => bar.to);
const formulas = (n) => [1, Math.floor(Math.log2(n)), n, n * Math.floor(Math.log2(n)), n * n, 2 ** n];

test('the final bars equal the closed-form counts for every N', () => {
  for (let N = 1; N <= 12; N += 1) {
    assert.deepEqual(counts(run(N).at(-1)), formulas(N), `N=${N}`);
  }
});

test('steps advance n from 1 to N, six programs per n', () => {
  const frames = run(5);
  const ns = frames.filter((frame) => frame.line === 1 && !frame.msg.includes('not')).map((frame) => frame.vars.n);
  assert.deepEqual(ns, [1, 2, 3, 4, 5]);
  const atN3 = frames.filter((frame) => frame.vars.n === 3 && frame.hl.active);
  assert.equal(atN3.length, 6);
  assert.deepEqual(counts(atN3.at(-1)), formulas(3));
});

test('growth order at n = 12: 1 < log n < n < n log n < n² < 2^n', () => {
  const final = counts(run(12).at(-1));
  assert.deepEqual(final, [1, 3, 12, 36, 144, 4096]);
  for (let k = 1; k < final.length; k += 1) assert.equal(final[k] > final[k - 1], true);
  assert.deepEqual(run(12).at(-1).hl.done, [0, 1, 2, 3, 4, 5]);
});

test('the axis is fixed from the input N and bars never exceed it', () => {
  const frames = run(8);
  assert.equal(new Set(frames.map((frame) => frame.state.max)).size, 1);
  assert.equal(frames[0].state.max, 256);
  for (const frame of frames) assert.equal(Math.max(...counts(frame)) <= frames[0].state.max, true);
});

test('bar text is the exact count and the viewBox never changes during a run', () => {
  const frames = run(6);
  const boxes = new Set(frames.map((frame) => RENDERERS.timeline(frame.state, frame.hl).match(/viewBox="([^"]+)"/)[1]));
  assert.equal(boxes.size, 1);
  assert.deepEqual(frames.at(-1).state.bars.map((bar) => bar.text), formulas(6).map(String));
});

test('N = 12 stays far under the frame limit and ends on the closing line', () => {
  const frames = run(12);
  assert.equal(frames.length < 200, true);
  assert.equal(frames.at(-1).line, complexity.code.length - 1);
});

test('input field limits N to 12', () => {
  const field = complexity.input.fields[0];
  assert.equal(field.max, 12);
  assert.equal(field.min, 1);
});
