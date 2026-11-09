// Growth of functions: an interactive widget instead of a frame-by-frame run.
// Three parts: operation counts for a chosen n (with time-limit verdicts),
// growth curves for small n, and an O / Ω / Θ explorer.
// Every string placed with innerHTML below is built from numbers and constants
// in this file and passed through escapeHtml.

import { highlightCpp } from '../../lib/cpp-highlight.js';
import { escapeHtml } from '../../lib/html.js';
import { t } from '../../lib/i18n.js';

export const OPS_PER_SECOND = 1e8; // the usual rule of thumb for one second of C++
const LIMIT_LOG = 8; //  ≤ 10^8 ops: fits in about a second
const BORDER_LOG = 9; // ≤ 10^9 ops: borderline, very likely TLE; beyond: not computed

const log10Factorial = (n) => {
  if (n <= 170) {
    let sum = 0;
    for (let k = 2; k <= n; k += 1) sum += Math.log10(k);
    return sum;
  }
  return n * Math.log10(n / Math.E) + 0.5 * Math.log10(2 * Math.PI * n); // Stirling
};

// Each class: log10 of its operation count (safe for n up to 1e18) and the exact
// count, which is only evaluated when it is small enough to matter.
export const CLASSES = [
  { id: 'const', label: 'O(1)', log10: () => 0, value: () => 1, example: ["int get(const vector<int>& a, int i) {", "  return a[i];              // one step, however big n is", "}"] },
  { id: 'log', label: 'O(log n)', log10: (n) => Math.log10(Math.max(1, Math.log2(n))), value: (n) => Math.max(1, Math.log2(n)), example: ["int lo = 0, hi = n;                 // search x in sorted a[0..n)", "while (hi - lo > 1) {               // the range halves every round", "  int mid = (lo + hi) / 2;", "  if (a[mid] <= x) lo = mid; else hi = mid;", "}"] },
  { id: 'sqrt', label: 'O(√n)', log10: (n) => 0.5 * Math.log10(n), value: (n) => Math.sqrt(n), example: ["bool is_prime(long long n) {", "  for (long long d = 2; d * d <= n; d++)   // d only goes up to √n", "    if (n % d == 0) return false;", "  return n >= 2;", "}"] },
  { id: 'n', label: 'O(n)', log10: (n) => Math.log10(n), value: (n) => n, example: ["long long sum = 0;", "for (int i = 0; i < n; i++)         // one pass over n items", "  sum += a[i];"] },
  { id: 'nlogn', label: 'O(n log n)', log10: (n) => Math.log10(n) + Math.log10(Math.max(1, Math.log2(n))), value: (n) => n * Math.max(1, Math.log2(n)), example: ["sort(a.begin(), a.end());           // std::sort: O(n log n)", "for (int i = 0; i < n; i++)         // n times ...", "  if (binary_search(a.begin(), a.end(), q[i]))   // ... an O(log n) search", "    found++;"] },
  { id: 'nsqrtn', label: 'O(n√n)', log10: (n) => 1.5 * Math.log10(n), value: (n) => n * Math.sqrt(n), example: ["for (int i = 1; i <= n; i++)        // n numbers", "  for (int d = 1; d * d <= i; d++)  // about √i checks each", "    if (i % d == 0) divisors++;"] },
  { id: 'n2', label: 'O(n²)', log10: (n) => 2 * Math.log10(n), value: (n) => n * n, example: ["for (int i = 0; i < n; i++)", "  for (int j = i + 1; j < n; j++)   // every pair (i, j)", "    if (a[i] + a[j] == k) count++;"] },
  { id: 'n3', label: 'O(n³)', log10: (n) => 3 * Math.log10(n), value: (n) => n ** 3, example: ["for (int k = 0; k < n; k++)         // Floyd–Warshall", "  for (int i = 0; i < n; i++)", "    for (int j = 0; j < n; j++)", "      d[i][j] = min(d[i][j], d[i][k] + d[k][j]);"] },
  { id: 'n4', label: 'O(n⁴)', log10: (n) => 4 * Math.log10(n), value: (n) => n ** 4, example: ["for (int a = 0; a < n; a++)", "  for (int b = 0; b < n; b++)", "    for (int c = 0; c < n; c++)", "      for (int d = 0; d < n; d++)   // every 4-tuple", "        if (w[a] + w[b] + w[c] + w[d] == k) count++;"] },
  { id: 'exp', label: 'O(2ⁿ)', log10: (n) => n * Math.log10(2), value: (n) => 2 ** n, example: ["void subsets(int i) {               // each call branches in two", "  if (i == n) { count++; return; }", "  subsets(i + 1);                   // skip a[i]", "  subsets(i + 1);                   // take a[i]", "}"] },
  { id: 'fact', label: 'O(n!)', log10: (n) => log10Factorial(n), value: (n) => { let p = 1; for (let k = 2; k <= n; k += 1) p *= k; return p; }, example: ["sort(p.begin(), p.end());", "do {                                // n! orderings", "  check(p);", "} while (next_permutation(p.begin(), p.end()));"] },
];

