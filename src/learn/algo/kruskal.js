import { baseState, buildGraph, labelLines, lastLine, listPanel, tablePanel } from './graph-common.js';
import { graphField, MST_GRAPHS } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; p[] is the disjoint-set parent array',
  'int findset(int x) {',
  '  while (p[x] != -1)',
  '    x = p[x];',
  '  return x;',
  '}',
  'void unite(int x, int y) {',
  '  int s1 = findset(x), s2 = findset(y);',
  '  p[s1] = s2;',
  '}',
  'int kruskal(int n, vector<Edge> E) {   // Edge = {u, v, w}',
  '  fill(p, p + n, -1);',
  '  stable_sort(E.begin(), E.end(), [](Edge a, Edge b) { return a.w < b.w; });',
  '  int total = 0;',
  '  for (auto [u, v, w] : E) {',
  '    if (findset(u) != findset(v)) {',
  '      X.push_back({u, v});',
  '      total += w;',
  '      unite(u, v);',
  '    }',
  '  }',
  '  return total;',
  '}',
];

const L = labelLines(CODE, {
  findCall: 'int findset(int x) {', whileP: 'while (p[x] != -1)', climb: 'x = p[x];', findRet: 'return x;', roots: 'int s1 = findset(x)', link: 'p[s1] = s2;', fill: 'fill(p', sort: 'stable_sort',
  total: 'int total = 0;', forE: 'for (auto [u, v, w] : E)', test: 'if (findset(u) != findset(v))', push: 'X.push_back', add: 'total += w;', unite: 'unite(u, v);', ret: 'return total;',
});

