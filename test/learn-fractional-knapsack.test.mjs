import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import knapsack from '../src/learn/algo/fractional-knapsack.js';

const run = (v, w, W) => record(knapsack.run({ v, w, W }));
const last = (frames) => frames.at(-1);

// Independent computation: split every item into w unit slices worth v/w each and
// take the W most valuable slices.
function direct(v, w, W) {
  const slices = v.flatMap((value, i) => Array(w[i]).fill(value / w[i]));
  slices.sort((a, b) => b - a);
  return slices.slice(0, W).reduce((sum, x) => sum + x, 0);
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('slide example: W = 100 gives 164, taking #1, #2, #3 whole and 40/50... of the rest', () => {
  const [v, w] = [[66, 20, 30, 60, 40], [30, 10, 20, 50, 40]];
  const frames = run(v, w, 100);
  assert.equal(last(frames).vars.result, 164);
  const takes = last(frames).state.bars.filter((bar) => bar.key.startsWith('take')).map((bar) => [bar.key, bar.to]);
  assert.deepEqual(takes, [['take0', 30], ['take1', 10], ['take2', 20], ['take3', 40]]);
});

test('matches the unit-slice computation on seeded random instances', () => {
  const rand = seeded(9);
  for (let trial = 0; trial < 100; trial += 1) {
    const n = 1 + Math.floor(rand() * 8);
    const v = Array.from({ length: n }, () => 1 + Math.floor(rand() * 60));
    const w = Array.from({ length: n }, () => 1 + Math.floor(rand() * 30));
    const W = 1 + Math.floor(rand() * 120);
    const got = last(run(v, w, W)).vars.result;
    assert.equal(Math.abs(got - direct(v, w, W)) <= 0.0051, true, `v=${v} w=${w} W=${W}: ${got} vs ${direct(v, w, W)}`);
  }
});

test('items are taken in decreasing value per weight and the bag never overflows', () => {
  const frames = run([10, 30, 20], [5, 10, 5], 12);
  const frame = last(frames);
  const ratios = frame.vars.order.map((id) => [10, 30, 20][id - 1] / [5, 10, 5][id - 1]);
  assert.deepEqual(ratios, [4, 3, 2]);
  const bag = frame.state.bars.filter((bar) => bar.key.startsWith('bag'));
  assert.equal(Math.max(...bag.map((bar) => bar.to)), 12);
  assert.equal(frame.vars.sumW, 12);
});

test('capacity larger than all items takes everything; the loop ends normally', () => {
  const frames = run([5, 6], [2, 3], 50);
  assert.equal(last(frames).vars.result, 11);
  assert.equal(frames.some((frame) => /every item has been considered/.test(frame.msg)), true);
});

test('a bag that fills exactly stops early', () => {
  const frames = run([8, 1, 1], [4, 1, 1], 4);
  assert.equal(last(frames).vars.result, 8);
  assert.equal(frames.some((frame) => /bag is full/.test(frame.msg)), true);
  assert.equal(last(frames).state.bars.filter((bar) => bar.key.startsWith('take')).length, 1);
});

test('the viewBox inputs stay fixed: rows count constant, axis covers W and the heaviest item', () => {
  const frames = run([1, 2], [90, 3], 10);
  assert.equal(new Set(frames.map((frame) => frame.state.rows.length)).size, 1);
  assert.equal(frames[0].state.max, 90);
  assert.equal(frames[0].state.rows.length, 3);
});

test('ends on the closing line and stays small', () => {
  const frames = run([1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1], 99);
  assert.equal(last(frames).line, knapsack.code.length - 1);
  assert.equal(frames.length < 200, true);
});
