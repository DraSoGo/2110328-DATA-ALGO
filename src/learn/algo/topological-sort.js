import { baseState, buildGraph, labelLines, lastLine, listPanel, nodeItems, tablePanel } from './graph-common.js';
import { graphField, TOPO_GRAPHS } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; edge u -> v means v needs u first',
  'vector<int> topo_sort(int n, vector<int> adj[]) {',
  '  vector<int> indeg(n, 0), ans;',
  '  for (int u = 0; u < n; u++)',
  '    for (int v : adj[u]) indeg[v]++;',
  '  queue<int> q;',
  '  for (int u = 0; u < n; u++)',
  '    if (indeg[u] == 0) q.push(u);',
  '  while (!q.empty()) {',
  '    int u = q.front();',
  '    q.pop();',
  '    ans.push_back(u);',
  '    for (int v : adj[u]) {',
  '      indeg[v]--;',
  '      if (indeg[v] == 0) q.push(v);',
  '    }',
  '  }',
  '  if ((int)ans.size() < n) return {};',
  '  return ans;',
  '}',
];

const L = labelLines(CODE, {
  count: 'for (int v : adj[u]) indeg[v]++;', queue: 'queue<int> q;', seedTest: 'if (indeg[u] == 0) q.push(u);', loop: 'while (!q.empty())',
  front: 'int u = q.front();', pop: 'q.pop();', add: 'ans.push_back(u);', forV: 'for (int v : adj[u]) {', dec: 'indeg[v]--;', zero: 'if (indeg[v] == 0) q.push(v);',
  cycle: 'if ((int)ans.size() < n)', ret: 'return ans;',
});

// The two "for (int u..." lines share text; find them by position.
const FOR_U = CODE.map((line, i) => (line === '  for (int u = 0; u < n; u++)' ? i : -1)).filter((i) => i >= 0);

export default {
  id: 'topological-sort',
  side: 'algo',
  group: 'Graph',
  title: 'Topological sort (Kahn)',
  summary: 'Order the tasks of a directed graph so every edge goes left to right: repeatedly take a node with in-degree 0 (course version: Kahn\'s algorithm with an in-degree counter). A cycle is detected when nodes are left over.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n + e)', average: 'O(n + e)', worst: 'O(n + e)' },
    space: 'O(n)',
    note: 'Counting in-degrees and removing every edge once costs O(n + e). If the graph has a cycle, the nodes on and after the cycle never reach in-degree 0.',
  },
  code: CODE,
  input: { fields: [graphField(TOPO_GRAPHS, { weighted: false })] },
  *run({ g: input }) {
    const g = buildGraph(input, { weighted: false });
    const n = g.ids.length;
    const indeg = Object.fromEntries(g.ids.map((id) => [id, 0]));
    const queue = [];
    const ans = [];
    const removed = [];
    const done = [];
    const panels = [listPanel('queue', 'queue q  (front → back)', n), tablePanel('indeg', 'indeg[]', g.ids, ['indeg']), listPanel('order', 'topological order', n)];
    const state = baseState(g, panels);
    let counted = false;
    const at = (line, msg, extra = {}, vars = {}) => {
      panels[0].items = nodeItems(queue);
      panels[1].rows[0].cells = g.ids.map((id) => (counted ? indeg[id] : ''));
      panels[2].items = nodeItems(ans);
      state.tags = counted ? Object.fromEntries(g.ids.map((id) => [id, `in ${indeg[id]}`])) : {};
      return { line, msg, state, hl: { queued: [...queue], done: [...done], edgeRemoved: [...removed], ...extra }, vars: { u: null, v: null, ...vars, q: [...queue], ans: [...ans] } };
    };

    yield at(0, `Find an order of the ${n} nodes in which every edge points forward`);
    for (const { v } of g.edges) indeg[v] += 1;
    counted = true;
    yield at(L.count, 'Count the in-degree of every node: how many edges point into it');
    yield at(L.queue, 'Create an empty queue q');
    for (const u of g.ids) {
      yield at(FOR_U[1], `u = ${u}`, { active: [u] }, { u });
      const zero = indeg[u] === 0;
      yield at(L.seedTest, zero ? `indeg[${u}] = 0: nothing must come before ${u}, queue it` : `indeg[${u}] = ${indeg[u]}: ${u} must wait`, { active: [u] }, { u });
      if (zero) {
        queue.push(u);
        yield at(L.seedTest, `Queued ${u}`, { active: [u] }, { u });
      }
    }
    yield at(FOR_U[1], `u = ${n} is not < ${n}: the loop ends`);
    while (true) {
      yield at(L.loop, queue.length ? `${queue.length} node${queue.length > 1 ? 's' : ''} ready in the queue` : 'The queue is empty: the loop ends');
      if (!queue.length) break;
      const u = queue[0];
      yield at(L.front, `u = front = ${u}`, { active: [u] }, { u });
      queue.shift();
      yield at(L.pop, `Pop ${u}`, { active: [u] }, { u });
      ans.push(u);
      yield at(L.add, `ans gets ${u}: it can be done now`, { active: [u] }, { u });
      for (const { to: v, key } of g.adj[u]) {
        yield at(L.forV, `Edge ${u} -> ${v}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v });
        indeg[v] -= 1;
        removed.push(key);
        yield at(L.dec, `Remove edge ${u} -> ${v}: indeg[${v}] = ${indeg[v]}`, { active: [u], compare: [v], edgeCurrent: [key] }, { u, v });
        const zero = indeg[v] === 0;
        if (zero) queue.push(v);
        yield at(L.zero, zero ? `indeg[${v}] = 0: ${v} has no unfinished prerequisites, queue it` : `indeg[${v}] = ${indeg[v]} > 0: ${v} still waits`, { active: [u], compare: [v], edgeRemoved: [...removed] }, { u, v });
      }
      yield at(L.forV, `${u} has no more outgoing edges`, { active: [u] }, { u });
      done.push(u);
    }
    const cyclic = ans.length < n;
    yield at(L.cycle, cyclic ? `Only ${ans.length} of ${n} nodes were ordered: the rest sit on or behind a cycle` : `All ${n} nodes were ordered: no cycle`, cyclic ? { bad: g.ids.filter((id) => !ans.includes(id)) } : {});
    if (cyclic) {
      state.cyclic = true;
      yield at(L.cycle, 'return {}: there is no valid order because the graph has a cycle', { bad: g.ids.filter((id) => !ans.includes(id)) });
    } else {
      yield at(L.ret, `Order: ${ans.join(' ')}`);
    }
    yield at(lastLine(CODE), cyclic ? 'Done: not a DAG, no topological order' : `Done: topological order ${ans.join(' ')}`, cyclic ? { bad: g.ids.filter((id) => !ans.includes(id)) } : {});
  },
};
