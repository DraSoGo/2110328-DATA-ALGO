import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isStubSource } from '../scripts/lib/solution-status.mjs';
import { scanProblemLibrary } from '../scripts/lib/manifest.mjs';

const wrap = (body, signature = 'typename CP::list<T>::iterator CP::list<T>::find(const T &value) const') =>
  `#ifndef _STUDENT_H_INCLUDED\n#define _STUDENT_H_INCLUDED\n#include "list.h"\n\ntemplate <typename T>\n${signature}\n{\n${body}\n}\n\n#endif\n`;

test('a placeholder body with nothing or a dummy return is a stub', () => {
  for (const body of [
    '  // Your code here',
    '  // Your code here\n  return end();',
    '  //write your code here\n  return 0;',
    '  // write your code here\n  return -1;',
    '  // Your code here\n  return false;',
    '  // Your code here\n  return T();',
    '  // Your code here\n  return CP::pair<T2, T1>();',
    '  // Your code here\n  return *this;',
    '  // Your code here\n  return mData[mFront];',
    '  //write your code here  •͡˘㇁•͡˘\n  return;',
    '  // TODO: Add your code here',
    '  // Insert your code here',
    '  // Write your code here.',
    '  // Your code here\n  throw std::out_of_range("min() is not implemented yet");',
    '  //your code here\n  CP::map_bst<KeyT,MappedT,CompareT> result;\n  return result;',
    '  /* your code here */',
  ]) {
    assert.equal(isStubSource(wrap(body)), true, body);
  }
});

test('real code next to a placeholder is a solution', () => {
  for (const body of [
    '  // Your code here\n  for (node *p = mHeader->next; p != mHeader; p = p->next)\n    if (p->data == value) return iterator(p);\n  return end();',
    '  // Your code here\n  aux = !aux;',
    '  return leaves_count(mRoot);\n  //write your code here',
  ]) {
    assert.equal(isStubSource(wrap(body)), false, body);
  }
});

test('files without a placeholder comment are always solutions', () => {
  assert.equal(isStubSource(wrap('  iterator it = begin();\n  return it;')), false);
  assert.equal(isStubSource(wrap('')), false);
  assert.equal(isStubSource('int main() {}\n'), false);
});

test('a placeholder at file level does not make the file a stub', () => {
  const song = 'struct CPQ1 { bool operator()(int a, int b) const { return a < b; } };\n'
    + '//  you have to write something below this line\nCP::priority_queue<int, CPQ1> pq1;\n';
  assert.equal(isStubSource(song), false);
});

test('a placeholder inside a string literal is ignored', () => {
  assert.equal(isStubSource('int main() {\n  puts("// your code here");\n  return 0;\n}\n'), false);
});

test('starter "example code" under a placeholder is still a stub', () => {
  const body = '  //write your code here\n  // this is the example code of adding 1..n to the bst in ascending order\n'
    + '  for (int i = 1; i <= n; i++) {\n    bst[i] = 100;\n  }';
  assert.equal(isStubSource(wrap(body, 'void gen_best_bst(int n, CP::map_bst<int,int> &bst)')), true);
});

test('an empty non-void helper in a starter file is a stub', () => {
  const source = 'template <typename K>\nsize_t CP::map_bst<K>::leaves_count(node* n) {\n}\n\n'
    + 'template <typename K>\nsize_t CP::map_bst<K>::leaves_count() {\n  return leaves_count(mRoot);\n  //write your code here\n}\n';
  assert.equal(isStubSource(source), true);
  const ctor = '// Your code here\nclass G {\npublic:\n  G() {}\n  ~G() {}\n  void clear() {}\n  int n() { return k; }\n  int k;\n};\n';
  assert.equal(isStubSource(ctor), false);
});

test('the manifest marks starter-only solution folders as unsolved', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-stub-'));
  const write = async (rel, content) => {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  };
  await write('26_grader/starter/config.json', JSON.stringify({ id: null, name: 'starter' }));
  await write('26_grader/starter/solution/main.cpp', 'int main() {}\n');
  await write('26_grader/starter/solution/student.h', wrap('  // Your code here\n  return end();'));
  await write('26_grader/done/config.json', JSON.stringify({ id: null, name: 'done' }));
  await write('26_grader/done/solution/student.h', wrap('  for (auto it = begin(); it != end(); ++it) if (*it == value) return it;\n  return end();'));
  await write('26_grader/empty/config.json', JSON.stringify({ id: null, name: 'empty' }));
  const byName = Object.fromEntries((await scanProblemLibrary(root)).map((problem) => [problem.name, problem]));
  assert.equal(byName.starter.solution.length, 2);
  assert.equal(byName.starter.solved, false);
  assert.equal(byName.done.solved, true);
  assert.equal(byName.empty.solved, false);
});
