import { record } from '../src/learn/engine/recorder.js';
import { fieldDefaultRaw, graphEdgesText, parseField } from '../src/learn/engine/input.js';

// Parses the module's input fields for one graph preset, like the form does.
export function inputFor(module, presetId, extra = {}, edgeText) {
  const input = {};
  for (const field of module.input.fields) {
    let raw = fieldDefaultRaw(field);
    if (field.kind === 'graph') {
      const preset = field.presets.find((item) => item.id === (presetId ?? field.default));
      raw = { preset: preset.id, text: edgeText ?? graphEdgesText(preset) };
    }
    if (field.name in extra) raw = extra[field.name];
    const parsed = parseField(field, raw, input);
    if (parsed.error) throw new Error(`${field.name}: ${parsed.error}`);
    input[field.name] = parsed.value;
  }
  return input;
}

export const presetsOf = (module) => module.input.fields.find((field) => field.kind === 'graph').presets;
export const runPreset = (module, presetId, extra, edgeText) => {
  const input = inputFor(module, presetId, extra, edgeText);
  return { input, frames: record(module.run(input)) };
};

export const panelOf = (frame, id) => frame.state.panels.find((panel) => panel.id === id);
export const rowOf = (frame, id, row = 0) => panelOf(frame, id).rows[row].cells;
export const itemsOf = (frame, id) => panelOf(frame, id).items.map((item) => item.key);

// Independent reference implementations used to check the modules.
export function neighbours(graph) {
  const adj = Object.fromEntries(graph.nodes.map((node) => [node.id, []]));
  for (const { u, v } of graph.edges) {
    adj[u].push(v);
    if (!graph.directed) adj[v].push(u);
  }
  return adj;
}

export function bfsReference(graph, start) {
  const adj = neighbours(graph);
  const level = { [start]: 0 };
  const order = [start];
  for (let head = 0; head < order.length; head += 1) {
    for (const v of adj[order[head]]) if (!(v in level)) { level[v] = level[order[head]] + 1; order.push(v); }
  }
  return { order, level };
}

export function dfsReference(graph, start) {
  const adj = neighbours(graph);
  const seen = [];
  const go = (u) => { seen.push(u); for (const v of adj[u]) if (!seen.includes(v)) go(v); };
  go(start);
  return seen;
}

// Shortest distances by relaxing every arc until nothing changes.
export function distancesReference(graph, start) {
  const arcs = graph.edges.flatMap(({ u, v, w }) => (graph.directed ? [[u, v, w]] : [[u, v, w], [v, u, w]]));
  const dist = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  dist[start] = 0;
  for (let round = 0; round < graph.nodes.length + 1; round += 1) {
    for (const [u, v, w] of arcs) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  return dist;
}

export function hasNegativeCycleReference(graph, start) {
  const arcs = graph.edges.flatMap(({ u, v, w }) => (graph.directed ? [[u, v, w]] : [[u, v, w], [v, u, w]]));
  const dist = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  dist[start] = 0;
  for (let round = 0; round < graph.nodes.length; round += 1) {
    for (const [u, v, w] of arcs) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  return arcs.some(([u, v, w]) => dist[u] + w < dist[v]);
}

// Minimum spanning forest weight by trying every edge subset (small graphs only).
export function bruteForceMst(graph) {
  const ids = graph.nodes.map((node) => node.id);
  const components = (edges) => {
    const label = Object.fromEntries(ids.map((id) => [id, id]));
    const find = (x) => (label[x] === x ? x : find(label[x]));
    for (const { u, v } of edges) label[find(u)] = find(v);
    return new Set(ids.map(find)).size;
  };
  const target = components(graph.edges);
  const need = ids.length - target;
  let best = Infinity;
  const choose = (index, picked) => {
    if (picked.length === need) {
      if (components(picked) === target) best = Math.min(best, picked.reduce((sum, edge) => sum + edge.w, 0));
      return;
    }
    if (index >= graph.edges.length || graph.edges.length - index < need - picked.length) return;
    choose(index + 1, [...picked, graph.edges[index]]);
    choose(index + 1, picked);
  };
  choose(0, []);
  return best;
}

export const presetGraph = (preset) => ({ directed: preset.directed, nodes: preset.nodes, edges: preset.edges.map(([u, v, w = 1]) => ({ u, v, w })) });

export const assertFrameBudget = (assert, frames, label) => assert.ok(frames.length < 2000, `${label}: ${frames.length} frames`);
