export const LIMIT = 15;

const valueParam = { name: 'x', min: -99, max: 99, default: 8 };
const indexes = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

function newCell(state, value) {
  const cell = { key: `h${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

const swap = (cells, i, j) => {
  [cells[i], cells[j]] = [cells[j], cells[i]];
};

function* expand(state) {
  if (state.cells.length + 1 <= state.capacity) return;
  const next = state.capacity * 2;
  yield { line: 0, msg: `size + 1 = ${state.cells.length + 1} > capacity ${state.capacity}: expand(${next}) allocates a bigger array`, state, hl: { compare: indexes(0, state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} element${state.cells.length === 1 ? '' : 's'} into the new array and free the old one`, state, hl: { moved: indexes(0, state.cells.length) } };
}

// The course's fixUp keeps a hole and shifts parents down; the result is the same as these
// swaps, and swaps show both views moving, so each step is drawn as a swap.
function* fixUp(state, start) {
  const { cells } = state;
  let idx = start;
  while (idx > 0) {
    const p = (idx - 1) >> 1;
    const less = cells[idx].value < cells[p].value;
    yield {
      line: 0,
      msg: `p = (${idx} - 1) / 2 = ${p}. mLess(${cells[idx].value}, ${cells[p].value}) is ${less}: ${less ? 'the parent is higher priority, stop' : 'the child is not lower, swap up'}`,
      state,
      hl: { compare: [idx, p] },
    };
    if (less) return;
    swap(cells, idx, p);
    yield { line: 0, msg: `Swap mData[${idx}] and mData[${p}]; the new value moves up to index ${p}`, state, hl: { moved: [idx, p] } };
    idx = p;
  }
  yield { line: 0, msg: 'idx = 0: the new value reached the root, stop', state, hl: { done: [0] } };
}

function* fixDown(state, start) {
  const { cells } = state;
  let idx = start;
  while (2 * idx + 1 < cells.length) {
    let c = 2 * idx + 1;
    if (c + 1 < cells.length) {
      const right = cells[c].value < cells[c + 1].value;
      yield {
        line: 0,
        msg: `Children of ${idx}: ${c} and ${c + 1}. mLess(${cells[c].value}, ${cells[c + 1].value}) is ${right}: take child ${right ? c + 1 : c}, the higher priority one`,
        state,
        hl: { compare: [c, c + 1] },
      };
      if (right) c += 1;
    } else {
      yield { line: 0, msg: `Index ${idx} has only one child, ${c}`, state, hl: { compare: [c] } };
    }
    const less = cells[c].value < cells[idx].value;
    yield {
      line: 0,
      msg: `mLess(${cells[c].value}, ${cells[idx].value}) is ${less}: ${less ? 'the child is lower priority, stop' : 'the child is not lower, swap down'}`,
      state,
      hl: { compare: [idx, c] },
    };
    if (less) return;
    swap(cells, idx, c);
    yield { line: 0, msg: `Swap mData[${idx}] and mData[${c}]; the value moves down to index ${c}`, state, hl: { moved: [idx, c] } };
    idx = c;
  }
  yield { line: 0, msg: `Index ${idx} has no child inside the heap (2 * ${idx} + 1 = ${2 * idx + 1} >= size ${cells.length}), stop`, state, hl: { done: [idx] } };
}

