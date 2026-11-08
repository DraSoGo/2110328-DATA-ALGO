import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { parseField } from '../src/learn/engine/input.js';
import lcs from '../src/learn/algo/lcs.js';

// Independent length: memoised recursion over suffixes.
function lcsLength(a, b) {
  const memo = new Map();
  const go = (i, j) => {
    if (i === a.length || j === b.length) return 0;
    const key = `${i},${j}`;
    if (!memo.has(key)) memo.set(key, a[i] === b[j] ? 1 + go(i + 1, j + 1) : Math.max(go(i + 1, j), go(i, j + 1)));
    return memo.get(key);
  };
  return go(0, 0);
}
const isSubsequence = (s, t) => { let k = 0; for (const ch of t) if (k < s.length && ch === s[k]) k += 1; return k === s.length; };
const frames = (A, B) => record(lcs.run({ A, B }));

const CASES = [['ABCBDAB', 'BDCABA'], ['AAA', 'BBBBBBBB'], ['A', 'A'], ['ABCDEFGH', 'ABCDEFGH'], ['HGFEDCBA', 'ABCDEFGH'], ['AGGTAB', 'GXTXAYB'], ['XMJYAUZ', 'MZJAWXU']];

test('length and traced string match an independent computation', () => {
  for (const [A, B] of CASES) {
    const last = frames(A, B).at(-1);
    const s = last.vars.s;
    const expected = lcsLength(A, B);
    assert.equal(s.length, expected, `${A}/${B}`);
    assert.equal(last.state.cells[A.length][B.length], expected);
    assert.ok(isSubsequence(s, A) && isSubsequence(s, B), `${s} is a common subsequence of ${A} and ${B}`);
    assert.equal(last.line, lcs.code.length - 1);
  }
});

test('table values equal the LCS of every pair of prefixes', () => {
  const last = frames('ABCBDAB', 'BDCABA').at(-1);
  last.state.cells.forEach((row, i) => row.forEach((value, j) => assert.equal(value, lcsLength('ABCBDAB'.slice(0, i), 'BDCABA'.slice(0, j)))));
});

test('traceback path runs from the corner to the border through connected cells', () => {
  const last = frames('ABCBDAB', 'BDCABA').at(-1);
  const path = last.hl.path.map((id) => id.split('-').map(Number));
  assert.deepEqual(path[0], [7, 6]);
  const [i, j] = path.at(-1);
  assert.ok(i === 0 || j === 0);
  for (let k = 1; k < path.length; k += 1) {
    const di = path[k - 1][0] - path[k][0];
    const dj = path[k - 1][1] - path[k][1];
    assert.ok(di >= 0 && dj >= 0 && di <= 1 && dj <= 1 && di + dj >= 1);
  }
});

test('a match draws a diagonal arrow, a mismatch draws up and left arrows', () => {
  const all = frames('AB', 'BA');
  const mismatch = all.find((frame) => frame.msg.startsWith('No match'));
  assert.equal(mismatch.hl.arrows.length, 2);
  const match = all.find((frame) => frame.msg.startsWith('Match'));
  assert.equal(match.hl.arrows.length, 1);
});

test('headers show the strings and the worst case stays under 2000 frames', () => {
  const first = frames('ABC', 'XY')[0];
  assert.deepEqual(first.state.rowHeaders, ['ε', 'A', 'B', 'C']);
  assert.deepEqual(first.state.colHeaders, ['ε', 'X', 'Y']);
  for (const [A, B] of [['ABCDEFGH', 'ABCDEFGH'], ['AAAAAAAA', 'AAAAAAAA'], ['ABABABAB', 'BABABABA']]) assert.ok(frames(A, B).length < 2000);
});

test('text fields validate letters, case and length', () => {
  const field = lcs.input.fields[0];
  assert.deepEqual(parseField(field, ' abc ', {}), { value: 'ABC' });
  assert.ok(parseField(field, 'AB1', {}).error);
  assert.ok(parseField(field, '', {}).error);
  assert.ok(parseField(field, 'ABCDEFGHI', {}).error);
  assert.deepEqual(parseField(field, 'ABCDEFGH', {}), { value: 'ABCDEFGH' });
});
