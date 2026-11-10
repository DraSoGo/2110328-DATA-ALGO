// Code-tab figures for vector (see ../figures.js for the format).
import { upTo } from './helpers.js';

const arrayFull = { op: 'push_back', prep: [['push_back', { x: 40 }]], args: { x: 50 } };

// Copy constructor: allocate a new array of a.capacity(), then copy element by element.
// Two panels: the source `a` and the new object `this`. Keys get a `c` prefix in the
// copy so the two pictures never share keys.
function copyFrames({ base }) {
  const n = base.cells.length;
  const copyState = (count) => ({ ...base, cells: base.cells.slice(0, count).map((cell) => ({ ...cell, key: `c${cell.key}` })) });
  const frames = [{
    msg: `mData = new T[a.capacity()]: a new empty array of ${base.capacity}`,
    panels: [{ label: 'a', state: base }, { label: 'this', state: copyState(0) }],
  }];
  for (let i = 0; i < n; i += 1) {
    frames.push({
      msg: `mData[${i}] = a[${i}] = ${base.cells[i].value}`,
      panels: [{ label: 'a', state: base, hl: { compare: [i] } }, { label: 'this', state: copyState(i + 1), hl: { active: [i] } }],
    });
  }
  frames.push({ msg: `Done: mCap = ${base.capacity}, mSize = ${n}; this owns its own array`, panels: [{ label: 'a', state: base }, { label: 'this', state: copyState(n), hl: { done: Array.from({ length: n }, (_, k) => k) } }] });
  return frames;
}

const keys = upTo; // hl takes slot indexes
const withKeys = (prefix, cells) => cells.map((cell) => ({ ...cell, key: `${prefix}${cell.key}` }));

// class: one frame per member of the layout.
function classFrames({ base }) {
  const n = base.cells.length;
  const cap = base.capacity;
  return [
    { msg: `mData -> the array (${cap} slots)`, state: { ...base, brackets: [{ from: 0, to: cap - 1, label: 'mData' }] }, hl: { active: upTo(n) } },
    { msg: `mSize = ${n}: slots in use`, state: { ...base, brackets: [{ from: 0, to: n - 1, label: `mSize = ${n}` }] }, hl: { compare: upTo(n) } },
    { msg: `mCap = ${cap}: slots allocated`, state: { ...base, brackets: [{ from: 0, to: cap - 1, label: `mCap = ${cap}` }] }, hl: {} },
  ];
}

// typedef T* iterator: an iterator is just a pointer into mData.
function iteratorFrames({ base }) {
  const n = base.cells.length;
  const frames = [];
  for (let at = 0; at <= n; at += 1) {
    frames.push({
      msg: at < n ? `it -> mData[${at}]: *it = ${base.cells[at].value}` : 'it == end(): past the last element',
      state: { ...base, pointers: { begin: 0, it: at, end: n } },
      hl: at < n ? { active: [at] } : { done: keys(n) },
    });
  }
  return frames;
}

// vector(): new T[1](), mSize = 0.
function defaultCtorFrames({ base }) {
  const empty = { ...base, cells: [], capacity: 1, nextKey: 0 };
  return [
    { msg: 'mData = new T[1]()', state: { ...empty, brackets: [{ from: 0, to: 0, label: 'mCap = 1' }] }, hl: {} },
    { msg: 'mSize = 0: empty, but mData is valid', state: { ...empty, pointers: { end: 0 }, brackets: [{ from: 0, to: 0, label: 'mSize = 0' }] }, hl: {} },
  ];
}

// vector(cap): new T[cap](), mSize = cap, every slot T() = 0.
function sizeCtorFrames({ base }) {
  const cap = 4;
  const zeros = Array.from({ length: cap }, (_, i) => ({ key: `z${i}`, value: 0 }));
  const state = { ...base, capacity: cap, nextKey: cap };
  return [
    { msg: `vector(${cap}): mData = new T[${cap}]()`, state: { ...state, cells: [] }, hl: {} },
    { msg: `All ${cap} slots are T() = 0`, state: { ...state, cells: zeros }, hl: { moved: keys(cap) } },
    { msg: `mSize = cap = ${cap}: four real zeros`, state: { ...state, cells: zeros, brackets: [{ from: 0, to: cap - 1, label: `mSize = mCap = ${cap}` }] }, hl: { done: keys(cap) } },
  ];
}

