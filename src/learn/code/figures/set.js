// Code-tab figures for set.h (see ../figures.js for the format).
// rbFigures(c) is shared with map.js: set.h and map.h are the same red-black tree.
// The preset (10..70 inserted in order) keeps its node keys n0..n6 = 10..70:
//   20b( 10b, 40r( 30b, 60b( 50r, 70r ) ) )
import { allKeys } from './helpers.js';

const at = (s, k) => s.nodes.find((n) => n.key === k);
const lab = (s, k) => at(s, k).label;
const keyOf = (s, k) => at(s, k).k;
const parentOf = (s, k) => s.nodes.find((n) => n.left === k || n.right === k)?.key ?? null;
// Always declare 4 pointer rows (as rbtree.js does) so the picture keeps its size.
const pad = (pointers) => {
  const out = { ...pointers };
  for (let i = 0; Object.keys(out).length < 4; i += 1) out[`_${i}`] = null;
  return out;
};
const ptr = (s, pointers) => ({ ...s, pointers: pad(pointers) });
const empty = (s, pointers = { mRoot: null }) => ({ ...s, nodes: [], root: null, pointers: pad(pointers) });
const reds = (s) => s.nodes.filter((n) => n.color === 'red').map((n) => n.key);
const blacks = (s) => s.nodes.filter((n) => n.color === 'black').map((n) => n.key);

function preorder(s, k = s.root, out = []) {
  if (k === null) return out;
  out.push(k);
  preorder(s, at(s, k).left, out);
  return preorder(s, at(s, k).right, out);
}
function postorder(s, k = s.root, out = []) {
  if (k === null) return out;
  postorder(s, at(s, k).left, out);
  postorder(s, at(s, k).right, out);
  out.push(k);
  return out;
}
function reverseInorder(s, k = s.root, depth = 0, out = []) {
  if (k === null) return out;
  reverseInorder(s, at(s, k).right, depth + 1, out);
  out.push({ key: k, depth });
  return reverseInorder(s, at(s, k).left, depth + 1, out);
}

// The tree restricted to `keys`, keys prefixed so two panels never share a data-key.
function subset(s, keys, prefix, pointers) {
  const set = new Set(keys);
  const nodes = s.nodes.filter((n) => set.has(n.key)).map((n) => ({
    ...n, key: prefix + n.key, left: set.has(n.left) ? prefix + n.left : null, right: set.has(n.right) ? prefix + n.right : null,
  }));
  return { ...s, nodes, root: set.has(s.root) ? prefix + s.root : null, pointers: pad(pointers) };
}

// rotate_left / rotate_right of set.h on a copy of the state (colors untouched).
function rotate(s0, x, dir) {
  const s = structuredClone(s0);
  const p = parentOf(s, x);
  const nx = at(s, x);
  const other = dir === 'left' ? 'right' : 'left';
  const y = nx[other];
  nx[other] = at(s, y)[dir];
  at(s, y)[dir] = x;
  if (p === null) s.root = y;
  else if (at(s, p).left === x) at(s, p).left = y;
  else at(s, p).right = y;
  return { state: s, y };
}

// tree_iterator::operator++ (fwd) or operator-- (!fwd) from node `start`.
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
    else put(it, null, `${lab(s, it)} is reached from its ${side} side: it stops here`, { done: [it] });
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

function postFrames(start, fwd) {
  return ({ base }) => {
    const { end } = walk(base, start, fwd);
    const op = fwd ? '++' : '--';
    const both = (it, tmp) => ptr(base, { it, tmp });
    return [
      { msg: 'tmp(*this): tmp copies it', state: both(start, start), hl: { active: [start] } },
      { msg: `operator${op}(): only it moves`, state: both(end, start), hl: { active: [start], compare: end === null ? [] : [end] } },
      { msg: `return tmp: the old position ${lab(base, start)}`, state: both(end, start), hl: { done: [start] } },
    ];
  };
}

function copyFrames(ctor) {
  return ({ base }) => {
    const order = preorder(base);
    const frames = [{
      msg: ctor ? 'mRoot = copy(other.mRoot, NULL)' : 'copy(src, NULL)',
      panels: [{ label: 'other', state: ptr(base, { src: base.root }), hl: { compare: [base.root] } }, { label: 'this', state: empty(base, { tmp: null }) }],
    }];
    order.forEach((k, i) => {
      frames.push({
        msg: `new node(${lab(base, k)}, ..., ${at(base, k).color.toUpperCase()})`,
        panels: [
          { label: 'other', state: ptr(base, { src: k }), hl: { compare: [k] } },
          { label: 'this', state: subset(base, order.slice(0, i + 1), 'c', { tmp: `c${k}` }), hl: { active: [`c${k}`] } },
        ],
      });
    });
    frames.push({
      msg: 'Done: same shape, same colors, no fix-up needed',
      panels: [{ label: 'other', state: ptr(base, {}) }, { label: 'this', state: subset(base, order, 'c', {}), hl: { done: order.map((k) => `c${k}`) } }],
    });
    return frames;
  };
}

