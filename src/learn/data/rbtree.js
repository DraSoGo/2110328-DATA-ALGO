// Red-black tree shared by the `set` and `map` learning modules (std::set / std::map are usually red-black trees).
//
// state = { nodes: [{ key, k, v?, label, left, right, color }], root, nextKey, mapped, capacity, maxDepth, pointers }
//   key    stable node identity for the renderer (never reused)
//   k      the ordering key; v is the mapped value when state.mapped (label "k:v"), otherwise label = k
//   color  'red' | 'black'
// Insert: BST insert as a red leaf, then the fix-up cases (uncle red -> recolor and move up;
// uncle black + triangle -> rotate parent into a line; line -> rotate grandparent and recolor; root black).
// Erase: BST delete where a node with two children is replaced by its successor NODE (relinked, as std::set does,
// so no element is copied), then the double-black fix-up cases 1-4. Every recolor and every rotation is its own frame.
export const LIMIT = 15;
// A valid red-black tree of 14 nodes is at most 5 deep (a tree 6 deep needs 22 nodes), so a new leaf sits at
// depth 6 at most; rotations during the fix-ups never push a node deeper than that (checked by the tests).
export const MAX_DEPTH = 6;
const POINTER_SLOTS = 4;
const cap = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1);

const at = (state, key) => state.nodes.find((node) => node.key === key);
const kOf = (state, key) => at(state, key).k;
const isRed = (state, key) => key !== null && at(state, key).color === 'red';
const parentOf = (state, key) => state.nodes.find((node) => node.left === key || node.right === key)?.key ?? null;

export const labelFor = (state, k, v) => (state.mapped ? `${k}:${v}` : k);

// Every op declares the same number of pointer rows, so the viewBox stays the same between ops.
function setPointers(state, named) {
  const pointers = { ...named };
  for (let i = 0; Object.keys(pointers).length < POINTER_SLOTS; i += 1) pointers[`_${i}`] = null;
  state.pointers = pointers;
}

function relink(state, parent, child, next) {
  if (parent === null) state.root = next;
  else if (at(state, parent).left === child) at(state, parent).left = next;
  else at(state, parent).right = next;
}

// Left rotation at x: its right child comes up. Right rotation: its left child comes up.
function rotate(state, x, dir) {
  const parent = parentOf(state, x);
  const node = at(state, x);
  if (dir === 'left') {
    const y = node.right;
    node.right = at(state, y).left;
    at(state, y).left = x;
    relink(state, parent, x, y);
    return y;
  }
  const y = node.left;
  node.left = at(state, y).right;
  at(state, y).right = x;
  relink(state, parent, x, y);
  return y;
}

export function emptyTree(mapped) {
  return { nodes: [], root: null, nextKey: 0, mapped, capacity: LIMIT, maxDepth: MAX_DEPTH, pointers: Object.fromEntries(Array.from({ length: POINTER_SLOTS }, (_, i) => [`_${i}`, null])) };
}

const drain = (gen) => {
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
};

// Builds a tree by running the real insert algorithm without recording frames.
export function buildTree(entries, mapped) {
  const state = emptyTree(mapped);
  for (const [k, v] of entries) drain(insert(state, k, v));
  setPointers(state, {});
  return state;
}

export function contains(state, k) {
  let key = state.root;
  while (key !== null) {
    const node = at(state, key);
    if (k === node.k) return true;
    key = k < node.k ? node.left : node.right;
  }
  return false;
}

