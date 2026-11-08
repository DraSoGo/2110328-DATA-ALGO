import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import permutation from '../src/learn/algo/permutation.js';

const run = (n) => record(permutation.run({ n }));
const printed = (frames) => frames.at(-1).vars.printed;

// Independent generator in the slide's order (for each position, smallest unused item first).
function expected(n) {
  const out = [];
  const go = (prefix) => {
    if (prefix.length === n) return out.push(prefix.join(''));
    for (let i = 1; i <= n; i += 1) if (!prefix.includes(i)) go([...prefix, i]);
    return out.length;
  };
  go([]);
  return out;
}

test('prints all n! permutations in the slide order for n = 1..4', () => {
  for (let n = 1; n <= 4; n += 1) {
    const list = printed(run(n));
    assert.deepEqual(list, expected(n), `n=${n}`);
    assert.equal(list.length, [1, 1, 2, 6, 24][n]);
    assert.equal(new Set(list).size, list.length);
  }
});

test('n = 3 starts 123, 132, 213 and ends 321, as on the slide', () => {
  const list = printed(run(3));
  assert.deepEqual(list, ['123', '132', '213', '231', '312', '321']);
});

test('the printed frame shows a full sol and used all true; backtracking frees items', () => {
  const frames = run(3);
  const prints = frames.filter((frame) => frame.line === 11);
  assert.equal(prints.length, 6);
  for (const frame of prints) {
    assert.deepEqual(frame.state.rows[0].cells.map((cell) => cell.value).join(''), frame.vars.output);
    assert.deepEqual(frame.state.rows[1].cells.map((cell) => cell.value), ['T', 'T', 'T']);
  }
  const last = frames.at(-1);
  assert.deepEqual(last.state.rows[1].cells.map((cell) => cell.value), ['F', 'F', 'F']);
  assert.equal(last.line, permutation.code.length - 1);
});

test('used flags always equal the items currently in sol', () => {
  for (const frame of run(4)) {
    const inSol = frame.state.rows[0].cells.filter(Boolean).map((cell) => cell.value);
    const usedItems = frame.state.rows[1].cells.map((cell, index) => (cell.value === 'T' ? index + 1 : null)).filter(Boolean);
    // between "used[i] = true" and "sol[len] = i", or after the reset, the two may differ by one item
    assert.equal(Math.abs(usedItems.length - inSol.length) <= 1, true);
    if (frame.line !== 7) assert.equal(inSol.every((item) => usedItems.includes(item)), true);
  }
});

test('n = 4 stays under the frame limit and the pointer at slot n is reserved', () => {
  const frames = run(4);
  assert.equal(frames.length < 2000, true);
  assert.equal(frames[0].state.capacity, 5);
  assert.equal(frames.some((frame) => frame.state.rows[0].pointers.len === 4), true);
  // i = n + 1 ends the loop; it points at row index n, the reserved slot labelled n + 1.
  assert.equal(frames.some((frame) => frame.state.rows[1].pointers.i === 4), true);
});

test('the used[] pointer i sits under item i (row index i - 1)', () => {
  const frames = run(3);
  const tries = frames.filter((frame) => /^i = \d <= /.test(frame.msg));
  assert.ok(tries.length > 0);
  for (const frame of tries) {
    const i = Number(frame.msg.match(/^i = (\d)/)[1]);
    const index = frame.state.rows[1].pointers.i;
    assert.equal(index, i - 1, frame.msg);
    assert.equal(frame.state.rows[1].cells[index].key, `u${i}`);
  }
});

test('input field limits n to 4', () => {
  const field = permutation.input.fields[0];
  assert.equal(field.max, 4);
  assert.equal(field.min, 1);
});
