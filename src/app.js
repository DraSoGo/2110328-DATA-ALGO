import {
  adjacentProblems, buildTopicTree, categoryIsOpen, filterProblems, orderedProblems,
  pageRoute, preserveScrollPosition, resourceStatus, summarizeProblems, truncationLabel,
} from './lib/content.js';
import { highlightCpp } from './lib/cpp-highlight.js';
import { escapeHtml } from './lib/html.js';
import { getLang, initLang, plural, setLang, t } from './lib/i18n.js';
import { modulesFor } from './learn/modules.js';
import { slidePath, SLIDES } from './learn/slides.js';
import { learnPageMarkup, mountLearn, unmountLearn } from './learn/view.js';
import { courseWeeks, currentWeek, SESSION_LABEL, weekRangeLabel } from './lib/schedule.js';
import { formatBytes, loadTestcasePair } from './lib/testcase-viewer.js';
import { showTemporaryButtonStatus } from './lib/ui.js';

const app = document.querySelector('#app');
const state = { problems: [], query: '', openNodes: new Set(), closedNodes: new Set(), sidebarOpen: false };

const icon = (name) => ({
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg>',
  code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5m6-10 5 5-5 5"/></svg>',
  flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 16h10"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.2 8.2 0 1 0 20 15.5Z"/></svg>',
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v6H4V5h6"/></svg>',
}[name]);

function asset(path) { return new URL(`../${path}`, import.meta.url).href; }
function problemHref(problem) { return `#/p/${encodeURIComponent(problem.id)}`; }
function activeProblem() {
  const route = pageRoute(location.hash);
  return route.page === 'problem' ? state.problems.find((problem) => problem.id === route.problemId) || null : null;
}
function resourceDot(available, label) { return `<span class="resource-dot ${available ? 'ready' : ''}" title="${escapeHtml(label)}"><span></span>${escapeHtml(label)}</span>`; }
function emptyResource(kind, title, message) {
  return `<div class="empty-resource"><div class="empty-icon">${icon(kind)}</div><code>STATUS: NOT_FOUND</code><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`;
}

function treeProblemMarkup(problem, activeId) {
  return `<a class="tree-problem ${activeId === problem.id ? 'active' : ''}" href="${problemHref(problem)}">
    <span class="tree-line"></span><span><code>${escapeHtml(problem.name)}</code><small>${escapeHtml(problem.title)}</small></span>
    ${statusDots(problem)}
  </a>`;
}

function statusDots(problem) {
  const items = resourceStatus(problem);
  const names = { PDF: t('res.pdf'), SOLUTION: t('res.solution'), TESTCASE: t('res.testcase') };
  const summary = items.map((item) => t(item.ready ? 'dot.ready' : 'dot.missing', { label: names[item.label] })).join(' · ');
  return `<span class="status-dots" title="${escapeHtml(summary)}" aria-label="${escapeHtml(summary)}">${items.map((item) => `<i class="${item.ready ? 'ready' : ''}"></i>`).join('')}</span>`;
}

function learnNavMarkup(route) {
  const open = categoryIsOpen({
    category: 'learn', activeCategory: route.page === 'learn' ? 'learn' : null, query: '',
    openCategories: state.openNodes, closedCategories: state.closedNodes,
  });
  const sides = [{ id: 'data', code: 'DS', title: t('nav.data') }, { id: 'algo', code: 'AL', title: t('nav.algo') }];
  return `<section class="tree-group learn-nav ${open ? 'open' : ''}" aria-label="${escapeHtml(t('nav.learning'))}">
    <button class="tree-heading" type="button" data-node="learn" aria-expanded="${open}">
      ${icon('chevron')}<span class="tree-code">LRN</span><strong>${escapeHtml(t('nav.learning'))}</strong><span class="tree-count">${sides.length}</span>
    </button>
    <div ${open ? '' : 'hidden'}>${sides.map((side) => `<a class="learn-link${route.page === 'learn' && route.side === side.id ? ' active' : ''}" href="#/learn/${side.id}">
      <span>${side.code}</span><strong>${side.title}</strong><small>${modulesFor(side.id).length}</small>
    </a>`).join('')}</div>
  </section>`;
}

