import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HEADERS, loadAnnotations } from '../src/learn/code/index.js';
import { findRegion } from '../src/learn/code/regions.js';
import { findModule } from '../src/learn/modules.js';

const problems = new Set(JSON.parse(readFileSync('data/problems.json', 'utf8')).map((p) => p.name));
const bilingual = (value, where) => {
  assert.ok(value && typeof value.en === 'string' && value.en.trim(), `${where}: en`);
  assert.ok(typeof value.th === 'string' && value.th.trim(), `${where}: th`);
};

for (const header of HEADERS) {
  test(`${header.id}: header file and annotations are complete and consistent`, async () => {
    const path = `src/learn/code/headers/${header.file}`;
    assert.ok(existsSync(path), path);
    const source = readFileSync(path, 'utf8');
    const data = await loadAnnotations(header.id);
    assert.equal(data.id, header.id);
    assert.equal(data.file, header.file);
    for (const key of ['source', 'overview']) bilingual(data[key], `${header.id}.${key}`);
    for (const key of ['fields', 'invariants', 'checklist', 'pitfalls', 'problems']) {
      assert.ok(Array.isArray(data[key]) && data[key].length, `${header.id}.${key}`);
      data[key].forEach((item, i) => bilingual(item, `${header.id}.${key}[${i}]`));
    }
    for (const item of data.problems) assert.ok(problems.has(item.name), `${header.id}: unknown problem ${item.name}`);
    bilingual(data.student, `${header.id}.student`);
    assert.match(data.student.code, /template\s*<\s*typename/);
    if (data.module) {
      const [side, id] = data.module.split('/');
      assert.ok(findModule(side, id), `${header.id}: module ${data.module}`);
    }
    const ids = new Set();
    assert.ok(data.regions.length >= 8, `${header.id}: at least 8 regions`);
    for (const region of data.regions) {
      assert.match(region.id, /^[a-z0-9-]+$/, region.id);
      assert.ok(!ids.has(region.id), `${header.id}: duplicate region ${region.id}`);
      ids.add(region.id);
      bilingual(region.title, `${header.id}#${region.id}.title`);
      bilingual(region.what, `${header.id}#${region.id}.what`);
      assert.ok(typeof region.use === 'string' && region.use.trim(), `${header.id}#${region.id}: use (how you call it in real code)`);
      const range = findRegion(source, region);
      assert.ok(range, `${header.id}#${region.id}: match not found "${region.match}"`);
      const lines = source.split('\n').slice(range.start, range.end + 1);
      for (const note of region.notes || []) {
        bilingual(note, `${header.id}#${region.id} note`);
        assert.ok(lines.some((line) => line.includes(note.match)), `${header.id}#${region.id}: note "${note.match}" outside the region`);
      }
      if (region.op) {
        const [side, id] = data.module.split('/');
        assert.ok(region.op in findModule(side, id).ops, `${header.id}#${region.id}: op ${region.op}`);
      }
    }
  });
}
