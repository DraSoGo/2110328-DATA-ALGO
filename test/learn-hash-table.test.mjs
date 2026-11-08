import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import table, { LIMIT, keys, nextPrime } from '../src/learn/data/hash-table.js';
import { renderBuckets } from '../src/learn/render/buckets.js';

function run(state, opName, args = {}) {
  const op = table.ops[opName];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}

// Every key must sit in bucket key mod m, with no duplicates.
function assertConsistent(state) {
  const m = state.buckets.length;
  state.buckets.forEach((bucket, i) => bucket.forEach((cell) => assert.equal(cell.value % m, i, `${cell.value} in bucket ${i} of ${m}`)));
  assert.equal(state.tmp.length, 0);
}

const sorted = (list) => [...list].sort((a, b) => a - b);

test('preset: 5 buckets with a collision chain', () => {
  const state = table.preset();
  assert.equal(state.buckets.length, 5);
  assert.deepEqual(state.buckets[2].map((cell) => cell.value), [12, 7, 22]);
  assertConsistent(state);
});

test('fixed op sequence matches a Set reference, including a rehash', () => {
  let state = table.preset();
  const ref = new Set([12, 7, 9, 22]);
  const steps = [
    ['insert', 17], ['insert', 7], ['find', 17], ['erase', 12], ['erase', 50], ['insert', 3], ['insert', 40],
    ['insert', 55], ['insert', 99], ['erase', 9], ['insert', 1], ['find', 99], ['insert', 33],
  ];
  let rehashed = 0;
  for (const [op, x] of steps) {
    const result = run(state, op, { x });
    if (result.problem) assert.fail(`${op} ${x}: ${result.problem}`);
    if (result.frames.some((frame) => /rehash\(/.test(frame.msg))) rehashed += 1;
    state = result.state;
    if (op === 'insert') ref.add(x);
    if (op === 'erase') ref.delete(x);
    assert.deepEqual(sorted(keys(state)), sorted(ref), `${op} ${x}`);
    assertConsistent(state);
  }
  assert.equal(rehashed, 1);
  assert.equal(state.buckets.length, 11);
});

test('hash computation and chain walk appear in the messages', () => {
  const { frames } = run(table.preset(), 'insert', { x: 17 });
  const msgs = frames.map((frame) => frame.msg);
  assert.match(msgs[0], /^h\(17\) = 17 mod 5 = 2: look in bucket 2 \(chain of 3 keys\)/);
  assert.match(msgs[1], /node 0: 12 != 17/);
  assert.match(msgs[3], /node 2: 22 != 17/);
  assert.match(msgs[4], /end of the chain/);
  assert.match(msgs[5], /load_factor\(\) = 4\/5 = 0\.80 <= max_load_factor 1\.0/);
  assert.match(msgs.at(-1), /Append 17 at the end of bucket 2/);
  assert.deepEqual(frames[0].hl.bucket, [2]);
});

test('load factor: 1.0 does not rehash, above 1.0 does, before the new key goes in', () => {
  let state = run(table.preset(), 'insert', { x: 1 }).state; // n = 5, 5/5 = 1.0
  let result = run(state, 'insert', { x: 2 }); // checks 5/5 = 1.0 <= 1.0: no rehash
  assert.equal(result.state.buckets.length, 5);
  assert.equal(result.frames.some((frame) => /rehash\(/.test(frame.msg)), false);
  state = result.state; // n = 6, 6/5 = 1.2
  result = run(state, 'insert', { x: 3 });
  assert.equal(result.state.buckets.length, 11);
  const msgs = result.frames.map((frame) => frame.msg);
  assert.ok(msgs.some((msg) => /6\/5 = 1\.20 > max_load_factor 1\.0.*rehash\(10\)/.test(msg)));
  assert.ok(msgs.some((msg) => /smallest prime >= 10 is 11/.test(msg)));
  assert.ok(msgs.some((msg) => /Copy all 6 keys into tmp/.test(msg)));
  assert.ok(msgs.some((msg) => /resize\(11\)/.test(msg)));
  assert.ok(msgs.some((msg) => /Re-insert 12: h\(12\) = 12 mod 11 = 1/.test(msg)));
  assert.ok(msgs.some((msg) => /bi changed with m/.test(msg)));
  assertConsistent(result.state);
  // after rehash the load factor is back under the maximum
  assert.equal(keys(result.state).length / result.state.buckets.length < 1, true);
});

test('rehash frames hold values in tmp and keep keys stable', () => {
  let state = table.preset();
  for (const x of [1, 2]) state = run(state, 'insert', { x }).state;
  const { frames } = run(state, 'insert', { x: 3 });
  const holding = frames.find((frame) => /^Copy all/.test(frame.msg)).state;
  assert.equal(holding.tmp.length, 6);
  assert.equal(holding.buckets.flat().length, 0);
  const before = new Set(state.buckets.flat().map((cell) => cell.key));
  const after = new Set(frames.at(-1).state.buckets.flat().map((cell) => cell.key));
  for (const key of before) assert.ok(after.has(key), `${key} survives the rehash`);
  for (const frame of frames) {
    const svg = renderBuckets(frame.state, frame.hl);
    const ids = svg.match(/data-key="[^"]+"/g);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('a second rehash follows the course rule: prime >= max(2m, n / max_load)', () => {
  const state = table.preset();
  state.buckets = Array.from({ length: 11 }, () => []);
  for (let v = 0; v < 12; v += 1) state.buckets[v % 11].push({ key: `z${v}`, value: v });
  state.nextKey = 100;
  const next = record(table.ops.insert.run(structuredClone(state), { x: 50 })).at(-1).state; // bypasses the demo cap
  assert.equal(next.buckets.length, 23);
  assertConsistent(next);
  assert.equal(nextPrime(22), 23);
});

test('duplicate insert, find hit/miss, erase hit/miss', () => {
  const dup = run(table.preset(), 'insert', { x: 7 });
  assert.match(dup.frames.at(-1).msg, /already in the table/);
  assert.deepEqual(sorted(keys(dup.state)), [7, 9, 12, 22]);
  const hit = run(table.preset(), 'find', { x: 22 });
  assert.match(hit.frames.at(-1).msg, /after 3 comparisons/);
  const miss = run(table.preset(), 'find', { x: 4 });
  assert.match(miss.frames.at(-2).msg, /Bucket 4 is empty|not in bucket 4/);
  assert.match(miss.frames.at(-1).msg, /returns end\(\)/);
  const gone = run(table.preset(), 'erase', { x: 12 });
  assert.deepEqual(gone.state.buckets[2].map((cell) => cell.value), [7, 22]);
  assert.match(gone.frames.at(-1).msg, /returns 1/);
  const none = run(table.preset(), 'erase', { x: 3 });
  assert.match(none.frames.at(-1).msg, /returns 0/);
  assert.equal(none.state.buckets.flat().length, 4);
});

test('worst case: keys that share a bucket form one long chain', () => {
  let state = table.preset();
  for (const x of [32, 37]) state = run(state, 'insert', { x }).state; // all 2 mod 5
  assert.equal(state.buckets[2].length, 5);
  const { frames } = run(state, 'find', { x: 37 });
  assert.match(frames.at(-1).msg, /after 5 comparisons/);
});

test('check: key cap, and the viewBox never changes during any op', () => {
  const full = table.preset();
  for (let v = 30; full.buckets.flat().length < LIMIT; v += 1) full.buckets[v % 5].push({ key: `f${v}`, value: v });
  assert.match(table.ops.insert.check(full, { x: 1 }), /at most 10 keys/);
  assert.equal(table.ops.insert.check(table.preset(), { x: 1 }), null);
  const boxes = new Set();
  let state = table.preset();
  for (const [op, x] of [['insert', 17], ['insert', 1], ['insert', 2], ['insert', 3], ['erase', 7], ['find', 3]]) {
    const result = run(state, op, { x });
    for (const frame of result.frames) boxes.add(renderBuckets(frame.state, frame.hl).match(/viewBox="([^"]+)"/)[1]);
    state = result.state;
  }
  assert.equal(boxes.size, 1);
});

test('Big O strings say average and the note explains the worst case', () => {
  for (const op of Object.values(table.ops)) assert.equal(op.time, 'O(1) avg');
  assert.match(table.complexity.note, /Worst case O\(n\)/);
});
