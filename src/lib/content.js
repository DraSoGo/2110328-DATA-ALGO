import { parseCourseDate, sessionKind } from './schedule.js';

const SESSION_ORDER = { afternoon: 0, homework: 1 };

export function pageRoute(hash = '') {
  const base = { page: 'overview', problemId: null, side: null, module: null, week: null };
  try {
    if (hash.startsWith('#/p/') && hash.length > 4) return { ...base, page: 'problem', problemId: decodeURIComponent(hash.slice(4)) };
  } catch {
    return base;
  }
  const week = hash.match(/^#\/week(?:\/(\d+))?$/);
  if (week) return { ...base, page: 'week', week: week[1] ? Number(week[1]) : null };
  const learn = hash.match(/^#\/learn(?:\/(data|algo)(?:\/([\w-]+))?)?\/?$/);
  if (learn) return { ...base, page: 'learn', side: learn[1] || null, module: learn[2] || null };
  return base;
}

export function filterProblems(problems, query = '') {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return problems;
  return problems.filter((problem) => `${problem.name} ${problem.title} ${problem.topic} ${problem.tags.join(' ')}`
    .toLocaleLowerCase()
    .includes(needle));
}

export function summarizeProblems(problems) {
  const byName = new Map();
  for (const problem of problems) {
    const entry = byName.get(problem.name) || { statement: false, solution: false, testcases: false };
    entry.statement ||= Boolean(problem.statement);
    entry.solution ||= problem.solution.length > 0;
    entry.testcases ||= problem.testcases.length > 0;
    byName.set(problem.name, entry);
  }
  const entries = [...byName.values()];
  return {
    problems: entries.length,
    topics: new Set(problems.map((problem) => problem.topicDir)).size,
    statements: entries.filter((entry) => entry.statement).length,
    solutions: entries.filter((entry) => entry.solution).length,
    testcaseSets: entries.filter((entry) => entry.testcases).length,
  };
}

// Sort key inside a topic: first scheduled date, afternoon before homework, then name.
// Dates only need to compare within one course, so any fixed year works.
function scheduleKey(problem) {
  const entry = problem.schedule[0];
  const date = entry ? parseCourseDate(entry.date, 2000) : null;
  return [date ? date.getTime() : Infinity, entry ? SESSION_ORDER[sessionKind(entry.session)] : 0];
}

export function buildTopicTree(problems) {
  const topics = new Map();
  for (const problem of problems) {
    if (!topics.has(problem.topicDir)) {
      topics.set(problem.topicDir, {
        id: `t:${problem.topicDir}`,
        name: problem.topic,
        code: problem.topicOrder === 99 ? 'OTH' : String(problem.topicOrder).padStart(2, '0'),
        order: problem.topicOrder,
        problems: [],
      });
    }
    topics.get(problem.topicDir).problems.push(problem);
  }
  return [...topics.values()]
    .sort((a, b) => a.order - b.order)
    .map((topic) => ({
      ...topic,
      problems: [...topic.problems].sort((a, b) => {
        const [dateA, sessionA] = scheduleKey(a);
        const [dateB, sessionB] = scheduleKey(b);
        return dateA - dateB || sessionA - sessionB || a.name.localeCompare(b.name);
      }),
    }));
}

export function orderedProblems(problems) {
  return buildTopicTree(problems).flatMap((topic) => topic.problems);
}

export function adjacentProblems(problems, id) {
  const index = problems.findIndex((problem) => problem.id === id);
  if (index < 0) return { previous: null, next: null };
  return { previous: problems[index - 1] || null, next: problems[index + 1] || null };
}

export function categoryIsOpen({ category, activeCategory, query, openCategories, closedCategories }) {
  if (query) return true;
  if (closedCategories.has(category)) return false;
  return openCategories.has(category) || activeCategory === category;
}

export function preserveScrollPosition(getScroller, render) {
  const scrollTop = getScroller()?.scrollTop ?? 0;
  render();
  const nextScroller = getScroller();
  if (nextScroller) nextScroller.scrollTop = scrollTop;
}

export function truncationLabel(file) {
  return file?.truncated ? 'PREVIEW · FIRST 2 KB' : '';
}

export function resourceStatus(problem) {
  return [
    { label: 'PDF', ready: Boolean(problem.statement) },
    { label: 'SOLUTION', ready: problem.solution.length > 0 },
    { label: 'TESTCASE', ready: problem.testcases.length > 0 },
  ];
}
