import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanProblemLibrary, topicFromDir } from '../scripts/lib/manifest.mjs';

async function writeTree(root, rel, files) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, rel, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

const mapWalk = {
  id: 1528, name: 'da66_f1_map_walk', title: 'Map Walk', tags: [], topic: 'Brute Force',
  schedule: [
    { topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' },
    { topic: 'ซ้อม Final', date: '1 Dec', session: '' },
  ],
  testcase_truncated: [],
};

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-'));
  await writeTree(root, '03_vector/d58_q1_erase_many', {
    'config.json': JSON.stringify({
      id: 1442, name: 'd58_q1_erase_many', title: 'Erase Many from Vector', tags: ['vector', '.h'], topic: 'vector',
      schedule: [{ topic: 'vector', date: '3 Nov', session: 'บ่าย' }],
      testcase_truncated: ['input/02.in'],
    }),
    'statement.pdf': '%PDF-1.4',
    'solution/main.cpp': 'int main() {}',
    'solution/student.h': '// student',
    'solution/erase_many.cbp': '<xml/>',
    'testcase/input/01.in': '1',
    'testcase/output/01.out': '22',
    'testcase/input/02.in': '333',
    'testcase/output/02.out': '4444',
  });
  await writeTree(root, '09_Brute Force/da66_f1_map_walk', {
    'config.json': JSON.stringify(mapWalk), 'statement.pdf': '%PDF', 'solution.cpp': '   \n',
  });
  await writeTree(root, '17_ซ้อม Final/da66_f1_map_walk', {
    'config.json': JSON.stringify(mapWalk), 'statement.pdf': '%PDF', 'solution.cpp': 'int main() { return 0; }\n',
  });
  await writeTree(root, '99_Other/ex01m3', {
    'config.json': JSON.stringify({ id: 1494, name: 'ex01m3', title: 'Larger Restaurant', tags: ['D&C'], topic: null, schedule: [] }),
  });
  await writeTree(root, '18_Midterm 2023/both_forms', {
    'config.json': JSON.stringify({ id: null, name: 'both_forms', title: 'Both Forms', tags: [], topic: null, schedule: [], source: 'Midterm 2023 #9' }),
    'statement.pdf': '%PDF',
    'solution.cpp': 'int main() {}\n',
    'solution/main.cpp': 'int main() {}',
    'solution/notes.txt': 'ignored',
  });
  await writeTree(root, '99_Other/not_a_problem', { 'notes.txt': 'no config here' });
  return root;
}

test('topicFromDir splits the order prefix and names 99 as Other', () => {
  assert.deepEqual(topicFromDir('12_D&C'), { order: 12, name: 'D&C' });
  assert.deepEqual(topicFromDir('17_ซ้อม Final'), { order: 17, name: 'ซ้อม Final' });
  assert.deepEqual(topicFromDir('99_Other'), { order: 99, name: 'Other' });
});

test('scanProblemLibrary indexes every folder with a config.json in topic order', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems.map((p) => p.id), [
    '03_vector/d58_q1_erase_many',
    '09_Brute Force/da66_f1_map_walk',
    '17_ซ้อม Final/da66_f1_map_walk',
    '18_Midterm 2023/both_forms',
    '99_Other/ex01m3',
  ]);
  const [erase] = problems;
  assert.equal(erase.graderId, 1442);
  assert.equal(erase.name, 'd58_q1_erase_many');
  assert.equal(erase.title, 'Erase Many from Vector');
  assert.deepEqual(erase.tags, ['vector', '.h']);
  assert.equal(erase.topic, 'vector');
  assert.equal(erase.topicDir, '03_vector');
  assert.equal(erase.topicOrder, 3);
  assert.equal(erase.statement, 'problems/03_vector/d58_q1_erase_many/statement.pdf');
});

test('solution lists only C++ sources and treats a blank solution.cpp as missing', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[0].solution, [
    { name: 'main.cpp', path: 'problems/03_vector/d58_q1_erase_many/solution/main.cpp' },
    { name: 'student.h', path: 'problems/03_vector/d58_q1_erase_many/solution/student.h' },
  ]);
  assert.deepEqual(problems[1].solution, []);
  assert.deepEqual(problems[2].solution, [
    { name: 'solution.cpp', path: 'problems/17_ซ้อม Final/da66_f1_map_walk/solution.cpp' },
  ]);
});

test('schedule keeps only entries for the folder topic', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[1].schedule, [{ topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' }]);
  assert.deepEqual(problems[2].schedule, [{ topic: 'ซ้อม Final', date: '1 Dec', session: '' }]);
});

test('testcases pair inputs and outputs with sizes and truncation flags', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[0].testcases, [
    {
      id: '01',
      input: { path: 'problems/03_vector/d58_q1_erase_many/testcase/input/01.in', size: 1, truncated: false },
      output: { path: 'problems/03_vector/d58_q1_erase_many/testcase/output/01.out', size: 2, truncated: false },
    },
    {
      id: '02',
      input: { path: 'problems/03_vector/d58_q1_erase_many/testcase/input/02.in', size: 3, truncated: true },
      output: { path: 'problems/03_vector/d58_q1_erase_many/testcase/output/02.out', size: 4, truncated: false },
    },
  ]);
});

test('Other problems get the Other topic, no statement, and no testcases', async () => {
  const problems = await scanProblemLibrary(await fixture());
  const other = problems[4];
  assert.equal(other.topic, 'Other');
  assert.equal(other.topicOrder, 99);
  assert.equal(other.statement, null);
  assert.deepEqual(other.testcases, []);
  assert.deepEqual(other.schedule, []);
});

test('a problem with both solution.cpp and solution/ lists solution.cpp first', async () => {
  const problems = await scanProblemLibrary(await fixture());
  const both = problems.find((p) => p.name === 'both_forms');
  assert.equal(both.graderId, null);
  assert.deepEqual(both.solution, [
    { name: 'solution.cpp', path: 'problems/18_Midterm 2023/both_forms/solution.cpp' },
    { name: 'main.cpp', path: 'problems/18_Midterm 2023/both_forms/solution/main.cpp' },
  ]);
});

test('source is carried from config and null when absent', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.equal(problems.find((p) => p.name === 'both_forms').source, 'Midterm 2023 #9');
  assert.equal(problems[0].source, null);
});
