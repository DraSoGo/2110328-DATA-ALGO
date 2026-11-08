import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import fibonacciTable from '../src/learn/algo/fibonacci-table.js';

const fib = (n) => { let [a, b] = [0, 1]; for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]; return a; };
const frames = (n) => record(fibonacciTable.run({ n }));

test('fills the whole table with Fibonacci numbers', () => {
  for (const n of [0, 1, 2, 3, 8, 15]) {
    const last = frames(n).at(-1);
    assert.equal(last.line, fibonacciTable.code.length - 1);
    const row = last.state.cells[0];
    for (let k = 0; k <= n; k += 1) assert.equal(row[k], fib(k), `F(${k}) for n=${n}`);
    assert.equal(last.vars.value[n], fib(n));
  }
});

test('each step reads the two previous cells and draws arrows into the active cell', () => {
  const step = frames(6).find((frame) => frame.msg === 'value[4] = value[3] + value[2] = 2 + 1');
  assert.deepEqual(step.hl.compare, ['0-3', '0-2']);
  assert.deepEqual(step.hl.arrows, [['0-3', '0-4'], ['0-2', '0-4']]);
  assert.equal(step.state.cells[0][4], null);
});

test('table grows one cell at a time and stays small', () => {
  const all = frames(15);
  assert.ok(all.length < 100);
  const counts = all.map((frame) => frame.state.cells[0].filter((v) => v !== null).length);
  for (let i = 1; i < counts.length; i += 1) assert.ok(counts[i] - counts[i - 1] <= 1);
});