// From the competitive-programming rule-of-thumb table.
const FEASIBLE = [
  [10, 'O(n!), O(n⁷), O(n⁶)'],
  [20, 'O(2^n · n), O(n⁵)'],
  [80, 'O(n⁴)'],
  [400, 'O(n³)'],
  [7500, 'O(n²)'],
  [7e4, 'O(n√n)'],
  [5e5, 'O(n log n)'],
  [5e6, 'O(n)'],
  [1e18, 'O(log² n), O(log n), O(1)'],
];

export function feasibleRow(n) {
  const found = FEASIBLE.findIndex(([max]) => n <= max);
  const index = found === -1 ? FEASIBLE.length - 1 : found;
  return { index, max: FEASIBLE[index][0], classes: FEASIBLE[index][1] };
}

export function estimate(cls, n) {
  const log = cls.log10(n);
  if (log > BORDER_LOG) return { status: 'tle', ops: null, seconds: null };
  const ops = cls.value(n);
  return { status: log > LIMIT_LOG ? 'borderline' : 'ok', ops, seconds: ops / OPS_PER_SECOND };
}

export function nFromSlider(position) {
  return Math.round(10 ** (Number(position) / 100));
}

export function sliderFromN(n) {
  return Math.round(Math.log10(n) * 100);
}

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const trim = (value) => String(Number(value.toFixed(2)));

export function formatCount(value) {
  if (value < 1e7) return Math.round(value).toLocaleString('en-US');
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  return `${mantissa.toFixed(1)} × 10${String(exponent).split('').map((char) => SUPERSCRIPT[char]).join('')}`;
}

export function formatSeconds(seconds) {
  const units = [[1e-6, 1e-9, 'ns'], [1e-3, 1e-6, 'µs'], [1, 1e-3, 'ms'], [60, 1, 's'], [3600, 60, 'min'], [86400, 3600, 'h'], [3.156e7, 86400, 'days']];
  for (const [below, size, name] of units) if (seconds < below) return `${trim(seconds / size)} ${name}`;
  return `${trim(seconds / 3.156e7)} years`;
}

// Functions for the O / Ω / Θ explorer. rank = [exponential base, power, log power],
// compared in that order, decides which grows faster.
export const FUNCTIONS = [
  { id: 'log', label: 'log₂ n', value: (n) => Math.log2(n), rank: [1, 0, 1] },
  { id: 'sqrt', label: '√n', value: (n) => Math.sqrt(n), rank: [1, 0.5, 0] },
  { id: 'lin', label: 'n', value: (n) => n, rank: [1, 1, 0] },
  { id: 'lin10', label: '0.5n + 10', value: (n) => 0.5 * n + 10, rank: [1, 1, 0] },
  { id: 'nlogn', label: 'n log₂ n', value: (n) => n * Math.log2(n), rank: [1, 1, 1] },
  { id: 'n12', label: 'n^1.2', value: (n) => n ** 1.2, rank: [1, 1.2, 0] },
  { id: 'quad', label: 'n²', value: (n) => n * n, rank: [1, 2, 0] },
  { id: 'quad2', label: '3n² + 5n', value: (n) => 3 * n * n + 5 * n, rank: [1, 2, 0] },
  { id: 'cube', label: 'n³', value: (n) => n ** 3, rank: [1, 3, 0] },
  { id: 'exp', label: '2ⁿ', value: (n) => 2 ** n, rank: [2, 0, 0] },
];