function weekNavMarkup(route) {
  const weeks = courseWeeks(state.problems);
  const now = currentWeek(weeks);
  if (!now) return '';
  const selected = route.page === 'week' ? (route.week ?? now.week.number) : null;
  return `<section class="week-nav" aria-label="${escapeHtml(t('nav.courseWeeks'))}">
    <p class="week-nav-head"><span>★</span>${escapeHtml(t('nav.weeks'))}</p>
    ${weeks.map((week) => `<a class="week-link${week.number === selected ? ' active' : ''}" href="#/week/${week.number}">
      <span>W${week.number}</span><strong>${escapeHtml(weekRangeLabel(week))}</strong>${week === now.week && now.label === 'This week' ? `<em>${escapeHtml(t('week.now'))}</em>` : '<i></i>'}<small>${week.items.length}</small>
    </a>`).join('')}
  </section>`;
}

function sidebarMarkup() {
  const route = pageRoute(location.hash);
  const activeId = route.page === 'problem' ? route.problemId : null;
  const visible = new Set(filterProblems(state.problems, state.query).map((problem) => problem.id));
  const isOpen = (id, containsActive) => categoryIsOpen({
    category: id, activeCategory: containsActive ? id : null, query: state.query,
    openCategories: state.openNodes, closedCategories: state.closedNodes,
  });
  return `<aside class="sidebar ${state.sidebarOpen ? 'is-open' : ''}" aria-label="${escapeHtml(t('nav.problems'))}">
    <div class="sidebar-head"><span>COURSE_INDEX</span><button class="sidebar-close" type="button" aria-label="${escapeHtml(t('nav.close'))}">×</button></div>
    <nav class="course-tree" id="course-tree">
      ${weekNavMarkup(route)}
      ${learnNavMarkup(route)}
      ${buildTopicTree(state.problems).map((topic) => {
        const list = state.query ? topic.problems.filter((problem) => visible.has(problem.id)) : topic.problems;
        if (!list.length) return '';
        const topicOpen = isOpen(topic.id, topic.problems.some((problem) => problem.id === activeId));
        return `<section class="tree-group tree-parent ${topicOpen ? 'open' : ''}">
          <button class="tree-heading tree-parent-heading" type="button" data-node="${escapeHtml(topic.id)}" aria-expanded="${topicOpen}">
            ${icon('chevron')}<span class="tree-code">${escapeHtml(topic.code)}</span><strong>${escapeHtml(topic.name)}</strong><span class="tree-count">${list.length}</span>
          </button>
          <div class="tree-problems" ${topicOpen ? '' : 'hidden'}>${list.map((problem) => treeProblemMarkup(problem, activeId)).join('')}</div>
        </section>`;
      }).join('')}
    </nav>
    <div class="sidebar-foot"><span><i class="status-led"></i>SYSTEM ONLINE</span><span>v1.0.0</span></div>
  </aside>`;
}

function shellMarkup() {
  const summary = summarizeProblems(state.problems);
  return `<header class="topbar">
    <button class="menu-button" type="button" aria-label="${escapeHtml(t('nav.open'))}">${icon('menu')}</button>
    <a class="wordmark" href="#/"><span class="prompt-mark">&gt;_</span><span><strong>DATA_ALGO</strong><small>DATA STRUCTURES &amp; ALGORITHMS</small></span></a>
    <label class="global-search">${icon('search')}<span class="sr-only">${escapeHtml(t('search.label'))}</span><input type="search" id="global-search" placeholder="${escapeHtml(t('search.placeholder'))}" autocomplete="off" value="${escapeHtml(state.query)}"><kbd>/</kbd></label>
    <div class="system-summary"><span>${summary.problems}<small>${escapeHtml(t('summary.problems'))}</small></span><span>${summary.statements}<small>${escapeHtml(t('summary.pdf'))}</small></span><span>${summary.solutions}<small>${escapeHtml(t('summary.solutions'))}</small></span></div>
    <button class="lang-button" type="button" aria-label="${escapeHtml(t('lang.switch'))}"><span class="${getLang() === 'th' ? 'is-on' : ''}">TH</span><span class="${getLang() === 'en' ? 'is-on' : ''}">EN</span></button>
    <button class="theme-button" type="button" aria-label="${escapeHtml(t('theme.toggle'))}">${document.documentElement.dataset.theme === 'dark' ? icon('sun') : icon('moon')}</button>
  </header>
  <div class="workspace">${sidebarMarkup()}<button class="sidebar-scrim" type="button" aria-label="Close navigation"></button><main id="main" tabindex="-1"></main></div>`;
}

