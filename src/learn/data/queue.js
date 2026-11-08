export const LIMIT = 8;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const indexes = (count) => Array.from({ length: count }, (_, k) => k);

function newCell(state, value) {
  const cell = { key: `q${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function slotOf(state, k) {
  return (state.front + k) % state.capacity;
}

function sync(state) {
  state.pointers = { front: state.front, back: state.size ? slotOf(state, state.size - 1) : null };
}

const emptyError = (name) => (state) => (state.size === 0 ? `${name} on an empty queue is undefined behaviour` : null);

export default {
  id: 'queue',
  side: 'data',
  group: 'Adaptor',
  title: 'queue',
  summary: 'First in, first out. The course CP::queue is a circular buffer: front, size, and capacity, with indexes wrapping around.',
  renderer: 'array',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: a full queue doubles its capacity and copies all n elements in queue order, so front becomes 0.',
  },
  declare: 'CP::queue<int> q;  // front at slot 1: 10, 20, 30, capacity 4',
  preset() {
    const state = { cells: [null, { key: 'q0', value: 10 }, { key: 'q1', value: 20 }, { key: 'q2', value: 30 }], capacity: 4, front: 1, size: 3, nextKey: 3 };
    sync(state);
    return state;
  },
  ops: {
    push: {
      params: [valueParam],
      time: 'O(1)*',
      code: 'q.push({x});',
      check: (state) => (state.size >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null),
      *run(state, { x }) {
        if (state.size === state.capacity) {
          const next = state.capacity * 2;
          const used = indexes(state.size).map((k) => slotOf(state, k));
          yield { line: 0, msg: `size ${state.size} == capacity ${state.capacity}: allocate a new buffer of ${next}`, state, hl: { compare: used } };
          const ordered = indexes(state.size).map((k) => state.cells[slotOf(state, k)]);
          state.cells = [...ordered, ...Array(next - state.size).fill(null)];
          state.capacity = next;
          state.front = 0;
          sync(state);
          yield { line: 0, msg: `Copy the ${state.size} elements in queue order into slots 0..${state.size - 1}; front becomes 0`, state, hl: { moved: indexes(state.size) } };
        }
        const at = slotOf(state, state.size);
        state.cells[at] = newCell(state, x);
        state.size += 1;
        sync(state);
        yield { line: 0, msg: `Write ${x} at slot (front + size) % capacity = ${at}; size becomes ${state.size}`, state, hl: { active: [at] } };
      },
    },
    pop: {
      params: [],
      time: 'O(1)',
      code: 'q.pop();',
      check: emptyError('pop'),
      *run(state) {
        const at = state.front;
        yield { line: 0, msg: `Remove the front element ${state.cells[at].value} at slot ${at}`, state, hl: { active: [at] } };
        state.cells[at] = null;
        state.front = (at + 1) % state.capacity;
        state.size -= 1;
        sync(state);
        yield { line: 0, msg: `front moves to (front + 1) % capacity = ${state.front}; size becomes ${state.size}. CP::queue only moves front: the old value stays in memory but is no longer in the queue`, state, hl: {} };
      },
    },
    front: {
      params: [],
      time: 'O(1)',
      code: 'q.front();',
      check: emptyError('front'),
      *run(state) {
        yield { line: 0, msg: `front() is ${state.cells[state.front].value}, at slot front = ${state.front}`, state, hl: { active: [state.front] } };
      },
    },
    back: {
      params: [],
      time: 'O(1)',
      code: 'q.back();',
      check: emptyError('back'),
      *run(state) {
        const at = slotOf(state, state.size - 1);
        yield { line: 0, msg: `back() is ${state.cells[at].value}, at slot (front + size - 1) % capacity = ${at}`, state, hl: { active: [at] } };
      },
    },
  },
};
