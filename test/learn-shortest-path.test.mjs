import test from 'node:test';
import assert from 'node:assert/strict';
import bellmanFord from '../src/learn/algo/bellman-ford.js';
import dijkstra from '../src/learn/algo/dijkstra.js';
import floydWarshall from '../src/learn/algo/floyd-warshall.js';
import { distancesReference, hasNegativeCycleReference, panelOf, presetGraph, presetsOf, rowOf, runPreset } from './graph-helpers.mjs';

const asNumbers = (cells) => cells.map((cell) => (cell === '∞' ? Infinity : Number(cell)));
const expectedRow = (graph, start) => graph.nodes.map((node) => distancesReference(graph, start)[node.id]);

test('dijkstra distances equal an independent computation for every preset and start', () => {
  for (const preset of presetsOf(dijkstra)) {
    const graph = presetGraph(preset);
    for (const { id: start } of preset.nodes) {
      const { frames } = runPreset(dijkstra, preset.id, { start });
      assert.deepEqual(asNumbers(rowOf(frames.at(-1), 'dist')), expectedRow(graph, start), `${preset.id} from ${start}`);
      assert.ok(frames.length < 2000);
    }
  }
});

test('dijkstra: classic road example, shortest-path tree, queue panel never overflows', () => {
  const { frames } = runPreset(dijkstra, 'roads', { start: 'A' });
  const last = frames.at(-1);
  assert.deepEqual(asNumbers(rowOf(last, 'dist')), [0, 7, 9, 20, 20, 11]);
  assert.deepEqual(rowOf(last, 'dist', 1).length, 6);
  assert.deepEqual(panelOf(last, 'dist').rows[1].cells, ['-1', 'A', 'A', 'C', 'F', 'C']);
  assert.equal(last.hl.edgeTree.length, 5);
  for (const frame of frames) assert.ok(panelOf(frame, 'pq').items.length <= 6);
  // nodes leave the queue in order of distance
  const settled = frames.filter((frame) => frame.msg.includes('is final')).map((frame) => Number(frame.msg.match(/T = (\d+)/)[1]));
  assert.deepEqual(settled, [...settled].sort((a, b) => a - b));
});

test('dijkstra: unreachable nodes keep infinity and are reported', () => {
  const last = runPreset(dijkstra, 'unreachable', { start: 'A' }).frames.at(-1);
  assert.deepEqual(asNumbers(rowOf(last, 'dist')), [0, 3, 4, 8, Infinity, Infinity]);
  assert.match(last.msg, /E, F cannot be reached/);
  assert.equal(rowOf(last, 'dist')[4], '∞');
});

test('bellman-ford distances equal an independent computation on graphs without a negative cycle', () => {
  for (const preset of presetsOf(bellmanFord).filter((item) => item.id !== 'neg-cycle')) {
    const graph = presetGraph(preset);
    for (const { id: start } of preset.nodes) {
      const { frames } = runPreset(bellmanFord, preset.id, { start });
      const last = frames.at(-1);
      assert.equal(last.state.negativeCycle, false, `${preset.id} from ${start}`);
      assert.deepEqual(asNumbers(rowOf(last, 'dist')), expectedRow(graph, start), `${preset.id} from ${start}`);
      assert.ok(frames.length < 2000);
    }
  }
});

test('bellman-ford handles the textbook negative edges', () => {
  const last = runPreset(bellmanFord, 'neg-edge', { start: 'A' }).frames.at(-1);
  assert.deepEqual(asNumbers(rowOf(last, 'dist')), [0, 2, 4, 7, -2]);
  assert.match(last.msg, /shortest distances/);
  const lost = runPreset(bellmanFord, 'unreachable', { start: 'A' }).frames.at(-1);
  assert.deepEqual(asNumbers(rowOf(lost, 'dist')), [0, 3, 1, 5, Infinity, Infinity]);
  assert.match(lost.msg, /E, F cannot be reached/);
});

test('bellman-ford detects a negative cycle when (and only when) one is reachable', () => {
  for (const preset of presetsOf(bellmanFord)) {
    const graph = presetGraph(preset);
    for (const { id: start } of preset.nodes) {
      const last = runPreset(bellmanFord, preset.id, { start }).frames.at(-1);
      assert.equal(last.state.negativeCycle, hasNegativeCycleReference(graph, start), `${preset.id} from ${start}`);
    }
  }
  const last = runPreset(bellmanFord, 'neg-cycle', { start: 'A' }).frames.at(-1);
  assert.equal(last.state.negativeCycle, true);
  assert.deepEqual([...last.hl.bad].sort(), ['B', 'C', 'D']);
  assert.equal(last.hl.edgeBad.length, 3);
  assert.match(last.msg, /negative cycle/i);
  assert.deepEqual([...last.state.cycle].sort(), ['B', 'C', 'D']);
});

test('bellman-ford: a negative cycle that the start cannot reach is not reported', () => {
  const last = runPreset(bellmanFord, 'neg-cycle', { start: 'E' }).frames.at(-1);
  assert.equal(last.state.negativeCycle, false);
  assert.deepEqual(asNumbers(rowOf(last, 'dist')), [Infinity, Infinity, Infinity, Infinity, 0, 1]);
});

