const CODE = [
  'struct Item { double v, w, x; };   // value, weight, fraction taken',
  'double fractional_knapsack(vector<Item> &A, double W) {',
  '  sort(A.begin(), A.end(),',
  '       [](Item a, Item b) { return a.v / a.w > b.v / b.w; });',
  '  double sumW = 0, value = 0;',
  '  for (int i = 0; i < A.size() && sumW < W; i++) {',
  '    if (sumW + A[i].w <= W) A[i].x = 1;',
  '    else A[i].x = (W - sumW) / A[i].w;',
  '    sumW += A[i].x * A[i].w;',
  '    value += A[i].x * A[i].v;',
  '  }',
  '  return value;',
  '}',
];

const round = (x) => Math.round(x * 100) / 100;

export default {
  id: 'fractional-knapsack',
  side: 'algo',
  group: 'Greedy',
  title: 'Fractional knapsack',
  summary: 'Sort items by value per weight, take whole items while they fit, then a fraction of the next one (the Greedy Knapsack from the slides).',
  renderer: 'timeline',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    note: 'Sorting dominates at O(n log n); the loop is O(n). Greedy is optimal here because items can be split. It is not optimal for the 0/1 knapsack, where an item is taken whole or not at all. Space is O(1) extra besides the sorted array.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'v', label: 'value[]', kind: 'list', min: 1, max: 99, minLength: 1, maxLength: 8, default: [66, 20, 30, 60, 40] },
      { name: 'w', label: 'weight[]', kind: 'list', min: 1, max: 99, minLength: 1, maxLength: 8, default: [30, 10, 20, 50, 40] },
      { name: 'W', label: 'capacity W', min: 1, max: 200, default: 100 },
    ],
  },
  *run({ v, w, W }) {
    const n = Math.min(v.length, w.length);
    const items = Array.from({ length: n }, (_, id) => ({ id, v: v[id], w: w[id], ratio: v[id] / w[id] }));
    const max = Math.max(W, ...items.map((item) => item.w));
    const describe = (item) => `#${item.id + 1} ${item.v}/${item.w}`;
    const order = items.map((item) => item.id);
    const bars = items.map((item) => ({ key: `item${item.id}`, row: item.id, from: 0, to: item.w, text: '' }));
    const state = { max, labelAt: 'in', rows: [], bars, mark: { at: W, text: `W = ${W}` } };
    const fraction = [];
    const done = [];
    const labelRows = () => {
      state.rows = [...order.map((id) => describe(items[id])), 'bag'];
    };
    labelRows();
    let sumW = 0;
    let value = 0;
    const vars = (extra) => ({ n, W, order: order.map((id) => id + 1), sumW: round(sumW), value: round(value), ...extra });
    const hl = (extra = {}) => ({ done: [...done], ...extra });

    yield { line: 1, msg: `${n} item${n === 1 ? '' : 's'} (shown as #id value/weight), a bag that holds W = ${W}. Items may be split`, state, hl: {}, vars: vars({}) };
    order.sort((x, y) => items[y].ratio - items[x].ratio || x - y);
    order.forEach((id, row) => {
      bars[id].row = row;
    });
    labelRows();
    yield { line: 2, msg: `Sort by value per weight (${order.map((id) => `#${id + 1}: ${round(items[id].ratio)}`).join(', ')}): the best deal first`, state, hl: {}, vars: vars({}) };
    yield { line: 4, msg: 'sumW = 0 (weight packed so far), value = 0', state, hl: {}, vars: vars({}) };
    state.bars.forEach((bar) => {
      bar.text = '';
    });
    for (let i = 0; i < n; i += 1) {
      const item = items[order[i]];
      if (!(sumW < W)) {
        yield { line: 5, msg: `sumW = ${round(sumW)} is not < W = ${W}: the bag is full, stop`, state, hl: hl(), vars: vars({ i }) };
        break;
      }
      yield { line: 5, msg: `i = ${i}: sumW = ${round(sumW)} < W = ${W}, consider #${item.id + 1} (value ${item.v}, weight ${item.w}, ${round(item.ratio)} per unit)`, state, hl: hl({ compare: [item.id] }), vars: vars({ i }) };
      let x;
      if (sumW + item.w <= W) {
        x = 1;
        yield { line: 6, msg: `sumW + ${item.w} = ${round(sumW + item.w)} <= ${W}: the whole item fits, x = 1`, state, hl: hl({ compare: [item.id] }), vars: vars({ i, x }) };
      } else {
        x = (W - sumW) / item.w;
        yield { line: 7, msg: `sumW + ${item.w} = ${round(sumW + item.w)} > ${W}: take only the fraction (${W} - ${round(sumW)}) / ${item.w} = ${round(x)}`, state, hl: hl({ compare: [item.id] }), vars: vars({ i, x: round(x) }) };
      }
      const taken = x * item.w;
      bars.push({ key: `take${item.id}`, row: bars[item.id].row, from: 0, to: taken, text: x === 1 ? '' : `${round(x)}` });
      done.push(bars.length - 1);
      bars.push({ key: `bag${item.id}`, row: n, from: sumW, to: sumW + taken, text: `#${item.id + 1}` });
      done.push(bars.length - 1);
      sumW += taken;
      yield { line: 8, msg: `sumW += ${round(x)} * ${item.w}: ${round(sumW)} of ${W} used`, state, hl: hl({ moved: [bars.length - 1] }), vars: vars({ i, x: round(x) }) };
      value += x * item.v;
      yield { line: 9, msg: `value += ${round(x)} * ${item.v}: value = ${round(value)}`, state, hl: hl({ moved: [bars.length - 1] }), vars: vars({ i, x: round(x) }) };
    }
    if (done.length / 2 === n) yield { line: 5, msg: `i = ${n} is not < ${n}: every item has been considered`, state, hl: hl(), vars: vars({ i: n }) };
    yield { line: 11, msg: `return value = ${round(value)}`, state, hl: hl(), vars: vars({ result: round(value) }) };
    yield { line: CODE.length - 1, msg: `Done: the best value for capacity ${W} is ${round(value)}`, state, hl: hl(), vars: vars({ result: round(value) }) };
  },
};
