import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import vector, { LIMIT as VLIMIT } from '../src/learn/data/vector.js';
import pair from '../src/learn/data/pair.js';
import stack, { LIMIT as SLIMIT } from '../src/learn/data/stack.js';
import queue, { LIMIT as QLIMIT } from '../src/learn/data/queue.js';

function run(module, state, name, args = {}) {
  const op = module.ops[name];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}
const vals = (state) => state.cells.filter(Boolean).map((c) => c.value);
const keysOf = (state) => state.cells.filter(Boolean).map((c) => c.key);
const vec = (list, capacity) => ({ cells: list.map((value, i) => ({ key: `v${i}`, value })), capacity, nextKey: list.length });
const stk = (list, capacity = 16) => ({ cells: list.map((value, i) => ({ key: `s${i}`, value })), capacity, nextKey: list.length, pointers: { top: list.length - 1 } });
// A queue holding `list` in order, starting at slot `front` of a buffer of `capacity`.
function que(list, capacity, front) {
  const cells = Array(capacity).fill(null);
  list.forEach((value, i) => { cells[(front + i) % capacity] = { key: `q${i}`, value }; });
  return { cells, capacity, front, size: list.length, nextKey: list.length, pointers: {} };
}
const order = (state) => Array.from({ length: state.size }, (_, k) => state.cells[(state.front + k) % state.capacity].value);

test('every new op has valid defaults, stable keys on every frame, and line 0', () => {
  for (const module of [vector, pair, stack, queue]) {
    for (const [name, op] of Object.entries(module.ops)) {
      const args = Object.fromEntries(op.params.map((p) => [p.name, p.default]));
      const result = run(module, module.preset(), name, args);
      assert.equal(result.problem, undefined, `${module.id}.${name}`);
      for (const frame of result.frames) {
        assert.equal(frame.line, 0);
        assert.ok(frame.msg);
        const keys = keysOf(frame.state);
        assert.equal(new Set(keys).size, keys.length, `${module.id}.${name} keys`);
      }
    }
  }
});

test('vector clear keeps capacity; empty reads size', () => {
  const { state } = run(vector, vector.preset(), 'clear');
  assert.deepEqual([vals(state), state.capacity], [[], 4]);
  assert.match(run(vector, vector.preset(), 'empty').frames[0].msg, /empty\(\) is false/);
  assert.match(run(vector, vec([], 4), 'empty').frames[0].msg, /empty\(\) is true/);
});

test('vector resize grows with zeros (expand to exactly n) and shrinks without freeing', () => {
  const grown = run(vector, vector.preset(), 'resize', { n: 7 });
  assert.deepEqual(vals(grown.state), [10, 20, 30, 0, 0, 0, 0]);
  assert.equal(grown.state.capacity, 7);
  assert.match(grown.frames[0].msg, /expand\(7\)/);
  const inside = run(vector, vector.preset(), 'resize', { n: 4 });
  assert.deepEqual([vals(inside.state), inside.state.capacity], [[10, 20, 30, 0], 4]);
  assert.equal(inside.frames.length, 1);
  const shrunk = run(vector, vector.preset(), 'resize', { n: 1 });
  assert.deepEqual([vals(shrunk.state), shrunk.state.capacity], [[10], 4]);
  assert.deepEqual(vals(run(vector, vector.preset(), 'resize', { n: 0 }).state), []);
  assert.match(run(vector, vector.preset(), 'resize', { n: 3 }).frames[0].msg, /nothing changes/);
  const full = run(vector, vector.preset(), 'resize', { n: VLIMIT });
  assert.equal(full.state.cells.length, VLIMIT);
  assert.equal(new Set(keysOf(full.state)).size, VLIMIT);
});

test('vector reserve allocates only when n > capacity and never shrinks', () => {
  const up = run(vector, vector.preset(), 'reserve', { n: 10 });
  assert.deepEqual([vals(up.state), up.state.capacity], [[10, 20, 30], 10]);
  const same = run(vector, vector.preset(), 'reserve', { n: 2 });
  assert.equal(same.state.capacity, 4);
  assert.match(same.frames[0].msg, /does nothing/);
});

