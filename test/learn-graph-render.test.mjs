import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeKeys, GRAPH_H, GRAPH_W, layoutNodes, NODE_R, renderGraph } from '../src/learn/render/graph.js';
import { RENDERERS } from '../src/learn/render/index.js';

const nodes = [{ id: 'A', x: 60, y: 60 }, { id: 'B', x: 260, y: 60 }, { id: 'C', x: 160, y: 200 }];
const base = (extra = {}) => ({ directed: false, weighted: true, nodes, edges: [{ u: 'A', v: 'B', w: 4 }, { u: 'B', v: 'C', w: 7 }], panels: [], ...extra });
const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const nodePos = (svg, id) => {
  const m = svg.match(new RegExp(`data-key="n-${id}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));
  return { x: Number(m[1]), y: Number(m[2]) };
};

test('registered as the graph renderer with both layers', () => {
  assert.equal(RENDERERS.graph, renderGraph);
  const svg = renderGraph(base());
  assert.match(svg, /^<svg class="viz viz-graph" xmlns=/);
  assert.ok(svg.indexOf('layer-static') < svg.indexOf('layer-items'));
});

test('nodes sit at scaled preset positions inside the canvas', () => {
  const svg = renderGraph(base());
  const [a, b, c] = ['A', 'B', 'C'].map((id) => nodePos(svg, id));
  const scale = (b.x - a.x) / 200;
  assert.ok(Math.abs((c.y - a.y) / 140 - scale) < 0.02, 'uniform scale');
  assert.ok(Math.abs((c.x - a.x) / 100 - scale) < 0.02);
  for (const p of [a, b, c]) {
    assert.ok(p.x >= NODE_R && p.x <= GRAPH_W - NODE_R);
    assert.ok(p.y >= NODE_R && p.y <= GRAPH_H - NODE_R);
  }
  assert.equal(layoutNodes(nodes).get('A').x, a.x);
});

test('keys: nodes n-id, edges e-u-v, repeated edges stay unique', () => {
  const svg = renderGraph(base());
  assert.deepEqual(keys(svg), ['e-A-B', 'e-B-C', 'n-A', 'n-B', 'n-C']);
  assert.deepEqual(edgeKeys([{ u: 'A', v: 'B' }, { u: 'A', v: 'B' }, { u: 'B', v: 'A' }]), ['e-A-B', 'e-A-B-2', 'e-B-A']);
  const dup = renderGraph(base({ edges: [{ u: 'A', v: 'B', w: 1 }, { u: 'A', v: 'B', w: 2 }] }));
  assert.equal(new Set(keys(dup)).size, keys(dup).length);
});

test('directed graphs draw arrowheads, undirected do not', () => {
  assert.equal((renderGraph(base({ directed: true })).match(/class="earrow"/g) || []).length, 2);
  assert.equal(renderGraph(base()).includes('earrow'), false);
});

test('weights show as labels and are escaped; unweighted graphs hide them', () => {
  const svg = renderGraph(base({ edges: [{ u: 'A', v: 'B', w: '<b>&' }] }));
  assert.match(svg, /&lt;b&gt;&amp;/);
  assert.equal(svg.includes('<b>'), false);
  assert.match(renderGraph(base()), />4<\/text>/);
  assert.equal(renderGraph(base({ weighted: false })).includes('wlabel'), false);
  assert.match(renderGraph(base({ nodes: [{ id: '<i>', x: 0, y: 0 }, nodes[1]], edges: [] })), /&lt;i&gt;/);
});

test('highlights become node and edge classes', () => {
  const svg = renderGraph(base(), { active: ['A'], queued: ['B'], done: ['C'], edgeMst: ['e-A-B'], edgeCurrent: ['e-B-C'], groups: [['A', 'B']] });
  assert.match(svg, /class="gnode is-queued is-active is-g0"|class="gnode is-queued is-g0"/);
  assert.match(svg, /class="gnode is-done"[^>]*data-key="n-C"/);
  assert.match(svg, /class="edge is-mst" data-key="e-A-B"/);
  assert.match(svg, /class="edge is-current" data-key="e-B-C"/);
});

test('panels: lists place keyed items, tables render in the static layer, panels are escaped', () => {
  const panels = [
    { id: 'q', kind: 'list', title: 'queue <front>', capacity: 3, items: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B', cls: 'is-current' }] },
    { id: 'd', kind: 'table', title: 'dist', cols: ['A', 'B', 'C'], rows: [{ head: 'dist', cells: [0, '∞', 5] }], marks: [{ r: 0, c: 1, kind: 'upd' }] },
  ];
  const svg = renderGraph(base({ panels }));
  assert.ok(keys(svg).includes('p-q-A') && keys(svg).includes('p-q-B'));
  assert.match(svg, /queue &lt;front&gt;/);
  const staticLayer = svg.slice(svg.indexOf('layer-static'), svg.indexOf('layer-items'));
  assert.match(staticLayer, /class="tcell is-upd"/);
  assert.match(staticLayer, />∞<\/text>/);
  assert.match(svg, /class="item pitem is-current" data-key="p-q-B"/);
});

test('viewBox is constant while highlights, tags and panel contents change', () => {
  const panel = (items) => ({ id: 'q', kind: 'list', title: 'queue', capacity: 8, items });
  const table = (cells) => ({ id: 't', kind: 'table', title: 'dist', cols: ['A', 'B', 'C'], rows: [{ head: 'd', cells }] });
  const one = renderGraph(base({ panels: [panel([]), table([0, 1, 2])], tags: {} }));
  const two = renderGraph(base({ panels: [panel([{ key: 'A', text: 'A' }]), table(['∞', '∞', '∞'])], tags: { A: 'd=0' } }), { active: ['A'] });
  assert.equal(viewBox(one), viewBox(two));
  assert.ok(Number(viewBox(one).split(' ')[3]) >= GRAPH_H);
});

test('tall panel stacks grow the canvas from the declared capacity only', () => {
  const tall = { id: 'e', kind: 'list', title: 'edges', cellW: 56, capacity: 14, items: [] };
  const short = renderGraph(base());
  const grown = renderGraph(base({ panels: [tall, { ...tall, id: 'f' }] }));
  assert.ok(Number(viewBox(grown).split(' ')[3]) > Number(viewBox(short).split(' ')[3]));
});
