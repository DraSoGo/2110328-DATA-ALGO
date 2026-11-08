import { baseState, buildGraph, labelLines, lastLine, tablePanel } from './graph-common.js';
import { COMPONENT_GRAPHS, graphField } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…',
  'void dfs_cc(int a, vector<int> adj[], int cc[], int cc_num) {',
  '  cc[a] = cc_num;',
  '  for (int b : adj[a])',
  '    if (cc[b] == 0) dfs_cc(b, adj, cc, cc_num);',
  '}',
  'int connected_components(int n, vector<int> adj[], int cc[]) {',
  '  int cc_num = 0;',
  '  fill(cc, cc + n, 0);',
  '  for (int u = 0; u < n; u++)',
  '    if (cc[u] == 0) {',
  '      cc_num++;',
  '      dfs_cc(u, adj, cc, cc_num);',
  '    }',
  '  return cc_num;',
  '}',
];

const L = labelLines(CODE, {
  call: 'void dfs_cc(', label: 'cc[a] = cc_num;', forB: 'for (int b : adj[a])', test: 'if (cc[b] == 0)', init: 'int cc_num = 0;', fill: 'fill(cc',
  forU: 'for (int u = 0; u < n; u++)', testU: 'if (cc[u] == 0) {', bump: 'cc_num++;', start: 'dfs_cc(u, adj, cc, cc_num);', ret: 'return cc_num;',
});

export default {
  id: 'connected-components',
  side: 'algo',
  group: 'Graph',
  title: 'Connected components',
  summary: 'Label every node with the number of its component: run dfs_cc from each node that has no label yet (course version, undirected graphs).',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n + e)', average: 'O(n + e)', worst: 'O(n + e)' },
    space: 'O(n)',
    note: 'Although dfs_cc may start n times, every node is labelled once and its edges are scanned once, so the total is O(n + e), not O(n (n + e)).',
  },
  code: CODE,
  input: { fields: [graphField(COMPONENT_GRAPHS, { weighted: false })] },
  *run({ g: input }) {
    const g = buildGraph(input, { weighted: false });
    const n = g.ids.length;
    const cc = Object.fromEntries(g.ids.map((id) => [id, 0]));
    let ccNum = 0;
    const table = tablePanel('cc', 'cc[]  (component number)', g.ids, ['cc']);
    const state = baseState(g, [table]);
    const tree = [];
    const at = (line, msg, extra = {}, vars = {}) => {
      table.rows[0].cells = g.ids.map((id) => cc[id]);
      state.tags = Object.fromEntries(g.ids.filter((id) => cc[id]).map((id) => [id, `c${cc[id]}`]));
      const groups = Array.from({ length: ccNum }, (_, k) => g.ids.filter((id) => cc[id] === k + 1));
      return { line, msg, state, hl: { groups, edgeTree: [...tree], ...extra }, vars: { cc_num: ccNum, ...vars } };
    };

    function* visit(a) {
      yield at(L.call, `Call dfs_cc(${a}) with cc_num = ${ccNum}`, { active: [a] }, { a });
      cc[a] = ccNum;
      yield at(L.label, `cc[${a}] = ${ccNum}`, { active: [a] }, { a });
      for (const { to: b, key } of g.adj[a]) {
        yield at(L.forB, `Look at neighbour ${b} of ${a}`, { active: [a], compare: [b], edgeCurrent: [key] }, { a, b });
        const fresh = cc[b] === 0;
        yield at(L.test, fresh ? `cc[${b}] = 0: ${b} has no component yet, recurse` : `cc[${b}] = ${cc[b]}: ${b} is already labelled`, { active: [a], compare: [b], ...(fresh ? { edgeCurrent: [key] } : { edgeRejected: [key] }) }, { a, b });
        if (fresh) {
          tree.push(key);
          yield* visit(b);
        }
      }
      yield at(L.forB, `${a} has no more neighbours: dfs_cc(${a}) returns`, { active: [a] }, { a });
    }

    yield at(0, `Label the ${n} nodes with their component number`);
    yield at(L.init, 'cc_num = 0');
    yield at(L.fill, 'cc[x] = 0 for every node: no component yet');
    for (const u of g.ids) {
      yield at(L.forU, `u = ${u}`, { active: [u] }, { u });
      const fresh = cc[u] === 0;
      yield at(L.testU, fresh ? `cc[${u}] = 0: ${u} starts a new component` : `cc[${u}] = ${cc[u]}: already labelled, skip`, { active: [u] }, { u });
      if (!fresh) continue;
      ccNum += 1;
      yield at(L.bump, `cc_num = ${ccNum}`, { active: [u] }, { u });
      yield at(L.start, `Run dfs_cc(${u}) to label everything reachable from ${u}`, { active: [u] }, { u });
      yield* visit(u);
    }
    yield at(L.forU, `u = ${n} is not < ${n}: the loop ends`);
    yield at(L.ret, `${ccNum} connected component${ccNum === 1 ? '' : 's'} found`);
    yield at(lastLine(CODE), `Done: ${ccNum} connected component${ccNum === 1 ? '' : 's'}`);
  },
};
