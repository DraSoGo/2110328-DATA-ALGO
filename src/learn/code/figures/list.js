// Code-tab figures for list (see ../figures.js for the format).
import { relink } from '../../data/list.js';

// A small list picture. items: [{ key, value }] in order; hk: header key; pointers: { name: key }.
const make = (items, { hk = 'h', pointers = {}, pending = null } = {}) => {
  const state = { header: { key: hk, next: null, prev: null }, nodes: items.map((item) => ({ ...item, next: null, prev: null })), pending, pointers, capacity: 4, nextKey: 9 };
  relink(state);
  return state;
};
const three = (prefix, values) => values.map((value, i) => ({ key: `${prefix}${i}`, value }));
const items = three('n', [10, 20, 30]);
const step = (msg, state, hl = {}) => ({ msg, state, hl });

// Copy of a list state with its own keys, so two panels never share a key.
const renamed = (items, prefix) => items.map((item, i) => ({ key: `${prefix}${i}`, value: item.value }));

function nodeDefault() {
  const empty = make([]);
  empty.header.next = null;
  empty.header.prev = null;
  return [
    step('node(): a new node, data = T()', empty, { active: ['h'] }),
    step('prev( this ), next( this ): both point at itself', make([]), { active: ['h'], edge: ['h.next', 'h.prev'] }),
  ];
}

function nodeCtor() {
  const lane = (next, prev) => make(items, { pending: { key: 'p', value: 15, next, prev, at: 2 } });
  return [
    step('node(data, prev, next): a new node, links still empty', lane(null, null), { active: ['p'] }),
    step('next( next )', lane('n1', null), { active: ['p', 'n1'], edge: ['p.next'] }),
    step('prev( prev )', lane('n1', 'n0'), { active: ['p', 'n0'], edge: ['p.prev'] }),
  ];
}

function iteratorPtr(pointers) {
  return make(items, { pointers });
}

function preInc() {
  return [
    step('ptr is here', iteratorPtr({ it: 'n0' }), { active: ['n0'] }),
    step('ptr = ptr->next', iteratorPtr({ it: 'n1' }), { active: ['n0'], compare: ['n1'], edge: ['n0.next'] }),
    step('return *this: the same iterator, now moved', iteratorPtr({ it: 'n1' }), { done: ['n1'] }),
  ];
}

function preDec() {
  return [
    step('ptr is here', iteratorPtr({ it: 'n1' }), { active: ['n1'] }),
    step('ptr = ptr->prev', iteratorPtr({ it: 'n0' }), { active: ['n1'], compare: ['n0'], edge: ['n1.prev'] }),
    step('return *this: the same iterator, now moved', iteratorPtr({ it: 'n0' }), { done: ['n0'] }),
  ];
}

function postStep(field, from, to) {
  return [
    step('it is here', iteratorPtr({ it: from }), { active: [from] }),
    step('tmp(*this): tmp copies the old position', iteratorPtr({ it: from, tmp: from }), { active: [from] }),
    step(`operator${field === 'next' ? '++' : '--'}(): it moves`, iteratorPtr({ it: to, tmp: from }), { active: [from], compare: [to], edge: [`${from}.${field}`] }),
    step('return tmp: the caller gets the OLD position', iteratorPtr({ it: to, tmp: from }), { done: [from], compare: [to] }),
  ];
}

function deref(msg) {
  return [
    step('it', iteratorPtr({ it: 'n1' }), { active: ['n1'] }),
    step(msg, iteratorPtr({ it: 'n1' }), { done: ['n1'] }),
  ];
}

// == is true on the same node and false on different ones; != is the opposite.
function equality(op) {
  const same = op === '==';
  return [
    step(`same node: ${same}`, iteratorPtr({ it: 'n1', other: 'n1' }), { done: ['n1'] }),
    step(`different nodes: ${!same}`, iteratorPtr({ it: 'n1', other: 'n2' }), { active: ['n1'], compare: ['n2'] }),
  ];
}

function copyCtor() {
  const frames = [];
  const copy = (count) => make(renamed(items, 'c').slice(0, count), { hk: 'ch' });
  const src = (at) => make(items, { pointers: { it: at } });
  frames.push({ msg: 'mHeader( new node() ), mSize( 0 ): an empty list', panels: [{ label: 'a', state: src(null) }, { label: 'this', state: copy(0), hl: { active: ['ch'] } }] });
  items.forEach((item, i) => {
    frames.push({ msg: `push_back(*it) = ${item.value}`, panels: [{ label: 'a', state: src(item.key), hl: { compare: [item.key] } }, { label: 'this', state: copy(i + 1), hl: { active: [`c${i}`] } }] });
  });
  frames.push({ msg: 'it == a.end(): done, own nodes', panels: [{ label: 'a', state: src('h') }, { label: 'this', state: copy(items.length), hl: { done: ['ch', 'c0', 'c1', 'c2'] } }] });
  return frames;
}

