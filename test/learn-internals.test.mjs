import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { internalsFor } from '../src/learn/internals.js';
import { modulesFor } from '../src/learn/modules.js';

const value = (rows, name) => rows.find((row) => row.name === name)?.value;

test('every data module describes its class layout and members on every frame', () => {
  for (const module of modulesFor('data')) {
    const info = internalsFor(module);
    assert.ok(info, `${module.id} has internals`);
    assert.ok(info.className && info.fields.length >= 2, module.id);
    for (const [name, op] of Object.entries(module.ops)) {
      const args = Object.fromEntries(op.params.map((param) => [param.name, param.default]));
      const frames = record(op.run(structuredClone(module.preset()), args));
      for (const frame of frames) {
        const rows = info.members(frame.state);
        assert.ok(rows.length >= 2, `${module.id}.${name}`);
        for (const row of rows) {
          assert.equal(typeof row.name, 'string');
          assert.equal(typeof row.value, 'string', `${module.id}.${name}.${row.name}`);
        }
      }
    }
  }
});

test('vector, stack, and queue members match the course field names and values', () => {
  const [vector, stack, queue] = ['vector', 'stack', 'queue'].map((id) => modulesFor('data').find((m) => m.id === id));
  const v = internalsFor(vector).members(vector.preset());
  assert.deepEqual([value(v, 'mSize'), value(v, 'mCap'), value(v, 'mData')], ['3', '4', '[10, 20, 30, ·]']);
  assert.match(value(v, 'next push_back'), /mData\[3\]/);
  const s = internalsFor(stack).members(stack.preset());
  assert.equal(value(s, 'top()'), '30');
  const q = internalsFor(queue).members(queue.preset());
  assert.deepEqual([value(q, 'mFront'), value(q, 'mSize'), value(q, 'mCap')], ['1', '3', '4']);
  assert.match(value(q, 'next push slot'), /= 0/);
});

test('tree, list, and hash members summarise the structure', () => {
  const pick = (id) => modulesFor('data').find((m) => m.id === id);
  const bst = internalsFor(pick('bst')).members(pick('bst').preset());
  assert.equal(value(bst, 'mRoot'), '40');
  assert.equal(value(bst, 'mSize'), '7');
  assert.equal(value(bst, 'inorder'), '10 20 30 40 50 60 70');
  const list = internalsFor(pick('list')).members(pick('list').preset());
  assert.equal(value(list, 'mHeader->next'), '10');
  assert.equal(value(list, 'mHeader->prev'), '30');
  const hash = internalsFor(pick('hash-table')).members(pick('hash-table').preset());
  assert.equal(value(hash, 'bucket_count()'), '5');
  assert.equal(value(hash, 'mSize'), '4');
  assert.equal(value(hash, 'load_factor()'), '0.80');
  const set = internalsFor(pick('set')).members(pick('set').preset());
  assert.match(value(set, 'black-height'), /^\d+$/);
});
