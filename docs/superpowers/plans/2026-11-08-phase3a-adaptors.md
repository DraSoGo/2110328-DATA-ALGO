# Data Algo Atlas — Phase 3a (stack, queue, pair) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three Data modules to the Learning section: `stack` (course CP::stack, drawn as a vertical column), `queue` (course CP::queue circular buffer), and `pair` (lexicographic compare and sort).

**Architecture:** Same engine as Phase 2. One new renderer, `column` (bottom-up slots, used by stack). The `array` renderer gains a `cellWidth` option (pairs need wider cells) and reserves one pointer row per declared pointer name so the viewBox never changes during a run; insertion sort is updated to always declare `i` and `j`. Every new module plugs into `src/learn/modules.js`, and the existing contract tests in `test/learn-modules.test.mjs` check it automatically (valid defaults, frames on line 0, unique keys, Big O fields).

**Tech Stack:** Browser ES modules, SVG, Node 20+ `node:test`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md` Part 2, build phase 3 (first part). Phase 3b (list, `linked` renderer) and 3c (priority_queue, BST, set, map, `tree` renderer) get their own plans.

**How this plan was made:** every file below was written and run in a scratch clone first. The full suite passed with 85 tests.

**Repo root:** `/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Data_Algo`. Work on branch `phase3a-adaptors`.

---

### Task 1: Array renderer — cell width, exported highlight helper, stable pointer rows

**Files:**
- Replace: `src/learn/render/array.js`
- Modify: `src/learn/algo/insertion-sort.js` (pointer names always declared)
- Test: `test/learn-array-render.test.mjs` (two new tests)

- [ ] **Step 1: Add the failing tests** — append to `test/learn-array-render.test.mjs`:

```js
test('cellWidth widens slots and items', () => {
  const svg = renderArray({ cells: cells(1, 2), cellWidth: 84 });
  assert.equal(Number(groupFor(svg, 'k1')[2]), slotX(1, 84));
  assert.match(svg, /<rect width="84"/);
});

test('every declared pointer name reserves a row', () => {
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  assert.equal(box(renderArray({ cells: cells(1, 2), pointers: { i: null, j: null } })), box(renderArray({ cells: cells(1, 2), pointers: { i: 0, j: 0 } })));
});
```

Run: `node --test test/learn-array-render.test.mjs` — Expected: the two new tests FAIL.

- [ ] **Step 2: Replace the renderer** with:

`src/learn/render/array.js`:

```js
import { escapeHtml } from '../../lib/html.js';

export const CELL = 44;
export const GAP = 8;
export const PAD = 16;
export const GUTTER = 40;
const BAR_MAX = 120;
const BAR_MIN = 24;
const LABEL_SPACE = 22;
const POINTER_ROW = 16;
const HL_CLASSES = [['active', 'is-active'], ['compare', 'is-compare'], ['moved', 'is-moved'], ['done', 'is-done']];

export function slotX(index, width = CELL) {
  return GUTTER + index * (width + GAP);
}

export function classesFor(index, hl) {
  return HL_CLASSES.filter(([name]) => (hl[name] || []).includes(index)).map(([, className]) => className);
}

