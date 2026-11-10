// Code-tab figures for queue (see ../figures.js for the format).
import { upTo } from './helpers.js';

const withKeys = (prefix, cells) => cells.map((cell) => (cell ? { ...cell, key: `${prefix}${cell.key}` } : null));
const pos = (state) => upTo(state.size).map((k) => (state.front + k) % state.capacity);
const small = (base) => ({ ...base, cells: [{ key: 'o0', value: 7 }, { key: 'o1', value: 8 }], capacity: 2, front: 0, size: 2, pointers: { front: 0, back: 1 } });

function classFrames({ base }) {
  const used = pos(base);
  return [
    { msg: `mData: the buffer of ${base.capacity} slots`, state: base, hl: { active: used } },
    { msg: `mFront = ${base.front}: slot of the first element`, state: base, hl: { compare: [base.front] } },
    { msg: `mSize = ${base.size}: elements counted from mFront`, state: base, hl: { compare: used } },
    { msg: `mCap = ${base.capacity}: the buffer length`, state: { ...base, brackets: [{ from: 0, to: base.capacity - 1, label: `mCap = ${base.capacity}` }] }, hl: {} },
  ];
}

// queue(const queue& a): new T[a.mCap](); copy ALL mCap slots; mFront = a.mFront.
function copyFrames({ base }) {
  const cap = base.capacity;
  const copy = (count, withFront) => ({
    ...base,
    cells: base.cells.map((cell, i) => (cell && i < count ? { ...cell, key: `c${cell.key}` } : null)),
    pointers: withFront ? { front: base.front, back: base.pointers.back } : { front: null, back: null },
  });
  const frames = [{ msg: `mData = new T[a.mCap]: ${cap} empty slots`, panels: [{ label: 'a', state: base }, { label: 'this', state: copy(0, false) }] }];
  for (let i = 0; i < cap; i += 1) {
    frames.push({
      msg: base.cells[i] ? `mData[${i}] = a.mData[${i}] = ${base.cells[i].value}` : `mData[${i}] = a.mData[${i}]: spare slot`,
      panels: [{ label: 'a', state: base, hl: { compare: [i] } }, { label: 'this', state: copy(i + 1, false), hl: { active: [i] } }],
    });
  }
  frames.push({ msg: `mFront = a.mFront = ${base.front}, mSize = ${base.size}`, panels: [{ label: 'a', state: base }, { label: 'this', state: copy(cap, true), hl: { done: pos(base) } }] });
  return frames;
}

function defaultCtorFrames({ base }) {
  const empty = { ...base, cells: [null], capacity: 1, front: 0, size: 0, nextKey: 0 };
  return [
    { msg: 'mData = new T[1](), mCap = 1', state: { ...empty, pointers: { front: null, back: null } }, hl: {} },
    { msg: 'mSize = 0, mFront = 0: empty', state: { ...empty, pointers: { front: 0, back: null } }, hl: { compare: [0] } },
  ];
}

// operator=(queue other): other is a by-value copy; swap all four members.
function assignFrames({ base }) {
  const theirs = withKeys('o', small(base).cells);
  const other = { ...small(base), cells: theirs };
  const swappedOther = { ...base, cells: withKeys('m', base.cells) };
  return [
    { msg: 'other is a by-value copy (copy ctor ran)', panels: [{ label: 'this', state: base }, { label: 'other', state: other }] },
    { msg: 'swap mSize, mCap, mData, mFront', panels: [{ label: 'this', state: base, hl: { moved: pos(base) } }, { label: 'other', state: other, hl: { moved: pos(other) } }] },
    { msg: 'this owns the new buffer; other holds the old one', panels: [{ label: 'this', state: other, hl: { done: pos(other) } }, { label: 'other', state: swappedOther, hl: { compare: pos(base) } }] },
    { msg: "return: other's destructor frees the old buffer", panels: [{ label: 'this', state: other }, { label: 'other', state: { ...swappedOther, cells: [], capacity: 0, size: 0, pointers: { front: null, back: null } } }] },
  ];
}

function destructorFrames({ base }) {
  return [
    { msg: 'object goes out of scope', state: base, hl: { active: pos(base) } },
    { msg: 'delete[] mData: the buffer is freed', state: { ...base, cells: [], capacity: 0, size: 0, pointers: { front: null, back: null } }, hl: {} },
  ];
}

// print(): slot (mFront + i) % mCap, so the walk wraps around the buffer.
function printFrames({ base }) {
  const cap = base.capacity;
  const frames = [];
  const seen = [];
  for (let i = 0; i < base.size; i += 1) {
    const at = (base.front + i) % cap;
    seen.push(at);
    frames.push({
      msg: `i = ${i}: (${base.front} + ${i}) % ${cap} = slot ${at}, prints ${base.cells[at].value}`,
      state: { ...base, pointers: { front: base.front, i: at } },
      hl: { active: [at], done: seen.slice(0, -1) },
    });
  }
  return frames;
}

function extensionFrames({ base }) {
  return [{ msg: 'Your method works on mData, mFront, mSize, mCap', state: base, hl: { active: pos(base) } }];
}

export default {
  class: { frames: classFrames, members: ['mData', 'mFront', 'mSize', 'mCap'] },
  'copy-ctor': { frames: copyFrames, members: ['mFront', 'mSize', 'mCap'] },
  'default-ctor': { frames: defaultCtorFrames, members: ['mFront', 'mSize', 'mCap'] },
  assign: { frames: assignFrames, members: ['mFront', 'mSize', 'mCap', 'mData'] },
  destructor: { frames: destructorFrames, members: ['mData'] },
  print: { frames: printFrames, members: ['mFront', 'mSize'], prep: [['push', { x: 40 }]] },
  extension: { frames: extensionFrames, members: ['mData', 'mFront', 'mSize', 'mCap'] },
  mdata: { show: (s) => ({ hl: { active: upTo(s.capacity).filter((i) => s.cells[i]) }, brackets: [{ from: 0, to: s.capacity - 1, label: 'mData' }] }), members: ['mData'] },
    msize: { show: (s) => ({ hl: { compare: upTo(s.size).map((k) => (s.front + k) % s.capacity) } }), members: ['mSize'] },
    mcap: { show: (s) => ({ brackets: [{ from: 0, to: s.capacity - 1, label: `mCap = ${s.capacity}` }] }), members: ['mCap'] },
    mfront: { show: (s) => ({ hl: { compare: [s.front] } }), members: ['mFront', 'back slot'] },
    expand: { op: 'push', prep: [['push', { x: 40 }]], args: { x: 50 } },
    'ensure-capacity': { op: 'push', prep: [['push', { x: 40 }]], args: { x: 50 } },
    size: { show: (s) => ({ hl: { compare: upTo(s.size).map((k) => (s.front + k) % s.capacity) } }), members: ['mSize'] },
    empty: { show: () => ({}), members: ['mSize'] },
};
