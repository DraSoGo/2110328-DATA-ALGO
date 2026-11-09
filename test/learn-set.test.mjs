import test from 'node:test';
import assert from 'node:assert/strict';
import set, { PRESET } from '../src/learn/data/set.js';
import { LIMIT } from '../src/learn/data/rbtree.js';
import { assertRedBlack, keyOf, keys, rng, runGen } from './helpers/rb-check.mjs';

const runOp = (name, state, args) => {
  assert.equal(set.ops[name].check(state, args), null);
  return runGen((s) => set.ops[name].run(s, args), state);
};

test('summary says std::set is typically a red-black tree; the preset is one', () => {
  assert.match(set.summary, /std::set is typically a red-black tree/);
  const s = set.preset();
  assert.deepEqual(keys(s), PRESET);
  assertRedBlack(s);
  assert.equal(set.declare, 'std::set<int> s = {10, 20, 30, 40, 50, 60, 70};');
});

test('default insert shows a recolor and a rotation; default erase shows the double-black cases', () => {
  const ins = runOp('insert', set.preset(), { x: 80 });
  assert.match(ins.text, /case 1, recolor/);
  assert.match(ins.text, /case 3, rotate the grandparent/);
  assert.deepEqual(keys(ins.state), [...PRESET, 80]);
  assertRedBlack(ins.state);
  const del = runOp('erase', set.preset(), { x: 10 });
  assert.match(del.text, /double black/);
  assert.match(del.text, /case 1/);
  assert.deepEqual(keys(del.state), PRESET.slice(1));
  assertRedBlack(del.state);
});

test('duplicate insert changes nothing; size limit', () => {
  const dup = runOp('insert', set.preset(), { x: 30 });
  assert.match(dup.frames.at(-1).msg, /distinct keys, so insert\(30\) changes nothing/);
  assert.deepEqual(dup.state.nodes, set.preset().nodes);
  let s = set.preset();
  for (let x = 1; s.nodes.length < LIMIT; x += 1) s = runOp('insert', s, { x }).state;
  assert.match(set.ops.insert.check(s, { x: 99 }), /at most 15/);
  assert.equal(set.ops.insert.check(s, { x: 10 }), null);
});

test('find and lower_bound match a sorted reference', () => {
  const s = set.preset();
  for (let x = 0; x <= 80; x += 5) {
    const found = runOp('find', s, { x });
    assert.deepEqual(found.frames.at(-1).hl.done ?? [], PRESET.includes(x) ? [keyOf(s, x)] : [], `find ${x}`);
    const lb = runOp('lower_bound', s, { x });
    const want = PRESET.find((v) => v >= x);
    assert.deepEqual(lb.frames.at(-1).hl.done ?? [], want === undefined ? [] : [keyOf(s, want)], `lower_bound ${x}`);
    assert.deepEqual(lb.state.nodes, s.nodes, 'lookups do not change the tree');
  }
});

test('random module ops keep a valid red-black tree that matches a Set', () => {
  for (const seed of [5, 17, 404]) {
    const next = rng(seed);
    let state = set.preset();
    const ref = new Set(PRESET.map(Number));
    for (let step = 0; step < 500; step += 1) {
      const x = Math.floor(next() * 31);
      const r = next();
      const op = r < 0.45 ? 'insert' : r < 0.8 ? 'erase' : r < 0.9 ? 'find' : 'lower_bound';
      if (set.ops[op].check(state, { x })) continue;
      const out = runOp(op, state, { x });
      state = out.state;
      if (op === 'insert') ref.add(x);
      if (op === 'erase') ref.delete(x);
      const sorted = [...ref].sort((a, b) => a - b);
      if (op === 'find') assert.deepEqual(out.frames.at(-1).hl.done ?? [], ref.has(x) ? [keyOf(state, x)] : []);
      if (op === 'lower_bound') {
        const want = sorted.find((v) => v >= x);
        assert.deepEqual(out.frames.at(-1).hl.done ?? [], want === undefined ? [] : [keyOf(state, want)]);
      }
      assertRedBlack(state);
      assert.deepEqual(keys(state), sorted, `seed ${seed} step ${step} ${op} ${x}`);
    }
  }
});

test('upper_bound, count and begin match a sorted reference', () => {
  const s = set.preset();
  for (let x = 0; x <= 80; x += 5) {
    const ub = runOp('upper_bound', s, { x });
    const want = PRESET.find((v) => v > x);
    assert.deepEqual(ub.frames.at(-1).hl.done ?? [], want === undefined ? [] : [keyOf(s, want)], `upper_bound ${x}`);
    assert.deepEqual(ub.state.nodes, s.nodes);
    const c = runOp('count', s, { x });
    assert.match(c.frames.at(-1).msg, PRESET.includes(x) ? /count\(\d+\) = 1/ : /count\(\d+\) = 0/);
  }
  const b = runOp('begin', s, {});
  assert.deepEqual(b.frames.at(-1).hl.done, [keyOf(s, 10)]);
  assert.match(b.text, /keep going left/);
});

test('clear leaves a valid empty tree; ops on it are safe; defaults pass check', () => {
  const out = runOp('clear', set.preset(), {});
  assert.equal(out.state.root, null);
  assert.deepEqual(out.state.nodes, []);
  assertRedBlack(out.state);
  for (const name of ['begin', 'clear']) assert.match(runOp(name, out.state, {}).frames.at(-1).msg, /empty/);
  assert.match(runOp('upper_bound', out.state, { x: 1 }).frames.at(-1).msg, /end\(\)/);
  assert.match(runOp('count', out.state, { x: 1 }).frames.at(-1).msg, /= 0/);
  const again = runOp('insert', out.state, { x: 3 });
  assert.deepEqual(keys(again.state), [3]);
  assertRedBlack(again.state);
  for (const name of ['upper_bound', 'count', 'begin', 'clear']) {
    assert.match(set.ops[name].time, /^O\(/);
    const args = Object.fromEntries(set.ops[name].params.map((p) => [p.name, p.default]));
    assert.equal(set.ops[name].check(set.preset(), args), null);
  }
});

test('random upper_bound/count/clear keep set and reference in step', () => {
  const next = rng(99);
  let state = set.preset();
  const ref = new Set(PRESET);
  for (let step = 0; step < 300; step += 1) {
    const x = Math.floor(next() * 31);
    const r = next();
    const op = r < 0.45 ? 'insert' : r < 0.7 ? 'erase' : r < 0.8 ? 'upper_bound' : r < 0.97 ? 'count' : 'clear';
    if (set.ops[op].check(state, { x })) continue;
    const out = runOp(op, state, op === 'clear' ? {} : { x });
    state = out.state;
    if (op === 'insert') ref.add(x);
    if (op === 'erase') ref.delete(x);
    if (op === 'clear') ref.clear();
    const sorted = [...ref].sort((a, b) => a - b);
    if (op === 'upper_bound') {
      const want = sorted.find((v) => v > x);
      assert.deepEqual(out.frames.at(-1).hl.done ?? [], want === undefined ? [] : [keyOf(state, want)]);
    }
    if (op === 'count') assert.match(out.frames.at(-1).msg, ref.has(x) ? /= 1/ : /= 0/);
    assertRedBlack(state);
    assert.deepEqual(keys(state), sorted);
  }
});
