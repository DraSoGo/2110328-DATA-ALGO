// AVL tree in the style of the course CP::map_avl (keys only).
// Every node stores its height h (an empty tree has height -1); the badge shows
// balance_value() = height(right) - height(left) as it was stored the last time the node was updated,
// so a stale badge on the way up is exactly what the course code would see before set_height().
export const LIMIT = 15;
export const MAX_DEPTH = 5; // a 14-node AVL tree is at most 4 deep, so a new leaf sits at depth 5 at most

const valueParam = { name: 'x', min: -99, max: 99, default: 55 };

const at = (state, key) => state.nodes.find((node) => node.key === key);
const label = (state, key) => at(state, key).label;
const heightOf = (state, key) => (key === null ? -1 : at(state, key).h);
const signed = (b) => (b > 0 ? `+${b}` : String(b));

function setPointers(state, cur = null, parent = null, succ = null, r = null) {
  state.pointers = { cur, parent, succ, r };
}

// node::set_height(); the badge is refreshed together with the stored height.
function setHeight(state, key) {
  const node = at(state, key);
  const hL = heightOf(state, node.left);
  const hR = heightOf(state, node.right);
  node.h = 1 + Math.max(hL, hR);
  node.badge = signed(hR - hL);
  return { hL, hR, h: node.h, balance: hR - hL };
}
const balanceValue = (state, key) => heightOf(state, at(state, key).right) - heightOf(state, at(state, key).left);

function relink(state, parent, child, next) {
  if (parent === null) state.root = next;
  else if (at(state, parent).left === child) at(state, parent).left = next;
  else at(state, parent).right = next;
}
const parentOf = (state, key) => state.nodes.find((node) => node.left === key || node.right === key)?.key ?? null;

// rotate_left_child(r): the left child comes up (a right rotation). Returns the new subtree root.
function rotateLeftChild(state, r) {
  const parent = parentOf(state, r);
  const newRoot = at(state, r).left;
  at(state, r).left = at(state, newRoot).right;
  at(state, newRoot).right = r;
  relink(state, parent, r, newRoot);
  setHeight(state, r);
  setHeight(state, newRoot);
  return newRoot;
}
// rotate_right_child(r): the right child comes up (a left rotation).
function rotateRightChild(state, r) {
  const parent = parentOf(state, r);
  const newRoot = at(state, r).right;
  at(state, r).right = at(state, newRoot).left;
  at(state, newRoot).left = r;
  relink(state, parent, r, newRoot);
  setHeight(state, r);
  setHeight(state, newRoot);
  return newRoot;
}

export function depthOf(state, x) {
  let key = state.root;
  let depth = 0;
  while (key !== null) {
    const node = at(state, key);
    if (x === node.label) return { exists: true, depth };
    key = x < node.label ? node.left : node.right;
    depth += 1;
  }
  return { exists: false, depth };
}

function* descend(state, x, verb) {
  const path = [];
  let cur = state.root;
  let parent = null;
  while (cur !== null) {
    const node = at(state, cur);
    setPointers(state, cur, parent);
    if (x === node.label) {
      yield { line: 0, msg: `${x} == ${node.label}: found it${verb === 'insert' ? ', so it is already in the tree' : ''}`, state, hl: { active: [cur] } };
      return { cur, parent, found: true, path };
    }
    const goLeft = x < node.label;
    yield { line: 0, msg: `${x} ${goLeft ? '<' : '>'} ${node.label}: go to the ${goLeft ? 'left' : 'right'} child${(goLeft ? node.left : node.right) === null ? ', which is empty' : ''}`, state, hl: { compare: [cur] } };
    path.push(cur);
    parent = cur;
    cur = goLeft ? node.left : node.right;
  }
  setPointers(state, null, parent);
  return { cur: null, parent, found: false, path };
}

