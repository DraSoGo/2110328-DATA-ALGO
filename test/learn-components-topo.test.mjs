import test from 'node:test';
import assert from 'node:assert/strict';
import connectedComponents from '../src/learn/algo/connected-components.js';
import topologicalSort from '../src/learn/algo/topological-sort.js';
import { itemsOf, presetGraph, presetsOf, rowOf, runPreset } from './graph-helpers.mjs';

// Reference partition using repeated label merging instead of DFS.
function partitionReference(graph) {
  const label = Object.fromEntries(graph.nodes.map((node) => [node.id, node.id]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const { u, v } of graph.edges) {
      const low = label[u] < label[v] ? label[u] : label[v];
      if (label[u] !== low || label[v] !== low) { label[u] = label[v] = low; changed = true; }
    }
  }
  return label;
}

test('connected components: labels partition the nodes exactly like a reference', () => {
  for (const preset of presetsOf(connectedComponents)) {
    const { frames } = runPreset(connectedComponents, preset.id);
    const cc = rowOf(frames.at(-1), 'cc');
    const ref = partitionReference(presetGraph(preset));
    const ids = preset.nodes.map((node) => node.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = 0; j < ids.length; j += 1) assert.equal(cc[i] === cc[j], ref[ids[i]] === ref[ids[j]], `${preset.id} ${ids[i]}${ids[j]}`);
    }
    assert.ok(cc.every((label) => label >= 1));
    assert.equal(Math.max(...cc), new Set(Object.values(ref)).size);
    assert.ok(frames.length < 2000);
  }
});

test('connected components: numbers follow node order and isolated nodes get their own', () => {
  assert.deepEqual(rowOf(runPreset(connectedComponents, 'three').frames.at(-1), 'cc'), [1, 1, 1, 2, 2, 3, 3, 3]);
  assert.deepEqual(rowOf(runPreset(connectedComponents, 'isolated').frames.at(-1), 'cc'), [1, 1, 1, 2, 2, 3, 4]);
  assert.match(runPreset(connectedComponents, 'isolated').frames.at(-1).msg, /4 connected components/);
});

test('topological sort: result is a valid order of every node on each DAG preset', () => {
  for (const preset of presetsOf(topologicalSort).filter((item) => item.id !== 'cyclic')) {
    const { frames } = runPreset(topologicalSort, preset.id);
    const order = itemsOf(frames.at(-1), 'order');
    assert.equal(order.length, preset.nodes.length);
    assert.deepEqual([...order].sort(), preset.nodes.map((node) => node.id));
    const at = Object.fromEntries(order.map((id, i) => [id, i]));
    for (const [u, v] of preset.edges) assert.ok(at[u] < at[v], `${preset.id}: ${u} before ${v}`);
    assert.equal(frames.at(-1).state.cyclic, undefined);
    assert.ok(frames.length < 2000);
  }
});

test('topological sort: Kahn order is deterministic (queue, node order)', () => {
  assert.deepEqual(itemsOf(runPreset(topologicalSort, 'tasks').frames.at(-1), 'order'), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  assert.deepEqual(itemsOf(runPreset(topologicalSort, 'diamond').frames.at(-1), 'order'), ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('topological sort: a cycle is detected and the stuck nodes are flagged', () => {
  const { frames } = runPreset(topologicalSort, 'cyclic');
  const last = frames.at(-1);
  assert.equal(last.state.cyclic, true);
  assert.deepEqual(itemsOf(last, 'order'), ['A', 'E', 'F']);
  assert.deepEqual(last.hl.bad, ['B', 'C', 'D']);
  assert.match(last.msg, /not a DAG/);
});

test('topological sort: in-degrees are counted before anything is queued', () => {
  const { frames } = runPreset(topologicalSort, 'tasks');
  const counted = frames.find((frame) => frame.msg.startsWith('Count the in-degree'));
  assert.deepEqual(rowOf(counted, 'indeg'), [0, 0, 1, 2, 2, 1, 2, 1]);
  assert.deepEqual(itemsOf(counted, 'queue'), []);
});
