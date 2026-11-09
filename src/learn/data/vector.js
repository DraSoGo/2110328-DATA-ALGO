export const LIMIT = 12;
export const MAX_CAPACITY = 16;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const tooBig = (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null);
const indexes = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

function newCell(state, value) {
  const cell = { key: `v${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function* grow(state) {
  if (state.cells.length < state.capacity) return;
  const next = state.capacity === 0 ? 1 : state.capacity * 2;
  yield { line: 0, msg: `size ${state.cells.length} == capacity ${state.capacity}: allocate a new buffer of ${next}`, state, hl: { compare: indexes(0, state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} element${state.cells.length === 1 ? '' : 's'} into the new buffer and free the old one`, state, hl: { moved: indexes(0, state.cells.length) } };
}

export default {
  id: 'vector',
  side: 'data',
  group: 'Sequence',
  title: 'vector',
  summary: 'A growable array: contiguous slots, a size, and a capacity that doubles when it runs out.',
  renderer: 'array',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: most push_backs are O(1), but a full vector copies all n elements into a buffer twice as big.',
  },
  declare: 'vector<int> v = {10, 20, 30}; v.reserve(4);',
  preset() {
    return { cells: [{ key: 'v0', value: 10 }, { key: 'v1', value: 20 }, { key: 'v2', value: 30 }], capacity: 4, nextKey: 3 };
  },
  ops: {
    push_back: {
      params: [valueParam],
      time: 'O(1)*',
      code: 'v.push_back({x});',
      check: (state) => tooBig(state),
      *run(state, { x }) {
        yield* grow(state);
        state.cells.push(newCell(state, x));
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Write ${x} at index ${at}; size becomes ${state.cells.length}`, state, hl: { active: [at] } };
      },
    },
    pop_back: {
      params: [],
      time: 'O(1)',
      code: 'v.pop_back();',
      check: (state) => (state.cells.length === 0 ? 'pop_back on an empty vector is undefined behaviour' : null),
      *run(state) {
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Remove the last element v[${at}] = ${state.cells[at].value}`, state, hl: { active: [at] } };
        state.cells.pop();
        yield { line: 0, msg: `size becomes ${state.cells.length}; capacity stays ${state.capacity}`, state, hl: {} };
      },
    },
    insert: {
      params: [{ name: 'pos', min: 0, max: LIMIT, default: 1 }, valueParam],
      time: 'O(n)',
      code: 'v.insert(v.begin() + {pos}, {x});',
      check: (state, { pos }) => tooBig(state) || (pos > state.cells.length ? `pos must be between 0 and size (${state.cells.length})` : null),
      *run(state, { pos, x }) {
        yield* grow(state);
        const tail = indexes(pos, state.cells.length);
        if (tail.length) yield { line: 0, msg: `Shift ${tail.length} element${tail.length === 1 ? '' : 's'} one slot right to open index ${pos}`, state, hl: { compare: tail } };
        state.cells.splice(pos, 0, newCell(state, x));
        yield { line: 0, msg: `Write ${x} at index ${pos}; size becomes ${state.cells.length}`, state, hl: { active: [pos], moved: tail.map((i) => i + 1) } };
      },
    },
    erase: {
      params: [{ name: 'pos', min: 0, max: LIMIT - 1, default: 0 }],
      time: 'O(n)',
      code: 'v.erase(v.begin() + {pos});',
      check: (state, { pos }) => {
        if (state.cells.length === 0) return 'erase on an empty vector is undefined behaviour';
        return pos >= state.cells.length ? `pos must be between 0 and size - 1 (${state.cells.length - 1})` : null;
      },
      *run(state, { pos }) {
        yield { line: 0, msg: `Erase v[${pos}] = ${state.cells[pos].value}`, state, hl: { active: [pos] } };
        state.cells.splice(pos, 1);
        const moved = indexes(pos, state.cells.length);
        yield { line: 0, msg: moved.length ? `Shift ${moved.length} element${moved.length === 1 ? '' : 's'} one slot left; size becomes ${state.cells.length}` : `size becomes ${state.cells.length}`, state, hl: { moved } };
      },
    },
    at: {
      params: [{ name: 'i', min: 0, max: LIMIT - 1, default: 0 }],
      time: 'O(1)',
      code: 'v.at({i});',
      check: (state, { i }) => (i >= state.cells.length ? `i must be below size (${state.cells.length})` : null),
      *run(state, { i }) {
        yield { line: 0, msg: `v.at(${i}) is ${state.cells[i].value}: a bounds check plus one address computation, O(1)`, state, hl: { active: [i] } };
      },
    },
    clear: {
      params: [],
      time: 'O(1)',
      code: 'v.clear();',
      *run(state) {
        const was = state.cells.length;
        yield { line: 0, msg: `clear() only sets mSize = 0; the ${was} old value${was === 1 ? '' : 's'} stay in memory but are no longer part of the vector`, state, hl: { compare: indexes(0, was) } };
        state.cells = [];
        yield { line: 0, msg: `mSize is 0; mCap stays ${state.capacity}, so nothing is freed`, state, hl: {} };
      },
    },
    empty: {
      params: [],
      time: 'O(1)',
      code: 'v.empty();',
      *run(state) {
        const size = state.cells.length;
        yield { line: 0, msg: `empty() is ${size === 0}: it just tests mSize == 0 (mSize is ${size}, mCap is ${state.capacity})`, state, hl: {} };
      },
    },
    resize: {
      params: [{ name: 'n', min: 0, max: LIMIT, default: 5 }],
      time: 'O(n)',
      code: 'v.resize({n});',
      *run(state, { n }) {
        const size = state.cells.length;
        if (n > state.capacity) {
          yield { line: 0, msg: `n = ${n} > mCap ${state.capacity}: expand(${n}) allocates a buffer of exactly ${n}`, state, hl: { compare: indexes(0, size) } };
          state.capacity = n;
          yield { line: 0, msg: `Copy ${size} element${size === 1 ? '' : 's'} into the new buffer and free the old one; mCap is ${n}`, state, hl: { moved: indexes(0, size) } };
        }
        if (n > size) {
          for (let at = size; at < n; at += 1) state.cells.push(newCell(state, 0));
          yield { line: 0, msg: `Grow: fill slots ${size}..${n - 1} with T() = 0; mSize becomes ${n}`, state, hl: { active: indexes(size, n) } };
        } else if (n < size) {
          yield { line: 0, msg: `Shrink: slots ${n}..${size - 1} fall outside the vector`, state, hl: { compare: indexes(n, size) } };
          state.cells.length = n;
          yield { line: 0, msg: `mSize becomes ${n}; mCap stays ${state.capacity}, nothing is freed`, state, hl: {} };
        } else {
          yield { line: 0, msg: `n equals mSize (${size}): nothing changes`, state, hl: {} };
        }
      },
    },
    reserve: {
      params: [{ name: 'n', min: 0, max: MAX_CAPACITY, default: 8 }],
      time: 'O(n)',
      code: 'v.reserve({n});',
      *run(state, { n }) {
        const size = state.cells.length;
        if (n <= state.capacity) {
          yield { line: 0, msg: `n = ${n} <= mCap ${state.capacity}: reserve does nothing, it never shrinks`, state, hl: {} };
          return;
        }
        yield { line: 0, msg: `n = ${n} > mCap ${state.capacity}: allocate a buffer of ${n}`, state, hl: { compare: indexes(0, size) } };
        state.capacity = n;
        yield { line: 0, msg: `Copy ${size} element${size === 1 ? '' : 's'} into the new buffer; mSize stays ${size}, mCap is ${n}`, state, hl: { moved: indexes(0, size) } };
      },
    },
    front: {
      params: [],
      time: 'O(1)',
      code: 'v.front();',
      check: (state) => (state.cells.length === 0 ? 'front on an empty vector is undefined behaviour' : null),
      *run(state) {
        yield { line: 0, msg: `front() is ${state.cells[0].value}: it reads mData[0]`, state, hl: { active: [0] } };
      },
    },
    back: {
      params: [],
      time: 'O(1)',
      code: 'v.back();',
      check: (state) => (state.cells.length === 0 ? 'back on an empty vector is undefined behaviour' : null),
      *run(state) {
        const at = state.cells.length - 1;
        yield { line: 0, msg: `back() is ${state.cells[at].value}: it reads mData[mSize - 1] = mData[${at}]`, state, hl: { active: [at] } };
      },
    },
    block_swap: {
      params: [{ name: 'a', min: 0, max: LIMIT - 1, default: 0 }, { name: 'b', min: 0, max: LIMIT - 1, default: 2 }, { name: 'm', min: 1, max: LIMIT / 2, default: 1 }],
      time: 'O(m)',
      code: 'v.block_swap(v.begin() + {a}, v.begin() + {b}, {m});',
      check: (state, { a, b, m }) => {
        const size = state.cells.length;
        if (Math.max(a, b) + m > size) return `Both blocks must fit inside the vector (size ${size}); the course block_swap would return false and change nothing`;
        if (a < b + m && b < a + m) return 'The two blocks must not overlap; the course block_swap would return false and change nothing';
        return null;
      },
      *run(state, { a, b, m }) {
        yield { line: 0, msg: `Swap the ${m} element${m === 1 ? '' : 's'} at ${a}..${a + m - 1} with the ${m} at ${b}..${b + m - 1}; the blocks do not overlap`, state, hl: { compare: [...indexes(a, a + m), ...indexes(b, b + m)] } };
        for (let k = 0; k < m; k += 1) {
          const msg = `swap(mData[${a + k}] = ${state.cells[a + k].value}, mData[${b + k}] = ${state.cells[b + k].value})`;
          [state.cells[a + k], state.cells[b + k]] = [state.cells[b + k], state.cells[a + k]];
          yield { line: 0, msg, state, hl: { moved: [a + k, b + k] } };
        }
        yield { line: 0, msg: `Done: mSize is still ${state.cells.length} and mCap is ${state.capacity}; the function returns true`, state, hl: { done: [...indexes(a, a + m), ...indexes(b, b + m)] } };
      },
    },
  },
};
