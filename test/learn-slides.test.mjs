import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { MODULES } from '../src/learn/modules.js';
import { slidePath, SLIDES, slidesFor } from '../src/learn/slides.js';

test('every listed slide exists in /slides', () => {
  for (const slide of SLIDES) assert.ok(existsSync(slidePath(slide)), slidePath(slide));
  assert.equal(new Set(SLIDES.map((slide) => slide.file)).size, SLIDES.length);
});

test('every learning module links at least one course slide', () => {
  for (const module of MODULES) assert.ok(slidesFor(module).length > 0, `${module.side}/${module.id}`);
  assert.deepEqual(slidesFor({ side: 'data', id: 'queue', group: 'Adaptor' }).map(slidePath), ['slides/data/06_Stack_Queue.pdf']);
  assert.deepEqual(slidesFor({ side: 'algo', id: 'complexity', group: 'Analysis' }).map(slidePath)[0], 'slides/data/12_Complexity.pdf');
});
