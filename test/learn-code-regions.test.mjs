import test from 'node:test';
import assert from 'node:assert/strict';
import { findRegion, findRegions } from '../src/learn/code/regions.js';

const SOURCE = [
  'class vector {',            // 0
  '  protected:',              // 1
  '    T *mData;',              // 2
  '    size_t mSize;',          // 3
  '    void expand(size_t c) {', // 4
  '      T *a = new T[c]();',   // 5
  '      if (c > 0) { x(); }',  // 6
  '      // } not a brace',     // 7
  '      s = "}";',             // 8
  '    }',                      // 9
  '    size_t size() const { return mSize; }', // 10
  '};',                         // 11
].join('\n');

test('a function region runs from its signature to its matching closing brace', () => {
  assert.deepEqual(findRegion(SOURCE, { match: 'void expand(' }), { start: 4, end: 9 });
  assert.deepEqual(findRegion(SOURCE, { match: 'size_t size() const' }), { start: 10, end: 10 });
});

test('a field region covers only its own line unless lines is given', () => {
  assert.deepEqual(findRegion(SOURCE, { match: 'T *mData;' }), { start: 2, end: 2 });
  assert.deepEqual(findRegion(SOURCE, { match: 'T *mData;', lines: 2 }), { start: 2, end: 3 });
});

test('occurrence picks the n-th match and a missing match returns null', () => {
  assert.deepEqual(findRegion('a {\n}\na {\n}', { match: 'a {', occurrence: 2 }), { start: 2, end: 3 });
  assert.equal(findRegion(SOURCE, { match: 'nope' }), null);
});

test('findRegions maps ids to regions and line notes to line numbers', () => {
  const regions = findRegions(SOURCE, [{ id: 'expand', match: 'void expand(', notes: [{ match: 'new T[c]' }, { match: 'missing' }] }]);
  assert.deepEqual(regions.expand.range, { start: 4, end: 9 });
  assert.deepEqual(regions.expand.noteLines, [5, null]);
});
