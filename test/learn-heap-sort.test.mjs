import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import heapSort from '../src/learn/algo/heap-sort.js';

const sortFrames = (a) => record(heapSort.run({ a }));
const values = (frame) => frame.state.cells.map((cell) => cell.value);

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('sorts the default input and ends on the closing line', () => {
  const input = heapSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(values(frames.at(-1)), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, heapSort.code.length - 1);
});

test('matches Array.sort on seeded random inputs of every length', () => {
  const rand = seeded(11);
  for (let length = 1; length <= 12; length += 1) {
    for (let trial = 0; trial < 6; trial += 1) {
      const input = Array.from({ length }, () => Math.floor(rand() * 12) - 4);
      assert.deepEqual(values(sortFrames(input).at(-1)), [...input].sort((x, y) => x - y), input.join(','));
    }
  }
});

test('after building, A[0..n-1] is a max-heap with the 0-based child formulas', () => {
  const frames = sortFrames([3, 9, 2, 8, 1, 7, 5]);
  const built = frames.find((frame) => frame.line === 11 && frame.vars.k === -1);
  const a = values(built);
  for (let i = 0; i < a.length; i += 1) {
    for (const child of [2 * i + 1, 2 * i + 2]) if (child < a.length) assert.equal(a[i] >= a[child], true, `A[${i}] >= A[${child}]`);
  }
  assert.equal(a[0], 9);
});

test('each pop moves the current maximum to the end of the heap', () => {
  const frames = sortFrames([4, 10, 3, 5, 1]);
  const pops = frames.filter((frame) => frame.line === 13).map((frame) => values(frame)[frame.vars.k]);
  assert.deepEqual(pops, [10, 5, 4, 3]);
});

test('keeps every key exactly once and reserves slot n for the size pointer', () => {
  const frames = sortFrames([2, 7, 1, 8]);
  assert.equal(frames[0].state.capacity, 5);
  assert.equal(frames[0].state.pointers.size, 4);
  for (const frame of frames) assert.deepEqual(frame.state.cells.map((cell) => cell.key).sort(), ['a0', 'a1', 'a2', 'a3']);
});

test('worst cases stay under the frame limit', () => {
  const up = Array.from({ length: 12 }, (_, i) => i);
  for (const input of [up, [...up].reverse(), Array(12).fill(0)]) assert.equal(sortFrames(input).length < 2000, true);
});
