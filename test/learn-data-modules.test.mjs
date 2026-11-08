import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import stack, { LIMIT as STACK_LIMIT } from '../src/learn/data/stack.js';
import queue from '../src/learn/data/queue.js';
import pair from '../src/learn/data/pair.js';

function run(module, state, opName, args = {}) {
  const op = module.ops[opName];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}
const values = (state) => state.cells.map((cell) => (cell ? cell.value : null));

test('stack pushes and pops at the top and grows by doubling', () => {
  let { state } = run(stack, stack.preset(), 'push', { x: 40 });
  assert.deepEqual(values(state), [10, 20, 30, 40]);
  assert.deepEqual(state.pointers, { top: 3 });
  const grown = run(stack, state, 'push', { x: 50 });
  assert.equal(grown.state.capacity, 8);
  assert.match(grown.frames[0].msg, /expand to a new array of 8/);
  ({ state } = run(stack, stack.preset(), 'pop'));
  assert.deepEqual(values(state), [10, 20]);
  assert.deepEqual(state.pointers, { top: 1 });
  assert.match(run(stack, stack.preset(), 'top').frames[0].msg, /top\(\) is 30/);
});

test('stack refuses pop and top when empty and caps its size', () => {
  const empty = { cells: [], capacity: 4, nextKey: 0, pointers: { top: -1 } };
  assert.match(run(stack, empty, 'pop').problem, /empty stack/);
  assert.match(run(stack, empty, 'top').problem, /empty stack/);
  const full = { cells: Array.from({ length: STACK_LIMIT }, (_, i) => ({ key: `x${i}`, value: i })), capacity: 16, nextKey: STACK_LIMIT, pointers: { top: STACK_LIMIT - 1 } };
  assert.match(run(stack, full, 'push', { x: 1 }).problem, /at most/);
});

test('queue wraps around the circular buffer', () => {
  const { state, frames } = run(queue, queue.preset(), 'push', { x: 40 });
  assert.deepEqual(values(state), [40, 10, 20, 30]);
  assert.match(frames[0].msg, /slot \(front \+ size\) % capacity = 0/);
  assert.deepEqual(state.pointers, { front: 1, back: 0 });
});

test('queue grows by copying in queue order so front becomes 0', () => {
  const full = run(queue, queue.preset(), 'push', { x: 40 }).state;
  const { state, frames } = run(queue, full, 'push', { x: 50 });
  assert.equal(state.capacity, 8);
  assert.equal(state.front, 0);
  assert.deepEqual(values(state), [10, 20, 30, 40, 50, null, null, null]);
  assert.match(frames[1].msg, /front becomes 0/);
  assert.equal(new Set(state.cells.filter(Boolean).map((cell) => cell.key)).size, 5);
});

test('queue pops from the front and reads front and back', () => {
  const { state } = run(queue, queue.preset(), 'pop');
  assert.deepEqual(values(state), [null, null, 20, 30]);
  assert.deepEqual([state.front, state.size], [2, 2]);
  assert.match(run(queue, queue.preset(), 'front').frames[0].msg, /front\(\) is 10/);
  assert.match(run(queue, queue.preset(), 'back').frames[0].msg, /back\(\) is 30/);
  const empty = { cells: [null, null], capacity: 2, front: 0, size: 0, nextKey: 0, pointers: { front: null, back: null } };
  for (const op of ['pop', 'front', 'back']) assert.match(run(queue, empty, op).problem, /empty queue/);
});

test('pair compares first, then second only on a tie', () => {
  const preset = pair.preset();
  const differ = run(pair, preset, 'compare', { i: 1, j: 0 });
  assert.equal(differ.frames.length, 2);
  assert.match(differ.frames.at(-1).msg, /v\[1\] < v\[0\] is true/);
  const tie = run(pair, preset, 'compare', { i: 0, j: 2 });
  assert.equal(tie.frames.length, 3);
  assert.match(tie.frames[1].msg, /tie at 3/);
  assert.match(tie.frames.at(-1).msg, /is false/);
  assert.match(run(pair, preset, 'compare', { i: 0, j: 5 }).problem, /below size/);
});

test('pair sort orders lexicographically and keeps each pair key', () => {
  const preset = pair.preset();
  const { state } = run(pair, preset, 'sort');
  assert.deepEqual(values(state), ['(1, 5)', '(3, 0)', '(3, 1)']);
  assert.deepEqual(state.cells.map((cell) => cell.key).sort(), preset.cells.map((cell) => cell.key).sort());
  const pushed = run(pair, preset, 'push_back', { a: -2, b: 4 }).state;
  assert.deepEqual(pushed.cells.at(-1).pair, [-2, 4]);
  assert.equal(pushed.cellWidth, 84);
});

const viewBoxes = (frames, render) => new Set(frames.map((frame) => render(frame.state, frame.hl).match(/viewBox="([^"]+)"/)[1]));

test('stack pops to empty and pushes back from index 0', () => {
  let state = stack.preset();
  for (let k = 0; k < 3; k += 1) ({ state } = run(stack, state, 'pop'));
  assert.deepEqual(state.pointers, { top: -1 });
  ({ state } = run(stack, state, 'push', { x: 7 }));
  assert.deepEqual([values(state), state.pointers], [[7], { top: 0 }]);
});

test('an empty queue keeps its front pointer, and the next push lands there', () => {
  let state = queue.preset();
  for (let k = 0; k < 3; k += 1) ({ state } = run(queue, state, 'pop'));
  assert.deepEqual(state.pointers, { front: 0, back: null });
  const pushed = run(queue, state, 'push', { x: 9 });
  assert.equal(pushed.state.cells[0].value, 9);
  assert.match(run(queue, queue.preset(), 'pop').frames.at(-1).msg, /old value stays in memory/);
});

test('queue grows correctly after wrapping, keeping queue order', () => {
  let state = queue.preset();
  ({ state } = run(queue, state, 'push', { x: 40 }));
  ({ state } = run(queue, state, 'pop'));
  ({ state } = run(queue, state, 'push', { x: 50 }));
  assert.deepEqual([state.front, values(state)], [2, [40, 50, 20, 30]]);
  ({ state } = run(queue, state, 'push', { x: 60 }));
  assert.deepEqual(values(state).filter((v) => v !== null), [20, 30, 40, 50, 60]);
  assert.equal(state.front, 0);
});

test('pair behaves like a vector: capacity, stable layout on pop_back, compare with itself', async () => {
  const { renderArray } = await import('../src/learn/render/array.js');
  const preset = pair.preset();
  assert.equal(preset.capacity, 4);
  const popped = run(pair, preset, 'pop_back');
  assert.equal(viewBoxes(popped.frames, renderArray).size, 1);
  assert.equal(popped.state.capacity, 4);
  assert.match(run(pair, preset, 'compare', { i: 1, j: 1 }).frames.at(-1).msg, /is false/);
  let state = preset;
  ({ state } = run(pair, state, 'push_back', { a: 1, b: 1 }));
  const grown = run(pair, state, 'push_back', { a: 2, b: 2 });
  assert.equal(grown.state.capacity, 8);
});

test('pair sort messages describe the order before the swap', () => {
  const { frames } = run(pair, pair.preset(), 'sort');
  const swap = frames.find((frame) => /swap/.test(frame.msg));
  assert.match(swap.msg, /^\(1, 5\) < \(3, 1\): swap them/);
  assert.match(frames.at(-1).msg, /std::sort/);
});