export function renderArray(state, hl = {}) {
  const cells = state.cells || [];
  const bars = state.mode === 'bars';
  const width = state.cellWidth || CELL;
  const x = (index) => slotX(index, width);
  const slots = Math.max(cells.length, state.capacity || 0, 1);
  const values = [...cells, state.lifted].filter(Boolean).map((cell) => Number(cell.value) || 0);
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const rowHeight = bars ? BAR_MAX : CELL;
  const itemHeight = (value) => (bars ? BAR_MIN + Math.round((((Number(value) || 0) - low) / (high - low)) * (BAR_MAX - BAR_MIN)) : CELL);
  const lane = 'lifted' in state ? rowHeight + PAD : 0;
  const rowTop = PAD + lane;
  const baseline = rowTop + rowHeight;

  const stack = new Map();
  const pointers = Object.entries(state.pointers || {})
    .filter(([, index]) => Number.isInteger(index))
    .map(([name, index]) => {
      const row = stack.get(index) || 0;
      stack.set(index, row + 1);
      return { name, index, row };
    });
  // Reserve one row per declared pointer name (even null ones) so the viewBox
  // stays fixed while pointers come and go or share an index.
  const pointerRows = 'pointers' in state ? Math.max(1, Object.keys(state.pointers).length) : 0;
  const svgWidth = x(slots) - GAP + PAD;
  const svgHeight = baseline + LABEL_SPACE + pointerRows * POINTER_ROW + PAD;

  const item = (cell, left, top, h, className) => `<g class="${className}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${left}px,${top}px)"><rect width="${width}" height="${h}" rx="6"/><text x="${width / 2}" y="${bars ? h - 8 : CELL / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`;

  const slotMarkup = Array.from({ length: slots }, (_, index) => `<rect class="slot${index >= cells.length ? ' spare' : ''}" x="${x(index)}" y="${rowTop}" width="${width}" height="${rowHeight}" rx="6"/>`).join('');
  const labelMarkup = Array.from({ length: slots }, (_, index) => `<text class="index" x="${x(index) + width / 2}" y="${baseline + 15}" text-anchor="middle">${index}</text>`).join('');
  const itemMarkup = cells.map((cell, index) => {
    if (!cell) return '';
    const h = itemHeight(cell.value);
    return item(cell, x(index), baseline - h, h, ['item', ...classesFor(index, hl)].join(' '));
  }).join('');
  const liftedMarkup = state.lifted
    ? item(state.lifted, x(state.lifted.at), PAD + rowHeight - itemHeight(state.lifted.value), itemHeight(state.lifted.value), 'item is-lifted')
    : '';
  const pointerMarkup = pointers.map(({ name, index, row }) => `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${index < 0 ? GUTTER / 2 : x(index) + width / 2}px,${baseline + LABEL_SPACE + row * POINTER_ROW}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`).join('');

  const label = `Array of ${cells.length}: ${cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`;
  return `<svg class="viz viz-array${bars ? ' is-bars' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup}${labelMarkup}</g><g class="layer-items">${itemMarkup}${liftedMarkup}${pointerMarkup}</g></svg>`;
}
```

- [ ] **Step 3: Keep insertion sort's pointer names fixed** so its viewBox stays constant under the new row rule:

```diff
diff --git a/src/learn/algo/insertion-sort.js b/src/learn/algo/insertion-sort.js
index 3ae9f17..2b334c4 100644
--- a/src/learn/algo/insertion-sort.js
+++ b/src/learn/algo/insertion-sort.js
@@ -32,10 +32,10 @@ export default {
   },
   *run({ a }) {
     const n = a.length;
-    const state = { mode: 'bars', cells: a.map((value, index) => ({ key: `a${index}`, value })), lifted: null, pointers: {} };
+    const state = { mode: 'bars', cells: a.map((value, index) => ({ key: `a${index}`, value })), lifted: null, pointers: { i: null, j: null } };
     yield { line: 0, msg: `Sort ${n} number${n === 1 ? '' : 's'}`, state, hl: {}, vars: { n } };
     for (let i = 1; i < n; i += 1) {
-      state.pointers = { i };
+      state.pointers = { i, j: null };
       yield { line: 1, msg: `i = ${i}: a[0..${i - 1}] is already sorted`, state, hl: { done: prefix(i) }, vars: { n, i } };
       const key = state.cells[i].value;
       state.lifted = { ...state.cells[i], at: i };
@@ -61,7 +61,7 @@ export default {
       state.lifted = null;
       yield { line: 8, msg: `a[${j + 1}] = key = ${key}`, state, hl: { active: [j + 1], done: prefix(i + 1) }, vars: { n, i, key, j } };
     }
-    state.pointers = {};
+    state.pointers = { i: null, j: null };
     yield { line: 1, msg: `i = ${Math.max(n, 1)} is not < ${n}: the loop ends`, state, hl: { done: prefix(n) }, vars: { n, i: Math.max(n, 1) } };
     yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: prefix(n) }, vars: { n } };
   },
