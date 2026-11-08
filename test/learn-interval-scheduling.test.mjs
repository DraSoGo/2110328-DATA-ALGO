import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import intervalScheduling from '../src/learn/algo/interval-scheduling.js';

const run = (s, f) => record(intervalScheduling.run({ s, f }));
const last = (frames) => frames.at(-1);

// Independent optimum: try every subset, keep those with no overlapping pair.
function optimum(s, f) {
  const n = Math.min(s.length, f.length);
  const end = (i) => Math.max(f[i], s[i] + 1);
  let best = 0;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    const ids = [...Array(n).keys()].filter((i) => mask & (1 << i));
    const ok = ids.every((a, x) => ids.slice(x + 1).every((b) => s[a] >= end(b) || s[b] >= end(a)));
    if (ok) best = Math.max(best, ids.length);
  }
  return best;
}

function seeded(seed) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

test('default instance selects activities #1, #4 and #8', () => {
  const [{ default: s }, { default: f }] = intervalScheduling.input.fields;
  const frames = run(s, f);
  assert.deepEqual(last(frames).vars.S, [1, 4, 8]);
  assert.equal(last(frames).vars.size, optimum(s, f));
});

test('greedy size equals the brute-force optimum on seeded random instances', () => {
  const rand = seeded(5);
  for (let trial = 0; trial < 120; trial += 1) {
    const n = 1 + Math.floor(rand() * 8);
    const s = Array.from({ length: n }, () => Math.floor(rand() * 12));
    const f = s.map((start) => start + 1 + Math.floor(rand() * 8));
    assert.equal(last(run(s, f)).vars.size, optimum(s, f), `s=${s} f=${f}`);
  }
});

test('chosen activities never overlap and are taken in finish order', () => {
  const s = [1, 3, 0, 5, 3, 5, 6, 8];
  const f = [4, 5, 6, 7, 9, 9, 10, 11];
  const chosen = last(run(s, f)).vars.S.map((id) => id - 1);
  for (let k = 1; k < chosen.length; k += 1) {
    assert.equal(s[chosen[k]] >= f[chosen[k - 1]], true);
    assert.equal(f[chosen[k]] >= f[chosen[k - 1]], true);
  }
});

test('touching activities are compatible (s >= f), overlapping ones are not', () => {
  assert.equal(last(run([0, 2], [2, 4])).vars.size, 2);
  assert.equal(last(run([0, 1], [2, 3])).vars.size, 1);
});

test('sorting moves bars to new rows without changing keys; mark follows the last finish', () => {
  const frames = run([5, 0], [8, 3]);
  const keysOf = (frame) => frame.state.bars.map((bar) => bar.key).sort();
  assert.deepEqual(keysOf(frames[0]), keysOf(last(frames)));
  assert.deepEqual(frames[0].state.bars.map((bar) => bar.row), [0, 1]);
  const sorted = frames.find((frame) => frame.line === 2);
  assert.deepEqual(sorted.state.bars.map((bar) => bar.row), [1, 0]);
  assert.equal(last(frames).state.mark.at, 8);
});

test('finish <= start is widened and surplus values are ignored', () => {
  const frames = run([3, 1], [3]);
  assert.equal(frames[0].state.bars.length, 1);
  assert.equal(frames[0].state.bars[0].to, 4);
  assert.match(frames[0].msg, /widened/);
});

test('ends on the closing line and stays small', () => {
  const frames = run([0, 0, 0, 0, 0, 0, 0, 0], [20, 19, 18, 17, 16, 15, 14, 13]);
  assert.equal(last(frames).line, intervalScheduling.code.length - 1);
  assert.equal(frames.length < 100, true);
  assert.equal(last(frames).vars.size, 1);
});
