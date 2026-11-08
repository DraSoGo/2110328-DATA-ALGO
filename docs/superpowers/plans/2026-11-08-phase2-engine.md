# Data Algo Atlas — Phase 2 (Visualizer Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Learning section work end to end. A shared record-then-replay engine (recorder, player, input parsing, keyed SVG patching), an array renderer, and two reference modules: `vector` on the Data side and `insertion sort` on the Algo side.

**Architecture:** Each module is a plain ES module. Data modules expose `ops` whose generator `run(state, args)` yields frames. Algo modules expose `code[]`, `input.fields`, and a generator `run(input)`. `record()` drains a generator into an array of deep-copied frames. `createPlayer()` steps through them with an injectable timer. Renderers are pure functions `(state, hl) → SVG string`. `patchSvg()` updates elements that share a `data-key` in place, so CSS transitions animate moves. `src/learn/view.js` builds the page and wires everything. `src/app.js` only delegates `#/learn/<side>[/<module>]` routes to it.

**Tech Stack:** Browser ES modules, SVG, CSS transitions, Node 20+ `node:test`. No dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md`, Part 2 (Learning) and build phase 2.

**Scope change from the spec:** the spec puts all five renderers in Phase 2. This plan builds only `array`, the one that `vector` and `insertion sort` use. The state shapes of `linked`, `tree`, `table`, and `graph` depend on the modules that use them, so each one is built together with its first module in the Phase 3 and 4 plans. Task 10 updates the spec to match.

**Security rule:** views and renderers build HTML/SVG strings. Every value that comes from a module, a frame, or user input must pass through `escapeHtml()` before it goes into markup. That includes the two `innerHTML` assignments in `view.js` (op line, variables panel), which only receive escaped strings. Step messages go into the page through `textContent` only.

**Repo root:** `/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Data_Algo`. Run every command from here.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/html.js` | `escapeHtml`, shared by the app and the learn view |
| `src/learn/engine/recorder.js` | `record(steps, limit)` turns a generator into deep-copied frames, with a 2,000-frame cap |
| `src/learn/engine/input.js` | `parseInteger`, `parseIntegerList` with range and length limits |
| `src/learn/engine/player.js` | `createPlayer` (first, prev, next, last, seek, play, pause, toggle, speed) with an injectable timer |
| `src/learn/engine/morph.js` | `patchSvg(host, markup, {animate})`, a keyed in-place SVG update (DOM) |
| `src/learn/render/array.js` | `renderArray(state, hl)`: cells or bars, capacity slots, lifted item, pointers |
| `src/learn/render/index.js` | `RENDERERS` registry |
| `src/learn/data/vector.js` | vector module: push_back, pop_back, insert, erase, at |
| `src/learn/algo/insertion-sort.js` | insertion sort module |
| `src/learn/modules.js` | `MODULES`, `modulesFor(side)`, `findModule(side, id)` |
| `src/learn/view.js` | learn page markup, mount and unmount, player wiring, keyboard |
| `src/learn/learn.css` | learn page and visualization styles |
| `src/app.js`, `index.html` | delegate learn routes, load `learn.css` |
| `test/html.test.mjs`, `test/learn-*.test.mjs` | unit and contract tests |

Frame contract (used by every module):

```js
{ line: number | null, msg: string, state: object, hl: { active?: number[], compare?: number[], moved?: number[], done?: number[] }, vars: object | null }
```

Array renderer state:

```js
{ cells: Array<{ key: string, value: number } | null>, capacity?: number, mode?: 'cells' | 'bars',
  lifted?: { key: string, value: number, at: number } | null, pointers?: { [name: string]: number } }
```

---

### Task 1: Shared `escapeHtml`

**Files:**
- Create: `src/lib/html.js`, `test/html.test.mjs`
- Modify: `src/app.js` (lines 1–27: imports and local `escapeHtml`)

- [ ] **Step 1: Write the failing test**

`test/html.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/html.js';

test('escapeHtml escapes markup and quote characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(escapeHtml(42), '42');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/html.test.mjs`
Expected: FAIL, `Cannot find module …/src/lib/html.js`.

- [ ] **Step 3: Implement**

`src/lib/html.js`:

```js
export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
```

In `src/app.js`, delete the local function (currently lines 25–27):

```js
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
```

and add this import after `import { highlightCpp } from './lib/cpp-highlight.js';`:

```js
import { escapeHtml } from './lib/html.js';
```

- [ ] **Step 4: Verify**

Run: `node --check src/app.js && npm test`
Expected: all tests pass, including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/lib/html.js test/html.test.mjs src/app.js
git commit -m "refactor: share escapeHtml between the app and upcoming learn views"
```

---

### Task 2: Recorder

**Files:**
- Create: `src/learn/engine/recorder.js`, `test/learn-recorder.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-recorder.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAME_LIMIT, record, TooManyStepsError } from '../src/learn/engine/recorder.js';

function* mutating() {
  const state = { n: 0, list: [] };
  for (let i = 0; i < 3; i += 1) {
    state.n = i;
    state.list.push(i);
    yield { line: i, msg: `n = ${i}`, state, hl: { active: [i] }, vars: { i } };
  }
}

function* endless() {
  let i = 0;
  while (true) yield { state: { i: i++ } };
}

test('record deep-copies every frame so later mutations do not leak back', () => {
  const frames = record(mutating());
  assert.deepEqual(frames.map((frame) => frame.state), [
    { n: 0, list: [0] },
    { n: 1, list: [0, 1] },
    { n: 2, list: [0, 1, 2] },
  ]);
  frames[0].state.list.push(99);
  assert.deepEqual(frames[1].state.list, [0, 1]);
  assert.deepEqual(frames[2], { line: 2, msg: 'n = 2', state: { n: 2, list: [0, 1, 2] }, hl: { active: [2] }, vars: { i: 2 } });
});

test('record fills defaults for missing fields', () => {
  assert.deepEqual(record([{ state: { a: 1 } }]), [{ line: null, msg: '', state: { a: 1 }, hl: {}, vars: null }]);
});

