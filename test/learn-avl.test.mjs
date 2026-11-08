import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import avl, { LIMIT, MAX_DEPTH } from '../src/learn/data/avl.js';
import { layoutTree } from '../src/learn/render/tree.js';

const byKey = (state) => new Map(state.nodes.map((n) => [n.key, n]));
const byLabel = (state, x) => state.nodes.find((n) => n.label === x).key;
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
const signed = (b) => (b > 0 ? `+${b}` : String(b));

// BST order, no orphans, |balance| <= 1, stored heights and badges correct.
const assertAvl = (state) => {
  const map = byKey(state);
  assert.equal(map.size, state.nodes.length);
  let reached = 0;
  const walk = (key, lo, hi) => {
    if (key === null) return -1;
    reached += 1;
    const node = map.get(key);
    assert.ok(node.label > lo && node.label < hi, `order at ${node.label}`);
    const hL = walk(node.left, lo, node.label);
    const hR = walk(node.right, node.label, hi);
    assert.equal(node.h, 1 + Math.max(hL, hR), `stored height of ${node.label}`);
    assert.ok(Math.abs(hR - hL) <= 1, `balance at ${node.label}`);
    assert.equal(node.badge, signed(hR - hL), `badge of ${node.label}`);
    return node.h;
  };
  walk(state.root, -Infinity, Infinity);
  assert.equal(reached, state.nodes.length, 'no orphan nodes');
  assert.ok(state.nodes.length <= LIMIT);
};
const assertFrames = (frames) => {
  assert.ok(frames.length < 2000);
  for (const frame of frames) {
    assert.ok(frame.msg);
    const keys = frame.state.nodes.map((n) => n.key);
    assert.equal(new Set(keys).size, keys.length, 'unique keys');
    assert.ok(layoutTree(frame.state).depth <= MAX_DEPTH, `depth within ${MAX_DEPTH}`);
  }
};
const runOp = (name, state, args) => {
  assert.equal(avl.ops[name].check(state, args), null);
  const frames = record(avl.ops[name].run(structuredClone(state), args));
  assertFrames(frames);
  return { frames, state: frames.at(-1).state };
};
const empty = () => ({ ...avl.preset(), nodes: [], root: null, nextKey: 0 });
const build = (values) => values.reduce((s, x) => runOp('insert', s, { x }).state, empty());
const msgs = (frames) => frames.map((f) => f.msg).join('\n');
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test('preset is a valid AVL tree', () => {
  const s = avl.preset();
  assert.deepEqual(inorder(s), [10, 20, 30, 40, 50, 60]);
  assertAvl(s);
});

test('default insert walks down, updates heights on the way up, then fixes an LR imbalance', () => {
  const { frames, state } = runOp('insert', avl.preset(), { x: 55 });
  assert.equal(frames.filter((f) => f.hl.compare?.length && /go to/.test(f.msg)).length, 3);
  const text = msgs(frames);
  assert.match(text, /Attach a new leaf 55/);
  assert.match(text, /Back up at 50: .*height becomes 1, balance = \+1/);
  assert.match(text, /Back up at 60: hL = 1, hR = -1, balance = -2: unbalanced!.*case LR/);
  assert.match(text, /LR step 1: rotate_right_child\(r->left\)/);
  assert.match(text, /LR step 2: rotate_left_child\(r\)/);
  assert.deepEqual(inorder(state), [10, 20, 30, 40, 50, 55, 60]);
  const map = byKey(state);
  const k55 = byLabel(state, 55);
  assert.equal(map.get('a').right, k55); // 55 is the new subtree root, keys survive rotations
  assert.equal(map.get(k55).left, 'f');
  assert.equal(map.get(k55).right, 'c');
  assertAvl(state);
});

test('each rotation case appears in crafted sequences', () => {
  const cases = [
    { values: [3, 2, 1], kind: 'LL', top: 2 },
    { values: [1, 2, 3], kind: 'RR', top: 2 },
    { values: [3, 1, 2], kind: 'LR', top: 2 },
    { values: [1, 3, 2], kind: 'RL', top: 2 },
  ];
  for (const { values, kind, top } of cases) {
    const before = build(values.slice(0, 2));
    const { frames, state } = runOp('insert', before, { x: values[2] });
    const text = msgs(frames);
    assert.match(text, new RegExp(`case ${kind} \\(slide case`), kind);
    const rotations = frames.filter((f) => /rotate_(left|right)_child/.test(f.msg));
    assert.equal(rotations.length, kind[0] === kind[1] ? 1 : 2, `${kind} rotation frames`);
    assert.equal(byKey(state).get(state.root).label, top);
    assertAvl(state);
  }
  // The slide example: 1, 2, 3, 6, 8, 4, 15, 14 ends with 3 at the root.
  const slide = build([1, 2, 3, 6, 8, 4, 15, 14]);
  assert.equal(byKey(slide).get(slide.root).label, 3);
  assert.deepEqual(inorder(slide), [1, 2, 3, 4, 6, 8, 14, 15]);
  assertAvl(slide);
});