function compareRank(a, b) {
  for (let k = 0; k < a.length; k += 1) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  return 0;
}

export function bound(f, g) {
  const cmp = compareRank(f.rank, g.rank);
  return { O: cmp <= 0, Omega: cmp >= 0, Theta: cmp === 0 };
}

// Smallest n0 (on a 0.25 grid) with predicate(n) true for every sampled n in [n0, max].
export function findN0(predicate, max, step = 0.25) {
  let n0 = 1;
  for (let n = 1; n <= max + 1e-9; n += step) if (!predicate(n)) n0 = n + step;
  return n0 > max ? null : Math.round(n0 * 100) / 100;
}

// ---------- drawing ----------

const W = 640;
const H = 340;
const PAD = { left: 52, right: 150, top: 16, bottom: 34 };
const sx = (n, xMax) => PAD.left + ((n - 1) / (xMax - 1)) * (W - PAD.left - PAD.right);
const sy = (v, yMax) => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom);

function shortNumber(value) {
  if (value >= 1e6) return value.toExponential(0).replace('e+', 'e');
  if (value >= 1000) return `${trim(value / 1000)}k`;
  return trim(value);
}

function axes(xMax, yMax) {
  const yTicks = [0.25, 0.5, 0.75, 1].map((k) => yMax * k);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => 1 + (xMax - 1) * k);
  return `<line class="axis" x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${H - PAD.bottom}"/>`
    + `<line class="axis" x1="${PAD.left}" y1="${H - PAD.bottom}" x2="${W - PAD.right}" y2="${H - PAD.bottom}"/>`
    + yTicks.map((v) => `<line class="grid" x1="${PAD.left}" y1="${sy(v, yMax)}" x2="${W - PAD.right}" y2="${sy(v, yMax)}"/><text class="tick" x="${PAD.left - 6}" y="${sy(v, yMax) + 4}" text-anchor="end">${escapeHtml(shortNumber(v))}</text>`).join('')
    + xTicks.map((v) => `<text class="tick" x="${sx(v, xMax)}" y="${H - PAD.bottom + 16}" text-anchor="middle">${escapeHtml(shortNumber(v))}</text>`).join('')
    + `<text class="tick" x="${W - PAD.right + 8}" y="${H - PAD.bottom + 4}">n</text>`;
}

// A polyline that stops where the curve leaves the top of the plot.
function curvePath(fn, xMax, yMax) {
  const points = [];
  let exited = false;
  for (let k = 0; k <= 240; k += 1) {
    const n = 1 + ((xMax - 1) * k) / 240;
    const v = fn(n);
    if (v > yMax) {
      points.push({ x: sx(n, xMax), y: PAD.top });
      exited = true;
      break;
    }
    points.push({ x: sx(n, xMax), y: sy(Math.max(0, v), yMax) });
  }
  const end = points.at(-1);
  return { d: points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''), end, exited };
}

function curveMarkup(fn, xMax, yMax, cls, label) {
  const { d, end, exited } = curvePath(fn, xMax, yMax);
  return `<path class="curve ${cls}" d="${d}"/><text class="curve-label ${cls}" x="${Math.min(end.x + 4, W - PAD.right + 4)}" y="${exited ? PAD.top + 12 : end.y - 6}">${escapeHtml(label)}</text>`;
}

