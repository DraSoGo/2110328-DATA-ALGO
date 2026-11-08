# Data Algo Atlas — Phase 1 (Base Site) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Data_Algo/` into a static "Problem Browser" site (ported from Com_prog) that indexes the downloaded grader problems by CSV topic, with Statement / Solution / Testcases tabs, a This-week page, and an empty Learning shell ready for Phase 2.

**Architecture:** Vanilla ES modules in the browser, Node ≥ 20 scripts for indexing, linting, building, and serving. A Node scanner reads every `problems/<NN_topic>/<code>/config.json` and writes `data/problems.json`. The browser app (`src/app.js`) renders everything from that manifest using pure helper modules (`content.js`, `schedule.js`) that are unit-tested with `node --test`. Visual style comes from Com_prog's `styles.css` copied verbatim plus a small `atlas.css` for new pieces.

**Tech Stack:** HTML, CSS, browser ES modules, Node 20+ (`node:test`, `node:fs/promises`), GitHub Pages Actions. No npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md` (Part 1 and build phase 1).

**Security rule for `src/app.js`:** the app builds HTML strings and assigns them with `innerHTML`, the same pattern Com_prog uses. Every value that comes from the manifest or from a fetched file must pass through `escapeHtml()` (or `highlightCpp()`, which escapes its input) before it is placed in a template. Never interpolate a raw manifest field, file content, or `location.hash` value. The manifest is generated locally from this repo, but the rule still applies to every new template you add.

**Paths used below:**
- `DA` = `/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Data_Algo` (repo root, run every command from here)
- `CP` = `/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Com_prog` (source of copied files, read only)

---

## File map

| File | Responsibility |
|---|---|
| `.gitignore` | ignore scratch run files, `dist/`, editor folders |
| `package.json` | npm scripts: dev, index, test, lint, build, verify |
| `problems/<NN_topic>/<code>/…` | problem library (moved from repo root, unchanged) |
| `scripts/grader/` | grader dump + organizer tools (moved from `_tools/`) |
| `scripts/lib/manifest.mjs` | scan problem folders → manifest entries |
| `scripts/generate-manifest.mjs` | write `data/problems.json` |
| `scripts/check-project.mjs` | lint: files exist, manifest fresh |
| `scripts/build.mjs` | write `dist/` for Pages |
| `scripts/serve.mjs` | local dev server |
| `src/lib/schedule.js` | CSV date parsing, session kind, This-week selection |
| `src/lib/content.js` | routes, search, summary, topic tree, ordering, badges |
| `src/lib/cpp-highlight.js`, `testcase-viewer.js`, `ui.js` | copied from Com_prog |
| `src/styles.css` | copied from Com_prog |
| `src/atlas.css` | styles for mode switch, file tabs, badges, week page, learn shell |
| `src/app.js` | browser app: shell, sidebar, overview, week, learn shell, problem page |
| `index.html` | entry page |
| `test/*.test.mjs` | unit tests |
| `.github/workflows/pages.yml` | copied from Com_prog |
| `README.md` | how to use the repo |

---

### Task 1: Scaffold the repo and move the problem library

**Files:**
- Create: `.gitignore`, `package.json`
- Move: `[0-9][0-9]_*/` → `problems/`, `_tools/` → `scripts/grader/`
- Modify: `scripts/grader/organize.py` (report path)

- [ ] **Step 1: Write `.gitignore`**

```gitignore
input.txt
output.txt
sys.txt
dist/
.vscode/
.playwright-mcp/
scripts/grader/organize_report*.json
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "data-algo-atlas",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node scripts/serve.mjs",
    "index": "node scripts/generate-manifest.mjs",
    "test": "node --test",
    "lint": "node scripts/check-project.mjs",
    "build": "node scripts/build.mjs",
    "verify": "npm test && npm run lint && npm run build"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Move topic folders and tools**

```bash
mkdir -p problems scripts
mv [0-9][0-9]_* problems/
mv _tools scripts/grader
ls problems
```

Expected: 18 folders, `01_STL Usage` … `17_ซ้อม Final`, `99_Other`.

- [ ] **Step 4: Point the organizer report next to the script**

In `scripts/grader/organize.py` replace

```python
    (out_root / '_tools' / 'organize_report.json').write_text(
```

with

```python
    (Path(__file__).resolve().parent / 'organize_report.json').write_text(
```

and in the module docstring replace `usage: python3 -I organize.py <dump.zip> <problems.csv> <out_root>` with `usage: python3 -I scripts/grader/organize.py <dump.zip> scripts/grader/problems.csv problems`.

Run: `python3 -I -m py_compile scripts/grader/organize.py && echo ok`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json problems scripts/grader
git commit -m "chore: import grader problem library and tools"
```

---

### Task 2: Copy shared code from Com_prog

**Files:**
- Create (copied): `src/styles.css`, `src/lib/cpp-highlight.js`, `src/lib/testcase-viewer.js`, `src/lib/ui.js`, `test/cpp-highlight.test.mjs`, `test/testcase-viewer.test.mjs`, `test/ui.test.mjs`, `.github/workflows/pages.yml`

- [ ] **Step 1: Copy files**

```bash
CP=/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Com_prog
mkdir -p src/lib test .github/workflows
cp "$CP/src/styles.css" src/styles.css
cp "$CP/src/lib/cpp-highlight.js" "$CP/src/lib/testcase-viewer.js" "$CP/src/lib/ui.js" src/lib/
cp "$CP/test/cpp-highlight.test.mjs" "$CP/test/testcase-viewer.test.mjs" "$CP/test/ui.test.mjs" test/
cp "$CP/.github/workflows/pages.yml" .github/workflows/pages.yml
```

- [ ] **Step 2: Run the copied tests**

Run: `npm test`
Expected: all tests pass, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add src test .github
git commit -m "chore: copy shared viewer code, styles, and Pages workflow from Com_prog"
```

---

### Task 3: Manifest scanner