function assignFrames({ base }) {
  const keep = [base.root, at(base, base.root).left, at(base, base.root).right];
  const rhs = subset(base, keep, 'r', { mRoot: `r${base.root}` });
  const mine = ptr(base, { mRoot: base.root });
  return [
    { msg: 'other is built by copy (by value)', panels: [{ label: 'this', state: mine }, { label: 'other', state: rhs }] },
    { msg: 'swap(mRoot, other.mRoot), swap(mSize, other.mSize)', panels: [{ label: 'this', state: rhs, hl: { active: [`r${base.root}`] } }, { label: 'other', state: mine, hl: { compare: [base.root] } }] },
    { msg: 'other is destroyed: the old nodes are deleted', panels: [{ label: 'this', state: rhs, hl: { done: keep.map((k) => `r${k}`) } }, { label: 'other', state: empty(base) }] },
  ];
}

function visitFrames(title) {
  return ({ base }) => {
    const frames = title ? [{ msg: title(base), state: ptr(base, { n: base.root }), hl: {} }] : [];
    const seq = reverseInorder(base);
    seq.forEach(({ key, depth }, i) => {
      frames.push({
        msg: `${'--'.repeat(depth)} ${lab(base, key)} (${at(base, key).color === 'red' ? 'R' : 'B'})`,
        state: ptr(base, { n: key }),
        hl: { active: [key], done: seq.slice(0, i).map((e) => e.key) },
      });
    });
    frames.push({ msg: 'right, node, left: the tree printed sideways', state: ptr(base, {}), hl: { done: allKeys(base) } });
    return frames;
  };
}

// black_height(r) in postorder, each node's result shown as its badge.
function blackHeights(s) {
  const h = new Map();
  for (const k of postorder(s)) {
    const n = at(s, k);
    const below = n.left === null ? 1 : h.get(n.left);
    h.set(k, below + (n.color === 'black' ? 1 : 0));
  }
  return h;
}
const withBadges = (s, h, keys) => ({ ...s, nodes: s.nodes.map((n) => (keys.includes(n.key) ? { ...n, badge: String(h.get(n.key)) } : n)) });

function blackHeightFrames({ base }) {
  const h = blackHeights(base);
  const order = postorder(base);
  return [
    ...order.map((k, i) => {
      const n = at(base, k);
      const below = n.left === null ? 1 : h.get(n.left);
      return {
        msg: `black_height(${lab(base, k)}): both sides give ${below}${n.color === 'black' ? ', + 1 for black' : ', red adds 0'} = ${h.get(k)}`,
        state: ptr(withBadges(base, h, order.slice(0, i + 1)), { r: k }),
        hl: { active: [k], done: order.slice(0, i) },
      };
    }),
    { msg: `every path from the root passes ${h.get(base.root)} blacks (counting NULL)`, state: ptr(withBadges(base, h, order), {}), hl: { done: order } },
  ];
}

function checkFrames({ base }) {
  const h = blackHeights(base);
  const broken = structuredClone(base);
  const victim = at(broken, base.root).right;
  const redKid = [at(broken, victim).left, at(broken, victim).right].find((k) => k !== null && at(broken, k).color === 'black');
  const out = [
    { msg: `root ${lab(base, base.root)} is black`, state: ptr(base, { mRoot: base.root }), hl: { active: [base.root] } },
    { msg: `black_height(mRoot) = ${h.get(base.root)}, not -1: checkRedBlack() is true`, state: ptr(withBadges(base, h, allKeys(base)), { mRoot: base.root }), hl: { done: allKeys(base) } },
  ];
  if (at(broken, victim).color === 'red' && redKid) {
    at(broken, redKid).color = 'red';
    out.push({ msg: `if ${lab(base, redKid)} were red under red ${lab(base, victim)}: black_height returns -1, false`, state: ptr(broken, {}), hl: { compare: [victim, redKid] } });
  }
  return out;
}

