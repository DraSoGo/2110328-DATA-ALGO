const CODE = [
  'void insertion_sort(vector<int>& a) {',
  '  for (int i = 1; i < a.size(); i++) {',
  '    int key = a[i];',
  '    int j = i - 1;',
  '    while (j >= 0 && a[j] > key) {',
  '      a[j + 1] = a[j];',
  '      j--;',
  '    }',
  '    a[j + 1] = key;',
  '  }',
  '}',
];

const prefix = (length) => Array.from({ length }, (_, k) => k);

export default {
  id: 'insertion-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Insertion sort',
  summary: 'Grow a sorted prefix: lift a[i] out, shift bigger elements right, drop it into the hole.',
  renderer: 'array',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    note: 'Best case is an already sorted array: the while loop never shifts. Worst case is reverse order: one shift per inversion. Sorting happens in place.',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'a[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [5, 2, 4, 6, 1, 3] }],
  },
  *run({ a }) {
    const n = a.length;
    const state = { mode: 'bars', cells: a.map((value, index) => ({ key: `a${index}`, value })), lifted: null, pointers: { i: null, j: null } };
    yield { line: 0, msg: `Sort ${n} number${n === 1 ? '' : 's'}`, state, hl: {}, vars: { n } };
    for (let i = 1; i < n; i += 1) {
      state.pointers = { i, j: null };
      yield { line: 1, msg: `i = ${i}: a[0..${i - 1}] is already sorted`, state, hl: { done: prefix(i) }, vars: { n, i } };
      const key = state.cells[i].value;
      state.lifted = { ...state.cells[i], at: i };
      state.cells[i] = null;
      yield { line: 2, msg: `Lift key = a[${i}] = ${key}`, state, hl: { done: prefix(i) }, vars: { n, i, key } };
      let j = i - 1;
      state.pointers = { i, j };
      yield { line: 3, msg: `Start comparing at j = ${j}`, state, hl: { done: prefix(i) }, vars: { n, i, key, j } };
      while (true) {
        const shift = j >= 0 && state.cells[j].value > key;
        const msg = j < 0 ? 'j < 0: reached the front' : `a[${j}] = ${state.cells[j].value} ${shift ? '>' : '<='} key ${key}${shift ? ': shift it right' : ': stop'}`;
        yield { line: 4, msg, state, hl: { compare: j >= 0 ? [j] : [], done: prefix(i) }, vars: { n, i, key, j } };
        if (!shift) break;
        state.cells[j + 1] = state.cells[j];
        state.cells[j] = null;
        state.lifted.at = j;
        yield { line: 5, msg: `a[${j + 1}] = a[${j}]`, state, hl: { moved: [j + 1], done: prefix(i) }, vars: { n, i, key, j } };
        j -= 1;
        state.pointers = { i, j };
        yield { line: 6, msg: `j = ${j}`, state, hl: { done: prefix(i) }, vars: { n, i, key, j } };
      }
      state.cells[j + 1] = { key: state.lifted.key, value: state.lifted.value };
      state.lifted = null;
      yield { line: 8, msg: `a[${j + 1}] = key = ${key}`, state, hl: { active: [j + 1], done: prefix(i + 1) }, vars: { n, i, key, j } };
    }
    state.pointers = { i: null, j: null };
    yield { line: 1, msg: `i = ${Math.max(n, 1)} is not < ${n}: the loop ends`, state, hl: { done: prefix(n) }, vars: { n, i: Math.max(n, 1) } };
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: prefix(n) }, vars: { n } };
  },
};