export function* descend(state, k, verb, names = ['cur', 'p']) {
  let cur = state.root;
  let parent = null;
  while (cur !== null) {
    const node = at(state, cur);
    setPointers(state, names[1] ? { [names[0]]: cur, [names[1]]: parent } : { [names[0]]: cur });
    if (k === node.k) {
      yield { line: 0, msg: `${k} == ${node.k}: found it${verb === 'insert' ? ', so the key is already there' : ''}`, state, hl: { active: [cur] } };
      return { cur, parent, found: true };
    }
    const goLeft = k < node.k;
    yield { line: 0, msg: `${k} ${goLeft ? '<' : '>'} ${node.k}: go to the ${goLeft ? 'left' : 'right'} child${(goLeft ? node.left : node.right) === null ? ', which is empty' : ''}`, state, hl: { compare: [cur] } };
    parent = cur;
    cur = goLeft ? node.left : node.right;
  }
  setPointers(state, names[1] ? { [names[0]]: null, [names[1]]: parent } : {});
  return { cur: null, parent, found: false };
}

function* fixRoot(state, done) {
  const root = at(state, state.root);
  if (root.color === 'red') {
    root.color = 'black';
    yield { line: 0, msg: `The root must be black: recolor ${root.k} black (this adds one black to every path, so black heights stay equal)`, state, hl: { active: [state.root] } };
  }
  yield { line: 0, msg: 'Done: the root is black, no red node has a red child, and every path has the same number of black nodes', state, hl: { done: done ? [done] : [] } };
}

// Insert fix-up for the red node z. Every recolor and every rotation is its own frame.
function* insertFixup(state, z) {
  for (;;) {
    let p = parentOf(state, z);
    if (p === null || !isRed(state, p)) {
      setPointers(state, { z, p });
      if (p !== null) yield { line: 0, msg: `${kOf(state, z)}'s parent ${kOf(state, p)} is black: no red node has a red child, nothing more to fix`, state, hl: { active: [z] } };
      return;
    }
    const g = parentOf(state, p); // p is red, so it is not the root
    const pIsLeft = at(state, g).left === p;
    const u = pIsLeft ? at(state, g).right : at(state, g).left;
    setPointers(state, { z, p, g, u });
    const zName = kOf(state, z);
    const pName = kOf(state, p);
    const gName = kOf(state, g);
    if (isRed(state, u)) {
      yield { line: 0, msg: `Red ${zName} has a red parent ${pName}, and the uncle ${kOf(state, u)} is red too: case 1, recolor`, state, hl: { active: [z], compare: [p, u] } };
      at(state, p).color = 'black';
      at(state, u).color = 'black';
      at(state, g).color = 'red';
      yield { line: 0, msg: `Recolor: parent ${pName} and uncle ${kOf(state, u)} become black, grandparent ${gName} becomes red; the problem may move up to ${gName}`, state, hl: { moved: [p, u, g] } };
      z = g;
      continue;
    }
    const uncleText = u === null ? 'the uncle is empty (black)' : `the uncle ${kOf(state, u)} is black`;
    const zIsLeft = at(state, p).left === z;
    if (zIsLeft !== pIsLeft) {
      yield { line: 0, msg: `Red ${zName} has a red parent ${pName}, ${uncleText}, and ${zName} is an inner child (a triangle): case 2, rotate the parent to make a line`, state, hl: { active: [z], compare: [p] } };
      rotate(state, p, pIsLeft ? 'left' : 'right');
      setPointers(state, { z: p, p: z, g, u });
      yield { line: 0, msg: `Rotate ${pIsLeft ? 'left' : 'right'} at ${pName}: ${zName} moves up and ${pName} becomes its ${pIsLeft ? 'left' : 'right'} child, so the two reds now form a line`, state, hl: { moved: [z, p] } };
      [z, p] = [p, z];
    } else {
      yield { line: 0, msg: `Red ${zName} has a red parent ${pName}, ${uncleText}, and ${zName} is an outer child (a line): case 3, rotate the grandparent and recolor`, state, hl: { active: [z], compare: [p, g] } };
    }
    const top = rotate(state, g, pIsLeft ? 'right' : 'left');
    setPointers(state, { z, p, g, u });
    yield { line: 0, msg: `Rotate ${pIsLeft ? 'right' : 'left'} at grandparent ${gName}: ${kOf(state, top)} moves up and ${gName} becomes its ${pIsLeft ? 'right' : 'left'} child`, state, hl: { moved: [top, g] } };
    at(state, p).color = 'black';
    at(state, g).color = 'red';
    yield { line: 0, msg: `Recolor: ${kOf(state, p)} (now on top) becomes black and ${gName} becomes red; no red node has a red child any more`, state, hl: { moved: [p, g] } };
    return;
  }
}

