import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import quickSort from '../src/learn/algo/quick-sort.js';

const sortFrames = (a) => record(quickSort.run({ a }));
const values = (state) => state.rows[0].cells.map((cell) => cell.value);
const finalValues = (frames) => values(frames.at(-1).state);

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('sorts the default input and ends on the closing line', () => {
  const input = quickSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, quickSort.code.length - 1);
});

test('matches Array.sort on seeded random inputs of every length', () => {
  const rand = seeded(7);
  for (let length = 1; length <= 12; length += 1) {
    for (let trial = 0; trial < 8; trial += 1) {
      const input = Array.from({ length }, () => Math.floor(rand() * 9) - 3);
      assert.deepEqual(finalValues(sortFrames(input)), [...input].sort((x, y) => x - y), input.join(','));
    }
  }
});

test('each partition separates <= pivot from >= pivot at the returned index', () => {
  const frames = sortFrames([4, 2, 8, 7, 3, 1, 5, 9, 8]);
  const returns = frames.filter((frame) => frame.line === 8);
  assert.equal(returns.length > 0, true);
  for (const frame of returns) {
    const { start, stop, pivot, p } = frame.vars;
    const a = values(frame.state);
    assert.equal(a.slice(start, p + 1).every((x) => x <= pivot), true);
    assert.equal(a.slice(p + 1, stop + 1).every((x) => x >= pivot), true);
    assert.equal(p >= start && p < stop, true);
  }
});

test('pivot is A[start] of the range, as in the slides', () => {
  const frames = sortFrames([6, 5, 4, 3]);
  const first = frames.find((frame) => frame.line === 1);
  assert.equal(first.vars.pivot, 6);
  assert.equal(first.vars.start, 0);
});

test('pointers can sit at -1 and at n, and the canvas reserves slot n', () => {
  const frames = sortFrames([3, 1, 2]);
  assert.equal(frames[0].state.capacity, 4);
  assert.equal(frames.some((frame) => frame.state.rows[0].pointers.left === -1), true);
  assert.equal(frames.some((frame) => frame.state.rows[0].pointers.right === 3), true);
});

test('keeps every key exactly once', () => {
  for (const frame of sortFrames([3, 1, 2, 5, 4])) {
    assert.deepEqual(frame.state.rows[0].cells.map((cell) => cell.key).sort(), ['a0', 'a1', 'a2', 'a3', 'a4']);
  }
});

test('worst cases (sorted, reversed, all equal) stay under the frame limit', () => {
  const sorted = Array.from({ length: 12 }, (_, i) => i);
  for (const input of [sorted, [...sorted].reverse(), Array(12).fill(5)]) {
    const frames = sortFrames(input);
    assert.equal(frames.length < 2000, true);
    assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  }
});
