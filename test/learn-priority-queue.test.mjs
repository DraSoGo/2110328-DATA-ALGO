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

const drain = (state) => {
  const out = [];
  let s = state;
  while (s.cells.length) {
    out.push(s.cells[0].value);
    s = runOp('pop', s).state;
  }
  return out;
};
const uniqueKeys = (state) => new Set(state.cells.map((c) => c.key)).size === state.cells.length;

test('clear drops every element and keeps mCap', () => {
  const { frames, state } = runOp('clear', pq.preset());
  assert.deepEqual(values(state), []);
  assert.equal(state.capacity, 4);
  assert.match(frames.at(-1).msg, /mSize = 0.*mCap stays 4/);
  assert.match(runOp('clear', state).frames[0].msg, /already 0/);
  const after = runOp('push', state, { x: 3 }).state;
  assert.deepEqual(values(after), [3]);
});

test('erase(i) replaces with the last element, then fixUp or fixDown', () => {
  // fixDown case: erase root of 9 8 7 5 6 -> last 6 goes to the root
  const a = runOp('erase', heapOf([9, 8, 7, 5, 6]), { i: 0 });
  assert.deepEqual(values(a.state), [8, 6, 7, 5]);
  assert.ok(a.frames.some((f) => /fixDown/.test(f.msg)));
  // fixUp case: 20 10 15 8 9 14 3 -> erase index 3 (8): last 3 moves there, still below parent: fixDown no-op
  const b = runOp('erase', heapOf([20, 10, 15, 8, 9, 14, 3]), { i: 3 });
  assert.deepEqual(values(b.state), [20, 10, 15, 3, 9, 14]);
  // fixUp case: 50 10 40 8 9 30 35 -> erase index 3 (8): last 35 lands under 10 and beats it
  const c = runOp('erase', heapOf([50, 10, 40, 8, 9, 30, 35]), { i: 3 });
  assert.deepEqual(values(c.state), [50, 35, 40, 10, 9, 30]);
  assert.ok(c.frames.some((f) => /fixUp\(3\)/.test(f.msg)));
  // last index and singleton
  assert.deepEqual(values(runOp('erase', heapOf([9, 5, 7]), { i: 2 }).state), [9, 5]);
  assert.deepEqual(values(runOp('erase', heapOf([9]), { i: 0 }).state), []);
  assert.match(pq.ops.erase.check(heapOf([9, 5, 7]), { i: 3 }), /between 0 and size - 1 \(2\)/);
  assert.match(pq.ops.erase.check(heapOf([]), { i: 0 }), /empty priority_queue/);
  assert.equal(pq.ops.erase.check(pq.preset(), { i: 1 }), null);
});

test('random erase(i) keeps the heap and removes exactly that element', () => {
  const next = rng(7);
  let state = pq.preset();
  const ref = [9, 5, 7];
  for (let step = 0; step < 150; step += 1) {
    if (state.cells.length < 4 || (state.cells.length < LIMIT && next() < 0.5)) {
      const x = Math.floor(next() * 40) - 10;
      state = runOp('push', state, { x }).state;
      ref.push(x);
    } else {
      const i = Math.floor(next() * state.cells.length);
      const gone = state.cells[i].value;
      state = runOp('erase', state, { i }).state;
      ref.splice(ref.indexOf(gone), 1);
    }
    assert.equal(isHeap(state), true, `step ${step}`);
    assert.deepEqual([...values(state)].sort((p, q) => p - q), [...ref].sort((p, q) => p - q));
    assert.ok(uniqueKeys(state));
  }
});

test('assign builds a heap bottom-up from the given array', () => {
  const defaults = Object.fromEntries(pq.ops.assign.params.map((p) => [p.name, p.default]));
  const { frames, state } = runOp('assign', pq.preset(), defaults);
  const input = Object.values(defaults);
  assert.equal(isHeap(state), true);
  assert.deepEqual([...values(state)].sort((p, q) => p - q), [...input].sort((p, q) => p - q));
  assert.deepEqual(drain(state), [...input].sort((p, q) => q - p));
  assert.equal(state.capacity, 8, 'mCap 4 doubles to hold 6');
  assert.deepEqual(frames[0].state.cells.map((c) => c.value), input, 'first frame is the raw copy, not yet a heap');
  assert.equal(isHeap(frames[0].state), false);
  assert.match(frames[0].msg, /mCap grows 4 -> 8/);
  assert.deepEqual(frames.filter((f) => /^fixDown\(\d\):/.test(f.msg)).map((f) => f.msg.match(/fixDown\((\d)\)/)[1]), ['2', '1', '0']);
  assert.ok(uniqueKeys(state));
  const next = rng(3);
  for (let t = 0; t < 40; t += 1) {
    const args = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((n) => [n, Math.floor(next() * 7) - 3]));
    const out = runOp('assign', heapOf([1, 2, 3], 4), args).state;
    assert.equal(isHeap(out), true, JSON.stringify(args));
    assert.deepEqual([...values(out)].sort((p, q) => p - q), Object.values(args).sort((p, q) => p - q));
  }
});

test('new pq ops: defaults pass check and keys are unique per frame', () => {
  for (const name of ['clear', 'erase', 'assign']) {
    const args = Object.fromEntries(pq.ops[name].params.map((p) => [p.name, p.default]));
    assert.equal(pq.ops[name].check(pq.preset(), args), null);
    for (const frame of runOp(name, pq.preset(), args).frames) assert.ok(uniqueKeys(frame.state), `${name}: ${frame.msg}`);
  }
  assert.equal(pq.ops.erase.time, 'O(log n)');
  assert.equal(pq.ops.assign.time, 'O(n)');
});
