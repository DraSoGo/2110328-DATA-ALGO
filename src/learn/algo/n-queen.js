import { pos } from '../render/table.js';

const CODE = [
  'int n, col[6], count = 0;      // col[r] = column of the queen in row r',
  'bool safe(int r, int c) {',
  '  for (int i = 0; i < r; i++)',
  '    if (col[i] == c || abs(col[i] - c) == r - i) return false;',
  '  return true;',
  '}',
  'void place(int r) {',
  '  if (r == n) { count++; return; }      // all rows have a queen',
  '  for (int c = 0; c < n; c++) {',
  '    if (safe(r, c)) {',
  '      col[r] = c;                       // place',
  '      place(r + 1);',
  '                                        // backtrack: the queen leaves row r',
  '    }',
  '  }',
  '}',
];

const QUEEN = '♛';

export default {
  id: 'n-queen',
  side: 'algo',
  group: 'Brute force',
  title: 'N-Queen (backtracking)',
  summary: 'Place one queen per row, left to right. When a square is attacked, skip it; when a row has no safe square, backtrack and move the previous queen. This run counts every solution (all of them, as the grader asks).',
  renderer: 'table',
  complexity: {
    time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' },
    space: 'O(n)',
    note: 'The bound is loose: row r tries at most n squares but only safe ones are kept, so backtracking visits far fewer boards than the n^n brute force. Counting every solution never stops early, so best = worst. The stack and col[] use O(n).',
  },
  code: CODE,
  input: { fields: [{ name: 'n', label: 'n', min: 1, max: 6, default: 4 }] },
  *run({ n }) {
    const col = Array(n).fill(null);
    let count = 0;
    let last = null;
    const state = {
      board: true,
      cells: Array.from({ length: n }, () => Array(n).fill('')),
      caption: 'solutions found: 0',
    };
    const queens = () => col.flatMap((c, r) => (c === null ? [] : [[r, c]]));
    const attacked = () => {
      const out = [];
      const q = queens();
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < n; c += 1) {
          if (q.some(([qr, qc]) => qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c)) && col[r] !== c) out.push(pos(r, c));
        }
      }
      return out;
    };
    const sync = () => {
      state.cells = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (col[r] === c ? QUEEN : '')));
      state.caption = `solutions found: ${count}`;
    };
    const vars = (r, c, extra = {}) => ({ n, r, c, count, col: [...col], ...extra });
    const placed = () => queens().map(([r, c]) => pos(r, c));

    // Why square (r, c) is attacked by an earlier queen, or null if it is safe.
    const conflict = (r, c) => {
      for (let i = 0; i < r; i += 1) {
        if (col[i] === c) return { at: [i, col[i]], why: `same column as the queen in row ${i}` };
        if (Math.abs(col[i] - c) === r - i) return { at: [i, col[i]], why: `same diagonal as the queen in row ${i}` };
      }
      return null;
    };

    function* place(r) {
      if (r === n) {
        count += 1;
        last = [...col];
        sync();
        yield { line: 7, msg: `All ${n} rows have a queen: solution #${count} (columns ${col.map((c) => c + 1).join(', ')})`, state, hl: { done: placed() }, vars: vars(r, null) };
        return;
      }
      for (let c = 0; c < n; c += 1) {
        const bad = conflict(r, c);
        sync();
        yield {
          line: bad ? 3 : 9,
          msg: bad ? `Row ${r}, column ${c + 1}: ${bad.why}, skip it` : `Row ${r}, column ${c + 1}: no queen attacks it`,
          state,
          hl: { active: [pos(r, c)], compare: bad ? [pos(bad.at[0], bad.at[1])] : [], shaded: attacked(), done: placed() },
          vars: vars(r, c),
        };
        if (bad) continue;
        col[r] = c;
        sync();
        yield { line: 10, msg: `Place a queen at row ${r}, column ${c + 1}`, state, hl: { active: [pos(r, c)], shaded: attacked(), done: placed() }, vars: vars(r, c) };
        yield* place(r + 1);
        col[r] = null;
        sync();
        yield { line: 12, msg: `Backtrack: remove the queen from row ${r}, column ${c + 1} and try the next column`, state, hl: { shaded: attacked(), done: placed() }, vars: vars(r, c) };
      }
      yield { line: 8, msg: `Row ${r} has no more columns${r === 0 ? ': the search is finished' : `: go back to row ${r - 1}`}`, state, hl: { shaded: attacked(), done: placed() }, vars: vars(r, n) };
    }

    yield { line: 0, msg: `Place ${n} queen${n === 1 ? '' : 's'} on a ${n}×${n} board so that none attacks another`, state, hl: {}, vars: vars(null, null) };
    yield* place(0);
    if (last) {
      for (let r = 0; r < n; r += 1) col[r] = last[r];
      sync();
    }
    const msg = count === 0 ? `Done: no way to place ${n} queens on a ${n}×${n} board` : `Done: ${count} solution${count === 1 ? '' : 's'} (the board shows the last one)`;
    yield { line: CODE.length - 1, msg, state, hl: { done: placed() }, vars: vars(null, null) };
  },
};
