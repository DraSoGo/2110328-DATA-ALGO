import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { parseField } from '../src/learn/engine/input.js';
import knapsack from '../src/learn/algo/knapsack.js';

function bruteForce(w, p, W) {
  let best = 0;
  for (let mask = 0; mask < 1 << w.length; mask += 1) {
    let weight = 0;
    let price = 0;
    w.forEach((wi, k) => { if (mask & (1 << k)) { weight += wi; price += p[k]; } });
    if (weight <= W) best = Math.max(best, price);
  }
  return best;
}
const frames = (w, p, W) => record(knapsack.run({ w, p, W }));

// Fixed-seed generator so the cases are reproducible.
function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('optimum equals brute force over all subsets, and the chosen items achieve it', () => {
  const next = rng(7);
  const cases = [[[2, 3, 4, 5], [3, 4, 5, 6], 8], [[12], [20], 12], [[12], [20], 5], [[1, 1, 1, 1, 1, 1], [1, 2, 3, 4, 5, 6], 3]];
  for (let k = 0; k < 40; k += 1) {
    const n = 1 + Math.floor(next() * 6);
    cases.push([Array.from({ length: n }, () => 1 + Math.floor(next() * 12)), Array.from({ length: n }, () => 1 + Math.floor(next() * 20)), 1 + Math.floor(next() * 12)]);
  }
  for (const [w, p, W] of cases) {
    const last = frames(w, p, W).at(-1);
    const best = bruteForce(w, p, W);
    assert.equal(last.vars.best, best, `${w}|${p}|${W}`);
    assert.equal(last.state.cells[w.length][W], best);
    const taken = last.vars.taken;
    assert.equal(new Set(taken).size, taken.length);
    assert.ok(taken.reduce((sum, a) => sum + w[a - 1], 0) <= W);
    assert.equal(taken.reduce((sum, a) => sum + p[a - 1], 0), best);
    assert.equal(last.line, knapsack.code.length - 1);
  }
});

test('known small instance', () => {
  // w = 2,3,4,5 p = 3,4,5,6, W = 8: take items 2 and 4 (w 8, p 10).
  const last = frames([2, 3, 4, 5], [3, 4, 5, 6], 8).at(-1);
  assert.equal(last.vars.best, 10);
  assert.deepEqual(last.vars.taken, [2, 4]);
});

test('row 0 and column 0 are zeros, and an item that does not fit copies the cell above', () => {
  const all = frames([5], [9], 4);
  const last = all.at(-1);
  assert.deepEqual(last.state.cells[0], [0, 0, 0, 0, 0]);
  assert.deepEqual(last.state.cells[1], [0, 0, 0, 0, 0]);
  const skip = all.find((frame) => frame.msg.includes('does not fit'));
  assert.equal(skip.hl.arrows.length, 1);
});

test('taking an item reads the cell above and the cell w[a] to the left in the row above', () => {
  const step = frames([2], [7], 5).find((frame) => frame.msg.startsWith('Skip item 1') && frame.hl.active[0] === '1-4');
  assert.deepEqual(step.hl.compare, ['0-4', '0-2']);
});

test('trace back path starts at the corner and ends in row 0; row headers name the items', () => {
  const last = frames([2, 3, 4, 5], [3, 4, 5, 6], 8).at(-1);
  assert.equal(last.hl.path[0], '4-8');
  assert.equal(last.hl.path.at(-1).split('-')[0], '0');
  assert.deepEqual(last.state.rowHeaders, ['no items', '#1 w2 p3', '#2 w3 p4', '#3 w4 p5', '#4 w5 p6']);
});

test('mismatched list lengths pair only the common items', () => {
  const first = frames([2, 3, 4], [5], 6)[0];
  assert.match(first.msg, /first 1/);
  assert.equal(first.state.cells.length, 2);
});

test('worst case stays under 2000 frames; list and capacity limits are enforced', () => {
  assert.ok(frames([1, 1, 1, 1, 1, 1], [20, 20, 20, 20, 20, 20], 12).length < 2000);
  const [wField, pField, capField] = knapsack.input.fields;
  assert.ok(parseField(wField, '1 2 3 4 5 6 7', {}).error);
  assert.ok(parseField(wField, '0', {}).error);
  assert.ok(parseField(wField, '13', {}).error);
  assert.ok(parseField(pField, '21', {}).error);
  assert.ok(parseField(capField, '13', {}).error);
  assert.deepEqual(parseField(wField, '2, 3', {}), { value: [2, 3] });
});
