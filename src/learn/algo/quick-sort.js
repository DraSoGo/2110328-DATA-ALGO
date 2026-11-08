const CODE = [
  'int partition(vector<int> &A, int start, int stop) {',
  '  int pivot = A[start];',
  '  int left = start - 1;',
  '  int right = stop + 1;',
  '  while (left < right) {',
  '    do { left++; } while (A[left] < pivot);',
  '    do { right--; } while (A[right] > pivot);',
  '    if (left < right) swap(A[left], A[right]);',
  '    else return right;',
  '  }',
  '  return right;',
  '}',
  'void quick_sort(vector<int> &A, int start, int stop) {',
  '  if (start < stop) {',
  '    int p = partition(A, start, stop);',
  '    quick_sort(A, start, p);',
  '    quick_sort(A, p + 1, stop);',
  '  }',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);

export default {
  id: 'quick-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Quick sort',
  summary: "Hoare's partition around the pivot A[start], then sort the two parts in place (the divide-and-conquer slides' version).",
  renderer: 'arrays',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
    note: 'Best case: every partition splits evenly, T(n) = 2T(n/2) + O(n). Worst case: the pivot is always the minimum or maximum (for example sorted input, since the pivot is A[start]), so T(n) = T(n-1) + O(n). Space is the recursion stack.',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'A[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [4, 2, 8, 7, 3, 1, 5, 9, 8] }],
  },
  *run({ a }) {
    const n = a.length;
    const cells = a.map((value, index) => ({ key: `a${index}`, value }));
    const row = { name: 'A', cells, pointers: { left: null, right: null } };
    const state = { mode: 'bars', capacity: n + 1, range: { low: Math.min(0, ...a), high: Math.max(1, ...a) }, span: null, rows: [row] };
    const settled = new Set();
    const finished = () => [...settled].sort((x, y) => x - y);
    const pointers = (left, right) => {
      row.pointers = { left, right };
    };
    const value = (index) => cells[index].value;

    function* partition(start, stop, depth) {
      const pivot = value(start);
      const pivotKey = cells[start].key;
      const where = () => cells.findIndex((cell) => cell.key === pivotKey);
      const base = { depth, start, stop };
      pointers(null, null);
      yield { line: 0, msg: `partition(A, ${start}, ${stop})`, state, hl: { done: finished() }, vars: { n, ...base } };
      yield { line: 1, msg: `pivot = A[${start}] = ${pivot}: smaller items go left, bigger go right`, state, hl: { active: [start], done: finished() }, vars: { n, ...base, pivot } };
      let left = start - 1;
      let right = stop + 1;
      pointers(left, null);
      yield { line: 2, msg: `left = ${left}: one before the range`, state, hl: { active: [where()], done: finished() }, vars: { n, ...base, pivot, left } };
      pointers(left, right);
      yield { line: 3, msg: `right = ${right}: one after the range`, state, hl: { active: [where()], done: finished() }, vars: { n, ...base, pivot, left, right } };
      while (true) {
        yield { line: 4, msg: `left = ${left} < right = ${right}: keep scanning`, state, hl: { active: [where()], done: finished() }, vars: { n, ...base, pivot, left, right } };
        do {
          left += 1;
          pointers(left, right);
          const keepGoing = value(left) < pivot;
          yield {
            line: 5,
            msg: `left = ${left}: A[${left}] = ${value(left)} ${keepGoing ? '<' : '>='} pivot ${pivot}${keepGoing ? ': keep moving right' : ': stop'}`,
            state,
            hl: { compare: [left], active: [where()], done: finished() },
            vars: { n, ...base, pivot, left, right },
          };
          if (!keepGoing) break;
        } while (true);
        do {
          right -= 1;
          pointers(left, right);
          const keepGoing = value(right) > pivot;
          yield {
            line: 6,
            msg: `right = ${right}: A[${right}] = ${value(right)} ${keepGoing ? '>' : '<='} pivot ${pivot}${keepGoing ? ': keep moving left' : ': stop'}`,
            state,
            hl: { compare: [right], active: [where()], done: finished() },
            vars: { n, ...base, pivot, left, right },
          };
          if (!keepGoing) break;
        } while (true);
        if (left < right) {
          [cells[left], cells[right]] = [cells[right], cells[left]];
          yield { line: 7, msg: `left = ${left} < right = ${right}: swap(A[${left}], A[${right}]), both are on the wrong side`, state, hl: { moved: [left, right], active: [where()], done: finished() }, vars: { n, ...base, pivot, left, right } };
        } else {
          yield { line: 8, msg: `left = ${left} >= right = ${right}: the pointers met, return right = ${right}`, state, hl: { active: [where()], done: finished() }, vars: { n, ...base, pivot, left, right, p: right } };
          return right;
        }
      }
    }

    function* quickSort(start, stop, depth) {
      state.span = { lo: start, hi: stop };
      pointers(null, null);
      yield { line: 12, msg: `quick_sort(A, ${start}, ${stop}) at depth ${depth}`, state, hl: { done: finished() }, vars: { n, depth, start, stop } };
      if (!(start < stop)) {
        if (start === stop) settled.add(start);
        yield { line: 13, msg: `start = ${start} is not < stop = ${stop}: ${start === stop ? 'one item is sorted' : 'empty range'}, return`, state, hl: { done: finished() }, vars: { n, depth, start, stop } };
        return;
      }
      yield { line: 13, msg: `start = ${start} < stop = ${stop}: partition ${stop - start + 1} items`, state, hl: { active: range(start, stop), done: finished() }, vars: { n, depth, start, stop } };
      const p = yield* partition(start, stop, depth);
      state.span = { lo: start, hi: stop };
      pointers(null, null);
      yield { line: 14, msg: `p = ${p}: A[${start}..${p}] <= pivot <= A[${p + 1}..${stop}]`, state, hl: { active: range(start, p), compare: range(p + 1, stop), done: finished() }, vars: { n, depth, start, stop, p } };
      yield { line: 15, msg: `Sort the left part A[${start}..${p}]`, state, hl: { active: range(start, p), done: finished() }, vars: { n, depth, start, stop, p } };
      yield* quickSort(start, p, depth + 1);
      state.span = { lo: start, hi: stop };
      yield { line: 16, msg: `Sort the right part A[${p + 1}..${stop}]`, state, hl: { compare: range(p + 1, stop), done: finished() }, vars: { n, depth, start, stop, p } };
      yield* quickSort(p + 1, stop, depth + 1);
      state.span = { lo: start, hi: stop };
      if (depth === 0) range(0, n - 1).forEach((index) => settled.add(index));
      yield { line: 17, msg: `quick_sort(A, ${start}, ${stop}) returns: both parts are sorted and nothing needs merging`, state, hl: { done: finished() }, vars: { n, depth, start, stop, p } };
    }

    yield { line: 12, msg: `Sort ${n} number${n === 1 ? '' : 's'} with quick_sort(A, 0, ${n - 1})`, state, hl: {}, vars: { n } };
    yield* quickSort(0, n - 1, 0);
    state.span = null;
    pointers(null, null);
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: range(0, n - 1) }, vars: { n } };
  },
};
