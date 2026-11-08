import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTree, emptyTree, erase, insert, LIMIT, lowerBound, find } from '../src/learn/data/rbtree.js';
import { assertRedBlack, byKey, keyOf, keys, rng, runGen } from './helpers/rb-check.mjs';

const build = (values) => buildTree(values.map((k) => [k]), false);
const ins = (state, k) => runGen((s) => insert(s, k), state);
const del = (state, k) => runGen((s) => erase(s, k), state);
const colors = (state) => Object.fromEntries(state.nodes.map((n) => [n.k, n.color[0]]));
const rootK = (state) => byKey(state).get(state.root).k;

test('buildTree runs the real insert and yields valid trees', () => {
  const s = build([10, 20, 30, 40, 50, 60, 70]);
  assert.deepEqual(keys(s), [10, 20, 30, 40, 50, 60, 70]);
  assertRedBlack(s);
  assertRedBlack(emptyTree(false));
});

test('insert: empty tree, red leaf under a black parent, and the root rule', () => {
  const one = ins(emptyTree(false), 5);
  assert.match(one.frames[0].msg, /becomes the root \(new nodes start red\)/);
  assert.equal(one.frames[0].state.nodes[0].color, 'red');
  assert.match(one.text, /The root must be black: recolor 5 black/);
  assertRedBlack(one.state);
  const leaf = ins(build([10]), 5);
  assert.match(leaf.text, /Attach a new red node 5 as the left child of 10/);
  assert.match(leaf.text, /parent 10 is black: .*nothing more to fix/);
  assert.equal(leaf.frames.filter((f) => /Rotate|Recolor/.test(f.msg)).length, 0);
});

test('insert fix-up case 1: red uncle -> recolor, and the red may reach the root', () => {
  const { text, state, frames } = ins(build([10, 20, 30]), 40); // 20B(10R, 30R)
  assert.match(text, /Red 40 has a red parent 30, and the uncle 10 is red too: case 1, recolor/);
  assert.match(text, /Recolor: parent 30 and uncle 10 become black, grandparent 20 becomes red/);
  assert.match(text, /The root must be black: recolor 20 black/);
  assert.equal(frames.filter((f) => /^Rotate/.test(f.msg)).length, 0);
  assert.deepEqual(colors(state), { 10: 'b', 20: 'b', 30: 'b', 40: 'r' });
  assertRedBlack(state);
});

test('insert fix-up case 3 (line) and case 2 (triangle), on both sides', () => {
  for (const [values, k, triangle] of [[[10, 20], 30, false], [[30, 20], 10, false], [[10, 30], 20, true], [[30, 10], 20, true]]) {
    const { text, state, frames } = ins(build(values), k);
    if (triangle) {
      assert.match(text, /is an inner child \(a triangle\): case 2, rotate the parent to make a line/);
      assert.match(text, /so the two reds now form a line/);
    } else {
      assert.doesNotMatch(text, /case 2/);
      assert.match(text, /is an outer child \(a line\): case 3, rotate the grandparent and recolor/);
    }
    assert.match(text, /Rotate (left|right) at grandparent/);
    assert.match(text, /Recolor: 20 \(now on top\) becomes black/);
    assert.equal(frames.filter((f) => /^Rotate/.test(f.msg)).length, triangle ? 2 : 1);
    assert.equal(rootK(state), 20);
    assert.deepEqual(colors(state), { 10: 'r', 20: 'b', 30: 'r' });
    assertRedBlack(state);
  }
});

test('rotations keep node keys, so nodes animate', () => {
  const before = build([10, 30]);
  const ids = Object.fromEntries(before.nodes.map((n) => [n.k, n.key]));
  const { state } = ins(before, 20);
  for (const [k, key] of Object.entries(ids)) assert.equal(keyOf(state, Number(k)), key);
});

test('erase: red node, black node with a red child, and the empty tree', () => {
  const red = del(build([10, 20, 30]), 30);
  assert.match(red.text, /30 has no children: unlink it \(it was red\)/);
  assert.match(red.text, /A red node left its spot.*nothing to fix/);
  assertRedBlack(red.state);
  const s = build([20, 10, 30, 5]); // 20B(10B(5R), 30B)
  const absorb = del(s, 10);
  assert.match(absorb.text, /10 has one child: its parent links straight to 5/);
  assert.match(absorb.text, /5 is red: recolor it black, which absorbs the extra black/);
  assert.deepEqual(colors(absorb.state), { 5: 'b', 20: 'b', 30: 'b' });
  assertRedBlack(absorb.state);
  const last = del(build([1]), 1);
  assert.equal(last.state.root, null);
  assert.match(last.frames.at(-1).msg, /now empty/);
  assert.match(del(build([1, 2]), 7).frames.at(-1).msg, /nothing to erase/);
});

