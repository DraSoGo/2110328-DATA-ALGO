# Writing Learning modules and renderers

This guide is the contract for everything under `src/learn/`. Read it fully before adding a module or a renderer. The design spec is `docs/superpowers/specs/2026-11-08-data-algo-atlas-design.md` (Part 2).

## How the engine works

1. A module is a plain ES module with a generator.
2. `record()` runs the generator once and stores every yielded frame as a deep copy (`structuredClone`). It stops with an error after 2,000 frames.
3. The player steps through the frames. Stepping back is free.
4. For every frame the view calls `RENDERERS[module.renderer](frame.state, frame.hl)`, which returns an SVG string. `patchSvg()` puts it on the page.
5. On a single forward step, `patchSvg()` keeps every element that has the same `data-key` and only updates its attributes. CSS transitions then animate `transform` (movement) and `fill`/`stroke` (colour). If the `viewBox` or the set of layers changes, the whole SVG is replaced without animation.

Engine files you must not edit: `src/learn/view.js`, `src/learn/engine/*`, `src/learn/learn.css`, `src/app.js`. If you need an engine change, stop and report `NEEDS_CONTEXT`.

## Frame contract

```js
{ line, msg, state, hl, vars }
```

- `line` is an index into the code that is shown:
  - Data modules have one code line per operation, so `line` is always `0`.
  - Algo modules index `code[]`, and the line must exist.
- `msg` is one short English sentence that says what happens at this step. It is never empty.
- `state` is a plain object the renderer understands. It must be cloneable: no functions, Maps, or class instances.
- `hl` holds highlight lists the renderer turns into classes: `active`, `compare`, `moved`, `done` (renderers may add their own).
- `vars` is for Algo only. It is a flat object of the C++ variables at this line, for example `{ i: 2, key: 7 }`. Values are numbers, strings, `null`, or arrays of those.

## Data module (one STL or course container)

Reference: `src/learn/data/vector.js`, `queue.js`, `stack.js`, `pair.js`.

```js
export default {
  id: 'priority-queue', side: 'data', group: 'Adaptor', title: 'priority_queue',
  summary: 'One sentence.', renderer: 'heap',
  complexity: { space: 'O(n)', note: 'optional footnote, e.g. what * means' },
  declare: 'CP::priority_queue<int> pq;  // holds 9, 5, 7',  // valid C++, shown above the op line
  preset() { return freshState; },                  // must return a NEW object every call
  ops: {
    push: {
      params: [{ name: 'x', min: -99, max: 99, default: 8 }],
      time: 'O(log n)',                             // Big O shown on the button
      code: 'pq.push({x});',                        // one line; {name} becomes a number input
      check: (state, args) => null,                 // error text, or null if the op may run
      *run(state, { x }) { yield { line: 0, msg, state, hl }; },
    },
  },
};
```

Rules:
- `run` receives a clone it may mutate. The last frame's state becomes the state for the next op. Keep any counters you need, such as `nextKey`, in the state.
- Every `{placeholder}` in `code` needs a param, and every param needs a placeholder.
- Each param default must pass its own range and `check()` against `preset()`. The contract test enforces this.
- Use `check` for anything the real C++ would make undefined behaviour (empty pop, index out of range) and for the demo size limits.
- Keys must be stable. An element keeps its `key` for its whole life, so it animates when it moves. Never reuse a key.

## Algo module (one algorithm)

Reference: `src/learn/algo/insertion-sort.js`.

```js
export default {
  id: 'merge-sort', side: 'algo', group: 'Sort', title: 'Merge sort', summary: '…', renderer: 'array',
  code: ['void merge_sort(…) {', …],   // the full C++ shown; keep it close to the course slides
  complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)', note: '…' },
  input: { fields: [ … ] },
  *run(input) { yield { line, msg, state, hl, vars }; },
};
```

Input field kinds (`src/learn/engine/input.js` parses them; the view renders them):

| kind | example | value passed to `run` |
|---|---|---|
| (none) / int | `{ name: 'k', label: 'k', min: 0, max: 9, default: 3 }` | number |
| `list` | `{ name: 'a', label: 'a[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [5, 2, 4] }` | number[] |
| `text` | `{ name: 'x', label: 'X', kind: 'text', minLength: 1, maxLength: 8, pattern: '^[A-Z]+$', patternHint: 'Use letters A–Z', uppercase: true, default: 'ABCBDAB' }` | string |
| `graph` | `{ name: 'g', label: 'Graph', kind: 'graph', weighted: true, minWeight: 0, maxWeight: 20, maxEdges: 14, presets: [{ id: 'small', name: 'Small (6 nodes)', directed: false, nodes: [{ id: 'A', x: 60, y: 60 }, …], edges: [['A', 'B', 4], …] }], default: 'small' }` | `{ directed, nodes, edges: [{u, v, w}] }` |
| `node` | `{ name: 'start', label: 'start', kind: 'node', graph: 'g', default: 'A' }` | node id string |

