import { baseState, buildGraph, INF, labelLines, lastLine, listPanel, show, tablePanel } from './graph-common.js';
import { DIJKSTRA_GRAPHS, graphField, startField } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; adj[u] holds {v, w} with w >= 0',
  'vector<int> dijkstra(int n, vector<pair<int,int>> adj[], int s) {',
  '  vector<int> dist(n, INF), prev(n, -1);',
  '  set<pair<int,int>> pq;        // alarms: (distance, node)',
  '  dist[s] = 0;',
  '  pq.insert({0, s});',
  '  while (!pq.empty()) {',
  '    auto [T, u] = *pq.begin();',
  '    pq.erase(pq.begin());',
  '    for (auto [v, w] : adj[u]) {',
  '      if (dist[v] > T + w) {',
  '        pq.erase({dist[v], v});',
  '        dist[v] = T + w;',
  '        prev[v] = u;',
  '        pq.insert({dist[v], v});',
  '      }',
  '    }',
  '  }',
  '  return dist;',
  '}',
];

const L = labelLines(CODE, {
  init: 'vector<int> dist(n', pq: 'set<pair<int,int>> pq', distS: 'dist[s] = 0;', insertS: 'pq.insert({0, s});', loop: 'while (!pq.empty())', top: 'auto [T, u]', pop: 'pq.erase(pq.begin());',
  forV: 'for (auto [v, w] : adj[u])', test: 'if (dist[v] > T + w)', erase: 'pq.erase({dist[v], v});', setDist: 'dist[v] = T + w;', setPrev: 'prev[v] = u;', insert: 'pq.insert({dist[v], v});', ret: 'return dist;',
});

export default {
  id: 'dijkstra',
  side: 'algo',
  group: 'Shortest path',
  title: 'Dijkstra\'s algorithm',
  summary: 'Single-source shortest paths with non-negative weights: the alarm clock with the smallest time rings next, so its distance is final. The course\'s set version with erase + insert as decrease-key.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O((n + e) log n)', average: 'O((n + e) log n)', worst: 'O((n + e) log n)' },
    space: 'O(n)',
    note: 'Each node is removed from the set once and each edge causes at most one erase and one insert (O(log n) each). It needs non-negative weights; with a negative edge use Bellman-Ford. A Fibonacci heap would improve it to O(e + n log n).',
  },
  code: CODE,
  input: { fields: [graphField(DIJKSTRA_GRAPHS, { weighted: true, minWeight: 0, maxWeight: 20 }), startField()] },
  *run({ g: input, start: s }) {
    const g = buildGraph(input);
    const n = g.ids.length;
    const index = Object.fromEntries(g.ids.map((id, i) => [id, i]));
    const dist = Object.fromEntries(g.ids.map((id) => [id, INF]));
    const prev = Object.fromEntries(g.ids.map((id) => [id, null]));
    const treeEdge = Object.fromEntries(g.ids.map((id) => [id, null]));
    const settled = [];
    let pq = [];
    let initialised = false;
    const panels = [listPanel('pq', 'priority queue  (dist : node)', n, 52), tablePanel('dist', 'dist[] and prev[]', g.ids, ['dist', 'prev'])];
    const state = baseState(g, panels);
    const at = (line, msg, extra = {}, vars = {}) => {
      pq.sort((a, b) => a[0] - b[0] || index[a[1]] - index[b[1]]);
      panels[0].items = pq.map(([d, v]) => ({ key: v, text: `${v}:${d}` }));
      panels[1].rows[0].cells = g.ids.map((id) => (initialised ? show(dist[id]) : ''));
      panels[1].rows[1].cells = g.ids.map((id) => (initialised ? (prev[id] ?? '-1') : ''));
      state.tags = initialised ? Object.fromEntries(g.ids.map((id) => [id, show(dist[id])])) : {};
      return { line, msg, state, hl: { queued: pq.map(([, v]) => v), done: [...settled], edgeTree: g.ids.map((id) => treeEdge[id]).filter(Boolean), ...extra }, vars: { s, u: null, v: null, ...vars } };
    };

    yield at(0, `Shortest paths from ${s}`);
    initialised = true;
    yield at(L.init, 'dist[x] = INF (not reached) and prev[x] = -1 for every node');
    yield at(L.pq, 'Create an empty priority queue of alarms (distance, node)');
    dist[s] = 0;
    yield at(L.distS, `dist[${s}] = 0`, { active: [s] });
    pq.push([0, s]);
    yield at(L.insertS, `Set the alarm of ${s} at time 0`, { active: [s] });
    while (true) {
      yield at(L.loop, pq.length ? `${pq.length} alarm${pq.length > 1 ? 's are' : ' is'} set: keep going` : 'No alarms left: the loop ends');
      if (!pq.length) break;
      pq.sort((a, b) => a[0] - b[0] || index[a[1]] - index[b[1]]);
      const [T, u] = pq[0];
      yield at(L.top, `The next alarm rings at time T = ${T} for node ${u}: dist[${u}] = ${T} is final`, { active: [u] }, { u, T });
      pq.shift();
      yield at(L.pop, `Remove the alarm (${T}, ${u})`, { active: [u] }, { u, T });
      settled.push(u);
      for (const { to: v, w, key } of g.adj[u]) {
        yield at(L.forV, `Look at edge ${u}${g.directed ? '->' : '-'}${v} (weight ${w})`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w, T });
        const better = dist[v] > T + w;
        yield at(L.test, better ? `${T} + ${w} = ${T + w} < dist[${v}] = ${show(dist[v])}: a shorter way to ${v}` : `${T} + ${w} = ${T + w} >= dist[${v}] = ${show(dist[v])}: no improvement`, { active: [u], compare: [v], ...(better ? { edgeCurrent: [key] } : { edgeRejected: [key] }) }, { u, v, w, T });
        if (!better) continue;
        pq = pq.filter(([, node]) => node !== v);
        yield at(L.erase, dist[v] === INF ? `${v} has no alarm yet: nothing to erase` : `Erase the old alarm of ${v}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w, T });
        dist[v] = T + w;
        yield at(L.setDist, `dist[${v}] = ${T} + ${w} = ${dist[v]}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w, T });
        prev[v] = u;
        treeEdge[v] = key;
        yield at(L.setPrev, `prev[${v}] = ${u}`, { active: [u], compare: [v], edgeRelaxed: [key] }, { u, v, w, T });
        pq.push([dist[v], v]);
        yield at(L.insert, `Set the alarm of ${v} at time ${dist[v]}`, { active: [u], compare: [v] }, { u, v, w, T });
      }
      yield at(L.forV, `${u} has no more edges`, { active: [u] }, { u });
    }
    yield at(L.ret, `Distances: ${g.ids.map((id) => `${id}=${show(dist[id])}`).join(', ')}`);
    const lost = g.ids.filter((id) => dist[id] === INF);
    yield at(lastLine(CODE), lost.length ? `Done: ${lost.join(', ')} cannot be reached from ${s} (dist = ∞)` : `Done: shortest distances from ${s} to every node (n = ${n})`);
  },
};
