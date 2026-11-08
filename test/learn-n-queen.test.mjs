import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { parseField } from '../src/learn/engine/input.js';
import nQueen from '../src/learn/algo/n-queen.js';

const KNOWN = { 1: 1, 2: 0, 3: 0, 4: 2, 5: 10, 6: 4 };
const frames = (n) => record(nQueen.run({ n }));
const queensOf = (cells) => cells.flatMap((row, r) => row.flatMap((v, c) => (v === '♛' ? [[r, c]] : [])));
const valid = (q) => q.every(([r1, c1], i) => q.slice(i + 1).every(([r2, c2]) => r1 !== r2 && c1 !== c2 && Math.abs(r1 - r2) !== Math.abs(c1 - c2)));

test('counts every solution: 1, 0, 0, 2, 10, 4 for n = 1..6', () => {
  for (let n = 1; n <= 6; n += 1) assert.equal(frames(n).at(-1).vars.count, KNOWN[n], `n=${n}`);
});

test('the final board is a valid full solution (or empty when none exists)', () => {
  for (let n = 1; n <= 6; n += 1) {
    const q = queensOf(frames(n).at(-1).state.cells);
    if (KNOWN[n] === 0) assert.equal(q.length, 0);
    else {
      assert.equal(q.length, n);
      assert.ok(valid(q), `n=${n}`);
    }
  }
});

test('every solution frame shows n valid queens; placements never hold attacking queens', () => {
  for (const frame of frames(6)) {
    const q = queensOf(frame.state.cells);
    assert.ok(valid(q), frame.msg);
    if (frame.msg.startsWith('All 6 rows')) assert.equal(q.length, 6);
  }
});

test('queens move row by row and backtracking removes them', () => {
  const all = frames(4);
  assert.ok(all.some((frame) => frame.msg.startsWith('Backtrack')));
  const counts = all.map((frame) => queensOf(frame.state.cells).length);
  for (let i = 1; i < counts.length; i += 1) assert.ok(Math.abs(counts[i] - counts[i - 1]) <= 1 || i === counts.length - 1);
  assert.equal(Math.max(...counts), 4);
});

test('attacked squares are shaded and an unsafe try points at the attacking queen', () => {
  const all = frames(4);
  const unsafe = all.find((frame) => frame.msg.includes('same column') || frame.msg.includes('same diagonal'));
  assert.equal(unsafe.hl.compare.length, 1);
  assert.ok(unsafe.hl.shaded.includes(unsafe.hl.active[0]));
  const first = all.find((frame) => frame.msg.startsWith('Place a queen'));
  assert.equal(first.hl.shaded.length > 0, true);
});

test('n = 6 stays under 2000 frames and the input is limited to 1..6', () => {
  assert.ok(frames(6).length < 2000);
  const field = nQueen.input.fields[0];
  assert.deepEqual(parseField(field, '6', {}), { value: 6 });
  assert.ok(parseField(field, '7', {}).error);
  assert.ok(parseField(field, '0', {}).error);
});
