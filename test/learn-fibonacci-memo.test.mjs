import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { parseInteger } from '../src/learn/engine/input.js';
import fibonacciMemo from '../src/learn/algo/fibonacci-memo.js';

const fib = (n) => { let [a, b] = [0, 1]; for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]; return a; };
const frames = (n) => record(fibonacciMemo.run({ n }));

test('table holds every F(k) for k >= 2 at the end and the answer is correct', () => {
  for (const n of [0, 1, 2, 5, 9, 15]) {
    const last = frames(n).at(-1);
    assert.equal(last.vars.value, fib(n), `F(${n})`);
    assert.equal(last.line, fibonacciMemo.code.length - 1);
    const table = last.state.cells[0];
    for (let k = 2; k <= n; k += 1) assert.equal(table[k], fib(k));
  }
});

test('makes exactly 2n - 1 calls for n >= 1 and records memo hits', () => {
  for (const n of [1, 2, 6, 15]) {
    const all = frames(n);
    assert.equal(all.at(-1).vars.calls, 2 * n - 1);
    if (n >= 3) assert.ok(all.some((frame) => frame.msg.startsWith('Memo hit')), `hit for n=${n}`);
  }
  assert.equal(frames(2).some((frame) => frame.msg.startsWith('Memo hit')), false);
});

test('call order and return order rows are filled; first call is #1, last return is #calls', () => {
  const last = frames(6).at(-1);
  const [, called, returned] = last.state.cells;
  assert.equal(called[6], 1);
  assert.equal(returned[6], last.vars.calls);
  assert.equal(called.every((value) => value !== null), true);
  assert.equal(new Set(returned).size, returned.length);
});

test('worst case stays under 2000 frames and the viewBox input is valid', () => {
  assert.ok(frames(15).length < 2000);
  const field = fibonacciMemo.input.fields[0];
  assert.equal(parseInteger('15', field).value, 15);
  assert.ok(parseInteger('16', field).error);
});
