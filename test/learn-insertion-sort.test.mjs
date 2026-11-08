import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import insertionSort from '../src/learn/algo/insertion-sort.js';

const sortFrames = (a) => record(insertionSort.run({ a }));
const finalValues = (frames) => frames.at(-1).state.cells.map((cell) => cell.value);
const inversions = (a) => a.reduce((total, x, i) => total + a.slice(i + 1).filter((y) => y < x).length, 0);

test('sorts the default input and ends on the closing line', () => {
  const input = insertionSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, insertionSort.code.length - 1);
  assert.equal(frames.at(-1).state.lifted, null);
  assert.deepEqual(frames.at(-1).hl.done, input.map((_, i) => i));
});

test('keeps every element key exactly once', () => {
  const frames = sortFrames([3, 1, 2]);
  for (const frame of frames) {
    const present = [...frame.state.cells.filter(Boolean), frame.state.lifted].filter(Boolean).map((cell) => cell.key).sort();
    assert.deepEqual(present, ['a0', 'a1', 'a2']);
  }
});

test('one shift line per inversion', () => {
  for (const input of [[5, 2, 4, 6, 1, 3], [1, 2, 3], [3, 2, 1], [2, 2, 1, -5, 0]]) {
    const shifts = sortFrames(input).filter((frame) => frame.line === 5).length;
    assert.equal(shifts, inversions(input), input.join(','));
  }
});

test('handles duplicates, negatives, and a single element', () => {
  assert.deepEqual(finalValues(sortFrames([2, -1, 2, 0])), [-1, 0, 2, 2]);
  const single = sortFrames([7]);
  assert.deepEqual(finalValues(single), [7]);
  assert.equal(single.at(-1).line, insertionSort.code.length - 1);
});

test('frames expose key and j, and j can reach -1', () => {
  const frames = sortFrames([2, 1]);
  const lift = frames.find((frame) => frame.line === 2);
  assert.equal(lift.vars.key, 1);
  assert.equal(lift.state.lifted.value, 1);
  assert.equal(frames.some((frame) => frame.state.pointers.j === -1), true);
});

test('every frame points at a real code line and uses bars', () => {
  const frames = sortFrames([4, 3, 2, 1]);
  for (const frame of frames) {
    assert.equal(Number.isInteger(frame.line) && frame.line >= 0 && frame.line < insertionSort.code.length, true);
    assert.equal(frame.state.mode, 'bars');
  }
});
