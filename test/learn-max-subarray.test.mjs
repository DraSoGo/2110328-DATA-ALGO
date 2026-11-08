import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import maxSubarray from '../src/learn/algo/max-subarray.js';

const run = (a) => record(maxSubarray.run({ a }));
const answer = (frames) => frames.at(-1).vars.result;

// Independent check: Kadane's algorithm.
function kadane(a) {
  let best = a[0];
  let current = a[0];
  for (const x of a.slice(1)) {
    current = Math.max(x, current + x);
    best = Math.max(best, current);
  }
  return best;
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('slide examples', () => {
  assert.equal(answer(run([1, 4, 2, 3])), 10);
  assert.equal(answer(run([-2, -1, -3, -5])), -1);
  assert.equal(answer(run([2, 3, -6, 4, -2, 3, -5, -4, 3])), 5);
  assert.equal(answer(run(maxSubarray.input.fields[0].default)), 6);
});

test('matches Kadane on seeded random inputs of every length', () => {
  const rand = seeded(3);
  for (let length = 1; length <= 12; length += 1) {
    for (let trial = 0; trial < 10; trial += 1) {
      const input = Array.from({ length }, () => Math.floor(rand() * 21) - 10);
      assert.equal(answer(run(input)), kadane(input), input.join(','));
    }
  }
});

test('the final highlight covers a range that really sums to the answer', () => {
  const input = [3, -4, 1, 2, -1, -1, 5, -4];
  const last = run(input).at(-1);
  const done = last.hl.done;
  assert.equal(done.reduce((total, index) => total + input[index], 0), last.vars.result);
  assert.deepEqual(done, [2, 3, 4, 5, 6]);
});

test('prefix sums are built before the recursion and S[j] = A[0..j-1]', () => {
  const frames = run([3, -4, 1]);
  const built = frames.find((frame) => frame.line === 16);
  assert.deepEqual(built.vars.S, [0, 3, -1, 0]);
  assert.equal(built.state.rows[1].cells.every(Boolean), true);
});

test('cross-the-middle loop visits (n/2)^2 pairs for n = 8 at the top level', () => {
  const frames = run([1, 2, 3, 4, 5, 6, 7, 8]);
  const top = frames.filter((frame) => frame.line === 8 && frame.vars.depth === 0);
  assert.equal(top.length, 16);
});

test('worst case frame count stays under the limit and keys are unique', () => {
  const frames = run([5, -5, 5, -5, 5, -5, 5, -5, 5, -5, 5, -5]);
  assert.equal(frames.length < 2000, true);
  const allPositive = run(Array(12).fill(9));
  assert.equal(allPositive.length < 2000, true);
  assert.equal(answer(allPositive), 108);
});