**Files:**
- Create: `scripts/lib/manifest.mjs`
- Test: `test/manifest.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/manifest.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanProblemLibrary, topicFromDir } from '../scripts/lib/manifest.mjs';

async function writeTree(root, rel, files) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, rel, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

const mapWalk = {
  id: 1528, name: 'da66_f1_map_walk', title: 'Map Walk', tags: [], topic: 'Brute Force',
  schedule: [
    { topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' },
    { topic: 'ซ้อม Final', date: '1 Dec', session: '' },
  ],
  testcase_truncated: [],
};

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-'));
  await writeTree(root, '03_vector/d58_q1_erase_many', {
    'config.json': JSON.stringify({
      id: 1442, name: 'd58_q1_erase_many', title: 'Erase Many from Vector', tags: ['vector', '.h'], topic: 'vector',
      schedule: [{ topic: 'vector', date: '3 Nov', session: 'บ่าย' }],
      testcase_truncated: ['input/02.in'],
    }),
    'statement.pdf': '%PDF-1.4',
    'solution/main.cpp': 'int main() {}',
    'solution/student.h': '// student',
    'solution/erase_many.cbp': '<xml/>',
    'testcase/input/01.in': '1',
    'testcase/output/01.out': '22',
    'testcase/input/02.in': '333',
    'testcase/output/02.out': '4444',
  });
  await writeTree(root, '09_Brute Force/da66_f1_map_walk', {
    'config.json': JSON.stringify(mapWalk), 'statement.pdf': '%PDF', 'solution.cpp': '   \n',
  });
  await writeTree(root, '17_ซ้อม Final/da66_f1_map_walk', {
    'config.json': JSON.stringify(mapWalk), 'statement.pdf': '%PDF', 'solution.cpp': 'int main() { return 0; }\n',
  });
  await writeTree(root, '99_Other/ex01m3', {
    'config.json': JSON.stringify({ id: 1494, name: 'ex01m3', title: 'Larger Restaurant', tags: ['D&C'], topic: null, schedule: [] }),
  });
  await writeTree(root, '99_Other/not_a_problem', { 'notes.txt': 'no config here' });
  return root;
}

test('topicFromDir splits the order prefix and names 99 as Other', () => {
  assert.deepEqual(topicFromDir('12_D&C'), { order: 12, name: 'D&C' });
  assert.deepEqual(topicFromDir('17_ซ้อม Final'), { order: 17, name: 'ซ้อม Final' });
  assert.deepEqual(topicFromDir('99_Other'), { order: 99, name: 'Other' });
});

test('scanProblemLibrary indexes every folder with a config.json in topic order', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems.map((p) => p.id), [
    '03_vector/d58_q1_erase_many',
    '09_Brute Force/da66_f1_map_walk',
    '17_ซ้อม Final/da66_f1_map_walk',
    '99_Other/ex01m3',
  ]);
  const [erase] = problems;
  assert.equal(erase.graderId, 1442);
  assert.equal(erase.name, 'd58_q1_erase_many');
  assert.equal(erase.title, 'Erase Many from Vector');
  assert.deepEqual(erase.tags, ['vector', '.h']);
  assert.equal(erase.topic, 'vector');
  assert.equal(erase.topicDir, '03_vector');
  assert.equal(erase.topicOrder, 3);
  assert.equal(erase.statement, 'problems/03_vector/d58_q1_erase_many/statement.pdf');
});

test('solution lists only C++ sources and treats a blank solution.cpp as missing', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[0].solution, [
    { name: 'main.cpp', path: 'problems/03_vector/d58_q1_erase_many/solution/main.cpp' },
    { name: 'student.h', path: 'problems/03_vector/d58_q1_erase_many/solution/student.h' },
  ]);
  assert.deepEqual(problems[1].solution, []);
  assert.deepEqual(problems[2].solution, [
    { name: 'solution.cpp', path: 'problems/17_ซ้อม Final/da66_f1_map_walk/solution.cpp' },
  ]);
});

test('schedule keeps only entries for the folder topic', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[1].schedule, [{ topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' }]);
  assert.deepEqual(problems[2].schedule, [{ topic: 'ซ้อม Final', date: '1 Dec', session: '' }]);
});

test('testcases pair inputs and outputs with sizes and truncation flags', async () => {
  const problems = await scanProblemLibrary(await fixture());
  assert.deepEqual(problems[0].testcases, [
    {
      id: '01',
      input: { path: 'problems/03_vector/d58_q1_erase_many/testcase/input/01.in', size: 1, truncated: false },
      output: { path: 'problems/03_vector/d58_q1_erase_many/testcase/output/01.out', size: 2, truncated: false },
    },
    {
      id: '02',
      input: { path: 'problems/03_vector/d58_q1_erase_many/testcase/input/02.in', size: 3, truncated: true },
      output: { path: 'problems/03_vector/d58_q1_erase_many/testcase/output/02.out', size: 4, truncated: false },
    },
  ]);
});

test('Other problems get the Other topic, no statement, and no testcases', async () => {
  const problems = await scanProblemLibrary(await fixture());
  const other = problems[3];
  assert.equal(other.topic, 'Other');
  assert.equal(other.topicOrder, 99);
  assert.equal(other.statement, null);
  assert.deepEqual(other.testcases, []);
  assert.deepEqual(other.schedule, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/manifest.test.mjs`
Expected: FAIL with `Cannot find module '…/scripts/lib/manifest.mjs'`.

- [ ] **Step 3: Write the implementation**

`scripts/lib/manifest.mjs`:

```js
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.cpp', '.h', '.hpp']);
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true });

async function exists(target) {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}

async function directories(folder) {
  return (await readdir(folder, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byName);
}

export function topicFromDir(dir) {
  const match = dir.match(/^(\d+)_(.+)$/);
  if (!match) return { order: 999, name: dir };
  const order = Number(match[1]);
  return { order, name: order === 99 ? 'Other' : match[2] };
}

async function listSourceFiles(folder, relative = '') {
  const files = [];
  const entries = (await readdir(folder, { withFileTypes: true })).sort((a, b) => byName(a.name, b.name));
  for (const entry of entries) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listSourceFiles(path.join(folder, entry.name), name));
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(name);
  }
  return files;
}

async function scanSolution(problemPath, prefix) {
  const folder = path.join(problemPath, 'solution');
  if ((await exists(folder))?.isDirectory()) {
    return (await listSourceFiles(folder)).map((name) => ({ name, path: `${prefix}/solution/${name}` }));
  }
  const single = path.join(problemPath, 'solution.cpp');
  if ((await exists(single))?.isFile() && (await readFile(single, 'utf8')).trim()) {
    return [{ name: 'solution.cpp', path: `${prefix}/solution.cpp` }];
  }
  return [];
}

async function scanTestcases(problemPath, prefix, truncatedList) {
  const truncated = new Set(truncatedList);
  const sides = {};
  for (const [side, extension] of [['input', '.in'], ['output', '.out']]) {
    sides[side] = new Map();
    const folder = path.join(problemPath, 'testcase', side);
    if (!(await exists(folder))) continue;
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
      sides[side].set(entry.name.slice(0, -extension.length), {
        path: `${prefix}/testcase/${side}/${entry.name}`,
        size: (await stat(path.join(folder, entry.name))).size,
        truncated: truncated.has(`${side}/${entry.name}`),
      });
    }
  }
  const ids = new Set([...sides.input.keys(), ...sides.output.keys()]);
  return [...ids].sort(byName).map((id) => ({ id, input: sides.input.get(id) || null, output: sides.output.get(id) || null }));
}

export async function scanProblemLibrary(root) {
  const problems = [];
  for (const topicDir of await directories(root)) {
    const topic = topicFromDir(topicDir);
    for (const problemDir of await directories(path.join(root, topicDir))) {
      const problemPath = path.join(root, topicDir, problemDir);
      const configPath = path.join(problemPath, 'config.json');
      if (!(await exists(configPath))) continue;
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      const prefix = `problems/${topicDir}/${problemDir}`;
      problems.push({
        id: `${topicDir}/${problemDir}`,
        graderId: config.id ?? null,
        name: config.name || problemDir,
        title: config.title || config.name || problemDir,
        tags: config.tags || [],
        topic: topic.name,
        topicDir,
        topicOrder: topic.order,
        schedule: (config.schedule || []).filter((entry) => entry.topic === topic.name),
        statement: (await exists(path.join(problemPath, 'statement.pdf'))) ? `${prefix}/statement.pdf` : null,
        solution: await scanSolution(problemPath, prefix),
        testcases: await scanTestcases(problemPath, prefix, config.testcase_truncated || []),
      });
    }
  }
  return problems;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/manifest.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/manifest.mjs test/manifest.test.mjs
git commit -m "feat: scan problem folders into a manifest"
```

