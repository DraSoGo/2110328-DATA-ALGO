const CODE = [
  'struct Activity { int s, f; };',
  'vector<int> select_activities(vector<Activity> A) {',
  '  sort(A.begin(), A.end(),',
  '       [](Activity x, Activity y) { return x.f < y.f; });',
  '  vector<int> S = {0};',
  '  int j = 0;',
  '  for (int i = 1; i < A.size(); i++) {',
  '    if (A[i].s >= A[j].f) {',
  '      S.push_back(i);',
  '      j = i;',
  '    }',
  '  }',
  '  return S;',
  '}',
];

export default {
  id: 'interval-scheduling',
  side: 'algo',
  group: 'Greedy',
  title: 'Interval scheduling',
  summary: 'Activity selection: sort by finish time, then keep every activity that starts no earlier than the last chosen one finishes.',
  renderer: 'timeline',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    note: 'Sorting costs O(n log n); the greedy scan is O(n). The greedy choice (earliest finish first) is always part of some optimal schedule, so the result has the maximum number of non-overlapping activities. An activity that starts exactly when another finishes is allowed (s >= f). Activities whose finish is not after their start are widened to length 1.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 's', label: 'start[]', kind: 'list', min: 0, max: 20, minLength: 1, maxLength: 8, default: [1, 3, 0, 5, 3, 5, 6, 8] },
      { name: 'f', label: 'finish[]', kind: 'list', min: 1, max: 20, minLength: 1, maxLength: 8, default: [4, 5, 6, 7, 9, 9, 10, 11] },
    ],
  },
  *run({ s, f }) {
    const n = Math.min(s.length, f.length);
    const acts = Array.from({ length: n }, (_, id) => ({ id, s: s[id], f: Math.max(f[id], s[id] + 1) }));
    const max = Math.max(1, ...acts.map((act) => act.f));
    const order = acts.map((act) => act.id);
    const bars = acts.map((act) => ({ key: `act${act.id}`, row: act.id, from: act.s, to: act.f, text: `#${act.id + 1}` }));
    const state = { max, labelAt: 'in', rows: Array.from({ length: n }, (_, row) => `A[${row}]`), bars, mark: null };
    const chosen = [];
    const sortedActs = () => order.map((id) => acts[id]);
    const vars = (extra) => ({ n, order: order.map((id) => id + 1), S: chosen.map((id) => id + 1), ...extra });
    const hl = (extra = {}) => ({ done: [...chosen], ...extra });
    const adjusted = acts.filter((act, id) => f[id] <= s[id]).length;

    yield {
      line: 1,
      msg: `${n} activit${n === 1 ? 'y' : 'ies'} with start and finish times${n < Math.max(s.length, f.length) ? ' (extra values without a partner are ignored)' : ''}${adjusted ? `; ${adjusted} had finish <= start and were widened to length 1` : ''}. Pick as many non-overlapping ones as possible`,
      state,
      hl: {},
      vars: vars({}),
    };
    order.sort((x, y) => acts[x].f - acts[y].f || x - y);
    order.forEach((id, row) => {
      bars[id].row = row;
    });
    yield { line: 2, msg: 'Sort by finish time: the activity that frees the resource earliest comes first', state, hl: {}, vars: vars({}) };
    chosen.push(order[0]);
    let j = 0;
    state.mark = { at: sortedActs()[0].f, text: `last finish = ${sortedActs()[0].f}` };
    yield { line: 4, msg: `S = {0}: the earliest finisher (#${order[0] + 1}, ends at ${sortedActs()[0].f}) is always safe to take`, state, hl: hl(), vars: vars({ j }) };
    yield { line: 5, msg: `j = 0: A[0] is the last chosen activity`, state, hl: hl(), vars: vars({ j }) };
    for (let i = 1; i < n; i += 1) {
      const act = sortedActs()[i];
      const last = sortedActs()[j];
      yield { line: 6, msg: `i = ${i} < ${n}: look at A[${i}] = #${act.id + 1} [${act.s}, ${act.f}]`, state, hl: hl({ compare: [act.id], active: [last.id] }), vars: vars({ i, j }) };
      const fits = act.s >= last.f;
      yield {
        line: 7,
        msg: `A[${i}].s = ${act.s} ${fits ? '>=' : '<'} A[${j}].f = ${last.f}: ${fits ? 'no overlap, take it' : 'it starts before the last chosen one ends, skip it'}`,
        state,
        hl: hl({ compare: [act.id], active: [last.id] }),
        vars: vars({ i, j }),
      };
      if (!fits) {
        continue;
      }
      chosen.push(act.id);
      yield { line: 8, msg: `S gets ${i}: activity #${act.id + 1} is chosen`, state, hl: hl({ active: [act.id] }), vars: vars({ i, j }) };
      j = i;
      state.mark = { at: act.f, text: `last finish = ${act.f}` };
      yield { line: 9, msg: `j = ${i}: the new last chosen activity ends at ${act.f}`, state, hl: hl(), vars: vars({ i, j }) };
    }
    yield { line: 6, msg: `i = ${n} is not < ${n}: every activity has been considered`, state, hl: hl(), vars: vars({ i: n, j }) };
    yield { line: 12, msg: `return S: ${chosen.length} activit${chosen.length === 1 ? 'y' : 'ies'} (${chosen.map((id) => `#${id + 1}`).join(', ')})`, state, hl: hl(), vars: vars({ size: chosen.length }) };
    yield { line: CODE.length - 1, msg: `Done: the greedy schedule has ${chosen.length} activit${chosen.length === 1 ? 'y' : 'ies'}, the maximum possible`, state, hl: hl(), vars: vars({ size: chosen.length }) };
  },
};
