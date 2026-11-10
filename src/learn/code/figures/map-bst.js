// Code-tab figures for map-bst (see ../figures.js for the format).
// treeFigures() is shared with map-avl.js: both headers have the same iterator, copy, print and check code.
import { allKeys } from './helpers.js';

const at = (s, k) => s.nodes.find((n) => n.key === k);
const lab = (s, k) => at(s, k).label;
const parentOf = (s, k) => s.nodes.find((n) => n.left === k || n.right === k)?.key ?? null;
const ptr = (s, pointers) => ({ ...s, pointers });

// preorder / reverse in-order key lists of the tree
function preorder(s, k = s.root, out = []) {
  if (k === null) return out;
  out.push(k);
  preorder(s, at(s, k).left, out);
  return preorder(s, at(s, k).right, out);
}
function reverseInorder(s, k = s.root, depth = 0, out = []) {
  if (k === null) return out;
  reverseInorder(s, at(s, k).right, depth + 1, out);
  out.push({ key: k, depth });
  return reverseInorder(s, at(s, k).left, depth + 1, out);
}

// The tree restricted to `keys` (links to other nodes cut), keys prefixed so panels never collide.
function subset(s, keys, prefix, pointers) {
  const set = new Set(keys);
  const nodes = s.nodes.filter((n) => set.has(n.key)).map((n) => ({
    ...n, key: prefix + n.key, left: set.has(n.left) ? prefix + n.left : null, right: set.has(n.right) ? prefix + n.right : null,
  }));
  return { ...s, nodes, root: set.has(s.root) ? prefix + s.root : null, pointers };
}
const empty = (s, pointers = { mRoot: null }) => ({ ...s, nodes: [], root: null, pointers });

// tree_iterator::operator++ (fwd) or operator-- (!fwd) from node `start`, as in the header.
function walk(s, start, fwd) {
  const down = fwd ? 'right' : 'left';
  const side = fwd ? 'left' : 'right';
  const frames = [];
  const put = (it, parent, msg, hl) => frames.push({ msg, state: ptr(s, { it, parent }), hl });
  let it = start;
  put(it, null, `it at ${lab(s, it)}`, { active: [it] });
  if (at(s, it)[down] === null) {
    let parent = parentOf(s, it);
    put(it, parent, `no ${down} child: look at the parent`, { active: [it], compare: parent === null ? [] : [parent] });
    while (parent !== null && at(s, parent)[down] === it) {
      put(it, parent, `${lab(s, it)} is a ${down} child: go up`, { compare: [it, parent] });
      it = parent;
      parent = parentOf(s, it);
      put(it, parent, `it = ${lab(s, it)}`, { active: [it] });
    }
    it = parent;
    if (it === null) put(null, null, 'no parent left: it = NULL = end()', {});
    else put(it, null, `${lab(s, it)} is a ${fwd ? 'larger' : 'smaller'} ancestor: it stops here`, { done: [it] });
  } else {
    it = at(s, it)[down];
    put(it, start, `go ${down} to ${lab(s, it)}`, { compare: [it] });
    while (at(s, it)[side] !== null) {
      it = at(s, it)[side];
      put(it, null, `then ${side} to ${lab(s, it)}`, { compare: [it] });
    }
    put(it, null, `no ${side} child: it stops at ${lab(s, it)}`, { done: [it] });
  }
  return { frames, end: it };
}

const iterFrames = (starts, fwd) => ({ base }) => starts.flatMap((k) => walk(base, k, fwd).frames);

function postFrames(start, fwd) {
  return ({ base }) => {
    const { end } = walk(base, start, fwd);
    const op = fwd ? '++' : '--';
    const both = (it, tmp) => ptr(base, { it, tmp });
    return [
      { msg: `tmp(*this): tmp copies it`, state: both(start, start), hl: { active: [start] } },
      { msg: `operator${op}(): only it moves`, state: both(end, start), hl: { active: [start], compare: end === null ? [] : [end] } },
      { msg: `return tmp: the old position ${lab(base, start)}`, state: both(end, start), hl: { done: [start] } },
    ];
  };
}

