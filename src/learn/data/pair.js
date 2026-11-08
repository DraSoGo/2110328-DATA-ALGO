export const LIMIT = 8;

const numberParam = (name, value) => ({ name, min: -99, max: 99, default: value });
const indexes = (count) => Array.from({ length: count }, (_, k) => k);
const show = (pair) => `(${pair[0]}, ${pair[1]})`;

function* grow(state) {
  if (state.cells.length < state.capacity) return;
  const next = state.capacity * 2;
  yield { line: 0, msg: `size ${state.cells.length} == capacity ${state.capacity}: allocate a new buffer of ${next}`, state, hl: { compare: indexes(state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} pairs into the new buffer and free the old one`, state, hl: { moved: indexes(state.cells.length) } };
}

function newCell(state, pair) {
  const cell = { key: `p${state.nextKey}`, value: show(pair), pair };
  state.nextKey += 1;
  return cell;
}

// Yields the steps of comparing v[i] < v[j] and returns the result.
function* compareSteps(state, i, j) {
  const [a, b] = [state.cells[i].pair, state.cells[j].pair];
  yield { line: 0, msg: `Compare first: ${a[0]} vs ${b[0]}`, state, hl: { compare: [i, j] } };
  if (a[0] !== b[0]) return a[0] < b[0];
  yield { line: 0, msg: `First values tie at ${a[0]}: compare second: ${a[1]} vs ${b[1]}`, state, hl: { compare: [i, j] } };
  return a[1] < b[1];
}

export default {
  id: 'pair',
  side: 'data',
  group: 'Sequence',
  title: 'pair',
  summary: 'Two values in one object. pairs compare lexicographically: first decides, and second only breaks a tie.',
  renderer: 'array',
  complexity: {
    space: 'O(n)',
    note: '* Amortized, like vector. sort uses std::sort, O(n log n); the animation uses adjacent swaps so you can see each pair comparison.',
  },
  declare: 'vector<pair<int, int>> v = {{3, 1}, {1, 5}, {3, 0}};',
  preset() {
    const state = { cells: [], capacity: 4, cellWidth: 84, nextKey: 0 };
    for (const pair of [[3, 1], [1, 5], [3, 0]]) state.cells.push(newCell(state, pair));
    return state;
  },
  ops: {
    push_back: {
      params: [numberParam('a', 2), numberParam('b', 7)],
      time: 'O(1)*',
      code: 'v.push_back(make_pair({a}, {b}));',
      check: (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} pairs` : null),
      *run(state, { a, b }) {
        yield* grow(state);
        state.cells.push(newCell(state, [a, b]));
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Append ${show([a, b])} at index ${at}`, state, hl: { active: [at] } };
      },
    },
    compare: {
      params: [{ name: 'i', min: 0, max: LIMIT - 1, default: 0 }, { name: 'j', min: 0, max: LIMIT - 1, default: 2 }],
      time: 'O(1)',
      code: 'v[{i}] < v[{j}];',
      check: (state, { i, j }) => (Math.max(i, j) >= state.cells.length ? `i and j must be below size (${state.cells.length})` : null),
      *run(state, { i, j }) {
        const result = yield* compareSteps(state, i, j);
        yield { line: 0, msg: `v[${i}] < v[${j}] is ${result}`, state, hl: { active: result ? [i] : [j] } };
      },
    },
    sort: {
      params: [],
      time: 'O(n log n)',
      code: 'sort(v.begin(), v.end());',
      *run(state) {
        for (let i = 1; i < state.cells.length; i += 1) {
          for (let j = i; j > 0; j -= 1) {
            const smaller = yield* compareSteps(state, j, j - 1);
            if (!smaller) {
              yield { line: 0, msg: `${state.cells[j].value} is not smaller than ${state.cells[j - 1].value}: keep the order`, state, hl: { compare: [j - 1, j] } };
              break;
            }
            const msg = `${state.cells[j].value} < ${state.cells[j - 1].value}: swap them`;
            [state.cells[j - 1], state.cells[j]] = [state.cells[j], state.cells[j - 1]];
            yield { line: 0, msg, state, hl: { moved: [j - 1, j] } };
          }
        }
        yield { line: 0, msg: 'Sorted by first, then by second. std::sort reaches the same order in O(n log n); the swaps above show each comparison', state, hl: { done: indexes(state.cells.length) } };
      },
    },
    pop_back: {
      params: [],
      time: 'O(1)',
      code: 'v.pop_back();',
      check: (state) => (state.cells.length === 0 ? 'pop_back on an empty vector is undefined behaviour' : null),
      *run(state) {
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Remove the last pair ${state.cells[at].value}`, state, hl: { active: [at] } };
        state.cells.pop();
        yield { line: 0, msg: `size becomes ${state.cells.length}; capacity stays ${state.capacity}`, state, hl: {} };
      },
    },
  },
};
