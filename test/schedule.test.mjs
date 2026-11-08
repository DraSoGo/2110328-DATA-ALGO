import test from 'node:test';
import assert from 'node:assert/strict';
import { courseWeeks, currentWeek, parseCourseDate, SESSION_LABEL, sessionKind, weekRangeLabel } from '../src/lib/schedule.js';

const problem = (name, date, session = 'บ่าย') => ({ id: `t/${name}`, name, schedule: [{ topic: 't', date, session }] });
const TODAY = new Date(2026, 10, 8);

test('parseCourseDate reads "D Mon" in the given year', () => {
  assert.deepEqual(parseCourseDate('2 Nov', 2026), new Date(2026, 10, 2));
  assert.deepEqual(parseCourseDate('1 Dec', 2026), new Date(2026, 11, 1));
  assert.equal(parseCourseDate('', 2026), null);
  assert.equal(parseCourseDate('soon', 2026), null);
});

test('sessionKind maps homework, its typo, and everything else to afternoon', () => {
  assert.equal(sessionKind('การบ้าน'), 'homework');
  assert.equal(sessionKind('การบ้นา'), 'homework');
  assert.equal(sessionKind('บ่าย'), 'afternoon');
  assert.equal(sessionKind(''), 'afternoon');
  assert.equal(sessionKind(undefined), 'afternoon');
  assert.deepEqual(SESSION_LABEL, { afternoon: 'บ่าย', homework: 'การบ้าน' });
});

test('courseWeeks numbers Monday-to-Sunday weeks from the first course week', () => {
  const weeks = courseWeeks([problem('a', '2 Nov'), problem('b', '8 Nov'), problem('c', '9 Nov'), problem('d', '1 Dec')], TODAY);
  assert.deepEqual(weeks.map((week) => [week.number, week.items.map((item) => item.problem.name)]), [[1, ['a', 'b']], [2, ['c']], [5, ['d']]]);
  assert.deepEqual(weeks[0].start, new Date(2026, 10, 2));
  assert.deepEqual(weeks[0].end, new Date(2026, 10, 8));
  assert.deepEqual(weeks[2].start, new Date(2026, 10, 30));
});

test('courseWeeks sorts by date, then afternoon before homework, then name, and drops duplicates', () => {
  const twice = { id: 't/z', name: 'z', schedule: [{ topic: 't', date: '3 Nov', session: 'บ่าย' }, { topic: 't', date: '4 Nov', session: 'บ่าย' }] };
  const weeks = courseWeeks([problem('c', '3 Nov', 'การบ้าน'), problem('b', '3 Nov'), problem('a', '2 Nov', 'การบ้าน'), twice], TODAY);
  assert.deepEqual(weeks[0].items.map((item) => [item.problem.name, item.session]), [['a', 'homework'], ['b', 'afternoon'], ['z', 'afternoon'], ['c', 'homework']]);
});

test('courseWeeks keeps the course year after New Year and ignores undated problems', () => {
  const weeks = courseWeeks([problem('a', '1 Dec'), { id: 'x', name: 'x', schedule: [] }], new Date(2027, 1, 1));
  assert.deepEqual(weeks[0].items[0].date, new Date(2026, 11, 1));
  assert.deepEqual(courseWeeks([{ id: 'x', name: 'x', schedule: [] }], TODAY), []);
});

test('currentWeek finds this week, else the next one, else the last one', () => {
  const weeks = courseWeeks([problem('a', '2 Nov'), problem('b', '24 Nov'), problem('c', '1 Dec')], TODAY);
  assert.deepEqual(currentWeek(weeks, TODAY), { week: weeks[0], label: 'This week' });
  assert.deepEqual(currentWeek(weeks, new Date(2026, 10, 18)), { week: weeks[1], label: 'Next up' });
  assert.deepEqual(currentWeek(weeks, new Date(2026, 9, 1)), { week: weeks[0], label: 'Next up' });
  assert.deepEqual(currentWeek(weeks, new Date(2026, 11, 20)), { week: weeks[2], label: 'Latest' });
  assert.equal(currentWeek([], TODAY), null);
});

test('weekRangeLabel shortens same-month ranges', () => {
  const weeks = courseWeeks([problem('a', '2 Nov'), problem('b', '1 Dec')], TODAY);
  assert.equal(weekRangeLabel(weeks[0]), '2–8 Nov');
  assert.equal(weekRangeLabel(weeks[1]), '30 Nov – 6 Dec');
});
