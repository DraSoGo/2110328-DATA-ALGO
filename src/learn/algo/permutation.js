const CODE = [
  'void perm(int n, vector<int> &sol, int len, vector<bool> &used) {',
  '  if (len < n) {',
  '    for (int i = 1; i <= n; i++) {',
  '      if (used[i] == false) {',
  '        used[i] = true;',
  '        sol[len] = i;',
  '        perm(n, sol, len + 1, used);',
  '        used[i] = false;',
  '      }',
  '    }',
  '  } else {',
  '    for (auto &x : sol) cout << x;',
  '    cout << endl;',
  '  }',
  '}',
  'void run(int n) {',
  '  vector<int> sol(n);',
  '  vector<bool> used(n + 1, false);',
  '  perm(n, sol, 0, used);',
  '}',
];

export default {
  id: 'permutation',
  side: 'algo',
  group: 'Brute force',
  title: 'Generate all permutations',
  summary: 'Backtracking from the brute-force slides: fill sol[len] with every unused item, recurse, then free it again.',
  renderer: 'arrays',
  complexity: {
    time: { best: 'O(n · n!)', average: 'O(n · n!)', worst: 'O(n · n!)' },
    space: 'O(n)',
    note: 'There are n! permutations, and the recursion tree has about e · n! nodes, each scanning n items. Printing one permutation costs O(n). Space is sol[], used[] and the recursion depth n. The demo limits n to 4 (24 permutations). used[] is indexed from 1, as in the slides.',
  },
  code: CODE,
  input: {
    fields: [{ name: 'n', label: 'n', min: 1, max: 4, default: 3 }],
  },
  *run({ n }) {
    const sol = Array(n).fill(null);
    const used = Array(n + 1).fill(false);
    const printed = [];
    const state = {
      capacity: n + 1,
      rows: [
        { name: 'sol', cells: sol.map(() => null), pointers: { len: null } },
        // Pointer indexes are row positions: item i sits at index i - 1 (the row is labelled from base 1).
        { name: 'used', base: 1, cells: used.slice(1).map((flag, index) => ({ key: `u${index + 1}`, value: 'F' })), pointers: { i: null } },
      ],
    };
    const [rowSol, rowUsed] = state.rows;
    const usedHl = () => used.map((flag, index) => (flag ? index - 1 : -1)).filter((index) => index >= 0);
    const hl = (extra = {}) => ({ ...extra, rows: [extra.rows?.[0] || {}, { done: usedHl(), ...(extra.rows?.[1] || {}) }] });
    const vars = (extra) => ({ n, sol: sol.map((value) => (value === null ? 0 : value)), used: used.slice(1).map((flag) => (flag ? 'T' : 'F')), printed: [...printed], ...extra });
    const setUsed = (i, flag) => {
      used[i] = flag;
      rowUsed.cells[i - 1] = { key: `u${i}`, value: flag ? 'T' : 'F' };
    };

    function* perm(len) {
      rowSol.pointers = { len };
      rowUsed.pointers = { i: null };
      yield { line: 0, msg: `perm(n, sol, len = ${len}, used): ${len} of ${n} positions are filled`, state, hl: hl({ active: len < n ? [len] : [] }), vars: vars({ len }) };
      if (len < n) {
        yield { line: 1, msg: `len = ${len} < n = ${n}: choose the item for position ${len}`, state, hl: hl({ active: [len] }), vars: vars({ len }) };
        for (let i = 1; i <= n; i += 1) {
          rowUsed.pointers = { i: i - 1 };
          yield { line: 2, msg: `i = ${i} <= ${n}: try item ${i}`, state, hl: hl({ rows: [{ active: [len] }, { compare: [i - 1] }] }), vars: vars({ len, i }) };
          if (used[i]) {
            yield { line: 3, msg: `used[${i}] is true: item ${i} is already in sol, skip it`, state, hl: hl({ rows: [{}, { compare: [i - 1] }] }), vars: vars({ len, i }) };
            continue;
          }
          yield { line: 3, msg: `used[${i}] is false: item ${i} is free`, state, hl: hl({ rows: [{}, { compare: [i - 1] }] }), vars: vars({ len, i }) };
          setUsed(i, true);
          yield { line: 4, msg: `used[${i}] = true: reserve item ${i}`, state, hl: hl({ rows: [{}, { active: [i - 1] }] }), vars: vars({ len, i }) };
          sol[len] = i;
          rowSol.cells[len] = { key: `p${len}`, value: i };
          yield { line: 5, msg: `sol[${len}] = ${i}`, state, hl: hl({ active: [len] }), vars: vars({ len, i }) };
          yield { line: 6, msg: `Recurse: fill position ${len + 1}`, state, hl: hl({ active: [len] }), vars: vars({ len, i }) };
          yield* perm(len + 1);
          rowSol.pointers = { len };
          rowUsed.pointers = { i: i - 1 };
          setUsed(i, false);
          yield { line: 7, msg: `Back from the recursion: used[${i}] = false, item ${i} is free for other positions`, state, hl: hl({ rows: [{}, { active: [i - 1] }] }), vars: vars({ len, i }) };
          sol[len] = null;
          rowSol.cells[len] = null;
        }
        rowUsed.pointers = { i: n };
        yield { line: 2, msg: `i = ${n + 1} is not <= ${n}: every choice for position ${len} has been tried, return`, state, hl: hl({}), vars: vars({ len, i: n + 1 }) };
      } else {
        yield { line: 10, msg: `len = ${len} is not < n: sol is complete`, state, hl: hl({ done: [...Array(n).keys()] }), vars: vars({ len }) };
        const text = sol.join('');
        printed.push(text);
        yield { line: 11, msg: `Print ${text}: permutation ${printed.length} of ${[...Array(n).keys()].reduce((f, k) => f * (k + 1), 1)}`, state, hl: hl({ done: [...Array(n).keys()] }), vars: vars({ len, output: text }) };
        yield { line: 12, msg: 'Newline, then return to the caller', state, hl: hl({ done: [...Array(n).keys()] }), vars: vars({ len }) };
      }
    }

    yield { line: 15, msg: `List every ordering of 1..${n}: ${[...Array(n).keys()].reduce((f, k) => f * (k + 1), 1)} permutations`, state, hl: hl({}), vars: vars({}) };
    yield { line: 16, msg: `sol has ${n} slots: it will hold one permutation`, state, hl: hl({}), vars: vars({}) };
    yield { line: 17, msg: `used[1..${n}] are all false (index 0 is unused)`, state, hl: hl({}), vars: vars({}) };
    yield { line: 18, msg: 'Start with len = 0: nothing chosen yet', state, hl: hl({}), vars: vars({}) };
    yield* perm(0);
    rowSol.pointers = { len: null };
    rowUsed.pointers = { i: null };
    yield { line: CODE.length - 1, msg: `Done: ${printed.length} permutations printed`, state, hl: hl({}), vars: vars({}) };
  },
};
