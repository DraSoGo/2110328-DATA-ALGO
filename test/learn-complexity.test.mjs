import test from 'node:test';
import assert from 'node:assert/strict';
import complexity, {
  bound, CLASSES, FUNCTIONS, estimate, feasibleRow, findN0, formatCount, formatSeconds, nFromSlider, sliderFromN,
} from '../src/learn/algo/complexity.js';

const byId = (id) => CLASSES.find((item) => item.id === id);

test('the module is a widget with a mount function and a list label', () => {
  assert.equal(complexity.id, 'complexity');
  assert.equal(complexity.side, 'algo');
  assert.equal(typeof complexity.widget.mount, 'function');
  assert.match(complexity.widget.listLabel, /O\(1\)/);
});

test('the log-scale slider maps 0..1800 to n = 1..10^18 and back', () => {
  assert.equal(nFromSlider(0), 1);
  assert.equal(nFromSlider(300), 1000);
  assert.equal(nFromSlider(1800), 1e18);
  assert.equal(sliderFromN(1e6), 600);
  assert.equal(sliderFromN(7500), Math.round(Math.log10(7500) * 100));
});

test('estimate counts operations exactly while they fit in the time limit', () => {
  assert.deepEqual(estimate(byId('n2'), 1000), { status: 'ok', ops: 1e6, seconds: 0.01 });
  assert.equal(estimate(byId('n'), 1e8).status, 'ok');
  assert.equal(estimate(byId('nlogn'), 1024).ops, 1024 * 10);
  assert.equal(estimate(byId('log'), 1).ops, 1);
  assert.equal(estimate(byId('const'), 1e18).ops, 1);
});

test('estimate flags borderline cases and stops computing far past the limit', () => {
  assert.equal(estimate(byId('n2'), 2e4).status, 'borderline');
  const tle = estimate(byId('n3'), 1e5);
  assert.equal(tle.status, 'tle');
  assert.equal(tle.ops, null);
  assert.equal(estimate(byId('fact'), 25).status, 'tle');
  assert.equal(estimate(byId('exp'), 1e18).status, 'tle');
  assert.equal(estimate(byId('fact'), 10).status, 'ok');
});

test('feasibleRow follows the n-limit table', () => {
  assert.match(feasibleRow(10).classes, /n!/);
  assert.match(feasibleRow(11).classes, /2\^n/);
  assert.match(feasibleRow(400).classes, /n³/);
  assert.match(feasibleRow(7500).classes, /n²/);
  assert.match(feasibleRow(5e5).classes, /n log n/);
  assert.match(feasibleRow(1e17).classes, /log n/);
});

test('formatting keeps numbers readable', () => {
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(12345), '12,345');
  assert.equal(formatCount(1e12), '1.0 × 10¹²');
  assert.equal(formatSeconds(2e-9), '2 ns');
  assert.equal(formatSeconds(0.5), '500 ms');
  assert.equal(formatSeconds(90), '1.5 min');
});

test('bound compares growth rates for O, Omega, and Theta', () => {
  const f = (id) => FUNCTIONS.find((item) => item.id === id);
  assert.deepEqual(bound(f('lin10'), f('n12')), { O: true, Omega: false, Theta: false });
  assert.deepEqual(bound(f('lin10'), f('lin')), { O: true, Omega: true, Theta: true });
  assert.deepEqual(bound(f('quad2'), f('nlogn')), { O: false, Omega: true, Theta: false });
  assert.deepEqual(bound(f('exp'), f('cube')), { O: false, Omega: true, Theta: false });
});

test('findN0 returns the first n from which the inequality holds to the end of the range', () => {
  const f = FUNCTIONS.find((item) => item.id === 'lin10');
  const g = FUNCTIONS.find((item) => item.id === 'n12');
  const n0 = findN0((n) => f.value(n) <= 2 * g.value(n), 60);
  assert.ok(n0 > 3 && n0 < 5, String(n0));
  assert.equal(findN0((n) => n * n <= n, 60), null);
  assert.equal(findN0(() => true, 60), 1);
});

test('every complexity class has example code and an explanation in both languages', async () => {
  const { DICT } = await import('../src/lib/i18n.js');
  for (const cls of CLASSES) {
    assert.ok(Array.isArray(cls.example) && cls.example.length >= 2, cls.id);
    assert.ok(DICT.en[`gw.ex.${cls.id}`], `en gw.ex.${cls.id}`);
    assert.ok(DICT.th[`gw.ex.${cls.id}`], `th gw.ex.${cls.id}`);
  }
});
