// Code-tab figures for pair (see ../figures.js for the format).
import { upTo } from './helpers.js';

const one = (base, cell, key = cell.key) => ({ ...base, cells: [{ ...cell, key }], capacity: 1, nextKey: 1 });
const cellOf = (key, pair) => ({ key, value: `(${pair[0]}, ${pair[1]})`, pair });

// Show a pair with a bracket over one or both members.
function fieldFrames(which) {
  return ({ base }) => {
    const cell = base.cells[0];
    const hl = { active: [0] };
    const label = which === 'first' ? `first = ${cell.pair[0]}` : `second = ${cell.pair[1]}`;
    return [
      { msg: `p = ${cell.value}`, state: one(base, cell), hl: {} },
      { msg: label, state: { ...one(base, cell), brackets: [{ from: 0, to: 0, label }] }, hl },
    ];
  };
}

function classFrames({ base }) {
  const cell = base.cells[0];
  return [{ msg: 'A pair is two members: first and second', state: { ...one(base, cell), brackets: [{ from: 0, to: 0, label: `first = ${cell.pair[0]}, second = ${cell.pair[1]}` }] }, hl: { active: [0] } }];
}

function defaultCtorFrames({ base }) {
  return [
    { msg: 'pair() : first(), second()', state: { ...base, cells: [], capacity: 1, nextKey: 0 }, hl: {} },
    { msg: 'Both members are T(): (0, 0)', state: one(base, cellOf('n0', [0, 0])), hl: { moved: [0] } },
  ];
}

function ctorFrames({ base }) {
  const src = base.cells[0];
  return [
    { msg: 'pair(3, 1): arguments a = 3, b = 1', state: { ...base, cells: [], capacity: 1, nextKey: 0 }, hl: {} },
    { msg: 'first(a), second(b): copy into the members', state: one(base, cellOf('n0', src.pair)), hl: { moved: [0] } },
  ];
}

// Two single-pair panels with a message; used for the forbidden operators.
function forbidden(symbol) {
  return ({ base }) => {
    const a = base.cells[0];
    const b = base.cells[2];
    const panels = (hl, extra = {}) => [
      { label: 'a', state: one(base, a, `a${a.key}`), hl },
      { label: 'b', state: one(base, b, `b${b.key}`), hl, ...extra },
    ];
    return [
      { msg: `a ${symbol} b on two CP::pair`, panels: panels({ compare: [0] }) },
      { msg: `"You cannot call operator${symbol}" and assert(false)`, panels: panels({ swap: [0] }) },
      { msg: 'Compare a.first, b.first (then second) by hand', panels: panels({ active: [0] }) },
    ];
  };
}

export default {
  class: { frames: classFrames },
  first: { frames: fieldFrames('first') },
  second: { frames: fieldFrames('second') },
  'default-ctor': { frames: defaultCtorFrames },
  ctor: { frames: ctorFrames },
  eq: { frames: forbidden('==') },
  lt: { frames: forbidden('<') },
  'gte-hook': { op: 'compare', args: { i: 0, j: 2 } },
};
