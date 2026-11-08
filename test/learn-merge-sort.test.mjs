import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import mergeSort from '../src/learn/algo/merge-sort.js';

const sortFrames = (a) => record(mergeSort.run({ a }));
const finalValues = (frames) => frames.at(-1).state.rows[0].cells.map((cell) => cell.value);
const allCells = (state) => state.rows.flatMap((row) => row.cells.filter(Boolean));

test('sorts the default input and ends on the closing line', () => {
  const input = mergeSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, mergeSort.code.length - 1);
  assert.equal(frames.at(-1).state.rows[1].cells.every((cell) => cell === null), true);
});

test('matches Array.sort on odd sizes, duplicates, negatives and reversed input', () => {
  for (const input of [[1], [2, 1], [3, 3, 3], [5, -2, 9, -2, 0, 7, 1], [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]]) {
    assert.deepEqual(finalValues(sortFrames(input)), [...input].sort((x, y) => x - y), input.join(','));
  }
});

test('sorted input, where B runs out before C is touched, still sorts', () => {
  for (const input of [[1, 2], [-99, -62, -25, 12], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]) {
    assert.deepEqual(finalValues(sortFrames(input)), input, input.join(','));
  }
});

test('matches Array.sort on every array of length 1..6 over {0, 1, 2}', () => {
  for (let n = 1; n <= 6; n += 1) {
    for (let code = 0; code < 3 ** n; code += 1) {
      const input = Array.from({ length: n }, (_, k) => Math.floor(code / 3 ** k) % 3);
      assert.deepEqual(finalValues(sortFrames(input)), [...input].sort((x, y) => x - y), input.join(','));
    }
  }
});

test('every element lives in exactly one row at all times', () => {
  const input = [4, 1, 3, 2, 5];
  for (const frame of sortFrames(input)) {
    assert.deepEqual(allCells(frame.state).map((cell) => cell.key).sort(), input.map((_, i) => `a${i}`));
  }
});

test('recursion depth reaches ceil(log2 n) and the merge uses tmp', () => {
  const frames = sortFrames([8, 7, 6, 5, 4, 3, 2, 1]);
  const depths = frames.map((frame) => frame.vars.depth).filter((d) => d !== undefined);
  assert.equal(Math.max(...depths), 3);
  assert.equal(frames.some((frame) => frame.state.rows[1].cells.some(Boolean)), true);
});

test('merge of two sorted runs puts items in tmp in order', () => {
  const frames = sortFrames([1, 4, 2, 3]);
  const lastFill = frames.filter((frame) => frame.line === 3 && frame.vars.i === 4 && frame.vars.start === 0 && frame.vars.stop === 3).at(0);
  assert.deepEqual(lastFill.state.rows[1].cells.map((cell) => cell.value), [1, 2, 3, 4]);
});

test('worst case stays well under the frame limit', () => {
  assert.equal(sortFrames([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]).length < 2000, true);
  assert.equal(sortFrames([6, 12, 5, 11, 4, 10, 3, 9, 2, 8, 1, 7]).length < 2000, true);
});

test('pointer at index n (end of C) stays inside the canvas', () => {
  const frames = sortFrames([2, 1]);
  assert.equal(frames[0].state.capacity, 3);
});