function overviewMarkup() {
  const summary = summarizeProblems(state.problems);
  const tree = buildTopicTree(state.problems);
  return `<div class="overview view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo</span><span>overview.exe</span></div>
    <section class="overview-hero">
      <p class="command-line"><span>$</span> ./browse-problems --course data-algo</p>
      <h1>Problem<br><span>Browser</span><i>_</i></h1>
      <p class="overview-copy">${escapeHtml(t('overview.copy'))}</p>
    </section>
    <section class="metric-grid" aria-label="Library summary">
      <article><span>01</span><strong>${summary.problems}</strong><small>${escapeHtml(t('metric.problems'))}</small></article>
      <article><span>02</span><strong>${summary.topics}</strong><small>${escapeHtml(t('metric.topics'))}</small></article>
      <article><span>03</span><strong>${summary.statements}</strong><small>${escapeHtml(t('metric.pdf'))}</small></article>
      <article><span>04</span><strong>${summary.testcaseSets}</strong><small>${escapeHtml(t('metric.testcases'))}</small></article>
    </section>
    <section class="overview-grid">
      <div class="quick-start"><div class="panel-title"><span>QUICK_START.md</span><i></i></div><ol>
        <li><span>01</span><div><strong>${escapeHtml(t('quick.week.title'))}</strong><p>${escapeHtml(t('quick.week.text'))}</p></div></li>
        <li><span>02</span><div><strong>${escapeHtml(t('quick.problem.title'))}</strong><p>${escapeHtml(t('quick.problem.text'))}</p></div></li>
        <li><span>03</span><div><strong>${escapeHtml(t('quick.learn.title'))}</strong><p>${escapeHtml(t('quick.learn.text'))}</p></div></li>
      </ol></div>
      <div class="topic-terminal"><div class="panel-title"><span>topics.list</span><i></i></div><div class="terminal-body">${tree.map((topic) => `<button type="button" data-jump="${escapeHtml(topic.id)}"><span>${escapeHtml(topic.code)}</span><strong>${escapeHtml(topic.name)}</strong><small>${topic.problems.length}</small></button>`).join('')}<p><span>$</span> ${escapeHtml(t('topics.prompt'))}<span class="cursor">█</span></p></div></div>
    </section>
  </div>`;
}

