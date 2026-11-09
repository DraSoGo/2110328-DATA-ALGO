export const LIMIT = 8;

const HEADER = 'h';
const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const tooBig = (state) => (state.nodes.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null);
const emptyError = (name) => (state) => (state.nodes.length === 0 ? `${name} on an empty list is undefined behaviour` : null);

// Rebuilds every next/prev from the order of state.nodes (circular, through the header).
export function relink(state) {
  const order = [state.header, ...state.nodes];
  order.forEach((node, i) => {
    node.next = order[(i + 1) % order.length].key;
    node.prev = order[(i + order.length - 1) % order.length].key;
  });
}

// Walks the real next pointers from the header: what an iterator loop would see.
export function values(state) {
  const byKey = new Map([[state.header.key, state.header], ...state.nodes.map((node) => [node.key, node])]);
  const out = [];
  for (let at = byKey.get(state.header.next); at !== state.header && out.length <= state.nodes.length; at = byKey.get(at.next)) out.push(at.value);
  return out;
}

function nodeAt(state, key) {
  if (key === state.header.key) return state.header;
  if (state.pending?.key === key) return state.pending;
  return state.nodes.find((node) => node.key === key);
}

const describe = (state, key) => (key === state.header.key ? 'the header' : `${nodeAt(state, key).value}`);
const target = (state, k) => (k < state.nodes.length ? state.nodes[k] : state.header);
const plural = (n) => `${n} element${n === 1 ? '' : 's'}`;

function* begin(state, how) {
  const first = target(state, 0);
  state.pointers.it = first.key;
  const where = state.nodes.length ? `the first node, ${first.value}` : 'the header (the list is empty, so begin() == end())';
  yield { line: 0, msg: `it = ${how}: it points at ${where}`, state, hl: { active: [first.key] } };
}

// Moves the iterator k steps from begin(). This is the O(k) part of insert/erase at a position.
function* walk(state, k) {
  yield* begin(state, 'l.begin()');
  for (let j = 1; j <= k; j += 1) {
    const at = target(state, j);
    state.pointers.it = at.key;
    const where = at === state.header ? 'the header, which is end(): there is no element at this position yet' : `position ${j} (value ${at.value})`;
    yield { line: 0, msg: `++it follows it.ptr->next: it is now at ${where}`, state, hl: { compare: [at.key] } };
  }
}

// it already points at the node `x` the new node goes in front of (the header means "at the back").
function* link(state, k, value) {
  const x = target(state, k);
  const before = nodeAt(state, x.prev);
  const node = { key: `n${state.nextKey}`, value, next: null, prev: null, at: k + 1 };
  state.nextKey += 1;
  state.pending = node;
  yield { line: 0, msg: `Create a node holding ${value}. Its next and prev are still NULL, and no other node knows it yet (CP::list's constructor does the next two steps as new node(e, it.ptr->prev, it.ptr))`, state, hl: { active: [node.key] } };
  node.next = x.key;
  yield { line: 0, msg: `tmp->next = x: the new node points forward at ${describe(state, x.key)}`, state, hl: { active: [node.key, x.key], edge: [`${node.key}.next`] } };
  node.prev = before.key;
  yield { line: 0, msg: `tmp->prev = x->prev: the new node points back at ${describe(state, before.key)}`, state, hl: { active: [node.key, before.key], edge: [`${node.key}.prev`] } };
  before.next = node.key;
  yield { line: 0, msg: `x->prev->next = tmp: ${describe(state, before.key)} now points forward at the new node`, state, hl: { active: [node.key, before.key], edge: [`${before.key}.next`] } };
  x.prev = node.key;
  yield { line: 0, msg: `x->prev = tmp: ${describe(state, x.key)} now points back at the new node, so both directions are linked`, state, hl: { active: [node.key, x.key], edge: [`${x.key}.prev`] } };
  const { at, ...stored } = node;
  state.nodes.splice(k, 0, stored);
  state.pending = null;
  state.pointers.it = null;
  const after = state.nodes.slice(k + 1).map((n) => n.key);
  yield { line: 0, msg: `mSize++: the list holds ${plural(state.nodes.length)} and the new node is at position ${k}`, state, hl: { done: [node.key], moved: after } };
}

