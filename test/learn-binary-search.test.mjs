import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import binarySearch from '../src/learn/algo/binary-search.js';

const search = (a, k) => record(binarySearch.run({ a, k }));
const result = (frames) => frames.at(-1).vars.result;

test('returns the first index of k, matching indexOf on sorted input', () => {
  const inputs = [[1], [1, 2], [1, 2, 4, 5, 6, 6, 6, 10], [3, 3, 3, 3], [-5, -2, 0, 0, 7, 9, 9, 12, 30, 31, 50, 99]];
  for (const a of inputs) {
    for (let k = Math.min(...a) - 2; k <= Math.max(...a) + 2; k += 1) {
      assert.equal(result(search(a, k)), a.indexOf(k), `${a.join(',')} k=${k}`);
    }
  }
});

test('the slide examples: found, first of duplicates, missing', () => {
  assert.equal(result(search([1, 2, 4, 5, 6, 7, 8, 10], 4)), 2);
  assert.equal(result(search([1, 2, 4, 5, 6, 6, 6, 10], 6)), 4);
  assert.equal(result(search([1, 2, 4, 5, 6, 6, 6, 10], 100)), -1);
});

test('sorts an unsorted list first and searches that', () => {
  const frames = search([9, 1, 5, 3], 5);
  assert.deepEqual(frames[0].state.cells.map((cell) => cell.value), [1, 3, 5, 9]);
  assert.equal(result(frames), 2);
});

test('hi reaches n and the canvas reserves that slot', () => {
  const frames = search([1, 2, 3], 9);
  assert.equal(frames[0].state.capacity, 4);
  assert.equal(frames.some((frame) => frame.state.pointers.hi === 3), true);
  assert.equal(frames.some((frame) => frame.state.pointers.lo === 3), true);
  assert.equal(result(frames), -1);
});

test('lo < hi window shrinks and mid stays inside it', () => {
  const frames = search([1, 3, 5, 7, 9, 11, 13, 15], 11);
  for (const frame of frames.filter((f) => f.line === 3)) {
    assert.equal(frame.vars.mid >= frame.vars.lo && frame.vars.mid < frame.vars.hi, true);
  }
  const widths = frames.filter((f) => f.line === 2 && f.vars.lo < f.vars.hi).map((f) => f.vars.hi - f.vars.lo);
  assert.equal(widths[0], 8);
  for (let i = 1; i < widths.length; i += 1) assert.equal(widths[i] <= Math.floor(widths[i - 1] / 2), true);
  assert.equal(widths.length <= 4, true);
});

test('ends on the closing line, stays small, keeps keys unique', () => {
  const frames = search(Array.from({ length: 12 }, (_, i) => i * 2), 7);
  assert.equal(frames.at(-1).line, binarySearch.code.length - 1);
  assert.equal(frames.length < 100, true);
  assert.equal(new Set(frames[0].state.cells.map((cell) => cell.key)).size, 12);
});
