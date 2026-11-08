import { pos } from '../render/table.js';

const CODE = [
  'int knapsack(int W, int w[], int p[], int n) {   // items are 1..n',
  '  for (int b = 0; b <= W; b++) K[0][b] = 0;',
  '  for (int a = 0; a <= n; a++) K[a][0] = 0;',
  '  for (int a = 1; a <= n; a++) {',
  '    for (int b = 1; b <= W; b++) {',
  '      if (w[a] > b)',
  '        K[a][b] = K[a-1][b];',
  '      else',
  '        K[a][b] = max(K[a-1][b], K[a-1][b - w[a]] + p[a]);',
  '    }',
  '  }',
  '  // trace back: which items were taken?',
  '  for (int a = n, b = W; a > 0; a--) {',
  '    if (K[a][b] != K[a-1][b]) { take[a] = true; b -= w[a]; }',
  '  }',
  '  return K[n][W];',
  '}',
];

export default {
  id: 'knapsack',
  side: 'algo',
  group: 'Dynamic programming',
  title: '0/1 knapsack',
  summary: 'K[a][b] is the best total price using items 1..a with a sack of size b. Skip the item (copy the cell above) or take it (price + the cell above, w[a] columns to the left). Then trace back to find the items.',
  renderer: 'table',
  complexity: {
    time: { best: 'O(nW)', average: 'O(nW)', worst: 'O(nW)' },
    space: 'O(nW)',
    note: 'n items and capacity W: one cell per (item, size) pair. This is pseudo-polynomial: W is a number, not an input length. If the two lists have different lengths, only the first min(lengths) items are used.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'w', label: 'weights w[]', kind: 'list', min: 1, max: 12, minLength: 1, maxLength: 6, default: [2, 3, 4, 5] },
      { name: 'p', label: 'prices p[]', kind: 'list', min: 1, max: 20, minLength: 1, maxLength: 6, default: [3, 4, 5, 6] },
      { name: 'W', label: 'capacity W', min: 1, max: 12, default: 8 },
    ],
  },
  *run({ w, p, W }) {
    const n = Math.min(w.length, p.length);
    const K = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null));
    const state = {
      rowHeaders: ['no items', ...Array.from({ length: n }, (_, k) => `#${k + 1} w${w[k]} p${p[k]}`)],
      colHeaders: Array.from({ length: W + 1 }, (_, b) => b),
      cells: K,
      caption: '',
    };
    const done = () => K.flatMap((row, a) => row.flatMap((v, b) => (v === null ? [] : [pos(a, b)])));
    const vars = (a, b, extra = {}) => ({ W, n, a, b, ...extra });

    const note = w.length === p.length ? '' : ` (only the first ${n} of the lists are paired)`;
    yield { line: 0, msg: `${n} item${n === 1 ? '' : 's'}, capacity W = ${W}${note}`, state, hl: {}, vars: vars(null, null) };
    for (let b = 0; b <= W; b += 1) K[0][b] = 0;
    yield { line: 1, msg: 'With no items the best price is 0 for every size', state, hl: { done: done() }, vars: vars(0, null) };
    for (let a = 0; a <= n; a += 1) K[a][0] = 0;
    yield { line: 2, msg: 'A sack of size 0 holds nothing: first column is 0', state, hl: { done: done() }, vars: vars(null, 0) };

    for (let a = 1; a <= n; a += 1) {
      const wa = w[a - 1];
      const pa = p[a - 1];
      yield { line: 3, msg: `a = ${a} <= ${n}: item ${a} has weight ${wa} and price ${pa}`, state, hl: { done: done() }, vars: vars(a, null, { 'w[a]': wa, 'p[a]': pa }) };
      for (let b = 1; b <= W; b += 1) {
        const skip = K[a - 1][b];
        if (wa > b) {
          yield { line: 5, msg: `w[${a}] = ${wa} > b = ${b}: item ${a} does not fit`, state, hl: { active: [pos(a, b)], compare: [pos(a - 1, b)], arrows: [[pos(a - 1, b), pos(a, b)]], done: done() }, vars: vars(a, b, { 'w[a]': wa, 'p[a]': pa }) };
          K[a][b] = skip;
          yield { line: 6, msg: `K[${a}][${b}] = K[${a - 1}][${b}] = ${skip}`, state, hl: { active: [pos(a, b)], done: done() }, vars: vars(a, b, { 'w[a]': wa, 'p[a]': pa }) };
        } else {
          const take = K[a - 1][b - wa] + pa;
          yield { line: 8, msg: `Skip item ${a}: ${skip}. Take it: K[${a - 1}][${b - wa}] + ${pa} = ${take}. Keep the larger`, state, hl: { active: [pos(a, b)], compare: [pos(a - 1, b), pos(a - 1, b - wa)], arrows: [[pos(a - 1, b), pos(a, b)], [pos(a - 1, b - wa), pos(a, b)]], done: done() }, vars: vars(a, b, { 'w[a]': wa, 'p[a]': pa }) };
          K[a][b] = Math.max(skip, take);
          yield { line: 8, msg: `K[${a}][${b}] = max(${skip}, ${take}) = ${K[a][b]}`, state, hl: { active: [pos(a, b)], done: done() }, vars: vars(a, b, { 'w[a]': wa, 'p[a]': pa }) };
        }
      }
      yield { line: 4, msg: `b = ${W + 1} is not <= ${W}: row ${a} is complete`, state, hl: { done: done() }, vars: vars(a, W + 1) };
    }
    yield { line: 3, msg: `a = ${n + 1} is not <= ${n}: the table is full. Best price = K[${n}][${W}] = ${K[n][W]}`, state, hl: { active: [pos(n, W)], done: done() }, vars: vars(n + 1, null, { best: K[n][W] }) };

    let b = W;
    const path = [pos(n, W)];
    const taken = [];
    state.caption = 'Take: (nothing yet)';
    yield { line: 11, msg: `Trace back from K[${n}][${W}] = ${K[n][W]}`, state, hl: { path: [...path], done: done() }, vars: vars(n, b, { taken: [] }) };
    for (let a = n; a > 0; a -= 1) {
      const differs = K[a][b] !== K[a - 1][b];
      yield { line: 12, msg: `a = ${a}: compare K[${a}][${b}] = ${K[a][b]} with K[${a - 1}][${b}] = ${K[a - 1][b]}`, state, hl: { path: [...path], compare: [pos(a - 1, b)], done: done() }, vars: vars(a, b, { taken: [...taken] }) };
      if (differs) {
        taken.unshift(a);
        b -= w[a - 1];
        path.push(pos(a - 1, b));
        state.caption = `Take items ${taken.join(', ')}`;
        yield { line: 13, msg: `Different: item ${a} was taken (weight ${w[a - 1]}), so the sack shrinks to b = ${b}`, state, hl: { path: [...path], done: done() }, vars: vars(a, b, { taken: [...taken] }) };
      } else {
        path.push(pos(a - 1, b));
        yield { line: 13, msg: `Equal: item ${a} was not needed, stay at b = ${b}`, state, hl: { path: [...path], done: done() }, vars: vars(a, b, { taken: [...taken] }) };
      }
    }
    const weight = taken.reduce((sum, a) => sum + w[a - 1], 0);
    state.caption = taken.length ? `Take items ${taken.join(', ')}: weight ${weight} <= ${W}, price ${K[n][W]}` : `Take nothing: price ${K[n][W]}`;
    yield { line: 12, msg: 'a = 0: every item has been decided', state, hl: { path: [...path], done: done() }, vars: vars(0, b, { taken: [...taken] }) };
    yield { line: 15, msg: `return K[${n}][${W}] = ${K[n][W]}`, state, hl: { path: [...path], done: done() }, vars: vars(0, b, { taken: [...taken], best: K[n][W] }) };
    yield { line: CODE.length - 1, msg: taken.length ? `Done: take items ${taken.join(', ')} for a total price of ${K[n][W]} (weight ${weight} of ${W})` : 'Done: no item fits, so the best price is 0', state, hl: { path: [...path], done: done() }, vars: vars(0, b, { taken: [...taken], best: K[n][W] }) };
  },
};
