import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import selectionSort from '../src/learn/algo/selection-sort.js';

const sortFrames = (a) => record(selectionSort.run({ a }));
const finalValues = (frames) => frames.at(-1).state.cells.map((cell) => cell.value);

test('sorts the default input and ends on the closing line', () => {
  const input = selectionSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, selectionSort.code.length - 1);
  assert.deepEqual(frames.at(-1).hl.done, input.map((_, i) => i));
});

test('matches Array.sort on varied inputs, including duplicates and negatives', () => {
  for (const input of [[1], [2, 1], [3, 3, 3], [5, -2, 9, -2, 0, 7], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2]]) {
    assert.deepEqual(finalValues(sortFrames(input)), [...input].sort((x, y) => x - y), input.join(','));
  }
});

test('makes exactly n-1 swaps and n(n+1)/2-1 comparisons whatever the input', () => {
  for (const input of [[1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [2, 5, 1, 4, 3]]) {
    const frames = sortFrames(input);
    const n = input.length;
    assert.equal(frames.filter((frame) => frame.line === 9).length, n - 1);
    assert.equal(frames.filter((frame) => frame.line === 5).length, (n * (n + 1)) / 2 - 1);
  }
});

test('after each swap the maximum of the unsorted part sits at pos', () => {
  const frames = sortFrames([4, 9, 2, 7]);
  const swaps = frames.filter((frame) => frame.line === 9);
  assert.deepEqual(swaps.map((frame) => frame.state.cells[frame.vars.pos].value), [9, 7, 4]);
});

test('keeps every key exactly once', () => {
  for (const frame of sortFrames([3, 1, 2, 5])) {
    assert.deepEqual(frame.state.cells.map((cell) => cell.key).sort(), ['a0', 'a1', 'a2', 'a3']);
  }
});

test('worst case stays well under the frame limit', () => {
  const frames = sortFrames([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.equal(frames.length < 2000, true);
});
