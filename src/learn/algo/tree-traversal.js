const CODE = [
  'struct node { int data; node *left, *right; };',
  'void preorder(node *n) {',
  '  if (n == nullptr) return;',
  '  cout << n->data << " ";',
  '  preorder(n->left);',
  '  preorder(n->right);',
  '}',
  'void inorder(node *n) {',
  '  if (n == nullptr) return;',
  '  inorder(n->left);',
  '  cout << n->data << " ";',
  '  inorder(n->right);',
  '}',
  'void postorder(node *n) {',
  '  if (n == nullptr) return;',
  '  postorder(n->left);',
  '  postorder(n->right);',
  '  cout << n->data << " ";',
  '}',
  'void level_order(node *root) {',
  '  queue<node*> q;',
  '  q.push(root);',
  '  while (!q.empty()) {',
  '    node *n = q.front(); q.pop();',
  '    cout << n->data << " ";',
  '    if (n->left)  q.push(n->left);',
  '    if (n->right) q.push(n->right);',
  '  }',
  '}',
];

const NAMES = ['preorder', 'inorder', 'postorder', 'level_order'];
// First code line of each function (the header). Recursive ones: header, null check, then the three steps.
const START = [1, 7, 13, 19];
// Order of the three steps (V = print, L, R) and their offset from the header line, per recursive order.
const STEPS = [
  [['V', 2], ['L', 3], ['R', 4]],
  [['L', 2], ['V', 3], ['R', 4]],
  [['L', 2], ['R', 3], ['V', 4]],
];

// Build the BST by inserting `values` in order (duplicates are ignored, as in a map).
function buildTree(values) {
  const nodes = [];
  let root = null;
  for (const value of values) {
    let parent = null;
    let side = null;
    let cur = root;
    while (cur !== null) {
      const node = nodes.find((n) => n.key === cur);
      if (value === node.label) { parent = undefined; break; }
      parent = cur;
      side = value < node.label ? 'left' : 'right';
      cur = node[side];
    }
    if (parent === undefined) continue;
    const key = `t${nodes.length}`;
    nodes.push({ key, label: value, left: null, right: null });
    if (parent === null) root = key;
    else nodes.find((n) => n.key === parent)[side] = key;
  }
  return { nodes, root };
}

const heightOf = ({ nodes, root }) => {
  const get = (key) => nodes.find((n) => n.key === key);
  const h = (key) => (key === null ? -1 : 1 + Math.max(h(get(key).left), h(get(key).right)));
  return h(root);
};