test('vector front and back, with empty checks', () => {
  assert.match(run(vector, vector.preset(), 'front').frames[0].msg, /front\(\) is 10/);
  assert.match(run(vector, vector.preset(), 'back').frames[0].msg, /back\(\) is 30/);
  assert.match(run(vector, vec([], 4), 'front').problem, /empty/);
  assert.match(run(vector, vec([], 4), 'back').problem, /empty/);
});

test('vector block_swap matches the course example and rejects bad ranges', () => {
  const state = vec([10, 20, 30, 40, 50, 60, 70, 80], 8);
  assert.deepEqual(vals(run(vector, state, 'block_swap', { a: 5, b: 1, m: 2 }).state), [10, 60, 70, 40, 50, 20, 30, 80]);
  assert.deepEqual(vals(run(vector, vec([1, 2, 3, 4, 5], 5), 'block_swap', { a: 3, b: 0, m: 2 }).state), [4, 5, 3, 1, 2]);
  assert.match(run(vector, state, 'block_swap', { a: 0, b: 2, m: 3 }).problem, /overlap/);
  assert.match(run(vector, state, 'block_swap', { a: 7, b: 0, m: 2 }).problem, /fit inside/);
  assert.equal(run(vector, state, 'block_swap', { a: 0, b: 1, m: 1 }).problem, undefined);
});

test('pair assign, swap_members and clear', () => {
  const assigned = run(pair, pair.preset(), 'assign', { i: 1, a: -4, b: 9 });
  assert.deepEqual(vals(assigned.state), ['(3, 1)', '(-4, 9)', '(3, 0)']);
  assert.deepEqual(assigned.state.cells[1].pair, [-4, 9]);
  assert.equal(assigned.state.cells[1].key, pair.preset().cells[1].key);
  assert.match(run(pair, pair.preset(), 'assign', { i: 3, a: 1, b: 1 }).problem, /below size \(3\)/);
  const swapped = run(pair, pair.preset(), 'swap_members', { i: 0 });
  assert.deepEqual(vals(swapped.state), ['(1, 3)', '(1, 5)', '(3, 0)']);
  assert.deepEqual(swapped.state.cells[0].pair, [1, 3]);
  assert.match(run(pair, pair.preset(), 'swap_members', { i: 5 }).problem, /below size/);
  const cleared = run(pair, pair.preset(), 'clear');
  assert.deepEqual([cleared.state.cells, cleared.state.capacity], [[], 4]);
});

test('stack empty, clear and multi_pop', () => {
  assert.match(run(stack, stack.preset(), 'empty').frames[0].msg, /empty\(\) is false/);
  assert.match(run(stack, stk([]), 'empty').frames[0].msg, /empty\(\) is true/);
  const cleared = run(stack, stack.preset(), 'clear');
  assert.deepEqual([vals(cleared.state), cleared.state.pointers, cleared.state.capacity], [[], { top: -1 }, 4]);
  const two = run(stack, stack.preset(), 'multi_pop', { k: 2 });
  assert.deepEqual([vals(two.state), two.state.pointers], [[10], { top: 0 }]);
  const over = run(stack, stack.preset(), 'multi_pop', { k: 5 });
  assert.deepEqual([vals(over.state), over.state.pointers], [[], { top: -1 }]);
  assert.match(over.frames.at(-1).msg, /ran out after 3/);
  assert.match(run(stack, stk([]), 'multi_pop', { k: 2 }).frames[0].msg, /empty/);
  assert.match(run(stack, stack.preset(), 'multi_pop', { k: 0 }).frames[0].msg, /k = 0/);
});

test('stack deep_push places x with pos elements above it', () => {
  for (let pos = 0; pos <= 3; pos += 1) {
    const model = [10, 20, 30];
    model.splice(model.length - pos, 0, 7);
    const { state } = run(stack, stack.preset(), 'deep_push', { pos, x: 7 });
    assert.deepEqual(vals(state), model, `pos ${pos}`);
    assert.deepEqual(state.pointers, { top: 3 });
  }
  assert.deepEqual(vals(run(stack, stack.preset(), 'deep_push', { pos: 3, x: 7 }).state), [7, 10, 20, 30]);
  const grown = run(stack, stk([1, 2, 3, 4], 4), 'deep_push', { pos: 2, x: 9 });
  assert.deepEqual([vals(grown.state), grown.state.capacity], [[1, 2, 9, 3, 4], 8]);
  assert.match(grown.frames[0].msg, /expand to a new array of 8/);
  assert.match(run(stack, stack.preset(), 'deep_push', { pos: 4, x: 1 }).problem, /between 0 and size \(3\)/);
  assert.match(run(stack, stk(Array.from({ length: SLIMIT }, (_, i) => i)), 'deep_push', { pos: 0, x: 1 }).problem, /at most/);
  assert.equal(new Set(keysOf(grown.state)).size, 5);
});

