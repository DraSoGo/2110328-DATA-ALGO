import { pos } from '../render/table.js';

const CODE = [
  'int fibo_bottom_up(int n) {',
  '  value[0] = 0;',
  '  value[1] = 1;',
  '  for (int i = 2; i <= n; ++i) {',
  '    value[i] = value[i-1] + value[i-2];',
  '  }',
  '  return value[n];',
  '}',
];

export default {
  id: 'fibonacci-table',
  side: 'algo',
  group: 'Dynamic programming',
  title: 'Fibonacci (bottom-up)',
  summary: 'Bottom-up DP from the slides: start from F(0) and F(1) and fill the table left to right, each cell from the two before it.',
  renderer: 'table',
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n)',
    note: 'One table cell per subproblem and O(1) work per cell. Only the last two cells are ever read, so the optimised version in the slides needs just O(1) space.',
  },
  code: CODE,
  input: { fields: [{ name: 'n', label: 'n', min: 0, max: 15, default: 8 }] },
  *run({ n }) {
    const size = Math.max(n, 1) + 1;
    const value = Array(size).fill(null);
    const state = { colHeaders: Array.from({ length: size }, (_, k) => k), rowHeaders: ['value'], cells: [value], caption: '' };
    const filled = () => value.flatMap((v, k) => (v === null ? [] : [pos(0, k)]));
    const vars = (i) => ({ n, i, value: value.map((v) => (v === null ? 0 : v)) });
    yield { line: 0, msg: `Build F(0)..F(${n}) from the bottom`, state, hl: {}, vars: vars(null) };
    value[0] = 0;
    state.caption = 'F(0) = 0';
    yield { line: 1, msg: 'Base case: value[0] = 0', state, hl: { active: [pos(0, 0)] }, vars: vars(null) };
    if (n >= 1) {
      value[1] = 1;
      state.caption = 'F(1) = 1';
      yield { line: 2, msg: 'Base case: value[1] = 1', state, hl: { active: [pos(0, 1)], done: [pos(0, 0)] }, vars: vars(null) };
    }
    for (let i = 2; i <= n; i += 1) {
      yield { line: 3, msg: `i = ${i} <= ${n}: compute value[${i}]`, state, hl: { done: filled() }, vars: vars(i) };
      const a = value[i - 1];
      const b = value[i - 2];
      yield { line: 4, msg: `value[${i}] = value[${i - 1}] + value[${i - 2}] = ${a} + ${b}`, state, hl: { active: [pos(0, i)], compare: [pos(0, i - 1), pos(0, i - 2)], arrows: [[pos(0, i - 1), pos(0, i)], [pos(0, i - 2), pos(0, i)]], done: filled() }, vars: vars(i) };
      value[i] = a + b;
      state.caption = `F(${i}) = ${a} + ${b} = ${value[i]}`;
      yield { line: 4, msg: `value[${i}] = ${value[i]}`, state, hl: { active: [pos(0, i)], done: filled() }, vars: vars(i) };
    }
    if (n >= 2) yield { line: 3, msg: `i = ${n + 1} is not <= ${n}: the loop ends`, state, hl: { done: filled() }, vars: vars(n + 1) };
    state.caption = `F(${n}) = ${value[n]}`;
    yield { line: 6, msg: `return value[${n}] = ${value[n]}`, state, hl: { active: [pos(0, n)], done: filled() }, vars: vars(n) };
    yield { line: CODE.length - 1, msg: `Done: F(${n}) = ${value[n]}`, state, hl: { active: [pos(0, n)], done: filled() }, vars: vars(n) };
  },
};
