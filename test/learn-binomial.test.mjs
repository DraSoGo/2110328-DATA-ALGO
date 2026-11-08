import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import binomial from '../src/learn/algo/binomial.js';

const choose = (n, r) => { let value = 1; for (let k = 1; k <= r; k += 1) value = (value * (n - r + k)) / k; return Math.round(value); };
const frames = (n, r) => record(binomial.run({ n, r }));

test('every filled cell is a binomial coefficient and cells above the diagonal stay empty', () => {
  for (const n of [0, 1, 4, 10]) {
    const last = frames(n, 0).at(-1);
    last.state.cells.forEach((row, i) => row.forEach((value, j) => {
      if (j > i) assert.equal(value, null);
      else assert.equal(value, choose(i, j), `C(${i},${j})`);
    }));
  }
});

test('answer matches the closed form for all n <= 10, r <= n', () => {
  for (let n = 0; n <= 10; n += 1) {
    for (let r = 0; r <= n; r += 1) assert.equal(frames(n, r).at(-1).vars.answer, choose(n, r), `C(${n},${r})`);
  }
});

test('r > n gives 0 with an explanation', () => {
  const last = frames(3, 7).at(-1);
  assert.equal(last.vars.answer, 0);
  assert.match(frames(3, 7).at(-2).msg, /larger than n/);
});

test('inner cells read the cell above and the cell above-left', () => {
  const step = frames(5, 2).find((frame) => frame.msg.startsWith('table[4][2] = table[3][2]'));
  assert.deepEqual(step.hl.compare, ['3-2', '3-1']);
  assert.equal(step.state.cells[4][2], null);
});

test('worst case is small and ends on the closing line', () => {
  const all = frames(10, 10);
  assert.ok(all.length < 2000);
  assert.equal(all.at(-1).line, binomial.code.length - 1);
});
