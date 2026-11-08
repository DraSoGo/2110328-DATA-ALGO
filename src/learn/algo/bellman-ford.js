import { baseState, buildGraph, INF, labelLines, lastLine, show, tablePanel } from './graph-common.js';
import { BELLMAN_GRAPHS, graphField, startField } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; E holds every arc {a, b, w} (an undirected edge is two arcs)',
  'bool bellman_ford(int n, vector<Arc>& E, int s, vector<int>& dist) {',
  '  vector<int> prev(n, -1);',
  '  dist.assign(n, INF);',
  '  dist[s] = 0;',
  '  for (int i = 1; i <= n - 1; i++) {',
  '    for (auto [a, b, w] : E) {',
  '      if (dist[a] != INF && dist[b] > dist[a] + w) {',
  '        dist[b] = dist[a] + w;',
  '        prev[b] = a;',
  '      }',
  '    }',
  '  }',
  '  for (auto [a, b, w] : E)',
  '    if (dist[a] != INF && dist[b] > dist[a] + w)',
  '      return false;                  // negative cycle',
  '  return true;',
  '}',
];

const exact = (text) => {
  const at = CODE.indexOf(text);
  if (at < 0) throw new Error(`missing code line ${text}`);
  return at;
};
const L = {
  ...labelLines(CODE, { prev: 'vector<int> prev(n', assign: 'dist.assign', distS: 'dist[s] = 0;', rounds: 'for (int i = 1', setDist: 'dist[b] = dist[a] + w;', setPrev: 'prev[b] = a;', fail: 'return false;', ok: 'return true;' }),
  forE: exact('    for (auto [a, b, w] : E) {'),
  test: exact('      if (dist[a] != INF && dist[b] > dist[a] + w) {'),
  checkFor: exact('  for (auto [a, b, w] : E)'),
  checkTest: exact('    if (dist[a] != INF && dist[b] > dist[a] + w)'),
};