```

- [ ] **Step 4: Verify** — Run: `npm test` — Expected: all pass (the module contract test checks insertion sort's fixed viewBox).

- [ ] **Step 5: Commit**

```bash
git add src/learn/render/array.js src/learn/algo/insertion-sort.js test/learn-array-render.test.mjs
git commit -m "feat: widen array cells on demand and reserve a row per pointer name"
```

---

### Task 2: Column renderer

**Files:**
- Create: `src/learn/render/column.js`, `test/learn-column-render.test.mjs`
- Modify: `src/learn/render/index.js`

- [ ] **Step 1: Write the failing test**

`test/learn-column-render.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { COL_H, renderColumn, slotY } from '../src/learn/render/column.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (...values) => values.map((value, i) => ({ key: `k${i}`, value }));
const place = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));

test('index 0 is the bottom slot and higher indexes sit above it', () => {
  const svg = renderColumn({ cells: cells(10, 20, 30), capacity: 4 });
  assert.equal(Number(place(svg, 'k0')[3]) > Number(place(svg, 'k1')[3]), true);
  assert.equal(Number(place(svg, 'k2')[3]), slotY(2, 4));
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 1);
  assert.match(svg, /class="viz viz-column"/);
});

test('pointers sit beside their slot, and index -1 uses the reserved row', () => {
  const full = renderColumn({ cells: cells(1, 2), pointers: { top: 1 } });
  const empty = renderColumn({ cells: [], capacity: 2, pointers: { top: -1 } });
  const y = (svg) => Number(svg.match(/data-key="ptr-top" style="transform:translate\(([-\d.]+)px,([-\d.]+)px\)/)[2]);
  assert.equal(y(full), slotY(1, 2) + COL_H / 2 + 4);
  assert.equal(y(empty), slotY(-1, 2) + COL_H / 2 + 4);
  const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
  assert.equal(box(full), box(empty));
});

test('highlights become classes and the registry exposes the renderer', () => {
  const svg = renderColumn({ cells: cells(1, 2) }, { active: [1] });
  assert.equal(place(svg, 'k1')[1], 'item is-active');
  assert.equal(RENDERERS.column, renderColumn);
});
```

Run: `node --test test/learn-column-render.test.mjs` — Expected: FAIL, module not found.

- [ ] **Step 2: Implement**

`src/learn/render/column.js`:

```js
import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const COL_W = 72;
export const COL_H = 36;
const GAP = 6;
const PAD = 16;
const LABEL_W = 34;
const POINTER_W = 80;
const LEFT = PAD + LABEL_W;

// Index 0 is the bottom slot. Index -1 is the reserved row under it, used by
// pointers such as top when the stack is empty.
export function slotY(index, slots) {
  return PAD + (slots - 1 - index) * (COL_H + GAP);
}

export function renderColumn(state, hl = {}) {
  const cells = state.cells || [];
  const slots = Math.max(cells.length, state.capacity || 0, 1);
  const reserve = 'pointers' in state ? GAP + COL_H : 0;
  const width = LEFT + COL_W + POINTER_W + PAD;
  const height = PAD + slots * (COL_H + GAP) - GAP + reserve + PAD;

  const slotMarkup = Array.from({ length: slots }, (_, index) => `<rect class="slot${index >= cells.length ? ' spare' : ''}" x="${LEFT}" y="${slotY(index, slots)}" width="${COL_W}" height="${COL_H}" rx="6"/>`).join('');
  const labelMarkup = Array.from({ length: slots }, (_, index) => `<text class="index" x="${LEFT - 8}" y="${slotY(index, slots) + COL_H / 2 + 4}" text-anchor="end">${index}</text>`).join('');
  const itemMarkup = cells.map((cell, index) => (cell
    ? `<g class="${['item', ...classesFor(index, hl)].join(' ')}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${LEFT}px,${slotY(index, slots)}px)"><rect width="${COL_W}" height="${COL_H}" rx="6"/><text x="${COL_W / 2}" y="${COL_H / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`
    : '')).join('');
  const pointerMarkup = Object.entries(state.pointers || {})
    .filter(([, index]) => Number.isInteger(index))
    .map(([name, index]) => `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${LEFT + COL_W + 8}px,${slotY(index, slots) + COL_H / 2 + 4}px)"><text>← ${escapeHtml(name)}</text></g>`)
    .join('');

  const label = `Stack of ${cells.length}, bottom to top: ${cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`;
  return `<svg class="viz viz-column" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup}${labelMarkup}</g><g class="layer-items">${itemMarkup}${pointerMarkup}</g></svg>`;
}
```

`src/learn/render/index.js`:

```js
import { renderArray } from './array.js';
import { renderColumn } from './column.js';

export const RENDERERS = { array: renderArray, column: renderColumn };
```

- [ ] **Step 3: Verify** — Run: `node --test test/learn-column-render.test.mjs` — Expected: PASS, 3 tests.

- [ ] **Step 4: Commit**

```bash
git add src/learn/render/column.js src/learn/render/index.js test/learn-column-render.test.mjs
git commit -m "feat: add a bottom-up column renderer for stacks"
```

---

### Task 3: stack, queue, and pair modules

**Files:**
- Create: `src/learn/data/stack.js`, `src/learn/data/queue.js`, `src/learn/data/pair.js`, `test/learn-data-modules.test.mjs`
- Modify: `src/learn/modules.js`

- [ ] **Step 1: Write the failing test**

`test/learn-data-modules.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import stack, { LIMIT as STACK_LIMIT } from '../src/learn/data/stack.js';
import queue from '../src/learn/data/queue.js';
import pair from '../src/learn/data/pair.js';

function run(module, state, opName, args = {}) {
  const op = module.ops[opName];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}
const values = (state) => state.cells.map((cell) => (cell ? cell.value : null));

test('stack pushes and pops at the top and grows by doubling', () => {
  let { state } = run(stack, stack.preset(), 'push', { x: 40 });
  assert.deepEqual(values(state), [10, 20, 30, 40]);
  assert.deepEqual(state.pointers, { top: 3 });
  const grown = run(stack, state, 'push', { x: 50 });
  assert.equal(grown.state.capacity, 8);
  assert.match(grown.frames[0].msg, /expand to a new array of 8/);
  ({ state } = run(stack, stack.preset(), 'pop'));
  assert.deepEqual(values(state), [10, 20]);
  assert.deepEqual(state.pointers, { top: 1 });
  assert.match(run(stack, stack.preset(), 'top').frames[0].msg, /top\(\) is 30/);
});

test('stack refuses pop and top when empty and caps its size', () => {
  const empty = { cells: [], capacity: 4, nextKey: 0, pointers: { top: -1 } };
  assert.match(run(stack, empty, 'pop').problem, /empty stack/);
  assert.match(run(stack, empty, 'top').problem, /empty stack/);
  const full = { cells: Array.from({ length: STACK_LIMIT }, (_, i) => ({ key: `x${i}`, value: i })), capacity: 16, nextKey: STACK_LIMIT, pointers: { top: STACK_LIMIT - 1 } };
  assert.match(run(stack, full, 'push', { x: 1 }).problem, /at most/);
});

test('queue wraps around the circular buffer', () => {
  const { state, frames } = run(queue, queue.preset(), 'push', { x: 40 });
  assert.deepEqual(values(state), [40, 10, 20, 30]);
  assert.match(frames[0].msg, /slot \(front \+ size\) % capacity = 0/);
  assert.deepEqual(state.pointers, { front: 1, back: 0 });
});

test('queue grows by copying in queue order so front becomes 0', () => {
  const full = run(queue, queue.preset(), 'push', { x: 40 }).state;
  const { state, frames } = run(queue, full, 'push', { x: 50 });
  assert.equal(state.capacity, 8);
  assert.equal(state.front, 0);
  assert.deepEqual(values(state), [10, 20, 30, 40, 50, null, null, null]);
  assert.match(frames[1].msg, /front becomes 0/);
  assert.equal(new Set(state.cells.filter(Boolean).map((cell) => cell.key)).size, 5);
});

test('queue pops from the front and reads front and back', () => {
  const { state } = run(queue, queue.preset(), 'pop');
  assert.deepEqual(values(state), [null, null, 20, 30]);
  assert.deepEqual([state.front, state.size], [2, 2]);
  assert.match(run(queue, queue.preset(), 'front').frames[0].msg, /front\(\) is 10/);
  assert.match(run(queue, queue.preset(), 'back').frames[0].msg, /back\(\) is 30/);
  const empty = { cells: [null, null], capacity: 2, front: 0, size: 0, nextKey: 0, pointers: { front: null, back: null } };
  for (const op of ['pop', 'front', 'back']) assert.match(run(queue, empty, op).problem, /empty queue/);
});

test('pair compares first, then second only on a tie', () => {
  const preset = pair.preset();
  const differ = run(pair, preset, 'compare', { i: 1, j: 0 });
  assert.equal(differ.frames.length, 2);
  assert.match(differ.frames.at(-1).msg, /v\[1\] < v\[0\] is true/);
  const tie = run(pair, preset, 'compare', { i: 0, j: 2 });
  assert.equal(tie.frames.length, 3);
  assert.match(tie.frames[1].msg, /tie at 3/);
  assert.match(tie.frames.at(-1).msg, /is false/);
  assert.match(run(pair, preset, 'compare', { i: 0, j: 5 }).problem, /below size/);
});

test('pair sort orders lexicographically and keeps each pair key', () => {
  const preset = pair.preset();
  const { state } = run(pair, preset, 'sort');
  assert.deepEqual(values(state), ['(1, 5)', '(3, 0)', '(3, 1)']);
  assert.deepEqual(state.cells.map((cell) => cell.key).sort(), preset.cells.map((cell) => cell.key).sort());
  const pushed = run(pair, preset, 'push_back', { a: -2, b: 4 }).state;
  assert.deepEqual(pushed.cells.at(-1).pair, [-2, 4]);
  assert.equal(pushed.cellWidth, 84);
});
```

Run: `node --test test/learn-data-modules.test.mjs` — Expected: FAIL, module not found.

- [ ] **Step 2: Implement the modules**

`src/learn/data/stack.js`:

```js
export const LIMIT = 10;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const indexes = (count) => Array.from({ length: count }, (_, k) => k);

function newCell(state, value) {
  const cell = { key: `s${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function syncTop(state) {
  state.pointers = { top: state.cells.length - 1 };
}

function* grow(state) {
  if (state.cells.length < state.capacity) return;
  const next = state.capacity === 0 ? 1 : state.capacity * 2;
  yield { line: 0, msg: `size ${state.cells.length} == capacity ${state.capacity}: expand to a new array of ${next}`, state, hl: { compare: indexes(state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} element${state.cells.length === 1 ? '' : 's'} into the new array and free the old one`, state, hl: { moved: indexes(state.cells.length) } };
}

const emptyError = (name) => (state) => (state.cells.length === 0 ? `${name} on an empty stack is undefined behaviour` : null);

export default {
  id: 'stack',
  side: 'data',
  group: 'Adaptor',
  title: 'stack',
  summary: 'Last in, first out. The course CP::stack keeps a dynamic array and pushes and pops at its end, the top.',
  renderer: 'column',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: a full stack doubles its capacity and copies all n elements once.',
  },
  declare: 'CP::stack<int> s;  // holds 10, 20, 30 (bottom → top), capacity 4',
  preset() {
    return { cells: [{ key: 's0', value: 10 }, { key: 's1', value: 20 }, { key: 's2', value: 30 }], capacity: 4, nextKey: 3, pointers: { top: 2 } };
  },
  ops: {
    push: {
      params: [valueParam],
      time: 'O(1)*',
      code: 's.push({x});',
      check: (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null),
      *run(state, { x }) {
        yield* grow(state);
        state.cells.push(newCell(state, x));
        syncTop(state);
        const top = state.cells.length - 1;
        yield { line: 0, msg: `Write ${x} at index ${top}; top moves up to ${top}`, state, hl: { active: [top] } };
      },
    },
    pop: {
      params: [],
      time: 'O(1)',
      code: 's.pop();',
      check: emptyError('pop'),
      *run(state) {
        const top = state.cells.length - 1;
        yield { line: 0, msg: `Remove the top element ${state.cells[top].value}`, state, hl: { active: [top] } };
        state.cells.pop();
        syncTop(state);
        yield { line: 0, msg: `top moves down to ${state.cells.length - 1}; capacity stays ${state.capacity}`, state, hl: {} };
      },
    },
    top: {
      params: [],
      time: 'O(1)',
      code: 's.top();',
      check: emptyError('top'),
      *run(state) {
        const top = state.cells.length - 1;
        yield { line: 0, msg: `top() is ${state.cells[top].value}: it reads data[size - 1]`, state, hl: { active: [top] } };
      },
    },
  },
};
```

`src/learn/data/queue.js`:

```js
export const LIMIT = 12;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const indexes = (count) => Array.from({ length: count }, (_, k) => k);

function newCell(state, value) {
  const cell = { key: `q${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function slotOf(state, k) {
  return (state.front + k) % state.capacity;
}

function sync(state) {
  state.pointers = { front: state.size ? state.front : null, back: state.size ? slotOf(state, state.size - 1) : null };
}

const emptyError = (name) => (state) => (state.size === 0 ? `${name} on an empty queue is undefined behaviour` : null);

export default {
  id: 'queue',
  side: 'data',
  group: 'Adaptor',
  title: 'queue',
  summary: 'First in, first out. The course CP::queue is a circular buffer: front, size, and capacity, with indexes wrapping around.',
  renderer: 'array',
  complexity: {
    space: 'O(n)',
    note: '* Amortized: a full queue doubles its capacity and copies all n elements in queue order, so front becomes 0.',
  },
  declare: 'CP::queue<int> q;  // front at slot 1: 10, 20, 30, capacity 4',
  preset() {
    const state = { cells: [null, { key: 'q0', value: 10 }, { key: 'q1', value: 20 }, { key: 'q2', value: 30 }], capacity: 4, front: 1, size: 3, nextKey: 3 };
    sync(state);
    return state;
  },
  ops: {
    push: {
      params: [valueParam],
      time: 'O(1)*',
      code: 'q.push({x});',
      check: (state) => (state.size >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null),
      *run(state, { x }) {
        if (state.size === state.capacity) {
          const next = state.capacity * 2;
          const used = indexes(state.size).map((k) => slotOf(state, k));
          yield { line: 0, msg: `size ${state.size} == capacity ${state.capacity}: allocate a new buffer of ${next}`, state, hl: { compare: used } };
          const ordered = indexes(state.size).map((k) => state.cells[slotOf(state, k)]);
          state.cells = [...ordered, ...Array(next - state.size).fill(null)];
          state.capacity = next;
          state.front = 0;
          sync(state);
          yield { line: 0, msg: `Copy the ${state.size} elements in queue order into slots 0..${state.size - 1}; front becomes 0`, state, hl: { moved: indexes(state.size) } };
        }
        const at = slotOf(state, state.size);
        state.cells[at] = newCell(state, x);
        state.size += 1;
        sync(state);
        yield { line: 0, msg: `Write ${x} at slot (front + size) % capacity = ${at}; size becomes ${state.size}`, state, hl: { active: [at] } };
      },
    },
    pop: {
      params: [],
      time: 'O(1)',
      code: 'q.pop();',
      check: emptyError('pop'),
      *run(state) {
        const at = state.front;
        yield { line: 0, msg: `Remove the front element ${state.cells[at].value} at slot ${at}`, state, hl: { active: [at] } };
        state.cells[at] = null;
        state.front = (at + 1) % state.capacity;
        state.size -= 1;
        sync(state);
        yield { line: 0, msg: `front moves to (front + 1) % capacity = ${state.front}; size becomes ${state.size}`, state, hl: {} };
      },
    },
    front: {
      params: [],
      time: 'O(1)',
      code: 'q.front();',
      check: emptyError('front'),
      *run(state) {
        yield { line: 0, msg: `front() is ${state.cells[state.front].value}, at slot front = ${state.front}`, state, hl: { active: [state.front] } };
      },
    },
    back: {
      params: [],
      time: 'O(1)',
      code: 'q.back();',
      check: emptyError('back'),
      *run(state) {
        const at = slotOf(state, state.size - 1);
        yield { line: 0, msg: `back() is ${state.cells[at].value}, at slot (front + size - 1) % capacity = ${at}`, state, hl: { active: [at] } };
      },
    },
  },
};
```

`src/learn/data/pair.js`:

```js
export const LIMIT = 8;

const numberParam = (name, value) => ({ name, min: -99, max: 99, default: value });
const indexes = (count) => Array.from({ length: count }, (_, k) => k);
const show = (pair) => `(${pair[0]}, ${pair[1]})`;

function newCell(state, pair) {
  const cell = { key: `p${state.nextKey}`, value: show(pair), pair };
  state.nextKey += 1;
  return cell;
}

// Yields the steps of comparing v[i] < v[j] and returns the result.
function* compareSteps(state, i, j) {
  const [a, b] = [state.cells[i].pair, state.cells[j].pair];
  yield { line: 0, msg: `Compare first: ${a[0]} vs ${b[0]}`, state, hl: { compare: [i, j] } };
  if (a[0] !== b[0]) return a[0] < b[0];
  yield { line: 0, msg: `First values tie at ${a[0]}: compare second: ${a[1]} vs ${b[1]}`, state, hl: { compare: [i, j] } };
  return a[1] < b[1];
}

export default {
  id: 'pair',
  side: 'data',
  group: 'Sequence',
  title: 'pair',
  summary: 'Two values in one object. pairs compare lexicographically: first decides, and second only breaks a tie.',
  renderer: 'array',
  complexity: {
    space: 'O(n)',
    note: '* Amortized, like vector. sort uses std::sort, O(n log n); the animation uses adjacent swaps so you can see each pair comparison.',
  },
  declare: 'vector<pair<int, int>> v = {{3, 1}, {1, 5}, {3, 0}};',
  preset() {
    const state = { cells: [], cellWidth: 84, nextKey: 0 };
    for (const pair of [[3, 1], [1, 5], [3, 0]]) state.cells.push(newCell(state, pair));
    return state;
  },
  ops: {
    push_back: {
      params: [numberParam('a', 2), numberParam('b', 7)],
      time: 'O(1)*',
      code: 'v.push_back(make_pair({a}, {b}));',
      check: (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} pairs` : null),
      *run(state, { a, b }) {
        state.cells.push(newCell(state, [a, b]));
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Append ${show([a, b])} at index ${at}`, state, hl: { active: [at] } };
      },
    },
    compare: {
      params: [{ name: 'i', min: 0, max: LIMIT - 1, default: 0 }, { name: 'j', min: 0, max: LIMIT - 1, default: 2 }],
      time: 'O(1)',
      code: 'v[{i}] < v[{j}];',
      check: (state, { i, j }) => (Math.max(i, j) >= state.cells.length ? `i and j must be below size (${state.cells.length})` : null),
      *run(state, { i, j }) {
        const result = yield* compareSteps(state, i, j);
        yield { line: 0, msg: `v[${i}] < v[${j}] is ${result}`, state, hl: { active: result ? [i] : [j] } };
      },
    },
    sort: {
      params: [],
      time: 'O(n log n)',
      code: 'sort(v.begin(), v.end());',
      *run(state) {
        for (let i = 1; i < state.cells.length; i += 1) {
          for (let j = i; j > 0; j -= 1) {
            const smaller = yield* compareSteps(state, j, j - 1);
            if (!smaller) {
              yield { line: 0, msg: `${state.cells[j].value} is not smaller than ${state.cells[j - 1].value}: keep the order`, state, hl: { compare: [j - 1, j] } };
              break;
            }
            [state.cells[j - 1], state.cells[j]] = [state.cells[j], state.cells[j - 1]];
            yield { line: 0, msg: `${state.cells[j - 1].value} < ${state.cells[j].value}: swap them`, state, hl: { moved: [j - 1, j] } };
          }
        }
        yield { line: 0, msg: 'Sorted by first, then by second', state, hl: { done: indexes(state.cells.length) } };
      },
    },
    pop_back: {
      params: [],
      time: 'O(1)',
      code: 'v.pop_back();',
      check: (state) => (state.cells.length === 0 ? 'pop_back on an empty vector is undefined behaviour' : null),
      *run(state) {
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Remove the last pair ${state.cells[at].value}`, state, hl: { active: [at] } };
        state.cells.pop();
        yield { line: 0, msg: `size becomes ${state.cells.length}`, state, hl: {} };
      },
    },
  },
};
```

- [ ] **Step 3: Register them**

`src/learn/modules.js`:

```js
import insertionSort from './algo/insertion-sort.js';
import pair from './data/pair.js';
import queue from './data/queue.js';
import stack from './data/stack.js';
import vector from './data/vector.js';