test('bellman-ford: a negative undirected edge is a negative cycle (it is two arcs)', () => {
  const input = { g: { directed: false, nodes: presetsOf(bellmanFord)[0].nodes, edges: [{ u: 'A', v: 'B', w: -1 }] }, start: 'A' };
  const frames = [...bellmanFord.run(input)];
  assert.equal(frames.at(-1).state.negativeCycle, true);
});

test('floyd-warshall matrix equals an independent all-pairs computation', () => {
  for (const preset of presetsOf(floydWarshall).filter((item) => item.id !== 'neg-cycle')) {
    const graph = presetGraph(preset);
    const { frames } = runPreset(floydWarshall, preset.id);
    const last = frames.at(-1);
    assert.equal(last.state.negativeCycle, false);
    preset.nodes.forEach((node, i) => assert.deepEqual(asNumbers(rowOf(last, 'dist', i)), expectedRow(graph, node.id), `${preset.id} row ${node.id}`));
    assert.ok(frames.length < 2000, `${preset.id}: ${frames.length}`);
  }
});

test('floyd-warshall: textbook row, unreachable pairs stay infinite, negative cycle is flagged', () => {
  const five = runPreset(floydWarshall, 'five').frames.at(-1);
  assert.deepEqual(asNumbers(rowOf(five, 'dist', 0)), [0, 1, -3, 2, -4]);
  const sparse = runPreset(floydWarshall, 'sparse').frames.at(-1);
  assert.equal(rowOf(sparse, 'dist', 0)[4], '∞');
  assert.equal(rowOf(sparse, 'dist', 4)[0], '∞');
  const bad = runPreset(floydWarshall, 'neg-cycle').frames.at(-1);
  assert.equal(bad.state.negativeCycle, true);
  assert.ok(bad.hl.bad.length >= 1);
  assert.match(bad.msg, /negative cycle/);
});

test('floyd-warshall keeps k outermost and compares the three entries of the recurrence', () => {
  const { frames } = runPreset(floydWarshall, 'five');
  const ks = frames.filter((frame) => frame.msg.startsWith('k = ') && frame.msg.includes('allow paths')).map((frame) => frame.msg[4]);
  assert.deepEqual(ks, ['A', 'B', 'C', 'D', 'E']);
  const test0 = frames.find((frame) => frame.line === floydWarshall.code.findIndex((line) => line.includes('if (dist[i][k]')));
  assert.equal(panelOf(test0, 'dist').marks.length, 3);
});

test('every graph preset obeys the size limits and stays well under 2000 frames', () => {
  for (const module of [dijkstra, bellmanFord, floydWarshall]) {
    for (const preset of presetsOf(module)) {
      assert.ok(preset.nodes.length <= 8 && preset.edges.length <= 14, preset.id);
      if (module === floydWarshall) assert.ok(preset.nodes.length <= 6, preset.id);
    }
  }
});

test('every graph module renders every frame of every preset with one viewBox and unique keys', async () => {
  const { MODULES } = await import('../src/learn/modules.js');
  const { RENDERERS } = await import('../src/learn/render/index.js');
  let max = 0;
  for (const module of MODULES.filter((item) => item.renderer === 'graph')) {
    for (const preset of presetsOf(module)) {
      const { frames } = runPreset(module, preset.id);
      max = Math.max(max, frames.length);
      const boxes = new Set();
      for (const frame of frames) {
        assert.ok(frame.line >= 0 && frame.line < module.code.length, `${module.id} ${preset.id}`);
        const svg = RENDERERS.graph(frame.state, frame.hl);
        boxes.add(svg.match(/viewBox="([^"]+)"/)[1]);
        const keys = [...svg.matchAll(/data-key="([^"]+)"/g)].map((match) => match[1]);
        assert.equal(new Set(keys).size, keys.length, `${module.id} ${preset.id} duplicate key`);
      }
      assert.equal(boxes.size, 1, `${module.id} ${preset.id} viewBox changed`);
    }
  }
  assert.ok(max < 2000);
});

test('worst case inputs (14 edges) stay under 2000 frames', async () => {
  const { MODULES } = await import('../src/learn/modules.js');
  const dense = presetsOf(MODULES.find((item) => item.id === 'prim')).find((item) => item.id === 'dense');
  const text = dense.edges.map(([u, v, w]) => `${u} ${v} ${w}`).join('\n');
  for (const id of ['prim', 'kruskal']) assert.ok(runPreset(MODULES.find((item) => item.id === id), 'dense', {}, text).frames.length < 2000, id);
  const six = presetsOf(bellmanFord)[1];
  const pairs = ['A B', 'B C', 'C D', 'D E', 'E F', 'F A', 'A C', 'B D', 'C E', 'D F', 'E A', 'F B', 'A D', 'B E'];
  const bf = runPreset(bellmanFord, six.id, {}, pairs.map((pair) => `${pair} 1`).join('\n')).frames;
  assert.ok(bf.length < 2000, `bellman-ford ${bf.length}`);
  const fw = runPreset(floydWarshall, 'sparse', {}, pairs.map((pair) => `${pair} 1`).join('\n')).frames;
  assert.ok(fw.length < 2000, `floyd ${fw.length}`);
});