export default {
  id: 'tree-traversal',
  side: 'algo',
  group: 'Tree traversal',
  title: 'Tree traversal',
  summary: 'Visit every node of a binary search tree: preorder, inorder (sorted for a BST), postorder, or level order with a queue. The little number on each node is its visit position.',
  renderer: 'tree',
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(h)',
    note: 'Every node is visited once, so time is O(n). Recursive orders use O(h) stack for tree height h (O(n) for a chain); level order keeps a queue of up to one level, O(n) in the worst case.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'values', label: 'insert order', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 15, default: [40, 20, 60, 10, 30, 50, 70] },
      { name: 'order', label: 'order (0 pre, 1 in, 2 post, 3 level)', min: 0, max: 3, default: 1 },
    ],
  },
  *run({ values, order }) {
    const tree = buildTree(values);
    const get = (key) => tree.nodes.find((n) => n.key === key);
    const state = {
      nodes: tree.nodes,
      root: tree.root,
      capacity: tree.nodes.length,
      maxDepth: heightOf(tree),
      pointers: { n: null },
    };
    const out = [];
    const visited = [];
    const stack = [];
    const name = NAMES[order];
    const hl = (active, extra = {}) => ({ active: active === null ? [] : [active], compare: stack.filter((k) => k !== active), done: visited.filter((k) => k !== active), ...extra });
    const visit = (key) => {
      get(key).badge = String(visited.length + 1);
      visited.push(key);
      out.push(get(key).label);
    };
    const val = (key) => (key === null ? null : get(key).label);

    yield { line: 0, msg: `Insert ${tree.nodes.length} distinct value${tree.nodes.length === 1 ? '' : 's'} into a BST (in the order given), then call ${name}(root)`, state, hl: {}, vars: { out: [] } };

    if (order < 3) {
      const base = START[order];
      const call = function* (key, from) {  // `from` is the caller's node (null for the root call)
        state.pointers = { n: key };
        stack.push(key ?? from);
        if (key === null) {
          yield { line: base, msg: `${name}(nullptr) is called`, state, hl: hl(null), vars: { n: null, out: [...out] } };
          yield { line: base + 1, msg: 'n == nullptr: return to the caller', state, hl: hl(null), vars: { n: null, out: [...out] } };
          stack.pop();
          return;
        }
        yield { line: base, msg: `${name}(${get(key).label}) is called`, state, hl: hl(key), vars: { n: val(key), out: [...out] } };
        for (const [step, offset] of STEPS[order]) {
          state.pointers = { n: key };
          if (step === 'V') {
            visit(key);
            yield { line: base + offset, msg: `Print ${get(key).label} (visit number ${visited.length})`, state, hl: hl(key, { moved: [key] }), vars: { n: val(key), out: [...out] } };
          } else {
            const child = get(key)[step === 'L' ? 'left' : 'right'];
            const side = step === 'L' ? 'left' : 'right';
            yield { line: base + offset, msg: child === null ? `${get(key).label} has no ${side} child: ${name}(nullptr)` : `Recurse into the ${side} child ${get(child).label}`, state, hl: hl(key), vars: { n: val(key), out: [...out] } };
            yield* call(child, key);
            state.pointers = { n: key };
          }
        }
        stack.pop();
        state.pointers = { n: stack.length ? stack[stack.length - 1] : null };
      };
      yield* call(tree.root, null);
      state.pointers = { n: null };
      yield { line: base + 5, msg: `Done: ${name} printed ${out.join(' ')}`, state, hl: hl(null), vars: { out: [...out] } };
      return;
    }

    // level order
    const queue = [];
    const q = () => queue.map(val);
    yield { line: 20, msg: 'Create an empty queue', state, hl: hl(null), vars: { out: [], q: [] } };
    queue.push(tree.root);
    yield { line: 21, msg: `Push the root ${val(tree.root)}`, state, hl: hl(null, { moved: [...queue] }), vars: { out: [], q: q() } };
    while (true) {
      const more = queue.length > 0;
      yield { line: 22, msg: more ? `The queue holds ${queue.length} node${queue.length === 1 ? '' : 's'}: keep going` : 'The queue is empty: the loop ends', state, hl: hl(null, { moved: [...queue] }), vars: { out: [...out], q: q() } };
      if (!more) break;
      const key = queue.shift();
      state.pointers = { n: key };
      yield { line: 23, msg: `n = q.front() = ${val(key)}, then q.pop()`, state, hl: hl(key, { moved: [...queue] }), vars: { n: val(key), out: [...out], q: q() } };
      visit(key);
      yield { line: 24, msg: `Print ${val(key)} (visit number ${visited.length})`, state, hl: hl(key, { moved: [...queue] }), vars: { n: val(key), out: [...out], q: q() } };
      for (const [side, line] of [['left', 25], ['right', 26]]) {
        const child = get(key)[side];
        if (child !== null) queue.push(child);
        yield { line, msg: child === null ? `${val(key)} has no ${side} child: nothing to push` : `Push the ${side} child ${val(child)}`, state, hl: hl(key, { moved: [...queue] }), vars: { n: val(key), out: [...out], q: q() } };
      }
    }
    state.pointers = { n: null };
    yield { line: CODE.length - 1, msg: `Done: level_order printed ${out.join(' ')}`, state, hl: hl(null), vars: { out: [...out], q: [] } };
  },
};
