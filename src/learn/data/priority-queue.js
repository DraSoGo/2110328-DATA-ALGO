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
  },
};