test('erase with two children relinks the successor node into place', () => {
  const s = build([10, 20, 30, 40, 50, 60, 70]); // 20B(10B, 40R(30B, 60B(50R, 70R)))
  const succ = keyOf(s, 50);
  const { text, state } = del(s, 40);
  assert.match(text, /40 has two children/);
  assert.match(text, /Keep going left to 50/);
  assert.match(text, /move the successor node 50 into its place, taking its color red/);
  assert.equal(keyOf(state, 50), succ);
  assert.equal(byKey(state).get(state.root).right, succ);
  assert.deepEqual(keys(state), [10, 20, 30, 50, 60, 70]);
  assertRedBlack(state);
});

test('erase fix-up cases 1-4 each appear, on both sides', () => {
  const black3 = (extra) => {
    let s = build([20, 10, 30, 40]);
    s = del(s, 40).state; // 20B(10B, 30B)
    for (const k of extra) s = ins(s, k).state;
    return s;
  };
  // case 2 climbing to the root
  const c2 = del(black3([]), 10);
  assert.match(c2.text, /The empty left link of 20 is double black, its sibling 30 is black with two black children: case 2/);
  assert.match(c2.text, /Recolor: sibling 30 becomes red/);
  assert.match(c2.text, /The extra black reached the root 20/);
  assertRedBlack(c2.state);
  // case 3 then case 4 (right side sibling), and the mirror (left side sibling)
  for (const [extra, gone, near] of [[[25], 10, 25], [[15], 30, 15]]) {
    const out = del(black3(extra), gone);
    assert.match(out.text, new RegExp(`near child ${near} is red and the far child is black: case 3`));
    assert.match(out.text, new RegExp(`Recolor: near child ${near} becomes black`));
    assert.match(out.text, /\(case 4 next\)/);
    assert.match(out.text, /case 4, recolor and rotate/);
    assert.equal(out.frames.filter((f) => /^Rotate/.test(f.msg)).length, 2);
    assert.equal(rootK(out.state), near);
    assertRedBlack(out.state);
  }
  // case 4 directly
  for (const [extra, gone, far] of [[[35], 10, 35], [[5], 30, 5]]) {
    const out = del(black3(extra), gone);
    assert.doesNotMatch(out.text, /case 3/);
    assert.match(out.text, new RegExp(`far child ${far} is red: case 4`));
    assert.match(out.text, /Recolor: sibling \d+ takes the parent's color/);
    assertRedBlack(out.state);
  }
  // case 1: red sibling -> recolor, rotate, then a black-sibling case (preset of set)
  const c1 = del(build([10, 20, 30, 40, 50, 60, 70]), 10);
  assert.match(c1.text, /sibling 40 is red: case 1/);
  assert.match(c1.text, /Recolor: sibling 40 becomes black, parent 20 becomes red/);
  assert.match(c1.text, /Rotate left at 20: the old sibling moves up/);
  assert.match(c1.text, /case 2/);
  assertRedBlack(c1.state);
  const m1 = del(build([70, 60, 50, 40, 30, 20, 10]), 70);
  assert.match(m1.text, /case 1/);
  assert.match(m1.text, /Rotate right at/);
  assertRedBlack(m1.state);
});

test('find and lower_bound', () => {
  const s = build([10, 20, 30, 40, 50]);
  assert.match(runGen((t) => find(t, 30), s).frames.at(-1).msg, /find\(30\) returns an iterator/);
  assert.match(runGen((t) => find(t, 31), s).frames.at(-1).msg, /find returns end\(\)/);
  const lb = runGen((t) => lowerBound(t, 25), s);
  assert.deepEqual(lb.frames.at(-1).hl.done, [keyOf(s, 30)]);
  assert.equal(lb.state.pointers.ans, keyOf(s, 30));
  assert.deepEqual(runGen((t) => lowerBound(t, 30), s).frames.at(-1).hl.done, [keyOf(s, 30)]);
  assert.match(runGen((t) => lowerBound(t, 51), s).frames.at(-1).msg, /returns end\(\)/);
  assert.deepEqual(runGen((t) => lowerBound(t, -5), s).frames.at(-1).hl.done, [keyOf(s, 10)]);
});

test('random insert/erase sequences keep every red-black invariant after every op', () => {
  const seen = new Set();
  for (const seed of [3, 11, 99, 2026]) {
    const next = rng(seed);
    let state = emptyTree(false);
    const ref = new Set();
    for (let step = 0; step < 800; step += 1) {
      const k = Math.floor(next() * 31);
      const adding = next() < 0.6;
      if (adding && !ref.has(k) && ref.size >= LIMIT) continue;
      const out = adding ? ins(state, k) : del(state, k);
      state = out.state;
      for (const m of out.text.matchAll(/case (\d)/g)) seen.add(`${adding ? 'insert' : 'erase'} ${m[1]}`);
      if (adding) ref.add(k);
      else ref.delete(k);
      assertRedBlack(state);
      assert.deepEqual(keys(state), [...ref].sort((a, b) => a - b), `seed ${seed} step ${step}`);
    }
  }
  assert.deepEqual([...seen].sort(), ['erase 1', 'erase 2', 'erase 3', 'erase 4', 'insert 1', 'insert 2', 'insert 3']);
});
