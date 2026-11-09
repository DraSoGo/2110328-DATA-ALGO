import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import list, { LIMIT, values, relink } from '../src/learn/data/list.js';
import { renderLinked } from '../src/learn/render/linked.js';

function run(state, opName, args = {}) {
  const op = list.ops[opName];
  const problem = op.check(state, args);
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}

const empty = () => {
  const state = list.preset();
  state.nodes = [];
  state.header.next = 'h';
  state.header.prev = 'h';
  return state;
};

// Checks that next and prev agree in both directions around the circle.
function assertCircular(state) {
  const byKey = new Map([[state.header.key, state.header], ...state.nodes.map((node) => [node.key, node])]);
  let at = state.header;
  const forward = [];
  for (let i = 0; i <= state.nodes.length; i += 1) {
    const next = byKey.get(at.next);
    assert.equal(byKey.get(next.prev), at, 'prev must undo next');
    forward.push(next.key);
    at = next;
  }
  assert.equal(at, state.header, 'walking next size+1 times returns to the header');
  assert.deepEqual(forward.slice(0, -1), state.nodes.map((node) => node.key), 'array order is list order');
}

test('preset is a circular doubly linked list with a header', () => {
  const state = list.preset();
  assert.deepEqual(values(state), [10, 20, 30]);
  assertCircular(state);
  assert.equal(state.header.prev, 'n2');
});

test('fixed op sequence matches an array reference, ends included', () => {
  let state = list.preset();
  const ref = [10, 20, 30];
  const steps = [
    ['push_back', { x: 1 }, (a) => a.push(1)],
    ['push_front', { x: 2 }, (a) => a.unshift(2)],
    ['insert', { pos: 0, x: 3 }, (a) => a.splice(0, 0, 3)],
    ['insert', { pos: 6, x: 4 }, (a) => a.splice(6, 0, 4)],
    ['insert', { pos: 3, x: 5 }, (a) => a.splice(3, 0, 5)],
    ['erase', { pos: 0 }, (a) => a.splice(0, 1)],
    ['erase', { pos: 6 }, (a) => a.splice(6, 1)],
    ['erase', { pos: 2 }, (a) => a.splice(2, 1)],
    ['pop_back', {}, (a) => a.pop()],
    ['pop_front', {}, (a) => a.shift()],
    ['push_back', { x: 7 }, (a) => a.push(7)],
  ];
  for (const [op, args, apply] of steps) {
    const result = run(state, op, args);
    assert.equal(result.problem, undefined, `${op} ${JSON.stringify(args)}`);
    state = result.state;
    apply(ref);
    assert.deepEqual(state.nodes.map((node) => node.value), ref, op);
    assert.deepEqual(values(state), ref, `${op} via next pointers`);
    assertCircular(state);
  }
});

test('empty and one-element lists', () => {
  let state = empty();
  assertCircular(state);
  state = run(state, 'push_back', { x: 5 }).state;
  assert.deepEqual(values(state), [5]);
  assert.equal(state.header.next, state.header.prev);
  assertCircular(state);
  state = run(state, 'pop_front').state;
  assert.deepEqual(state.nodes, []);
  assert.equal(state.header.next, 'h');
  assert.equal(state.header.prev, 'h');
  state = run(state, 'insert', { pos: 0, x: 9 }).state;
  assertCircular(state);
  state = run(state, 'erase', { pos: 0 }).state;
  assertCircular(state);
  assert.deepEqual(values(state), []);
  state = run(state, 'push_front', { x: 1 }).state;
  state = run(state, 'pop_back').state;
  assert.deepEqual(values(state), []);
});

test('insert shows the walk, then the four slide assignments in order', () => {
  const { frames } = run(list.preset(), 'insert', { pos: 2, x: 99 });
  const msgs = frames.map((frame) => frame.msg);
  assert.match(msgs[0], /it = l\.begin\(\).*10/);
  assert.match(msgs[1], /position 1 \(value 20\)/);
  assert.match(msgs[2], /position 2 \(value 30\)/);
  const at = msgs.findIndex((msg) => /^Create a node/.test(msg));
  assert.equal(at, 3);
  assert.match(msgs[at + 1], /^tmp->next = x/);
  assert.match(msgs[at + 2], /^tmp->prev = x->prev/);
  assert.match(msgs[at + 3], /^x->prev->next = tmp/);
  assert.match(msgs[at + 4], /^x->prev = tmp/);
  assert.match(msgs[at + 5], /^mSize\+\+/);
  assert.equal(frames.length, at + 6);
});

