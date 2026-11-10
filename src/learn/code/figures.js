// What the Code tab draws for a clicked region, so the popover shows a picture
// instead of text. Each header has its own file in ./figures/. A figure is one of:
//
//   { op, args?, prep? }
//       animate a Learning op (prep: [[op, args], ...] run silently first).
//   { show(state) -> { hl?, brackets?, pointers? }, members?, prep? }
//       one still picture of the module's preset (after prep).
//   { frames(ctx) -> Frame[], members?, prep? }
//       a scripted animation. ctx = { module, base, clone, run(op, args, state?) -> recorded
//       frames, after(op, args, state?) -> final state }. Each Frame is
//         { msg, state, hl? }                       one picture with the module's renderer, or
//         { msg, panels: [{ label?, renderer?, state, hl? }] }   several pictures side by side
//       (e.g. source `a` and the new copy `this`). renderer defaults to the module's.
//       Pointers are drawn with the renderer's own `pointers` field ({ name: index | key }).
//
// `members` names rows of the Members panel (src/learn/internals.js) shown as value chips,
// read from the first panel's state of each frame.
// Regions without an entry fall back to their own `op`, then to a plain still for
// fields, then to text only.

import list from './figures/list.js';
import mapAvl from './figures/map-avl.js';
import mapBst from './figures/map-bst.js';
import priorityQueue from './figures/priority-queue.js';
import queue from './figures/queue.js';
import stack from './figures/stack.js';
import unorderedMap from './figures/unordered-map.js';
import vector from './figures/vector.js';

export const FIGURES = {
  vector,
  list,
  stack,
  queue,
  'priority-queue': priorityQueue,
  'map-bst': mapBst,
  'map-avl': mapAvl,
  'unordered-map': unorderedMap,
};

// The figure to draw for a region, or null for text only.
export function figureFor(headerId, region) {
  const own = FIGURES[headerId]?.[region.id];
  if (own) return own;
  if (region.op) return { op: region.op };
  if (region.kind === 'field') return { show: () => ({}) };
  return null;
}
