import { baseState, buildGraph, INF, labelLines, lastLine, show, tablePanel } from './graph-common.js';
import { FLOYD_GRAPHS, graphField } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; w[i][j] is the edge weight, INF if there is no edge',
  'bool floyd_warshall(int n, int dist[][N], int w[][N]) {',
  '  for (int i = 0; i < n; i++)',
  '    for (int j = 0; j < n; j++)',
  '      dist[i][j] = (i == j) ? 0 : w[i][j];',
  '  for (int k = 0; k < n; k++)',
  '    for (int i = 0; i < n; i++)',
  '      for (int j = 0; j < n; j++)',
  '        if (dist[i][k] != INF && dist[k][j] != INF && dist[i][k] + dist[k][j] < dist[i][j])',
  '          dist[i][j] = dist[i][k] + dist[k][j];',
  '  for (int i = 0; i < n; i++)',
  '    if (dist[i][i] < 0) return false;   // negative cycle',
  '  return true;',
  '}',
];

const exact = (text) => {
  const at = CODE.indexOf(text);
  if (at < 0) throw new Error(`missing code line ${text}`);
  return at;
};
const L = {
  ...labelLines(CODE, { init: 'dist[i][j] = (i == j)', forK: 'for (int k = 0; k < n; k++)', test: 'if (dist[i][k] != INF', update: 'dist[i][j] = dist[i][k] + dist[k][j];', neg: 'if (dist[i][i] < 0)', ok: 'return true;' }),
  forI: exact('    for (int i = 0; i < n; i++)'),
  checkFor: exact('  for (int i = 0; i < n; i++)'),
};

export default {
  id: 'floyd-warshall',
  side: 'algo',
  group: 'Shortest path',
  title: 'Floyd-Warshall',
  summary: 'All-pairs shortest paths by dynamic programming: after round k, dist[i][j] is the shortest path that may use only the first k + 1 nodes as stops. A negative dist[i][i] reveals a negative cycle.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n³)', average: 'O(n³)', worst: 'O(n³)' },
    space: 'O(n²)',
    note: 'Three nested loops over n nodes. The node k must be the outermost loop. For dense graphs it matches Bellman-Ford run from every start, and for sparse graphs Dijkstra from every start is faster.',
  },
  code: CODE,
  input: { fields: [graphField(FLOYD_GRAPHS, { weighted: true, minWeight: -9, maxWeight: 20 })] },
  *run({ g: input }) {
    const g = buildGraph(input);
    const n = g.ids.length;
    const D = g.ids.map(() => g.ids.map(() => INF));
    let initialised = false;
    const matrix = tablePanel('dist', 'dist[i][j]  (row i to column j)', g.ids, g.ids);
    const state = baseState(g, [matrix]);
    state.negativeCycle = false;
    const at = (line, msg, { marks = [], ...extra } = {}, vars = {}) => {
      matrix.rows.forEach((row, r) => { row.cells = D[r].map((value) => (initialised ? show(value) : '')); });
      matrix.marks = marks;
      return { line, msg, state, hl: { ...extra }, vars: { ...vars } };
    };
    const id = (i) => g.ids[i];

    yield at(0, `All shortest paths between the ${n} nodes`);
    for (let i = 0; i < n; i += 1) D[i][i] = 0;
    for (const { a, b, w } of g.arcs) {
      const [i, j] = [g.ids.indexOf(a), g.ids.indexOf(b)];
      if (i !== j) D[i][j] = Math.min(D[i][j], w);
    }
    initialised = true;
    yield at(L.init, 'dist[i][i] = 0 and dist[i][j] = weight of edge i->j, or INF when there is none');
    for (let k = 0; k < n; k += 1) {
      yield at(L.forK, `k = ${id(k)}: allow paths that pass through ${id(k)}`, { active: [id(k)] }, { k: id(k) });
      for (let i = 0; i < n; i += 1) {
        yield at(L.forI, `i = ${id(i)}`, { active: [id(k)], compare: [id(i)] }, { k: id(k), i: id(i) });
        for (let j = 0; j < n; j += 1) {
          const via = D[i][k] !== INF && D[k][j] !== INF ? D[i][k] + D[k][j] : INF;
          const better = via < D[i][j];
          const marks = [{ r: i, c: j, kind: 'cur' }, { r: i, c: k, kind: 'ref' }, { r: k, c: j, kind: 'ref' }];
          const hl = { active: [id(k)], compare: [id(i), id(j)], marks };
          const why = via === INF ? `no path ${id(i)} -> ${id(k)} -> ${id(j)} yet` : `${id(i)}->${id(k)}->${id(j)} = ${D[i][k]} + ${D[k][j]} = ${via} ${better ? '<' : '>='} dist[${id(i)}][${id(j)}] = ${show(D[i][j])}${better ? ': shorter, update' : ': keep'}`;
          yield at(L.test, why, hl, { k: id(k), i: id(i), j: id(j) });
          if (!better) continue;
          D[i][j] = via;
          yield at(L.update, `dist[${id(i)}][${id(j)}] = ${via}`, { ...hl, marks: [{ r: i, c: j, kind: 'upd' }, { r: i, c: k, kind: 'ref' }, { r: k, c: j, kind: 'ref' }] }, { k: id(k), i: id(i), j: id(j) });
        }
      }
    }
    yield at(L.forK, `k = ${n} is not < ${n}: all rounds are done`);
    for (let i = 0; i < n; i += 1) {
      const negative = D[i][i] < 0;
      yield at(L.checkFor, `i = ${id(i)}`, { compare: [id(i)] }, { i: id(i) });
      yield at(L.neg, negative ? `dist[${id(i)}][${id(i)}] = ${D[i][i]} < 0: ${id(i)} lies on a negative cycle` : `dist[${id(i)}][${id(i)}] = ${D[i][i]}: fine`, { ...(negative ? { bad: [id(i)] } : { compare: [id(i)] }), marks: [{ r: i, c: i, kind: negative ? 'upd' : 'cur' }] }, { i: id(i) });
      if (negative) {
        state.negativeCycle = true;
        const onCycle = g.ids.filter((_, x) => D[x][x] < 0);
        yield at(lastLine(CODE), `Done: negative cycle through ${onCycle.join(', ')}; the distances are not valid shortest paths`, { bad: onCycle, marks: [{ r: i, c: i, kind: 'upd' }] });
        return;
      }
    }
    yield at(L.ok, 'No negative cycle');
    yield at(lastLine(CODE), `Done: dist[i][j] is the shortest distance from i to j (∞ means no path)`);
  },
};