test('half-linked frames expose the intermediate pointers and a lane node', () => {
  const { frames } = run(list.preset(), 'push_back', { x: 99 });
  const create = frames.find((frame) => /^Create a node/.test(frame.msg)).state;
  assert.deepEqual([create.pending.next, create.pending.prev], [null, null]);
  const third = frames.find((frame) => /^x->prev->next/.test(frame.msg)).state;
  assert.equal(third.nodes[2].next, third.pending.key, 'last.next already points at the new node');
  assert.equal(third.header.prev, 'n2', 'header.prev has not changed yet');
  assert.equal(third.nodes.length, 3, 'still in the lane, not in the row');
  assert.ok(renderLinked(third, frames[0].hl).includes('is-lane'));
  assert.equal(frames.at(-1).state.pending, null);
});

test('erase shows the walk, two relinks, then the delete', () => {
  const { frames, state } = run(list.preset(), 'erase', { pos: 1 });
  const msgs = frames.map((frame) => frame.msg);
  assert.match(msgs[2], /Erase the node holding 20/);
  assert.match(msgs[3], /^x->prev->next = x->next/);
  assert.match(msgs[4], /^x->next->prev = x->prev/);
  assert.match(msgs[5], /^delete x; mSize--/);
  const skipped = frames[3].state;
  assert.equal(skipped.nodes[0].next, 'n2', 'node 10 already skips 20');
  assert.equal(skipped.nodes[1].prev, 'n0', 'node 20 still points back until the next step');
  assert.equal(skipped.nodes.length, 3);
  assert.deepEqual(values(state), [10, 30]);
});