// Inserts k (with mapped value v) unless it is present. Returns { key, inserted }.
export function* insert(state, k, v) {
  const make = () => {
    const key = `n${state.nextKey}`;
    state.nextKey += 1;
    const node = { key, k, label: labelFor(state, k, v), left: null, right: null, color: 'red' };
    if (state.mapped) node.v = v;
    state.nodes.push(node);
    return key;
  };
  if (state.root === null) {
    const key = make();
    state.root = key;
    setPointers(state, { z: key, p: null, g: null, u: null });
    yield { line: 0, msg: `The tree is empty: the new node ${k} becomes the root (new nodes start red)`, state, hl: { active: [key] } };
    yield* fixRoot(state, key);
    return { key, inserted: true };
  }
  const { cur, found, parent } = yield* descend(state, k, 'insert', ['z', 'p']);
  if (found) return { key: cur, inserted: false };
  const key = make();
  const side = k < kOf(state, parent) ? 'left' : 'right';
  at(state, parent)[side] = key;
  setPointers(state, { z: key, p: parent, g: null, u: null });
  yield { line: 0, msg: `Attach a new red node ${k} as the ${side} child of ${kOf(state, parent)} (a red leaf keeps every black height the same)`, state, hl: { active: [key] } };
  yield* insertFixup(state, key);
  yield* fixRoot(state, key);
  return { key, inserted: true };
}

