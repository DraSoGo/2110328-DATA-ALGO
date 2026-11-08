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
  },
};
