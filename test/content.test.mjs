import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjacentProblems, buildTopicTree, categoryIsOpen, filterProblems, orderedProblems,
  pageRoute, preserveScrollPosition, resourceStatus, summarizeProblems, truncationLabel,
} from '../src/lib/content.js';

const make = (topicDir, name, extra = {}) => {
  const [order, topic] = topicDir.split(/_(.+)/);
  return {
    id: `${topicDir}/${name}`, graderId: 1, name, title: `${name} title`, tags: [],
    topic: order === '99' ? 'Other' : topic, topicDir, topicOrder: Number(order),
    schedule: [], statement: `problems/${topicDir}/${name}/statement.pdf`, solution: [], testcases: [],
    ...extra,
  };
};

const library = [
  make('03_vector', 'v2', { schedule: [{ topic: 'vector', date: '3 Nov', session: 'การบ้าน' }], solution: [{ name: 'main.cpp', path: 'x' }] }),
  make('03_vector', 'v1', { schedule: [{ topic: 'vector', date: '3 Nov', session: 'บ่าย' }], tags: ['stl'] }),
  make('01_STL Usage', 's1', { schedule: [{ topic: 'STL Usage', date: '2 Nov', session: 'บ่าย' }], testcases: [{ id: '01' }] }),
  make('99_Other', 'o1'),
  make('09_Brute Force', 'map_walk', { schedule: [{ topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' }] }),
  make('17_ซ้อม Final', 'map_walk', { schedule: [{ topic: 'ซ้อม Final', date: '1 Dec', session: '' }], statement: null }),
];

test('pageRoute parses problem, week, learn, and overview hashes', () => {
  const base = { page: 'overview', problemId: null, side: null, module: null, week: null };
  assert.deepEqual(pageRoute(''), base);
  assert.deepEqual(pageRoute('#/'), base);
  assert.deepEqual(pageRoute(`#/p/${encodeURIComponent('03_vector/v1')}`), { ...base, page: 'problem', problemId: '03_vector/v1' });
  assert.deepEqual(pageRoute('#/week'), { ...base, page: 'week' });
  assert.deepEqual(pageRoute('#/week/3'), { ...base, page: 'week', week: 3 });
  assert.deepEqual(pageRoute('#/week/x'), base);
  assert.deepEqual(pageRoute('#/learn'), { ...base, page: 'learn' });
  assert.deepEqual(pageRoute('#/learn/data'), { ...base, page: 'learn', side: 'data' });
  assert.deepEqual(pageRoute('#/learn/algo/insertion-sort'), { ...base, page: 'learn', side: 'algo', module: 'insertion-sort' });
  assert.deepEqual(pageRoute('#/learn/other'), base);
  assert.deepEqual(pageRoute('#/p/%E0%A4%A'), base);
  assert.deepEqual(pageRoute('#/p/'), base);
});

test('filterProblems matches name, title, topic, and tags case-insensitively', () => {
  assert.equal(filterProblems(library, '').length, library.length);
  assert.deepEqual(filterProblems(library, 'V1').map((p) => p.name), ['v1']);
  assert.deepEqual(filterProblems(library, 'stl').map((p) => p.name), ['v1', 's1']);
  assert.deepEqual(filterProblems(library, 'brute').map((p) => p.id), ['09_Brute Force/map_walk']);
});

test('summarizeProblems counts unique problem names', () => {
  assert.deepEqual(summarizeProblems(library), { problems: 5, topics: 5, statements: 5, solutions: 1, testcaseSets: 1 });
});

test('buildTopicTree orders topics and lists problems by schedule, afternoon before homework', () => {
  const tree = buildTopicTree(library);
  assert.deepEqual(tree.map((t) => [t.id, t.code, t.name]), [
    ['t:01_STL Usage', '01', 'STL Usage'],
    ['t:03_vector', '03', 'vector'],
    ['t:09_Brute Force', '09', 'Brute Force'],
    ['t:17_ซ้อม Final', '17', 'ซ้อม Final'],
    ['t:99_Other', 'OTH', 'Other'],
  ]);
  assert.deepEqual(tree[1].problems.map((p) => p.name), ['v1', 'v2']);
  assert.equal('children' in tree[1], false);
});

test('orderedProblems flattens the tree and adjacentProblems finds neighbours', () => {
  const ordered = orderedProblems(library);
  assert.deepEqual(ordered.map((p) => p.id), [
    '01_STL Usage/s1', '03_vector/v1', '03_vector/v2', '09_Brute Force/map_walk', '17_ซ้อม Final/map_walk', '99_Other/o1',
  ]);
  const { previous, next } = adjacentProblems(ordered, '03_vector/v1');
  assert.equal(previous.id, '01_STL Usage/s1');
  assert.equal(next.id, '03_vector/v2');
  assert.deepEqual(adjacentProblems(ordered, 'missing'), { previous: null, next: null });
});

test('categoryIsOpen respects query, closed, open, and active nodes', () => {
  const open = new Set(['a']);
  const closed = new Set(['b']);
  assert.equal(categoryIsOpen({ category: 'b', activeCategory: null, query: 'x', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'b', activeCategory: 'b', query: '', openCategories: open, closedCategories: closed }), false);
  assert.equal(categoryIsOpen({ category: 'a', activeCategory: null, query: '', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'c', activeCategory: 'c', query: '', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'c', activeCategory: null, query: '', openCategories: open, closedCategories: closed }), false);
});

test('preserveScrollPosition restores scrollTop on the new scroller', () => {
  let scroller = { scrollTop: 120 };
  preserveScrollPosition(() => scroller, () => { scroller = { scrollTop: 0 }; });
  assert.equal(scroller.scrollTop, 120);
});

test('truncationLabel marks grader previews only', () => {
  assert.equal(truncationLabel({ truncated: true }), 'PREVIEW · FIRST 2 KB');
  assert.equal(truncationLabel({ truncated: false }), '');
  assert.equal(truncationLabel(null), '');
});

test('resourceStatus lists PDF, solution, and testcase availability in order', () => {
  assert.deepEqual(resourceStatus(library[0]).map((item) => [item.label, item.ready]), [['PDF', true], ['SOLUTION', true], ['TESTCASE', false]]);
  assert.deepEqual(resourceStatus(library[5]).map((item) => item.ready), [false, false, false]);
});