test('record stops runaway generators at the frame limit', () => {
  assert.equal(FRAME_LIMIT, 2000);
  assert.throws(() => record(endless(), 5), TooManyStepsError);
  assert.equal(record([{ state: {} }, { state: {} }], 2).length, 2);
  assert.match(new TooManyStepsError(5).message, /smaller input/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-recorder.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/engine/recorder.js`:

```js
export const FRAME_LIMIT = 2000;

export class TooManyStepsError extends Error {
  constructor(limit) {
    super(`Too many steps (over ${limit}). Use a smaller input.`);
    this.name = 'TooManyStepsError';
  }
}

export function record(steps, limit = FRAME_LIMIT) {
  const frames = [];
  for (const step of steps) {
    if (frames.length === limit) throw new TooManyStepsError(limit);
    frames.push({
      line: step.line ?? null,
      msg: step.msg ?? '',
      state: structuredClone(step.state),
      hl: structuredClone(step.hl ?? {}),
      vars: step.vars === undefined ? null : structuredClone(step.vars),
    });
  }
  return frames;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-recorder.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/engine/recorder.js test/learn-recorder.test.mjs
git commit -m "feat: record visualizer steps into deep-copied frames"
```

---

### Task 3: Input parsing

**Files:**
- Create: `src/learn/engine/input.js`, `test/learn-input.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-input.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInteger, parseIntegerList } from '../src/learn/engine/input.js';

test('parseInteger accepts whole numbers inside the range', () => {
  assert.deepEqual(parseInteger(' 42 ', { min: 0, max: 99 }), { value: 42 });
  assert.deepEqual(parseInteger('-7', { min: -99, max: 99 }), { value: -7 });
  assert.deepEqual(parseInteger('', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('3.5', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('abc', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('10', { min: 0, max: 9 }), { error: 'Use a number from 0 to 9' });
});

test('parseIntegerList splits on commas or spaces and checks every number', () => {
  const rules = { min: -99, max: 99, minLength: 1, maxLength: 4 };
  assert.deepEqual(parseIntegerList('5, 2  4,-1', rules), { value: [5, 2, 4, -1] });
  assert.deepEqual(parseIntegerList('  ', rules), { error: 'Enter at least 1 number' });
  assert.deepEqual(parseIntegerList('1 2 3 4 5', rules), { error: 'Use at most 4 numbers' });
  assert.deepEqual(parseIntegerList('1, x', rules), { error: 'x: enter a whole number' });
  assert.deepEqual(parseIntegerList('1, 500', rules), { error: '500: use a number from -99 to 99' });
  assert.deepEqual(parseIntegerList('1', { min: 0, max: 9, minLength: 2, maxLength: 4 }), { error: 'Enter at least 2 numbers' });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-input.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/engine/input.js`:

```js
export function parseInteger(text, { min, max }) {
  const trimmed = String(text ?? '').trim();
  if (!/^-?\d+$/.test(trimmed)) return { error: 'Enter a whole number' };
  const value = Number(trimmed);
  if (value < min || value > max) return { error: `Use a number from ${min} to ${max}` };
  return { value };
}

export function parseIntegerList(text, { min, max, minLength = 1, maxLength }) {
  const parts = String(text ?? '').split(/[\s,]+/).filter(Boolean);
  if (parts.length < minLength) return { error: `Enter at least ${minLength} number${minLength > 1 ? 's' : ''}` };
  if (parts.length > maxLength) return { error: `Use at most ${maxLength} numbers` };
  const value = [];
  for (const part of parts) {
    const parsed = parseInteger(part, { min, max });
    if (parsed.error) return { error: `${part}: ${parsed.error.charAt(0).toLowerCase()}${parsed.error.slice(1)}` };
    value.push(parsed.value);
  }
  return { value };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-input.test.mjs`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/engine/input.js test/learn-input.test.mjs
git commit -m "feat: parse and validate visualizer number inputs"
```

---

### Task 4: Player

**Files:**
- Create: `src/learn/engine/player.js`, `test/learn-player.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-player.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_DELAY, createPlayer, SPEEDS } from '../src/learn/engine/player.js';

function fakeClock() {
  let pending = null;
  let nextId = 0;
  return {
    schedule(fn, ms) { nextId += 1; pending = { fn, ms, id: nextId }; return nextId; },
    cancel(id) { if (pending && pending.id === id) pending = null; },
    get pending() { return pending; },
    fire() { const job = pending; pending = null; job.fn(); },
  };
}

function setup(count) {
  const clock = fakeClock();
  const events = [];
  const frames = Array.from({ length: count }, (_, i) => ({ line: i, msg: `f${i}`, state: {}, hl: {}, vars: null }));
  const player = createPlayer({ frames, onChange: (event) => events.push(event), schedule: clock.schedule, cancel: clock.cancel });
  return { clock, events, player };
}

test('stepping clamps at both ends and only animates forward single steps', () => {
  const { events, player } = setup(3);
  player.first();
  player.prev();
  player.next();
  player.next();
  player.next();
  player.last();
  player.seek(-5);
  player.seek(99);
  assert.deepEqual(events.map((e) => [e.index, e.animate]), [[0, false], [0, false], [1, true], [2, true], [2, false], [2, false], [0, false], [2, false]]);
  assert.equal(events[0].total, 3);
  assert.equal(events[0].frame.msg, 'f0');
});

test('play advances on the timer and stops on the last frame', () => {
  const { clock, events, player } = setup(3);
  player.first();
  player.play();
  assert.equal(player.playing, true);
  assert.equal(clock.pending.ms, BASE_DELAY);
  clock.fire();
  clock.fire();
  assert.equal(player.index, 2);
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  assert.deepEqual(events.slice(-2).map((e) => [e.index, e.playing, e.animate]), [[1, true, true], [2, false, true]]);
});

test('play from the last frame restarts, pause cancels the timer', () => {
  const { clock, player } = setup(3);
  player.last();
  player.play();
  assert.equal(player.index, 0);
  player.pause();
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  player.toggle();
  assert.equal(player.playing, true);
  player.toggle();
  assert.equal(player.playing, false);
});

test('setSpeed accepts listed speeds only and reschedules while playing', () => {
  const { clock, player } = setup(4);
  assert.deepEqual(SPEEDS, [0.5, 1, 2, 4]);
  player.first();
  player.play();
  player.setSpeed(4);
  assert.equal(player.speed, 4);
  assert.equal(clock.pending.ms, BASE_DELAY / 4);
  player.setSpeed(3);
  assert.equal(player.speed, 4);
  player.destroy();
  assert.equal(clock.pending, null);
  assert.equal(player.playing, false);
});

test('a single frame never plays, and an empty frame list is rejected', () => {
  const { clock, player } = setup(1);
  player.first();
  player.play();
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  assert.throws(() => createPlayer({ frames: [], onChange() {} }), /at least one frame/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-player.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/engine/player.js`:

```js
export const SPEEDS = [0.5, 1, 2, 4];
export const BASE_DELAY = 700;

export function createPlayer({ frames, onChange, schedule = setTimeout, cancel = clearTimeout }) {
  if (!frames.length) throw new Error('A player needs at least one frame');
  let index = 0;
  let playing = false;
  let speed = 1;
  let timer = null;

  const lastIndex = () => frames.length - 1;
  const emit = (animate) => onChange({ index, frame: frames[index], total: frames.length, playing, speed, animate });
  const stopTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const halt = () => {
    stopTimer();
    playing = false;
  };
  const scheduleNext = () => {
    timer = schedule(tick, BASE_DELAY / speed);
  };

  function tick() {
    timer = null;
    if (!playing) return;
    index = Math.min(index + 1, lastIndex());
    if (index === lastIndex()) playing = false;
    emit(true);
    if (playing) scheduleNext();
  }

  function go(target) {
    halt();
    index = Math.max(0, Math.min(lastIndex(), target));
    emit(false);
  }

  function next() {
    halt();
    if (index < lastIndex()) {
      index += 1;
      emit(true);
    } else {
      emit(false);
    }
  }

  function play() {
    if (playing || frames.length < 2) return;
    if (index === lastIndex()) index = 0;
    playing = true;
    emit(false);
    scheduleNext();
  }

  function pause() {
    if (!playing) return;
    halt();
    emit(false);
  }

  function setSpeed(value) {
    if (!SPEEDS.includes(value)) return;
    speed = value;
    if (playing) {
      stopTimer();
      scheduleNext();
    }
    emit(false);
  }

  return {
    get index() { return index; },
    get playing() { return playing; },
    get speed() { return speed; },
    get total() { return frames.length; },
    first: () => go(0),
    last: () => go(lastIndex()),
    prev: () => go(index - 1),
    next,
    seek: (target) => go(target),
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    setSpeed,
    destroy: halt,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-player.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/engine/player.js test/learn-player.test.mjs
git commit -m "feat: add frame player with play, pause, step, seek, and speed"
```

---

### Task 5: Array renderer and renderer registry

**Files:**
- Create: `src/learn/render/array.js`, `src/learn/render/index.js`, `test/learn-array-render.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-array-render.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, GUTTER, PAD, renderArray, slotX } from '../src/learn/render/array.js';
import { RENDERERS } from '../src/learn/render/index.js';

const cells = (...values) => values.map((value, i) => ({ key: `k${i}`, value }));
const keys = (svg) => [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, key) => svg.match(new RegExp(`<g class="([^"]*)" data-key="${key}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)"`));

test('slotX leaves a gutter for index -1 pointers', () => {
  assert.equal(slotX(0), GUTTER);
  assert.equal(slotX(-1) < GUTTER, true);
});

test('cells mode draws one keyed item per cell at its slot', () => {
  const svg = renderArray({ cells: cells(10, 20, 30) });
  assert.match(svg, /^<svg class="viz viz-array" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
  assert.deepEqual(keys(svg), ['k0', 'k1', 'k2']);
  assert.equal(Number(groupFor(svg, 'k1')[2]), slotX(1));
  assert.match(svg, />20<\/text>/);
  assert.match(svg, /class="layer-static"/);
  assert.match(svg, /class="layer-items"/);
});

test('capacity adds dashed spare slots and empty cells keep their slot', () => {
  const svg = renderArray({ cells: [{ key: 'a', value: 1 }, null], capacity: 4 });
  assert.equal((svg.match(/<rect class="slot/g) || []).length, 4);
  assert.equal((svg.match(/class="slot spare"/g) || []).length, 2);
  assert.deepEqual(keys(svg), ['a']);
});

test('highlights map to classes on the matching items', () => {
  const svg = renderArray({ cells: cells(1, 2, 3) }, { active: [0], compare: [1], moved: [1], done: [2] });
  assert.equal(groupFor(svg, 'k0')[1], 'item is-active');
  assert.equal(groupFor(svg, 'k1')[1], 'item is-compare is-moved');
  assert.equal(groupFor(svg, 'k2')[1], 'item is-done');
});

test('lifted item sits above its slot in the top lane', () => {
  const svg = renderArray({ cells: [{ key: 'a', value: 1 }, null], lifted: { key: 'b', value: 5, at: 1 } });
  const lifted = groupFor(svg, 'b');
  assert.equal(lifted[1], 'item is-lifted');
  assert.equal(Number(lifted[2]), slotX(1));
  assert.equal(Number(lifted[3]), PAD);
  assert.equal(Number(groupFor(svg, 'a')[3]) > PAD + CELL, true);
});

test('pointers are keyed and stack when they share an index', () => {
  const svg = renderArray({ cells: cells(1, 2), pointers: { i: 1, j: -1, k: 1 } });
  assert.deepEqual(keys(svg).filter((key) => key.startsWith('ptr-')), ['ptr-i', 'ptr-j', 'ptr-k']);
  const y = (name) => Number(svg.match(new RegExp(`data-key="ptr-${name}" style="transform:translate\\(([-\\d.]+)px,([-\\d.]+)px\\)`))[2]);
  assert.equal(y('k') > y('i'), true);
  assert.equal(y('j'), y('i'));
});

test('bars mode scales heights by value', () => {
  const svg = renderArray({ mode: 'bars', cells: cells(1, 5, 3) });
  assert.match(svg, /class="viz viz-array is-bars"/);
  const height = (key) => Number(svg.match(new RegExp(`data-key="${key}"[^>]*><rect width="${CELL}" height="(\\d+)"`))[1]);
  assert.equal(height('k1') > height('k2') && height('k2') > height('k0'), true);
});

test('text content is escaped and the registry exposes the renderer', () => {
  const svg = renderArray({ cells: [{ key: 'x"y', value: '<b>' }] });
  assert.match(svg, /data-key="x&quot;y"/);
  assert.match(svg, />&lt;b&gt;<\/text>/);
  assert.equal(RENDERERS.array, renderArray);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-array-render.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/render/array.js`:

```js
import { escapeHtml } from '../../lib/html.js';

export const CELL = 44;
export const GAP = 8;
export const PAD = 16;
export const GUTTER = 40;
const BAR_MAX = 120;
const BAR_MIN = 16;
const LABEL_SPACE = 22;
const POINTER_ROW = 16;
const HL_CLASSES = [['active', 'is-active'], ['compare', 'is-compare'], ['moved', 'is-moved'], ['done', 'is-done']];

export function slotX(index) {
  return GUTTER + index * (CELL + GAP);
}

function classesFor(index, hl) {
  return HL_CLASSES.filter(([name]) => (hl[name] || []).includes(index)).map(([, className]) => className);
}

export function renderArray(state, hl = {}) {
  const cells = state.cells || [];
  const bars = state.mode === 'bars';
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
  const pointerRows = Math.max(0, ...pointers.map((pointer) => pointer.row + 1));
  const width = slotX(slots) - GAP + PAD;
  const height = baseline + LABEL_SPACE + pointerRows * POINTER_ROW + PAD;

  const item = (cell, x, y, h, className) => `<g class="${className}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${x}px,${y}px)"><rect width="${CELL}" height="${h}" rx="6"/><text x="${CELL / 2}" y="${bars ? h - 8 : CELL / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`;

  const slotMarkup = Array.from({ length: slots }, (_, index) => `<rect class="slot${index >= cells.length ? ' spare' : ''}" x="${slotX(index)}" y="${rowTop}" width="${CELL}" height="${rowHeight}" rx="6"/>`).join('');
  const labelMarkup = Array.from({ length: slots }, (_, index) => `<text class="index" x="${slotX(index) + CELL / 2}" y="${baseline + 15}" text-anchor="middle">${index}</text>`).join('');
  const itemMarkup = cells.map((cell, index) => {
    if (!cell) return '';
    const h = itemHeight(cell.value);
    return item(cell, slotX(index), baseline - h, h, ['item', ...classesFor(index, hl)].join(' '));
  }).join('');
  const liftedMarkup = state.lifted
    ? item(state.lifted, slotX(state.lifted.at), PAD + rowHeight - itemHeight(state.lifted.value), itemHeight(state.lifted.value), 'item is-lifted')
    : '';
  const pointerMarkup = pointers.map(({ name, index, row }) => `<g class="pointer" data-key="ptr-${escapeHtml(name)}" style="transform:translate(${index < 0 ? GUTTER / 2 : slotX(index) + CELL / 2}px,${baseline + LABEL_SPACE + row * POINTER_ROW}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`).join('');

  const label = `Array of ${cells.length}: ${cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`;
  return `<svg class="viz viz-array${bars ? ' is-bars' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup}${labelMarkup}</g><g class="layer-items">${itemMarkup}${liftedMarkup}${pointerMarkup}</g></svg>`;
}
```

In cells mode the lifted item's y is `PAD + CELL - CELL = PAD`, which matches the test.

`src/learn/render/index.js`:

```js
import { renderArray } from './array.js';

export const RENDERERS = { array: renderArray };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-array-render.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/render test/learn-array-render.test.mjs
git commit -m "feat: render arrays, vectors, and bars as keyed SVG"
```

---

### Task 6: `vector` module

**Files:**
- Create: `src/learn/data/vector.js`, `test/learn-vector.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-vector.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import vector, { LIMIT } from '../src/learn/data/vector.js';

const values = (state) => state.cells.map((cell) => cell.value);
const keys = (state) => state.cells.map((cell) => cell.key);
function run(state, opName, args = {}) {
  const op = vector.ops[opName];
  const problem = op.check ? op.check(state, args) : null;
  if (problem) return { problem };
  const frames = record(op.run(structuredClone(state), args));
  return { frames, state: frames.at(-1).state };
}
const withValues = (list, capacity) => ({ cells: list.map((value, i) => ({ key: `v${i}`, value })), capacity, nextKey: list.length });

test('preset is {10, 20, 30} with capacity 4', () => {
  const state = vector.preset();
  assert.deepEqual(values(state), [10, 20, 30]);
  assert.equal(state.capacity, 4);
  assert.deepEqual(vector.preset(), state);
  assert.notEqual(vector.preset(), state);
});

test('push_back writes into spare capacity without reallocating', () => {
  const { frames, state } = run(vector.preset(), 'push_back', { x: 40 });
  assert.deepEqual(values(state), [10, 20, 30, 40]);
  assert.equal(state.capacity, 4);
  assert.equal(frames.length, 1);
  assert.deepEqual(frames[0].hl, { active: [3] });
});

test('push_back on a full vector doubles capacity before writing', () => {
  const { frames, state } = run(withValues([1, 2, 3, 4], 4), 'push_back', { x: 5 });
  assert.equal(state.capacity, 8);
  assert.deepEqual(values(state), [1, 2, 3, 4, 5]);
  assert.match(frames[0].msg, /allocate a new buffer of 8/);
  assert.equal(frames[0].state.capacity, 4);
  assert.equal(frames[1].state.capacity, 8);
  assert.equal(new Set(keys(state)).size, 5);
});

test('push_back on capacity 0 allocates one slot', () => {
  const { state } = run(withValues([], 0), 'push_back', { x: 7 });
  assert.equal(state.capacity, 1);
  assert.deepEqual(values(state), [7]);
});

test('insert shifts the tail right and keeps existing keys', () => {
  const before = vector.preset();
  const { frames, state } = run(before, 'insert', { pos: 1, x: 99 });
  assert.deepEqual(values(state), [10, 99, 20, 30]);
  assert.deepEqual([state.cells[0].key, state.cells[2].key, state.cells[3].key], [before.cells[0].key, before.cells[1].key, before.cells[2].key]);
  assert.deepEqual(frames.at(-1).hl, { active: [1], moved: [2, 3] });
  assert.match(run(before, 'insert', { pos: 4, x: 1 }).problem, /between 0 and size \(3\)/);
  assert.deepEqual(values(run(before, 'insert', { pos: 3, x: 1 }).state), [10, 20, 30, 1]);
});

test('erase removes one element and shifts the tail left', () => {
  const { frames, state } = run(vector.preset(), 'erase', { pos: 0 });
  assert.deepEqual(values(state), [20, 30]);
  assert.deepEqual(frames.at(-1).hl, { moved: [0, 1] });
  assert.equal(state.capacity, 4);
  assert.match(run(vector.preset(), 'erase', { pos: 3 }).problem, /between 0 and size - 1 \(2\)/);
  assert.match(run(withValues([], 4), 'erase', { pos: 0 }).problem, /empty/);
});

test('pop_back removes the last element and refuses an empty vector', () => {
  const { state } = run(vector.preset(), 'pop_back');
  assert.deepEqual(values(state), [10, 20]);
  assert.equal(state.capacity, 4);
  assert.match(run(withValues([], 4), 'pop_back').problem, /empty/);
});

test('at reads without changing the vector', () => {
  const { frames, state } = run(vector.preset(), 'at', { i: 2 });
  assert.deepEqual(values(state), [10, 20, 30]);
  assert.match(frames[0].msg, /v\[2\] is 30/);
  assert.match(run(vector.preset(), 'at', { i: 3 }).problem, /below size \(3\)/);
});

test('size is capped for readability', () => {
  const full = withValues(Array.from({ length: LIMIT }, (_, i) => i), 16);
  assert.match(run(full, 'push_back', { x: 1 }).problem, new RegExp(`at most ${LIMIT}`));
  assert.match(run(full, 'insert', { pos: 0, x: 1 }).problem, new RegExp(`at most ${LIMIT}`));
});

test('every frame points at the single code line', () => {
  for (const [name, op] of Object.entries(vector.ops)) {
    const args = Object.fromEntries(op.params.map((param) => [param.name, param.default]));
    const result = run(vector.preset(), name, args);
    if (result.problem) continue;
    for (const frame of result.frames) assert.equal(frame.line, 0, name);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-vector.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/data/vector.js`:

```js
export const LIMIT = 12;

const valueParam = { name: 'x', min: -99, max: 99, default: 40 };
const tooBig = (state) => (state.cells.length >= LIMIT ? `This demo keeps at most ${LIMIT} elements` : null);
const indexes = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k);

function newCell(state, value) {
  const cell = { key: `v${state.nextKey}`, value };
  state.nextKey += 1;
  return cell;
}

function* grow(state) {
  if (state.cells.length < state.capacity) return;
  const next = state.capacity === 0 ? 1 : state.capacity * 2;
  yield { line: 0, msg: `size ${state.cells.length} == capacity ${state.capacity}: allocate a new buffer of ${next}`, state, hl: { compare: indexes(0, state.cells.length) } };
  state.capacity = next;
  yield { line: 0, msg: `Copy ${state.cells.length} element${state.cells.length === 1 ? '' : 's'} into the new buffer and free the old one`, state, hl: { moved: indexes(0, state.cells.length) } };
}

export default {
  id: 'vector',
  side: 'data',
  group: 'Sequence',
  title: 'vector',
  summary: 'A growable array: contiguous slots, a size, and a capacity that doubles when it runs out.',
  renderer: 'array',
  declare: 'vector<int> v = {10, 20, 30};  // capacity 4',
  preset() {
    return { cells: [{ key: 'v0', value: 10 }, { key: 'v1', value: 20 }, { key: 'v2', value: 30 }], capacity: 4, nextKey: 3 };
  },
  ops: {
    push_back: {
      params: [valueParam],
      code: 'v.push_back({x});',
      check: (state) => tooBig(state),
      *run(state, { x }) {
        yield* grow(state);
        state.cells.push(newCell(state, x));
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Write ${x} at index ${at}; size becomes ${state.cells.length}`, state, hl: { active: [at] } };
      },
    },
    pop_back: {
      params: [],
      code: 'v.pop_back();',
      check: (state) => (state.cells.length === 0 ? 'pop_back on an empty vector is undefined behaviour' : null),
      *run(state) {
        const at = state.cells.length - 1;
        yield { line: 0, msg: `Remove the last element v[${at}] = ${state.cells[at].value}`, state, hl: { active: [at] } };
        state.cells.pop();
        yield { line: 0, msg: `size becomes ${state.cells.length}; capacity stays ${state.capacity}`, state, hl: {} };
      },
    },
    insert: {
      params: [{ name: 'pos', min: 0, max: LIMIT, default: 1 }, valueParam],
      code: 'v.insert(v.begin() + {pos}, {x});',
      check: (state, { pos }) => tooBig(state) || (pos > state.cells.length ? `pos must be between 0 and size (${state.cells.length})` : null),
      *run(state, { pos, x }) {
        yield* grow(state);
        const tail = indexes(pos, state.cells.length);
        if (tail.length) yield { line: 0, msg: `Shift ${tail.length} element${tail.length === 1 ? '' : 's'} one slot right to open index ${pos}`, state, hl: { compare: tail } };
        state.cells.splice(pos, 0, newCell(state, x));
        yield { line: 0, msg: `Write ${x} at index ${pos}; size becomes ${state.cells.length}`, state, hl: { active: [pos], moved: tail.map((i) => i + 1) } };
      },
    },
    erase: {
      params: [{ name: 'pos', min: 0, max: LIMIT - 1, default: 0 }],
      code: 'v.erase(v.begin() + {pos});',
      check: (state, { pos }) => {
        if (state.cells.length === 0) return 'erase on an empty vector is undefined behaviour';
        return pos >= state.cells.length ? `pos must be between 0 and size - 1 (${state.cells.length - 1})` : null;
      },
      *run(state, { pos }) {
        yield { line: 0, msg: `Erase v[${pos}] = ${state.cells[pos].value}`, state, hl: { active: [pos] } };
        state.cells.splice(pos, 1);
        const moved = indexes(pos, state.cells.length);
        yield { line: 0, msg: moved.length ? `Shift ${moved.length} element${moved.length === 1 ? '' : 's'} one slot left; size becomes ${state.cells.length}` : `size becomes ${state.cells.length}`, state, hl: { moved } };
      },
    },
    at: {
      params: [{ name: 'i', min: 0, max: LIMIT - 1, default: 0 }],
      code: 'v[{i}];',
      check: (state, { i }) => (i >= state.cells.length ? `i must be below size (${state.cells.length})` : null),
      *run(state, { i }) {
        yield { line: 0, msg: `v[${i}] is ${state.cells[i].value}: one address computation, O(1)`, state, hl: { active: [i] } };
      },
    },
  },
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-vector.test.mjs`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/data/vector.js test/learn-vector.test.mjs
git commit -m "feat: add vector visualizer module"
```

---

### Task 7: `insertion sort` module

**Files:**
- Create: `src/learn/algo/insertion-sort.js`, `test/learn-insertion-sort.test.mjs`

- [ ] **Step 1: Write the failing test**

`test/learn-insertion-sort.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import insertionSort from '../src/learn/algo/insertion-sort.js';

const sortFrames = (a) => record(insertionSort.run({ a }));
const finalValues = (frames) => frames.at(-1).state.cells.map((cell) => cell.value);
const inversions = (a) => a.reduce((total, x, i) => total + a.slice(i + 1).filter((y) => y < x).length, 0);

test('sorts the default input and ends on the closing line', () => {
  const input = insertionSort.input.fields[0].default;
  const frames = sortFrames(input);
  assert.deepEqual(finalValues(frames), [...input].sort((x, y) => x - y));
  assert.equal(frames.at(-1).line, insertionSort.code.length - 1);
  assert.equal(frames.at(-1).state.lifted, null);
  assert.deepEqual(frames.at(-1).hl.done, input.map((_, i) => i));
});

test('keeps every element key exactly once', () => {
  const frames = sortFrames([3, 1, 2]);
  for (const frame of frames) {
    const present = [...frame.state.cells.filter(Boolean), frame.state.lifted].filter(Boolean).map((cell) => cell.key).sort();
    assert.deepEqual(present, ['a0', 'a1', 'a2']);
  }
});

test('one shift line per inversion', () => {
  for (const input of [[5, 2, 4, 6, 1, 3], [1, 2, 3], [3, 2, 1], [2, 2, 1, -5, 0]]) {
    const shifts = sortFrames(input).filter((frame) => frame.line === 5).length;
    assert.equal(shifts, inversions(input), input.join(','));
  }
});

test('handles duplicates, negatives, and a single element', () => {
  assert.deepEqual(finalValues(sortFrames([2, -1, 2, 0])), [-1, 0, 2, 2]);
  const single = sortFrames([7]);
  assert.deepEqual(finalValues(single), [7]);
  assert.equal(single.at(-1).line, insertionSort.code.length - 1);
});

test('frames expose key and j, and j can reach -1', () => {
  const frames = sortFrames([2, 1]);
  const lift = frames.find((frame) => frame.line === 2);
  assert.equal(lift.vars.key, 1);
  assert.equal(lift.state.lifted.value, 1);
  assert.equal(frames.some((frame) => frame.state.pointers.j === -1), true);
});

test('every frame points at a real code line and uses bars', () => {
  const frames = sortFrames([4, 3, 2, 1]);
  for (const frame of frames) {
    assert.equal(Number.isInteger(frame.line) && frame.line >= 0 && frame.line < insertionSort.code.length, true);
    assert.equal(frame.state.mode, 'bars');
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-insertion-sort.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/algo/insertion-sort.js`:

```js
const CODE = [
  'void insertion_sort(vector<int>& a) {',
  '  for (int i = 1; i < a.size(); i++) {',
  '    int key = a[i];',
  '    int j = i - 1;',
  '    while (j >= 0 && a[j] > key) {',
  '      a[j + 1] = a[j];',
  '      j--;',
  '    }',
  '    a[j + 1] = key;',
  '  }',
  '}',
];

const prefix = (length) => Array.from({ length }, (_, k) => k);

export default {
  id: 'insertion-sort',
  side: 'algo',
  group: 'Sort',
  title: 'Insertion sort',
  summary: 'Grow a sorted prefix: lift a[i] out, shift bigger elements right, drop it into the hole.',
  renderer: 'array',
  code: CODE,
  input: {
    fields: [{ name: 'a', label: 'a[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [5, 2, 4, 6, 1, 3] }],
  },
  *run({ a }) {
    const n = a.length;
    const state = { mode: 'bars', cells: a.map((value, index) => ({ key: `a${index}`, value })), lifted: null, pointers: {} };
    yield { line: 0, msg: `Sort ${n} number${n === 1 ? '' : 's'}`, state, hl: {}, vars: { n } };
    for (let i = 1; i < n; i += 1) {
      state.pointers = { i };
      yield { line: 1, msg: `i = ${i}: a[0..${i - 1}] is already sorted`, state, hl: { done: prefix(i) }, vars: { n, i } };
      const key = state.cells[i].value;
      state.lifted = { ...state.cells[i], at: i };
      state.cells[i] = null;
      yield { line: 2, msg: `Lift key = a[${i}] = ${key}`, state, hl: { done: prefix(i) }, vars: { n, i, key } };
      let j = i - 1;
      state.pointers = { i, j };
      yield { line: 3, msg: `Start comparing at j = ${j}`, state, hl: { done: prefix(i) }, vars: { n, i, key, j } };
      while (true) {
        const shift = j >= 0 && state.cells[j].value > key;
        const msg = j < 0 ? 'j < 0: reached the front' : `a[${j}] = ${state.cells[j].value} ${shift ? '>' : '<='} key ${key}${shift ? ': shift it right' : ': stop'}`;
        yield { line: 4, msg, state, hl: { compare: j >= 0 ? [j] : [] }, vars: { n, i, key, j } };
        if (!shift) break;
        state.cells[j + 1] = state.cells[j];
        state.cells[j] = null;
        state.lifted.at = j;
        yield { line: 5, msg: `a[${j + 1}] = a[${j}]`, state, hl: { moved: [j + 1] }, vars: { n, i, key, j } };
        j -= 1;
        state.pointers = { i, j };
        yield { line: 6, msg: `j = ${j}`, state, hl: {}, vars: { n, i, key, j } };
      }
      state.cells[j + 1] = { key: state.lifted.key, value: state.lifted.value };
      state.lifted = null;
      yield { line: 8, msg: `a[${j + 1}] = key = ${key}`, state, hl: { active: [j + 1], done: prefix(i + 1) }, vars: { n, i, key, j } };
    }
    state.pointers = {};
    yield { line: 1, msg: `i = ${Math.max(n, 1)} is not < ${n}: the loop ends`, state, hl: { done: prefix(n) }, vars: { n, i: Math.max(n, 1) } };
    yield { line: CODE.length - 1, msg: 'Done: the whole array is sorted', state, hl: { done: prefix(n) }, vars: { n } };
  },
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-insertion-sort.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/learn/algo/insertion-sort.js test/learn-insertion-sort.test.mjs
git commit -m "feat: add insertion sort visualizer module"
```

---

### Task 8: Module registry and contract tests

**Files:**
- Create: `src/learn/modules.js`, `test/learn-modules.test.mjs`

These contract tests run against every registered module, so Phase 3 and 4 modules are checked automatically.

- [ ] **Step 1: Write the failing test**

`test/learn-modules.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { parseInteger, parseIntegerList } from '../src/learn/engine/input.js';
import { findModule, MODULES, modulesFor } from '../src/learn/modules.js';
import { RENDERERS } from '../src/learn/render/index.js';

test('modules have unique ids per side, known renderers, and text fields', () => {
  const seen = new Set();
  for (const module of MODULES) {
    const id = `${module.side}/${module.id}`;
    assert.equal(seen.has(id), false, id);
    seen.add(id);
    assert.match(module.id, /^[\w-]+$/);
    assert.ok(['data', 'algo'].includes(module.side), id);
    assert.ok(RENDERERS[module.renderer], `${id} renderer`);
    for (const key of ['title', 'summary', 'group']) assert.equal(typeof module[key], 'string', `${id} ${key}`);
  }
  assert.deepEqual(modulesFor('data').map((m) => m.id), ['vector']);
  assert.deepEqual(modulesFor('algo').map((m) => m.id), ['insertion-sort']);
  assert.equal(findModule('data', 'vector'), modulesFor('data')[0]);
  assert.equal(findModule('algo', 'vector'), null);
});

test('data ops: code mentions every param, defaults are valid, default run renders', () => {
  for (const module of modulesFor('data')) {
    assert.equal(typeof module.declare, 'string');
    for (const [name, op] of Object.entries(module.ops)) {
      for (const param of op.params) {
        assert.ok(op.code.includes(`{${param.name}}`), `${module.id}.${name} code lacks {${param.name}}`);
        assert.deepEqual(parseInteger(String(param.default), param), { value: param.default }, `${module.id}.${name}.${param.name}`);
      }
      const args = Object.fromEntries(op.params.map((param) => [param.name, param.default]));
      const state = module.preset();
      if (op.check?.(state, args)) continue;
      const frames = record(op.run(structuredClone(state), args));
      assert.ok(frames.length >= 1, `${module.id}.${name} yields frames`);
      for (const frame of frames) {
        assert.equal(frame.line, 0, `${module.id}.${name}`);
        assert.match(RENDERERS[module.renderer](frame.state, frame.hl), /^<svg /);
      }
    }
  }
});

test('algo modules: defaults parse, every frame points at a code line and renders', () => {
  for (const module of modulesFor('algo')) {
    assert.ok(module.code.length > 0);
    const input = {};
    for (const field of module.input.fields) {
      const text = field.kind === 'list' ? field.default.join(', ') : String(field.default);
      const parsed = field.kind === 'list' ? parseIntegerList(text, field) : parseInteger(text, field);
      assert.equal(parsed.error, undefined, `${module.id}.${field.name}`);
      input[field.name] = parsed.value;
    }
    const frames = record(module.run(input));
    assert.ok(frames.length >= 1);
    for (const frame of frames) {
      assert.ok(Number.isInteger(frame.line) && frame.line >= 0 && frame.line < module.code.length, `${module.id} line ${frame.line}`);
      assert.match(RENDERERS[module.renderer](frame.state, frame.hl), /^<svg /);
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/learn-modules.test.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/learn/modules.js`:

```js
import insertionSort from './algo/insertion-sort.js';
import vector from './data/vector.js';

export const MODULES = [vector, insertionSort];

export function modulesFor(side) {
  return MODULES.filter((module) => module.side === side);
}

export function findModule(side, id) {
  return MODULES.find((module) => module.side === side && module.id === id) || null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test test/learn-modules.test.mjs && npm test`
Expected: PASS, 3 tests, and the full suite passes.

- [ ] **Step 5: Commit**

```bash
git add src/learn/modules.js test/learn-modules.test.mjs
git commit -m "feat: register learn modules and check them against the module contract"
```

---

### Task 9: SVG patching, learn view, styles, and app wiring

**Files:**
- Create: `src/learn/engine/morph.js`, `src/learn/view.js`, `src/learn/learn.css`
- Modify: `src/app.js` (imports, `learnMarkup`, `renderRoute`), `index.html` (stylesheet link)

These files touch the DOM, so they are checked by hand in Step 7, not by unit tests.

- [ ] **Step 1: Write `src/learn/engine/morph.js`**

```js
const SVG_TYPE = 'image/svg+xml';

function syncAttributes(target, source) {
  for (const { name } of [...target.attributes]) if (!source.hasAttribute(name)) target.removeAttribute(name);
  for (const { name, value } of [...source.attributes]) if (target.getAttribute(name) !== value) target.setAttribute(name, value);
}

function syncTree(target, source) {
  syncAttributes(target, source);
  const current = [...target.children];
  const next = [...source.children];
  if (!current.length && !next.length) {
    if (target.textContent !== source.textContent) target.textContent = source.textContent;
    return;
  }
  if (current.length !== next.length || current.some((child, index) => child.tagName !== next[index].tagName)) {
    target.replaceChildren(...[...source.childNodes].map((node) => document.importNode(node, true)));
    return;
  }
  current.forEach((child, index) => syncTree(child, next[index]));
}

function syncKeyed(target, source) {
  const existing = new Map([...target.children].map((child) => [child.getAttribute('data-key'), child]));
  for (const child of source.children) {
    const key = child.getAttribute('data-key');
    const match = existing.get(key);
    if (match) {
      syncTree(match, child);
      existing.delete(key);
    } else {
      target.appendChild(document.importNode(child, true));
    }
  }
  existing.forEach((child) => child.remove());
}

// Replace the SVG in `host` with `markup`. With `animate`, elements that share a
// data-key are updated in place so CSS transitions can move them.
export function patchSvg(host, markup, { animate = false } = {}) {
  const next = new DOMParser().parseFromString(markup, SVG_TYPE).documentElement;
  const current = host.querySelector(':scope > svg');
  const layerOf = (svg, name) => [...svg.children].find((child) => child.getAttribute('class') === name);
  const layers = [...next.children].map((layer) => layer.getAttribute('class'));
  if (!animate || !current || layers.some((name) => !layerOf(current, name))) {
    host.replaceChildren(document.importNode(next, true));
    return;
  }
  syncAttributes(current, next);
  for (const layer of [...next.children]) {
    const name = layer.getAttribute('class');
    if (name === 'layer-items') syncKeyed(layerOf(current, name), layer);
    else layerOf(current, name).replaceWith(document.importNode(layer, true));
  }
}
```

- [ ] **Step 2: Write `src/learn/view.js`**

Both `innerHTML` assignments below receive only escaped markup: `opLineMarkup` escapes the template and every value, and `varsMarkup` escapes every name and value.

```js
import { highlightCpp } from '../lib/cpp-highlight.js';
import { escapeHtml } from '../lib/html.js';
import { parseInteger, parseIntegerList } from './engine/input.js';
import { patchSvg } from './engine/morph.js';
import { createPlayer, SPEEDS } from './engine/player.js';
import { record } from './engine/recorder.js';
import { findModule, modulesFor } from './modules.js';
import { RENDERERS } from './render/index.js';

let session = null;

export function unmountLearn() {
  if (!session) return;
  session.player?.destroy();
  session.cleanup.forEach((fn) => fn());
  session = null;
}

function stageMessage(title, text) {
  return `<div class="stage-empty"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div>`;
}

function playerMarkup() {
  return `<div class="player" role="group" aria-label="Step controls">
    <button type="button" data-player="first" aria-label="First step">⏮</button>
    <button type="button" data-player="prev" aria-label="Previous step">‹</button>
    <button type="button" data-player="toggle" class="player-play" aria-label="Play">▶</button>
    <button type="button" data-player="next" aria-label="Next step">›</button>
    <button type="button" data-player="last" aria-label="Last step">⏭</button>
    <input type="range" class="player-range" min="0" max="0" value="0" aria-label="Step">
    <span class="player-count">1 / 1</span>
    <label class="player-speed">Speed <select>${SPEEDS.map((speed) => `<option value="${speed}"${speed === 1 ? ' selected' : ''}>${speed}×</option>`).join('')}</select></label>
  </div>`;
}

function opLineMarkup(op, values) {
  return escapeHtml(op.code).replace(/\{(\w+)\}/g, (_, name) => {
    const param = op.params.find((item) => item.name === name);
    const value = values[name] ?? param.default;
    return `<input class="op-arg" data-arg="${escapeHtml(name)}" inputmode="numeric" autocomplete="off" aria-label="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
  });
}

function dataStageMarkup(module) {
  const ops = Object.keys(module.ops);
  return `<header class="stage-head"><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(module.summary)}</p></header>
    <div class="op-bar" role="toolbar" aria-label="Operations">${ops.map((name, index) => `<button type="button" data-op="${escapeHtml(name)}" aria-pressed="${index === 0}">${escapeHtml(name)}</button>`).join('')}</div>
    <div class="stage-grid">
      <div class="code-panel">
        <pre class="code-block"><code><span class="code-line muted">${highlightCpp(module.declare)}</span><span class="code-line op-line" data-line="0"></span></code></pre>
        <div class="op-actions"><button type="button" class="run-button" data-action="run">Run</button><button type="button" data-action="reset">Reset</button></div>
        <p class="op-error" role="alert"></p>
        <p class="step-msg" aria-live="polite"></p>
      </div>
      <div class="viz-host"></div>
    </div>
    ${playerMarkup()}
    <p class="history"><span>history</span><code class="history-list"></code></p>`;
}

function algoStageMarkup(module) {
  const fields = module.input.fields.map((field) => {
    const value = field.kind === 'list' ? field.default.join(', ') : field.default;
    return `<label><span>${escapeHtml(field.label)}</span><input name="${escapeHtml(field.name)}" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false"></label>`;
  }).join('');
  return `<header class="stage-head"><h1>${escapeHtml(module.title)}</h1><p>${escapeHtml(module.summary)}</p></header>
    <form class="algo-input" novalidate>${fields}<button type="submit" class="run-button">Run</button><p class="op-error" role="alert"></p></form>
    <div class="stage-grid">
      <pre class="code-block algo-code"><code>${module.code.map((line, index) => `<span class="code-line" data-line="${index}"><i>${index + 1}</i>${highlightCpp(line)}</span>`).join('')}</code></pre>
      <div class="viz-host"></div>
    </div>
    <p class="step-msg" aria-live="polite"></p>
    <dl class="vars-panel"></dl>
    ${playerMarkup()}`;
}

export function learnPageMarkup(route) {
  const modules = modulesFor(route.side);
  const module = route.module ? findModule(route.side, route.module) : null;
  const groups = [...new Set(modules.map((item) => item.group))];
  const list = groups.map((group) => `<p class="module-group">${escapeHtml(group)}</p>${modules
    .filter((item) => item.group === group)
    .map((item) => `<a class="module-link${item === module ? ' active' : ''}" href="#/learn/${route.side}/${escapeHtml(item.id)}">${escapeHtml(item.title)}</a>`)
    .join('')}`).join('');
  let stage;
  if (!route.module) stage = stageMessage('Pick a module', `Choose ${route.side === 'data' ? 'a data structure' : 'an algorithm'} from the list.`);
  else if (!module) stage = stageMessage('Module not found', 'This module does not exist yet. Pick one from the list.');
  else stage = module.side === 'data' ? dataStageMarkup(module) : algoStageMarkup(module);
  return `<div class="learn-view view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo/learn/${route.side}</span><span>${escapeHtml(module ? module.id : route.side)}.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/learn">LEARN</a><span>/</span><a href="#/learn/${route.side}">${route.side.toUpperCase()}</a>${module ? `<span>/</span><strong>${escapeHtml(module.title.toUpperCase())}</strong>` : ''}</nav>
    <div class="learn-layout"><nav class="module-list" aria-label="${route.side} modules">${list}</nav><section class="module-stage">${stage}</section></div>
  </div>`;
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  return String(value);
}

function varsMarkup(vars) {
  if (!vars) return '';
  return Object.entries(vars).map(([name, value]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(formatValue(value))}</dd></div>`).join('');
}

function callLabel(template, args) {
  return template.replace(/\{(\w+)\}/g, (_, name) => String(args[name])).replace(/;$/, '');
}

function mountData(module, root, ui, load) {
  let state = module.preset();
  let opName = Object.keys(module.ops)[0];
  const values = {};
  const history = [];
  const opLine = root.querySelector('.op-line');
  const historyList = root.querySelector('.history-list');

  const showOp = () => {
    opLine.innerHTML = opLineMarkup(module.ops[opName], values);
    root.querySelectorAll('[data-op]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.op === opName)));
    ui.error.textContent = '';
  };
  const idle = (msg) => load([{ line: null, msg, state: structuredClone(state), hl: {}, vars: null }], false);

  root.querySelectorAll('[data-op]').forEach((button) => button.addEventListener('click', () => {
    opName = button.dataset.op;
    showOp();
  }));
  opLine.addEventListener('input', (event) => {
    if (!event.target.dataset.arg) return;
    values[event.target.dataset.arg] = event.target.value;
    ui.error.textContent = '';
  });
  opLine.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') root.querySelector('[data-action="run"]').click();
  });
  root.querySelector('[data-action="run"]').addEventListener('click', () => {
    const op = module.ops[opName];
    const args = {};
    for (const param of op.params) {
      const input = opLine.querySelector(`[data-arg="${param.name}"]`);
      const parsed = parseInteger(input.value, param);
      if (parsed.error) {
        ui.error.textContent = `${param.name}: ${parsed.error}`;
        input.focus();
        return;
      }
      args[param.name] = parsed.value;
    }
    const problem = op.check ? op.check(state, args) : null;
    if (problem) {
      ui.error.textContent = problem;
      return;
    }
    let frames;
    try {
      frames = record(op.run(structuredClone(state), args));
    } catch (error) {
      ui.error.textContent = error.message;
      return;
    }
    state = structuredClone(frames.at(-1).state);
    history.push(callLabel(op.code, args));
    historyList.textContent = history.join('   ');
    load(frames, true);
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    state = module.preset();
    history.length = 0;
    historyList.textContent = '';
    ui.error.textContent = '';
    idle('Reset to the preset.');
  });

  showOp();
  idle('Pick an operation, change the numbers, then press Run.');
}

function mountAlgo(module, root, ui, load) {
  const form = root.querySelector('.algo-input');
  const run = (autoplay) => {
    const input = {};
    for (const field of module.input.fields) {
      const element = form.elements.namedItem(field.name);
      const parsed = field.kind === 'list' ? parseIntegerList(element.value, field) : parseInteger(element.value, field);
      if (parsed.error) {
        ui.error.textContent = `${field.label}: ${parsed.error}`;
        element.focus();
        return;
      }
      input[field.name] = parsed.value;
    }
    ui.error.textContent = '';
    try {
      load(record(module.run(input)), autoplay);
    } catch (error) {
      ui.error.textContent = error.message;
    }
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(true);
  });
  form.addEventListener('input', () => { ui.error.textContent = ''; });
  run(false);
}

export function mountLearn(route, root) {
  unmountLearn();
  const module = route.module ? findModule(route.side, route.module) : null;
  if (!module) return;
  const current = { player: null, cleanup: [] };
  session = current;
  const render = RENDERERS[module.renderer];
  const ui = {
    viz: root.querySelector('.viz-host'),
    msg: root.querySelector('.step-msg'),
    error: root.querySelector('.op-error'),
    range: root.querySelector('.player-range'),
    count: root.querySelector('.player-count'),
    play: root.querySelector('.player-play'),
    speed: root.querySelector('.player-speed select'),
    lines: [...root.querySelectorAll('.code-line[data-line]')],
    vars: root.querySelector('.vars-panel'),
  };

  const show = ({ frame, index, total, playing, speed, animate }) => {
    ui.viz.style.setProperty('--viz-dur', `${Math.round(300 / speed)}ms`);
    patchSvg(ui.viz, render(frame.state, frame.hl), { animate });
    ui.msg.textContent = frame.msg;
    ui.range.max = String(total - 1);
    ui.range.value = String(index);
    ui.count.textContent = `${index + 1} / ${total}`;
    ui.play.textContent = playing ? '❚❚' : '▶';
    ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    ui.lines.forEach((line) => line.classList.toggle('is-current', Number(line.dataset.line) === frame.line));
    if (ui.vars) ui.vars.innerHTML = varsMarkup(frame.vars);
  };

  const load = (frames, autoplay) => {
    current.player?.destroy();
    current.player = createPlayer({ frames, onChange: show });
    current.player.setSpeed(Number(ui.speed.value));
    current.player.first();
    if (autoplay) current.player.play();
  };

  root.querySelectorAll('[data-player]').forEach((button) => button.addEventListener('click', () => current.player?.[button.dataset.player]()));
  ui.range.addEventListener('input', () => current.player?.seek(Number(ui.range.value)));
  ui.speed.addEventListener('change', () => current.player?.setSpeed(Number(ui.speed.value)));

  const onKey = (event) => {
    const tag = event.target.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if (event.key === ' ' && tag === 'BUTTON') return;
    if (!current.player) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      current.player.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      current.player.next();
    } else if (event.key === ' ') {
      event.preventDefault();
      current.player.toggle();
    }
  };
  document.addEventListener('keydown', onKey);
  current.cleanup.push(() => document.removeEventListener('keydown', onKey));

  if (module.side === 'data') mountData(module, root, ui, load);
  else mountAlgo(module, root, ui, load);
}
```

- [ ] **Step 3: Write `src/learn/learn.css`**

```css
.learn-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:24px;margin-top:20px}
.module-list{display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--line);padding-right:16px}
.module-group{font:600 10px/1 var(--mono);letter-spacing:.14em;color:var(--faint);text-transform:uppercase;margin:12px 0 4px}
.module-link{font:13px/1.2 var(--mono);color:var(--muted);text-decoration:none;padding:7px 8px;border:1px solid transparent}
.module-link:hover,.module-link.active{color:var(--cyan);border-color:var(--cyan);background:var(--cyan-soft)}
.stage-empty{border:1px dashed var(--line);padding:32px;color:var(--muted)}
.stage-empty h2{color:var(--text);margin:0 0 8px}
.stage-head h1{font:700 clamp(28px,4vw,40px)/1 var(--mono);color:var(--text);margin:0}
.stage-head p{color:var(--muted);margin:8px 0 16px}
.op-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.op-bar button,.op-actions button,.algo-input button,.player button,.player select{font:12px/1 var(--mono);color:var(--text);background:var(--panel);border:1px solid var(--line);padding:8px 12px;cursor:pointer}
.op-bar button[aria-pressed=true]{color:var(--cyan);border-color:var(--cyan);background:var(--cyan-soft)}
.op-bar button:focus-visible,.player button:focus-visible,.run-button:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.learn-view .run-button{color:var(--bg);background:var(--cyan);border-color:var(--cyan)}
.stage-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(0,1.4fr);gap:16px;align-items:start}
.code-panel{background:var(--panel);border:1px solid var(--line);padding:12px}
.code-block{margin:0;font:13px/1.7 var(--mono);overflow:auto;background:var(--panel);border:1px solid var(--line);padding:10px 0}
.code-panel .code-block{border:0;padding:0;background:transparent}
.code-line{display:block;padding:0 10px;border-left:2px solid transparent;white-space:pre}
.code-line i{display:inline-block;width:2.2em;color:var(--faint);font-style:normal;user-select:none}
.code-line.muted{color:var(--muted)}
.code-line.is-current{background:var(--cyan-soft);border-left-color:var(--cyan)}
.op-arg{width:3.6em;font:inherit;color:var(--cyan);background:var(--bg);border:1px solid var(--cyan);padding:0 4px}
.op-actions{display:flex;gap:6px;margin-top:10px}
.op-error{color:var(--red);font:12px/1.4 var(--mono);min-height:1.4em;margin:8px 0 0}
.step-msg{color:var(--text);font:14px/1.5 var(--sans);min-height:1.5em;margin:8px 0}
.viz-host{background:var(--panel);border:1px solid var(--line);padding:8px;min-height:160px;--viz-dur:300ms}
.viz{width:100%;height:auto;display:block;font-family:var(--mono)}
.viz .slot{fill:none;stroke:var(--line)}
.viz .slot.spare{stroke-dasharray:4 4}
.viz .index{fill:var(--faint);font-size:11px}
.viz .item rect{fill:var(--bg);stroke:var(--muted);stroke-width:1.5}
.viz .item text{fill:var(--text);font-size:14px}
.viz .item.is-done rect{fill:color-mix(in srgb,var(--green) 18%,var(--bg))}
.viz .item.is-moved rect{stroke:var(--green)}
.viz .item.is-compare rect{stroke:var(--amber);stroke-width:2.5}
.viz .item.is-active rect{fill:var(--cyan-soft);stroke:var(--cyan);stroke-width:2.5}
.viz .item.is-lifted rect{stroke:var(--cyan);stroke-dasharray:5 3}
.viz .pointer text{fill:var(--amber);font-size:12px}
.viz [data-key]{transition:transform var(--viz-dur) ease}
.viz [data-key] rect{transition:fill var(--viz-dur),stroke var(--viz-dur)}
.player{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:14px 0}
.player-range{flex:1;min-width:120px;accent-color:var(--cyan)}
.player-count{font:12px/1 var(--mono);color:var(--muted);min-width:5em;text-align:right}
.player-speed{font:12px/1 var(--mono);color:var(--muted);display:flex;gap:6px;align-items:center}
.history{font:12px/1.5 var(--mono);color:var(--muted)}
.history span{margin-right:8px;color:var(--faint)}
.history-list{color:var(--cyan);white-space:pre-wrap}
.algo-input{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:12px}
.algo-input label{display:flex;flex-direction:column;gap:4px;font:12px/1 var(--mono);color:var(--muted);flex:1;min-width:200px}
.algo-input input{font:14px/1 var(--mono);color:var(--text);background:var(--bg);border:1px solid var(--line);padding:9px}
.algo-input .op-error{flex-basis:100%;margin:0}
.vars-panel{display:flex;flex-wrap:wrap;gap:8px;margin:0;min-height:30px}
.vars-panel div{border:1px solid var(--line);padding:6px 10px;font:12px/1 var(--mono);display:flex;gap:8px}
.vars-panel dt{color:var(--muted)}
.vars-panel dd{margin:0;color:var(--cyan)}
@media (prefers-reduced-motion:reduce){.viz [data-key],.viz [data-key] rect{transition:none}}
@media (max-width:900px){
  .learn-layout,.stage-grid{grid-template-columns:minmax(0,1fr)}
  .module-list{flex-direction:row;flex-wrap:wrap;border-right:0;padding-right:0}
  .module-group{flex-basis:100%}
}
```

- [ ] **Step 4: Wire the view into the app**

In `index.html`, after `<link rel="stylesheet" href="./src/atlas.css" />` add:

```html
    <link rel="stylesheet" href="./src/learn/learn.css" />
```

In `src/app.js`, add after `import { escapeHtml } from './lib/html.js';`:

```js
import { modulesFor } from './learn/modules.js';
import { learnPageMarkup, mountLearn, unmountLearn } from './learn/view.js';
```

Replace the whole `learnMarkup` function with:

```js
function learnMarkup(route) {
  if (route.side) return learnPageMarkup(route);
  const sides = [
    { id: 'data', index: '01', title: 'Data', copy: 'Run STL operations and watch the real structure change.' },
    { id: 'algo', index: '02', title: 'Algo', copy: 'Step through C++ line by line with live variables.' },
  ];
  return `<div class="learn-view view-enter">
    <div class="terminal-label"><span>~/cedt/data_algo/learn</span><span>learn.exe</span></div>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/learn">LEARN</a></nav>
    <h1 class="learn-title">Learning</h1>
    <div class="learn-sides">${sides.map((side) => `<a class="learn-side" href="#/learn/${side.id}"><span>${side.index}</span><strong>${side.title}</strong><p>${side.copy}</p><small>${modulesFor(side.id).length} MODULES</small></a>`).join('')}</div>
  </div>`;
}
```

In `renderRoute`, replace

```js
  const route = pageRoute(location.hash);
  const problem = activeProblem();
  const main = document.querySelector('#main');
```

with

```js
  const route = pageRoute(location.hash);
  const problem = activeProblem();
  const main = document.querySelector('#main');
  unmountLearn();
```

and replace

```js
  bindView(problem);
  updateSidebar();
```

with

```js
  bindView(problem);
  if (route.page === 'learn' && route.side) mountLearn(route, main);
  updateSidebar();
```

- [ ] **Step 5: Automated checks**

Run: `node --check src/app.js && node --check src/learn/view.js && node --check src/learn/engine/morph.js && npm test`
Expected: no syntax errors, all tests pass.

Also confirm that every new browser file is served:

```bash
(PORT=4195 node scripts/serve.mjs > /dev/null 2>&1 &) ; sleep 1
for u in src/learn/view.js src/learn/engine/morph.js src/learn/learn.css src/learn/modules.js src/lib/html.js; do curl -s -o /dev/null -w "%{http_code} $u\n" "http://localhost:4195/$u"; done
kill $(lsof -t -i:4195)
```

Expected: `200` for each file.

- [ ] **Step 6: Commit**

```bash
git add src/learn/engine/morph.js src/learn/view.js src/learn/learn.css src/app.js index.html
git commit -m "feat: add interactive learn pages for data and algo modules"
```

- [ ] **Step 7: Manual check in a browser**

Run `npm run dev` and open `http://localhost:4173/#/learn`. Check each item:

1. The Learning home shows Data (1 module) and Algo (1 module) cards.
2. `#/learn/data` shows the module list (Sequence → vector) and "Pick a module".
3. `#/learn/data/vector`:
   - The picture shows 3 cells and 1 dashed spare slot.
   - Click `push_back`, keep `40`, and press Run. The line highlights and 40 appears in slot 3.
   - Press Run again with `50`. You see the "allocate a new buffer of 8" step, then the copy step, then capacity 8 with 5 cells.
4. `insert` with pos `1`, x `99`: the 20 and 30 cells slide right (animated) and 99 appears. History shows `v.push_back(40)   v.push_back(50)   v.insert(v.begin() + 1, 99)`.
5. Errors:
   - `erase` with pos `20` shows "Use a number from 0 to 11".
   - `at` with i `abc` shows "i: Enter a whole number".
   - Nothing runs in either case.
6. Reset returns to `{10, 20, 30}` with capacity 4 and an empty history.
7. `#/learn/algo/insertion-sort`:
   - The code shows 11 numbered lines and the bars show 5 2 4 6 1 3.
   - ▶ plays. The current line moves, the lifted bar sits above its hole, bars slide right on line 6 (`a[j + 1] = a[j]`), and the `i`/`j` pointers move. The variables panel shows n, i, key, j.
8. Player controls:
   - ‹ and › step one frame.
   - The slider seeks.
   - Speed 4× is faster.
   - `←` / `→` / `Space` work when focus is not in an input.
9. Enter `9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3` (13 numbers) and press Run. You see "a[]: Use at most 12 numbers".
10. Navigate away while it is playing. There are no console errors and no timer keeps running. Return and the page starts fresh.
11. `#/learn/data/nope` shows "Module not found".
12. At 375 px width the module list wraps above the stage and the controls wrap.
13. With reduced motion enabled in the OS or DevTools, steps change without sliding.

Fix issues in the Phase 2 files only. If you change anything, commit it as `fix: …`.

---

### Task 10: Spec update and full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md` (Build phases)

- [ ] **Step 1: Update the spec's build phases**

In the spec, replace

```markdown
2. **Engine.** Build the recorder, player, and all five renderers. Prove them with `vector` (Data)
   and `insertion sort` (Algo).
3. **Data modules.** stack, queue, pair, list, priority_queue, BST, set, map.
4. **Algo modules.** Remaining sorts, binary search, DP, BFS and DFS, Prim and Kruskal, Dijkstra
   and Bellman-Ford.
```

with

```markdown
2. **Engine.** Build the recorder, player, input parsing, keyed SVG patching, and the `array`
   renderer. Prove them with `vector` (Data) and `insertion sort` (Algo).
3. **Data modules.** stack, queue, pair, list, priority_queue, BST, set, map. The `linked` and
   `tree` renderers are built with their first module.
4. **Algo modules.** Remaining sorts, binary search, DP, BFS and DFS, Prim and Kruskal, Dijkstra
   and Bellman-Ford. The `table` and `graph` renderers are built with their first module.
```

- [ ] **Step 2: Full verification**

Run: `npm run verify`
Expected: every test passes, then `Validated 129 problem folders: …` and `Built dist/ with 129 indexed problem folders.`

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md
git commit -m "docs: build each renderer with its first module"
```

---

## Next plans

- Phase 3 (Data modules): stack, queue (circular buffer), pair, list (`linked` renderer), priority_queue, BST, set and map (`tree` renderer with red-black insert and erase and invariant tests).
- Phase 4 (Algo modules): merge sort, quick sort, binary search, permutation, DP (`table` renderer), BFS and DFS, Prim, Kruskal, Dijkstra, and Bellman-Ford (`graph` renderer).
