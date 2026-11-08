import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import traversal from '../src/learn/algo/tree-traversal.js';
import { renderTree } from '../src/learn/render/tree.js';

// Independent reference: a plain object tree and textbook traversals.
function reference(values) {
  let root = null;
  const insert = (node, v) => {
    if (!node) return { v, l: null, r: null };
    if (v < node.v) node.l = insert(node.l, v);
    else if (v > node.v) node.r = insert(node.r, v);
    return node;
  };
  for (const v of values) root = insert(root, v);
  const pre = (n) => (n ? [n.v, ...pre(n.l), ...pre(n.r)] : []);
  const ino = (n) => (n ? [...ino(n.l), n.v, ...ino(n.r)] : []);
  const post = (n) => (n ? [...post(n.l), ...post(n.r), n.v] : []);
  const level = (n) => {
    const out = [];
    for (let row = [n]; row.length; row = row.flatMap((x) => [x.l, x.r].filter(Boolean))) out.push(...row.map((x) => x.v));
    return out;
  };
  return [pre(root), ino(root), post(root), level(root)];
}
const frames = (values, order) => record(traversal.run({ values, order }));
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

test('all four orders match an independent computation, fixed and random inputs', () => {
  const next = rng(11);
  const inputs = [[40, 20, 60, 10, 30, 50, 70], [5], [1, 2, 3, 4, 5], [9, 3, 3, 9, 1], ...Array.from({ length: 25 }, () => Array.from({ length: 1 + Math.floor(next() * 15) }, () => Math.floor(next() * 40) - 20))];
  for (const values of inputs) {
    const expected = reference(values);
    for (let order = 0; order < 4; order += 1) {
      const fs = frames(values, order);
      assert.deepEqual(fs.at(-1).vars.out, expected[order], `${values} order ${order}`);
    }
  }
});

test('inorder of a BST is sorted; visit badges number the nodes 1..n in output order', () => {
  const values = [8, 3, 10, 1, 6, 14, 4, 7, 13];
  const last = frames(values, 1).at(-1);
  assert.deepEqual(last.vars.out, [...values].sort((a, b) => a - b));
  const byBadge = [...last.state.nodes].sort((a, b) => Number(a.badge) - Number(b.badge)).map((n) => n.label);
  assert.deepEqual(byBadge, last.vars.out);
  assert.equal(last.state.nodes.length, 9);
});

test('the default input is the 7 node tree with inorder selected', () => {
  const [field0, field1] = traversal.input.fields;
  assert.equal(field1.default, 1);
  assert.deepEqual(frames(field0.default, field1.default).at(-1).vars.out, [10, 20, 30, 40, 50, 60, 70]);
});

test('recursive frames point into the selected function and show the call stack', () => {
  const pre = frames([2, 1, 3], 0);
  assert.equal(pre[1].line, 1); // preorder(2) is called
  assert.ok(pre.some((f) => f.line === 3 && /Print 2/.test(f.msg)));
  assert.ok(pre.some((f) => f.line === 2 && /nullptr/.test(f.msg)));
  const post = frames([2, 1, 3], 2);
  assert.ok(post.some((f) => f.line === 17 && /Print 1/.test(f.msg)));
  // inside the left call of 2 the root is on the call stack (compare) and 1 is active
  const inside = pre.find((f) => /preorder\(1\) is called/.test(f.msg));
  assert.deepEqual(inside.hl.compare, ['t0']);
  assert.deepEqual(inside.hl.active, ['t1']);
  assert.equal(pre.at(-1).line, 6);
  assert.equal(frames([2, 1, 3], 1).at(-1).line, 12);
  assert.equal(post.at(-1).line, 18);
});

test('level order uses the queue lines and reports the queue contents', () => {
  const fs = frames([2, 1, 3], 3);
  assert.deepEqual(fs.filter((f) => f.line === 23).map((f) => f.vars.n), [2, 1, 3]);
  assert.deepEqual(fs.find((f) => f.line === 21).vars.q, [2]);
  assert.deepEqual(fs.filter((f) => f.line === 25 && /Push the left/.test(f.msg)).map((f) => f.vars.q), [[1]]);
  assert.equal(fs.at(-1).line, 28);
  assert.deepEqual(fs.at(-1).vars.q, []);
});

test('viewBox is fixed across a run and frames stay well under the limit even for a chain', () => {
  const chain = Array.from({ length: 15 }, (_, i) => i);
  for (const values of [chain, [40, 20, 60, 10, 30, 50, 70]]) {
    for (let order = 0; order < 4; order += 1) {
      const fs = frames(values, order);
      assert.ok(fs.length < 300, `${fs.length} frames`);
      const boxes = new Set(fs.map((f) => renderTree(f.state, f.hl).match(/viewBox="([^"]+)"/)[1]));
      assert.equal(boxes.size, 1);
      for (const f of fs) assert.ok(f.line >= 0 && f.line < traversal.code.length);
    }
  }
});
