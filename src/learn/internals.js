// "Inside the class": for every Data module, the course class layout (its member
// fields) and a function that reads those members' values out of a frame state.
// Most grader problems ask you to extend these classes, so seeing mSize, mCap,
// mFront, mHeader, mRoot... change step by step is the point.

const show = (value) => (value === null || value === undefined ? 'NULL' : String(value));
const list = (items) => `[${items.join(', ')}]`;

function arrayMembers(state) {
  const values = state.cells.map((cell) => show(cell?.value));
  const spare = Math.max(0, (state.capacity ?? values.length) - values.length);
  return list([...values, ...Array(spare).fill('·')]);
}

// In-order labels, height and lookups for the tree modules (state.nodes + state.root).
function treeInfo(state) {
  const byKey = new Map(state.nodes.map((node) => [node.key, node]));
  const inorder = [];
  let height = -1;
  const walk = (key, depth) => {
    const node = byKey.get(key);
    if (!node || depth > 64) return;
    height = Math.max(height, depth);
    walk(node.left, depth + 1);
    inorder.push(String(node.label));
    walk(node.right, depth + 1);
  };
  walk(state.root, 0);
  return { byKey, inorder, height, root: byKey.get(state.root) || null };
}

function pointerRows(state, byKey) {
  return Object.entries(state.pointers || {})
    .filter(([name, key]) => key !== null && key !== undefined && !name.startsWith('_'))
    .map(([name, key]) => ({ name, value: `→ ${show(byKey.get(key)?.label ?? key)}` }));
}

function blackHeight(state, byKey) {
  let count = 0;
  for (let key = state.root; key !== null && key !== undefined;) {
    const node = byKey.get(key);
    if (!node) break;
    if (node.color === 'black') count += 1;
    key = node.left;
  }
  return count;
}