function assignOp() {
  const mine = three('t', [7, 8]);
  const theirs = renamed(items, 'o');
  const panels = (left, right, lhl = {}, rhl = {}) => [
    { label: 'this', state: left.state, hl: lhl },
    { label: 'other', state: right.state, hl: rhl },
  ];
  const a = { state: make(mine, { hk: 'th' }) };
  const b = { state: make(theirs, { hk: 'oh' }) };
  const swappedA = { state: make(theirs, { hk: 'oh' }) };
  const swappedB = { state: make(mine, { hk: 'th' }) };
  return [
    { msg: 'other is a copy of the argument (pass by value)', panels: panels(a, b, {}, { active: ['oh'] }) },
    { msg: 'swap mHeader, swap mSize', panels: panels(swappedA, swappedB, { done: ['oh', 'o0', 'o1', 'o2'] }, { compare: ['th', 't0', 't1'] }) },
    { msg: 'end of scope: other (the old nodes) is destroyed', panels: panels(swappedA, swappedB, {}, { removed: ['th', 't0', 't1'] }) },
  ];
}

function destructor() {
  const frames = [step('~list(): clear() first', make(items), {})];
  let left = items;
  while (left.length) {
    frames.push(step(`erase(begin()): delete ${left[0].value}`, make(left, { pointers: { it: left[0].key } }), { removed: [left[0].key] }));
    left = left.slice(1);
    frames.push(step(`mSize = ${left.length}`, make(left), {}));
  }
  frames.push(step('delete mHeader: the list is gone', make([]), { removed: ['h'] }));
  return frames;
}

function print() {
  const frames = [step('prints the header address', make(items, { pointers: { it: null } }), { active: ['h'] })];
  items.forEach((item, i) => {
    frames.push(step(`Node ${i}: *it = ${item.value}, with prev / here / next`, make(items, { pointers: { it: item.key } }), { active: [item.key], edge: [`${item.key}.prev`, `${item.key}.next`] }));
  });
  frames.push(step('it == end(): stop', make(items, { pointers: { it: 'h' } }), { active: ['h'] }));
  return frames;
}


export default {
  'node-class': { show: (s) => ({ hl: { active: ['n1'], edge: ['n1.next', 'n1.prev'] } }), members: ['next chain'] },
  'node-default-ctor': { frames: nodeDefault },
  'node-ctor': { frames: nodeCtor },
  'list-iterator': { show: () => ({ hl: { active: ['n1'] }, pointers: { it: 'n1' } }), members: ['it.ptr'] },
  'iterator-default-ctor': { frames: () => [step('ptr( NULL ): points at nothing', iteratorPtr({ it: null }), {})] },
  'iterator-node-ctor': { frames: () => [step('ptr( NULL )', iteratorPtr({ it: null }), {}), step('ptr( a ): points at node a', iteratorPtr({ it: 'n1' }), { active: ['n1'] })], members: ['it.ptr'] },
  'iterator-pre-inc': { frames: preInc, members: ['it.ptr'] },
  'iterator-pre-dec': { frames: preDec, members: ['it.ptr'] },
  'iterator-post-inc': { frames: () => postStep('next', 'n0', 'n1'), members: ['it.ptr'] },
  'iterator-post-dec': { frames: () => postStep('prev', 'n1', 'n0'), members: ['it.ptr'] },
  'iterator-deref': { frames: () => deref('*it = ptr->data = 20 (a reference to it)'), members: ['it.ptr'] },
  'iterator-arrow': { frames: () => deref('it->x = &(ptr->data): address of the data'), members: ['it.ptr'] },
  'iterator-eq': { frames: () => equality('=='), members: ['it.ptr'] },
  'iterator-neq': { frames: () => equality('!='), members: ['it.ptr'] },
  'iterator-typedef': { show: () => ({ hl: { active: ['n0'] }, pointers: { it: 'n0' } }), members: ['it.ptr'] },
  'copy-ctor': { frames: copyCtor, members: ['mSize'] },
  'default-ctor': { frames: () => [step('mHeader( new node() ), mSize( 0 ): empty list', make([]), { active: ['h'], edge: ['h.next', 'h.prev'] })], members: ['mSize', 'mHeader->next', 'mHeader->prev'] },
  'assign-op': { frames: assignOp, members: ['mSize'] },
  destructor: { frames: destructor, members: ['mSize'] },
  empty: { frames: () => [step('mSize == 0 ? false', make(items), { compare: ['n0', 'n1', 'n2'] }), step('mSize == 0 ? true', make([]), { active: ['h'] })], members: ['mSize'] },
  print: { frames: print, members: ['it.ptr'] },
  'm-header': { show: (s) => ({ hl: { active: [s.header.key] } }), members: ['mHeader->next', 'mHeader->prev'] },
    'm-size': { show: (s) => ({ hl: { compare: s.nodes.map((node) => node.key) } }), members: ['mSize'] },
    'node-data': { show: (s) => ({ hl: { compare: [s.nodes[0].key] } }) },
    'node-prev': { show: (s) => ({ hl: { compare: [s.nodes[0].key] } }), members: ['next chain'] },
    'node-next': { show: (s) => ({ hl: { compare: [s.nodes[0].key] } }), members: ['next chain'] },
    begin: { show: (s) => ({ hl: { active: [s.nodes[0].key] } }), members: ['mHeader->next'] },
    end: { show: (s) => ({ hl: { active: [s.header.key] } }) },
    front: { show: (s) => ({ hl: { active: [s.nodes[0].key] } }), members: ['mHeader->next'] },
    back: { show: (s) => ({ hl: { active: [s.nodes.at(-1).key] } }), members: ['mHeader->prev'] },
    size: { show: (s) => ({ hl: { compare: s.nodes.map((node) => node.key) } }), members: ['mSize'] },
};
