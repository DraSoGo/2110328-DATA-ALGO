import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import bst, { LIMIT, MAX_DEPTH } from '../src/learn/data/bst.js';

const byKey = (state) => new Map(state.nodes.map((n) => [n.key, n]));
const inorder = (state) => {
  const map = byKey(state);
  const out = [];
  const walk = (key) => {
    if (key === null) return;
    walk(map.get(key).left);
    out.push(map.get(key).label);
    walk(map.get(key).right);
  };
  walk(state.root);
  return out;
};
const height = (state) => {
  const map = byKey(state);
  const h = (key) => (key === null ? -1 : 1 + Math.max(h(map.get(key).left), h(map.get(key).right)));
  return h(state.root);
};
// Every node reachable from the root exactly once, every key unique, BST order holds.
const assertValid = (state) => {
  const map = byKey(state);
  assert.equal(map.size, state.nodes.length);
  let reached = 0;
  const walk = (key, lo, hi) => {
    if (key === null) return;
    reached += 1;
    const { label, left, right } = map.get(key);
    assert.ok(label > lo && label < hi, `order at ${label}`);
    walk(left, lo, label);
    walk(right, label, hi);
  };
  walk(state.root, -Infinity, Infinity);
  assert.equal(reached, state.nodes.length, 'no orphan nodes');
  assert.ok(state.nodes.length <= LIMIT && height(state) <= MAX_DEPTH);
};
const runOp = (name, state, args) => {
  assert.equal(bst.ops[name].check(state, args), null);
  const frames = record(bst.ops[name].run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
};
const build = (values) => values.reduce((s, x) => runOp('insert', s, { x }).state, { ...bst.preset(), nodes: [], root: null, nextKey: 0 });
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test('preset is a valid BST', () => {
  const s = bst.preset();
  assert.deepEqual(inorder(s), [10, 20, 30, 40, 50, 60, 70]);
  assertValid(s);
});

test('insert walks down comparing, then attaches', () => {
  const { frames, state } = runOp('insert', bst.preset(), { x: 35 });
  assert.deepEqual(inorder(state), [10, 20, 30, 35, 40, 50, 60, 70]);
  assert.equal(frames.filter((f) => f.hl.compare?.length).length, 3); // 40, 20, 30
  assert.match(frames.at(-1).msg, /attach a new node 35/);
  assert.equal(state.pointers.cur, frames.at(-1).hl.active[0]);
  assert.equal(byKey(state).get('e').right, state.pointers.cur);
});

test('insert into an empty tree and duplicate insert', () => {
  const one = build([5]);
  assert.deepEqual(inorder(one), [5]);
  assert.equal(one.root, one.nodes[0].key);
  const dup = runOp('insert', bst.preset(), { x: 30 });
  assert.equal(dup.state.nodes.length, 7);
  assert.match(dup.frames.at(-1).msg, /unique/);
});

test('erase case 1: leaf', () => {
  const { state, frames } = runOp('erase', bst.preset(), { x: 10 });
  assert.deepEqual(inorder(state), [20, 30, 40, 50, 60, 70]);
  assert.equal(byKey(state).get('b').left, null);
  assert.match(frames.at(-1).msg, /leaf/);
  assertValid(state);
});

test('erase case 2: one child, the child moves up with its subtree', () => {
  const s = build([40, 20, 60, 30, 25]); // 20 has only a right child 30 (with left 25)
  const { state, frames } = runOp('erase', s, { x: 20 });
  assert.deepEqual(inorder(state), [25, 30, 40, 60]);
  const map = byKey(state);
  assert.equal(map.get(state.root).left, s.nodes.find((n) => n.label === 30).key);
  assert.deepEqual(frames.at(-1).hl.moved, [s.nodes.find((n) => n.label === 30).key]);
  assertValid(state);
  // erasing the root with one child replaces the root
  const chain = build([5, 7]);
  const r = runOp('erase', chain, { x: 5 });
  assert.deepEqual(inorder(r.state), [7]);
  assert.equal(r.state.root, chain.nodes.find((n) => n.label === 7).key);
});

test('erase case 3: two children use the successor of the right subtree', () => {
  const { state, frames } = runOp('erase', bst.preset(), { x: 20 });
  assert.deepEqual(inorder(state), [10, 30, 40, 50, 60, 70]);
  assert.equal(byKey(state).get('b').label, 30); // node keeps its identity, takes the successor's value
  assert.equal(byKey(state).get('b').right, null);
  assert.ok(frames.some((f) => /Copy the successor's value 30/.test(f.msg)));
  assertValid(state);
  // root, successor deep in the left spine of the right subtree
  const deep = runOp('erase', bst.preset(), { x: 40 });
  assert.equal(byKey(deep.state).get('a').label, 50);
  assert.deepEqual(inorder(deep.state), [10, 20, 30, 50, 60, 70]);
  // successor with a right child
  const s = build([40, 20, 60, 50, 55]);
  const out = runOp('erase', s, { x: 40 });
  assert.deepEqual(inorder(out.state), [20, 50, 55, 60]);
  assert.equal(byKey(out.state).get(out.state.root).label, 50);
  assertValid(out.state);
});

test('find and erase of a missing key', () => {
  const hit = runOp('find', bst.preset(), { x: 30 });
  assert.equal(hit.state.nodes.length, 7);
  assert.deepEqual(hit.frames.at(-1).hl.done, ['e']);
  const miss = runOp('find', bst.preset(), { x: 31 });
  assert.match(miss.frames.at(-1).msg, /not in the tree/);
  const gone = runOp('erase', bst.preset(), { x: 31 });
  assert.deepEqual(inorder(gone.state), inorder(bst.preset()));
  assert.match(gone.frames.at(-1).msg, /nothing to erase/);
  const empty = runOp('erase', build([]), { x: 1 });
  assert.equal(empty.state.root, null);
});

test('limits: node count and depth', () => {
  let s = build([1, 2, 3, 4, 5, 6]); // chain, depth 5
  assert.equal(height(s), 5);
  assert.match(bst.ops.insert.check(s, { x: 7 }), /deep/);
  assert.equal(bst.ops.insert.check(s, { x: 3 }), null); // duplicate is harmless
  s = build([0, -50, 50, -75, -25, 25, 75, -90, -60, -30, -10, 10, 40, 60, 90]);
  assert.equal(s.nodes.length, LIMIT);
  assert.match(bst.ops.insert.check(s, { x: 99 }), /at most 15/);
});

test('random insert/erase sequences match a Set and stay a valid BST', () => {
  const next = rng(7);
  let state = bst.preset();
  const ref = new Set(inorder(state));
  for (let step = 0; step < 400; step += 1) {
    const x = Math.floor(next() * 30) - 15;
    const op = next() < 0.5 ? 'insert' : next() < 0.8 ? 'erase' : 'find';
    if (op === 'insert' && bst.ops.insert.check(state, { x })) continue;
    state = runOp(op, state, { x }).state;
    if (op === 'insert') ref.add(x);
    if (op === 'erase') ref.delete(x);
    assertValid(state);
    assert.deepEqual(inorder(state), [...ref].sort((a, b) => a - b), `step ${step} ${op} ${x}`);
  }
});
