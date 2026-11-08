const CODE = [
  'void fix_down(vector<int> &A, int size, int k) {',
  '  int c;',
  '  while ((c = 2 * k + 1) < size) {',
  '    if (c < size - 1 && A[c] < A[c + 1]) c++;',
  '    if (!(A[k] < A[c])) break;',
  '    swap(A[c], A[k]);',
  '    k = c;',
  '  }',
  '}',
  'void heap_sort(vector<int> &A) {',
  '  int size = A.size();',
  '  for (int k = size / 2 - 1; k >= 0; k--) fix_down(A, size, k);',
  '  for (int k = size - 1; k > 0; k--) {',
  '    swap(A[0], A[k]);',
  '    fix_down(A, --size, 0);',
  '  }',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);

export default {
  id: 'heap-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Heap sort',
  summary: 'Selection sort with a binary max-heap: build the heap in place, then repeatedly swap the root to the end and fix_down.',
  renderer: 'array',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    note: 'build_heap is O(n) (fix_down from n/2-1 down to 0). Then n-1 pops each cost one fix_down, O(log n). The heap lives in A[0..size-1]; children of k are 2k+1 and 2k+2 (the 0-based formulas from the course).',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'A[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [12, 5, 27, 11, 10, 25, 1, 12] }],
  },
  *run({ a }) {
    const n = a.length;
    const cells = a.map((value, index) => ({ key: `a${index}`, value }));
    const state = { mode: 'bars', capacity: n + 1, cells, pointers: { k: null, c: null, size: n } };
    let size = n;
    const sorted = () => range(size, n - 1);
    const mark = (k, c) => {
      state.pointers = { k, c, size };
    };
    const v = (index) => cells[index].value;

    function* fixDown(k) {
      let c;
      const vars = (extra) => ({ n, size, k, ...(c === undefined ? {} : { c }), ...extra });
      mark(k, null);
      yield { line: 0, msg: `fix_down(A, ${size}, ${k}): sink A[${k}] = ${v(k)} until both children are smaller`, state, hl: { active: [k], done: sorted() }, vars: vars({}) };
      yield { line: 1, msg: 'c will hold the larger child', state, hl: { active: [k], done: sorted() }, vars: vars({}) };
      while (true) {
        c = 2 * k + 1;
        mark(k, c < size ? c : null);
        yield {
          line: 2,
          msg: c < size ? `c = 2*${k} + 1 = ${c} < size ${size}: A[${k}] has a left child` : `c = 2*${k} + 1 = ${c} is not < size ${size}: A[${k}] is a leaf, stop`,
          state,
          hl: { active: [k], compare: c < size ? [c] : [], done: sorted() },
          vars: vars({}),
        };
        if (!(c < size)) return;
        if (c < size - 1) {
          const left = c;
          const right = v(left) < v(left + 1);
          if (right) c += 1;
          mark(k, c);
          yield { line: 3, msg: `A[${left}] = ${v(left)} ${right ? '<' : '>='} A[${left + 1}] = ${v(left + 1)}: the larger child is c = ${c}`, state, hl: { active: [k], compare: [left, left + 1], done: sorted() }, vars: vars({}) };
        } else {
          yield { line: 3, msg: `c = ${c} is the last item of the heap: it is the only child`, state, hl: { active: [k], compare: [c], done: sorted() }, vars: vars({}) };
        }
        const smaller = v(k) < v(c);
        yield { line: 4, msg: `A[${k}] = ${v(k)} ${smaller ? '<' : '>='} A[${c}] = ${v(c)}${smaller ? ': the child is bigger, swap down' : ': heap order holds, stop'}`, state, hl: { active: [k], compare: [c], done: sorted() }, vars: vars({}) };
        if (!smaller) return;
        [cells[c], cells[k]] = [cells[k], cells[c]];
        yield { line: 5, msg: `swap(A[${c}], A[${k}])`, state, hl: { moved: [k, c], done: sorted() }, vars: vars({}) };
        k = c;
        mark(k, c);
        yield { line: 6, msg: `k = ${k}`, state, hl: { active: [k], done: sorted() }, vars: vars({}) };
      }
    }

    yield { line: 9, msg: `Sort ${n} number${n === 1 ? '' : 's'}: build a max-heap, then pop the maximum n-1 times`, state, hl: {}, vars: { n } };
    yield { line: 10, msg: `size = ${n}: the heap is all of A[0..${n - 1}]`, state, hl: {}, vars: { n, size } };
    for (let k = (n >> 1) - 1; k >= 0; k -= 1) {
      mark(k, null);
      yield { line: 11, msg: `Build the heap: fix_down(A, ${size}, ${k}) (k = size/2 - 1 down to 0)`, state, hl: { active: [k] }, vars: { n, size, k } };
      yield* fixDown(k);
    }
    mark(null, null);
    yield { line: 11, msg: 'k < 0: A[0..size-1] is now a max-heap, A[0] is the maximum', state, hl: { active: [0] }, vars: { n, size, k: -1 } };
    for (let k = n - 1; k > 0; k -= 1) {
      mark(0, null);
      yield { line: 12, msg: `k = ${k} > 0: pop the maximum into position ${k}`, state, hl: { active: [0], done: sorted() }, vars: { n, size, k } };
      [cells[0], cells[k]] = [cells[k], cells[0]];
      size -= 1;
      mark(0, null);
      yield { line: 13, msg: `swap(A[0], A[${k}]): the maximum ${v(k)} joins the sorted part`, state, hl: { moved: [0, k], done: sorted() }, vars: { n, size, k } };
      yield { line: 14, msg: `--size = ${size}: the heap shrinks, fix_down the new root`, state, hl: { active: [0], done: sorted() }, vars: { n, size, k } };
      yield* fixDown(0);
    }
    mark(null, null);
    yield { line: 12, msg: 'k = 0 is not > 0: the loop ends', state, hl: { done: range(0, n - 1) }, vars: { n, size, k: 0 } };
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: range(0, n - 1) }, vars: { n } };
  },
};