export const MODULES = [vector, pair, stack, queue, insertionSort];

export function modulesFor(side) {
  return MODULES.filter((module) => module.side === side);
}

export function findModule(side, id) {
  return MODULES.find((module) => module.side === side && module.id === id) || null;
}
```

- [ ] **Step 4: Verify** — Run: `npm test` — Expected: all pass. The contract tests in `test/learn-modules.test.mjs` now also check stack, queue, and pair (defaults valid on the preset, every frame on line 0, unique keys per frame, Big O fields).

- [ ] **Step 5: Commit**

```bash
git add src/learn/data src/learn/modules.js test/learn-data-modules.test.mjs
git commit -m "feat: add stack, queue, and pair learning modules"
```

---

### Task 4: Full verification and manual check

- [ ] **Step 1:** Run `npm run verify`. Expected: all tests pass, lint and build succeed.
- [ ] **Step 2: Manual check** — `npm run dev`, open `http://localhost:4173/#/learn/data`:
  1. The module list shows Sequence → vector, pair and Adaptor → stack, queue, each with its Big O summary.
  2. `stack`: a vertical column with 10/20/30 and one dashed spare slot; `← top` beside 30. push 40 fills the spare; push 50 shows "expand to a new array of 8", then 8 slots. pop moves top down; on an empty stack pop/top show the undefined-behaviour error.
  3. `queue`: slots `_ 10 20 30` with `↑front` at 1 and `↑back` at 3. push 40 lands in slot 0 (wrap-around) and `back` moves to 0. push 50 shows the copy into queue order, front becomes 0, capacity 8.
  4. `pair`: cells `(3, 1) (1, 5) (3, 0)`. compare i 0, j 2 shows the tie on first and the second comparison. sort shows comparisons and swaps and ends `(1, 5) (3, 0) (3, 1)`.
  5. Each op button shows its Big O; the complexity table shows space O(n) and the amortized note.
- [ ] **Step 3:** Fix anything found in the Phase 3a files only and commit as `fix: …`.

