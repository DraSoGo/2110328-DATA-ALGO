// Code-tab figures for priority-queue (see ../figures.js for the format).
import { upTo } from './helpers.js';

const cells = (values, prefix = 'h') => values.map((value, i) => ({ key: `${prefix}${i}`, value }));
const heap = (values, capacity, prefix = 'h') => ({ cells: cells(values, prefix), capacity, limit: 15, nextKey: 9 });
const step = (msg, state, hl = {}) => ({ msg, state, hl });
const VALUES = [9, 5, 7];

function print() {
  const frames = [];
  VALUES.forEach((value, i) => frames.push(step(`cout << mData[${i}] = ${value}`, heap(VALUES, 4), { active: [i], done: upTo(i) })));
  frames.push(step('prints the array order, not sorted order', heap(VALUES, 4), { done: upTo(VALUES.length) }));
  return frames;
}

function copyCtor() {
  const copy = (count) => heap(VALUES.slice(0, count), 4, 'c');
  const frames = [{ msg: 'mData = new T[a.mCap]: a new empty array', panels: [{ label: 'a', state: heap(VALUES, 4) }, { label: 'this', state: copy(0) }] }];
  VALUES.forEach((value, i) => frames.push({ msg: `mData[${i}] = a.mData[${i}] = ${value}`, panels: [{ label: 'a', state: heap(VALUES, 4), hl: { compare: [i] } }, { label: 'this', state: copy(i + 1), hl: { active: [i] } }] }));
  frames.push({ msg: 'mCap, mSize, mLess copied too', panels: [{ label: 'a', state: heap(VALUES, 4) }, { label: 'this', state: copy(VALUES.length), hl: { done: upTo(VALUES.length) } }] });
  return frames;
}

function assignOp() {
  const mine = [3, 2];
  const panels = (left, right, lhl = {}, rhl = {}) => [{ label: 'this', state: left, hl: lhl }, { label: 'other', state: right, hl: rhl }];
  const a = heap(mine, 2, 't');
  const b = heap(VALUES, 4, 'o');
  return [
    { msg: 'other is a copy of the argument (pass by value)', panels: panels(a, b, {}, { active: [0] }) },
    { msg: 'swap mSize, mCap, mData, mLess', panels: panels(b, a, { done: upTo(3) }, { compare: upTo(2) }) },
    { msg: 'end of scope: other (the old array) is destroyed', panels: panels(b, heap([], 0, 't'), {}, {}) },
  ];
}


export default {
  'template-header': { show: () => ({ hl: { active: [0], compare: [1, 2] } }), members: ['top()'] },
  class: { show: (s) => ({ hl: { active: [0], compare: upTo(s.cells.length).slice(1) } }), members: ['mData', 'mSize', 'mCap', 'top()'] },
  print: { frames: print, members: ['mData'] },
  'copy-ctor': { frames: copyCtor, members: ['mSize', 'mCap'] },
  'default-ctor': { frames: () => [step('new T[1](): one spare slot, mCap = 1, mSize = 0', heap([], 1))], members: ['mSize', 'mCap'] },
  'assign-op': { frames: assignOp, members: ['mSize', 'mCap'] },
  destructor: { frames: ({ base }) => [step('delete [] mData', base, { compare: upTo(base.cells.length) }), step('the array is freed', heap([], 0))], members: ['mSize', 'mCap'] },
  empty: { frames: ({ base }) => [step('mSize == 0 ? false', base, { compare: upTo(base.cells.length) }), step('mSize == 0 ? true', heap([], 4))], members: ['mSize'] },
  'm-data': { show: (s) => ({ hl: { active: upTo(s.cells.length) } }), members: ['mData'] },
    'm-size': { show: (s) => ({ hl: { compare: upTo(s.cells.length) } }), members: ['mSize'] },
    'm-cap': { show: () => ({}), members: ['mCap', 'mSize'] },
    'm-less': { show: () => ({ hl: { active: [0] } }), members: ['top()'] },
    expand: { op: 'push', prep: [['push', { x: 4 }]], args: { x: 8 } },
    size: { show: (s) => ({ hl: { compare: upTo(s.cells.length) } }), members: ['mSize'] },
};