export default {
  id: 'priority-queue',
  side: 'data',
  group: 'Adaptor',
  title: 'priority_queue',
  summary: 'The course CP::priority_queue: a max-heap in a dynamic array (mLess comparator, fixUp and fixDown, capacity doubles). It is drawn as a tree and as the array; index i has children 2i+1 and 2i+2. Equal values may swap, as in the slides\' mLess(tmp, parent) test.',
  renderer: 'heap',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: most pushes only walk up the tree (at most log n swaps), but a full array is copied into one twice as big. top() reads mData[0].',
  },
  declare: 'CP::priority_queue<int> pq;  // holds 9, 5, 7 (capacity 4)',
  preset() {
    return {
      cells: [{ key: 'h0', value: 9 }, { key: 'h1', value: 5 }, { key: 'h2', value: 7 }],
      capacity: 4,
      limit: LIMIT,
      nextKey: 3,
    };
  },
  ops: {
    push: {
      params: [valueParam],
      time: 'O(log n)*',
      code: 'pq.push({x});',
      check: (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null),
      *run(state, { x }) {
        yield* expand(state);
        state.cells.push(newCell(state, x));
        const at = state.cells.length - 1;
        yield { line: 0, msg: `mData[${at}] = ${x}; size becomes ${state.cells.length}. fixUp(${at}) restores the heap order`, state, hl: { active: [at] } };
        yield* fixUp(state, at);
      },
    },
    pop: {
      params: [],
      time: 'O(log n)',
      code: 'pq.pop();',
      check: (state) => (state.cells.length === 0 ? 'pop on an empty priority_queue is undefined behaviour' : null),
      *run(state) {
        const last = state.cells.length - 1;
        yield { line: 0, msg: `Remove the top ${state.cells[0].value}: copy the last element mData[${last}] = ${state.cells[last].value} to mData[0]`, state, hl: { active: [0], compare: last > 0 ? [last] : [] } };
        state.cells[0] = state.cells[last];
        state.cells.pop();
        yield { line: 0, msg: state.cells.length ? `size becomes ${state.cells.length}; fixDown(0) pushes the moved value down` : 'size becomes 0: the queue is empty', state, hl: state.cells.length ? { moved: [0] } : {} };
        if (state.cells.length > 1) yield* fixDown(state, 0);
      },
    },
    top: {
      params: [],
      time: 'O(1)',
      code: 'pq.top();',
      check: (state) => (state.cells.length === 0 ? 'top on an empty priority_queue is undefined behaviour' : null),
      *run(state) {
        yield { line: 0, msg: `top() is mData[0] = ${state.cells[0].value}, the highest priority value`, state, hl: { active: [0] } };
      },
    },
    clear: {
      params: [],
      time: 'O(1)',
      code: 'pq.clear();  // mSize = 0',
      check: () => null,
      *run(state) {
        if (state.cells.length === 0) {
          yield { line: 0, msg: 'mSize is already 0: nothing to clear', state, hl: {} };
          return;
        }
        yield { line: 0, msg: `Forget all ${state.cells.length} element${state.cells.length === 1 ? '' : 's'}: only mSize changes, the array is not touched`, state, hl: { compare: indexes(0, state.cells.length) } };
        state.cells = [];
        yield { line: 0, msg: `mSize = 0: the queue is empty. mCap stays ${state.capacity}, the memory is kept for later pushes`, state, hl: {} };
      },
    },
    erase: {
      params: [{ name: 'i', min: 0, max: LIMIT - 1, default: 1 }],
      time: 'O(log n)',
      code: 'pq.erase({i});  // mData[i] = mData[mSize-1]; mSize--; then fixUp or fixDown',
      check: (state, { i }) => {
        if (state.cells.length === 0) return 'erase on an empty priority_queue is undefined behaviour';
        return i >= state.cells.length ? `i must be between 0 and size - 1 (${state.cells.length - 1})` : null;
      },
      *run(state, { i }) {
        const last = state.cells.length - 1;
        const gone = state.cells[i].value;
        yield { line: 0, msg: `Erase mData[${i}] = ${gone}: copy the last element mData[${last}] = ${state.cells[last].value} over it`, state, hl: { active: [i], compare: i === last ? [] : [last] } };
        state.cells[i] = state.cells[last];
        state.cells.pop();
        if (i === last) {
          yield { line: 0, msg: `${gone} was the last element: mSize-- (now ${state.cells.length}) and nothing else changes`, state, hl: {} };
          return;
        }
        yield { line: 0, msg: `mSize-- (now ${state.cells.length}). The moved value ${state.cells[i].value} sits at index ${i}; it may be too big or too small for its place`, state, hl: { moved: [i] } };
        const p = (i - 1) >> 1;
        const up = i > 0 && state.cells[p].value < state.cells[i].value;
        yield {
          line: 0,
          msg: i === 0
            ? 'Index 0 has no parent: only fixDown(0) can be needed'
            : `parent mData[${p}] = ${state.cells[p].value}; mLess(parent, value) is ${up}: ${up ? `${state.cells[i].value} beats its parent, fixUp(${i})` : `the parent is not lower, so fixDown(${i})`}`,
          state,
          hl: { compare: i === 0 ? [0] : [i, p] },
        };
        if (up) yield* fixUp(state, i);
        else yield* fixDown(state, i);
      },
    },
    assign: {
      params: ['a', 'b', 'c', 'd', 'e', 'f'].map((name, k) => ({ name, min: -99, max: 99, default: [4, 1, 7, 3, 9, 6][k] })),
      time: 'O(n)',
      code: 'pq.assign({a}, {b}, {c}, {d}, {e}, {f});  // copy the array as is, then heapify bottom-up',
      check: () => null,
      *run(state, args) {
        const input = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => args[name]);
        const n = input.length;
        const old = state.capacity;
        let cap = old;
        while (cap < n) cap *= 2;
        state.cells = input.map((value) => newCell(state, value));
        state.capacity = cap;
        yield { line: 0, msg: `Copy ${n} values into mData in the given order (${input.join(', ')}); mSize = ${n}${cap !== old ? `, mCap grows ${old} -> ${cap} (the array is reallocated)` : ''}. It is not a heap yet`, state, hl: { moved: indexes(0, n) } };
        const firstParent = (n >> 1) - 1;
        yield { line: 0, msg: `Indexes ${firstParent + 1}..${n - 1} are leaves, each is a heap of one. Start at the last parent (${n} / 2 - 1 = ${firstParent}) and fixDown each parent down to 0`, state, hl: { done: indexes(firstParent + 1, n) } };
        for (let i = firstParent; i >= 0; i -= 1) {
          yield { line: 0, msg: `fixDown(${i}): the subtrees below index ${i} are heaps, so settle mData[${i}] = ${state.cells[i].value}`, state, hl: { active: [i] } };
          yield* fixDown(state, i);
        }
        yield { line: 0, msg: 'Index 0 is settled: every parent is at least as high priority as its children, so the array is a heap. Building took O(n), not O(n log n)', state, hl: { done: [0] } };
      },
    },
  },
};
