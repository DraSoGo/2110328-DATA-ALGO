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
  },
};