Rules:
- `line` must point at the C++ line that is executing. When a loop condition is checked, yield the loop line; when it fails, yield it once more with a message such as "i = 5 is not < 5: the loop ends". Finish on the closing line.
- The `viewBox` must not change during a run. The contract test enforces this. Size the picture for the whole input up front, for example the full array length or every graph node, and reserve rows for pointers.
- Limits that keep pictures readable: arrays ≤ 12 values, trees ≤ 15 nodes, graphs ≤ 8 nodes and ≤ 16 edges, tables ≤ 13×13. Use the field limits so nothing larger can reach `run`.
- Algorithms that may produce many frames must still stay under 2,000 frames for every allowed input. Test the worst case.

## Renderer contract

A renderer is `export function renderX(state, hl = {})` in `src/learn/render/<name>.js`, registered in `src/learn/render/index.js`. It returns:

```html
<svg class="viz viz-<name>" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" role="img" aria-label="…">
  <g class="layer-static">…</g>   <!-- replaced every frame: slots, labels, grid, edges that do not move -->
  <g class="layer-items">…</g>    <!-- keyed, updated in place, animated -->
</svg>
```

- Always emit both layers in this order.
- Every direct child of `layer-items` is `<g class="…" data-key="unique-per-frame" style="transform:translate(Xpx,Ypx)">…</g>`. Movement must come from that transform, not from x/y attributes on children, because only `transform` animates.
- Escape every text and attribute value with `escapeHtml` from `src/lib/html.js`.
- Use `classesFor(index, hl)` from `src/learn/render/array.js` for index-based highlights, or map ids to the same class names: `is-active`, `is-compare`, `is-moved`, `is-done`, plus your own.
- Keep the SVG layout constant for one input: derive sizes from the input, not from the current step.
- Put styles in `src/learn/render/<name>.css`. Use only these theme variables: `--text --muted --faint --bg --panel --line --cyan --cyan-soft --amber --green --red --mono --sans`. Text needs `fill`; the page sets `.viz text{stroke:none}`. The controller links the CSS file in `index.html`.
- The existing `.viz .item rect` and `.viz .pointer text` styles apply inside every renderer, so reuse the `item` and `pointer` classes where they fit.

## Tests

- Per module: `test/learn-<id>.test.mjs`.
  - Check the final result against an independent computation, such as `Array.prototype.sort`, a brute-force shortest path, or a direct DP.
  - Check the important intermediate behaviour, such as rotations, relaxations, or a wrap-around.
  - Check the edge cases and that every `check()` message appears when it should.
  - Use fixed inputs; if you need randomness, use a fixed seed.
- Per renderer: `test/learn-<name>-render.test.mjs`. Cover layout positions, keys, highlight classes, escaping, and a stable `viewBox`.
- `test/learn-modules.test.mjs` contains contract tests that run against every registered module automatically. It checks:
  - unique ids;
  - the Big O fields;
  - that defaults are valid;
  - line indexes;
  - unique keys in every frame;
  - a fixed `viewBox` for algo runs;
  - non-empty messages.
- `npm test` must pass before every commit.

## Fidelity

- The course slides are in `/home/drasogun/Downloads/drive-download-20261108T152544Z-1-001/` under `Data Structures/Slide` and `Algorithms/Slide`. Read them with `pdftotext -layout file.pdf -` or the Read tool. Follow the course's versions: `CP::` class layouts and growth rules, heap index formulas, the list sentinel node, the pseudocode names used in the slides. When the course and STL differ, say which one you show in `summary`.
- The C++ in `code` should compile in spirit: real syntax, real names.
- Messages explain the why, for example "a[3] = 9 > key 4: shift it right", not "step 3".

## Registration and groups

Add the module to `MODULES` in `src/learn/modules.js`. The order inside a group is the display order. Use these groups:

- **Data:** `Sequence` (vector, pair, list), `Adaptor` (stack, queue, priority_queue), `Tree` (BST, AVL, set, map), `Hash` (hash table).
- **Algo:** `Analysis`, `Brute force`, `Sort`, `Divide and conquer`, `Dynamic programming`, `Graph`, `Greedy`, `Minimum spanning tree`, `Shortest path`.

## Commits

One commit per module or renderer. Use a conventional message such as `feat: add merge sort learning module`, end it with a blank line, and add a `Co-Authored-By` trailer for the model you are.