test('queue clear resets size and front but keeps capacity', () => {
  const { state } = run(queue, queue.preset(), 'clear');
  assert.deepEqual([state.size, state.front, state.capacity, vals(state)], [0, 0, 4, []]);
  assert.deepEqual(state.pointers, { front: 0, back: null });
});

test('queue move_to_back / move_to_front / reverse match array models, at every front', () => {
  const list = [10, 20, 30, 40, 50];
  for (let front = 0; front < 8; front += 1) {
    const base = que(list, 8, front);
    for (let pos = 0; pos < list.length; pos += 1) {
      const back = run(queue, base, 'move_to_back', { pos });
      const modelBack = [...list]; modelBack.push(modelBack.splice(pos, 1)[0]);
      assert.deepEqual(order(back.state), modelBack, `back front=${front} pos=${pos}`);
      const toFront = run(queue, base, 'move_to_front', { pos });
      const modelFront = [...list]; modelFront.unshift(modelFront.splice(pos, 1)[0]);
      assert.deepEqual(order(toFront.state), modelFront, `front front=${front} pos=${pos}`);
      for (const r of [back, toFront]) {
        assert.deepEqual([r.state.front, r.state.size, r.state.capacity], [front, 5, 8]);
        assert.equal(new Set(keysOf(r.state)).size, 5);
        for (const f of r.frames) assert.equal(new Set(keysOf(f.state)).size, keysOf(f.state).length);
      }
    }
    for (let a = 0; a < list.length; a += 1) {
      for (let b = a; b < list.length; b += 1) {
        const r = run(queue, base, 'reverse', { a, b });
        const model = [...list.slice(0, a), ...list.slice(a, b + 1).reverse(), ...list.slice(b + 1)];
        assert.deepEqual(order(r.state), model, `reverse front=${front} ${a}..${b}`);
        assert.deepEqual([r.state.front, r.state.size], [front, 5]);
      }
    }
  }
});

test('queue grader examples', () => {
  const six = que([10, 20, 30, 40, 50, 60], 8, 5);
  assert.deepEqual(order(run(queue, six, 'move_to_front', { pos: 3 }).state), [40, 10, 20, 30, 50, 60]);
  assert.deepEqual(order(run(queue, six, 'move_to_back', { pos: 3 }).state), [10, 20, 30, 50, 60, 40]);
  const nine = que(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], 16, 12);
  assert.deepEqual(order(run(queue, nine, 'reverse', { a: 1, b: 4 }).state), ['A', 'E', 'D', 'C', 'B', 'F', 'G', 'H', 'I']);
});

test('queue move and reverse messages and checks', () => {
  assert.match(run(queue, queue.preset(), 'move_to_back', { pos: 0 }).frames[0].msg, /Save the element at position 0/);
  assert.match(run(queue, queue.preset(), 'move_to_front', { pos: 3 }).problem, /below size \(3\)/);
  assert.match(run(queue, queue.preset(), 'move_to_back', { pos: 3 }).problem, /below size \(3\)/);
  assert.match(run(queue, queue.preset(), 'reverse', { a: 2, b: 1 }).problem, /a must be <= b/);
  assert.match(run(queue, queue.preset(), 'reverse', { a: 0, b: 3 }).problem, /below size \(3\)/);
  const empty = que([], 4, 0);
  assert.match(run(queue, empty, 'move_to_back', { pos: 0 }).problem, /empty queue/);
  assert.match(run(queue, empty, 'move_to_front', { pos: 0 }).problem, /empty queue/);
  assert.match(run(queue, empty, 'reverse', { a: 0, b: 0 }).problem, /below size \(0\)/);
  assert.ok(QLIMIT === 8);
  const wrapped = run(queue, que([1, 2, 3], 4, 2), 'reverse', { a: 0, b: 2 });
  assert.match(wrapped.frames[0].msg, /slots 2, 3, 0/);
});