// Erase fix-up: x (maybe an empty link, then xp is its parent) carries an extra black.
function* eraseFixup(state, x, xp) {
  const xName = () => (x === null ? `the empty ${at(state, xp).left === null ? 'left' : 'right'} link of ${kOf(state, xp)}` : kOf(state, x));
  while (x !== state.root && !isRed(state, x)) {
    const xIsLeft = at(state, xp).left === x && (x !== null || at(state, xp).right !== null);
    let w = xIsLeft ? at(state, xp).right : at(state, xp).left;
    const near = () => (xIsLeft ? at(state, w).left : at(state, w).right);
    const far = () => (xIsLeft ? at(state, w).right : at(state, w).left);
    const toward = xIsLeft ? 'left' : 'right';
    const focus = x === null ? [xp] : [x];
    setPointers(state, { z: null, y: null, x, w });
    if (isRed(state, w)) {
      yield { line: 0, msg: `${cap(xName())} is double black and its sibling ${kOf(state, w)} is red: case 1, recolor the sibling black and the parent ${kOf(state, xp)} red`, state, hl: { active: focus, compare: [w] } };
      at(state, w).color = 'black';
      at(state, xp).color = 'red';
      yield { line: 0, msg: `Recolor: sibling ${kOf(state, w)} becomes black, parent ${kOf(state, xp)} becomes red`, state, hl: { moved: [w, xp] } };
      rotate(state, xp, toward);
      w = xIsLeft ? at(state, xp).right : at(state, xp).left;
      setPointers(state, { z: null, y: null, x, w });
      yield { line: 0, msg: `Rotate ${toward} at ${kOf(state, xp)}: the old sibling moves up, and ${xName()} now has a black sibling ${kOf(state, w)}`, state, hl: { active: focus, moved: [xp] } };
      continue;
    }
    if (!isRed(state, near()) && !isRed(state, far())) {
      yield { line: 0, msg: `${cap(xName())} is double black, its sibling ${kOf(state, w)} is black with two black children: case 2, recolor the sibling red`, state, hl: { active: focus, compare: [w] } };
      at(state, w).color = 'red';
      x = xp;
      xp = parentOf(state, x);
      setPointers(state, { z: null, y: null, x, w });
      yield { line: 0, msg: `Recolor: sibling ${kOf(state, w)} becomes red, so both sides lose one black; the extra black moves up to ${kOf(state, x)}`, state, hl: { active: [x], moved: [w] } };
      continue;
    }
    if (!isRed(state, far())) {
      const n = near();
      yield { line: 0, msg: `${cap(xName())} is double black, its sibling ${kOf(state, w)} is black, the sibling's near child ${kOf(state, n)} is red and the far child is black: case 3, recolor`, state, hl: { active: focus, compare: [w, n] } };
      at(state, n).color = 'black';
      at(state, w).color = 'red';
      yield { line: 0, msg: `Recolor: near child ${kOf(state, n)} becomes black, sibling ${kOf(state, w)} becomes red`, state, hl: { moved: [n, w] } };
      rotate(state, w, xIsLeft ? 'right' : 'left');
      setPointers(state, { z: null, y: null, x, w: n });
      yield { line: 0, msg: `Rotate ${xIsLeft ? 'right' : 'left'} at ${kOf(state, w)}: ${kOf(state, n)} becomes the new sibling, and its far child is red now (case 4 next)`, state, hl: { active: focus, moved: [n, w] } };
      continue;
    }
    const f = far();
    yield { line: 0, msg: `${cap(xName())} is double black, its sibling ${kOf(state, w)} is black and the sibling's far child ${kOf(state, f)} is red: case 4, recolor and rotate`, state, hl: { active: focus, compare: [w, f] } };
    at(state, w).color = at(state, xp).color;
    at(state, xp).color = 'black';
    at(state, f).color = 'black';
    yield { line: 0, msg: `Recolor: sibling ${kOf(state, w)} takes the parent's color, parent ${kOf(state, xp)} and far child ${kOf(state, f)} become black`, state, hl: { moved: [w, xp, f] } };
    rotate(state, xp, toward);
    setPointers(state, { z: null, y: null, x: null, w });
    yield { line: 0, msg: `Rotate ${toward} at ${kOf(state, xp)}: ${kOf(state, w)} moves up, and the extra black is absorbed by the new black node on that side`, state, hl: { moved: [w, xp] } };
    return;
  }
  if (x !== null && isRed(state, x)) {
    setPointers(state, { z: null, y: null, x, w: null });
    yield { line: 0, msg: `${kOf(state, x)} is red: recolor it black, which absorbs the extra black`, state, hl: { active: [x] } };
    at(state, x).color = 'black';
    yield { line: 0, msg: `Recolor: ${kOf(state, x)} becomes black`, state, hl: { moved: [x] } };
  } else if (x !== null && x === state.root) {
    setPointers(state, { z: null, y: null, x, w: null });
    yield { line: 0, msg: `The extra black reached the root ${kOf(state, x)}, where it can simply be dropped`, state, hl: { active: [x] } };
  }
}

