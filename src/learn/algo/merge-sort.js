const CODE = [
  'void merge(vector<int> &v, int start, int m, int stop, vector<int> &tmp) {',
  '  int bi = start;                    // index into B = v[start..m]',
  '  int ci = m + 1;                    // index into C = v[m+1..stop]',
  '  for (int i = start; i <= stop; i++) {',
  '    if (ci > stop) { tmp[i] = v[bi++]; continue; }',
  '    if (bi > m)    { tmp[i] = v[ci++]; continue; }',
  '    tmp[i] = (v[bi] < v[ci]) ? v[bi++] : v[ci++];',
  '  }',
  '  for (int i = start; i <= stop; i++) v[i] = tmp[i];',
  '}',
  'void merge_sort(vector<int> &v, int start, int stop, vector<int> &tmp) {',
  '  if (start < stop) {',
  '    int m = (start + stop) >> 1;',
  '    merge_sort(v, start, m, tmp);',
  '    merge_sort(v, m + 1, stop, tmp);',
  '    merge(v, start, m, stop, tmp);',
  '  }',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);
const values = (cells) => cells.map((cell) => (cell ? cell.value : null));

export default {
  id: 'merge-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Merge sort',
  summary: 'Split in half, sort each half recursively, then merge the two sorted halves through a temporary array.',
  renderer: 'arrays',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    note: 'T(n) = 2T(n/2) + O(n): log n levels of splitting, and every level merges n items. The temporary array tmp[] is the O(n) extra space. Elements are drawn moving into tmp[] and back, as the course code copies them.',
  },
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'v[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [4, 12, 9, 6, 1, 5, 11, 3] }],
  },
  *run({ a }) {
    const n = a.length;
    const main = a.map((value, index) => ({ key: `a${index}`, value }));
    const temp = Array(n).fill(null);
    const state = {
      mode: 'bars',
      capacity: n + 1,
      range: { low: Math.min(0, ...a), high: Math.max(1, ...a) },
      span: null,
      rows: [
        { name: 'v', cells: main, pointers: { bi: null, ci: null } },
        { name: 'tmp', cells: temp, pointers: { i: null } },
      ],
    };
    const pointers = (bi, ci, i) => {
      state.rows[0].pointers = { bi, ci };
      state.rows[1].pointers = { i };
    };
    const snap = (extra) => ({ n, tmp: values(temp), ...extra });

    function* merge(start, m, stop, depth) {
      state.span = { lo: start, hi: stop };
      let bi = start;
      let ci = m + 1;
      pointers(bi, null, null);
      yield { line: 0, msg: `merge(v, ${start}, ${m}, ${stop}): B = v[${start}..${m}] and C = v[${m + 1}..${stop}] are both sorted`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, m, stop }) };
      yield { line: 1, msg: `bi = ${bi}: start of B`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, m, stop, bi }) };
      pointers(bi, ci, null);
      yield { line: 2, msg: `ci = ${ci}: start of C`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, m, stop, bi, ci }) };
      for (let i = start; i <= stop; i += 1) {
        pointers(bi, ci, i);
        yield { line: 3, msg: `i = ${i} <= ${stop}: fill tmp[${i}]`, state, hl: { active: range(start, stop), rows: [{}, { active: [i] }] }, vars: snap({ depth, start, m, stop, bi, ci, i }) };
        let from;
        let fromB;
        let line;
        let msg;
        if (ci > stop) {
          from = bi;
          fromB = true;
          line = 4;
          msg = `ci = ${ci} > ${stop}: C is used up, take B's v[${bi}] = ${main[bi].value}`;
        } else if (bi > m) {
          from = ci;
          fromB = false;
          line = 5;
          msg = `bi = ${bi} > ${m}: B is used up, take C's v[${ci}] = ${main[ci].value}`;
        } else {
          const lower = main[bi].value < main[ci].value;
          yield { line: 6, msg: `v[${bi}] = ${main[bi].value} ${lower ? '<' : '>='} v[${ci}] = ${main[ci].value}: take ${lower ? 'B' : 'C'}'s item`, state, hl: { compare: [bi, ci] }, vars: snap({ depth, start, m, stop, bi, ci, i }) };
          from = lower ? bi : ci;
          fromB = lower;
          line = 6;
          msg = `tmp[${i}] = v[${from}] = ${main[from].value}`;
        }
        temp[i] = main[from];
        main[from] = null;
        // Compare sides, not indexes: once B is used up, bi === ci and from === bi is ambiguous.
        if (fromB) bi += 1;
        else ci += 1;
        pointers(bi, ci, i);
        yield { line, msg, state, hl: { rows: [{}, { moved: [i] }] }, vars: snap({ depth, start, m, stop, bi, ci, i }) };
      }
      pointers(null, null, stop + 1);
      yield { line: 3, msg: `i = ${stop + 1} is not <= ${stop}: tmp[${start}..${stop}] holds the merged run`, state, hl: { rows: [{}, { done: range(start, stop) }] }, vars: snap({ depth, start, m, stop, i: stop + 1 }) };
      for (let i = start; i <= stop; i += 1) {
        main[i] = temp[i];
        temp[i] = null;
      }
      pointers(null, null, null);
      yield { line: 8, msg: `Copy tmp[${start}..${stop}] back: v[${start}..${stop}] is now sorted`, state, hl: { moved: range(start, stop) }, vars: snap({ depth, start, m, stop }) };
    }

    function* mergeSort(start, stop, depth) {
      state.span = { lo: start, hi: stop };
      pointers(null, null, null);
      yield { line: 10, msg: `merge_sort(v, ${start}, ${stop}) at depth ${depth}`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, stop }) };
      if (!(start < stop)) {
        yield { line: 11, msg: `start = ${start} is not < stop = ${stop}: one item is already sorted, return`, state, hl: { done: [start] }, vars: snap({ depth, start, stop }) };
        return;
      }
      yield { line: 11, msg: `start = ${start} < stop = ${stop}: ${stop - start + 1} items, split them`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, stop }) };
      const m = (start + stop) >> 1;
      yield { line: 12, msg: `m = (${start} + ${stop}) >> 1 = ${m}: left half v[${start}..${m}], right half v[${m + 1}..${stop}]`, state, hl: { active: range(start, m), compare: range(m + 1, stop) }, vars: snap({ depth, start, stop, m }) };
      yield { line: 13, msg: `Sort the left half v[${start}..${m}]`, state, hl: { active: range(start, m) }, vars: snap({ depth, start, stop, m }) };
      yield* mergeSort(start, m, depth + 1);
      state.span = { lo: start, hi: stop };
      yield { line: 14, msg: `Sort the right half v[${m + 1}..${stop}]`, state, hl: { compare: range(m + 1, stop) }, vars: snap({ depth, start, stop, m }) };
      yield* mergeSort(m + 1, stop, depth + 1);
      state.span = { lo: start, hi: stop };
      yield { line: 15, msg: `Both halves are sorted: merge them`, state, hl: { active: range(start, stop) }, vars: snap({ depth, start, stop, m }) };
      yield* merge(start, m, stop, depth);
      state.span = { lo: start, hi: stop };
      yield { line: 16, msg: `merge_sort(v, ${start}, ${stop}) returns`, state, hl: { done: depth === 0 ? range(start, stop) : [] }, vars: snap({ depth, start, stop, m }) };
    }

    yield { line: 10, msg: `Sort ${n} number${n === 1 ? '' : 's'} with merge_sort(v, 0, ${n - 1}, tmp); tmp is a spare array of the same size`, state, hl: {}, vars: snap({ depth: 0 }) };
    yield* mergeSort(0, n - 1, 0);
    state.span = null;
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: range(0, n - 1) }, vars: snap({}) };
  },
};
