export const LIMIT = 10;
export const MAX_BUCKETS = 11;
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113];

const keyParam = (name = 'x', def = 17) => ({ name, min: 0, max: 99, default: def });
const size = (state) => state.buckets.reduce((sum, bucket) => sum + bucket.length, 0) + state.tmp.length;
const hash = (state, x) => x % state.buckets.length;
const loadText = (state) => `${size(state)}/${state.buckets.length} = ${(size(state) / state.buckets.length).toFixed(2)}`;
const plural = (n) => `${n} key${n === 1 ? '' : 's'}`;

// All keys in iteration order: bucket by bucket, each chain front to back.
export function keys(state) {
  return state.buckets.flat().map((cell) => cell.value);
}

export function nextPrime(m) {
  return PRIMES.find((p) => p >= m) ?? m;
}

function hashFrame(state, x, verb) {
  const m = state.buckets.length;
  const bi = hash(state, x);
  return { bi, frame: { line: 0, msg: `h(${x}) = ${x} mod ${m} = ${bi}: ${verb} bucket ${bi}${state.buckets[bi].length ? ` (chain of ${plural(state.buckets[bi].length)})` : ' (empty)'}`, state, hl: { bucket: [bi] } } };
}

// Walks the chain of bucket bi like find_in_bucket. Returns the index in the chain, or -1.
function* search(state, x, bi) {
  const chain = state.buckets[bi];
  for (let j = 0; j < chain.length; j += 1) {
    const cell = chain[j];
    if (cell.value === x) {
      yield { line: 0, msg: `Chain walk, node ${j}: ${cell.value} == ${x}, found`, state, hl: { bucket: [bi], active: [cell.key] } };
      return j;
    }
    yield { line: 0, msg: `Chain walk, node ${j}: ${cell.value} != ${x}, follow the link`, state, hl: { bucket: [bi], compare: [cell.key] } };
  }
  yield { line: 0, msg: chain.length ? `The end of the chain: ${x} is not in bucket ${bi}` : `Bucket ${bi} is empty, so ${x} is not in the table`, state, hl: { bucket: [bi] } };
  return -1;
}

// The course's rehash(m): grow to a prime and re-insert every value through tmp.
function* rehash(state, want) {
  yield { line: 0, msg: `load_factor() = ${loadText(state)} > max_load_factor ${state.maxLoad.toFixed(1)}: too crowded, call rehash(2 * bucket_count()) = rehash(${want})`, state, hl: { compare: state.buckets.flat().map((cell) => cell.key) } };
  yield* rebuild(state, want);
}

function* rebuild(state, want) {
  const n = size(state);
  const m = state.buckets.length;
  const least = Math.floor(0.5 + n / state.maxLoad);
  const wanted = Math.max(want, least);
  const prime = nextPrime(wanted);
  yield { line: 0, msg: `m = max(${want}, (size_t)(0.5 + ${n}/${state.maxLoad.toFixed(1)}) = ${least}) = ${wanted}; the smallest prime >= ${wanted} is ${prime}, so the new bucket count is ${prime} (a prime spreads keys better)`, state, hl: {} };
  const moved = state.buckets.flat();
  state.tmp = moved;
  state.buckets = Array.from({ length: m }, () => []);
  yield { line: 0, msg: `Copy all ${plural(n)} into tmp, bucket by bucket, then clear() every bucket`, state, hl: { moved: moved.map((cell) => cell.key) } };
  state.buckets = Array.from({ length: prime }, () => []);
  state.capacity = Math.max(state.capacity, prime);
  yield { line: 0, msg: `mBuckets.resize(${prime}): ${prime} empty buckets`, state, hl: {} };
  while (state.tmp.length) {
    const cell = state.tmp.shift();
    const bi = hash(state, cell.value);
    state.buckets[bi].push(cell);
    yield { line: 0, msg: `Re-insert ${cell.value}: h(${cell.value}) = ${cell.value} mod ${prime} = ${bi}, appended at the end of bucket ${bi}`, state, hl: { bucket: [bi], active: [cell.key] } };
  }
}

const rowKeys = (state, bi) => state.buckets[bi].map((cell) => cell.key);
const bucketParam = { name: 'i', min: 0, max: MAX_BUCKETS - 1, default: 2 };

function emptyBuckets(m) {
  return Array.from({ length: m }, () => []);
}

