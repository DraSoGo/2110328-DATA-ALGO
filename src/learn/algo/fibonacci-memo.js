import { pos } from '../render/table.js';

const CODE = [
  'int table[16] = {0};   // 0 means "not computed yet"',
  'int fibo_memo(int n) {',
  '  if (n == 1 || n == 0)',
  '    return n;',
  '  if (n >= 2) {',
  '    if (table[n] > 0) {',
  '      return table[n];                    // use',
  '    }',
  '    int value = fibo_memo(n-1) + fibo_memo(n-2);',
  '    table[n] = value;                     // remember',
  '    return value;',
  '  }',
  '}',
];

export default {
  id: 'fibonacci-memo',
  side: 'algo',
  group: 'Dynamic programming',
  title: 'Fibonacci (memoised)',
  summary: 'Top-down DP from the slides: plain recursion plus a lookup table, so every F(k) is computed once and later calls reuse it.',
  renderer: 'table',
  complexity: {
    time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n)',
    note: 'Best case is n = 0 or 1 (no recursion). Otherwise each F(k) is computed once and every other call is a table hit, so there are about 2n calls. The recursion stack is n deep.',
  },
  code: CODE,
  input: { fields: [{ name: 'n', label: 'n', min: 0, max: 15, default: 6 }] },
  *run({ n }) {
    const size = Math.max(n, 1) + 1;
    const table = Array(size).fill(0);
    const calledAt = Array(size).fill(null);
    const returnedAt = Array(size).fill(null);
    let calls = 0;
    let returns = 0;
    let depth = 0;
    const state = {
      rowHeaders: ['table', 'call #', 'return #'],
      colHeaders: Array.from({ length: size }, (_, k) => k),
      cells: [Array(size).fill(null), calledAt, returnedAt],
      caption: `fibo_memo(${n}): calls = 0`,
    };
    const stored = () => table.map((value) => (value > 0 ? value : null));
    const sync = () => {
      state.cells = [stored(), [...calledAt], [...returnedAt]];
      state.caption = `calls = ${calls}, returns = ${returns}, depth = ${depth}`;
    };
    const doneCells = () => table.flatMap((value, k) => (value > 0 ? [pos(0, k)] : []));
    const vars = (k, extra = {}) => ({ n, 'call n': k, depth, calls, table: [...table], ...extra });

    function* fibo(k) {
      calls += 1;
      depth += 1;
      if (calledAt[k] === null) calledAt[k] = calls;
      sync();
      yield { line: 1, msg: `Call #${calls}: fibo_memo(${k}) (recursion depth ${depth})`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k) };
      yield { line: 2, msg: k <= 1 ? `n = ${k} is 0 or 1: a base case` : `n = ${k} is not 0 or 1: it needs the table or a recursion`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k) };
      let result;
      if (k <= 1) {
        result = k;
        yield { line: 3, msg: `return ${k}`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k, { value: k }) };
      } else {
        yield { line: 4, msg: `n = ${k} >= 2`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k) };
        const hit = table[k] > 0;
        yield { line: 5, msg: hit ? `table[${k}] = ${table[k]} > 0: it is already computed (memo hit)` : `table[${k}] = 0: not computed yet, so recurse`, state, hl: { active: [pos(1, k)], compare: hit ? [pos(0, k)] : [], done: doneCells() }, vars: vars(k) };
        if (hit) {
          result = table[k];
          yield { line: 6, msg: `Memo hit: return table[${k}] = ${result} without recursing`, state, hl: { active: [pos(1, k)], compare: [pos(0, k)], done: doneCells() }, vars: vars(k, { value: result }) };
        } else {
          yield { line: 8, msg: `Compute fibo_memo(${k - 1}) first`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k) };
          const first = yield* fibo(k - 1);
          yield { line: 8, msg: `fibo_memo(${k - 1}) = ${first}; now compute fibo_memo(${k - 2})`, state, hl: { active: [pos(1, k)], compare: first > 0 ? [pos(0, k - 1)] : [], done: doneCells() }, vars: vars(k, { first }) };
          const second = yield* fibo(k - 2);
          result = first + second;
          yield { line: 8, msg: `value = ${first} + ${second} = ${result}`, state, hl: { active: [pos(1, k)], done: doneCells() }, vars: vars(k, { value: result }) };
          table[k] = result;
          sync();
          yield { line: 9, msg: `Remember: table[${k}] = ${result}`, state, hl: { active: [pos(0, k)], done: doneCells() }, vars: vars(k, { value: result }) };
          yield { line: 10, msg: `return ${result}`, state, hl: { active: [pos(0, k)], done: doneCells() }, vars: vars(k, { value: result }) };
        }
      }
      returns += 1;
      depth -= 1;
      if (returnedAt[k] === null) returnedAt[k] = returns;
      sync();
      return result;
    }

    yield { line: 0, msg: `table is empty. Compute fibo_memo(${n})`, state, hl: {}, vars: vars(n) };
    const answer = yield* fibo(n);
    yield { line: CODE.length - 1, msg: `Done: F(${n}) = ${answer} after ${calls} call${calls === 1 ? '' : 's'}`, state, hl: { done: doneCells() }, vars: vars(n, { value: answer }) };
  },
};
