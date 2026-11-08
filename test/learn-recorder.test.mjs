import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAME_LIMIT, record, TooManyStepsError } from '../src/learn/engine/recorder.js';

function* mutating() {
  const state = { n: 0, list: [] };
  for (let i = 0; i < 3; i += 1) {
    state.n = i;
    state.list.push(i);
    yield { line: i, msg: `n = ${i}`, state, hl: { active: [i] }, vars: { i } };
  }
}

function* endless() {
  let i = 0;
  while (true) yield { state: { i: i++ } };
}

test('record deep-copies every frame so later mutations do not leak back', () => {
  const frames = record(mutating());
  assert.deepEqual(frames.map((frame) => frame.state), [
    { n: 0, list: [0] },
    { n: 1, list: [0, 1] },
    { n: 2, list: [0, 1, 2] },
  ]);
  frames[0].state.list.push(99);
  assert.deepEqual(frames[1].state.list, [0, 1]);
  assert.deepEqual(frames[2], { line: 2, msg: 'n = 2', state: { n: 2, list: [0, 1, 2] }, hl: { active: [2] }, vars: { i: 2 } });
});

test('record fills defaults for missing fields', () => {
  assert.deepEqual(record([{ state: { a: 1 } }]), [{ line: null, msg: '', state: { a: 1 }, hl: {}, vars: null }]);
});

test('record stops runaway generators at the frame limit', () => {
  assert.equal(FRAME_LIMIT, 2000);
  assert.throws(() => record(endless(), 5), TooManyStepsError);
  assert.equal(record([{ state: {} }, { state: {} }], 2).length, 2);
  assert.match(new TooManyStepsError(5).message, /smaller input/);
});
