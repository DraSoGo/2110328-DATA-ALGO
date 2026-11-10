// Code-tab figures for unordered-map (see ../figures.js for the format).
import { upTo } from './helpers.js';

// The preset table (m = 5): bucket 2 = 12, 7, 22 (k0, k1, k3); bucket 4 = 9 (k2). One spare row is
// kept so end() (the bucket iterator past the last bucket) has a row to sit in.
const M = 5;
const table = (cellsByBucket, extra = {}) => {
  const buckets = Array.from({ length: M }, (_, i) => cellsByBucket[i] || []);
  return { buckets, capacity: M + 1, maxChain: 4, tmp: [], maxLoad: 1, nextKey: 9, ...extra };
};
const FULL = { 2: [{ key: 'k0', value: 12 }, { key: 'k1', value: 7 }, { key: 'k3', value: 22 }], 4: [{ key: 'k2', value: 9 }] };
const full = (pointers) => table(FULL, pointers ? { pointers } : {});
const copyOf = (prefix) => Object.fromEntries(Object.entries(FULL).map(([i, chain]) => [i, chain.map((c) => ({ ...c, key: `${prefix}${c.key}` }))]));
const step = (msg, state, hl = {}) => ({ msg, state, hl });
// Iterator pointers: bkt = mCurBucketItr, val = mCurValueItr, end = mEndBucketItr.
const at = (bkt, val, extra = {}) => full({ bkt, val, end: M, ...extra });
const endOf = (bucket) => ({ bucket, at: FULL[bucket]?.length || 0 });

// to_next_data(): from an empty bucket, move on until a bucket has data (or the end).
function skipFrames(first = 0) {
  const frames = [step(`mCurValueItr == bucket ${first}.end(): nothing here`, at(first, endOf(first)), { bucket: [first] })];
  for (let b = first + 1; b < M; b += 1) {
    const chain = FULL[b];
    frames.push(step(chain ? `bucket ${b} has data: mCurValueItr = begin()` : `mCurBucketItr++ : bucket ${b} is empty too`, at(b, chain ? chain[0].key : endOf(b)), { bucket: [b], ...(chain ? { active: [chain[0].key] } : {}) }));
    if (chain) break;
  }
  return frames;
}

function preInc() {
  return [
    step('it is on 22, the last of its chain', at(2, 'k3'), { bucket: [2], active: ['k3'] }),
    step('mCurValueItr++ : past the end of the chain', at(2, endOf(2)), { bucket: [2] }),
    step('to_next_data(): bucket 3 is empty, skip it', at(3, endOf(3)), { bucket: [3] }),
    step('bucket 4: mCurValueItr = begin()', at(4, 'k2'), { bucket: [4], active: ['k2'] }),
  ];
}

function postInc() {
  return [
    step('it is on 22', at(2, 'k3'), { bucket: [2], active: ['k3'] }),
    step('tmp(*this): tmp copies the old position', at(2, 'k3', { tmp: 'k3' }), { bucket: [2], active: ['k3'] }),
    step('operator++() moves it to the next element', at(4, 'k2', { tmp: 'k3' }), { bucket: [4], active: ['k2'], compare: ['k3'] }),
    step('return tmp: the caller gets the OLD position', at(4, 'k2', { tmp: 'k3' }), { bucket: [4], done: ['k3'] }),
  ];
}

function deref(msg) {
  return [step('it', at(2, 'k1'), { bucket: [2], active: ['k1'] }), step(msg, at(2, 'k1'), { bucket: [2], done: ['k1'] })];
}

function equality(op) {
  const same = op === '==';
  return [
    step(`same element: ${same}`, full({ a: 'k3', b: 'k3' }), { done: ['k3'] }),
    step(`different elements: ${!same}`, full({ a: 'k3', b: 'k2' }), { active: ['k3'], compare: ['k2'] }),
    step(`last element vs end(): ${!same}`, full({ it: 'k2', end: endOf(4) }), { active: ['k2'], bucket: [4] }),
    step(`after ++it: ${same}`, full({ it: endOf(4), end: endOf(4) }), { bucket: [4] }),
  ];
}

function copyCtor() {
  const fresh = (upto) => table(Object.fromEntries(Object.keys(copyOf('c')).filter((i) => Number(i) < upto).map((i) => [i, copyOf('c')[i]])), { capacity: M });
  const src = (hl) => ({ label: 'other', state: { ...full(), capacity: M }, hl });
  const frames = [{ msg: 'mBuckets(other.mBuckets): vector copy, bucket by bucket', panels: [src({}), { label: 'this', state: fresh(0) }] }];
  for (const i of Object.keys(FULL)) {
    frames.push({ msg: `bucket ${i} copied with its chain`, panels: [src({ bucket: [Number(i)], compare: FULL[i].map((c) => c.key) }), { label: 'this', state: fresh(Number(i) + 1), hl: { bucket: [Number(i)], active: copyOf('c')[i].map((c) => c.key) } }] });
  }
  frames.push({ msg: 'mSize, mHasher, mEqual, mMaxLoadFactor copied', panels: [src({}), { label: 'this', state: fresh(M), hl: { done: Object.values(copyOf('c')).flat().map((c) => c.key) } }] });
  return frames;
}

