import { pos } from '../render/table.js';

const CODE = [
  'int bino_DP(int n, int r) {',
  '  for (int i = 0; i <= n; i++) {',
  '    table[i][0] = 1;',
  '    table[i][i] = 1;',
  '  }',
  '  for (int i = 1; i <= n; i++) {',
  '    for (int j = 1; j < i; j++) {',
  '      table[i][j] = table[i-1][j] + table[i-1][j-1];',
  '    }',
  '  }',
  '  return table[n][r];',
  '}',
];

export default {
  id: 'binomial',
  side: 'algo',
  group: 'Dynamic programming',
  title: 'nCk (Pascal)',
  summary: 'Bottom-up DP from the slides: Pascal\'s triangle. C(i, j) = C(i-1, j) + C(i-1, j-1), with 1 on both edges. If r > n there is no way to choose, so the answer is 0.',
  renderer: 'table',
  complexity: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(n²)',
    note: 'The whole triangle up to row n is filled even though C(n, r) needs only part of it; the slides ask how to avoid that. Cells above the diagonal (j > i) are never used.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'n', label: 'n', min: 0, max: 10, default: 5 },
      { name: 'r', label: 'r', min: 0, max: 10, default: 2 },
    ],
  },
  *run({ n, r }) {
    const size = n + 1;
    const table = Array.from({ length: size }, () => Array(size).fill(null));
    const state = {
      rowHeaders: Array.from({ length: size }, (_, i) => i),
      colHeaders: Array.from({ length: size }, (_, j) => j),
      cells: table,
      caption: '',
    };
    const done = () => table.flatMap((row, i) => row.flatMap((v, j) => (v === null ? [] : [pos(i, j)])));
    const vars = (i, j) => ({ n, r, i, j });
    yield { line: 0, msg: `Build Pascal's triangle up to row ${n}: row i, column j holds C(i, j)`, state, hl: {}, vars: vars(null, null) };
    for (let i = 0; i <= n; i += 1) {
      yield { line: 1, msg: `i = ${i} <= ${n}: set the two edges of row ${i}`, state, hl: { done: done() }, vars: vars(i, null) };
      table[i][0] = 1;
      yield { line: 2, msg: `table[${i}][0] = 1: choosing 0 things from ${i}`, state, hl: { active: [pos(i, 0)], done: done() }, vars: vars(i, 0) };
      table[i][i] = 1;
      yield { line: 3, msg: `table[${i}][${i}] = 1: choosing all ${i} things`, state, hl: { active: [pos(i, i)], done: done() }, vars: vars(i, i) };
    }
    yield { line: 1, msg: `i = ${n + 1} is not <= ${n}: the edges are done`, state, hl: { done: done() }, vars: vars(n + 1, null) };
    for (let i = 1; i <= n; i += 1) {
      yield { line: 5, msg: `i = ${i} <= ${n}: fill the inside of row ${i}`, state, hl: { done: done() }, vars: vars(i, null) };
      for (let j = 1; j < i; j += 1) {
        yield { line: 6, msg: `j = ${j} < ${i}: compute table[${i}][${j}]`, state, hl: { done: done() }, vars: vars(i, j) };
        const up = table[i - 1][j];
        const diag = table[i - 1][j - 1];
        yield { line: 7, msg: `table[${i}][${j}] = table[${i - 1}][${j}] + table[${i - 1}][${j - 1}] = ${up} + ${diag}`, state, hl: { active: [pos(i, j)], compare: [pos(i - 1, j), pos(i - 1, j - 1)], arrows: [[pos(i - 1, j), pos(i, j)], [pos(i - 1, j - 1), pos(i, j)]], done: done() }, vars: vars(i, j) };
        table[i][j] = up + diag;
        yield { line: 7, msg: `table[${i}][${j}] = ${up + diag}`, state, hl: { active: [pos(i, j)], done: done() }, vars: vars(i, j) };
      }
      if (i > 1) yield { line: 6, msg: `j = ${i} is not < ${i}: row ${i} is complete`, state, hl: { done: done() }, vars: vars(i, i) };
    }
    yield { line: 5, msg: `i = ${n + 1} is not <= ${n}: the loop ends`, state, hl: { done: done() }, vars: vars(n + 1, null) };
    const answer = r <= n ? table[n][r] : 0;
    state.caption = r <= n ? `C(${n}, ${r}) = ${answer}` : `r = ${r} > n = ${n}: C = 0`;
    yield {
      line: 10,
      msg: r <= n ? `return table[${n}][${r}] = ${answer}` : `r = ${r} is larger than n = ${n}: there is nothing to choose, the answer is 0`,
      state,
      hl: { active: r <= n ? [pos(n, r)] : [], done: done() },
      vars: { n, r, answer },
    };
    yield { line: CODE.length - 1, msg: `Done: C(${n}, ${r}) = ${answer}`, state, hl: { active: r <= n ? [pos(n, r)] : [], done: done() }, vars: { n, r, answer } };
  },
};
