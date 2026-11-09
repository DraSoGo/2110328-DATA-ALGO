import test from 'node:test';
import assert from 'node:assert/strict';
import map, { PRESET } from '../src/learn/data/map.js';
import { LIMIT } from '../src/learn/data/rbtree.js';
import { renderTree } from '../src/learn/render/tree.js';
import { assertRedBlack, inorder, keyOf, keys, rng, runGen } from './helpers/rb-check.mjs';

const runOp = (name, state, args) => {
  assert.equal(map.ops[name].check(state, args), null);
  return runGen((s) => map.ops[name].run(s, args), state);
};
const entries = (state) => inorder(state).map((n) => [n.k, n.v]);
const valueOf = (state, k) => state.nodes.find((n) => n.k === k)?.v;

test('preset is a red-black tree of key:value labels', () => {
  const s = map.preset();
  assert.deepEqual(entries(s), PRESET);
  assertRedBlack(s);
  assert.equal(s.nodes.find((n) => n.k === 40).label, '40:16');
  assert.match(map.summary, /red-black tree/);
  assert.match(renderTree(s), /class="node is-black is-long"/);
});

test('m[k] = v inserts with a default 0 first, then assigns; on an existing key it overwrites', () => {
  const add = runOp('operator[]', map.preset(), { k: 80, v: 64 });
  assert.equal(add.frames.find((f) => /Attach a new red node 80/.test(f.msg)).state.nodes.find((n) => n.k === 80).label, '80:0');
  assert.match(add.frames.at(-1).msg, /inserted 80 with the default value 0.*stores 64/);
  assert.equal(valueOf(add.state, 80), 64);
  assert.match(add.text, /case 1, recolor/);
  assertRedBlack(add.state);
  const over = runOp('operator[]', map.preset(), { k: 30, v: 7 });
  assert.match(over.frames.at(-1).msg, /existing value 9; the assignment overwrites it with 7/);
  assert.equal(valueOf(over.state, 30), 7);
  assert.equal(over.state.nodes.length, PRESET.length);
  assert.equal(keyOf(over.state, 30), keyOf(map.preset(), 30), 'same node, new value');
  assertRedBlack(over.state);
});

test('insert does not overwrite an existing key', () => {
  const kept = runOp('insert', map.preset(), { k: 30, v: 99 });
  assert.equal(valueOf(kept.state, 30), 9);
  assert.match(kept.frames.at(-1).msg, /insert never overwrites: key 30 keeps its value 9/);
  const added = runOp('insert', map.preset(), { k: 35, v: 99 });
  assert.equal(valueOf(added.state, 35), 99);
  assert.equal(added.state.nodes.find((n) => n.k === 35).label, '35:99');
  assertRedBlack(added.state);
});

test('find reports the mapped value; erase removes the pair; limits', () => {
  const hit = runOp('find', map.preset(), { k: 50 });
  assert.match(hit.frames.at(-1).msg, /it->first is 50 and it->second is 25/);
  assert.match(runOp('find', map.preset(), { k: 55 }).frames.at(-1).msg, /end\(\)/);
  const gone = runOp('erase', map.preset(), { k: 40 });
  assert.deepEqual(entries(gone.state), PRESET.filter(([k]) => k !== 40));
  assertRedBlack(gone.state);
  let s = map.preset();
  for (let k = 1; s.nodes.length < LIMIT; k += 1) s = runOp('operator[]', s, { k, v: k }).state;
  assert.match(map.ops['operator[]'].check(s, { k: 99, v: 1 }), /at most 15/);
  assert.match(map.ops.insert.check(s, { k: 99, v: 1 }), /at most 15/);
  assert.equal(map.ops['operator[]'].check(s, { k: 10, v: 1 }), null);
  assert.equal(map.ops.insert.check(s, { k: 10, v: 1 }), null);
});

test('random module ops keep a valid red-black tree that matches a Map', () => {
  for (const seed of [8, 64, 1234]) {
    const next = rng(seed);
    let state = map.preset();
    const ref = new Map(PRESET);
    for (let step = 0; step < 500; step += 1) {
      const k = Math.floor(next() * 31);
      const v = Math.floor(next() * 100);
      const r = next();
      const op = r < 0.3 ? 'operator[]' : r < 0.5 ? 'insert' : r < 0.85 ? 'erase' : 'find';
      if (map.ops[op].check(state, { k, v })) continue;
      const out = runOp(op, state, { k, v });
      state = out.state;
      if (op === 'operator[]') ref.set(k, v);
      if (op === 'insert' && !ref.has(k)) ref.set(k, v);
      if (op === 'erase') ref.delete(k);
      if (op === 'find') assert.equal(out.text.match(/it->second is (\d+)/)?.[1], ref.has(k) ? String(ref.get(k)) : undefined);
      assertRedBlack(state);
      assert.deepEqual(entries(state), [...ref].sort((a, b) => a[0] - b[0]), `seed ${seed} step ${step} ${op} ${k} ${v}`);
      assert.deepEqual(keys(state), [...ref.keys()].sort((a, b) => a - b));
    }
  }
});