function assignOp() {
  const mine = { 3: [{ key: 't0', value: 3 }, { key: 't1', value: 8 }] };
  const sized = (state) => ({ ...state, capacity: M });
  const left = sized(table(mine));
  const right = sized(full());
  const panels = (a, b, ahl = {}, bhl = {}) => [{ label: 'this', state: a, hl: ahl }, { label: 'other', state: b, hl: bhl }];
  return [
    { msg: 'other is a copy of the argument (pass by value)', panels: panels(left, right) },
    { msg: 'swap mBuckets, mSize, ...', panels: panels(right, left, { done: ['k0', 'k1', 'k2', 'k3'] }, { compare: ['t0', 't1'] }) },
    { msg: 'end of scope: other (the old table) is destroyed', panels: panels(right, sized(table({})), {}, {}) },
  ];
}

function maxLoadSetter({ base, run }) {
  const crowded = { ...base, maxLoad: 0.5 };
  return [
    { msg: 'mMaxLoadFactor = 0.5', state: crowded, hl: {} },
    ...run('rehash', { n: base.buckets.length }, crowded),
  ];
}

function operatorIndex({ run }) {
  const frames = run('insert', { x: 17 });
  const last = frames.at(-1);
  frames.push({ msg: 'return it->second: a reference to the stored value', state: { ...last.state, pointers: { ref: 'k4' } }, hl: { done: ['k4'] } });
  return frames;
}


export default {
  class: { show: (s) => ({ hl: { bucket: upTo(s.buckets.length) } }), members: ['mBuckets', 'mSize', 'mMaxLoadFactor', 'load_factor()'] },
  'value-type': { show: () => ({ hl: { active: ['k0', 'k3'] } }), members: ['mBuckets'] },
  'bucket-type': { show: () => ({ hl: { bucket: [2], compare: ['k0', 'k1', 'k3'] } }), members: ['mBuckets'] },
  'value-iterator': { frames: () => [step('a ValueIterator points at one element', full({ val: 'k1' }), { active: ['k1'] })] },
  'bucket-iterator': { frames: () => [step('a BucketIterator points at one bucket', full({ bkt: 2 }), { bucket: [2] })] },
  'iterator-class': { frames: () => [step('bucket itr + value itr + end of buckets', at(2, 'k1'), { bucket: [2], active: ['k1'] })] },
  'to-next-data': { frames: () => skipFrames(0) },
  'iter-types': { frames: () => [step('reference = ValueT&, pointer = ValueT*: both aim at an element', at(2, 'k1'), { bucket: [2], active: ['k1'] })] },
  'iter-default-ctor': { frames: () => [step('three members left uninitialised: they point nowhere yet', full(), {})] },
  'iter-ctor': { frames: () => skipFrames(0).map((f, i) => ({ ...f, msg: i === 0 ? 'members set from the arguments' : `to_next_data(): ${f.msg}` })) },
  'iter-pre-inc': { frames: preInc },
  'iter-post-inc': { frames: postInc },
  'iter-deref': { frames: () => deref('*mCurValueItr: the element itself (a pair)') },
  'iter-arrow': { frames: () => deref('&(*mCurValueItr): its address') },
  'iter-eq': { frames: () => equality('==') },
  'iter-neq': { frames: () => equality('!=') },
  'iterator-typedef': { frames: () => [step('iterator = hashtable_iterator', at(2, 'k0'), { bucket: [2], active: ['k0'] })] },
  'default-ctor': { frames: () => [step('11 empty buckets, mSize = 0, max load 1.0', { buckets: Array.from({ length: 11 }, () => []), capacity: 11, maxChain: 4, tmp: [], maxLoad: 1, nextKey: 0 }, { bucket: upTo(11) })], members: ['bucket_count()', 'mSize', 'mMaxLoadFactor'] },
  'copy-ctor': { frames: copyCtor, members: ['mSize', 'mMaxLoadFactor'] },
  'assign-op': { frames: assignOp, members: ['mSize'] },
  destructor: { op: 'clear', members: ['mSize'] },
  empty: { frames: () => [step('mSize == 0 ? false', full(), { compare: ['k0', 'k1', 'k2', 'k3'] }), step('mSize == 0 ? true', table({}), {})], members: ['mSize'] },
  'max-load-getter': { show: () => ({}), members: ['mMaxLoadFactor', 'load_factor()'] },
  'max-load-setter': { frames: maxLoadSetter, members: ['mMaxLoadFactor', 'load_factor()', 'bucket_count()'] },
  begin: { frames: () => [step('begin(): first bucket, first value', at(0, endOf(0)), { bucket: [0] }), ...skipFrames(0).slice(1)] },
  end: { frames: () => [step('end(): past the last bucket; value = last bucket .end()', full({ bkt: M, val: endOf(4), end: M }), { bucket: [4] })] },
  'operator-index': { frames: operatorIndex, members: ['mSize', 'load_factor()'] },
  'm-buckets': { show: (s) => ({ hl: { bucket: upTo(s.buckets.length) } }), members: ['bucket_count()', 'mBuckets'] },
    'm-size': { show: (s) => ({ hl: { compare: s.buckets.flat().map((cell) => cell.key) } }), members: ['mSize'] },
    'm-max-load': { show: () => ({}), members: ['mMaxLoadFactor', 'load_factor()'] },
    'load-factor': { show: () => ({}), members: ['load_factor()', 'mMaxLoadFactor'] },
    'bucket-count': { show: (s) => ({ hl: { bucket: upTo(s.buckets.length) } }), members: ['bucket_count()'] },
    'find-in-bucket': { op: 'find' },
    size: { show: (s) => ({ hl: { compare: s.buckets.flat().map((cell) => cell.key) } }), members: ['mSize'] },
};