// operator=(vector other): other is a copy; swap the 3 members; other's destructor frees ours.
function assignFrames({ base }) {
  const mine = base;
  const copyCells = [{ key: 'v0', value: 7 }, { key: 'v1', value: 8 }];
  const theirs = withKeys('o', copyCells);
  const other = { ...base, cells: theirs, capacity: 2 };
  const swappedThis = { ...base, cells: theirs, capacity: 2 };
  const swappedOther = { ...base, cells: base.cells.map((c) => ({ ...c, key: `m${c.key}` })), capacity: base.capacity };
  return [
    { msg: 'other is a by-value copy (copy ctor ran)', panels: [{ label: 'this', state: mine }, { label: 'other', state: other }] },
    { msg: 'swap(mSize), swap(mCap), swap(mData)', panels: [{ label: 'this', state: mine, hl: { moved: keys(mine.cells.length) } }, { label: 'other', state: other, hl: { moved: keys(2) } }] },
    { msg: 'this now owns the new array; other holds the old one', panels: [{ label: 'this', state: swappedThis, hl: { done: keys(2) } }, { label: 'other', state: swappedOther, hl: { compare: keys(swappedOther.cells.length) } }] },
    { msg: "return: other's destructor frees the old array", panels: [{ label: 'this', state: swappedThis }, { label: 'other', state: { ...swappedOther, cells: [], capacity: 0 } }] },
  ];
}

// ~vector(): delete[] mData.
function destructorFrames({ base }) {
  const n = base.cells.length;
  return [
    { msg: 'object goes out of scope', state: base, hl: { active: keys(n) } },
    { msg: 'delete[] mData: the array is freed', state: { ...base, cells: [], capacity: 0 }, hl: {} },
  ];
}

// The student's method: it can touch the three protected members.
function extensionFrames({ base }) {
  const n = base.cells.length;
  return [{
    msg: 'Your method works on these members',
    state: { ...base, brackets: [{ from: 0, to: n - 1, label: 'mData, mSize, mCap' }] },
    hl: { active: keys(n) },
  }];
}

export default {
  'copy-ctor': { frames: copyFrames, members: ['mSize', 'mCap'] },
  class: { frames: classFrames, members: ['mData', 'mSize', 'mCap'] },
  'iterator-type': { frames: iteratorFrames, members: ['mSize'] },
  'default-ctor': { frames: defaultCtorFrames, members: ['mSize', 'mCap'] },
  'size-ctor': { frames: sizeCtorFrames, members: ['mSize', 'mCap'] },
  assign: { frames: assignFrames, members: ['mSize', 'mCap', 'mData'] },
  destructor: { frames: destructorFrames, members: ['mData'] },
  extension: { frames: extensionFrames, members: ['mData', 'mSize', 'mCap'] },
  mdata: { show: (s) => ({ hl: { active: upTo(s.cells.length) }, brackets: [{ from: 0, to: s.capacity - 1, label: 'mData' }] }), members: ['mData'] },
    msize: { show: (s) => ({ hl: { compare: upTo(s.cells.length) }, brackets: [{ from: 0, to: s.cells.length - 1, label: `mSize = ${s.cells.length}` }] }), members: ['mSize'] },
    mcap: { show: (s) => ({ brackets: [{ from: 0, to: s.capacity - 1, label: `mCap = ${s.capacity}` }] }), members: ['mCap'] },
    expand: arrayFull,
    'ensure-capacity': arrayFull,
    size: { show: (s) => ({ hl: { compare: upTo(s.cells.length) }, brackets: [{ from: 0, to: s.cells.length - 1, label: `size() = ${s.cells.length}` }] }), members: ['mSize'] },
    capacity: { show: (s) => ({ brackets: [{ from: 0, to: s.capacity - 1, label: `capacity() = ${s.capacity}` }] }), members: ['mCap'] },
    'range-check': { op: 'at' },
    'at-const': { op: 'at' },
    'index-op': { op: 'at' },
    'index-op-const': { op: 'at' },
    begin: { show: () => ({ hl: { active: [0] }, pointers: { begin: 0 } }) },
    end: { show: (s) => ({ pointers: { end: s.cells.length } }), members: ['mSize'] },
};