function weekMarkup(route) {
  const weeks = courseWeeks(state.problems);
  const now = currentWeek(weeks);
  const week = now && (route.week ? weeks.find((item) => item.number === route.week) : now.week);
  const head = (label) => `<div class="terminal-label"><span>~/cedt/data_algo/week</span><span>schedule.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">${escapeHtml(t('crumb.root'))}</a><span>/</span><strong>${escapeHtml(label)}</strong></nav>`;
  if (!week) {
    const message = now ? emptyResource('file', t('week.notFound.title'), t('week.notFound.text')) : emptyResource('file', t('week.none.title'), t('week.none.text'));
    return `<div class="week-view view-enter">${head(t('crumb.weeks'))}${message}</div>`;
  }
  const days = new Map();
  for (const item of week.items) {
    const key = item.date.toDateString();
    if (!days.has(key)) days.set(key, { date: item.date, items: [] });
    days.get(key).items.push(item);
  }
  const index = weeks.indexOf(week);
  const previous = weeks[index - 1];
  const next = weeks[index + 1];
  const pagerLink = (target, label, className) => (target ? `<a class="${className}" href="#/week/${target.number}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(t('pager.week', { n: target.number }))}</strong><span>${escapeHtml(weekRangeLabel(target))}</span></a>` : '<span></span>');
  return `<div class="week-view view-enter">
    ${head(t('crumb.week', { n: week.number }))}
    <h1 class="week-title">${escapeHtml(t('week.title', { n: week.number }))}</h1>
    <p class="week-sub">${escapeHtml(weekRangeLabel(week))} · ${escapeHtml(t('week.count', { count: week.items.length, s: plural(week.items.length) }))}${week === now.week ? ` · ${escapeHtml(t(`week.status.${now.label}`))}` : ''}</p>
    ${[...days.values()].map((day) => `<section class="week-day">
      <h2>${escapeHtml(day.date.toLocaleDateString(getLang() === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</h2>
      <div class="week-grid">${day.items.map((item) => `<a class="week-card" href="${problemHref(item.problem)}">
        <span class="week-card-top"><span class="session-pill ${item.session}">${SESSION_LABEL[item.session]}</span>${statusDots(item.problem)}</span>
        <code>${escapeHtml(item.problem.name)}</code><strong>${escapeHtml(item.problem.title)}</strong><small>${escapeHtml(item.problem.topic)}</small>
      </a>`).join('')}</div>
    </section>`).join('')}
    <nav class="problem-pagination" aria-label="Adjacent weeks">${pagerLink(previous, t('pager.previous'), '')}${pagerLink(next, t('pager.next'), 'next')}</nav>
  </div>`;
}

function learnMarkup(route) {
  if (route.side) return learnPageMarkup(route);
  const sides = [
    { id: 'data', index: '01', title: t('learn.data.title'), copy: t('learn.data.copy') },
    { id: 'algo', index: '02', title: t('learn.algo.title'), copy: t('learn.algo.copy') },
  ];
  return `<div class="learn-view view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo/learn</span><span>learn.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/learn">${escapeHtml(t('crumb.learn'))}</a></nav>
    <h1 class="learn-title">${escapeHtml(t('learn.title'))}</h1>
    <div class="learn-sides">${sides.map((side) => `<a class="learn-side" href="#/learn/${side.id}"><span>${side.index}</span><strong>${escapeHtml(side.title)}</strong><p>${escapeHtml(side.copy)}</p><small>${escapeHtml(t('learn.modules', { count: modulesFor(side.id).length, s: plural(modulesFor(side.id).length).toUpperCase() }))}</small></a>`).join('')}</div>
    <section class="slide-index" aria-labelledby="slide-index-title">
      <h2 id="slide-index-title">${escapeHtml(t('learn.slides'))}</h2>
      ${[['data', t('learn.slides.data')], ['algo', t('learn.slides.algo')]].map(([side, title]) => `<div><h3>${escapeHtml(title)}</h3><ul>${SLIDES.filter((slide) => slide.side === side).map((slide) => `<li><a href="${escapeHtml(asset(slidePath(slide)))}" target="_blank" rel="noopener"><span>${escapeHtml(slide.title)}</span><small>${escapeHtml(slide.file)}</small></a></li>`).join('')}</ul></div>`).join('')}
    </section>
  </div>`;
}

function problemMarkup(problem) {
  const adjacent = adjacentProblems(orderedProblems(state.problems), problem.id);
  const hasSolution = problem.solution.length > 0;
  const hasTests = problem.testcases.length > 0;
  const fileCount = t('state.files', { count: problem.solution.length, s: plural(problem.solution.length).toUpperCase() });
  return `<div class="problem-view view-enter">
    <div class="terminal-label"><span>~/problems/${escapeHtml(problem.topicDir)}</span><span>#${escapeHtml(problem.graderId ?? '—')}</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">${escapeHtml(t('crumb.root'))}</a><span>/</span><button type="button" data-jump="t:${escapeHtml(problem.topicDir)}">${escapeHtml(problem.topic)}</button><span>/</span><strong>${escapeHtml(problem.name)}</strong></nav>
    <header class="problem-head">
      <div><code>${escapeHtml(problem.name)}</code><h1>${escapeHtml(problem.title)}</h1>${problem.tags.length ? `<div class="tag-list">${problem.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}</div>
      <div class="artifact-status">${resourceDot(problem.statement, t('res.pdf'))}${resourceDot(hasSolution, t('res.solution'))}${resourceDot(hasTests, t('res.testcase'))}</div>
    </header>
    <div class="tab-bar" role="tablist" aria-label="${escapeHtml(t('tab.resources'))}">
      <button role="tab" aria-selected="true" data-tab="statement">${icon('file')}<span>${escapeHtml(t('tab.statement'))}</span><small>${escapeHtml(t(problem.statement ? 'state.ready' : 'state.missing'))}</small></button>
      <button role="tab" aria-selected="false" data-tab="solution">${icon('code')}<span>${escapeHtml(t('tab.solution'))}</span><small>${escapeHtml(hasSolution ? fileCount : t('state.none'))}</small></button>
      <button role="tab" aria-selected="false" data-tab="testcases">${icon('flask')}<span>${escapeHtml(t('tab.testcases'))}</span><small>${hasTests ? problem.testcases.length : escapeHtml(t('state.none'))}</small></button>
    </div>
    <section class="tab-panel" id="panel-statement" role="tabpanel">
      ${problem.statement ? `<div class="resource-toolbar"><span>${icon('file')}<code>statement.pdf</code></span><div><a href="${escapeHtml(asset(problem.statement))}" target="_blank" rel="noopener">${escapeHtml(t('btn.open'))} ${icon('external')}</a><a href="${escapeHtml(asset(problem.statement))}" download>${escapeHtml(t('btn.download'))}</a></div></div><object class="pdf-viewer" data="${escapeHtml(asset(problem.statement))}" type="application/pdf">${emptyResource('file', t('pdf.unavailable.title'), t('pdf.unavailable.text'))}</object>` : emptyResource('file', t('statement.none.title'), t('statement.none.text'))}
    </section>
    <section class="tab-panel" id="panel-solution" role="tabpanel" hidden><div id="solution-content">${hasSolution ? `<div class="inline-loader"><span></span>${escapeHtml(t('solution.reading'))}</div>` : emptyResource('code', t('solution.none.title'), t('solution.none.text'))}</div></section>
    <section class="tab-panel" id="panel-testcases" role="tabpanel" hidden>${hasTests ? `<div class="testcase-browser"><header><span>${escapeHtml(t('tests.set'))}</span><strong>${problem.testcases.length}</strong><small>${escapeHtml(t('tests.io'))}</small></header><div id="testcase-list"><div class="inline-loader"><span></span>${escapeHtml(t('tests.loading'))}</div></div></div>` : emptyResource('flask', t('tests.none.title'), t('tests.none.text'))}</section>
    <nav class="problem-pagination" aria-label="Adjacent problems">
      ${adjacent.previous ? `<a href="${problemHref(adjacent.previous)}"><small>${escapeHtml(t('pager.previous'))}</small><strong>${escapeHtml(adjacent.previous.name)}</strong><span>${escapeHtml(adjacent.previous.title)}</span></a>` : '<span></span>'}
      ${adjacent.next ? `<a class="next" href="${problemHref(adjacent.next)}"><small>${escapeHtml(t('pager.next'))}</small><strong>${escapeHtml(adjacent.next.name)}</strong><span>${escapeHtml(adjacent.next.title)}</span></a>` : '<span></span>'}
    </nav>
  </div>`;
}

async function loadSolution(problem) {
  const container = document.querySelector('#solution-content');
  try {
    const files = await Promise.all(problem.solution.map(async (file) => {
      const response = await fetch(asset(file.path));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ...file, source: await response.text() };
    }));
    container.innerHTML = `${files.length > 1 ? `<div class="file-tabs">${files.map((file, index) => `<button type="button" data-file="${index}" aria-pressed="false">${escapeHtml(file.name)}</button>`).join('')}</div>` : ''}<div class="solution-file"></div>`;
    const show = (index) => {
      const file = files[index];
      container.querySelector('.solution-file').innerHTML = `<div class="code-head"><span><i></i><i></i><i></i><code>${escapeHtml(file.name)}</code></span><button type="button" class="copy-code">${escapeHtml(t('btn.copy'))}</button></div><pre tabindex="0" translate="no" aria-label="${escapeHtml(file.name)} source"><code class="language-cpp">${highlightCpp(file.source)}</code></pre>`;
      container.querySelectorAll('.file-tabs button').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.file) === index)));
      container.querySelector('.copy-code').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(file.source);
          showTemporaryButtonStatus(button, t('btn.copied'), t('btn.copy'));
        } catch {
          showTemporaryButtonStatus(button, t('btn.failed'), t('btn.copy'));
        }
      });
    };
    container.querySelectorAll('.file-tabs button').forEach((button) => button.addEventListener('click', () => show(Number(button.dataset.file))));
    show(0);
  } catch {
    container.innerHTML = emptyResource('code', t('solution.error.title'), t('solution.error.text'));
  }
}

function testcaseSideMarkup(side, label, index) {
  const sideName = t(label === 'INPUT' ? 'tests.input' : 'tests.output');
  const rawLink = side.file ? `<a href="${escapeHtml(asset(side.file.path))}" target="_blank" rel="noopener">${escapeHtml(t('tests.raw', { side: sideName }))}</a>` : '';
  const badge = truncationLabel(side.file);
  const body = side.error
    ? `<div class="testcase-error"><code>${escapeHtml(side.error)}</code><span>${escapeHtml(t('tests.loadError', { side: sideName }))}</span></div>`
    : `<pre tabindex="0" translate="no"><code>${escapeHtml(side.content)}</code></pre>`;
  return `<section class="testcase-side">
    <header><strong>${escapeHtml(sideName)}</strong><span>${side.file ? formatBytes(side.file.size) : '—'}</span>${badge ? `<span class="trunc-badge" title="${escapeHtml(t('trunc.title'))}">${escapeHtml(t('trunc.badge'))}</span>` : ''}${rawLink}<button type="button" data-copy-case="${index}" data-copy-side="${label.toLowerCase()}" ${side.error ? 'disabled' : ''}>${escapeHtml(t('btn.copy'))}</button></header>
    ${body}
  </section>`;
}

async function loadTestcases(problem) {
  const container = document.querySelector('#testcase-list');
  if (!container || container.dataset.loaded === 'true') return;
  const loaded = await Promise.all(problem.testcases.map((pair) => loadTestcasePair(pair, fetch, asset)));
  container.dataset.loaded = 'true';
  container.innerHTML = loaded.map((pair, index) => `<article class="testcase-card">
    <header><strong>#${index + 1}</strong><code>${escapeHtml(pair.id)}</code></header>
    <div class="testcase-columns">${testcaseSideMarkup(pair.input, 'INPUT', index)}${testcaseSideMarkup(pair.output, 'OUTPUT', index)}</div>
  </article>`).join('');
  container.querySelectorAll('[data-copy-case]').forEach((button) => button.addEventListener('click', async (event) => {
    const target = event.currentTarget;
    const pair = loaded[Number(target.dataset.copyCase)];
    const side = target.dataset.copySide === 'input' ? pair.input : pair.output;
    try {
      await navigator.clipboard.writeText(side.content);
      showTemporaryButtonStatus(target, t('btn.copied'), t('btn.copy'));
    } catch {
      showTemporaryButtonStatus(target, t('btn.failed'), t('btn.copy'));
    }
  }));
}

function focusSearch(event) {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.querySelector('#global-search')?.focus();
  }
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('data-algo-theme', theme); } catch { /* storage unavailable */ }
  document.querySelector('.theme-button').innerHTML = theme === 'dark' ? icon('sun') : icon('moon');
}

function toggleLanguage() {
  setLang(getLang() === 'th' ? 'en' : 'th');
  // Rebuild the whole shell in the new language and re-render the current page.
  app.innerHTML = shellMarkup();
  bindShell();
  bindSidebar();
  renderRoute();
}

let searchShortcutBound = false;

function bindShell() {
  document.querySelector('#global-search').addEventListener('input', (event) => { state.query = event.target.value; updateSidebar(); });
  if (!searchShortcutBound) {
    document.addEventListener('keydown', focusSearch);
    searchShortcutBound = true;
  }
  document.querySelector('.lang-button').addEventListener('click', toggleLanguage);
  document.querySelector('.menu-button').addEventListener('click', () => { state.sidebarOpen = true; updateSidebar(); });
  document.querySelector('.theme-button').addEventListener('click', toggleTheme);
}

function updateSidebar() {
  preserveScrollPosition(
    () => document.querySelector('#course-tree'),
    () => { document.querySelector('.sidebar').outerHTML = sidebarMarkup(); },
  );
  bindSidebar();
}

function bindSidebar() {
  document.querySelectorAll('.tree-heading[data-node]').forEach((button) => button.addEventListener('click', () => {
    const node = button.dataset.node;
    if (button.getAttribute('aria-expanded') === 'true') {
      state.openNodes.delete(node);
      state.closedNodes.add(node);
    } else {
      state.closedNodes.delete(node);
      state.openNodes.add(node);
    }
    updateSidebar();
  }));
  const close = () => { state.sidebarOpen = false; updateSidebar(); };
  document.querySelector('.sidebar-close').addEventListener('click', close);
  document.querySelector('.sidebar-scrim').onclick = close;
  document.querySelectorAll('.learn-link, .week-link, .tree-problem').forEach((link) => link.addEventListener('click', () => {
    const wasOpen = state.sidebarOpen;
    state.sidebarOpen = false;
    // Clicking the current page fires no hashchange, so close the drawer here.
    if (wasOpen && link.classList.contains('active')) updateSidebar();
  }));
}

function jumpToTopic(topicId) {
  const topic = buildTopicTree(state.problems).find((item) => item.id === topicId);
  if (!topic) return;
  state.closedNodes.delete(topic.id);
  state.openNodes.add(topic.id);
  state.query = '';
  document.querySelector('#global-search').value = '';
  state.sidebarOpen = matchMedia('(max-width: 760px)').matches;
  updateSidebar();
  document.querySelector(`.tree-parent-heading[data-node="${CSS.escape(topicId)}"]`)?.scrollIntoView({ block: 'center' });
}

function bindView(problem) {
  document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => jumpToTopic(button.dataset.jump)));
  if (!problem) return;
  document.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('[role="tab"]').forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
    document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `panel-${tab.dataset.tab}`; });
    if (tab.dataset.tab === 'solution' && problem.solution.length && !document.querySelector('#solution-content pre')) loadSolution(problem);
    if (tab.dataset.tab === 'testcases' && problem.testcases.length) loadTestcases(problem);
  }));
}

function renderRoute() {
  // In-page anchors such as the skip link (#main) are not routes.
  if (location.hash && !location.hash.startsWith('#/')) return;
  const route = pageRoute(location.hash);
  const problem = activeProblem();
  const main = document.querySelector('#main');
  // Keep the Learning module list where it was when moving between modules.
  const listScroll = document.querySelector('.module-list')?.scrollTop ?? 0;
  unmountLearn();
  if (problem) {
    document.title = `${problem.name} · Data Algo Atlas`;
    main.innerHTML = problemMarkup(problem);
  } else if (route.page === 'problem') {
    document.title = `${t('title.problemMissing')} · Data Algo Atlas`;
    main.innerHTML = `<div class="problem-view view-enter">${emptyResource('file', t('problem.notFound.title'), t('problem.notFound.text'))}</div>`;
  } else if (route.page === 'week') {
    document.title = `${route.week ? t('week.title', { n: route.week }) : t('title.weeks')} · Data Algo Atlas`;
    main.innerHTML = weekMarkup(route);
  } else if (route.page === 'learn') {
    document.title = `${route.module ? `${route.module} · ` : ''}${t('title.learning')} · Data Algo Atlas`;
    main.innerHTML = learnMarkup(route);
  } else {
    document.title = 'Data Algo Atlas';
    main.innerHTML = overviewMarkup();
  }
  bindView(problem);
  if (route.page === 'learn' && route.side) mountLearn(route, main);
  updateSidebar();
  main.scrollTo(0, 0);
  const list = document.querySelector('.module-list');
  if (list) list.scrollTop = listScroll;
}

async function boot() {
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('data-algo-theme'); } catch { /* storage unavailable */ }
  document.documentElement.dataset.theme = savedTheme || 'dark';
  initLang();
  try {
    const response = await fetch(asset('data/problems.json'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.problems = await response.json();
    const first = buildTopicTree(state.problems)[0];
    if (first) state.openNodes.add(first.id);
    app.className = 'app-shell';
    app.removeAttribute('role');
    app.innerHTML = shellMarkup();
    bindShell();
    bindSidebar();
    renderRoute();
    window.addEventListener('hashchange', renderRoute);
  } catch (error) {
    app.innerHTML = `<div class="fatal-error"><code>BOOT_ERROR ${escapeHtml(error.message)}</code><h1>${escapeHtml(t('boot.error'))}</h1><button type="button" onclick="location.reload()">${escapeHtml(t('btn.retry'))}</button></div>`;
  }
}

boot();
