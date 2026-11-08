import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import pq, { LIMIT } from '../src/learn/data/priority-queue.js';

const values = (state) => state.cells.map((c) => c.value);
const isHeap = (state) => state.cells.every((c, i) => i === 0 || state.cells[(i - 1) >> 1].value >= c.value);
const heapOf = (list, capacity = 8) => ({ cells: list.map((value, i) => ({ key: `h${i}`, value })), capacity, limit: LIMIT, nextKey: list.length });
const runOp = (name, state, args = {}) => {
  const op = pq.ops[name];
  assert.equal(op.check(state, args), null);
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames[frames.length - 1].state };
};
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test('preset is the heap 9 5 7 and top reads the root', () => {
  const s = pq.preset();
  assert.deepEqual(values(s), [9, 5, 7]);
  assert.equal(isHeap(s), true);
  assert.match(runOp('top', s).frames[0].msg, /9/);
});

test('push fixes up with one frame per comparison and swap', () => {
  const { frames, state } = runOp('push', pq.preset(), { x: 8 });
  assert.deepEqual(values(state), [9, 8, 7, 5]);
  assert.match(frames[0].msg, /mData\[3\] = 8/);
  assert.equal(frames.filter((f) => f.hl.compare?.length === 2).length, 2); // 8 vs 5 (swap), 8 vs 9 (stop)
  const swaps = frames.filter((f) => f.hl.moved?.length === 2);
  assert.deepEqual(swaps.map((f) => f.hl.moved), [[3, 1]]);
});

test('a new maximum climbs to index 0', () => {
  const { state, frames } = runOp('push', pq.preset(), { x: 99 });
  assert.deepEqual(values(state), [99, 9, 7, 5]);
  assert.match(frames.at(-1).msg, /reached the root/);
});

test('expand doubles the capacity and every element keeps its key', () => {
  const full = runOp('push', pq.preset(), { x: 1 }).state;
  assert.equal(full.capacity, 4);
  const { frames, state } = runOp('push', full, { x: 2 });
  assert.equal(state.capacity, 8);
  assert.match(frames[0].msg, /expand\(8\)/);
  const keys = state.cells.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of full.cells) assert.ok(keys.includes(c.key));
});

test('pop moves the last element to the root and fixes down', () => {
  const small = runOp('pop', pq.preset());
  assert.deepEqual(values(small.state), [7, 5]);
  assert.match(small.frames[0].msg, /Remove the top 9/);
  const out = runOp('pop', heapOf([50, 40, 45, 10, 20, 30, 35]));
  assert.deepEqual(values(out.state), [45, 40, 35, 10, 20, 30]);
  const swaps = out.frames.filter((f) => f.hl.moved?.length === 2);
  assert.deepEqual(swaps.map((f) => f.hl.moved), [[0, 2]]); // then 35 vs its only child 30: stop
  assert.ok(out.frames.some((f) => /only one child/.test(f.msg)));
});

test('fixDown handles a node with a single child and stops on a leaf', () => {
  const out = runOp('pop', heapOf([20, 5, 8, 4]));
  assert.deepEqual(values(out.state), [8, 5, 4]);
  const one = runOp('pop', heapOf([20, 9, 8, 7, 6, 3, 2, 1]));
  assert.equal(isHeap(one.state), true);
  const single = runOp('pop', heapOf([20, 9, 8, 7, 3]));
  assert.ok(single.frames.some((f) => /only one child/.test(f.msg)));
  assert.deepEqual(values(single.state), [9, 7, 8, 3]);
});

test('pop the last element, empty and full checks', () => {
  const { state } = runOp('pop', heapOf([4], 1));
  assert.equal(state.cells.length, 0);
  assert.match(pq.ops.pop.check(state, {}), /empty/);
  assert.match(pq.ops.top.check(state, {}), /empty/);
  assert.match(pq.ops.push.check(heapOf(Array(LIMIT).fill(0), 16), { x: 1 }), /at most 15/);
});

test('random push/pop sequences keep the heap property and pop the maximum', () => {
  const next = rng(42);
  let state = pq.preset();
  const ref = [9, 5, 7];
  for (let step = 0; step < 300; step += 1) {
    if (state.cells.length === 0 || (state.cells.length < LIMIT && next() < 0.55)) {
      const x = Math.floor(next() * 40) - 20;
      state = runOp('push', state, { x }).state;
      ref.push(x);
    } else {
      ref.sort((a, b) => b - a);
      assert.equal(state.cells[0].value, ref[0]);
      state = runOp('pop', state).state;
      ref.shift();
    }
    assert.equal(isHeap(state), true, `step ${step}`);
    assert.deepEqual(values(state).sort((a, b) => a - b), [...ref].sort((a, b) => a - b));
    assert.ok(state.capacity >= state.cells.length && (state.capacity & (state.capacity - 1)) === 0);
  }
});

test('frame counts stay small at the size limit', () => {
  let state = pq.preset();
  for (let i = 0; i < LIMIT - 3; i += 1) state = runOp('push', state, { x: i }).state;
  assert.equal(state.cells.length, LIMIT);
  assert.ok(runOp('pop', state).frames.length < 40);
});
