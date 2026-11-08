import { pos } from '../render/table.js';

const CODE = [
  'string lcs(string A, string B) {',
  '  int m = A.size(), n = B.size();',
  '  for (int i = 0; i <= m; i++) L[i][0] = 0;',
  '  for (int j = 0; j <= n; j++) L[0][j] = 0;',
  '  for (int i = 1; i <= m; i++) {',
  '    for (int j = 1; j <= n; j++) {',
  '      if (A[i-1] == B[j-1])',
  '        L[i][j] = L[i-1][j-1] + 1;',
  '      else',
  '        L[i][j] = max(L[i-1][j], L[i][j-1]);',
  '    }',
  '  }',
  '  // trace back from L[m][n] to recover one LCS',
  '  string s;',
  '  for (int i = m, j = n; i > 0 && j > 0; ) {',
  '    if (A[i-1] == B[j-1]) { s = A[i-1] + s; i--; j--; }',
  '    else if (L[i-1][j] >= L[i][j-1]) i--;',
  '    else j--;',
  '  }',
  '  return s;',
  '}',
];

const LETTERS = { kind: 'text', minLength: 1, maxLength: 8, pattern: '^[A-Z]+$', patternHint: 'Use letters A–Z', uppercase: true };

export default {
  id: 'lcs',
  side: 'algo',
  group: 'Dynamic programming',
  title: 'Longest common subsequence',
  summary: 'L[i][j] is the LCS length of the first i letters of A and the first j letters of B: a match extends the diagonal, otherwise take the better of up and left. Then trace back from the corner.',
  renderer: 'table',
  complexity: {
    time: { best: 'O(mn)', average: 'O(mn)', worst: 'O(mn)' },
    space: 'O(mn)',
    note: 'm and n are the string lengths. Every cell is computed once; the trace back adds O(m + n). Several LCSs can exist: this trace prefers moving up when the up and left cells tie.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'A', label: 'A', default: 'ABCBDAB', ...LETTERS },
      { name: 'B', label: 'B', default: 'BDCABA', ...LETTERS },
    ],
  },
  *run({ A, B }) {
    const m = A.length;
    const n = B.length;
    const L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
    const state = {
      rowHeaders: ['ε', ...A],
      colHeaders: ['ε', ...B],
      cells: L,
      caption: '',
    };
    const done = () => L.flatMap((row, i) => row.flatMap((v, j) => (v === null ? [] : [pos(i, j)])));
    const vars = (i, j, extra = {}) => ({ m, n, i, j, ...extra });

    yield { line: 0, msg: `Compare A = ${A} and B = ${B}`, state, hl: {}, vars: vars(null, null) };
    yield { line: 1, msg: `m = ${m}, n = ${n}: the table has ${m + 1} rows and ${n + 1} columns`, state, hl: {}, vars: vars(null, null) };
    for (let i = 0; i <= m; i += 1) L[i][0] = 0;
    yield { line: 2, msg: 'First column is 0: nothing in common with an empty B', state, hl: { done: done() }, vars: vars(null, 0) };
    for (let j = 0; j <= n; j += 1) L[0][j] = 0;
    yield { line: 3, msg: 'First row is 0: nothing in common with an empty A', state, hl: { done: done() }, vars: vars(0, null) };

    for (let i = 1; i <= m; i += 1) {
      yield { line: 4, msg: `i = ${i} <= ${m}: row for A[${i - 1}] = ${A[i - 1]}`, state, hl: { done: done() }, vars: vars(i, null) };
      for (let j = 1; j <= n; j += 1) {
        const a = A[i - 1];
        const b = B[j - 1];
        const same = a === b;
        yield { line: 6, msg: `A[${i - 1}] = ${a} ${same ? '==' : '!='} B[${j - 1}] = ${b}`, state, hl: { active: [pos(i, j)], done: done() }, vars: vars(i, j) };
        if (same) {
          const diag = L[i - 1][j - 1];
          yield { line: 7, msg: `Match: L[${i}][${j}] = L[${i - 1}][${j - 1}] + 1 = ${diag} + 1`, state, hl: { active: [pos(i, j)], compare: [pos(i - 1, j - 1)], arrows: [[pos(i - 1, j - 1), pos(i, j)]], done: done() }, vars: vars(i, j) };
          L[i][j] = diag + 1;
        } else {
          const up = L[i - 1][j];
          const left = L[i][j - 1];
          yield { line: 9, msg: `No match: L[${i}][${j}] = max(up ${up}, left ${left}) = ${Math.max(up, left)}`, state, hl: { active: [pos(i, j)], compare: [pos(i - 1, j), pos(i, j - 1)], arrows: [[pos(i - 1, j), pos(i, j)], [pos(i, j - 1), pos(i, j)]], done: done() }, vars: vars(i, j) };
          L[i][j] = Math.max(up, left);
        }
        yield { line: same ? 7 : 9, msg: `L[${i}][${j}] = ${L[i][j]}`, state, hl: { active: [pos(i, j)], done: done() }, vars: vars(i, j) };
      }
      yield { line: 5, msg: `j = ${n + 1} is not <= ${n}: row ${i} is complete`, state, hl: { done: done() }, vars: vars(i, n + 1) };
    }
    yield { line: 4, msg: `i = ${m + 1} is not <= ${m}: the table is full. LCS length = L[${m}][${n}] = ${L[m][n]}`, state, hl: { active: [pos(m, n)], done: done() }, vars: vars(m + 1, null, { length: L[m][n] }) };

    let s = '';
    let i = m;
    let j = n;
    const path = [pos(i, j)];
    state.caption = 'LCS = ';
    yield { line: 12, msg: `Trace back from L[${m}][${n}] = ${L[m][n]}`, state, hl: { path: [...path], done: done() }, vars: vars(i, j, { s }) };
    yield { line: 13, msg: 'Start with an empty string s', state, hl: { path: [...path], done: done() }, vars: vars(i, j, { s }) };
    while (i > 0 && j > 0) {
      if (A[i - 1] === B[j - 1]) {
        s = A[i - 1] + s;
        yield { line: 15, msg: `A[${i - 1}] = B[${j - 1}] = ${A[i - 1]}: it belongs to the LCS, move diagonally`, state, hl: { path: [...path], active: [pos(i, j)], done: done() }, vars: vars(i, j, { s }) };
        i -= 1;
        j -= 1;
      } else if (L[i - 1][j] >= L[i][j - 1]) {
        yield { line: 16, msg: `A[${i - 1}] != B[${j - 1}] and up ${L[i - 1][j]} >= left ${L[i][j - 1]}: move up`, state, hl: { path: [...path], compare: [pos(i - 1, j)], done: done() }, vars: vars(i, j, { s }) };
        i -= 1;
      } else {
        yield { line: 17, msg: `A[${i - 1}] != B[${j - 1}] and left ${L[i][j - 1]} > up ${L[i - 1][j]}: move left`, state, hl: { path: [...path], compare: [pos(i, j - 1)], done: done() }, vars: vars(i, j, { s }) };
        j -= 1;
      }
      path.push(pos(i, j));
      state.caption = `LCS = ${s}`;
      yield { line: 14, msg: i > 0 && j > 0 ? `Now at L[${i}][${j}]; s = "${s}"` : `i = ${i}, j = ${j}: the loop ends; s = "${s}"`, state, hl: { path: [...path], done: done() }, vars: vars(i, j, { s }) };
    }
    state.caption = `LCS = ${s || '(empty)'}`;
    yield { line: 19, msg: `return s = "${s}" (length ${s.length} = L[${m}][${n}])`, state, hl: { path: [...path], done: done() }, vars: vars(i, j, { s }) };
    yield { line: CODE.length - 1, msg: s ? `Done: one longest common subsequence is ${s}` : 'Done: A and B share no letters, so the LCS is empty', state, hl: { path: [...path], done: done() }, vars: vars(i, j, { s }) };
  },
};
