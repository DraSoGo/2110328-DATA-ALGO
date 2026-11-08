import test from 'node:test';
import assert from 'node:assert/strict';
import kruskal from '../src/learn/algo/kruskal.js';
import prim from '../src/learn/algo/prim.js';
import { bruteForceMst, itemsOf, panelOf, presetGraph, presetsOf, rowOf, runPreset } from './graph-helpers.mjs';

const totalOf = (frames) => frames.at(-1).vars.total;
const treeEdges = (frames) => frames.at(-1).hl.edgeMst;
const queueCosts = (frame) => panelOf(frame, 'pq').items.map((item) => Number(item.text.split(':')[1]));

test('prim and kruskal weights equal a brute-force minimum spanning tree on every preset', () => {
  for (const preset of presetsOf(kruskal)) {
    const expected = bruteForceMst(presetGraph(preset));
    const k = runPreset(kruskal, preset.id).frames;
    assert.equal(totalOf(k), expected, `kruskal ${preset.id}`);
    for (const start of preset.nodes.map((node) => node.id)) {
      const pr = runPreset(prim, preset.id, { start }).frames;
      assert.equal(totalOf(pr), expected, `prim ${preset.id} from ${start}`);
      assert.equal(treeEdges(pr).length, preset.nodes.length - 1);
      assert.ok(pr.length < 2000);
    }
    assert.equal(treeEdges(k).length, preset.nodes.length - 1);
    assert.ok(k.length < 2000);
  }
});

test('the chosen edges sum to the reported total and connect every node', () => {
  for (const preset of presetsOf(prim)) {
    const graph = presetGraph(preset);
    for (const frames of [runPreset(kruskal, preset.id).frames, runPreset(prim, preset.id).frames]) {
      const chosen = treeEdges(frames).map((key) => graph.edges.find((edge) => `e-${edge.u}-${edge.v}` === key));
      assert.equal(chosen.reduce((sum, edge) => sum + edge.w, 0), totalOf(frames));
      const seen = new Set([preset.nodes[0].id]);
      for (let pass = 0; pass < chosen.length; pass += 1) {
        for (const { u, v } of chosen) if (seen.has(u) || seen.has(v)) { seen.add(u); seen.add(v); }
      }
      assert.equal(seen.size, preset.nodes.length);
    }
  }
});

test('kruskal: edges are tried in weight order, cycles are rejected, p[] ends with one root', () => {
  const { frames } = runPreset(kruskal, 'course');
  const tried = frames.filter((frame) => frame.msg.startsWith('Next lightest edge')).map((frame) => Number(frame.msg.match(/weight (\d+)/)[1]));
  assert.deepEqual(tried, [...tried].sort((a, b) => a - b));
  assert.equal(tried.length, 10);
  const last = frames.at(-1);
  assert.equal(rowOf(last, 'p').filter((value) => value === '-1').length, 1);
  assert.ok(last.hl.edgeRejected.length > 0);
  assert.equal(last.hl.edgeMst.length + last.hl.edgeRejected.length, 10);
  assert.ok(frames.some((frame) => frame.msg.includes('would close a cycle')));
  assert.equal(panelOf(last, 'edges').items.length, 10);
});

test('kruskal shows findset climbing and union linking a root', () => {
  const { frames } = runPreset(kruskal, 'ring');
  const climbLine = kruskal.code.findIndex((line) => line.includes('x = p[x];'));
  assert.ok(frames.some((frame) => frame.line === climbLine));
  assert.ok(frames.some((frame) => /root of one set/.test(frame.msg)));
});

test('prim: queue stays sorted, taken nodes turn done, disconnected graphs stop at the component', () => {
  const { frames } = runPreset(prim, 'course', { start: 'A' });
  for (const frame of frames) {
    const costs = queueCosts(frame);
    assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
    assert.ok(itemsOf(frame, 'pq').length <= 7);
  }
  assert.deepEqual([...frames.at(-1).hl.done].sort(), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  const partial = runPreset(prim, 'course', { start: 'A' }, 'A B 3\nB C 4\nD E 1').frames.at(-1);
  assert.equal(partial.vars.total, 7);
  assert.match(partial.msg, /not connected/);
});

test('kruskal on a disconnected graph builds a forest', () => {
  const last = runPreset(kruskal, 'course', {}, 'A B 3\nB C 4\nA C 9\nD E 1').frames.at(-1);
  assert.equal(last.vars.total, 8);
  assert.match(last.msg, /forest/);
});
