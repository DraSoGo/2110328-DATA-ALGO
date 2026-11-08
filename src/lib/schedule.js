const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const MONTH_NAMES = Object.keys(MONTHS);
const SESSION_ORDER = { afternoon: 0, homework: 1 };

export const SESSION_LABEL = { afternoon: 'บ่าย', homework: 'การบ้าน' };

export function parseCourseDate(text, year) {
  const match = String(text || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!match || !(match[2] in MONTHS)) return null;
  return new Date(year, MONTHS[match[2]], Number(match[1]));
}

export function sessionKind(session) {
  return /^การบ้/.test(String(session || '').trim()) ? 'homework' : 'afternoon';
}

// Course dates carry no year. The course runs in the second half of the year,
// so a visit in January–June still belongs to the previous year's course.
function courseYear(today) {
  return today.getMonth() < 6 ? today.getFullYear() - 1 : today.getFullYear();
}

function startOfWeek(day) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function addDays(day, count) {
  const next = new Date(day);
  next.setDate(next.getDate() + count);
  return next;
}

// Groups every scheduled problem into Monday–Sunday weeks, numbered from the
// first course week. Weeks without problems are skipped but keep their number.
export function courseWeeks(problems, today = new Date()) {
  const year = courseYear(today);
  const items = problems
    .flatMap((problem) => problem.schedule.map((entry) => ({
      problem,
      date: parseCourseDate(entry.date, year),
      session: sessionKind(entry.session),
    })))
    .filter((item) => item.date)
    .sort((a, b) => a.date - b.date || SESSION_ORDER[a.session] - SESSION_ORDER[b.session] || a.problem.name.localeCompare(b.problem.name));
  if (!items.length) return [];

  const first = startOfWeek(items[0].date);
  const weeks = new Map();
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.problem.id)) continue;
    seen.add(item.problem.id);
    const start = startOfWeek(item.date);
    const number = Math.round((start - first) / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (!weeks.has(number)) weeks.set(number, { number, start, end: addDays(start, 6), items: [] });
    weeks.get(number).items.push(item);
  }
  return [...weeks.values()];
}

export function currentWeek(weeks, today = new Date()) {
  if (!weeks.length) return null;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const inside = weeks.find((week) => week.start <= day && day <= week.end);
  if (inside) return { week: inside, label: 'This week' };
  const upcoming = weeks.find((week) => week.start > day);
  if (upcoming) return { week: upcoming, label: 'Next up' };
  return { week: weeks.at(-1), label: 'Latest' };
}

export function weekRangeLabel(week) {
  const { start, end } = week;
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}