export default {
  id: 'hash-table',
  side: 'data',
  group: 'Hash',
  title: 'hash table',
  summary: 'Course unordered_map with separate chaining (keys only, to keep the picture small): h(k) = k mod m picks a bucket, collisions share a chain, and the table rehashes to a prime size when the load factor n/m passes max_load_factor.',
  renderer: 'buckets',
  complexity: {
    space: 'O(n)',
    note: '* Average case: a good hash function keeps every chain about n/m long, and rehash holds n/m under max_load_factor, so find, insert, and erase walk O(1) nodes. Worst case O(n): all keys land in one bucket and the chain is just a list. A rehash itself costs O(n) but happens rarely.',
  },
  declare: 'CP::unordered_set<int> s;  // m = 5 buckets, max_load_factor 1.0, holds 12, 7, 9, 22',
  preset() {
    const state = { buckets: emptyBuckets(5), capacity: MAX_BUCKETS, maxChain: LIMIT, tmp: [], maxLoad: 1, nextKey: 4 };
    [12, 7, 9, 22].forEach((value, i) => state.buckets[value % 5].push({ key: `k${i}`, value }));
    return state;
  },
  ops: {
    insert: {
      params: [keyParam()],
      time: 'O(1) avg',
      code: 's.insert({x});',
      check: (state) => (size(state) >= LIMIT ? `This demo keeps at most ${LIMIT} keys` : null),
      *run(state, { x }) {
        const { bi, frame } = hashFrame(state, x, 'look in');
        yield frame;
        const found = yield* search(state, x, bi);
        if (found >= 0) {
          yield { line: 0, msg: `${x} is already in the table: insert does nothing and returns false (keys are unique)`, state, hl: { bucket: [bi], done: [state.buckets[bi][found].key] } };
          return;
        }
        let target = bi;
        const n = size(state);
        const over = n / state.buckets.length > state.maxLoad;
        yield { line: 0, msg: `insert_to_bucket: load_factor() = ${loadText(state)} ${over ? '>' : '<='} max_load_factor ${state.maxLoad.toFixed(1)}${over ? ': rehash first' : ': no rehash needed'}`, state, hl: { bucket: [bi] } };
        if (over) {
          yield* rehash(state, 2 * state.buckets.length);
          const again = hashFrame(state, x, 'bi changed with m, so recompute: use');
          target = again.bi;
          yield again.frame;
        }
        const cell = { key: `k${state.nextKey}`, value: x };
        state.nextKey += 1;
        state.buckets[target].push(cell);
        yield { line: 0, msg: `Append ${x} at the end of bucket ${target}; n = ${size(state)}, load factor ${loadText(state)}`, state, hl: { bucket: [target], active: [cell.key] } };
      },
    },
    find: {
      params: [keyParam('x', 22)],
      time: 'O(1) avg',
      code: 's.find({x});',
      check: null,
      *run(state, { x }) {
        const { bi, frame } = hashFrame(state, x, 'look in');
        yield frame;
        const found = yield* search(state, x, bi);
        yield found >= 0
          ? { line: 0, msg: `find(${x}) returns an iterator to the node in bucket ${bi}, after ${found + 1} comparison${found ? 's' : ''}`, state, hl: { bucket: [bi], done: [state.buckets[bi][found].key] } }
          : { line: 0, msg: `find(${x}) returns end(): ${x} is not stored`, state, hl: { bucket: [bi] } };
      },
    },
    erase: {
      params: [keyParam('x', 7)],
      time: 'O(1) avg',
      code: 's.erase({x});',
      check: null,
      *run(state, { x }) {
        const { bi, frame } = hashFrame(state, x, 'look in');
        yield frame;
        const found = yield* search(state, x, bi);
        if (found < 0) {
          yield { line: 0, msg: `erase(${x}) returns 0: nothing was removed`, state, hl: { bucket: [bi] } };
          return;
        }
        const [gone] = state.buckets[bi].splice(found, 1);
        const after = state.buckets[bi].slice(found).map((cell) => cell.key);
        yield { line: 0, msg: `Unlink ${gone.value} from the chain of bucket ${bi} and delete it; erase returns 1, n = ${size(state)}. The bucket count stays ${state.buckets.length}`, state, hl: { bucket: [bi], moved: after } };
      },
    },
    count: {
      params: [keyParam('x', 7)],
      time: 'O(1) avg',
      code: 's.count({x});  // 1 if x is stored, else 0',
      check: null,
      *run(state, { x }) {
        const { bi, frame } = hashFrame(state, x, 'look in');
        yield frame;
        const found = yield* search(state, x, bi);
        yield found >= 0
          ? { line: 0, msg: `count(${x}) returns 1: keys are unique, so a hit counts once`, state, hl: { bucket: [bi], done: [state.buckets[bi][found].key] } }
          : { line: 0, msg: `count(${x}) returns 0: ${x} is not stored`, state, hl: { bucket: [bi] } };
      },
    },
    bucket: {
      params: [keyParam('x', 22)],
      time: 'O(1)',
      code: 's.bucket({x});  // hash_to_bucket(x): the index only, no search',
      check: null,
      *run(state, { x }) {
        const m = state.buckets.length;
        const bi = hash(state, x);
        yield { line: 0, msg: `bucket(${x}) = h(${x}) mod bucket_count() = ${x} mod ${m} = ${bi}. It only computes the index, whether ${x} is stored or not`, state, hl: { bucket: [bi] } };
      },
    },
    bucket_size: {
      params: [bucketParam],
      time: 'O(len)',
      code: 's.bucket_size({i});  // length of the chain in mBuckets[i]',
      check: (state, { i }) => (i >= state.buckets.length ? `i must be between 0 and bucket_count() - 1 (${state.buckets.length - 1})` : null),
      *run(state, { i }) {
        const chain = state.buckets[i];
        yield { line: 0, msg: `mBuckets[${i}] is ${chain.length ? `a chain of ${plural(chain.length)}` : 'empty'}`, state, hl: { bucket: [i] } };
        for (let j = 0; j < chain.length; j += 1) {
          yield { line: 0, msg: `Count node ${j} (${chain[j].value}): ${j + 1} so far`, state, hl: { bucket: [i], compare: [chain[j].key] } };
        }
        yield { line: 0, msg: `bucket_size(${i}) returns ${chain.length}`, state, hl: { bucket: [i], done: rowKeys(state, i) } };
      },
    },
    clear: {
      params: [],
      time: 'O(m + n)',
      code: 's.clear();  // for (auto& bucket : mBuckets) bucket.clear(); mSize = 0;',
      check: null,
      *run(state) {
        yield { line: 0, msg: `for each of the ${state.buckets.length} buckets: bucket.clear(). The bucket count stays, only the nodes go`, state, hl: { compare: state.buckets.flat().map((cell) => cell.key) } };
        for (let bi = 0; bi < state.buckets.length; bi += 1) {
          const gone = state.buckets[bi].length;
          state.buckets[bi] = [];
          yield { line: 0, msg: gone ? `mBuckets[${bi}].clear(): delete ${plural(gone)}; ${size(state)} left` : `mBuckets[${bi}].clear(): already empty`, state, hl: { bucket: [bi] } };
        }
        yield { line: 0, msg: `mSize = 0: the table is empty, bucket_count() is still ${state.buckets.length}`, state, hl: {} };
      },
    },
    rehash: {
      params: [{ name: 'n', min: 2, max: MAX_BUCKETS, default: 11 }],
      time: 'O(n)',
      code: 's.rehash({n});  // m = max(n, 0.5 + mSize/maxLoad), rounded up to a prime',
      check: null,
      *run(state, { n }) {
        const m = state.buckets.length;
        const ok = size(state) / m <= state.maxLoad;
        if (n <= m && ok) {
          yield { line: 0, msg: `rehash(${n}): ${n} <= bucket_count() ${m} and load_factor() ${loadText(state)} <= max_load_factor ${state.maxLoad.toFixed(1)}, so the course version returns at once and nothing moves`, state, hl: {} };
          return;
        }
        yield { line: 0, msg: `rehash(${n}): ${n > m ? `${n} > bucket_count() ${m}` : `load_factor() ${loadText(state)} > max_load_factor ${state.maxLoad.toFixed(1)}`}, so the table is rebuilt`, state, hl: { compare: state.buckets.flat().map((cell) => cell.key) } };
        yield* rebuild(state, n);
        yield { line: 0, msg: `Done: bucket_count() = ${state.buckets.length}, mSize = ${size(state)}, load factor ${loadText(state)}`, state, hl: {} };
      },
    },
  },
};