// rebalance(r) for one node on the way back up: set_height, check the balance, rotate if it is +-2.
function* rebalance(state, r) {
  const before = at(state, r).h;
  const { hL, hR, h, balance } = setHeight(state, r);
  setPointers(state, null, null, null, r);
  const name = label(state, r);
  const heightNote = h === before ? `height stays ${h}` : `height becomes ${h}`;
  if (Math.abs(balance) < 2) {
    yield { line: 0, msg: `Back up at ${name}: hL = ${hL}, hR = ${hR}, ${heightNote}, balance = ${signed(balance)} is within -1..+1`, state, hl: { active: [r] } };
    return r;
  }
  const leftHeavy = balance === -2;
  const x = leftHeavy ? at(state, r).left : at(state, r).right;
  const childBalance = balanceValue(state, x);
  const double = leftHeavy ? childBalance === 1 : childBalance === -1;
  const kind = leftHeavy ? (double ? 'LR' : 'LL') : (double ? 'RL' : 'RR');
  const slideCase = { LL: 1, RR: 2, LR: 3, RL: 4 }[kind];
  const fix = double ? 'a double rotation' : 'a single rotation';
  yield {
    line: 0,
    msg: `Back up at ${name}: hL = ${hL}, hR = ${hR}, balance = ${signed(balance)}: unbalanced! Its ${leftHeavy ? 'left' : 'right'} child ${label(state, x)} has balance ${signed(childBalance)}, so this is case ${kind} (slide case ${slideCase}), fixed by ${fix}`,
    state,
    hl: { active: [r], compare: [x] },
  };
  if (double) {
    const y = leftHeavy ? at(state, x).right : at(state, x).left;
    if (leftHeavy) rotateRightChild(state, x);
    else rotateLeftChild(state, x);
    setPointers(state, null, null, null, r);
    yield {
      line: 0,
      msg: `${kind} step 1: ${leftHeavy ? 'rotate_right_child' : 'rotate_left_child'}(r->${leftHeavy ? 'left' : 'right'}) lifts ${label(state, y)} above ${label(state, x)}, turning the bend into a straight ${leftHeavy ? 'LL' : 'RR'} line`,
      state,
      hl: { active: [r], moved: [y, x] },
    };
  }
  const top = leftHeavy ? rotateLeftChild(state, r) : rotateRightChild(state, r);
  setPointers(state, null, null, null, top);
  yield {
    line: 0,
    msg: `${kind}${double ? ' step 2' : ''}: ${leftHeavy ? 'rotate_left_child' : 'rotate_right_child'}(r) lifts ${label(state, top)} to the top of this subtree and ${name} becomes its ${leftHeavy ? 'right' : 'left'} child; heights are updated, balance is restored`,
    state,
    hl: { moved: [top, r] },
  };
  return top;
}

// Walk back up the path (deepest first), rebalancing every node as the recursive course code does.
function* walkUp(state, path) {
  for (let i = path.length - 1; i >= 0; i -= 1) yield* rebalance(state, path[i]);
  setPointers(state);
}

