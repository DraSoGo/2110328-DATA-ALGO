import { assign, buildTree, clear, contains, count, descend, erase, find, insert, LIMIT, lowerBound, nodeAt, setPointers, upperBound } from './rbtree.js';

export const PRESET = [[10, 1], [20, 4], [30, 9], [40, 16], [50, 25], [60, 36], [70, 49]];
const keyParam = { name: 'k', min: 0, max: 99, default: 80 };
const valueParam = { name: 'v', min: 0, max: 99, default: 64 };
const tooBig = (state, k) => (!contains(state, k) && state.nodes.length >= LIMIT ? `This demo keeps at most ${LIMIT} entries` : null);

export default {
  id: 'map',
  side: 'data',
  group: 'Tree',
  title: 'map',
  summary: 'std::map stores key:value pairs sorted by key, with each key at most once. Like std::set it is typically a red-black tree, ordered by the key only. m[k] inserts k with a default value 0 when it is missing and then assigns; insert never overwrites an existing key. Keys and values are 0..99 here so the k:v labels fit.',
  renderer: 'tree',
  complexity: {
    space: 'O(n)',
    note: 'The same red-black tree as set: height at most 2 log2(n + 1), so every operation is O(log n).',
  },
  declare: `std::map<int, int> m = {${PRESET.map(([k, v]) => `{${k}, ${v}}`).join(', ')}};`,
  preset() {
    return buildTree(PRESET, true);
  },
  ops: {
    'operator[]': {
      params: [keyParam, valueParam],
      time: 'O(log n)',
      code: 'm[{k}] = {v};',
      check: (state, { k }) => tooBig(state, k),
      *run(state, { k, v }) {
        const { key, inserted } = yield* insert(state, k, 0);
        if (!inserted) {
          const old = nodeAt(state, key).v;
          assign(state, key, v);
          yield { line: 0, msg: `m[${k}] returns a reference to the existing value ${old}; the assignment overwrites it with ${v}`, state, hl: { done: [key] } };
          return;
        }
        assign(state, key, v);
        yield { line: 0, msg: `m[${k}] inserted ${k} with the default value 0 and returned a reference to it; the assignment stores ${v}`, state, hl: { done: [key] } };
      },
    },
    insert: {
      params: [{ ...keyParam, default: 30 }, { ...valueParam, default: 99 }],
      time: 'O(log n)',
      code: 'm.insert({{k}, {v}});',
      check: (state, { k }) => tooBig(state, k),
      *run(state, { k, v }) {
        const { key, inserted } = yield* insert(state, k, v);
        if (!inserted) yield { line: 0, msg: `insert never overwrites: key ${k} keeps its value ${nodeAt(state, key).v}, and insert returns {iterator, false}`, state, hl: { active: [key] } };
      },
    },
    erase: {
      params: [{ ...keyParam, default: 10 }],
      time: 'O(log n)',
      code: 'm.erase({k});',
      check: () => null,
      *run(state, { k }) {
        yield* erase(state, k);
      },
    },
    find: {
      params: [{ ...keyParam, default: 50 }],
      time: 'O(log n)',
      code: 'm.find({k});',
      check: () => null,
      *run(state, { k }) {
        const key = yield* find(state, k);
        if (key !== null) yield { line: 0, msg: `it->first is ${k} and it->second is ${nodeAt(state, key).v}`, state, hl: { done: [key] } };
      },
    },
    count: {
      params: [{ ...keyParam, default: 40 }],
      time: 'O(log n)',
      code: 'm.count({k});',
      check: () => null,
      *run(state, { k }) {
        yield* count(state, k);
      },
    },
    lower_bound: {
      params: [{ ...keyParam, default: 45 }],
      time: 'O(log n)',
      code: 'm.lower_bound({k});',
      check: () => null,
      *run(state, { k }) {
        const key = yield* lowerBound(state, k);
        if (key !== null) yield { line: 0, msg: `The iterator points at ${nodeAt(state, key).k}:${nodeAt(state, key).v}, the first pair whose key is >= ${k}`, state, hl: { done: [key] } };
      },
    },
    upper_bound: {
      params: [{ ...keyParam, default: 50 }],
      time: 'O(log n)',
      code: 'm.upper_bound({k});',
      check: () => null,
      *run(state, { k }) {
        const key = yield* upperBound(state, k);
        if (key !== null) yield { line: 0, msg: `The iterator points at ${nodeAt(state, key).k}:${nodeAt(state, key).v}, the first pair whose key is > ${k}`, state, hl: { done: [key] } };
      },
    },
    at: {
      params: [{ ...keyParam, default: 30 }],
      time: 'O(log n)',
      code: 'm.at({k});',
      check: () => null,
      *run(state, { k }) {
        const { cur, found } = yield* descend(state, k, 'find', ['cur', 'p']);
        if (found) {
          setPointers(state, { cur });
          yield { line: 0, msg: `at(${k}) returns a reference to the value ${nodeAt(state, cur).v}; unlike m[${k}] it never inserts`, state, hl: { done: [cur] } };
          return;
        }
        setPointers(state, {});
        yield { line: 0, msg: `Reached an empty link: ${k} is missing, so std::map::at throws std::out_of_range and the map is unchanged (m[${k}] would have inserted it)`, state, hl: {} };
      },
    },
    clear: {
      params: [],
      time: 'O(n)',
      code: 'm.clear();',
      check: () => null,
      *run(state) {
        yield* clear(state);
      },
    },
  },
};
