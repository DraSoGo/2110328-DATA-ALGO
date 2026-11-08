import test from 'node:test';
import assert from 'node:assert/strict';
import bfs from '../src/learn/algo/bfs.js';
import dfs from '../src/learn/algo/dfs.js';
import { bfsReference, dfsReference, itemsOf, presetGraph, presetsOf, rowOf, runPreset } from './graph-helpers.mjs';

test('bfs: discovery order and levels match an independent BFS on every preset and start', () => {
  for (const preset of presetsOf(bfs)) {
    for (const start of preset.nodes.map((node) => node.id)) {
      const { frames } = runPreset(bfs, preset.id, { start });
      const last = frames.at(-1);
      const ref = bfsReference(presetGraph(preset), start);
      assert.deepEqual(itemsOf(last, 'order'), ref.order, `${preset.id}/${start} order`);
      const levels = Object.fromEntries(preset.nodes.map((node, i) => [node.id, rowOf(last, 'dist')[i]]));
      for (const node of preset.nodes) assert.equal(levels[node.id], ref.level[node.id] ?? -1, `${preset.id}/${start}/${node.id}`);
      assert.ok(frames.length < 2000);
    }
  }
});

test('bfs: queue never exceeds its panel, unreachable nodes stay -1 and are reported', () => {
  const { frames } = runPreset(bfs, 'split', { start: 'A' });
  for (const frame of frames) assert.ok(itemsOf(frame, 'queue').length <= 8);
  assert.deepEqual(rowOf(frames.at(-1), 'dist'), [0, 1, 1, 2, -1, -1, -1, -1]);
  assert.match(frames.at(-1).msg, /unreachable/);
  assert.deepEqual(frames.at(-1).hl.done, ['A', 'B', 'C', 'D']);
});

test('bfs: the queue is FIFO and the tree edges form a tree on the reached nodes', () => {
  const { frames } = runPreset(bfs, 'tree-cycle', { start: 'A' });
  const pops = frames.filter((frame) => frame.msg.startsWith('Pop ')).map((frame) => frame.msg.split(' ')[1]);
  assert.deepEqual(pops, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.equal(frames.at(-1).hl.edgeTree.length, 6);
});

test('dfs: visit order matches an independent recursive DFS on every preset and start', () => {
  for (const preset of presetsOf(dfs)) {
    for (const start of preset.nodes.map((node) => node.id)) {
      const { frames } = runPreset(dfs, preset.id, { start });
      assert.deepEqual(itemsOf(frames.at(-1), 'order'), dfsReference(presetGraph(preset), start), `${preset.id}/${start}`);
      assert.ok(frames.length < 2000);
    }
  }
});

test('dfs: recursion stack grows and shrinks, from[] records the parent, unreachable noted', () => {
  const { frames } = runPreset(dfs, 'tree-cycle', { start: 'A' });
  const depth = frames.map((frame) => itemsOf(frame, 'stack').length);
  assert.equal(Math.max(...depth), 6);
  assert.equal(depth.at(-1), 0);
  assert.equal(frames.some((frame) => frame.line === dfs.code.length - 1 && frame.msg.startsWith('dfs(')), true);
  assert.deepEqual(rowOf(frames.at(-1), 'from'), ['-1', 'A', 'F', 'B', 'B', 'G', 'E']);
  const split = runPreset(dfs, 'split', { start: 'A' }).frames.at(-1);
  assert.match(split.msg, /unreachable/);
});