// it already points at the node nodes[k].
function* unlink(state, k) {
  const x = state.nodes[k];
  const before = nodeAt(state, x.prev);
  const after = nodeAt(state, x.next);
  yield { line: 0, msg: `Erase the node holding ${x.value} (it.ptr = x); its neighbours are ${describe(state, before.key)} and ${describe(state, after.key)}`, state, hl: { active: [x.key] } };
  before.next = after.key;
  yield { line: 0, msg: `x->prev->next = x->next: ${describe(state, before.key)} now points forward past x at ${describe(state, after.key)}`, state, hl: { active: [x.key, before.key], edge: [`${before.key}.next`] } };
  after.prev = before.key;
  yield { line: 0, msg: `x->next->prev = x->prev: ${describe(state, after.key)} now points back past x at ${describe(state, before.key)}; nothing points at x any more`, state, hl: { active: [x.key, after.key], edge: [`${after.key}.prev`], removed: [x.key] } };
  state.nodes.splice(k, 1);
  state.pointers.it = null;
  yield { line: 0, msg: `delete x; mSize--: the list holds ${plural(state.nodes.length)}${state.nodes.length ? ' and the nodes after x close up' : ' and the header points at itself again'}`, state, hl: { moved: state.nodes.slice(k).map((node) => node.key) } };
}

const swapNext = (state, node, label) => {
  [node.next, node.prev] = [node.prev, node.next];
  return `swap(${label}->next, ${label}->prev): next now points at ${describe(state, node.next)}, prev at ${describe(state, node.prev)}`;
};

// Course clear(): while (mSize > 0) erase(begin());
function* eraseAllFront(state) {
  while (state.nodes.length) {
    yield* begin(state, 'begin()');
    yield* unlink(state, 0);
  }
}

// remove(x): one pass with an iterator; erase(it) at every match, ++it otherwise.
function* removeAll(state, x) {
  let k = 0;
  let removed = 0;
  yield* begin(state, 'l.begin()');
  while (k < state.nodes.length) {
    const node = state.nodes[k];
    state.pointers.it = node.key;
    const same = node.value === x;
    yield { line: 0, msg: `*it == ${x}? ${node.value} ${same ? '==' : '!='} ${x}: ${same ? 'erase this node' : 'keep it and move on'}`, state, hl: { compare: [node.key] } };
    if (same) {
      yield* unlink(state, k);
      removed += 1;
      const next = target(state, k);
      state.pointers.it = next.key;
      yield { line: 0, msg: `it = erase(it) returns the node after x: ${next === state.header ? 'the header, which is end()' : `${next.value}`}`, state, hl: { active: [next.key] } };
    } else {
      k += 1;
      const next = target(state, k);
      state.pointers.it = next.key;
      yield { line: 0, msg: `++it follows it.ptr->next: it is at ${next === state.header ? 'the header, which is end()' : `${next.value}`}`, state, hl: { compare: [next.key] } };
    }
  }
  state.pointers.it = null;
  yield { line: 0, msg: removed ? `it == end(): erased ${plural(removed)} equal to ${x}; mSize = ${state.nodes.length}` : `it == end(): no node held ${x}, the list is unchanged`, state, hl: {} };
}