const factorial = (n) => { let p = 1; for (let k = 2; k <= Math.floor(n); k += 1) p *= k; return p; };
const GROWTH = [
  { id: 'log', label: 'log n', fn: (n) => Math.log2(n), cls: 'g-log' },
  { id: 'n', label: 'n', fn: (n) => n, cls: 'g-n' },
  { id: 'nlogn', label: 'n log n', fn: (n) => n * Math.log2(n), cls: 'g-nlogn' },
  { id: 'n2', label: 'n²', fn: (n) => n * n, cls: 'g-n2' },
  { id: 'n3', label: 'n³', fn: (n) => n ** 3, cls: 'g-n3' },
  { id: 'exp', label: '2ⁿ', fn: (n) => 2 ** n, cls: 'g-exp' },
  { id: 'fact', label: 'n!', fn: factorial, cls: 'g-fact' },
];

function growthSvg(view, shown, n) {
  const yMax = 1.7 * view * view;
  const curves = GROWTH.filter((item) => shown.has(item.id)).map((item) => curveMarkup(item.fn, view, yMax, item.cls, item.label)).join('');
  let marker = '';
  if (n <= view) {
    const x = sx(n, view);
    marker = `<line class="marker" x1="${x}" y1="${PAD.top}" x2="${x}" y2="${H - PAD.bottom}"/><text class="marker-label" x="${x + 4}" y="${H - PAD.bottom - 6}">n = ${escapeHtml(formatCount(n))}</text>`
      + GROWTH.filter((item) => shown.has(item.id) && item.fn(n) <= yMax).map((item) => `<circle class="dot ${item.cls}" cx="${x}" cy="${sy(item.fn(n), yMax)}" r="4"/>`).join('');
  }
  return `<svg class="growth-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth curves from n = 1 to ${view}">${axes(view, yMax)}${curves}${marker}</svg>`;
}

function boundsSvg({ f, g, mode, c1, c2, xMax }) {
  const fMax = f.value(xMax);
  const candidates = [fMax];
  if (mode !== 'Omega') candidates.push(c2 * g.value(xMax));
  if (mode !== 'O') candidates.push(c1 * g.value(xMax));
  const yMax = 1.15 * Math.min(Math.max(...candidates), Math.max(fMax * 4, 10));
  const upper = mode !== 'Omega' ? (n) => c2 * g.value(n) : null;
  const lower = mode !== 'O' ? (n) => c1 * g.value(n) : null;
  const holds = (n) => (!upper || f.value(n) <= upper(n)) && (!lower || lower(n) <= f.value(n));
  const n0 = findN0(holds, xMax);
  let shade = '';
  if (n0 !== null) {
    const top = upper || f.value;
    const bottom = lower || f.value;
    const along = (fn, from, to) => Array.from({ length: 121 }, (_, k) => from + ((to - from) * k) / 120)
      .map((n) => `${sx(n, xMax).toFixed(1)},${sy(Math.min(yMax, Math.max(0, fn(n))), yMax).toFixed(1)}`);
    const x0 = sx(n0, xMax);
    shade = `<polygon class="shade" points="${[...along(top, n0, xMax), ...along(bottom, xMax, n0)].join(' ')}"/>`
      + `<line class="marker" x1="${x0}" y1="${PAD.top}" x2="${x0}" y2="${H - PAD.bottom}"/><text class="marker-label" x="${x0 + 4}" y="${H - PAD.bottom - 6}">n₀ ≈ ${escapeHtml(trim(n0))}</text>`;
  }
  const svg = `<svg class="bounds-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bound check">${axes(xMax, yMax)}${shade}`
    + curveMarkup(g.value, xMax, yMax, 'b-g', `g(n) = ${g.label}`)
    + (upper ? curveMarkup(upper, xMax, yMax, 'b-upper', `${trim(c2)}·g(n)`) : '')
    + (lower ? curveMarkup(lower, xMax, yMax, 'b-lower', `${trim(c1)}·g(n)`) : '')
    + curveMarkup(f.value, xMax, yMax, 'b-f', `f(n) = ${f.label}`)
    + '</svg>';
  return { svg, n0 };
}

