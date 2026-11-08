const CODE = [
  'void selection_sort(vector<int> &A) {',
  '  size_t pos = A.size() - 1;',
  '  for ( ; pos > 0; pos--) {',
  '    int max_idx = 0;',
  '    for (size_t i = 0; i <= pos; i++) {',
  '      if (A[i] > A[max_idx]) {',
  '        max_idx = i;',
  '      }',
  '    }',
  '    swap(A[pos], A[max_idx]);',
  '  }',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

export default {
  id: 'selection-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Selection sort',
  summary: 'Find the maximum of the unsorted part and swap it to the end of that part (the in-place version from the course).',
  renderer: 'array',
  complexity: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    note: 'The inner loop always scans pos + 1 items, so n + (n-1) + … + 2 comparisons happen even on sorted input (Θ(n²)). Only n-1 swaps are made. The course also shows a version that builds a second vector B; this one swaps in place.',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'A[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [5, 3, 1, 9, 4, 2, 7] }],
  },
  *run({ a }) {
    const n = a.length;
    // capacity n + 1 draws a spare slot for i = n when the last scan ends.
    const state = { mode: 'bars', capacity: n + 1, cells: a.map((value, index) => ({ key: `a${index}`, value })), pointers: { pos: null, i: null, max_idx: null } };
    yield { line: 0, msg: `Sort ${n} number${n === 1 ? '' : 's'}: repeatedly move the maximum to the end`, state, hl: {}, vars: { n } };
    let pos = n - 1;
    yield { line: 1, msg: `pos = ${pos}: A[0..${pos}] is the unsorted part`, state, hl: {}, vars: { n, pos } };
    for (; pos > 0; pos -= 1) {
      const sorted = range(pos + 1, n);
      state.pointers = { pos, i: null, max_idx: null };
      yield { line: 2, msg: `pos = ${pos} > 0: sort A[0..${pos}]`, state, hl: { done: sorted }, vars: { n, pos } };
      let maxIdx = 0;
      state.pointers = { pos, i: null, max_idx: maxIdx };
      yield { line: 3, msg: `Assume the maximum is A[0] = ${state.cells[0].value}`, state, hl: { done: sorted }, vars: { n, pos, max_idx: maxIdx } };
      for (let i = 0; i <= pos; i += 1) {
        state.pointers = { pos, i, max_idx: maxIdx };
        yield { line: 4, msg: `i = ${i} <= ${pos}: look at A[${i}]`, state, hl: { compare: [i], active: [maxIdx], done: sorted }, vars: { n, pos, max_idx: maxIdx, i } };
        const bigger = state.cells[i].value > state.cells[maxIdx].value;
        yield {
          line: 5,
          msg: `A[${i}] = ${state.cells[i].value} ${bigger ? '>' : '<='} A[${maxIdx}] = ${state.cells[maxIdx].value}${bigger ? ': new maximum' : ': keep the old one'}`,
          state,
          hl: { compare: [i, maxIdx], done: sorted },
          vars: { n, pos, max_idx: maxIdx, i },
        };
        if (bigger) {
          maxIdx = i;
          state.pointers = { pos, i, max_idx: maxIdx };
          yield { line: 6, msg: `max_idx = ${i}`, state, hl: { active: [i], done: sorted }, vars: { n, pos, max_idx: maxIdx, i } };
        }
      }
      state.pointers = { pos, i: pos + 1, max_idx: maxIdx };
      yield { line: 4, msg: `i = ${pos + 1} is not <= ${pos}: the scan ends, maximum is A[${maxIdx}] = ${state.cells[maxIdx].value}`, state, hl: { active: [maxIdx], done: sorted }, vars: { n, pos, max_idx: maxIdx, i: pos + 1 } };
      [state.cells[pos], state.cells[maxIdx]] = [state.cells[maxIdx], state.cells[pos]];
      yield {
        line: 9,
        msg: maxIdx === pos ? `The maximum is already at A[${pos}]: swap with itself` : `swap(A[${pos}], A[${maxIdx}]): the maximum goes to position ${pos}`,
        state,
        hl: { moved: [pos, maxIdx], done: range(pos, n) },
        vars: { n, pos, max_idx: maxIdx },
      };
    }
    state.pointers = { pos, i: null, max_idx: null };
    yield { line: 2, msg: `pos = ${pos} is not > 0: the loop ends`, state, hl: { done: range(0, n) }, vars: { n, pos } };
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: range(0, n) }, vars: { n } };
  },
};