// Course shift(k): rotate by moving only the header (no insert/erase calls).
function* shift(state, k) {
  const n = state.nodes.length;
  const r = ((k % n) + n) % n;
  yield { line: 0, msg: `r = ((k % size) + size) % size = ((${k} % ${n}) + ${n}) % ${n} = ${r}: the new first element is the one at position ${r}${r === 0 ? ', so the list is already in place' : ''}`, state, hl: {} };
  if (r === 0) return;
  yield* walk(state, r);
  const first = state.nodes[0];
  const last = state.nodes[n - 1];
  const head = state.nodes[r];
  const tail = state.nodes[r - 1];
  const h = state.header;
  last.next = first.key;
  yield { line: 0, msg: `Take the header out of the circle: last->next = first, so ${last.value} points forward at ${first.value}`, state, hl: { active: [last.key, first.key], edge: [`${last.key}.next`] } };
  first.prev = last.key;
  yield { line: 0, msg: `first->prev = last: ${first.value} points back at ${last.value}; the nodes now form a circle without the header`, state, hl: { active: [first.key, last.key], edge: [`${first.key}.prev`] } };
  h.next = head.key;
  yield { line: 0, msg: `mHeader->next = it.ptr: the header's next is the new first element, ${head.value}`, state, hl: { active: [h.key, head.key], edge: [`${h.key}.next`] } };
  h.prev = tail.key;
  yield { line: 0, msg: `mHeader->prev = it.ptr->prev: the header's prev is the new last element, ${tail.value}`, state, hl: { active: [h.key, tail.key], edge: [`${h.key}.prev`] } };
  tail.next = h.key;
  yield { line: 0, msg: `it.ptr->prev->next = mHeader: ${tail.value} points forward at the header`, state, hl: { active: [tail.key, h.key], edge: [`${tail.key}.next`] } };
  head.prev = h.key;
  yield { line: 0, msg: `it.ptr->prev = mHeader: ${head.value} points back at the header, the circle is closed again`, state, hl: { active: [head.key, h.key], edge: [`${head.key}.prev`] } };
  state.nodes = [...state.nodes.slice(r), ...state.nodes.slice(0, r)];
  state.pointers.it = null;
  yield { line: 0, msg: `Done: mSize is still ${n} and no node was created or deleted. Reading from the header, the list is now ${state.nodes.map((node) => node.value).join(', ')}`, state, hl: { moved: state.nodes.map((node) => node.key) } };
}

// reverse(): swap next and prev in every node, header included.
function* reverse(state) {
  const h = state.header;
  yield { line: 0, msg: 'Walk the circle once, starting at the header, and swap next with prev in every node (the header too)', state, hl: { active: [h.key] } };
  const order = [h, ...state.nodes];
  for (const node of order) {
    state.pointers.it = node.key;
    const label = node === h ? 'mHeader' : `${node.value}`;
    yield { line: 0, msg: `p = ${label === 'mHeader' ? 'mHeader' : `node ${label}`}: before the swap next is ${describe(state, node.next)} and prev is ${describe(state, node.prev)}`, state, hl: { compare: [node.key] } };
    const msg = swapNext(state, node, node === h ? 'mHeader' : 'p');
    yield { line: 0, msg, state, hl: { active: [node.key], edge: [`${node.key}.next`, `${node.key}.prev`] } };
  }
  state.pointers.it = null;
  yield { line: 0, msg: 'Every arrow is flipped. The old last node is now the first, and mSize did not change', state, hl: {} };
  state.nodes.reverse();
  yield { line: 0, msg: `Reading from the header along next, the list is ${state.nodes.map((node) => node.value).join(', ') || 'empty'}`, state, hl: { moved: state.nodes.map((node) => node.key) } };
}

