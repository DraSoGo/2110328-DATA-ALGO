import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import vector, { LIMIT } from '../src/learn/data/vector.js';

const values = (state) => state.cells.map((cell) => cell.value);
const keys = (state) => state.cells.map((cell) => cell.key);
function run(state, opName, args = {}) {
  const op = vector.ops[opName];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}
const withValues = (list, capacity) => ({ cells: list.map((value, i) => ({ key: `v${i}`, value })), capacity, nextKey: list.length });

test('preset is {10, 20, 30} with capacity 4', () => {
  const state = vector.preset();
  assert.deepEqual(values(state), [10, 20, 30]);
  assert.equal(state.capacity, 4);
  assert.deepEqual(vector.preset(), state);
  assert.notEqual(vector.preset(), state);
});

test('push_back writes into spare capacity without reallocating', () => {
  const { frames, state } = run(vector.preset(), 'push_back', { x: 40 });
  assert.deepEqual(values(state), [10, 20, 30, 40]);
  assert.equal(state.capacity, 4);
  assert.equal(frames.length, 1);
  assert.deepEqual(frames[0].hl, { active: [3] });
});

test('push_back on a full vector doubles capacity before writing', () => {
  const { frames, state } = run(withValues([1, 2, 3, 4], 4), 'push_back', { x: 5 });
  assert.equal(state.capacity, 8);
  assert.deepEqual(values(state), [1, 2, 3, 4, 5]);
  assert.match(frames[0].msg, /allocate a new buffer of 8/);
  assert.equal(frames[0].state.capacity, 4);
  assert.equal(frames[1].state.capacity, 8);
  assert.equal(new Set(keys(state)).size, 5);
});

test('push_back on capacity 0 allocates one slot', () => {
  const { state } = run(withValues([], 0), 'push_back', { x: 7 });
  assert.equal(state.capacity, 1);
  assert.deepEqual(values(state), [7]);
});

test('insert shifts the tail right and keeps existing keys', () => {
  const before = vector.preset();
  const { frames, state } = run(before, 'insert', { pos: 1, x: 99 });
  assert.deepEqual(values(state), [10, 99, 20, 30]);
  assert.deepEqual([state.cells[0].key, state.cells[2].key, state.cells[3].key], [before.cells[0].key, before.cells[1].key, before.cells[2].key]);
  assert.deepEqual(frames.at(-1).hl, { active: [1], moved: [2, 3] });
  assert.match(run(before, 'insert', { pos: 4, x: 1 }).problem, /between 0 and size \(3\)/);
  assert.deepEqual(values(run(before, 'insert', { pos: 3, x: 1 }).state), [10, 20, 30, 1]);
});

test('erase removes one element and shifts the tail left', () => {
  const { frames, state } = run(vector.preset(), 'erase', { pos: 0 });
  assert.deepEqual(values(state), [20, 30]);
  assert.deepEqual(frames.at(-1).hl, { moved: [0, 1] });
  assert.equal(state.capacity, 4);
  assert.match(run(vector.preset(), 'erase', { pos: 3 }).problem, /between 0 and size - 1 \(2\)/);
  assert.match(run(withValues([], 4), 'erase', { pos: 0 }).problem, /empty/);
});

test('pop_back removes the last element and refuses an empty vector', () => {
  const { state } = run(vector.preset(), 'pop_back');
  assert.deepEqual(values(state), [10, 20]);
  assert.equal(state.capacity, 4);
  assert.match(run(withValues([], 4), 'pop_back').problem, /empty/);
});

test('at reads without changing the vector', () => {
  const { frames, state } = run(vector.preset(), 'at', { i: 2 });
  assert.deepEqual(values(state), [10, 20, 30]);
  assert.match(frames[0].msg, /v\.at\(2\) is 30/);
  assert.match(run(vector.preset(), 'at', { i: 3 }).problem, /below size \(3\)/);
});

test('size is capped for readability', () => {
  const full = withValues(Array.from({ length: LIMIT }, (_, i) => i), 16);
  assert.match(run(full, 'push_back', { x: 1 }).problem, new RegExp(`at most ${LIMIT}`));
  assert.match(run(full, 'insert', { pos: 0, x: 1 }).problem, new RegExp(`at most ${LIMIT}`));
});

test('every frame points at the single code line', () => {
  for (const [name, op] of Object.entries(vector.ops)) {
    const args = Object.fromEntries(op.params.map((param) => [param.name, param.default]));
    const result = run(vector.preset(), name, args);
    if (result.problem) continue;
    for (const frame of result.frames) assert.equal(frame.line, 0, name);
  }
});
