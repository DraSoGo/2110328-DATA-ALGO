const CODE = [
  'int bsearch(vector<int> &v, int k) {',
  '  int lo = 0, hi = v.size();          // search in v[lo..hi-1]',
  '  while (lo < hi) {',
  '    int mid = (lo + hi) >> 1;',
  '    if (v[mid] >= k) hi = mid;        // the first k is at mid or to its left',
  '    else lo = mid + 1;                // everything up to mid is < k',
  '  }',
  '  return (lo < v.size() && v[lo] == k) ? lo : -1;',
  '}',
];

const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

export default {
  id: 'binary-search',
  side: 'algo',
  group: 'Divide and conquer',
  title: 'Binary search',
  summary: "Halve the sorted range each step and return the first position of k, as the course's bsearch does (loop form with hi as an exclusive end).",
  renderer: 'array',
  complexity: {
    time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
    space: 'O(1)',
    note: 'T(n) = T(n/2) + O(1) solves to O(log n): only one half is kept. This version never stops early on a match (it keeps looking left for the first k), so it always takes about log n steps; O(1) is the n = 1 case. The array must already be sorted, so the demo sorts your list first. hi may equal n, which is why the picture has one spare slot.',
  },
  code: CODE,
  input: {
    fields: [
      { name: 'a', label: 'v[] (sorted for you)', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [1, 2, 4, 5, 6, 6, 6, 10] },
      { name: 'k', label: 'k', min: -99, max: 99, default: 6 },
    ],
  },
  *run({ a, k }) {
    const sorted = [...a].sort((x, y) => x - y);
    const n = sorted.length;
    const state = { cells: sorted.map((value, index) => ({ key: `v${index}`, value })), capacity: n + 1, pointers: { lo: null, mid: null, hi: null } };
    const set = (lo, mid, hi) => {
      state.pointers = { lo, mid, hi };
    };
    yield { line: 0, msg: `Find the first ${k} in ${n} sorted number${n === 1 ? '' : 's'} (your list was sorted first: binary search needs order)`, state, hl: {}, vars: { n, k } };
    let lo = 0;
    let hi = n;
    set(lo, null, hi);
    yield { line: 1, msg: `lo = 0, hi = ${n}: the whole array v[0..${n - 1}] is still possible (hi is one past the end)`, state, hl: { active: range(lo, hi) }, vars: { n, k, lo, hi } };
    while (true) {
      yield {
        line: 2,
        msg: lo < hi ? `lo = ${lo} < hi = ${hi}: ${hi - lo} candidate${hi - lo === 1 ? '' : 's'} left` : `lo = ${lo} is not < hi = ${hi}: no candidates left, the loop ends`,
        state,
        hl: { active: range(lo, hi) },
        vars: { n, k, lo, hi },
      };
      if (!(lo < hi)) break;
      const mid = (lo + hi) >> 1;
      set(lo, mid, hi);
      yield { line: 3, msg: `mid = (${lo} + ${hi}) >> 1 = ${mid}`, state, hl: { active: range(lo, hi), compare: [mid] }, vars: { n, k, lo, hi, mid } };
      if (sorted[mid] >= k) {
        yield { line: 4, msg: `v[${mid}] = ${sorted[mid]} >= ${k}: the first ${k} is at ${mid} or to its left, hi = ${mid}`, state, hl: { active: range(lo, hi), compare: [mid] }, vars: { n, k, lo, hi, mid } };
        hi = mid;
      } else {
        yield { line: 4, msg: `v[${mid}] = ${sorted[mid]} < ${k}: not this one`, state, hl: { active: range(lo, hi), compare: [mid] }, vars: { n, k, lo, hi, mid } };
        lo = mid + 1;
        set(lo, mid, hi);
        yield { line: 5, msg: `Everything up to v[${mid}] is < ${k}: lo = ${lo}`, state, hl: { active: range(lo, hi), compare: [mid] }, vars: { n, k, lo, hi, mid } };
        set(lo, null, hi);
        continue;
      }
      set(lo, null, hi);
      yield { line: 4, msg: `hi = ${hi}: search v[${lo}..${hi - 1}]`, state, hl: { active: range(lo, hi) }, vars: { n, k, lo, hi } };
    }
    const found = lo < n && sorted[lo] === k;
    set(lo, null, hi);
    yield {
      line: 7,
      msg: found ? `lo = ${lo} < ${n} and v[${lo}] = ${k}: found, return ${lo}` : lo < n ? `v[${lo}] = ${sorted[lo]} is not ${k}: return -1` : `lo = ${lo} is not < ${n}: every item is smaller than ${k}, return -1`,
      state,
      hl: { done: found ? [lo] : [], compare: !found && lo < n ? [lo] : [] },
      vars: { n, k, lo, hi, result: found ? lo : -1 },
    };
    yield { line: CODE.length - 1, msg: found ? `Done: first ${k} is at index ${lo}` : `Done: ${k} is not in the array`, state, hl: { done: found ? [lo] : [] }, vars: { n, k, result: found ? lo : -1 } };
  },
};