export default {
  id: 'avl',
  side: 'data',
  group: 'Tree',
  title: 'AVL tree',
  summary: 'A self-balancing BST in the style of the course CP::map_avl (keys only here): each node stores its height, and after a BST insert or erase every node on the way back up updates its height and is rotated (LL, RR, LR or RL) if its balance hR - hL reaches +-2. The badge shows the stored balance.',
  renderer: 'tree',
  complexity: {
    space: 'O(n)',
    note: 'An AVL tree with n nodes has height below 1.44 log2 n, so the walk down and the rebalancing walk back up are both O(log n). Each rebalance is O(1) rotations.',
  },
  declare: 'CP::map_avl<int> t;  // 40 at the root, then 20, 60, 10, 30, 50',
  preset() {
    const labels = { a: 40, b: 20, c: 60, d: 10, e: 30, f: 50 };
    const links = { a: ['b', 'c'], b: ['d', 'e'], c: ['f', null] };
    const heights = { a: 2, b: 1, c: 1 };
    const badges = { c: '-1' };
    return {
      nodes: Object.entries(labels).map(([key, value]) => ({
        key, label: value, left: links[key]?.[0] ?? null, right: links[key]?.[1] ?? null, h: heights[key] ?? 0, badge: badges[key] ?? '0',
      })),
      root: 'a',
      nextKey: 6,
      capacity: LIMIT,
      maxDepth: MAX_DEPTH,
      pointers: { cur: null, parent: null, succ: null, r: null },
    };
  },
  ops: {
    insert: {
      params: [valueParam],
      time: 'O(log n)',
      code: 't.insert({x});',
      check: (state, { x }) => {
        if (depthOf(state, x).exists) return null;
        return state.nodes.length >= LIMIT ? `This demo keeps at most ${LIMIT} nodes` : null;
      },
      *run(state, { x }) {
        const key = `n${state.nextKey}`;
        if (state.root === null) {
          state.nodes.push({ key, label: x, left: null, right: null, h: 0, badge: '0' });
          state.root = key;
          state.nextKey += 1;
          setPointers(state, key);
          yield { line: 0, msg: `The tree is empty: ${x} becomes the root with height 0`, state, hl: { active: [key] } };
          return;
        }
        const { found, parent, path } = yield* descend(state, x, 'insert');
        if (found) {
          setPointers(state);
          yield { line: 0, msg: `Keys are unique, so insert(${x}) changes nothing and no heights change`, state, hl: {} };
          return;
        }
        state.nextKey += 1;
        state.nodes.push({ key, label: x, left: null, right: null, h: 0, badge: '0' });
        const side = x < label(state, parent) ? 'left' : 'right';
        at(state, parent)[side] = key;
        setPointers(state, key, parent);
        yield { line: 0, msg: `Attach a new leaf ${x} (height 0) as the ${side} child of ${label(state, parent)}, then walk back up updating heights`, state, hl: { active: [key] } };
        yield* walkUp(state, path);
        yield { line: 0, msg: `Back at the root: every node has balance -1, 0 or +1, so the tree is an AVL tree again`, state, hl: { done: [key] } };
      },
    },
    erase: {
      params: [{ ...valueParam, default: 20 }],
      time: 'O(log n)',
      code: 't.erase({x});',
      check: () => null,
      *run(state, { x }) {
        const { cur, parent, found, path } = yield* descend(state, x, 'erase');
        if (!found) {
          setPointers(state);
          yield { line: 0, msg: `Reached an empty link: ${x} is not in the tree, nothing to erase`, state, hl: {} };
          return;
        }
        const node = at(state, cur);
        const drop = (key) => {
          state.nodes.splice(state.nodes.findIndex((n) => n.key === key), 1);
        };
        if (node.left === null || node.right === null) {
          const child = node.left ?? node.right;
          relink(state, parent, cur, child);
          drop(cur);
          setPointers(state, child, parent);
          yield {
            line: 0,
            msg: child === null
              ? `${x} is a leaf: cut it off, as in map_bst; now rebalance on the way back up`
              : `${x} has one child: its parent links straight to ${label(state, child)}; now rebalance on the way back up`,
            state,
            hl: child === null ? {} : { moved: [child] },
          };
        } else {
          yield { line: 0, msg: `${x} has two children: replace it by its successor, the minimum of the right subtree`, state, hl: { active: [cur] } };
          path.push(cur);
          let sp = cur;
          let s = node.right;
          setPointers(state, cur, sp, s);
          yield { line: 0, msg: `Start at the right child ${label(state, s)}`, state, hl: { active: [cur], compare: [s] } };
          while (at(state, s).left !== null) {
            path.push(s);
            sp = s;
            s = at(state, s).left;
            setPointers(state, cur, sp, s);
            yield { line: 0, msg: `${label(state, sp)} has a left child: keep going left to ${label(state, s)}`, state, hl: { active: [cur], compare: [s] } };
          }
          const succ = label(state, s);
          node.label = succ;
          yield { line: 0, msg: `${succ} has no left child, so it is the successor: copy ${succ} into the node that held ${x}`, state, hl: { active: [cur], done: [s] } };
          const lifted = at(state, s).right;
          relink(state, sp, s, lifted);
          drop(s);
          setPointers(state, cur);
          yield { line: 0, msg: `Erase the old successor node from the right subtree, then rebalance on the way back up`, state, hl: { active: [cur], moved: lifted === null ? [] : [lifted] } };
        }
        yield* walkUp(state, path);
        yield { line: 0, msg: `Back at the root: every node has balance -1, 0 or +1 again`, state, hl: {} };
      },
    },
    find: {
      params: [{ ...valueParam, default: 50 }],
      time: 'O(log n)',
      code: 't.find({x});',
      check: () => null,
      *run(state, { x }) {
        const { cur, found } = yield* descend(state, x, 'find');
        setPointers(state, found ? cur : null);
        if (!found) yield { line: 0, msg: `Reached an empty link: ${x} is not in the tree, find returns end()`, state, hl: {} };
        else yield { line: 0, msg: `find(${x}) returns an iterator to this node; find never changes heights or rotates`, state, hl: { done: [cur] } };
      },
    },
  },
};
