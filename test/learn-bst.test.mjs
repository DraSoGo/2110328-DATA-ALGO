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

const ptrNames = ['cur', 'parent', 'succ'];
const assertFrames = (frames) => {
  assert.ok(frames.length >= 1 && frames.length < 2000);
  for (const f of frames) {
    assert.ok(f.msg);
    assert.equal(f.line, 0);
    assert.equal(new Set(f.state.nodes.map((n) => n.key)).size, f.state.nodes.length);
    assert.deepEqual(Object.keys(f.state.pointers), ptrNames);
  }
};
const doneLabel = (out) => {
  const done = out.frames.at(-1).hl.done;
  return done?.length ? byKey(out.state).get(done[0]).label : null;
};

test('begin, find_max, bounds and successor match a sorted array', () => {
  const next = rng(11);
  for (let round = 0; round < 40; round += 1) {
    const vals = [...new Set(Array.from({ length: 1 + Math.floor(next() * 10) }, () => Math.floor(next() * 40) - 20))];
    const s = vals.reduce((st, x) => (bst.ops.insert.check(st, { x }) ? st : runOp('insert', st, { x }).state), build([]));
    const sorted = inorder(s);
    const min = runOp('begin', s, {});
    const max = runOp('find_max', s, {});
    assertFrames(min.frames);
    assertFrames(max.frames);
    assert.equal(doneLabel(min), sorted[0]);
    assert.equal(doneLabel(max), sorted.at(-1));
    for (let x = -22; x <= 22; x += 1) {
      const lb = runOp('lower_bound', s, { x });
      const ub = runOp('upper_bound', s, { x });
      assert.equal(doneLabel(lb), sorted.find((v) => v >= x) ?? null, `lower_bound ${x}`);
      assert.equal(doneLabel(ub), sorted.find((v) => v > x) ?? null, `upper_bound ${x}`);
      assert.deepEqual(lb.state.nodes, s.nodes);
      const su = runOp('successor', s, { x });
      assertFrames(su.frames);
      assert.equal(doneLabel(su), sorted.includes(x) ? (sorted.find((v) => v > x) ?? null) : null, `successor ${x}`);
    }
  }
});

test('successor shows both cases and the end()', () => {
  const right = runOp('successor', bst.preset(), { x: 30 }); // no right child: climb to 40
  assert.match(right.frames.map((f) => f.msg).join('\n'), /right child of 20/);
  assert.equal(doneLabel(right), 40);
  const down = runOp('successor', bst.preset(), { x: 40 });
  assert.match(down.frames.map((f) => f.msg).join('\n'), /minimum of the right subtree/);
  assert.equal(doneLabel(down), 50);
  assert.match(runOp('successor', bst.preset(), { x: 70 }).frames.at(-1).msg, /end\(\)/);
  assert.match(runOp('successor', bst.preset(), { x: 31 }).frames.at(-1).msg, /not in the tree/);
});

test('empty tree: begin, find_max, bounds, clear', () => {
  const e = build([]);
  for (const name of ['begin', 'find_max', 'clear']) assert.match(runOp(name, e, {}).frames.at(-1).msg, /empty/);
  assert.match(runOp('lower_bound', e, { x: 1 }).frames.at(-1).msg, /end\(\)/);
});

test('clear deletes in post-order and leaves a valid empty tree that accepts inserts', () => {
  const out = runOp('clear', bst.preset(), {});
  assertFrames(out.frames);
  assert.equal(out.state.root, null);
  assert.deepEqual(out.state.nodes, []);
  assert.equal(out.frames.length, 7 * 2 + 1);
  assert.deepEqual(out.frames.filter((f) => /^Visit/.test(f.msg)).map((f) => f.msg.match(/Visit (\d+)/)[1]), ['10', '30', '20', '50', '70', '60', '40']);
  assertValid(out.state);
  assert.deepEqual(inorder(runOp('insert', out.state, { x: 5 }).state), [5]);
});

test('new ops: defaults have Big O and code placeholders', () => {
  for (const name of ['begin', 'find_max', 'lower_bound', 'upper_bound', 'successor', 'clear']) {
    assert.match(bst.ops[name].time, /^O\(/);
    const args = Object.fromEntries(bst.ops[name].params.map((p) => [p.name, p.default]));
    assert.equal(bst.ops[name].check(bst.preset(), args), null);
    assertFrames(runOp(name, bst.preset(), args).frames);
  }
});
