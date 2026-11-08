import { baseState, buildGraph, labelLines, lastLine, listPanel, nodeItems, show, tablePanel } from './graph-common.js';
import { graphField, startField, UNWEIGHTED_UNDIRECTED } from './graph-presets.js';

const CODE = [
  '// nodes A, B, C… are 0, 1, 2…; adj[u] lists the neighbours of u',
  'void bfs(int a, int n, vector<int> adj[], int dist[]) {',
  '  fill(dist, dist + n, -1);',
  '  queue<int> q;',
  '  q.push(a);',
  '  dist[a] = 0;',
  '  while (!q.empty()) {',
  '    int u = q.front();',
  '    q.pop();',
  '    for (int b : adj[u]) {',
  '      if (dist[b] == -1) {',
  '        dist[b] = dist[u] + 1;',
  '        q.push(b);',
  '      }',
  '    }',
  '  }',
  '}',
];

const L = labelLines(CODE, {
  fill: 'fill(dist', queue: 'queue<int> q;', pushStart: 'q.push(a);', distStart: 'dist[a] = 0;', loop: 'while (!q.empty())', front: 'int u = q.front();',
  pop: 'q.pop();', forB: 'for (int b : adj[u])', test: 'if (dist[b] == -1)', setDist: 'dist[b] = dist[u] + 1;', pushB: 'q.push(b);',
});

export default {
  id: 'bfs',
  side: 'algo',
  group: 'Graph',
  title: 'Breadth-first search',
  summary: 'Explore a graph level by level with a queue; dist[] counts the fewest edges from the start (course version with dist[]).',
  renderer: 'graph',
  complexity: {
    time: { best: 'O(n + e)', average: 'O(n + e)', worst: 'O(n + e)' },
    space: 'O(n)',
    note: 'Every node enters the queue at most once and every edge is looked at once (twice if undirected). The queue can hold O(n) nodes, for example in a star graph.',
  },
  code: CODE,
  input: { fields: [graphField(UNWEIGHTED_UNDIRECTED, { weighted: false }), startField()] },
  *run({ g: input, start }) {
    const g = buildGraph(input, { weighted: false });
    const n = g.ids.length;
    const dist = Object.fromEntries(g.ids.map((id) => [id, -1]));
    const queue = [];
    const order = [];
    const done = [];
    const tree = [];
    const panels = [listPanel('queue', 'queue q  (front → back)', n), tablePanel('dist', 'dist[]', g.ids, ['dist']), listPanel('order', 'order discovered', n)];
    const state = baseState(g, panels);
    const sync = () => {
      panels[0].items = nodeItems(queue);
      panels[1].rows[0].cells = g.ids.map((id) => show(dist[id]));
      panels[2].items = nodeItems(order);
      state.tags = Object.fromEntries(g.ids.map((id) => [id, dist[id] < 0 ? '' : `d=${dist[id]}`]));
    };
    const at = (line, msg, extra = {}, vars = {}) => {
      sync();
      return { line, msg, state, hl: { queued: [...queue], done: [...done], edgeTree: [...tree], ...extra }, vars: { a: start, u: null, b: null, ...vars, q: [...queue] } };
    };

    yield at(0, `Start BFS from ${start}`);
    yield at(L.fill, 'Mark every node as not reached: dist[x] = -1');
    yield at(L.queue, 'Create an empty queue q');
    queue.push(start);
    order.push(start);
    yield at(L.pushStart, `Push ${start} into the queue`);
    dist[start] = 0;
    yield at(L.distStart, `dist[${start}] = 0: the start is zero edges from itself`, { active: [start] });
    while (true) {
      yield at(L.loop, queue.length ? `The queue holds ${queue.length} node${queue.length > 1 ? 's' : ''}: keep going` : 'The queue is empty: the loop ends');
      if (!queue.length) break;
      const u = queue[0];
      yield at(L.front, `u = front = ${u}`, { active: [u] }, { u });
      queue.shift();
      yield at(L.pop, `Pop ${u} from the queue`, { active: [u] }, { u });
      for (const { to: b, key } of g.adj[u]) {
        yield at(L.forB, `Look at neighbour ${b} of ${u}`, { active: [u], compare: [b], edgeCurrent: [key] }, { u, b });
        const fresh = dist[b] === -1;
        yield at(L.test, fresh ? `dist[${b}] = -1: ${b} is new` : `dist[${b}] = ${dist[b]}: ${b} was already reached, skip`, { active: [u], compare: [b], edgeCurrent: [key], ...(fresh ? {} : { edgeRejected: [key], edgeCurrent: [] }) }, { u, b });
        if (!fresh) continue;
        dist[b] = dist[u] + 1;
        tree.push(key);
        yield at(L.setDist, `dist[${b}] = dist[${u}] + 1 = ${dist[b]}`, { active: [u], compare: [b], edgeCurrent: [key] }, { u, b });
        queue.push(b);
        order.push(b);
        yield at(L.pushB, `Push ${b} into the queue`, { active: [u], edgeCurrent: [key] }, { u, b });
      }
      yield at(L.forB, `${u} has no more neighbours`, { active: [u] }, { u });
      done.push(u);
    }
    const reached = order.length;
    yield at(lastLine(CODE), reached === n ? `Done: every node reached, order ${order.join(' ')}` : `Done: ${reached} of ${n} nodes reached (${order.join(' ')}); the others are unreachable (dist = -1)`);
  },
};