export default {
  id: 'list',
  side: 'data',
  group: 'Sequence',
  title: 'list',
  summary: 'Course CP::list: a circular doubly linked list with a header node. Every node has next and prev, the header holds no data, so insert and erase never need special cases.',
  renderer: 'linked',
  complexity: {
    space: 'O(n)',
    note: '* Once you hold an iterator, linking or unlinking a node is just a few pointer assignments: O(1). Reaching position k means walking the iterator k times from begin(): O(k). push/pop at either end are O(1) because the header makes begin() and end() instant.',
  },
  declare: 'CP::list<int> l;  // header + 10, 20, 30; it is an iterator',
  preset() {
    const state = {
      header: { key: HEADER, next: null, prev: null },
      nodes: [{ key: 'n0', value: 10 }, { key: 'n1', value: 20 }, { key: 'n2', value: 30 }],
      pending: null,
      pointers: { it: null },
      capacity: LIMIT,
      nextKey: 3,
    };
    relink(state);
    return state;
  },
  ops: {
    push_back: {
      params: [valueParam],
      time: 'O(1)',
      code: 'l.push_back({x});  // insert(end(), x)',
      check: tooBig,
      *run(state, { x }) {
        const end = state.header;
        state.pointers.it = end.key;
        yield { line: 0, msg: 'push_back(e) is insert(end(), e): end() is the header, and the header sits just after the last node (the list is circular)', state, hl: { active: [end.key] } };
        yield* link(state, state.nodes.length, x);
      },
    },
    push_front: {
      params: [valueParam],
      time: 'O(1)',
      code: 'l.push_front({x});  // insert(begin(), x)',
      check: tooBig,
      *run(state, { x }) {
        yield* begin(state, 'begin()');
        yield* link(state, 0, x);
      },
    },
    pop_back: {
      params: [],
      time: 'O(1)',
      code: 'l.pop_back();  // erase(iterator(mHeader->prev))',
      check: emptyError('pop_back'),
      *run(state) {
        const last = state.nodes.length - 1;
        state.pointers.it = state.nodes[last].key;
        yield { line: 0, msg: `it = iterator(mHeader->prev): the header's prev is the last node, ${state.nodes[last].value}, reached in O(1)`, state, hl: { active: [state.nodes[last].key] } };
        yield* unlink(state, last);
      },
    },
    pop_front: {
      params: [],
      time: 'O(1)',
      code: 'l.pop_front();  // erase(begin())',
      check: emptyError('pop_front'),
      *run(state) {
        yield* begin(state, 'begin()');
        yield* unlink(state, 0);
      },
    },
    insert: {
      params: [{ name: 'pos', min: 0, max: LIMIT, default: 1 }, valueParam],
      time: 'O(k)*',
      code: 'auto it = l.begin(); for (int i = 0; i < {pos}; i++) ++it; l.insert(it, {x});',
      check: (state, { pos }) => tooBig(state) || (pos > state.nodes.length ? `pos must be between 0 and size (${state.nodes.length})` : null),
      *run(state, { pos, x }) {
        yield* walk(state, pos);
        yield* link(state, pos, x);
      },
    },
    erase: {
      params: [{ name: 'pos', min: 0, max: LIMIT - 1, default: 1 }],
      time: 'O(k)*',
      code: 'auto it = l.begin(); for (int i = 0; i < {pos}; i++) ++it; l.erase(it);',
      check: (state, { pos }) => {
        if (state.nodes.length === 0) return 'erase on an empty list is undefined behaviour';
        return pos >= state.nodes.length ? `pos must be between 0 and size - 1 (${state.nodes.length - 1})` : null;
      },
      *run(state, { pos }) {
        yield* walk(state, pos);
        yield* unlink(state, pos);
      },
    },
    clear: {
      params: [],
      time: 'O(n)',
      code: 'l.clear();  // while (mSize > 0) erase(begin());',
      check: () => null,
      *run(state) {
        if (state.nodes.length === 0) {
          yield { line: 0, msg: 'mSize == 0: the loop body never runs, the header already points at itself', state, hl: { active: [state.header.key] } };
          return;
        }
        yield { line: 0, msg: `mSize = ${state.nodes.length} > 0: erase(begin()) once per element, front first`, state, hl: { compare: state.nodes.map((node) => node.key) } };
        yield* eraseAllFront(state);
        yield { line: 0, msg: 'mSize == 0: the loop ends. mHeader->next and mHeader->prev both point at the header again', state, hl: { done: [state.header.key] } };
      },
    },
    reverse: {
      params: [],
      time: 'O(n)',
      code: 'l.reverse();  // swap(p->next, p->prev) for every node, header included',
      check: () => null,
      *run(state) {
        yield* reverse(state);
      },
    },
    remove: {
      params: [{ name: 'x', min: -99, max: 99, default: 20 }],
      time: 'O(n)',
      code: 'l.remove({x});  // erase every node equal to x',
      check: () => null,
      *run(state, { x }) {
        yield* removeAll(state, x);
      },
    },
    shift: {
      params: [{ name: 'k', min: -20, max: 20, default: 1 }],
      time: 'O(n)',
      code: 'l.shift({k});  // circular shift: left for k > 0, right for k < 0, only mHeader moves',
      check: (state) => (state.nodes.length === 0 ? 'shift needs size > 0: k % size with size 0 is undefined behaviour' : null),
      *run(state, { k }) {
        yield* shift(state, k);
      },
    },
  },
};