test('count, lower_bound, upper_bound match a sorted reference', () => {
  const s = map.preset();
  const ks = PRESET.map(([k]) => k);
  for (let k = 0; k <= 80; k += 5) {
    const lb = runOp('lower_bound', s, { k });
    const ub = runOp('upper_bound', s, { k });
    const wl = ks.find((v) => v >= k);
    const wu = ks.find((v) => v > k);
    assert.equal(lb.frames.at(-1).hl.done?.[0], wl === undefined ? undefined : keyOf(s, wl), `lower_bound ${k}`);
    assert.equal(ub.frames.at(-1).hl.done?.[0], wu === undefined ? undefined : keyOf(s, wu), `upper_bound ${k}`);
    assert.deepEqual(lb.state.nodes, s.nodes);
    assert.match(runOp('count', s, { k }).frames.at(-1).msg, ks.includes(k) ? /count\(\d+\) = 1/ : /count\(\d+\) = 0/);
  }
  assert.match(runOp('lower_bound', s, { k: 45 }).frames.at(-1).msg, /50:25/);
});

test('at returns the value of a present key; a missing key throws out_of_range and changes nothing', () => {
  const hit = runOp('at', map.preset(), { k: 30 });
  assert.match(hit.frames.at(-1).msg, /value 9/);
  assert.deepEqual(hit.frames.at(-1).hl.done, [keyOf(map.preset(), 30)]);
  const miss = runOp('at', map.preset(), { k: 31 });
  assert.match(miss.frames.at(-1).msg, /std::out_of_range/);
  assert.match(miss.frames.at(-1).msg, /std::map::at throws/);
  assert.deepEqual(miss.state.nodes, map.preset().nodes);
  assert.match(runOp('at', map.preset(), { k: 80 }).frames.at(-1).msg, /out_of_range/);
});

test('clear leaves a valid empty map; ops on it are safe; defaults pass check', () => {
  const out = runOp('clear', map.preset(), {});
  assert.equal(out.state.root, null);
  assert.deepEqual(out.state.nodes, []);
  assertRedBlack(out.state);
  assert.match(runOp('clear', out.state, {}).frames.at(-1).msg, /empty/);
  assert.match(runOp('at', out.state, { k: 1 }).frames.at(-1).msg, /out_of_range/);
  assert.match(runOp('lower_bound', out.state, { k: 1 }).frames.at(-1).msg, /end\(\)/);
  const again = runOp('operator[]', out.state, { k: 3, v: 4 });
  assert.deepEqual(entries(again.state), [[3, 4]]);
  assertRedBlack(again.state);
  for (const name of ['count', 'lower_bound', 'upper_bound', 'at', 'clear']) {
    assert.match(map.ops[name].time, /^O\(/);
    const args = Object.fromEntries(map.ops[name].params.map((p) => [p.name, p.default]));
    assert.equal(map.ops[name].check(map.preset(), args), null);
  }
});

test('random count/bounds/at/clear keep map and reference in step', () => {
  const next = rng(321);
  let state = map.preset();
  const ref = new Map(PRESET);
  for (let step = 0; step < 300; step += 1) {
    const k = Math.floor(next() * 31);
    const r = next();
    const op = r < 0.4 ? 'insert' : r < 0.6 ? 'erase' : r < 0.7 ? 'upper_bound' : r < 0.8 ? 'lower_bound' : r < 0.9 ? 'at' : r < 0.97 ? 'count' : 'clear';
    const args = op === 'clear' ? {} : op === 'insert' ? { k, v: step % 100 } : { k };
    if (map.ops[op].check(state, args)) continue;
    const out = runOp(op, state, args);
    state = out.state;
    if (op === 'insert' && !ref.has(k)) ref.set(k, step % 100);
    if (op === 'erase') ref.delete(k);
    if (op === 'clear') ref.clear();
    const sorted = [...ref.keys()].sort((a, b) => a - b);
    const last = out.frames.at(-1);
    if (op === 'upper_bound' || op === 'lower_bound') {
      const want = sorted.find((v) => (op === 'upper_bound' ? v > k : v >= k));
      assert.equal(last.hl.done?.[0], want === undefined ? undefined : keyOf(state, want));
    }
    if (op === 'at') assert.match(last.msg, ref.has(k) ? new RegExp(`value ${ref.get(k)}`) : /out_of_range/);
    assertRedBlack(state);
    assert.deepEqual(keys(state), sorted);
  }
});