export default {
  id: 'bellman-ford',
  side: 'algo',
  group: 'Shortest path',
  title: 'Bellman-Ford',
  summary: 'Shortest paths that allow negative edges: relax every edge n - 1 times (course version with one dist[] row). One more pass that still improves something proves a negative cycle reachable from the start.',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n e)', average: 'O(n e)', worst: 'O(n e)' },
    space: 'O(n)',
    note: 'n - 1 rounds, each scanning all e arcs, plus one more scan to detect a negative cycle. It is slower than Dijkstra (O(e log n)) but handles negative edges. A negative cycle that the start cannot reach is not detected.',
  },
  code: CODE,
  input: { fields: [graphField(BELLMAN_GRAPHS, { weighted: true, minWeight: -9, maxWeight: 20 }), startField()] },
  *run({ g: input, start: s }) {
    const g = buildGraph(input);
    const n = g.ids.length;
    const dist = Object.fromEntries(g.ids.map((id) => [id, INF]));
    const prev = Object.fromEntries(g.ids.map((id) => [id, null]));
    const prevKey = Object.fromEntries(g.ids.map((id) => [id, null]));
    let initialised = false;
    const panels = [tablePanel('dist', 'dist[] and prev[]', g.ids, ['dist', 'prev'])];
    const state = baseState(g, panels);
    state.negativeCycle = false;
    const at = (line, msg, extra = {}, vars = {}) => {
      panels[0].rows[0].cells = g.ids.map((id) => (initialised ? show(dist[id]) : ''));
      panels[0].rows[1].cells = g.ids.map((id) => (initialised ? (prev[id] ?? '-1') : ''));
      state.tags = initialised ? Object.fromEntries(g.ids.map((id) => [id, show(dist[id])])) : {};
      return { line, msg, state, hl: { edgeTree: g.ids.map((id) => prevKey[id]).filter(Boolean), ...extra }, vars: { s, ...vars } };
    };
    const arrow = g.directed ? '->' : '-';

    yield at(0, `Shortest distances from ${s}, negative edges allowed`);
    initialised = true;
    yield at(L.prev, 'prev[x] = -1 for every node');
    yield at(L.assign, 'dist[x] = INF: nothing is reached yet');
    dist[s] = 0;
    yield at(L.distS, `dist[${s}] = 0`, { active: [s] });
    for (let i = 1; i <= n - 1; i += 1) {
      yield at(L.rounds, `Round ${i} of ${n - 1}: relax every edge`, {}, { i });
      let changed = false;
      yield at(L.forE, `Scan all ${g.arcs.length} arcs`, {}, { i });
      for (const { a, b, w, key } of g.arcs) {
        const known = dist[a] !== INF;
        const better = known && dist[b] > dist[a] + w;
        const why = !known ? `dist[${a}] = ∞: ${a} is not reached, skip` : better ? `dist[${a}] + ${w} = ${dist[a] + w} < dist[${b}] = ${show(dist[b])}: relax` : `dist[${a}] + ${w} = ${dist[a] + w} >= dist[${b}] = ${show(dist[b])}: no change`;
        yield at(L.test, `${a}${arrow}${b} (${w}): ${why}`, { active: [a], compare: [b], ...(better ? { edgeCurrent: [key] } : { edgeRejected: [key] }) }, { i, a, b, w });
        if (!better) continue;
        changed = true;
        dist[b] = dist[a] + w;
        yield at(L.setDist, `dist[${b}] = ${dist[a]} + ${w} = ${dist[b]}`, { active: [a], compare: [b], edgeCurrent: [key] }, { i, a, b, w });
        prev[b] = a;
        prevKey[b] = key;
        yield at(L.setPrev, `prev[${b}] = ${a}`, { active: [a], compare: [b], edgeRelaxed: [key] }, { i, a, b, w });
      }
      yield at(L.forE, changed ? `End of round ${i}` : `End of round ${i}: nothing changed (later rounds cannot change anything either)`, {}, { i });
    }
    yield at(L.rounds, `i = ${n} is not <= ${n - 1}: all rounds are done`, {}, { i: n });
    yield at(L.checkFor, 'One more pass: can any edge still be relaxed?');
    for (const { a, b, w, key } of g.arcs) {
      const improves = dist[a] !== INF && dist[b] > dist[a] + w;
      yield at(L.checkTest, improves ? `${a}${arrow}${b} (${w}): dist[${a}] + ${w} = ${dist[a] + w} < dist[${b}] = ${dist[b]}: still improves` : `${a}${arrow}${b} (${w}): no improvement`, { active: [a], compare: [b], ...(improves ? { edgeBad: [key] } : { edgeCurrent: [key] }) }, { a, b, w });
      if (!improves) continue;
      // Walk back n steps from b to land inside the cycle, then collect it.
      const backPrev = { ...prev, [b]: a };
      const backKey = { ...prevKey, [b]: key };
      let x = b;
      for (let step = 0; step < n && x !== null; step += 1) x = backPrev[x];
      const cycle = [];
      const cycleEdges = [];
      for (let at0 = x; at0 !== null && !cycle.includes(at0); at0 = backPrev[at0]) {
        cycle.push(at0);
        cycleEdges.push(backKey[at0]);
      }
      state.negativeCycle = true;
      state.cycle = [...cycle].reverse();
      yield at(L.fail, `Negative cycle: a shorter path keeps appearing${cycle.length ? ` around ${[...cycle].reverse().join(' → ')}` : ''}, so distances are meaningless`, { bad: cycle, edgeBad: cycleEdges.filter(Boolean) }, { a, b, w });
      yield at(lastLine(CODE), 'Done: a negative cycle is reachable from the start, so there are no shortest paths', { bad: cycle, edgeBad: cycleEdges.filter(Boolean) });
      return;
    }
    yield at(L.ok, 'No edge improves: there is no negative cycle');
    const lost = g.ids.filter((id) => dist[id] === INF);
    yield at(lastLine(CODE), lost.length ? `Done: ${lost.join(', ')} cannot be reached from ${s} (dist = ∞); the rest are final` : `Done: shortest distances from ${s} to every node`);
  },
};