const INTERNALS = {
  'data/vector': {
    className: 'CP::vector<T>',
    fields: ['T     *mData;   // the array on the heap', 'size_t mCap;    // slots allocated', 'size_t mSize;   // slots in use (mSize <= mCap)'],
    members(state) {
      const size = state.cells.length;
      return [
        { name: 'mSize', value: String(size) },
        { name: 'mCap', value: String(state.capacity) },
        { name: 'mData', value: arrayMembers(state) },
        { name: 'free slots', value: String(state.capacity - size) },
        { name: 'next push_back', value: size === state.capacity ? `expand(${state.capacity ? state.capacity * 2 : 1}) first` : `mData[${size}]` },
      ];
    },
  },
  'data/pair': {
    className: 'vector<pair<int,int>>',
    fields: ['// struct pair { T1 first; T2 second; };', 'pair  *mData;', 'size_t mCap;', 'size_t mSize;'],
    members(state) {
      const last = state.cells.at(-1);
      return [
        { name: 'mSize', value: String(state.cells.length) },
        { name: 'mCap', value: String(state.capacity) },
        { name: 'mData', value: arrayMembers(state) },
        { name: 'back().first', value: last ? String(last.pair[0]) : '—' },
        { name: 'back().second', value: last ? String(last.pair[1]) : '—' },
      ];
    },
  },
  'data/stack': {
    className: 'CP::stack<T>',
    fields: ['T     *mData;', 'size_t mCap;', 'size_t mSize;   // top() is mData[mSize - 1]'],
    members(state) {
      const size = state.cells.length;
      return [
        { name: 'mSize', value: String(size) },
        { name: 'mCap', value: String(state.capacity) },
        { name: 'mData', value: arrayMembers(state) },
        { name: 'top()', value: size ? show(state.cells[size - 1].value) : '— (empty)' },
      ];
    },
  },
  'data/queue': {
    className: 'CP::queue<T>',
    fields: ['T     *mData;', 'size_t mCap;', 'size_t mSize;', 'size_t mFront;  // slot of the first element'],
    members(state) {
      const cap = state.capacity;
      return [
        { name: 'mFront', value: String(state.front) },
        { name: 'mSize', value: String(state.size) },
        { name: 'mCap', value: String(cap) },
        { name: 'mData', value: list(state.cells.map((cell) => (cell ? show(cell.value) : '·'))) },
        { name: 'back slot', value: state.size ? `(mFront + mSize - 1) % mCap = ${(state.front + state.size - 1) % cap}` : '— (empty)' },
        { name: 'next push slot', value: state.size === cap ? 'full: expand first' : `(mFront + mSize) % mCap = ${(state.front + state.size) % cap}` },
      ];
    },
  },
  'data/priority-queue': {
    className: 'CP::priority_queue<T, Comp>',
    fields: ['T     *mData;   // the heap, stored level by level', 'size_t mCap;', 'size_t mSize;', 'Comp   mLess;   // std::less<T>: largest on top'],
    members(state) {
      const size = state.cells.length;
      return [
        { name: 'mSize', value: String(size) },
        { name: 'mCap', value: String(state.capacity) },
        { name: 'mData', value: arrayMembers(state) },
        { name: 'top()', value: size ? show(state.cells[0].value) : '— (empty)' },
        { name: 'index rules', value: 'children 2i+1, 2i+2 · parent (i-1)/2' },
      ];
    },
  },
  'data/list': {
    className: 'CP::list<T>',
    fields: ['class node { T data; node *prev; node *next; };', 'node  *mHeader;   // sentinel node, holds no data', 'size_t mSize;'],
    members(state) {
      const byKey = new Map([[state.header.key, state.header], ...state.nodes.map((node) => [node.key, node])]);
      if (state.pending) byKey.set(state.pending.key, state.pending);
      const label = (key) => (key === state.header.key ? 'mHeader' : show(byKey.get(key)?.value));
      const order = ['H'];
      for (let key = state.header.next, guard = 0; key && key !== state.header.key && guard <= state.nodes.length + 1; key = byKey.get(key)?.next, guard += 1) order.push(label(key));
      order.push('H');
      const rows = [
        { name: 'mSize', value: String(state.nodes.length) },
        { name: 'mHeader->next', value: state.header.next ? label(state.header.next) : 'NULL' },
        { name: 'mHeader->prev', value: state.header.prev ? label(state.header.prev) : 'NULL' },
        { name: 'next chain', value: order.join(' → ') },
      ];
      if (state.pending) rows.push({ name: 'new node', value: `data ${show(state.pending.value)}, prev ${state.pending.prev ? label(state.pending.prev) : 'NULL'}, next ${state.pending.next ? label(state.pending.next) : 'NULL'}` });
      const it = state.pointers?.it;
      if (it) rows.push({ name: 'it.ptr', value: `→ ${label(it)}` });
      return rows;
    },
  },
  'data/bst': {
    className: 'CP::map_bst<KeyT, MappedT>',
    fields: ['class node { ValueT data; node *left, *right, *parent; };', 'node    *mRoot;', 'CompareT mLess;   // std::less<KeyT>', 'size_t   mSize;'],
    members(state) {
      const { byKey, inorder, height, root } = treeInfo(state);
      return [
        { name: 'mRoot', value: root ? show(root.label) : 'NULL' },
        { name: 'mSize', value: String(state.nodes.length) },
        { name: 'height', value: String(height) },
        { name: 'inorder', value: inorder.join(' ') || '—' },
        ...pointerRows(state, byKey),
      ];
    },
  },
  'data/avl': {
    className: 'CP::map_avl<KeyT, MappedT>',
    fields: ['class node { ValueT data; node *left, *right, *parent; int height; };', 'node    *mRoot;', 'CompareT mLess;', 'size_t   mSize;'],
    members(state) {
      const { byKey, inorder, root } = treeInfo(state);
      return [
        { name: 'mRoot', value: root ? show(root.label) : 'NULL' },
        { name: 'mSize', value: String(state.nodes.length) },
        { name: 'mRoot->height', value: root ? String(root.h) : '-1' },
        { name: 'inorder', value: inorder.join(' ') || '—' },
        ...pointerRows(state, byKey),
      ];
    },
  },
  'data/set': {
    className: 'std::set<int> (red-black tree)',
    fields: ['struct node { color; node *parent, *left, *right; int value; };', 'node  *root;        // header.parent in libstdc++', 'size_t node_count;'],
    members(state) {
      const { byKey, inorder, height, root } = treeInfo(state);
      return [
        { name: 'root', value: root ? show(root.label) : 'NULL' },
        { name: 'node_count', value: String(state.nodes.length) },
        { name: 'black-height', value: String(blackHeight(state, byKey)) },
        { name: 'red nodes', value: String(state.nodes.filter((node) => node.color === 'red').length) },
        { name: 'height', value: String(height) },
        { name: 'inorder', value: inorder.join(' ') || '—' },
        ...pointerRows(state, byKey),
      ];
    },
  },
  'data/map': {
    className: 'std::map<int,int> (red-black tree)',
    fields: ['struct node { color; node *parent, *left, *right; pair<const int,int> value; };', 'node  *root;', 'size_t node_count;'],
    members(state) {
      const { byKey, inorder, height, root } = treeInfo(state);
      return [
        { name: 'root', value: root ? show(root.label) : 'NULL' },
        { name: 'node_count', value: String(state.nodes.length) },
        { name: 'black-height', value: String(blackHeight(state, byKey)) },
        { name: 'height', value: String(height) },
        { name: 'inorder (k:v)', value: inorder.join(' ') || '—' },
        ...pointerRows(state, byKey),
      ];
    },
  },
  'data/hash-table': {
    className: 'CP::unordered_map<KeyT, MappedT>',
    fields: ['typedef std::vector<ValueT> BucketT;', 'std::vector<BucketT> mBuckets;', 'size_t  mSize;', 'HasherT mHasher;          // here: k mod bucket_count()', 'EqualT  mEqual;', 'float   mMaxLoadFactor;'],
    members(state) {
      const m = state.buckets.length;
      const n = state.buckets.reduce((sum, bucket) => sum + bucket.length, 0) + (state.tmp?.length || 0);
      return [
        { name: 'bucket_count()', value: String(m) },
        { name: 'mSize', value: String(n) },
        { name: 'mMaxLoadFactor', value: state.maxLoad.toFixed(1) },
        { name: 'load_factor()', value: (n / m).toFixed(2) },
        { name: 'longest chain', value: String(Math.max(0, ...state.buckets.map((bucket) => bucket.length))) },
        { name: 'mBuckets', value: state.buckets.map((bucket, i) => `${i}:${list(bucket.map((cell) => show(cell.value)))}`).join(' ') },
      ];
    },
  },
};

export function internalsFor(module) {
  return INTERNALS[`${module.side}/${module.id}`] || null;
}