---

### Task 4: Index, lint, build, and serve scripts

**Files:**
- Create: `scripts/generate-manifest.mjs`, `scripts/check-project.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `data/problems.json` (generated)

- [ ] **Step 1: Write `scripts/generate-manifest.mjs`**

```js
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProblemLibrary } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = await scanProblemLibrary(path.join(root, 'problems'));
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data', 'problems.json'), `${JSON.stringify(problems, null, 2)}\n`);
console.log(`Indexed ${problems.length} problem folders across ${new Set(problems.map((problem) => problem.topicDir)).size} topics.`);
```

- [ ] **Step 2: Write `scripts/check-project.mjs`**

```js
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProblemLibrary } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = JSON.parse(await readFile(path.join(root, 'data', 'problems.json'), 'utf8'));
const errors = [];
const ids = new Set();

async function isFile(relative) {
  try {
    return (await stat(path.join(root, relative))).isFile();
  } catch {
    return false;
  }
}

for (const problem of problems) {
  if (ids.has(problem.id)) errors.push(`Duplicate id: ${problem.id}`);
  ids.add(problem.id);
  if (!Number.isInteger(problem.graderId)) errors.push(`Missing grader id: ${problem.id}`);
  if (!problem.name || !problem.title) errors.push(`Incomplete config: ${problem.id}`);
  if (!problem.statement) errors.push(`Missing statement.pdf: ${problem.id}`);
  const files = [
    problem.statement,
    ...problem.solution.map((file) => file.path),
    ...problem.testcases.flatMap((pair) => [pair.input?.path, pair.output?.path]),
  ].filter(Boolean);
  for (const file of files) if (!(await isFile(file))) errors.push(`Missing file: ${file}`);
}

const fresh = await scanProblemLibrary(path.join(root, 'problems'));
if (JSON.stringify(fresh) !== JSON.stringify(problems)) errors.push('data/problems.json is stale. Run npm run index.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const withSolution = problems.filter((problem) => problem.solution.length).length;
  const withTests = problems.filter((problem) => problem.testcases.length).length;
  console.log(`Validated ${problems.length} problem folders: ${withSolution} with solutions, ${withTests} with testcases.`);
}
```

- [ ] **Step 3: Write `scripts/build.mjs`**

```js
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProblemLibrary } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const problems = await scanProblemLibrary(path.join(root, 'problems'));
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data', 'problems.json'), `${JSON.stringify(problems, null, 2)}\n`);
for (const entry of ['index.html', 'src', 'data', 'problems']) await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built dist/ with ${problems.length} indexed problem folders.`);
```

- [ ] **Step 4: Write `scripts/serve.mjs`**

```js
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const text = 'text/plain; charset=utf-8';
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.cpp': text, '.h': text, '.hpp': text, '.in': text, '.out': text,
};

createServer(async (request, response) => {
  const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) && target !== root) { response.writeHead(403).end('Forbidden'); return; }
  try {
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': text }).end('Not found');
  }
}).listen(port, () => console.log(`Data Algo Atlas: http://localhost:${port}`));
```

- [ ] **Step 5: Generate and lint**

Run: `npm run index && npm run lint`
Expected:
```
Indexed 129 problem folders across 18 topics.
Validated 129 problem folders: <N> with solutions, 97 with testcases.
```
`<N>` is 50 plus any `solution.cpp` you have already filled in. If lint prints `Missing file:` lines, fix the folder named in the message and rerun.

- [ ] **Step 6: Commit**

`npm run build` needs `index.html`, which Task 7 creates, so the build is checked in Task 8.

```bash
git add scripts/generate-manifest.mjs scripts/check-project.mjs scripts/build.mjs scripts/serve.mjs data/problems.json
git commit -m "feat: add index, lint, build, and dev server scripts"
```

---

### Task 5: Schedule helpers

**Files:**
- Create: `src/lib/schedule.js`
- Test: `test/schedule.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/schedule.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCourseDate, sessionKind, SESSION_LABEL, thisWeek } from '../src/lib/schedule.js';

const problem = (name, date, session = 'บ่าย') => ({ id: `t/${name}`, name, schedule: [{ topic: 't', date, session }] });

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

test('thisWeek picks problems dated Monday to Sunday of the current week', () => {
  const problems = [problem('a', '2 Nov'), problem('b', '4 Nov', 'การบ้าน'), problem('c', '9 Nov')];
  const week = thisWeek(problems, new Date(2026, 10, 8));
  assert.equal(week.label, 'This week');
  assert.deepEqual(week.items.map((item) => [item.problem.name, item.session]), [['a', 'afternoon'], ['b', 'homework']]);
  assert.deepEqual(week.items[0].date, new Date(2026, 10, 2));
});

test('thisWeek falls back to the next upcoming date', () => {
  const problems = [problem('a', '2 Nov'), problem('b', '24 Nov'), problem('c', '23 Nov'), problem('d', '23 Nov')];
  const week = thisWeek(problems, new Date(2026, 10, 18));
  assert.equal(week.label, 'Next up');
  assert.deepEqual(week.items.map((item) => item.problem.name), ['c', 'd']);
});

test('thisWeek falls back to the latest date after the course ends', () => {
  const problems = [problem('a', '2 Nov'), problem('b', '1 Dec')];
  const week = thisWeek(problems, new Date(2026, 11, 20));
  assert.equal(week.label, 'Latest');
  assert.deepEqual(week.items.map((item) => item.problem.name), ['b']);
});

