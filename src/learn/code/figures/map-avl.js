// Code-tab figures for map-avl (see ../figures.js for the format).
import { allKeys } from './helpers.js';
import { subscriptFrames, treeFigures } from './map-bst.js';

const withPtr = (s, pointers) => ({ ...s, pointers });

// node::set_left / set_right: this->side = n, then n->parent = this.
function setFrames(side) {
  return ({ base }) => {
    const child = side === 'left' ? 'b' : 'c';
    const open = { ...base, nodes: base.nodes.map((n) => (n.key === 'a' ? { ...n, [side]: null } : n)) };
    const sub = { ...base, root: child };
    return [
      { msg: `n is a subtree, this has no ${side} child`, panels: [{ label: 'this', state: withPtr(open, { this: 'a', n: null }), hl: { active: ['a'] } }, { label: 'n', state: withPtr(sub, { this: null, n: child }), hl: { compare: [child] } }] },
      { msg: `this->${side} = n`, state: withPtr(base, { this: 'a', n: child }), hl: { active: ['a'], compare: [child] } },
      { msg: 'n->parent = this', state: withPtr(base, { this: 'a', n: child }), hl: { done: ['a', child] } },
    ];
  };
}

export default {
  'm-root': { show: (s) => ({ hl: { active: [s.root] } }), members: ['mRoot', 'mRoot->height'] },
  'm-size': { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mSize'] },
  'get-height': { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mRoot->height'] },
  'set-height': { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mRoot->height'] },
  'balance-value': { show: (s) => ({ hl: { compare: allKeys(s) } }) },
  'rotate-left': { op: 'insert' },
  'rotate-right': { op: 'insert' },
  rebalance: { op: 'insert' },
  'find-min': { op: 'begin' },
  'delete-all': { op: 'clear' },
  dtor: { op: 'clear' },
  ...treeFigures(),
  size: { show: (s) => ({ hl: { compare: allKeys(s) } }), members: ['mSize'] },
  'set-left': { frames: setFrames('left') },
  'set-right': { frames: setFrames('right') },
  subscript: { frames: subscriptFrames(30, 25) },
};