// walk to the leftmost node (begin / find_min_node) for modules without a begin op.
function minFrames({ base }) {
  const frames = [];
  let cur = base.root;
  while (at(base, cur).left !== null) {
    frames.push({ msg: `${lab(base, cur)} has a left child: keep going left`, state: ptr(base, { min: cur }), hl: { compare: [cur] } });
    cur = at(base, cur).left;
  }
  frames.push({ msg: `${lab(base, cur)} has no left child: it is the minimum, begin() points here`, state: ptr(base, { min: cur }), hl: { done: [cur] } });
  return frames;
}

const tag = (text) => (frame) => ({ ...frame, msg: `${text}: ${frame.msg}` });

// c = { map, arg(k, v) -> op args, members: { root, size, inorder, red? } }
export function rbFigures(c) {
  const A = c.arg;
  const red = c.members.red ? [c.members.red] : [];
  return {
    'value-type': {
      frames: ({ base }) => [{ msg: c.map ? 'ValueT = pair<const KeyT, MappedT>: first is the key, second the value' : 'ValueT = KeyT: a node holds only the key', state: ptr(base, { it: 'n3' }), hl: { active: ['n3'] } }],
    },
    'color-enum': {
      frames: ({ base }) => [
        { msg: `RED: ${reds(base).map((k) => lab(base, k)).join(', ')} (no red node has a red child)`, state: ptr(base, {}), hl: { active: reds(base) } },
        { msg: `BLACK: ${blacks(base).map((k) => lab(base, k)).join(', ')}, and every NULL link`, state: ptr(base, {}), hl: { compare: blacks(base) } },
      ],
      members: ['black-height', ...red],
    },
    node: { frames: ({ base }) => [{ msg: `node ${lab(base, 'n3')}: color RED, left ${lab(base, 'n2')}, right ${lab(base, 'n5')}, parent ${lab(base, 'n1')}`, state: ptr(base, { left: 'n2', right: 'n5', parent: 'n1' }), hl: { active: ['n3'], compare: ['n2', 'n5', 'n1'] } }] },
    'iterator-class': { frames: ({ base }) => [{ msg: 'tree_iterator holds one node*: ptr', state: ptr(base, { ptr: 'n4' }), hl: { active: ['n4'] } }] },
    'iterator-typedef': { frames: ({ base }) => [{ msg: 'iterator = tree_iterator; begin() is the smallest node', state: ptr(base, { iterator: 'n0' }), hl: { done: ['n0'] } }] },
    'iter-inc': { frames: ({ base }) => ['n1', 'n2', 'n6'].flatMap((k) => walk(base, k, true).frames) },
    'iter-dec': { frames: ({ base }) => ['n3', 'n2'].flatMap((k) => walk(base, k, false).frames) },
    'iter-post-inc': { frames: postFrames('n2', true) },
    'iter-post-dec': { frames: postFrames('n4', false) },
    'iter-deref': { frames: ({ base }) => [{ msg: c.map ? `*it is ptr->data: it->first = ${keyOf(base, 'n4')} (const), it->second = ${at(base, 'n4').v}` : `*it is ptr->data = ${lab(base, 'n4')}, read-only`, state: ptr(base, { it: 'n4' }), hl: { done: ['n4'] } }] },
    compare: {
      frames: ({ base }) => [
        { msg: '10 < 20: mLess(k1, k2), -1 (go left)', state: ptr(base, { k1: 'n0', k2: 'n1' }), hl: { compare: ['n0'], active: ['n1'] } },
        { msg: '40 > 20: mLess(k2, k1), +1 (go right)', state: ptr(base, { k1: 'n3', k2: 'n1' }), hl: { compare: ['n3'], active: ['n1'] } },
        { msg: '20 = 20: neither is less, 0 (found)', state: ptr(base, { k1: 'n1', k2: 'n1' }), hl: { done: ['n1'] } },
      ],
    },
    'child-link': {
      frames: ({ base }) => [
        { msg: 'k = 25 < 30: the slot is parent->left (empty now)', state: ptr(base, { parent: 'n2' }), hl: { active: ['n2'] } },
        { msg: 'k = 80 > 70: the slot is parent->right', state: ptr(base, { parent: 'n6' }), hl: { active: ['n6'] } },
        { msg: 'parent == NULL: the slot is mRoot itself', state: ptr(base, { mRoot: base.root }), hl: { compare: [base.root] } },
      ],
    },
    'is-red': {
      frames: ({ base }) => [
        { msg: `is_red(${lab(base, 'n3')}) = true`, state: ptr(base, { n: 'n3' }), hl: { active: ['n3'] } },
        { msg: `is_red(${lab(base, 'n5')}) = false`, state: ptr(base, { n: 'n5' }), hl: { compare: ['n5'] } },
        { msg: `is_red(${lab(base, 'n0')}->left) = is_red(NULL) = false: an empty link is black`, state: ptr(base, { n: 'n0' }), hl: { compare: ['n0'] } },
      ],
    },
    relink: { op: 'erase', args: A(40) },
    'rotate-left': {
      frames: ({ base }) => {
        const { state } = rotate(base, base.root, 'left');
        const y = at(base, base.root).right;
        const mid = at(base, y).left;
        return [
          { msg: `rotate_left(${lab(base, base.root)}): x = ${lab(base, base.root)}, y = x->right = ${lab(base, y)}`, state: ptr(base, { x: base.root, y }), hl: { active: [base.root], compare: [y] } },
          { msg: `y moves up, x becomes y->left, y's old left ${lab(base, mid)} becomes x->right; in-order and colors unchanged`, state: ptr(state, { x: base.root, y }), hl: { moved: [y, base.root, mid] } },
        ];
      },
    },
    'rotate-right': {
      frames: ({ base }) => {
        const { state: up, y: top } = rotate(base, base.root, 'left');
        const back = rotate(up, top, 'right').state;
        const y = at(up, top).left;
        const mid = at(up, y).right;
        return [
          { msg: `rotate_right(${lab(up, top)}): x = ${lab(up, top)}, y = x->left = ${lab(up, y)}`, state: ptr(up, { x: top, y }), hl: { active: [top], compare: [y] } },
          { msg: `y moves up, x becomes y->right, y's old right ${lab(up, mid)} becomes x->left (this undoes rotate_left)`, state: ptr(back, { x: top, y }), hl: { moved: [y, top, mid] } },
        ];
      },
    },
    'insert-fixup': {
      frames: (ctx) => [
        ...ctx.run('insert', A(80)).map(tag('insert 80, cases 1 and 3')),
        ...ctx.run('insert', A(65), ctx.after('erase', A(50))).map(tag('after erase 50, insert 65, cases 2 and 3')),
      ],
    },
    'erase-fixup': {
      frames: (ctx) => [
        ...ctx.run('erase', A(10)).map(tag('erase 10, cases 1 and 2')),
        ...ctx.run('erase', A(30), ctx.after('erase', A(70))).map(tag('after erase 70, erase 30, cases 3 and 4')),
      ],
    },
    insert: { op: 'insert', args: A(80, 64) },
    erase: { op: 'erase', args: A(20) },
    'find-node': { op: 'find', args: A(50) },
    'copy-ctor': { frames: copyFrames(true), members: [c.members.size] },
    copy: { frames: copyFrames(false) },
    assign: { frames: assignFrames },
    ctor: { frames: ({ base }) => [{ msg: 'mRoot(NULL), mSize(0): an empty tree', state: empty(base), hl: {} }], members: [c.members.root, c.members.size] },
    empty: {
      frames: ({ base }) => [{
        msg: 'empty() is mSize == 0',
        panels: [{ label: 'empty() = false', state: ptr(base, { mRoot: base.root }) }, { label: 'empty() = true', state: empty(base) }],
      }],
    },
    end: { frames: ({ base }) => walk(base, 'n6', true).frames.map((f, i, all) => (i === all.length - 1 ? { ...f, msg: 'end() = iterator(NULL): one past the largest key' } : f)) },
    print: { frames: visitFrames((s) => `print(): size = ${s.nodes.length}`), members: [c.members.size] },
    'print-node': { frames: visitFrames(null) },
    'black-height': { frames: blackHeightFrames, members: ['black-height'] },
    'check-red-black': { frames: checkFrames, members: ['black-height'] },
    'extra-decl': { frames: ({ base }) => [{ msg: `count_red(mRoot) would return ${reds(base).length}`, state: ptr(base, { mRoot: base.root }), hl: { active: reds(base) } }], members: [c.members.root, ...red] },
    'm-root': { show: (s) => ({ hl: { active: [s.root] } }), members: [c.members.root] },
    'm-size': { show: (s) => ({ hl: { compare: allKeys(s) } }), members: [c.members.size] },
    'm-less': { show: () => ({}), members: [c.members.inorder] },
    size: { show: (s) => ({ hl: { compare: allKeys(s) } }), members: [c.members.size] },
    ...(c.map ? { 'find-min': { frames: minFrames }, begin: { frames: minFrames } } : {}),
  };
}

export default rbFigures({ map: false, arg: (x) => ({ x }), members: { root: 'root', size: 'node_count', inorder: 'inorder', red: 'red nodes' } });
