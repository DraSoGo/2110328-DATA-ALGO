import { baseState, buildGraph, labelLines, lastLine, listPanel, nodeItems, tablePanel } from './graph-common.js';
import { graphField, startField, UNWEIGHTED_UNDIRECTED } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; call with visited[] = false, from[] = -1',
  'void dfs(int a, vector<int> adj[], bool visited[], int from[]) {',
  '  visited[a] = true;',
  '  for (int b : adj[a]) {',
  '    if (!visited[b]) {',
  '      from[b] = a;',
  '      dfs(b, adj, visited, from);',
  '    }',
  '  }',
  '}',
];

const L = labelLines(CODE, { call: 'void dfs(', mark: 'visited[a] = true;', forB: 'for (int b : adj[a])', test: 'if (!visited[b])', from: 'from[b] = a;', recurse: 'dfs(b, adj, visited, from);' });

export default {
  id: 'dfs',
  side: 'algo',
  group: 'Graph',
  title: 'Depth-first search',
  summary: 'Go as deep as possible before backing up. This is the course\'s recursive dfs with visited[] and from[]; the picture shows the recursion stack.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n + e)', average: 'O(n + e)', worst: 'O(n + e)' },
    space: 'O(n)',
    note: 'Each node is visited once and each edge is examined once (twice if undirected). The recursion can be n deep, for example on a path graph.',
  },
  code: CODE,
  input: { fields: [graphField(UNWEIGHTED_UNDIRECTED, { weighted: false }), startField()] },
  *run({ g: input, start }) {
    const g = buildGraph(input, { weighted: false });
    const n = g.ids.length;
    const visited = new Set();
    const from = Object.fromEntries(g.ids.map((id) => [id, null]));
    const stack = [];
    const order = [];
    const done = [];
    const tree = [];
    const panels = [listPanel('stack', 'recursion stack  (bottom → top)', n), tablePanel('from', 'from[]', g.ids, ['from']), listPanel('order', 'order visited', n)];
    const state = baseState(g, panels);
    const sync = () => {
      panels[0].items = nodeItems(stack);
      panels[1].rows[0].cells = g.ids.map((id) => from[id] ?? '-1');
      panels[2].items = nodeItems(order);
      state.tags = Object.fromEntries(order.map((id, i) => [id, `#${i + 1}`]));
    };
    const at = (line, msg, extra = {}, vars = {}) => {
      sync();
      return { line, msg, state, hl: { visited: [...visited].filter((id) => !done.includes(id)), done: [...done], edgeTree: [...tree], ...extra }, vars: { a: null, b: null, ...vars, stack: [...stack] } };
    };

    function* visit(a) {
      stack.push(a);
      yield at(L.call, `Call dfs(${a})`, { active: [a] }, { a });
      visited.add(a);
      order.push(a);
      yield at(L.mark, `visited[${a}] = true`, { active: [a] }, { a });
      for (const { to: b, key } of g.adj[a]) {
        yield at(L.forB, `Look at neighbour ${b} of ${a}`, { active: [a], compare: [b], edgeCurrent: [key] }, { a, b });
        const fresh = !visited.has(b);
        yield at(L.test, fresh ? `${b} is not visited yet: go there` : `${b} is already visited: skip`, { active: [a], compare: [b], ...(fresh ? { edgeCurrent: [key] } : { edgeRejected: [key] }) }, { a, b });
        if (!fresh) continue;
        from[b] = a;
        tree.push(key);
        yield at(L.from, `from[${b}] = ${a}: we reach ${b} through ${a}`, { active: [a], compare: [b], edgeCurrent: [key] }, { a, b });
        yield at(L.recurse, `Recurse: dfs(${b})`, { active: [a], edgeCurrent: [key] }, { a, b });
        yield* visit(b);
        yield at(L.forB, `Back in dfs(${a}): continue with its next neighbour`, { active: [a] }, { a });
      }
      yield at(L.forB, `${a} has no more neighbours`, { active: [a] }, { a });
      done.push(a);
      stack.pop();
      yield at(lastLine(CODE), `dfs(${a}) returns${stack.length ? ` to dfs(${stack.at(-1)})` : ''}`, { active: stack.length ? [stack.at(-1)] : [] }, { a });
    }

    yield at(0, `Start DFS from ${start}`);
    yield* visit(start);
    const msg = order.length === n ? `Done: every node visited, order ${order.join(' ')}` : `Done: ${order.length} of ${n} nodes visited (${order.join(' ')}); the others are unreachable`;
    yield at(lastLine(CODE), msg);
  },
};
