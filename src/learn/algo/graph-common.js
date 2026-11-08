import { edgeKeys } from '../render/graph.js';

export const INF = Infinity;
export const show = (value) => (value === Infinity ? '∞' : value === -Infinity ? '-∞' : value);

// Graph helpers shared by the graph algorithm modules. Nodes are named by
// letters in the picture; the C++ code calls them 0..n-1 (A = 0).
export function buildGraph(input, { weighted = true } = {}) {
  const keys = edgeKeys(input.edges);
  const edges = input.edges.map((edge, i) => ({ u: edge.u, v: edge.v, w: edge.w, key: keys[i] }));
  const ids = input.nodes.map((node) => node.id);
  const adj = Object.fromEntries(ids.map((id) => [id, []]));
  for (const edge of edges) {
    adj[edge.u].push({ to: edge.v, w: edge.w, key: edge.key });
    if (!input.directed) adj[edge.v].push({ to: edge.u, w: edge.w, key: edge.key });
  }
  // Directed arcs: an undirected edge becomes two arcs (a -> b and b -> a).
  const arcs = edges.flatMap((edge) => (input.directed ? [{ a: edge.u, b: edge.v, w: edge.w, key: edge.key }] : [{ a: edge.u, b: edge.v, w: edge.w, key: edge.key }, { a: edge.v, b: edge.u, w: edge.w, key: edge.key }]));
  return { directed: Boolean(input.directed), weighted, nodes: input.nodes, ids, edges, adj, arcs };
}

export function baseState(g, panels) {
  return {
    directed: g.directed,
    weighted: g.weighted,
    nodes: g.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    edges: g.edges.map(({ u, v, w }) => ({ u, v, w })),
    tags: {},
    panels,
  };
}

export const listPanel = (id, title, capacity, cellW = 44) => ({ id, kind: 'list', title, capacity, cellW, items: [] });
export const tablePanel = (id, title, cols, rows) => ({ id, kind: 'table', title, cols, rows: rows.map((head) => ({ head, cells: cols.map(() => '') })), marks: [] });
export const nodeItems = (ids, cls) => ids.map((id) => ({ key: id, text: id, ...(cls ? { cls } : {}) }));

// Finds each labelled snippet in the code once, so frames never rely on
// hand-counted line numbers. Throws when a snippet is missing or ambiguous.
export function labelLines(code, labels) {
  return Object.fromEntries(Object.entries(labels).map(([name, snippet]) => {
    const hits = code.map((line, index) => (line.includes(snippet) ? index : -1)).filter((index) => index >= 0);
    if (hits.length !== 1) throw new Error(`code snippet "${snippet}" matches ${hits.length} lines`);
    return [name, hits[0]];
  }));
}

export const lastLine = (code) => code.length - 1;

export const nodesOf = (list) => list.map(([id, x, y]) => ({ id, x, y }));