// ---------- widget ----------

const MODE_SIGN = { O: 'O', Omega: 'Ω', Theta: 'Θ' };

function verdict(f, g, mode, n0, xMax) {
  const truth = bound(f, g)[mode];
  const claim = `f(n) = ${f.label} ${truth ? '∈' : '∉'} ${MODE_SIGN[mode]}(${g.label})`;
  if (truth && n0 !== null) return { ok: true, text: t('gw.verdict.ok', { claim, rule: t(`gw.rule.${mode}`), n0: trim(n0) }) };
  if (truth) return { ok: true, text: t('gw.verdict.okButConstants', { claim, max: xMax }) };
  const reason = t(mode === 'Omega' ? 'gw.reason.lower' : 'gw.reason.upper');
  return { ok: false, text: t(n0 !== null ? 'gw.verdict.noLooksFine' : 'gw.verdict.no', { claim, reason, max: xMax }) };
}

function layoutMarkup() {
  const option = (item, selected) => `<option value="${item.id}"${item.id === selected ? ' selected' : ''}>${escapeHtml(item.label)}</option>`;
  const defs = ['O', 'Omega', 'Theta'].map((mode) => `<div><dt>${MODE_SIGN[mode]}(g)</dt><dd><b>${escapeHtml(t(`gw.word.${mode}`))}</b>: ${escapeHtml(t(`gw.rule.${mode}`))}</dd></div>`).join('');
  return `<section class="gw-section">
    <h2>${escapeHtml(t('gw.h.ops'))}</h2>
    <p class="gw-hint">${escapeHtml(t('gw.hint.ops'))} ${escapeHtml(t('gw.hint.example'))}</p>
    <div class="gw-n">
      <label>n <input type="range" min="0" max="1800" step="1" data-gw="slider" aria-label="n (log scale)"></label>
      <input type="number" min="1" max="1e18" data-gw="n" aria-label="n">
      <div class="gw-presets">${[10, 20, 80, 400, 7500, 7e4, 5e5, 5e6, 1e9, 1e18].map((v) => `<button type="button" data-gw-n="${v}">${escapeHtml(formatCount(v))}</button>`).join('')}</div>
    </div>
    <div class="gw-ops" data-gw="ops"></div>
    <div class="gw-feasible" data-gw="feasible"></div>
  </section>
  <section class="gw-section">
    <h2>${escapeHtml(t('gw.h.curves'))}</h2>
    <div class="gw-controls">
      <label>${escapeHtml(t('gw.showUpTo'))} <input type="range" min="4" max="40" step="1" value="10" data-gw="view"> <b data-gw="view-out">10</b></label>
      <div class="gw-toggles">${GROWTH.map((item) => `<label class="${item.cls}"><input type="checkbox" data-gw-curve="${item.id}"${item.id === 'fact' ? '' : ' checked'}> ${escapeHtml(item.label)}</label>`).join('')}</div>
    </div>
    <div class="gw-plot" data-gw="growth"></div>
  </section>
  <section class="gw-section">
    <h2>${escapeHtml(t('gw.h.bounds'))}</h2>
    <dl class="gw-defs">${defs}</dl>
    <p class="gw-hint">${escapeHtml(t('gw.hint.theta'))}</p>
    <div class="gw-controls">
      <label>f(n) <select data-gw="f">${FUNCTIONS.map((item) => option(item, 'lin10')).join('')}</select></label>
      <label>g(n) <select data-gw="g">${FUNCTIONS.map((item) => option(item, 'n12')).join('')}</select></label>
      <div class="gw-modes" role="radiogroup" aria-label="Bound">${Object.entries(MODE_SIGN).map(([key, sign]) => `<label><input type="radio" name="gw-mode" value="${key}"${key === 'O' ? ' checked' : ''}> ${sign}</label>`).join('')}</div>
      <label data-gw="c1-box">c₁ <input type="range" min="0.1" max="10" step="0.1" value="0.5" data-gw="c1"> <b data-gw="c1-out">0.5</b></label>
      <label data-gw="c2-box">c / c₂ <input type="range" min="0.1" max="10" step="0.1" value="2" data-gw="c2"> <b data-gw="c2-out">2</b></label>
      <label>${escapeHtml(t('gw.nUpTo'))} <input type="range" min="10" max="200" step="5" value="60" data-gw="xmax"> <b data-gw="xmax-out">60</b></label>
    </div>
    <div class="gw-plot" data-gw="bounds"></div>
    <p class="gw-hint gw-howto">${escapeHtml(t('gw.howto'))}</p>
    <p class="gw-verdict" data-gw="verdict" role="status"></p>
    <div class="gw-table" data-gw="membership"></div>
  </section>`;
}