test('thisWeek returns no items when nothing is dated', () => {
  assert.deepEqual(thisWeek([{ id: 'x', name: 'x', schedule: [] }], new Date(2026, 10, 8)), { label: 'This week', items: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/schedule.test.mjs`
Expected: FAIL with `Cannot find module '…/src/lib/schedule.js'`.

- [ ] **Step 3: Write the implementation**

`src/lib/schedule.js`:

```js
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export const SESSION_LABEL = { afternoon: 'บ่าย', homework: 'การบ้าน' };

export function parseCourseDate(text, year) {
  const match = String(text || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!match || !(match[2] in MONTHS)) return null;
  return new Date(year, MONTHS[match[2]], Number(match[1]));
}

export function sessionKind(session) {
  return /^การบ้/.test(String(session || '').trim()) ? 'homework' : 'afternoon';
}

function startOfWeek(day) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function thisWeek(problems, today = new Date()) {
  const dated = problems
    .flatMap((problem) => problem.schedule.map((entry) => ({
      problem,
      date: parseCourseDate(entry.date, today.getFullYear()),
      session: sessionKind(entry.session),
    })))
    .filter((item) => item.date);
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  let label = 'This week';
  let picked = dated.filter((item) => item.date >= start && item.date < end);
  if (!picked.length && dated.length) {
    const upcoming = dated.filter((item) => item.date >= start).sort((a, b) => a.date - b.date);
    const target = (upcoming[0] || [...dated].sort((a, b) => b.date - a.date)[0]).date.getTime();
    label = upcoming.length ? 'Next up' : 'Latest';
    picked = dated.filter((item) => item.date.getTime() === target);
  }

  const seen = new Set();
  const items = picked
    .sort((a, b) => a.date - b.date || a.problem.name.localeCompare(b.problem.name))
    .filter((item) => (seen.has(item.problem.id) ? false : seen.add(item.problem.id)));
  return { label, items };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/schedule.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schedule.js test/schedule.test.mjs
git commit -m "feat: add course schedule helpers for the This week page"
```

---

### Task 6: Content helpers

**Files:**
- Create: `src/lib/content.js`
- Test: `test/content.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/content.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjacentProblems, buildTopicTree, categoryIsOpen, filterProblems, orderedProblems,
  pageRoute, preserveScrollPosition, summarizeProblems, truncationLabel,
} from '../src/lib/content.js';

const make = (topicDir, name, extra = {}) => {
  const [order, topic] = topicDir.split(/_(.+)/);
  return {
    id: `${topicDir}/${name}`, graderId: 1, name, title: `${name} title`, tags: [],
    topic: order === '99' ? 'Other' : topic, topicDir, topicOrder: Number(order),
    schedule: [], statement: `problems/${topicDir}/${name}/statement.pdf`, solution: [], testcases: [],
    ...extra,
  };
};

const library = [
  make('03_vector', 'v2', { schedule: [{ topic: 'vector', date: '3 Nov', session: 'การบ้าน' }], solution: [{ name: 'main.cpp', path: 'x' }] }),
  make('03_vector', 'v1', { schedule: [{ topic: 'vector', date: '3 Nov', session: 'บ่าย' }], tags: ['stl'] }),
  make('01_STL Usage', 's1', { schedule: [{ topic: 'STL Usage', date: '2 Nov', session: 'บ่าย' }], testcases: [{ id: '01' }] }),
  make('99_Other', 'o1'),
  make('09_Brute Force', 'map_walk', { schedule: [{ topic: 'Brute Force', date: '16 Nov', session: 'การบ้าน' }] }),
  make('17_ซ้อม Final', 'map_walk', { schedule: [{ topic: 'ซ้อม Final', date: '1 Dec', session: '' }], statement: null }),
];

test('pageRoute parses problem, week, learn, and overview hashes', () => {
  const base = { page: 'overview', problemId: null, side: null, module: null };
  assert.deepEqual(pageRoute(''), base);
  assert.deepEqual(pageRoute('#/'), base);
  assert.deepEqual(pageRoute(`#/p/${encodeURIComponent('03_vector/v1')}`), { ...base, page: 'problem', problemId: '03_vector/v1' });
  assert.deepEqual(pageRoute('#/week'), { ...base, page: 'week' });
  assert.deepEqual(pageRoute('#/learn'), { ...base, page: 'learn' });
  assert.deepEqual(pageRoute('#/learn/data'), { ...base, page: 'learn', side: 'data' });
  assert.deepEqual(pageRoute('#/learn/algo/insertion-sort'), { ...base, page: 'learn', side: 'algo', module: 'insertion-sort' });
  assert.deepEqual(pageRoute('#/learn/other'), base);
  assert.deepEqual(pageRoute('#/p/%E0%A4%A'), base);
});

test('filterProblems matches name, title, topic, and tags case-insensitively', () => {
  assert.equal(filterProblems(library, '').length, library.length);
  assert.deepEqual(filterProblems(library, 'V1').map((p) => p.name), ['v1']);
  assert.deepEqual(filterProblems(library, 'stl').map((p) => p.name), ['v1', 's1']);
  assert.deepEqual(filterProblems(library, 'brute').map((p) => p.id), ['09_Brute Force/map_walk']);
});

test('summarizeProblems counts unique problem names', () => {
  assert.deepEqual(summarizeProblems(library), { problems: 5, topics: 5, statements: 5, solutions: 1, testcaseSets: 1 });
});

test('buildTopicTree orders topics and splits sessions into afternoon then homework', () => {
  const tree = buildTopicTree(library);
  assert.deepEqual(tree.map((t) => [t.id, t.code, t.name]), [
    ['t:01_STL Usage', '01', 'STL Usage'],
    ['t:03_vector', '03', 'vector'],
    ['t:09_Brute Force', '09', 'Brute Force'],
    ['t:17_ซ้อม Final', '17', 'ซ้อม Final'],
    ['t:99_Other', 'OTH', 'Other'],
  ]);
  assert.deepEqual(tree[1].children.map((c) => [c.id, c.code, c.name, c.problems.map((p) => p.name)]), [
    ['t:03_vector:afternoon', 'PM', 'บ่าย', ['v1']],
    ['t:03_vector:homework', 'HW', 'การบ้าน', ['v2']],
  ]);
  assert.deepEqual(tree[4].children.map((c) => [c.id, c.name]), [['t:99_Other:all', 'All']]);
});

test('orderedProblems flattens the tree and adjacentProblems finds neighbours', () => {
  const ordered = orderedProblems(library);
  assert.deepEqual(ordered.map((p) => p.id), [
    '01_STL Usage/s1', '03_vector/v1', '03_vector/v2', '09_Brute Force/map_walk', '17_ซ้อม Final/map_walk', '99_Other/o1',
  ]);
  const { previous, next } = adjacentProblems(ordered, '03_vector/v1');
  assert.equal(previous.id, '01_STL Usage/s1');
  assert.equal(next.id, '03_vector/v2');
  assert.deepEqual(adjacentProblems(ordered, 'missing'), { previous: null, next: null });
});

test('categoryIsOpen respects query, closed, open, and active nodes', () => {
  const open = new Set(['a']);
  const closed = new Set(['b']);
  assert.equal(categoryIsOpen({ category: 'b', activeCategory: null, query: 'x', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'b', activeCategory: 'b', query: '', openCategories: open, closedCategories: closed }), false);
  assert.equal(categoryIsOpen({ category: 'a', activeCategory: null, query: '', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'c', activeCategory: 'c', query: '', openCategories: open, closedCategories: closed }), true);
  assert.equal(categoryIsOpen({ category: 'c', activeCategory: null, query: '', openCategories: open, closedCategories: closed }), false);
});

test('preserveScrollPosition restores scrollTop on the new scroller', () => {
  let scroller = { scrollTop: 120 };
  preserveScrollPosition(() => scroller, () => { scroller = { scrollTop: 0 }; });
  assert.equal(scroller.scrollTop, 120);
});

test('truncationLabel marks grader previews only', () => {
  assert.equal(truncationLabel({ truncated: true }), 'PREVIEW · FIRST 2 KB');
  assert.equal(truncationLabel({ truncated: false }), '');
  assert.equal(truncationLabel(null), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/content.test.mjs`
Expected: FAIL with `Cannot find module '…/src/lib/content.js'`.

- [ ] **Step 3: Write the implementation**

`src/lib/content.js`:

```js
import { SESSION_LABEL, sessionKind } from './schedule.js';

const SESSION_ORDER = ['afternoon', 'homework'];
const SESSION_CODE = { afternoon: 'PM', homework: 'HW', all: '*' };

export function pageRoute(hash = '') {
  const base = { page: 'overview', problemId: null, side: null, module: null };
  try {
    if (hash.startsWith('#/p/')) return { ...base, page: 'problem', problemId: decodeURIComponent(hash.slice(4)) };
  } catch {
    return base;
  }
  if (hash === '#/week') return { ...base, page: 'week' };
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

export function buildTopicTree(problems) {
  const topics = new Map();
  for (const problem of problems) {
    if (!topics.has(problem.topicDir)) {
      topics.set(problem.topicDir, {
        id: `t:${problem.topicDir}`,
        name: problem.topic,
        code: problem.topicOrder === 99 ? 'OTH' : String(problem.topicOrder).padStart(2, '0'),
        order: problem.topicOrder,
        children: new Map(),
      });
    }
    const topic = topics.get(problem.topicDir);
    const kind = problem.topicOrder === 99 ? 'all' : sessionKind(problem.schedule[0]?.session);
    if (!topic.children.has(kind)) {
      topic.children.set(kind, { id: `${topic.id}:${kind}`, kind, code: SESSION_CODE[kind], name: kind === 'all' ? 'All' : SESSION_LABEL[kind], problems: [] });
    }
    topic.children.get(kind).problems.push(problem);
  }
  return [...topics.values()]
    .sort((a, b) => a.order - b.order)
    .map((topic) => ({
      ...topic,
      children: [...topic.children.values()]
        .sort((a, b) => SESSION_ORDER.indexOf(a.kind) - SESSION_ORDER.indexOf(b.kind))
        .map((child) => ({ ...child, problems: [...child.problems].sort((a, b) => a.name.localeCompare(b.name)) })),
    }));
}

export function orderedProblems(problems) {
  return buildTopicTree(problems).flatMap((topic) => topic.children.flatMap((child) => child.problems));
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/content.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: every test passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content.js test/content.test.mjs
git commit -m "feat: add routing, search, topic tree, and summary helpers"
```

---

### Task 7: Entry page, styles, and browser app

**Files:**
- Create: `index.html`, `src/atlas.css`, `src/app.js`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Browse CEDT Data Structures and Algorithms problems, statements, testcases, and interactive visualizers." />
    <meta name="theme-color" content="#102a43" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2216%22 fill=%22%23102a43%22/><path d=%22M24 20 12 32l12 12M40 20l12 12-12 12%22 fill=%22none%22 stroke=%22%23f5f2eb%22 stroke-width=%226%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>" />
    <title>Data Algo Atlas</title>
    <link rel="stylesheet" href="./src/styles.css" />
    <link rel="stylesheet" href="./src/atlas.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div id="app" class="app-loading" role="status">
      <span class="boot-cursor" aria-hidden="true"></span>
      <p>BOOTING DATA ALGO ATLAS...</p>
    </div>
    <script type="module" src="./src/app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `src/atlas.css`**

```css
.topbar{grid-template-columns:var(--sidebar) auto minmax(260px,560px) 1fr auto}
.mode-switch{display:flex;gap:4px;padding:0 0 0 18px}
.mode-switch a{font:600 11px/1 var(--mono);letter-spacing:.12em;color:var(--muted);padding:10px 12px;border:1px solid var(--line);text-decoration:none}
.mode-switch a:hover,.mode-switch a.active{color:var(--cyan);border-color:var(--cyan);background:var(--cyan-soft)}
.tag-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.tag-list span{font:11px/1 var(--mono);color:var(--muted);border:1px solid var(--line);padding:4px 6px}
.file-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.file-tabs button{font:12px/1 var(--mono);color:var(--muted);background:var(--panel);border:1px solid var(--line);padding:8px 10px;cursor:pointer}
.file-tabs button[aria-pressed=true],.file-tabs button:hover{color:var(--cyan);border-color:var(--cyan)}
.trunc-badge{font:600 10px/1 var(--mono);letter-spacing:.08em;color:var(--amber);border:1px solid currentColor;padding:4px 6px;white-space:nowrap}
.week-view,.learn-view{max-width:1180px;margin:0 auto;padding:34px clamp(28px,4vw,62px) 60px}
.week-title,.learn-title{font:700 clamp(40px,6vw,72px)/1 var(--sans);margin:24px 0 8px;color:var(--text)}
.week-day h2{font:600 12px/1 var(--mono);letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin:28px 0 12px}
.week-grid,.learn-sides{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.week-card,.learn-side{display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid var(--line);background:var(--panel);color:var(--text);text-decoration:none}
.week-card:hover,.learn-side:hover{border-color:var(--cyan)}
.week-card code{color:var(--cyan);font:12px/1.4 var(--mono)}
.week-card small,.learn-side p{color:var(--muted);margin:0}
.session-pill{align-self:flex-start;font:600 10px/1 var(--mono);padding:4px 6px;border:1px solid currentColor}
.session-pill.afternoon{color:var(--green)}
.session-pill.homework{color:var(--amber)}
.learn-side{min-height:180px}
.learn-side span{font:12px/1 var(--mono);color:var(--faint)}
.learn-side strong{font:700 40px/1 var(--sans)}
@media (max-width:760px){
  .topbar{grid-template-columns:54px 1fr auto 54px}
  .mode-switch{padding:0 6px 0 0}
  .mode-switch a{padding:8px 6px;font-size:10px}
  .week-view,.learn-view{padding:22px 16px 45px}
}
```

- [ ] **Step 3: Write `src/app.js`**

Every interpolated manifest value below goes through `escapeHtml()`; file contents go through `escapeHtml()` or `highlightCpp()`. Keep that rule for any change.

```js
import {
  adjacentProblems, buildTopicTree, categoryIsOpen, filterProblems, orderedProblems,
  pageRoute, preserveScrollPosition, summarizeProblems, truncationLabel,
} from './lib/content.js';
import { highlightCpp } from './lib/cpp-highlight.js';
import { SESSION_LABEL, thisWeek } from './lib/schedule.js';
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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

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
    <span class="mini-status ${problem.solution.length ? 'has-solution' : ''}" title="${problem.solution.length ? 'Solution available' : 'Solution pending'}"></span>
  </a>`;
}

function sidebarMarkup() {
  const route = pageRoute(location.hash);
  const activeId = route.page === 'problem' ? route.problemId : null;
  const visible = new Set(filterProblems(state.problems, state.query).map((problem) => problem.id));
  const week = thisWeek(state.problems);
  const isOpen = (id, containsActive) => categoryIsOpen({
    category: id, activeCategory: containsActive ? id : null, query: state.query,
    openCategories: state.openNodes, closedCategories: state.closedNodes,
  });
  return `<aside class="sidebar ${state.sidebarOpen ? 'is-open' : ''}" aria-label="Problem navigation">
    <div class="sidebar-head"><span>COURSE_INDEX</span><button class="sidebar-close" type="button" aria-label="Close problem navigation">×</button></div>
    <nav class="course-tree" id="course-tree">
      <a class="featured-nav ${route.page === 'week' ? 'active' : ''}" href="#/week"><span>★</span><strong>${escapeHtml(week.label)}</strong><small>${week.items.length}</small></a>
      ${buildTopicTree(state.problems).map((topic) => {
        const children = topic.children
          .map((child) => ({ ...child, shown: child.problems.filter((problem) => visible.has(problem.id)) }))
          .filter((child) => !state.query || child.shown.length);
        if (!children.length) return '';
        const topicOpen = isOpen(topic.id, topic.children.some((child) => child.problems.some((problem) => problem.id === activeId)));
        const count = children.reduce((total, child) => total + (state.query ? child.shown.length : child.problems.length), 0);
        return `<section class="tree-group tree-parent ${topicOpen ? 'open' : ''}">
          <button class="tree-heading tree-parent-heading" type="button" data-node="${escapeHtml(topic.id)}" aria-expanded="${topicOpen}">
            ${icon('chevron')}<span class="tree-code">${escapeHtml(topic.code)}</span><strong>${escapeHtml(topic.name)}</strong><span class="tree-count">${count}</span>
          </button>
          <div class="tree-children" ${topicOpen ? '' : 'hidden'}>
            ${children.map((child) => {
              const childOpen = isOpen(child.id, child.problems.some((problem) => problem.id === activeId));
              const list = state.query ? child.shown : child.problems;
              return `<section class="tree-child ${childOpen ? 'open' : ''}">
                <button class="tree-heading tree-child-heading" type="button" data-node="${escapeHtml(child.id)}" aria-expanded="${childOpen}">
                  ${icon('chevron')}<span class="tree-code">${escapeHtml(child.code)}</span><strong>${escapeHtml(child.name)}</strong><span class="tree-count">${list.length}</span>
                </button>
                <div class="tree-problems" ${childOpen ? '' : 'hidden'}>${list.map((problem) => treeProblemMarkup(problem, activeId)).join('')}</div>
              </section>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}
    </nav>
    <div class="sidebar-foot"><span><i class="status-led"></i>SYSTEM ONLINE</span><span>v1.0.0</span></div>
  </aside>`;
}

function shellMarkup() {
  const summary = summarizeProblems(state.problems);
  return `<header class="topbar">
    <button class="menu-button" type="button" aria-label="Open problem navigation">${icon('menu')}</button>
    <a class="wordmark" href="#/"><span class="prompt-mark">&gt;_</span><span><strong>DATA_ALGO</strong><small>DATA STRUCTURES &amp; ALGORITHMS</small></span></a>
    <nav class="mode-switch" aria-label="Section"><a href="#/" data-mode="problems">PROBLEMS</a><a href="#/learn" data-mode="learn">LEARNING</a></nav>
    <label class="global-search">${icon('search')}<span class="sr-only">Search problems</span><input type="search" id="global-search" placeholder="Search problems..." autocomplete="off" value="${escapeHtml(state.query)}"><kbd>/</kbd></label>
    <div class="system-summary"><span>${summary.problems}<small>PROBLEMS</small></span><span>${summary.statements}<small>PDF</small></span><span>${summary.solutions}<small>SOLUTIONS</small></span></div>
    <button class="theme-button" type="button" aria-label="Toggle color theme">${document.documentElement.dataset.theme === 'dark' ? icon('sun') : icon('moon')}</button>
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
      <p class="overview-copy">Browse grader problems, statements, testcases, and provided headers by course topic, then learn the structures behind them in the Learning tab.</p>
    </section>
    <section class="metric-grid" aria-label="Library summary">
      <article><span>01</span><strong>${summary.problems}</strong><small>PROBLEMS INDEXED</small></article>
      <article><span>02</span><strong>${summary.topics}</strong><small>TOPICS</small></article>
      <article><span>03</span><strong>${summary.statements}</strong><small>PDF STATEMENTS</small></article>
      <article><span>04</span><strong>${summary.testcaseSets}</strong><small>TESTCASE SETS</small></article>
    </section>
    <section class="overview-grid">
      <div class="quick-start"><div class="panel-title"><span>QUICK_START.md</span><i></i></div><ol>
        <li><span>01</span><div><strong>Check this week</strong><p>Open ★ in the sidebar for the problems scheduled now.</p></div></li>
        <li><span>02</span><div><strong>Open a problem</strong><p>Read the statement, the provided files, and the testcases.</p></div></li>
        <li><span>03</span><div><strong>Learn the structure</strong><p>Switch to Learning to watch data structures and algorithms run.</p></div></li>
      </ol></div>
      <div class="topic-terminal"><div class="panel-title"><span>topics.list</span><i></i></div><div class="terminal-body">${tree.map((topic) => `<button type="button" data-jump="${escapeHtml(topic.id)}"><span>${escapeHtml(topic.code)}</span><strong>${escapeHtml(topic.name)}</strong><small>${topic.children.reduce((total, child) => total + child.problems.length, 0)}</small></button>`).join('')}<p><span>$</span> select a topic to continue<span class="cursor">█</span></p></div></div>
    </section>
  </div>`;
}

function weekMarkup() {
  const week = thisWeek(state.problems);
  const days = new Map();
  for (const item of week.items) {
    const key = item.date.toDateString();
    if (!days.has(key)) days.set(key, { date: item.date, items: [] });
    days.get(key).items.push(item);
  }
  const body = week.items.length
    ? [...days.values()].map((day) => `<section class="week-day">
        <h2>${escapeHtml(day.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</h2>
        <div class="week-grid">${day.items.map((item) => `<a class="week-card" href="${problemHref(item.problem)}">
          <span class="session-pill ${item.session}">${SESSION_LABEL[item.session]}</span>
          <code>${escapeHtml(item.problem.name)}</code><strong>${escapeHtml(item.problem.title)}</strong><small>${escapeHtml(item.problem.topic)}</small>
        </a>`).join('')}</div>
      </section>`).join('')
    : emptyResource('file', 'No scheduled problems', 'The course CSV has no dates to show.');
  return `<div class="week-view view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo/week</span><span>schedule.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">ROOT</a><span>/</span><strong>${escapeHtml(week.label.toUpperCase())}</strong></nav>
    <h1 class="week-title">${escapeHtml(week.label)}</h1>
    ${body}
  </div>`;
}

function learnMarkup(route) {
  const sides = [
    { id: 'data', index: '01', title: 'Data', copy: 'Run STL operations and watch the real structure change.' },
    { id: 'algo', index: '02', title: 'Algo', copy: 'Step through C++ line by line with live variables.' },
  ];
  const head = `<div class="terminal-label"><span>~/cedt/data_algo/learn${route.side ? `/${route.side}` : ''}</span><span>learn.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/learn">LEARN</a>${route.side ? `<span>/</span><strong>${route.side.toUpperCase()}</strong>` : ''}</nav>`;
  if (!route.side) {
    return `<div class="learn-view view-enter">${head}<h1 class="learn-title">Learning</h1>
      <div class="learn-sides">${sides.map((side) => `<a class="learn-side" href="#/learn/${side.id}"><span>${side.index}</span><strong>${side.title}</strong><p>${side.copy}</p></a>`).join('')}</div>
    </div>`;
  }
  return `<div class="learn-view view-enter">${head}${emptyResource('code', 'Modules coming next', 'Visualizer modules for this side are added in the next build phase.')}</div>`;
}

function problemMarkup(problem) {
  const adjacent = adjacentProblems(orderedProblems(state.problems), problem.id);
  const hasSolution = problem.solution.length > 0;
  const hasTests = problem.testcases.length > 0;
  const fileCount = `${problem.solution.length} FILE${problem.solution.length > 1 ? 'S' : ''}`;
  return `<div class="problem-view view-enter">
    <div class="terminal-label"><span>~/problems/${escapeHtml(problem.topicDir)}</span><span>#${escapeHtml(problem.graderId ?? '—')}</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">ROOT</a><span>/</span><button type="button" data-jump="t:${escapeHtml(problem.topicDir)}">${escapeHtml(problem.topic)}</button><span>/</span><strong>${escapeHtml(problem.name)}</strong></nav>
    <header class="problem-head">
      <div><code>${escapeHtml(problem.name)}</code><h1>${escapeHtml(problem.title)}</h1>${problem.tags.length ? `<div class="tag-list">${problem.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}</div>
      <div class="artifact-status">${resourceDot(problem.statement, 'PDF')}${resourceDot(hasSolution, 'SOLUTION')}${resourceDot(hasTests, 'TESTCASE')}</div>
    </header>
    <div class="tab-bar" role="tablist" aria-label="Problem resources">
      <button role="tab" aria-selected="true" data-tab="statement">${icon('file')}<span>STATEMENT</span><small>${problem.statement ? 'READY' : 'MISSING'}</small></button>
      <button role="tab" aria-selected="false" data-tab="solution">${icon('code')}<span>SOLUTION</span><small>${hasSolution ? fileCount : 'NONE'}</small></button>
      <button role="tab" aria-selected="false" data-tab="testcases">${icon('flask')}<span>TESTCASES</span><small>${hasTests ? problem.testcases.length : 'NONE'}</small></button>
    </div>
    <section class="tab-panel" id="panel-statement" role="tabpanel">
      ${problem.statement ? `<div class="resource-toolbar"><span>${icon('file')}<code>statement.pdf</code></span><div><a href="${asset(problem.statement)}" target="_blank" rel="noopener">OPEN ${icon('external')}</a><a href="${asset(problem.statement)}" download>DOWNLOAD</a></div></div><object class="pdf-viewer" data="${asset(problem.statement)}" type="application/pdf">${emptyResource('file', 'PDF preview unavailable', 'Open the statement in a new browser tab.')}</object>` : emptyResource('file', 'Statement unavailable', 'No PDF is associated with this problem.')}
    </section>
    <section class="tab-panel" id="panel-solution" role="tabpanel" hidden><div id="solution-content">${hasSolution ? '<div class="inline-loader"><span></span>READING SOLUTION...</div>' : emptyResource('code', 'No solution yet', 'Write solution.cpp in this problem folder, then run npm run index.')}</div></section>
    <section class="tab-panel" id="panel-testcases" role="tabpanel" hidden>${hasTests ? `<div class="testcase-browser"><header><span>TEST SET</span><strong>${problem.testcases.length}</strong><small>INPUT / EXPECTED OUTPUT</small></header><div id="testcase-list"><div class="inline-loader"><span></span>LOADING TESTCASES...</div></div></div>` : emptyResource('flask', 'No testcases', 'The grader did not expose testcases for this problem.')}</section>
    <nav class="problem-pagination" aria-label="Adjacent problems">
      ${adjacent.previous ? `<a href="${problemHref(adjacent.previous)}"><small>← PREVIOUS</small><strong>${escapeHtml(adjacent.previous.name)}</strong><span>${escapeHtml(adjacent.previous.title)}</span></a>` : '<span></span>'}
      ${adjacent.next ? `<a class="next" href="${problemHref(adjacent.next)}"><small>NEXT →</small><strong>${escapeHtml(adjacent.next.name)}</strong><span>${escapeHtml(adjacent.next.title)}</span></a>` : '<span></span>'}
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
      container.querySelector('.solution-file').innerHTML = `<div class="code-head"><span><i></i><i></i><i></i><code>${escapeHtml(file.name)}</code></span><button type="button" class="copy-code">COPY</button></div><pre tabindex="0" aria-label="${escapeHtml(file.name)} source"><code class="language-cpp">${highlightCpp(file.source)}</code></pre>`;
      container.querySelectorAll('.file-tabs button').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.file) === index)));
      container.querySelector('.copy-code').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(file.source);
          showTemporaryButtonStatus(button, 'COPIED', 'COPY');
        } catch {
          showTemporaryButtonStatus(button, 'FAILED', 'COPY');
        }
      });
    };
    container.querySelectorAll('.file-tabs button').forEach((button) => button.addEventListener('click', () => show(Number(button.dataset.file))));
    show(0);
  } catch {
    container.innerHTML = emptyResource('code', 'Solution could not be loaded', 'Open the source file directly from its problem folder.');
  }
}

function testcaseSideMarkup(side, label, index) {
  const rawLink = side.file ? `<a href="${asset(side.file.path)}" target="_blank" rel="noopener">RAW ${label}</a>` : '';
  const badge = truncationLabel(side.file);
  const body = side.error
    ? `<div class="testcase-error"><code>${escapeHtml(side.error)}</code><span>${label} could not be loaded.</span></div>`
    : `<pre tabindex="0"><code>${escapeHtml(side.content)}</code></pre>`;
  return `<section class="testcase-side">
    <header><strong>${label === 'INPUT' ? 'INPUT' : 'EXPECTED OUTPUT'}</strong><span>${side.file ? formatBytes(side.file.size) : '—'}</span>${badge ? `<span class="trunc-badge" title="The grader only shows the first 2 KB of this file.">${badge}</span>` : ''}${rawLink}<button type="button" data-copy-case="${index}" data-copy-side="${label.toLowerCase()}" ${side.error ? 'disabled' : ''}>COPY</button></header>
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
      showTemporaryButtonStatus(target, 'COPIED', 'COPY');
    } catch {
      showTemporaryButtonStatus(target, 'FAILED', 'COPY');
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
  localStorage.setItem('data-algo-theme', theme);
  document.querySelector('.theme-button').innerHTML = theme === 'dark' ? icon('sun') : icon('moon');
}

function bindShell() {
  document.querySelector('#global-search').addEventListener('input', (event) => { state.query = event.target.value; updateSidebar(); });
  document.addEventListener('keydown', focusSearch);
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
  document.querySelectorAll('.featured-nav, .tree-problem').forEach((link) => link.addEventListener('click', () => { state.sidebarOpen = false; }));
}

function jumpToTopic(topicId) {
  const topic = buildTopicTree(state.problems).find((item) => item.id === topicId);
  if (!topic) return;
  for (const id of [topic.id, ...topic.children.map((child) => child.id)]) {
    state.closedNodes.delete(id);
    state.openNodes.add(id);
  }
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
  const route = pageRoute(location.hash);
  const problem = activeProblem();
  const main = document.querySelector('#main');
  if (problem) {
    document.title = `${problem.name} · Data Algo Atlas`;
    main.innerHTML = problemMarkup(problem);
  } else if (route.page === 'week') {
    document.title = 'This week · Data Algo Atlas';
    main.innerHTML = weekMarkup();
  } else if (route.page === 'learn') {
    document.title = 'Learning · Data Algo Atlas';
    main.innerHTML = learnMarkup(route);
  } else {
    document.title = 'Data Algo Atlas';
    main.innerHTML = overviewMarkup();
  }
  document.querySelectorAll('.mode-switch a').forEach((link) => link.classList.toggle('active', (link.dataset.mode === 'learn') === (route.page === 'learn')));
  bindView(problem);
  updateSidebar();
  main.scrollTo(0, 0);
}

async function boot() {
  document.documentElement.dataset.theme = localStorage.getItem('data-algo-theme') || 'dark';
  try {
    const response = await fetch(asset('data/problems.json'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.problems = await response.json();
    const first = buildTopicTree(state.problems)[0];
    if (first) {
      state.openNodes.add(first.id);
      if (first.children[0]) state.openNodes.add(first.children[0].id);
    }
    app.className = 'app-shell';
    app.removeAttribute('role');
    app.innerHTML = shellMarkup();
    bindShell();
    bindSidebar();
    renderRoute();
    window.addEventListener('hashchange', renderRoute);
  } catch (error) {
    app.innerHTML = `<div class="fatal-error"><code>BOOT_ERROR ${escapeHtml(error.message)}</code><h1>Problem index unavailable</h1><button type="button" onclick="location.reload()">RETRY</button></div>`;
  }
}

boot();
```

- [ ] **Step 4: Syntax check**

Run: `node --check src/app.js && npm test`
Expected: no output from `--check`, all tests pass.

- [ ] **Step 5: Manual check in the browser**

Run `npm run dev` (or start it through the app's preview with a `.claude/launch.json` entry `{ "name": "atlas", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 4173 }`) and open `http://localhost:4173`. Check each item:

1. The overview shows 128 problems, 18 topics, and the topics list. Clicking a topic opens it in the sidebar.
2. The sidebar starts with `★ This week`, and the count matches the CSV for the current week. Clicking it opens `#/week` with cards grouped by date and บ่าย / การบ้าน pills.
3. `01 STL Usage` expands into `PM บ่าย` and `HW การบ้าน`. `99 Other` shows `* All`.
4. Open `03_vector/d58_q1_erase_many`:
   - Statement shows the PDF.
   - Solution shows file tabs `main.cpp`, `student.h`, `vector.h` with highlighting.
   - Testcases show 10 cases, and truncated sides show the amber `PREVIEW · FIRST 2 KB` badge.
5. Open `09_Brute Force/a66_q1a_day_cover`. Solution says "No solution yet".
6. Search `heap` filters the tree. Pressing `/` focuses search.
7. `LEARNING` in the top bar opens `#/learn` with Data and Algo cards and highlights LEARNING. Clicking Data shows "Modules coming next".
8. Toggle the theme, then resize to 375 px wide: the menu button opens the sidebar and the mode switch still fits.

Fix any layout issue in `src/atlas.css` only. Do not edit the copied `src/styles.css`.

- [ ] **Step 6: Commit**

```bash
git add index.html src/atlas.css src/app.js
git commit -m "feat: add problem browser app with week page and learning shell"
```

---

### Task 8: README and full verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Data Algo Atlas

Static site for the CEDT Data Structures & Algorithms course: every grader problem (statement, provided files, testcase previews) grouped by course topic, plus a Learning section with interactive visualizers.

## Folder structure

```text
problems/<NN_topic>/<code>/
  config.json      # id, name, title, tags, topic, schedule, testcase_truncated
  statement.pdf
  solution/        # files provided by the grader, or
  solution.cpp     # your solution (empty file = no solution yet)
  testcase/input/NN.in, testcase/output/NN.out
scripts/grader/    # console dump script + organizer for grader downloads
data/problems.json # generated manifest
src/               # browser app
```

## Commands

```bash
npm run index   # rebuild data/problems.json after adding or editing problems
npm run dev     # http://localhost:4173
npm run verify  # tests, lint, build into dist/
```

## Add or update a solution

Write `solution.cpp` (or files in `solution/`) inside the problem folder, then run `npm run index`.

## Re-download problems from the grader

1. Open the grader problem list, logged in, and paste `scripts/grader/grader_dump.js` into the browser console.
2. Run `python3 -I scripts/grader/organize.py ~/Downloads/dataalgo-dump-YYYY-MM-DD.zip scripts/grader/problems.csv problems`.
3. Run `npm run index`.

Testcases are previews: the grader only exposes the first 2 KB of each file to students. Truncated files are listed in each `config.json`.
````

- [ ] **Step 2: Run full verification**

Run: `npm run verify`
Expected: all tests pass, lint prints `Validated 129 problem folders: …`, build prints `Built dist/ with 129 indexed problem folders.`

- [ ] **Step 3: Preview the production build**

Run: `npm run dev -- --dist` and open `http://localhost:4173`. Repeat checks 1 and 4 from Task 7 Step 5 against `dist/`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README for Data Algo Atlas"
```

---

## Next plans

- `docs/superpowers/plans/…-phase2-engine.md`: recorder, player, the five renderers, plus `vector` and `insertion sort` as reference modules.
- Phase 3 (Data modules) and Phase 4 (Algo modules) each get their own plan written after Phase 2, so they use the engine API as built.
