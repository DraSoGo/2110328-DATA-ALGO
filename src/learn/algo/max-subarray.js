const CODE = [
  'int mss(vector<int> &A, int start, int stop, vector<int> &S) {',
  '  if (start == stop) return A[start];',
  '  int m = (start + stop) / 2;',
  '  int r1 = mss(A, start, m, S);',
  '  int r2 = mss(A, m + 1, stop, S);',
  '  int r3 = A[start];',
  '  for (int p = start; p <= m; p++)',
  '    for (int q = m + 1; q <= stop; q++) {',
  '      int sum = S[q + 1] - S[p];   // A[p] + … + A[q]',
  '      if (sum > r3) r3 = sum;',
  '    }',
  '  return max(r1, max(r2, r3));',
  '}',
  'int max_subarray(vector<int> &A) {',
  '  vector<int> S(A.size() + 1, 0);',
  '  for (int i = 0; i < A.size(); i++) S[i + 1] = S[i] + A[i];',
  '  return mss(A, 0, A.size() - 1, S);',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);

export default {
  id: 'max-subarray',
  side: 'algo',
  group: 'Divide and conquer',
  title: 'Maximum sum subarray',
  summary: 'Best contiguous sum = max(best in the left half, best in the right half, best that crosses the middle), using prefix sums S (the slides\' mss1).',
  renderer: 'arrays',
  complexity: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(n)',
    note: 'The slides\' version checks every (p, q) pair that crosses the middle: (n/2)² of them, so T(n) = 2T(n/2) + O(n²) = O(n²), no better than the prefix-sum loop. Prefix sums make each sum O(1); S takes O(n) space. A cross-the-middle scan that grows outwards from m would make it O(n log n).',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'A[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [3, -4, 1, 2, -1, -1, 5, -4] }],
  },
  *run({ a }) {
    const n = a.length;
    const prefix = [0];
    a.forEach((x, i) => prefix.push(prefix[i] + x));
    const state = {
      capacity: n + 1,
      span: null,
      rows: [
        { name: 'A', cells: a.map((value, index) => ({ key: `a${index}`, value })), pointers: { p: null, q: null } },
        { name: 'S', cells: prefix.map((_, index) => (index === 0 ? { key: 's0', value: 0 } : null)), pointers: {} },
      ],
    };
    const [rowA, rowS] = state.rows;
    const mark = (p, q) => {
      rowA.pointers = { p, q };
    };
    let best = null;
    const values = () => prefix.map((value, index) => (rowS.cells[index] ? value : null));
    const vars = (extra) => ({ n, S: values(), ...extra });

    yield { line: 13, msg: `Find the best contiguous sum in ${n} number${n === 1 ? '' : 's'}, which may include negatives`, state, hl: {}, vars: vars({}) };
    yield { line: 14, msg: `S has ${n + 1} slots, S[0] = 0`, state, hl: { rows: [{}, { active: [0] }] }, vars: vars({}) };
    for (let i = 0; i < n; i += 1) {
      rowS.cells[i + 1] = { key: `s${i + 1}`, value: prefix[i + 1] };
      yield { line: 15, msg: `S[${i + 1}] = S[${i}] + A[${i}] = ${prefix[i]} + ${a[i]} = ${prefix[i + 1]}`, state, hl: { compare: [i], rows: [{}, { moved: [i + 1], compare: [i] }] }, vars: vars({ i }) };
    }
    yield { line: 15, msg: `i = ${n} is not < ${n}: S[j] is the sum of A[0..j-1], so A[p..q] = S[q+1] - S[p]`, state, hl: {}, vars: vars({}) };

    function* mss(start, stop, depth) {
      state.span = { lo: start, hi: stop };
      mark(null, null);
      const base = { depth, start, stop };
      yield { line: 0, msg: `mss(A, ${start}, ${stop}) at depth ${depth}`, state, hl: { active: range(start, stop) }, vars: vars(base) };
      if (start === stop) {
        yield { line: 1, msg: `One item: the best sum is A[${start}] = ${a[start]}`, state, hl: { done: [start] }, vars: vars({ ...base, result: a[start] }) };
        return { sum: a[start], p: start, q: start };
      }
      yield { line: 1, msg: `start = ${start} != stop = ${stop}: divide`, state, hl: { active: range(start, stop) }, vars: vars(base) };
      const m = (start + stop) >> 1;
      yield { line: 2, msg: `m = (${start} + ${stop}) / 2 = ${m}: left A[${start}..${m}], right A[${m + 1}..${stop}]`, state, hl: { active: range(start, m), compare: range(m + 1, stop) }, vars: vars({ ...base, m }) };
      yield { line: 3, msg: `r1 = best sum inside the left half`, state, hl: { active: range(start, m) }, vars: vars({ ...base, m }) };
      const left = yield* mss(start, m, depth + 1);
      state.span = { lo: start, hi: stop };
      yield { line: 3, msg: `r1 = ${left.sum}`, state, hl: { active: range(left.p, left.q) }, vars: vars({ ...base, m, r1: left.sum }) };
      yield { line: 4, msg: `r2 = best sum inside the right half`, state, hl: { compare: range(m + 1, stop) }, vars: vars({ ...base, m, r1: left.sum }) };
      const right = yield* mss(m + 1, stop, depth + 1);
      state.span = { lo: start, hi: stop };
      yield { line: 4, msg: `r2 = ${right.sum}`, state, hl: { compare: range(right.p, right.q) }, vars: vars({ ...base, m, r1: left.sum, r2: right.sum }) };
      let cross = { sum: a[start], p: start, q: start };
      yield { line: 5, msg: `r3 starts at A[${start}] = ${a[start]}; now try every p in the left half with every q in the right half`, state, hl: { active: [start] }, vars: vars({ ...base, m, r1: left.sum, r2: right.sum, r3: cross.sum }) };
      for (let p = start; p <= m; p += 1) {
        mark(p, null);
        yield { line: 6, msg: `p = ${p} <= ${m}`, state, hl: { active: [p] }, vars: vars({ ...base, m, p, r3: cross.sum }) };
        for (let q = m + 1; q <= stop; q += 1) {
          mark(p, q);
          const sum = prefix[q + 1] - prefix[p];
          const better = sum > cross.sum;
          yield {
            line: 8,
            msg: `sum = S[${q + 1}] - S[${p}] = ${prefix[q + 1]} - ${prefix[p]} = ${sum} (A[${p}..${q}])${better ? `: bigger than r3 = ${cross.sum}` : `: not bigger than r3 = ${cross.sum}`}`,
            state,
            hl: { active: range(p, q), rows: [{}, { compare: [q + 1, p] }] },
            vars: vars({ ...base, m, p, q, sum, r3: cross.sum }),
          };
          if (better) {
            cross = { sum, p, q };
            yield { line: 9, msg: `r3 = ${sum}`, state, hl: { done: range(p, q) }, vars: vars({ ...base, m, p, q, sum, r3: cross.sum }) };
          }
        }
        mark(p, stop + 1);
        yield { line: 7, msg: `q = ${stop + 1} is not <= ${stop}: next p`, state, hl: { active: [p] }, vars: vars({ ...base, m, p, q: stop + 1, r3: cross.sum }) };
      }
      mark(null, null);
      const winner = [left, right, cross].reduce((x, y) => (y.sum > x.sum ? y : x));
      yield { line: 11, msg: `max(r1 = ${left.sum}, r2 = ${right.sum}, r3 = ${cross.sum}) = ${winner.sum}`, state, hl: { done: range(winner.p, winner.q) }, vars: vars({ ...base, m, r1: left.sum, r2: right.sum, r3: cross.sum, result: winner.sum }) };
      return winner;
    }

    yield { line: 16, msg: `Call mss(A, 0, ${n - 1}, S)`, state, hl: {}, vars: vars({}) };
    best = yield* mss(0, n - 1, 0);
    state.span = null;
    yield { line: CODE.length - 1, msg: `Done: the best sum is ${best.sum}, from A[${best.p}] to A[${best.q}]`, state, hl: { done: range(best.p, best.q) }, vars: vars({ result: best.sum }) };
  },
};
