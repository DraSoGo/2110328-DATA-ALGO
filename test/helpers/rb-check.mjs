// Shared checks for the red-black tree modules (set, map). Not a test file by itself.
import assert from 'node:assert/strict';
import { record } from '../../src/learn/engine/recorder.js';
import { LIMIT, MAX_DEPTH } from '../../src/learn/data/rbtree.js';
import { layoutTree } from '../../src/learn/render/tree.js';

export const byKey = (state) => new Map(state.nodes.map((n) => [n.key, n]));
export const keyOf = (state, k) => state.nodes.find((n) => n.k === k)?.key;

export const inorder = (state) => {
  const map = byKey(state);
  const out = [];
  const walk = (key) => {
    if (key === null) return;
    walk(map.get(key).left);
    out.push(map.get(key));
    walk(map.get(key).right);
  };
  walk(state.root);
  return out;
};
export const keys = (state) => inorder(state).map((n) => n.k);

// BST order, no orphans, labels, root black, no red-red, equal black height on every root-to-null path.
export function assertRedBlack(state) {
  const map = byKey(state);
  assert.equal(map.size, state.nodes.length, 'unique node keys');
  if (state.root !== null) assert.equal(map.get(state.root).color, 'black', 'root is black');
  let reached = 0;
  const walk = (key, lo, hi) => {
    if (key === null) return 1;
    reached += 1;
    const node = map.get(key);
    assert.ok(node.k > lo && node.k < hi, `order at ${node.k}`);
    assert.equal(node.label, state.mapped ? `${node.k}:${node.v}` : node.k, 'label');
    assert.ok(['red', 'black'].includes(node.color));
    if (node.color === 'red') {
      for (const child of [node.left, node.right]) assert.ok(child === null || map.get(child).color === 'black', `red ${node.k} has a red child`);
    }
    const bl = walk(node.left, lo, node.k);
    const br = walk(node.right, node.k, hi);
    assert.equal(bl, br, `black height differs below ${node.k}`);
    return bl + (node.color === 'black' ? 1 : 0);
  };
  walk(state.root, -Infinity, Infinity);
  assert.equal(reached, state.nodes.length, 'no orphan nodes');
  assert.ok(state.nodes.length <= LIMIT);
}

export function assertFrames(frames) {
  assert.ok(frames.length >= 1 && frames.length < 2000);
  for (const frame of frames) {
    assert.ok(frame.msg);
    assert.equal(frame.line, 0);
    const ids = frame.state.nodes.map((n) => n.key);
    assert.equal(new Set(ids).size, ids.length, 'unique keys in every frame');
    assert.ok(layoutTree(frame.state).depth <= MAX_DEPTH, `depth within ${MAX_DEPTH}: ${frame.msg}`);
    assert.equal(Object.keys(frame.state.pointers).length, 4, 'pointer rows stay fixed');
  }
}

// Runs a generator from rbtree.js (or a module op) on a clone and checks every frame.
export function runGen(makeGen, state) {
  const copy = structuredClone(state);
  const frames = record(makeGen(copy));
  assertFrames(frames);
  return { frames, state: frames.at(-1).state, text: frames.map((f) => f.msg).join('\n') };
}

export const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
