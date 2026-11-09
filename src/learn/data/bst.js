export const LIMIT = 15;
export const MAX_DEPTH = 5;

const valueParam = { name: 'x', min: -99, max: 99, default: 35 };

const at = (state, key) => state.nodes.find((node) => node.key === key);
const label = (state, key) => at(state, key).label;

function setPointers(state, cur = null, parent = null, succ = null) {
  state.pointers = { cur, parent, succ };
}

// Where would x go? depth of the node that holds / would hold x, and whether it exists.
export function probe(state, x) {
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

// Replace the link that points at `child` (held by `parent`, or the root) with `next`.
function relink(state, parent, child, next) {
  if (parent === null) state.root = next;
  else if (at(state, parent).left === child) at(state, parent).left = next;
  else at(state, parent).right = next;
}

function* descend(state, x, verb) {
  let cur = state.root;
  let parent = null;
  while (cur !== null) {
    const node = at(state, cur);
    setPointers(state, cur, parent);
    if (x === node.label) {
      yield { line: 0, msg: `${x} == ${node.label}: found it${verb === 'insert' ? ', so it is already in the tree' : ''}`, state, hl: { active: [cur] } };
      return { cur, parent, found: true };
    }
    const goLeft = x < node.label;
    yield { line: 0, msg: `${x} ${goLeft ? '<' : '>'} ${node.label}: go to the ${goLeft ? 'left' : 'right'} child${(goLeft ? node.left : node.right) === null ? ', which is empty' : ''}`, state, hl: { compare: [cur] } };
    parent = cur;
    cur = goLeft ? node.left : node.right;
  }
  setPointers(state, null, parent);
  return { cur: null, parent, found: false };
}

const parentKey = (state, key) => state.nodes.find((node) => node.left === key || node.right === key)?.key ?? null;
const keyIfFound = (state, x) => state.nodes.find((node) => node.label === x)?.key ?? null;

// Shared (also used by the AVL module): `setP(state, cur, parent, succ)` writes that module's fixed pointer names.
// find_min_node / find_max_node: follow left (or right) links until there is none.
export function* walkExtreme(state, side, setP = setPointers) {
  const name = side === 'left' ? 'minimum' : 'maximum';
  let cur = state.root;
  let parent = null;
  if (cur === null) {
    setP(state);
    yield { line: 0, msg: `The tree is empty: there is no ${name}, and begin() equals end()`, state, hl: {} };
    return null;
  }
  for (;;) {
    const node = at(state, cur);
    setP(state, cur, parent);
    const next = node[side];
    if (next === null) {
      yield { line: 0, msg: `${node.label} has no ${side} child: it is the ${name} of the tree`, state, hl: { done: [cur] } };
      return cur;
    }
    yield { line: 0, msg: `${node.label} has a ${side} child: keep going ${side} to ${label(state, next)}`, state, hl: { compare: [cur] } };
    parent = cur;
    cur = next;
  }
}

// lower_bound (first element >= x) or upper_bound (first element > x): remember the last node that qualified (succ).
export function* walkBound(state, x, upper, setP = setPointers) {
  const op = upper ? 'upper_bound' : 'lower_bound';
  const rel = upper ? '>' : '>=';
  let cur = state.root;
  let parent = null;
  let succ = null;
  while (cur !== null) {
    const node = at(state, cur);
    setP(state, cur, parent, succ);
    const qualifies = upper ? node.label > x : node.label >= x;
    if (qualifies) {
      succ = cur;
      setP(state, cur, parent, succ);
      yield { line: 0, msg: `${node.label} ${rel} ${x}: it is a candidate answer; go left to look for a smaller one`, state, hl: { compare: [cur] } };
      parent = cur;
      cur = node.left;
    } else {
      yield { line: 0, msg: `${node.label} ${upper ? '<=' : '<'} ${x}: too small, so the answer is to the right`, state, hl: { compare: [cur], active: succ === null ? [] : [succ] } };
      parent = cur;
      cur = node.right;
    }
  }
  setP(state, null, parent, succ);
  if (succ === null) yield { line: 0, msg: `Reached an empty link with no candidate: nothing is ${rel} ${x}, so ${op} returns end()`, state, hl: {} };
  else yield { line: 0, msg: `Reached an empty link: the last candidate ${label(state, succ)} is the first element ${rel} ${x}`, state, hl: { done: [succ] } };
  return succ;
}

// clear(): delete every node in post-order (children first), as the recursive course clear() does.
export function* clearTree(state, setP = setPointers) {
  if (state.root === null) {
    yield { line: 0, msg: 'The tree is already empty: clear() does nothing', state, hl: {} };
    return;
  }
  const order = [];
  const post = (key) => {
    if (key === null) return;
    post(at(state, key).left);
    post(at(state, key).right);
    order.push(key);
  };
  post(state.root);
  for (const key of order) {
    const parent = parentKey(state, key);
    const name = label(state, key);
    setP(state, key, parent);
    yield { line: 0, msg: `Visit ${name}: both subtrees are already deleted, so delete this node now`, state, hl: { active: [key] } };
    relink(state, parent, key, null);
    state.nodes.splice(state.nodes.findIndex((n) => n.key === key), 1);
    setP(state, null, parent);
    yield { line: 0, msg: parent === null ? `Deleted ${name}, the root` : `Deleted ${name}; ${label(state, parent)} now has one fewer child`, state, hl: parent === null ? {} : { compare: [parent] } };
  }
  setP(state);
  yield { line: 0, msg: 'Every node is deleted: root is NULL and the size is 0', state, hl: {} };
}

export default {
  id: 'bst',
  side: 'data',
  group: 'Tree',
  title: 'BST',
  summary: 'A binary search tree in the style of the course CP::map_bst: smaller keys go left, larger go right. This demo stores keys only (the course map stores key/value pairs). Erase copies the successor from the right subtree, as in the slides.',
  renderer: 'tree',
  complexity: {
    space: 'O(n)',
    note: 'h is the height of the tree. A balanced tree has h = O(log n), but sorted inserts build a chain with h = n - 1, so every operation is O(n) in the worst case. AVL trees fix that.',
  },
  declare: 'CP::map_bst<int> t;  // 40 at the root, then 20, 60, 10, 30, 50, 70',
  preset() {
    const labels = { a: 40, b: 20, c: 60, d: 10, e: 30, f: 50, g: 70 };
    const links = { a: ['b', 'c'], b: ['d', 'e'], c: ['f', 'g'] };
    return {
      nodes: Object.entries(labels).map(([key, value]) => ({ key, label: value, left: links[key]?.[0] ?? null, right: links[key]?.[1] ?? null })),
      root: 'a',
      nextKey: 7,
      capacity: LIMIT,
      maxDepth: MAX_DEPTH,
      pointers: { cur: null, parent: null, succ: null },
    };
  },
  ops: {
    insert: {
      params: [valueParam],
      time: 'O(h)',
      code: 't.insert({x});',
      check: (state, { x }) => {
        const { exists, depth } = probe(state, x);
        if (exists) return null;
        if (state.nodes.length >= LIMIT) return `This demo keeps at most ${LIMIT} nodes`;
        return depth > MAX_DEPTH ? `This demo keeps the tree at most ${MAX_DEPTH + 1} levels deep; ${x} would sit at depth ${depth}` : null;
      },
      *run(state, { x }) {
        if (state.root === null) {
          state.nodes.push({ key: `n${state.nextKey}`, label: x, left: null, right: null });
          state.root = `n${state.nextKey}`;
          state.nextKey += 1;
          yield { line: 0, msg: `The tree is empty: ${x} becomes the root`, state, hl: { active: [state.root] } };
          return;
        }
        const { found, parent } = yield* descend(state, x, 'insert');
        if (found) {
          yield { line: 0, msg: `Keys are unique, so insert(${x}) changes nothing`, state, hl: {} };
          return;
        }
        const key = `n${state.nextKey}`;
        state.nextKey += 1;
        state.nodes.push({ key, label: x, left: null, right: null });
        const side = x < label(state, parent) ? 'left' : 'right';
        at(state, parent)[side] = key;
        setPointers(state, key, parent);
        yield { line: 0, msg: `Found the empty ${side} link of ${label(state, parent)}: attach a new node ${x} there`, state, hl: { active: [key] } };
      },
    },
    erase: {
      params: [{ ...valueParam, default: 20 }],
      time: 'O(h)',
      code: 't.erase({x});',
      check: () => null,
      *run(state, { x }) {
        const { cur, parent, found } = yield* descend(state, x, 'erase');
        if (!found) {
          setPointers(state);
          yield { line: 0, msg: `Reached an empty link: ${x} is not in the tree, nothing to erase`, state, hl: {} };
          return;
        }
        const node = at(state, cur);
        const drop = (key) => {
          state.nodes.splice(state.nodes.findIndex((n) => n.key === key), 1);
        };
        if (node.left === null && node.right === null) {
          relink(state, parent, cur, null);
          drop(cur);
          setPointers(state, null, parent);
          yield { line: 0, msg: `${x} is a leaf (case 1): cut it off, its parent's link becomes empty`, state, hl: {} };
          return;
        }
        if (node.left === null || node.right === null) {
          const child = node.left ?? node.right;
          relink(state, parent, cur, child);
          drop(cur);
          setPointers(state, child, parent);
          yield { line: 0, msg: `${x} has one child (case 2): its parent links straight to ${label(state, child)}, which moves up with its subtree`, state, hl: { moved: [child] } };
          return;
        }
        yield { line: 0, msg: `${x} has two children (case 3): replace it by its successor, the minimum of the right subtree`, state, hl: { active: [cur] } };
        let sp = cur;
        let s = node.right;
        setPointers(state, cur, sp, s);
        yield { line: 0, msg: `Start at the right child ${label(state, s)}`, state, hl: { active: [cur], compare: [s] } };
        while (at(state, s).left !== null) {
          sp = s;
          s = at(state, s).left;
          setPointers(state, cur, sp, s);
          yield { line: 0, msg: `${label(state, sp)} has a left child: keep going left to ${label(state, s)}`, state, hl: { active: [cur], compare: [s] } };
        }
        const succ = label(state, s);
        yield { line: 0, msg: `${succ} has no left child: it is the successor`, state, hl: { active: [cur], done: [s] } };
        node.label = succ;
        yield { line: 0, msg: `Copy the successor's value ${succ} into the node that held ${x}`, state, hl: { active: [cur], done: [s] } };
        relink(state, sp, s, at(state, s).right);
        const lifted = at(state, s).right;
        drop(s);
        setPointers(state, cur);
        yield { line: 0, msg: `Erase the old successor node (case ${lifted === null ? '1, a leaf' : '2, it has only a right child'}) from the right subtree`, state, hl: { active: [cur], moved: lifted === null ? [] : [lifted] } };
      },
    },
    find: {
      params: [{ ...valueParam, default: 30 }],
      time: 'O(h)',
      code: 't.find({x});',
      check: () => null,
      *run(state, { x }) {
        const { cur, found } = yield* descend(state, x, 'find');
        setPointers(state, found ? cur : null);
        if (!found) yield { line: 0, msg: `Reached an empty link: ${x} is not in the tree, find returns end()`, state, hl: {} };
        else yield { line: 0, msg: `find(${x}) returns an iterator to this node`, state, hl: { done: [cur] } };
      },
    },
    begin: {
      params: [],
      time: 'O(h)',
      code: 't.begin();',
      check: () => null,
      *run(state) {
        yield* walkExtreme(state, 'left');
      },
    },
    find_max: {
      params: [],
      time: 'O(h)',
      code: 't.find_max_node(t.mRoot);',
      check: () => null,
      *run(state) {
        yield* walkExtreme(state, 'right');
      },
    },
    lower_bound: {
      params: [{ ...valueParam, default: 45 }],
      time: 'O(h)',
      code: 't.lower_bound({x});',
      check: () => null,
      *run(state, { x }) {
        yield* walkBound(state, x, false);
      },
    },
    upper_bound: {
      params: [{ ...valueParam, default: 40 }],
      time: 'O(h)',
      code: 't.upper_bound({x});',
      check: () => null,
      *run(state, { x }) {
        yield* walkBound(state, x, true);
      },
    },
    successor: {
      params: [{ ...valueParam, default: 30 }],
      time: 'O(h)',
      code: 'auto it = t.find({x}); ++it;',
      check: () => null,
      *run(state, { x }) {
        const { cur, found } = yield* descend(state, x, 'find');
        if (!found) {
          setPointers(state);
          yield { line: 0, msg: `${x} is not in the tree: find returns end(), and ++end() is undefined, so there is no successor to show`, state, hl: {} };
          return;
        }
        let ptr = cur;
        const right = at(state, ptr).right;
        if (right !== null) {
          yield { line: 0, msg: `${x} has a right child: the successor is the minimum of the right subtree`, state, hl: { active: [ptr], compare: [right] } };
          let parent = ptr;
          ptr = right;
          setPointers(state, ptr, parent);
          while (at(state, ptr).left !== null) {
            yield { line: 0, msg: `${label(state, ptr)} has a left child: keep going left`, state, hl: { compare: [ptr] } };
            parent = ptr;
            ptr = at(state, ptr).left;
            setPointers(state, ptr, parent);
          }
          setPointers(state, ptr, parent, ptr);
          yield { line: 0, msg: `${label(state, ptr)} has no left child: it is the successor of ${x}`, state, hl: { done: [ptr] } };
          return;
        }
        yield { line: 0, msg: `${x} has no right child: climb with the parent pointers while we are a right child`, state, hl: { active: [ptr] } };
        let parent = parentKey(state, ptr);
        setPointers(state, ptr, parent);
        while (parent !== null && at(state, parent).right === ptr) {
          yield { line: 0, msg: `${label(state, ptr)} is the right child of ${label(state, parent)}: ${label(state, parent)} is smaller, so move up`, state, hl: { compare: [ptr, parent] } };
          ptr = parent;
          parent = parentKey(state, ptr);
          setPointers(state, ptr, parent);
        }
        if (parent === null) {
          setPointers(state, null, null);
          yield { line: 0, msg: `We reached the root from its right side: ${x} is the largest key, so ++ gives end() (no successor)`, state, hl: {} };
          return;
        }
        setPointers(state, parent, parentKey(state, parent), parent);
        yield { line: 0, msg: `${label(state, ptr)} is the left child of ${label(state, parent)}: the parent is the successor of ${x}`, state, hl: { done: [parent] } };
      },
    },
    clear: {
      params: [],
      time: 'O(n)',
      code: 't.clear();',
      check: () => null,
      *run(state) {
        yield* clearTree(state);
      },
    },
  },
};