function opsMarkup(n, open) {
  const badges = { ok: 'OK', borderline: t('gw.borderline'), tle: 'TLE' };
  const rows = CLASSES.map((cls) => {
    const result = estimate(cls, n);
    const log = Math.min(cls.log10(n), 20);
    const ops = result.ops === null ? t('gw.notComputed') : formatCount(result.ops);
    const time = result.seconds === null ? '—' : formatSeconds(result.seconds);
    const isOpen = open === cls.id;
    const example = isOpen ? `<tr class="gw-example"><td colspan="5"><p>${escapeHtml(t(`gw.ex.${cls.id}`))}</p><pre class="code-block" translate="no"><code class="language-cpp">${cls.example.map((line) => highlightCpp(line)).join('\n')}</code></pre></td></tr>` : '';
    return `<tr class="gw-row is-${result.status}${isOpen ? ' is-open' : ''}" data-gw-row="${cls.id}"><td><button type="button" class="gw-class" data-gw-class="${cls.id}" aria-expanded="${isOpen}">${escapeHtml(cls.label)} <span class="gw-code-chip" aria-hidden="true">${isOpen ? '▾' : '▸'} code</span></button></td><td>${escapeHtml(ops)}</td><td>${escapeHtml(time)}</td><td><span class="gw-badge ${result.status}">${escapeHtml(badges[result.status])}</span></td>`
      + `<td class="gw-bar-col"><span class="gw-bar"><i style="width:${Math.max(1, (log / 20) * 100).toFixed(1)}%"></i><em style="left:${(LIMIT_LOG / 20) * 100}%"></em></span></td></tr>${example}`;
  }).join('');
  return `<table><thead><tr><th>${escapeHtml(t('gw.col.class'))}</th><th>${escapeHtml(t('gw.col.ops', { n: formatCount(n) }))}</th><th>${escapeHtml(t('gw.col.time'))}</th><th></th><th class="gw-bar-col">${escapeHtml(t('gw.col.bar'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function feasibleMarkup(n) {
  const row = feasibleRow(n);
  return `<table><thead><tr><th>n</th><th>${escapeHtml(t('gw.col.feasible'))}</th></tr></thead><tbody>${FEASIBLE.map(([max, classes], index) => `<tr${index === row.index ? ' class="is-current"' : ''}><td>n ≤ ${escapeHtml(formatCount(max))}</td><td>${escapeHtml(classes)}</td></tr>`).join('')}</tbody></table>`;
}

function membershipMarkup(f) {
  const mark = (value) => (value ? '<span class="yes">✓</span>' : '<span class="no">✗</span>');
  return `<table><thead><tr><th>${escapeHtml(t('gw.col.member', { f: f.label }))}</th><th>O(g)</th><th>Ω(g)</th><th>Θ(g)</th></tr></thead><tbody>${FUNCTIONS.map((g) => {
    const b = bound(f, g);
    return `<tr><td>g(n) = ${escapeHtml(g.label)}</td><td>${mark(b.O)}</td><td>${mark(b.Omega)}</td><td>${mark(b.Theta)}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function mount(host) {
  host.innerHTML = layoutMarkup();
  const el = (name) => host.querySelector(`[data-gw="${name}"]`);
  const state = { open: null, n: 1000, view: 10, shown: new Set(GROWTH.filter((item) => item.id !== 'fact').map((item) => item.id)), f: 'lin10', g: 'n12', mode: 'O', c1: 0.5, c2: 2, xMax: 60 };

  const renderGrowth = () => {
    el('view-out').textContent = String(state.view);
    el('growth').innerHTML = growthSvg(state.view, state.shown, state.n);
  };
  const renderN = () => {
    el('slider').value = String(sliderFromN(state.n));
    el('n').value = String(state.n);
    el('ops').innerHTML = opsMarkup(state.n, state.open);
    el('feasible').innerHTML = feasibleMarkup(state.n);
    renderGrowth();
  };
  const renderBounds = () => {
    const f = FUNCTIONS.find((item) => item.id === state.f);
    const g = FUNCTIONS.find((item) => item.id === state.g);
    el('c1-box').hidden = state.mode === 'O';
    el('c2-box').hidden = state.mode === 'Omega';
    el('c1-out').textContent = trim(state.c1);
    el('c2-out').textContent = trim(state.c2);
    el('xmax-out').textContent = String(state.xMax);
    const { svg, n0 } = boundsSvg({ f, g, mode: state.mode, c1: state.c1, c2: state.c2, xMax: state.xMax });
    el('bounds').innerHTML = svg;
    const result = verdict(f, g, state.mode, n0, state.xMax);
    el('verdict').textContent = result.text;
    el('verdict').classList.toggle('is-no', !result.ok);
    el('membership').innerHTML = membershipMarkup(f);
  };

  el('ops').addEventListener('click', (event) => {
    // The whole row toggles its example; the button inside keeps keyboard access.
    const row = event.target.closest('[data-gw-row]');
    if (!row) return;
    state.open = state.open === row.dataset.gwRow ? null : row.dataset.gwRow;
    el('ops').innerHTML = opsMarkup(state.n, state.open);
  });
  el('slider').addEventListener('input', (event) => { state.n = nFromSlider(event.target.value); renderN(); });
  el('n').addEventListener('change', (event) => {
    const value = Math.round(Number(event.target.value));
    if (Number.isFinite(value) && value >= 1 && value <= 1e18) state.n = value;
    renderN();
  });
  host.querySelectorAll('[data-gw-n]').forEach((button) => button.addEventListener('click', () => { state.n = Number(button.dataset.gwN); renderN(); }));
  el('view').addEventListener('input', (event) => { state.view = Number(event.target.value); renderGrowth(); });
  host.querySelectorAll('[data-gw-curve]').forEach((box) => box.addEventListener('change', () => {
    if (box.checked) state.shown.add(box.dataset.gwCurve);
    else state.shown.delete(box.dataset.gwCurve);
    renderGrowth();
  }));
  el('f').addEventListener('change', (event) => { state.f = event.target.value; renderBounds(); });
  el('g').addEventListener('change', (event) => { state.g = event.target.value; renderBounds(); });
  host.querySelectorAll('input[name="gw-mode"]').forEach((radio) => radio.addEventListener('change', () => { state.mode = radio.value; renderBounds(); }));
  el('c1').addEventListener('input', (event) => { state.c1 = Number(event.target.value); renderBounds(); });
  el('c2').addEventListener('input', (event) => { state.c2 = Number(event.target.value); renderBounds(); });
  el('xmax').addEventListener('input', (event) => { state.xMax = Number(event.target.value); renderBounds(); });

  renderN();
  renderBounds();
}

export default {
  id: 'complexity',
  side: 'algo',
  group: 'Analysis',
  title: 'Growth of functions',
  summary: 'Drag n and see how many operations each complexity needs and which ones still fit in about a second. Then compare growth curves and check O, Ω, and Θ bounds yourself.',
  widget: { mount, listLabel: 'O(1) … O(n!) · O vs Θ' },
};
