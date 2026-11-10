// Code-tab figures for stack (see ../figures.js for the format).
import { upTo } from './helpers.js';

const withKeys = (prefix, cells) => cells.map((cell) => ({ ...cell, key: `${prefix}${cell.key}` }));
const topOf = (state) => ({ ...state, pointers: { top: state.cells.length - 1 } });
const other = (base) => topOf({ ...base, cells: [{ key: 'o0', value: 7 }, { key: 'o1', value: 8 }], capacity: 2 });

function classFrames({ base }) {
  const n = base.cells.length;
  return [
    { msg: `mData: the array of ${base.capacity} slots`, state: base, hl: { active: upTo(n) } },
    { msg: `mSize = ${n}: top() is mData[${n - 1}]`, state: base, hl: { compare: upTo(n - 1), done: [n - 1] } },
    { msg: `mCap = ${base.capacity}: slots allocated`, state: base, hl: {} },
  ];
}

// stack(const stack& a): new T[a.mCap](), copy a.size() elements.
function copyFrames({ base }) {
  const n = base.cells.length;
  const copy = (count) => topOf({ ...base, cells: withKeys('c', base.cells.slice(0, count)) });
  const frames = [{ msg: `mData = new T[a.mCap]: ${base.capacity} empty slots`, panels: [{ label: 'a', state: base }, { label: 'this', state: copy(0) }] }];
  for (let i = 0; i < n; i += 1) {
    frames.push({
      msg: `mData[${i}] = a.mData[${i}] = ${base.cells[i].value}`,
      panels: [{ label: 'a', state: base, hl: { compare: [i] } }, { label: 'this', state: copy(i + 1), hl: { active: [i] } }],
    });
  }
  frames.push({ msg: `mSize = ${n}: an independent copy`, panels: [{ label: 'a', state: base }, { label: 'this', state: copy(n), hl: { done: upTo(n) } }] });
  return frames;
}

// stack(): cap = 1, mSize = 0.
function defaultCtorFrames({ base }) {
  const empty = { ...base, cells: [], capacity: 1, nextKey: 0, pointers: { top: -1 } };
  return [
    { msg: 'mData = new T[1](), mCap = 1', state: empty, hl: {} },
    { msg: 'mSize = 0: empty (top is below slot 0)', state: empty, hl: { compare: [0] } },
  ];
}

// operator=(stack& other): swap the three members with the real other.
function assignFrames({ base }) {
  const mine = base;
  const theirs = other(base);
  const swappedThis = theirs;
  const swappedOther = topOf({ ...base, cells: withKeys('m', base.cells) });
  return [
    { msg: 'this = other', panels: [{ label: 'this', state: mine }, { label: 'other', state: theirs }] },
    { msg: 'swap(mSize), swap(mCap), swap(mData)', panels: [{ label: 'this', state: mine, hl: { moved: upTo(mine.cells.length) } }, { label: 'other', state: theirs, hl: { moved: upTo(2) } }] },
    { msg: 'The two stacks traded their arrays', panels: [{ label: 'this', state: swappedThis, hl: { done: upTo(2) } }, { label: 'other', state: swappedOther, hl: { done: upTo(base.cells.length) } }] },
  ];
}

function destructorFrames({ base }) {
  return [
    { msg: 'object goes out of scope', state: base, hl: { active: upTo(base.cells.length) } },
    { msg: 'delete[] mData: the array is freed', state: { ...base, cells: [], capacity: 0, pointers: { top: -1 } }, hl: {} },
  ];
}

// print(): i walks mData[0..mSize-1], bottom to top.
function printFrames({ base }) {
  const n = base.cells.length;
  const frames = [{ msg: `Stack size = ${n} Data =`, state: { ...base, pointers: { i: -1 } }, hl: {} }];
  for (let i = 0; i < n; i += 1) {
    const out = base.cells.slice(0, i + 1).map((cell) => cell.value).join(' ');
    frames.push({ msg: `Data = ${out}`, state: { ...base, pointers: { i } }, hl: { active: [i], done: upTo(i) } });
  }
  return frames;
}

function extensionFrames({ base }) {
  return [{ msg: 'Your method works on mData, mSize, mCap', state: base, hl: { active: upTo(base.cells.length) } }];
}

export default {
  class: { frames: classFrames, members: ['mData', 'mSize', 'mCap'] },
  'copy-ctor': { frames: copyFrames, members: ['mSize', 'mCap'] },
  'default-ctor': { frames: defaultCtorFrames, members: ['mSize', 'mCap'] },
  assign: { frames: assignFrames, members: ['mSize', 'mCap', 'mData'] },
  destructor: { frames: destructorFrames, members: ['mData'] },
  print: { frames: printFrames, members: ['mSize'] },
  extension: { frames: extensionFrames, members: ['mData', 'mSize', 'mCap'] },
  mdata: { show: (s) => ({ hl: { active: upTo(s.cells.length) } }), members: ['mData', 'mCap'] },
    msize: { show: (s) => ({ hl: { compare: upTo(s.cells.length) } }), members: ['mSize', 'top()'] },
    mcap: { show: () => ({}), members: ['mCap', 'mSize'] },
    expand: { op: 'push', prep: [['push', { x: 40 }]], args: { x: 50 } },
    'ensure-capacity': { op: 'push', prep: [['push', { x: 40 }]], args: { x: 50 } },
    size: { show: (s) => ({ hl: { compare: upTo(s.cells.length) } }), members: ['mSize'] },
};
