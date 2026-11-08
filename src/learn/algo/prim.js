import { baseState, buildGraph, INF, labelLines, lastLine, listPanel, show, tablePanel } from './graph-common.js';
import { graphField, MST_GRAPHS, startField } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; adj[u] holds {v, w}; INF is a huge int',
  'int prim(int n, vector<pair<int,int>> adj[], int s) {',
  '  vector<int> cost(n, INF), prev(n, -1);',
  '  vector<bool> taken(n, false);',
  '  set<pair<int,int>> pq;        // (cost, node), smallest first',
  '  cost[s] = 0;',
  '  pq.insert({0, s});',
  '  int total = 0;',
  '  while (!pq.empty()) {',
  '    auto [c, u] = *pq.begin();',
  '    pq.erase(pq.begin());',
  '    taken[u] = true;',
  '    total += c;',
  '    for (auto [v, w] : adj[u]) {',
  '      if (!taken[v] && cost[v] > w) {',
  '        pq.erase({cost[v], v});',
  '        cost[v] = w;',
  '        prev[v] = u;',
  '        pq.insert({cost[v], v});',
  '      }',
  '    }',
  '  }',
  '  return total;',
  '}',
];

const L = labelLines(CODE, {
  init: 'vector<int> cost(n', taken: 'vector<bool> taken', pq: 'set<pair<int,int>> pq', costS: 'cost[s] = 0;', insertS: 'pq.insert({0, s});', total: 'int total = 0;',
  loop: 'while (!pq.empty())', top: 'auto [c, u]', pop: 'pq.erase(pq.begin());', take: 'taken[u] = true;', add: 'total += c;', forV: 'for (auto [v, w] : adj[u])',
  test: 'if (!taken[v] && cost[v] > w)', erase: 'pq.erase({cost[v], v});', setCost: 'cost[v] = w;', setPrev: 'prev[v] = u;', insert: 'pq.insert({cost[v], v});', ret: 'return total;',
});

export default {
  id: 'prim',
  side: 'algo',
  group: 'Minimum spanning tree',
  title: 'Prim\'s algorithm',
  summary: 'Grow one tree from the start node: always take the cheapest edge that reaches a new node. A priority queue holds (cost, node); decrease-key is done as erase + insert, as in the course\'s set version.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(e log n)', average: 'O(e log n)', worst: 'O(e log n)' },
    space: 'O(n)',
    note: 'Each node is taken once (n delete-min operations) and each edge can cause one erase and one insert, each O(log n). A Fibonacci heap would give O(e + n log n). Only the start node\'s component is spanned.',
  },
  code: CODE,
  input: { fields: [graphField(MST_GRAPHS, { weighted: true, minWeight: 1, maxWeight: 20 }), startField()] },
  *run({ g: input, start: s }) {
    const g = buildGraph(input);
    const n = g.ids.length;
    const index = Object.fromEntries(g.ids.map((id, i) => [id, i]));
    const cost = Object.fromEntries(g.ids.map((id) => [id, INF]));
    const prev = Object.fromEntries(g.ids.map((id) => [id, null]));
    const best = Object.fromEntries(g.ids.map((id) => [id, null]));
    const taken = new Set();
    let pq = [];
    let total = 0;
    const mst = [];
    let initialised = false;
    const panels = [listPanel('pq', 'priority queue  (cost : node)', n, 52), tablePanel('cost', 'cost[] and prev[]', g.ids, ['cost', 'prev'])];
    const state = baseState(g, panels);
    const sortPq = () => { pq.sort((a, b) => a[0] - b[0] || index[a[1]] - index[b[1]]); };
    const at = (line, msg, extra = {}, vars = {}) => {
      sortPq();
      panels[0].items = pq.map(([c, v]) => ({ key: v, text: `${v}:${c}` }));
      panels[1].rows[0].cells = g.ids.map((id) => (initialised ? show(cost[id]) : ''));
      panels[1].rows[1].cells = g.ids.map((id) => (initialised ? (prev[id] ?? '-1') : ''));
      state.tags = initialised ? Object.fromEntries(g.ids.map((id) => [id, show(cost[id])])) : {};
      const frontier = pq.map(([, v]) => best[v]).filter(Boolean);
      return { line, msg, state, hl: { queued: pq.map(([, v]) => v), done: [...taken], edgeMst: [...mst], edgeRelaxed: frontier, ...extra }, vars: { s, u: null, v: null, total, ...vars } };
    };

    yield at(0, `Grow a minimum spanning tree from ${s}`);
    initialised = true;
    yield at(L.init, 'cost[x] = INF and prev[x] = -1 for every node');
    yield at(L.taken, 'No node is in the tree yet: taken[x] = false');
    yield at(L.pq, 'Create an empty priority queue of (cost, node) pairs');
    cost[s] = 0;
    yield at(L.costS, `cost[${s}] = 0: the start joins the tree for free`, { active: [s] });
    pq.push([0, s]);
    yield at(L.insertS, `Insert (0, ${s}) into the priority queue`, { active: [s] });
    yield at(L.total, 'total = 0');
    while (true) {
      yield at(L.loop, pq.length ? `The queue holds ${pq.length} candidate${pq.length > 1 ? 's' : ''}: keep going` : 'The queue is empty: no node is reachable any more');
      if (!pq.length) break;
      sortPq();
      const [c, u] = pq[0];
      yield at(L.top, `Cheapest candidate: (${c}, ${u})`, { active: [u] }, { u, c });
      pq.shift();
      yield at(L.pop, `Remove (${c}, ${u}) from the queue`, { active: [u] }, { u, c });
      taken.add(u);
      if (best[u]) mst.push(best[u]);
      yield at(L.take, best[u] ? `${u} joins the tree through edge ${prev[u]}-${u} (cost ${c})` : `${u} joins the tree`, { active: [u] }, { u, c });
      total += c;
      yield at(L.add, `total = ${total}`, { active: [u] }, { u, c });
      for (const { to: v, w, key } of g.adj[u]) {
        yield at(L.forV, `Look at edge ${u}-${v} (weight ${w})`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w });
        const better = !taken.has(v) && cost[v] > w;
        const why = taken.has(v) ? `${v} is already in the tree: skip` : better ? `cost[${v}] = ${show(cost[v])} > ${w}: this edge is cheaper` : `cost[${v}] = ${cost[v]} <= ${w}: the known edge is at least as cheap`;
        yield at(L.test, why, { active: [u], compare: [v], ...(better ? { edgeCurrent: [key] } : { edgeRejected: [key] }) }, { u, v, w });
        if (!better) continue;
        pq = pq.filter(([, node]) => node !== v);
        yield at(L.erase, cost[v] === INF ? `${v} is not in the queue yet: nothing to erase` : `Erase the old entry for ${v}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w });
        cost[v] = w;
        yield at(L.setCost, `cost[${v}] = ${w}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w });
        prev[v] = u;
        best[v] = key;
        yield at(L.setPrev, `prev[${v}] = ${u}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v, w });
        pq.push([w, v]);
        yield at(L.insert, `Insert (${w}, ${v}) into the queue`, { active: [u], compare: [v] }, { u, v, w });
      }
      yield at(L.forV, `${u} has no more edges to look at`, { active: [u] }, { u });
    }
    yield at(L.ret, `Total weight of the tree: ${total}`);
    yield at(lastLine(CODE), taken.size === n ? `Done: spanning tree of weight ${total} with ${mst.length} edges` : `Done: ${taken.size} of ${n} nodes are connected to ${s}; weight ${total} (the graph is not connected)`);
  },
};