// copy(src, parent): create the node, copy data, recurse left then right (preorder).
function copyFrames(ctor) {
  return ({ base }) => {
    const order = preorder(base);
    const frames = [{
      msg: ctor ? 'mRoot = copy(other.mRoot, NULL)' : 'copy(src, NULL)',
      panels: [{ label: 'other', state: ptr(base, { src: base.root }), hl: { compare: [base.root] } }, { label: 'this', state: empty(base, { tmp: null }) }],
    }];
    order.forEach((k, i) => {
      frames.push({
        msg: `new node, data = ${lab(base, k)}`,
        panels: [
          { label: 'other', state: ptr(base, { src: k }), hl: { compare: [k] } },
          { label: 'this', state: subset(base, order.slice(0, i + 1), 'c', { tmp: `c${k}` }), hl: { active: [`c${k}`] } },
        ],
      });
    });
    frames.push({
      msg: ctor ? 'Done: this owns its own nodes' : 'Done: an independent copy',
      panels: [{ label: 'other', state: ptr(base, { src: null }) }, { label: 'this', state: subset(base, order, 'c', { tmp: null }), hl: { done: order.map((k) => `c${k}`) } }],
    });
    return frames;
  };
}

function assignFrames({ base }) {
  const keep = ['a', 'b', 'd'];
  const rhs = (prefix) => subset(base, keep, prefix, { mRoot: `${prefix}a` });
  const mine = { ...base, pointers: { mRoot: base.root } };
  return [
    { msg: 'other is built by copy (by value)', panels: [{ label: 'this', state: mine }, { label: 'other', state: rhs('r') }] },
    { msg: 'swap(mRoot, other.mRoot), swap(mSize, other.mSize)', panels: [{ label: 'this', state: rhs('r'), hl: { active: ['ra'] } }, { label: 'other', state: mine, hl: { compare: [base.root] } }] },
    { msg: 'other is destroyed: the old nodes are deleted', panels: [{ label: 'this', state: rhs('r'), hl: { done: ['ra', 'rb', 'rd'] } }, { label: 'other', state: empty(base) }] },
  ];
}

function visitFrames(title) {
  return ({ base }) => {
    const frames = title ? [{ msg: title(base), state: ptr(base, { n: base.root }), hl: {} }] : [];
    const seq = reverseInorder(base);
    seq.forEach(({ key, depth }, i) => {
      frames.push({
        msg: `${'--'.repeat(depth)} ${lab(base, key)}`,
        state: ptr(base, { n: key }),
        hl: { active: [key], done: seq.slice(0, i).map((e) => e.key) },
      });
    });
    frames.push({ msg: 'right, node, left: the tree is printed sideways', state: ptr(base, { n: null }), hl: { done: allKeys(base) } });
    return frames;
  };
}

function parentFrames(first) {
  return ({ base }) => {
    const frames = first ? [{ msg: first, state: ptr(base, { r: base.root }), hl: {} }] : [];
    const seen = [];
    for (const k of preorder(base)) {
      const n = at(base, k);
      const kids = [n.left, n.right].filter((c) => c !== null);
      frames.push({
        msg: kids.length ? `${kids.map((c) => lab(base, c)).join(', ')}: parent is ${lab(base, k)}` : `${lab(base, k)}: no children`,
        state: ptr(base, { r: k }),
        hl: { active: [k], compare: kids, done: seen.slice() },
      });
      seen.push(k);
    }
    frames.push({ msg: 'every parent link matches: true', state: ptr(base, { r: null }), hl: { done: seen } });
    return frames;
  };
}

function orderFrames(first) {
  return ({ base }) => {
    const frames = first ? [{ msg: first, state: ptr(base, { r: base.root }), hl: {} }] : [];
    const seen = [];
    for (const k of preorder(base)) {
      const n = at(base, k);
      const text = [n.left !== null ? `${lab(base, n.left)} <` : '', String(lab(base, k)), n.right !== null ? `< ${lab(base, n.right)}` : ''].filter(Boolean).join(' ');
      frames.push({
        msg: `${text}: ok`,
        state: ptr(base, { r: k }),
        hl: { active: [k], compare: [n.left, n.right].filter((c) => c !== null), done: seen.slice() },
      });
      seen.push(k);
    }
    frames.push({ msg: 'left < node < right everywhere: true', state: ptr(base, { r: null }), hl: { done: seen } });
    return frames;
  };
}

// operator[]: find_node first; a miss inserts a node with a default value.
export function subscriptFrames(hit, miss) {
  return (ctx) => {
    const tag = (x) => (frame) => ({ ...frame, msg: `t[${x}]: ${frame.msg}` });
    return [...ctx.run('find', { x: hit }).map(tag(hit)), ...ctx.run('insert', { x: miss }).map(tag(miss))];
  };
}