test('keys are stable and never reused', () => {
  let state = list.preset();
  state = run(state, 'push_back', { x: 1 }).state;
  state = run(state, 'pop_front').state;
  state = run(state, 'push_back', { x: 2 }).state;
  assert.deepEqual(state.nodes.map((node) => node.key), ['n1', 'n2', 'n3', 'n4']);
  for (const frame of run(list.preset(), 'insert', { pos: 1, x: 5 }).frames) {
    const keys = renderLinked(frame.state, frame.hl).match(/data-key="[^"]+"/g);
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('the viewBox is constant for every frame of every op', () => {
  const boxes = new Set();
  const ops = [['push_back', { x: 1 }], ['push_front', { x: 1 }], ['pop_back', {}], ['pop_front', {}], ['insert', { pos: 3, x: 1 }], ['erase', { pos: 2 }]];
  for (const [op, args] of ops) {
    for (const frame of run(list.preset(), op, args).frames) boxes.add(renderLinked(frame.state, frame.hl).match(/viewBox="([^"]+)"/)[1]);
  }
  for (const frame of run(empty(), 'push_back', { x: 1 }).frames) boxes.add(renderLinked(frame.state, frame.hl).match(/viewBox="([^"]+)"/)[1]);
  assert.equal(boxes.size, 1);
});

test('check messages', () => {
  const full = list.preset();
  while (full.nodes.length < LIMIT) full.nodes.push({ key: `z${full.nodes.length}`, value: 1 });
  for (const op of ['push_back', 'push_front']) assert.match(list.ops[op].check(full, { x: 1 }), /at most 8/);
  assert.match(list.ops.insert.check(full, { pos: 0, x: 1 }), /at most 8/);
  assert.match(list.ops.insert.check(list.preset(), { pos: 4, x: 1 }), /between 0 and size \(3\)/);
  assert.equal(list.ops.insert.check(list.preset(), { pos: 3, x: 1 }), null);
  assert.match(list.ops.pop_back.check(empty()), /pop_back on an empty list/);
  assert.match(list.ops.pop_front.check(empty()), /pop_front on an empty list/);
  assert.match(list.ops.erase.check(empty(), { pos: 0 }), /erase on an empty list/);
  assert.match(list.ops.erase.check(list.preset(), { pos: 3 }), /between 0 and size - 1 \(2\)/);
  assert.equal(list.ops.erase.check(list.preset(), { pos: 2 }), null);
});

test('Big O is explicit about the walk', () => {
  assert.match(list.ops.insert.time, /O\(k\)/);
  assert.match(list.complexity.note, /O\(1\)/);
  assert.match(list.complexity.note, /O\(k\)/);
});

const listOf = (...vals) => {
  const state = list.preset();
  state.nodes = vals.map((value, i) => ({ key: `n${i}`, value }));
  state.nextKey = vals.length;
  relink(state);
  return state;
};
const rot = (a, k) => (a.length ? a.map((_, i) => a[(((i + k) % a.length) + a.length) % a.length]) : []);

test('clear erases from the front one node at a time', () => {
  const { frames, state } = run(list.preset(), 'clear');
  assert.deepEqual(state.nodes, []);
  assert.equal(state.header.next, 'h');
  assert.equal(state.header.prev, 'h');
  assertCircular(state);
  assert.equal(frames.filter((frame) => /^delete x; mSize--/.test(frame.msg)).length, 3);
  assert.match(frames.at(-1).msg, /^mSize == 0/);
  const again = run(state, 'clear');
  assert.equal(again.frames.length, 1);
  assert.deepEqual(again.state.nodes, []);
});

test('reverse flips every arrow, header included, and matches Array.reverse', () => {
  for (const vals of [[], [5], [1, 2], [10, 20, 30], [1, 2, 3, 4, 5, 6, 7, 8]]) {
    const { frames, state } = run(listOf(...vals), 'reverse');
    assert.deepEqual(values(state), [...vals].reverse(), `walk next ${vals}`);
    assert.deepEqual(state.nodes.map((n) => n.value), [...vals].reverse());
    assertCircular(state);
    assert.equal(frames.filter((f) => /^swap\(/.test(f.msg)).length, vals.length + 1, 'one swap per node plus the header');
  }
  const { frames } = run(list.preset(), 'reverse');
  const afterHeader = frames.find((f) => /^swap\(mHeader->next/.test(f.msg)).state;
  assert.equal(afterHeader.header.next, 'n2');
  assert.equal(afterHeader.header.prev, 'n0');
  assert.equal(afterHeader.nodes[0].prev, 'h', 'other nodes not yet swapped');
});

test('remove erases every node equal to x', () => {
  const cases = [[[10, 20, 30], 20], [[1, 1, 1], 1], [[1, 2, 1, 3, 1], 1], [[5, 6, 7, 5], 5], [[4, 8], 9], [[], 3], [[2, 2, 3], 2]];
  for (const [vals, x] of cases) {
    const { state, frames } = run(listOf(...vals), 'remove', { x });
    const ref = vals.filter((v) => v !== x);
    assert.deepEqual(values(state), ref, `${vals} remove ${x}`);
    assert.deepEqual(state.nodes.map((n) => n.value), ref);
    assertCircular(state);
    assert.equal(frames.filter((f) => /^delete x; mSize--/.test(f.msg)).length, vals.length - ref.length);
  }
  assert.match(run(list.preset(), 'remove', { x: 99 }).frames.at(-1).msg, /no node held 99/);
  assert.match(run(list.preset(), 'remove', { x: 20 }).frames.at(-1).msg, /erased 1 element equal to 20/);
});

test('shift rotates left for k > 0 and right for k < 0, moving only the header', () => {
  const course = [['ABCDE', 1, 'BCDEA'], ['ABCDE', 4, 'EABCD'], ['ABCDE', -2, 'DEABC'], ['A', 100, 'A'], ['ABC', 100, 'BCA']];
  for (const [from, k, to] of course) {
    const vals = [...from].map((c) => c.charCodeAt(0));
    const { state } = run(listOf(...vals), 'shift', { k });
    assert.equal(String.fromCharCode(...values(state)), to, `${from} shift ${k}`);
    assertCircular(state);
  }
  for (let n = 1; n <= 8; n += 1) {
    const vals = Array.from({ length: n }, (_, i) => i * 3 + 1);
    for (const k of [-20, -9, -8, -1, 0, 1, 3, 7, 8, 20]) {
      const { state, frames } = run(listOf(...vals), 'shift', { k });
      assert.deepEqual(values(state), rot(vals, k), `n=${n} k=${k}`);
      assert.deepEqual(state.nodes.map((x) => x.value), rot(vals, k));
      assert.equal(state.nodes.length, n);
      assertCircular(state);
      assert.ok(!frames.some((f) => /^Create a node|^delete x/.test(f.msg)), 'no node is created or deleted');
    }
  }
  assert.match(run(list.preset(), 'shift', { k: 3 }).frames[0].msg, /= 0: .*already in place/);
  assert.match(list.ops.shift.check(empty(), { k: 1 }), /size > 0/);
  assert.equal(list.ops.shift.check(list.preset(), { k: 1 }), null);
});

test('new list ops: unique keys, one viewBox, defaults valid', () => {
  const boxes = new Set();
  for (const name of ['clear', 'reverse', 'remove', 'shift']) {
    const args = Object.fromEntries(list.ops[name].params.map((p) => [p.name, p.default]));
    assert.equal(list.ops[name].check?.(list.preset(), args) ?? null, null);
    for (const frame of run(list.preset(), name, args).frames) {
      const svg = renderLinked(frame.state, frame.hl);
      const keys = svg.match(/data-key="[^"]+"/g);
      assert.equal(new Set(keys).size, keys.length, `${name}: ${frame.msg}`);
      boxes.add(svg.match(/viewBox="([^"]+)"/)[1]);
    }
  }
  assert.equal(boxes.size, 1);
  assert.match(list.ops.reverse.time, /O\(n\)/);
});
