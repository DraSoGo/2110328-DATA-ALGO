import { buildTree, clear, contains, count, erase, find, findMin, insert, LIMIT, lowerBound, upperBound } from './rbtree.js';

export const PRESET = [10, 20, 30, 40, 50, 60, 70];
const valueParam = { name: 'x', min: -99, max: 99, default: 80 };
const tooBig = (state, x) => (!contains(state, x) && state.nodes.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null);

export default {
  id: 'set',
  side: 'data',
  group: 'Tree',
  title: 'set',
  summary: 'std::set keeps distinct keys in sorted order. The standard does not name the structure, but std::set is typically a red-black tree (libstdc++, libc++ and MSVC all use one): a BST whose red/black node colors keep it balanced, so insert, erase and find are O(log n). This demo shows that red-black tree; erase relinks the successor node instead of copying it.',
  renderer: 'tree',
  complexity: {
    space: 'O(n)',
    note: 'A red-black tree with n nodes has height at most 2 log2(n + 1). Insert needs at most 2 rotations and erase at most 3; recoloring may climb to the root, still O(log n).',
  },
  declare: `std::set<int> s = {${PRESET.join(', ')}};`,
  preset() {
    return buildTree(PRESET.map((x) => [x]), false);
  },
  ops: {
    insert: {
      params: [valueParam],
      time: 'O(log n)',
      code: 's.insert({x});',
      check: (state, { x }) => tooBig(state, x),
      *run(state, { x }) {
        const { inserted } = yield* insert(state, x);
        if (!inserted) yield { line: 0, msg: `A set holds distinct keys, so insert(${x}) changes nothing`, state, hl: {} };
      },
    },
    erase: {
      params: [{ ...valueParam, default: 10 }],
      time: 'O(log n)',
      code: 's.erase({x});',
      check: () => null,
      *run(state, { x }) {
        yield* erase(state, x);
      },
    },
    find: {
      params: [{ ...valueParam, default: 50 }],
      time: 'O(log n)',
      code: 's.find({x});',
      check: () => null,
      *run(state, { x }) {
        yield* find(state, x);
      },
    },
    lower_bound: {
      params: [{ ...valueParam, default: 45 }],
      time: 'O(log n)',
      code: 's.lower_bound({x});',
      check: () => null,
      *run(state, { x }) {
        yield* lowerBound(state, x);
      },
    },
    upper_bound: {
      params: [{ ...valueParam, default: 50 }],
      time: 'O(log n)',
      code: 's.upper_bound({x});',
      check: () => null,
      *run(state, { x }) {
        yield* upperBound(state, x);
      },
    },
    count: {
      params: [{ ...valueParam, default: 40 }],
      time: 'O(log n)',
      code: 's.count({x});',
      check: () => null,
      *run(state, { x }) {
        yield* count(state, x);
      },
    },
    begin: {
      params: [],
      time: 'O(log n)',
      code: 's.begin();',
      check: () => null,
      *run(state) {
        yield* findMin(state);
      },
    },
    clear: {
      params: [],
      time: 'O(n)',
      code: 's.clear();',
      check: () => null,
      *run(state) {
        yield* clear(state);
      },
    },
  },
};