export function treeFigures() {
  const still = (fn, extra = {}) => ({ frames: (ctx) => [{ msg: '', state: ctx.base, hl: {}, ...fn(ctx) }], ...extra });
  return {
    'value-type': { frames: ({ base }) => [{ msg: 'ValueT = pair(first: key, second: value)', state: { ...base, nodes: [{ key: 'v', label: `${lab(base, base.root)}:v`, left: null, right: null }], root: 'v', capacity: 1, maxDepth: 0, pointers: {} }, hl: { active: ['v'] } }] },
    node: { frames: ({ base }) => [{ msg: 'node: data, left, right, parent', state: ptr(base, { left: 'd', right: 'e', parent: 'a' }), hl: { active: ['b'], compare: ['d', 'e', 'a'] } }] },
    'iterator-class': { frames: ({ base }) => [{ msg: 'tree_iterator holds one node*: ptr', state: ptr(base, { ptr: 'e' }), hl: { active: ['e'] } }] },
    'iterator-typedef': { frames: ({ base }) => [{ msg: 'iterator = tree_iterator: begin() is the smallest node', state: ptr(base, { iterator: 'd' }), hl: { done: ['d'] } }] },
    'iter-inc': { frames: iterFrames(['a', 'e'], true) },
    'iter-dec': { frames: iterFrames(['a', 'f'], false) },
    'iter-post-inc': { frames: postFrames('e', true) },
    'iter-post-dec': { frames: postFrames('f', false) },
    'iter-deref': { frames: ({ base }) => [{ msg: `*it is ptr->data: ${lab(base, 'e')}`, state: ptr(base, { it: 'e' }), hl: { done: ['e'] } }] },
    compare: {
      frames: ({ base }) => [
        { msg: '20 < 40: mLess(k1,k2), -1 (go left)', state: ptr(base, { k1: 'b', k2: 'a' }), hl: { compare: ['b'], active: ['a'] } },
        { msg: '60 > 40: mLess(k2,k1), +1 (go right)', state: ptr(base, { k1: 'c', k2: 'a' }), hl: { compare: ['c'], active: ['a'] } },
        { msg: '40 = 40: neither is less, 0 (found)', state: ptr(base, { k1: 'a', k2: 'a' }), hl: { done: ['a'] } },
      ],
    },
    copy: { frames: copyFrames(false) },
    'copy-ctor': { frames: copyFrames(true), members: ['mSize'] },
    assign: { frames: assignFrames },
    ctor: { frames: ({ base }) => [{ msg: 'mRoot(NULL), mSize(0): an empty tree', state: empty(base), hl: {} }], members: ['mRoot', 'mSize'] },
    empty: {
      frames: ({ base }) => [{
        msg: 'empty() is mSize == 0',
        panels: [{ label: 'empty() = false', state: ptr(base, { mRoot: base.root }) }, { label: 'empty() = true', state: empty(base) }],
      }],
    },
    end: {
      frames: ({ base }) => {
        const last = walk(base, (function max(k) { return at(base, k).right === null ? k : max(at(base, k).right); }(base.root)), true);
        return [...last.frames.slice(-2).map((f, i) => ({ ...f, msg: i ? 'end() = iterator(NULL): one past the largest' : f.msg }))];
      },
    },
    print: { frames: visitFrames((b) => `print: size = ${b.nodes.length}`), members: ['mSize'] },
    'print-node': { frames: visitFrames(null) },
    'check-parent': { frames: parentFrames('checkParent(mRoot)') },
    'check-parent-node': { frames: parentFrames(null) },
    'check-inorder': { frames: orderFrames('checkInorder(mRoot)') },
    'check-inorder-node': { frames: orderFrames(null) },
    'extra-decl': still(({ base }) => ({ state: ptr(base, { mRoot: base.root }), hl: { active: [base.root] } }), { members: ['mRoot', 'mSize'] }),
  };
}

export default {
  'm-root': { show: (s) => ({ hl: { active: [s.root] } }), members: ['mRoot'] },
  'm-size': { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mSize'] },
  'm-less': { show: () => ({}), members: ['inorder'] },
  'find-min': { op: 'begin' },
  'delete-all': { op: 'clear' },
  dtor: { op: 'clear' },
  size: { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mSize'] },
  ...treeFigures(),
  'child-link': {
    frames: ({ base }) => [
      { msg: '15 < 20: parent->left', state: ptr(base, { parent: 'b', link: 'd' }), hl: { active: ['b'], compare: ['d'] } },
      { msg: '70 >= 60: parent->right', state: ptr(base, { parent: 'c', link: 'g' }), hl: { active: ['c'], compare: ['g'] } },
      { msg: 'parent == NULL: the slot is mRoot', state: ptr(base, { parent: null, link: 'a' }), hl: { compare: ['a'] } },
    ],
  },
  subscript: { frames: subscriptFrames(30, 25) },
};
