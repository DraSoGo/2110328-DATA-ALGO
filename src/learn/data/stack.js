export const LIMIT = 8;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const indexes = (count) => Array.from({ length: count }, (_, k) => k);

function newCell(state, value) {
  const cell = { key: `s${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function syncTop(state) {
  state.pointers = { top: state.cells.length - 1 };
}

function* grow(state) {
  if (state.cells.length < state.capacity) return;
  const next = state.capacity === 0 ? 1 : state.capacity * 2;
  yield { line: 0, msg: `size ${state.cells.length} == capacity ${state.capacity}: expand to a new array of ${next}`, state, hl: { compare: indexes(state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} element${state.cells.length === 1 ? '' : 's'} into the new array and free the old one`, state, hl: { moved: indexes(state.cells.length) } };
}

const emptyError = (name) => (state) => (state.cells.length === 0 ? `${name} on an empty stack is undefined behaviour` : null);

export default {
  id: 'stack',
  side: 'data',
  group: 'Adaptor',
  title: 'stack',
  summary: 'Last in, first out. The course CP::stack keeps a dynamic array and pushes and pops at its end, the top.',
  renderer: 'column',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: a full stack doubles its capacity and copies all n elements once.',
  },
  declare: 'CP::stack<int> s;  // holds 10, 20, 30 (bottom → top), capacity 4',
  preset() {
    return { cells: [{ key: 's0', value: 10 }, { key: 's1', value: 20 }, { key: 's2', value: 30 }], capacity: 4, nextKey: 3, pointers: { top: 2 } };
  },
  ops: {
    push: {
      params: [valueParam],
      time: 'O(1)*',
      code: 's.push({x});',
      check: (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null),
      *run(state, { x }) {
        yield* grow(state);
        state.cells.push(newCell(state, x));
        syncTop(state);
        const top = state.cells.length - 1;
        yield { line: 0, msg: `Write ${x} at index ${top}; top moves up to ${top}`, state, hl: { active: [top] } };
      },
    },
    pop: {
      params: [],
      time: 'O(1)',
      code: 's.pop();',
      check: emptyError('pop'),
      *run(state) {
        const top = state.cells.length - 1;
        yield { line: 0, msg: `Remove the top element ${state.cells[top].value}`, state, hl: { active: [top] } };
        state.cells.pop();
        syncTop(state);
        yield { line: 0, msg: `top moves down to ${state.cells.length - 1}; capacity stays ${state.capacity}`, state, hl: {} };
      },
    },
    top: {
      params: [],
      time: 'O(1)',
      code: 's.top();',
      check: emptyError('top'),
      *run(state) {
        const top = state.cells.length - 1;
        yield { line: 0, msg: `top() is ${state.cells[top].value}: it reads data[size - 1]`, state, hl: { active: [top] } };
      },
    },
    empty: {
      params: [],
      time: 'O(1)',
      code: 's.empty();',
      *run(state) {
        const size = state.cells.length;
        yield { line: 0, msg: `empty() is ${size === 0}: it tests mSize == 0 (mSize is ${size}, mCap is ${state.capacity})`, state, hl: {} };
      },
    },
    clear: {
      params: [],
      time: 'O(1)',
      code: 'while (!s.empty()) s.pop();',
      *run(state) {
        const was = state.cells.length;
        yield { line: 0, msg: `Pop every element: each pop only does mSize--, so ${was} pop${was === 1 ? '' : 's'} are needed (O(n) with this loop)`, state, hl: { compare: indexes(was) } };
        state.cells = [];
        syncTop(state);
        yield { line: 0, msg: `mSize is 0 and top is -1; mCap stays ${state.capacity}`, state, hl: {} };
      },
    },
    multi_pop: {
      params: [{ name: 'k', min: 0, max: LIMIT, default: 2 }],
      time: 'O(k)',
      code: 'for (int i = 0; i < {k} && !s.empty(); i++) s.pop();',
      *run(state, { k }) {
        const count = Math.min(k, state.cells.length);
        if (count === 0) {
          yield { line: 0, msg: k === 0 ? 'k = 0: the loop body never runs' : 'The stack is empty: !s.empty() fails at once, so nothing is popped', state, hl: {} };
          return;
        }
        for (let i = 0; i < count; i += 1) {
          const top = state.cells.length - 1;
          yield { line: 0, msg: `Pop ${state.cells[top].value} (pop ${i + 1} of ${count})`, state, hl: { active: [top] } };
          state.cells.pop();
          syncTop(state);
        }
        const why = count < k ? `the stack ran out after ${count} (k = ${k})` : `k = ${k} pops done`;
        yield { line: 0, msg: `${why}; mSize is ${state.cells.length}, top is ${state.cells.length - 1}, mCap stays ${state.capacity}`, state, hl: {} };
      },
    },
    deep_push: {
      params: [{ name: 'pos', min: 0, max: LIMIT, default: 1 }, valueParam],
      time: 'O(pos)',
      code: 's.deep_push({pos}, {x});',
      check: (state, { pos }) => {
        if (state.cells.length >= LIMIT) return `This demo keeps at most ${LIMIT} elements`;
        return pos > state.cells.length ? `pos must be between 0 and size (${state.cells.length})` : null;
      },
      *run(state, { pos, x }) {
        yield* grow(state);
        const at = state.cells.length - pos;
        const tail = [];
        for (let i = at; i < state.cells.length; i += 1) tail.push(i);
        if (tail.length) yield { line: 0, msg: `${pos} element${pos === 1 ? '' : 's'} sit above the target: shift them one slot up to open index ${at}`, state, hl: { compare: tail } };
        state.cells.splice(at, 0, newCell(state, x));
        syncTop(state);
        yield { line: 0, msg: pos === 0 ? `pos = 0: same as push; write ${x} at index ${at}` : `Write ${x} at index ${at}: it now has ${pos} element${pos === 1 ? '' : 's'} above it; mSize is ${state.cells.length}`, state, hl: { active: [at], moved: tail.map((i) => i + 1) } };
      },
    },
  },
};
