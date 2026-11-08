const CODE = [
  '// N is the largest input size; count the steps each growth rate takes for n = 1..N',
  'for (int n = 1; n <= N; n++) {',
  '  long long c1 = 1;                                  // O(1): one step, whatever n is',
  '  long long clog = 0;',
  '  for (int m = n; m > 1; m /= 2) clog++;             // O(log n): halve until 1',
  '  long long cn = 0;',
  '  for (int i = 0; i < n; i++) cn++;                  // O(n): one pass',
  '  long long cnlogn = 0;',
  '  for (int i = 0; i < n; i++)',
  '    for (int m = n; m > 1; m /= 2) cnlogn++;         // O(n log n): a halving loop per item',
  '  long long cn2 = 0;',
  '  for (int i = 0; i < n; i++)',
  '    for (int j = 0; j < n; j++) cn2++;               // O(n²): every pair',
  '  long long c2n = 0;',
  '  for (long long s = 0; s < (1LL << n); s++) c2n++;  // O(2^n): every subset',
  '}',
];

const ROWS = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2^n)'];

// Each program is a real loop; it returns how many times its counter was incremented.
const PROGRAMS = [
  { name: 'c1', line: 2, text: (n) => `O(1): one step for n = ${n}`, count: () => 1 },
  {
    name: 'clog',
    line: 4,
    text: (n, c) => `O(log n): halving ${n} down to 1 takes ${c} step${c === 1 ? '' : 's'}`,
    count: (n) => {
      let c = 0;
      for (let m = n; m > 1; m = Math.floor(m / 2)) c += 1;
      return c;
    },
  },
  {
    name: 'cn',
    line: 6,
    text: (n, c) => `O(n): one pass over ${n} items is ${c} steps`,
    count: (n) => {
      let c = 0;
      for (let i = 0; i < n; i += 1) c += 1;
      return c;
    },
  },
  {
    name: 'cnlogn',
    line: 9,
    text: (n, c) => `O(n log n): ${n} items, each with a halving loop, is ${c} steps`,
    count: (n) => {
      let c = 0;
      for (let i = 0; i < n; i += 1) for (let m = n; m > 1; m = Math.floor(m / 2)) c += 1;
      return c;
    },
  },
  {
    name: 'cn2',
    line: 12,
    text: (n, c) => `O(n²): ${n} × ${n} pairs is ${c} steps`,
    count: (n) => {
      let c = 0;
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) c += 1;
      return c;
    },
  },
  {
    name: 'c2n',
    line: 14,
    text: (n, c) => `O(2^n): every one of the 2^${n} subsets is visited, ${c} steps`,
    count: (n) => {
      let c = 0;
      for (let s = 0; s < 2 ** n; s += 1) c += 1;
      return c;
    },
  },
];

export default {
  id: 'complexity',
  side: 'algo',
  group: 'Analysis',
  title: 'Growth of functions',
  summary: 'Count the steps of small loop programs for n = 1..N and watch O(1), O(log n), O(n), O(n log n), O(n²) and O(2^n) pull apart.',
  renderer: 'timeline',
  complexity: {
    time: { best: 'O(1)', average: 'O(2^n)', worst: 'O(2^n)' },
    space: 'O(1)',
    note: 'The demo itself costs O(2^n) because of the last loop. The bars share one linear scale fixed by the biggest count at your N, so slow growth (1, log n) shrinks to a sliver while 2^n fills the chart. The number at the end of each bar is the exact count. O(log n) here counts halvings, floor(log2 n).',
  },
  code: CODE,
  input: {
    fields: [{ name: 'N', label: 'N (largest n)', min: 1, max: 12, default: 10 }],
  },
  *run({ N }) {
    const counts = PROGRAMS.map((program) => program.count(N));
    const max = Math.max(1, ...counts);
    const bars = ROWS.map((label, row) => ({ key: `growth${row}`, row, from: 0, to: 0, text: '0' }));
    const state = { max, labelAt: 'end', rows: ROWS, bars };
    const base = (n, extra) => ({ N, n, ...Object.fromEntries(PROGRAMS.map((program, row) => [program.name, bars[row].to])), ...extra });

    yield { line: 0, msg: `Compare six growth rates for n = 1 up to ${N}; each bar is the number of steps a small loop program takes`, state, hl: {}, vars: { N } };
    for (let n = 1; n <= N; n += 1) {
      yield { line: 1, msg: `n = ${n} <= ${N}: run all six programs on n = ${n}`, state, hl: {}, vars: base(n, {}) };
      for (let row = 0; row < PROGRAMS.length; row += 1) {
        const program = PROGRAMS[row];
        const count = program.count(n);
        bars[row].to = count;
        bars[row].text = String(count);
        yield { line: program.line, msg: program.text(n, count), state, hl: { active: [row] }, vars: base(n, {}) };
      }
    }
    yield { line: 1, msg: `n = ${N + 1} is not <= ${N}: the loop ends`, state, hl: {}, vars: base(N + 1, {}) };
    const order = [...Array(PROGRAMS.length).keys()].sort((x, y) => bars[x].to - bars[y].to || x - y);
    yield { line: CODE.length - 1, msg: `Done: at n = ${N} the counts are ${bars.map((bar, row) => `${ROWS[row]} = ${bar.to}`).join(', ')}`, state, hl: { done: order }, vars: base(N, {}) };
  },
};