test('erase rebalances too, including the single-rotation case where the child has balance 0', () => {
  // preset: erasing 60 leaves 40 left-heavy (-2) with left child 20 at balance 0 -> LL single rotation.
  const s = runOp('erase', build([40, 20, 60, 10, 30]), { x: 60 });
  assert.match(msgs(s.frames), /balance = -2: unbalanced! Its left child 20 has balance 0, so this is case LL/);
  assert.equal(byKey(s.state).get(s.state.root).label, 20);
  assertAvl(s.state);
  // RL during erase
  const rl = runOp('erase', build([20, 10, 40, 30]), { x: 10 });
  assert.match(msgs(rl.frames), /case RL/);
  assert.equal(byKey(rl.state).get(rl.state.root).label, 30);
  assertAvl(rl.state);
});

test('erase cases: leaf, one child, two children via the successor', () => {
  const leaf = runOp('erase', avl.preset(), { x: 10 });
  assert.match(leaf.frames.find((f) => /leaf/.test(f.msg)).msg, /cut it off/);
  assert.deepEqual(inorder(leaf.state), [20, 30, 40, 50, 60]);
  assertAvl(leaf.state);
  const one = runOp('erase', avl.preset(), { x: 60 });
  assert.match(msgs(one.frames), /one child: its parent links straight to 50/);
  assertAvl(one.state);
  const two = runOp('erase', avl.preset(), { x: 20 });
  assert.match(msgs(two.frames), /copy 30 into the node that held 20/);
  assert.equal(byKey(two.state).get('b').label, 30);
  assert.deepEqual(inorder(two.state), [10, 30, 40, 50, 60]);
  assertAvl(two.state);
  const root = runOp('erase', avl.preset(), { x: 40 });
  assert.equal(byKey(root.state).get('a').label, 50);
  assertAvl(root.state);
});

test('find, missing keys, duplicates, empty tree and the size limit', () => {
  const hit = runOp('find', avl.preset(), { x: 50 });
  assert.deepEqual(hit.frames.at(-1).hl.done, ['f']);
  assert.match(runOp('find', avl.preset(), { x: 51 }).frames.at(-1).msg, /not in the tree/);
  assert.match(runOp('erase', avl.preset(), { x: 51 }).frames.at(-1).msg, /nothing to erase/);
  const dup = runOp('insert', avl.preset(), { x: 30 });
  assert.equal(dup.state.nodes.length, 6);
  assert.match(dup.frames.at(-1).msg, /unique/);
  const one = build([7]);
  assert.equal(one.nodes[0].h, 0);
  assert.equal(runOp('erase', one, { x: 7 }).state.root, null);
  const full = build(Array.from({ length: LIMIT }, (_, i) => i));
  assert.equal(full.nodes.length, LIMIT);
  assertAvl(full);
  assert.match(avl.ops.insert.check(full, { x: 99 }), /at most 15/);
  assert.equal(avl.ops.insert.check(full, { x: 3 }), null);
});

test('random insert/erase sequences keep every AVL invariant after every op', () => {
  for (const seed of [1, 7, 42, 2026]) {
    const next = rng(seed);
    let state = empty();
    const ref = new Set();
    const seen = new Set();
    for (let step = 0; step < 600; step += 1) {
      const x = Math.floor(next() * 31);
      const r = next();
      const op = r < 0.55 ? 'insert' : r < 0.9 ? 'erase' : 'find';
      if (op === 'insert' && avl.ops.insert.check(state, { x })) continue;
      const out = runOp(op, state, { x });
      state = out.state;
      for (const kind of ['LL', 'RR', 'LR', 'RL']) if (out.frames.some((f) => f.msg.includes(`case ${kind} `))) seen.add(kind);
      if (op === 'insert') ref.add(x);
      if (op === 'erase') ref.delete(x);
      assertAvl(state);
      assert.deepEqual(inorder(state), [...ref].sort((a, b) => a - b), `seed ${seed} step ${step} ${op} ${x}`);
    }
    assert.equal(seen.size, 4, `seed ${seed} saw ${[...seen]}`);
  }
});