// Erases k if present. Returns true when a node was removed.
export function* erase(state, k) {
  const { cur: z, found } = yield* descend(state, k, 'erase', ['z', null]);
  if (!found) {
    setPointers(state, {});
    yield { line: 0, msg: `Reached an empty link: ${k} is not in the tree, nothing to erase`, state, hl: {} };
    return false;
  }
  const zNode = at(state, z);
  const zParent = parentOf(state, z);
  let removedColor = zNode.color;
  let x;
  let xp;
  if (zNode.left === null || zNode.right === null) {
    x = zNode.left ?? zNode.right;
    xp = zParent;
    relink(state, zParent, z, x);
    state.nodes.splice(state.nodes.indexOf(zNode), 1);
    setPointers(state, { z: null, y: null, x, w: null });
    yield {
      line: 0,
      msg: x === null
        ? `${k} has no children: unlink it (it was ${removedColor})`
        : `${k} has one child: its parent links straight to ${kOf(state, x)}, which moves up (the removed node was ${removedColor})`,
      state,
      hl: x === null ? { active: xp === null ? [] : [xp] } : { moved: [x] },
    };
  } else {
    yield { line: 0, msg: `${k} has two children: its successor y, the minimum of the right subtree, will take its place`, state, hl: { active: [z] } };
    let y = zNode.right;
    setPointers(state, { z, y, x: null, w: null });
    yield { line: 0, msg: `Start at the right child ${kOf(state, y)}`, state, hl: { active: [z], compare: [y] } };
    while (at(state, y).left !== null) {
      y = at(state, y).left;
      setPointers(state, { z, y, x: null, w: null });
      yield { line: 0, msg: `Keep going left to ${kOf(state, y)}`, state, hl: { active: [z], compare: [y] } };
    }
    const yNode = at(state, y);
    removedColor = yNode.color;
    x = yNode.right;
    if (parentOf(state, y) === z) {
      xp = y;
    } else {
      xp = parentOf(state, y);
      relink(state, xp, y, x);
      yNode.right = zNode.right;
    }
    relink(state, zParent, z, y);
    yNode.left = zNode.left;
    yNode.color = zNode.color;
    state.nodes.splice(state.nodes.indexOf(zNode), 1);
    setPointers(state, { z: null, y, x, w: null });
    yield {
      line: 0,
      msg: `Unlink ${k} and move the successor node ${yNode.k} into its place, taking its color ${zNode.color}; the node is relinked, not copied (a ${removedColor} node left the successor's old spot)`,
      state,
      hl: { moved: [y], active: x === null ? [] : [x] },
    };
  }
  if (removedColor === 'red' || state.root === null) {
    setPointers(state, {});
    yield { line: 0, msg: state.root === null ? 'The tree is now empty' : 'A red node left its spot, so every black height is unchanged: nothing to fix', state, hl: {} };
    return true;
  }
  yield* eraseFixup(state, x, xp);
  setPointers(state, {});
  yield { line: 0, msg: 'Done: the root is black, no red node has a red child, and every path has the same number of black nodes', state, hl: {} };
  return true;
}

export function* find(state, k) {
  const { cur, found } = yield* descend(state, k, 'find', ['cur', 'p']);
  setPointers(state, { cur: found ? cur : null });
  if (!found) yield { line: 0, msg: `Reached an empty link: ${k} is not there, find returns end()`, state, hl: {} };
  else yield { line: 0, msg: `find(${k}) returns an iterator to this node`, state, hl: { done: [cur] } };
  return found ? cur : null;
}

// lower_bound: the first element that is not less than k.
export function* lowerBound(state, k) {
  let cur = state.root;
  let ans = null;
  while (cur !== null) {
    const node = at(state, cur);
    setPointers(state, { cur, ans });
    if (node.k >= k) {
      ans = cur;
      setPointers(state, { cur, ans });
      yield { line: 0, msg: `${node.k} >= ${k}: ${node.k} is a candidate; go left to look for a smaller one`, state, hl: { compare: [cur] } };
      cur = node.left;
    } else {
      yield { line: 0, msg: `${node.k} < ${k}: too small, go right`, state, hl: { compare: [cur], active: ans === null ? [] : [ans] } };
      cur = node.right;
    }
  }
  setPointers(state, { cur: null, ans });
  if (ans === null) yield { line: 0, msg: `Reached an empty link with no candidate: every element is < ${k}, so lower_bound returns end()`, state, hl: {} };
  else yield { line: 0, msg: `Reached an empty link: the last candidate ${kOf(state, ans)} is the first element >= ${k}`, state, hl: { done: [ans] } };
  return ans;
}

// operator[] / insert_or_assign helper for map: set the mapped value of an existing node.
export function assign(state, key, v) {
  const node = at(state, key);
  node.v = v;
  node.label = labelFor(state, node.k, v);
}

export { at as nodeAt };