export default {
  id: 'kruskal',
  side: 'algo',
  group: 'Minimum spanning tree',
  title: 'Kruskal\'s algorithm',
  summary: 'Sort the edges, then take each edge that joins two different components. A disjoint-set tree (findset / union, course version without rank) tells whether two nodes are already connected.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(e log e)', average: 'O(e log e)', worst: 'O(e log e)' },
    space: 'O(n + e)',
    note: 'Sorting the edges costs O(e log e). There are e findset pairs and at most n - 1 unions; without union by rank a findset can walk O(n) parents, so the course version is O(e log e + e n) worst case, which is O(e log e) with rank or path compression.',
  },
  code: CODE,
  input: { fields: [graphField(MST_GRAPHS, { weighted: true, minWeight: 1, maxWeight: 20 })] },
  *run({ g: input }) {
    const g = buildGraph(input);
    const n = g.ids.length;
    const p = Object.fromEntries(g.ids.map((id) => [id, null]));
    const sorted = [...g.edges].sort((a, b) => a.w - b.w);
    const status = {};
    const chosen = [];
    const rejected = [];
    let total = 0;
    let showP = false;
    let showEdges = false;
    const panels = [listPanel('edges', 'edges sorted by weight', Math.max(1, g.edges.length), 56), tablePanel('p', 'p[]  (parent, -1 = root)', g.ids, ['p'])];
    const state = baseState(g, panels);
    const root = (x) => { let r = x; while (p[r] !== null) r = p[r]; return r; };
    const groups = () => {
      const byRoot = new Map();
      for (const id of g.ids) byRoot.set(root(id), [...(byRoot.get(root(id)) || []), id]);
      return [...byRoot.values()].filter((set) => set.length > 1).sort((a, b) => g.ids.indexOf(a[0]) - g.ids.indexOf(b[0]));
    };
    const at = (line, msg, extra = {}, vars = {}, mark) => {
      panels[0].items = showEdges ? sorted.map((edge) => ({ key: edge.key, text: `${edge.u}${edge.v}:${edge.w}`, ...(status[edge.key] ? { cls: status[edge.key] } : {}) })) : [];
      panels[1].rows[0].cells = g.ids.map((id) => (showP ? (p[id] ?? '-1') : ''));
      panels[1].marks = mark === undefined ? [] : [{ r: 0, c: g.ids.indexOf(mark), kind: 'cur' }];
      return { line, msg, state, hl: { groups: groups(), edgeMst: [...chosen], edgeRejected: [...rejected], ...extra }, vars: { total, ...vars } };
    };

    // findset with a frame for every parent hop.
    function* findset(x, label, edge, extra) {
      const start = x;
      let cur = x;
      yield at(L.findCall, `findset(${start}): climb from ${start} to its root`, { ...extra, active: [start], edgeCurrent: [edge.key] }, { x: cur }, cur);
      while (true) {
        const parent = p[cur];
        yield at(L.whileP, parent === null ? `p[${cur}] = -1: ${cur} is a root` : `p[${cur}] = ${parent} is not -1: keep climbing`, { ...extra, active: [start], compare: [cur], edgeCurrent: [edge.key] }, { x: cur }, cur);
        if (parent === null) break;
        cur = parent;
        yield at(L.climb, `x = p[x] = ${cur}`, { ...extra, active: [start], compare: [cur], edgeCurrent: [edge.key] }, { x: cur }, cur);
      }
      yield at(L.findRet, `findset(${start}) = ${cur}: the ${label} endpoint is in set ${cur}`, { ...extra, active: [start], compare: [cur], edgeCurrent: [edge.key] }, { x: cur }, cur);
      return cur;
    }

    yield at(0, `Find a minimum spanning tree of ${n} nodes and ${g.edges.length} edges`);
    showP = true;
    yield at(L.fill, 'Every node starts as its own set: p[x] = -1');
    showEdges = true;
    yield at(L.sort, `Sort the edges by weight: ${sorted.map((edge) => `${edge.u}${edge.v}(${edge.w})`).join(' ')}`);
    yield at(L.total, 'total = 0');
    for (const edge of sorted) {
      const { u, v, w, key } = edge;
      status[key] = 'is-current';
      yield at(L.forE, `Next lightest edge: ${u}-${v} with weight ${w}`, { active: [u, v], edgeCurrent: [key] }, { u, v, w });
      const ru = yield* findset(u, 'first', edge, {});
      const rv = yield* findset(v, 'second', edge, {});
      const differ = ru !== rv;
      yield at(L.test, differ ? `findset(${u}) = ${ru} != findset(${v}) = ${rv}: different components, take the edge` : `findset(${u}) = findset(${v}) = ${ru}: already connected, this edge would close a cycle`, { active: [u, v], edgeCurrent: [key] }, { u, v, w });
      if (!differ) {
        status[key] = 'is-rejected';
        rejected.push(key);
        yield at(L.test, `Reject ${u}-${v}`, { active: [u, v] }, { u, v, w });
        continue;
      }
      status[key] = 'is-accepted';
      chosen.push(key);
      yield at(L.push, `Add ${u}-${v} to the tree`, { active: [u, v] }, { u, v, w });
      total += w;
      yield at(L.add, `total = ${total}`, { active: [u, v] }, { u, v, w });
      yield at(L.unite, `unite(${u}, ${v}): merge set ${ru} and set ${rv}`, { active: [u, v], compare: [ru, rv] }, { u, v, w });
      yield at(L.roots, `s1 = findset(${u}) = ${ru}, s2 = findset(${v}) = ${rv}`, { active: [u, v], compare: [ru, rv] }, { x: u, y: v }, ru);
      p[ru] = rv;
      yield at(L.link, `p[${ru}] = ${rv}: the root of one set now points at the other`, { active: [u, v], compare: [rv] }, { x: u, y: v }, ru);
    }
    yield at(L.forE, 'No edges left: the loop ends');
    yield at(L.ret, `Total weight: ${total}`);
    const components = g.ids.length - chosen.length;
    yield at(lastLine(CODE), components === 1 ? `Done: spanning tree of weight ${total} with ${chosen.length} edges` : `Done: spanning forest of weight ${total} (${components} components, the graph is not connected)`);
  },
};
