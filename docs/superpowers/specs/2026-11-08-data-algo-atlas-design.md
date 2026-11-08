# Data Algo Atlas — Design

Date: 2026-11-08
Status: approved in brainstorming, pending spec review

## Goal

A static website for the CEDT Data Structures & Algorithms course, built like the Com_prog
"Problem Browser" (`/media/drasogun/EBA7-F9C5/DraSoGo/CEDT/Com_prog`, live at
https://drasogo.github.io/2110104-COMP-PROG/), with two parts:

1. **Problems** — browse every downloaded grader problem: statement PDF, solution files, testcases.
2. **Learning** — interactive step-by-step visualizers:
   - **Data**: press an STL operation, edit only the number, run, and watch the real internal
     structure change (for example, `std::set` as a red-black tree).
   - **Algo**: show the full C++ code, highlight the line being executed, and show variables and a
     picture of the data at each step.

## Constraints

- Same stack as Com_prog: semantic HTML, CSS, browser ES modules, Node ≥ 20 scripts. No runtime
  framework, no npm dependencies, no backend.
- Hash routes so GitHub Pages works without rewrites. All asset paths relative, so any repo name works.
- UI and step explanations in English. C++ code and identifiers as in the course.
- Visual style matches the Com_prog dark/cyan theme (reuse its CSS tokens).

## Repository layout

Repo root is `Data_Algo/` (new git repo, `main` branch).

```text
.
├── problems/
│   └── <NN_topic>/<code>/          # moved here from the root with git mv
│       ├── config.json            # id, name, title, tags, topic, schedule, testcase_truncated
│       ├── statement.pdf
│       ├── solution/ | solution.cpp
│       └── testcase/input/NN.in, testcase/output/NN.out
├── data/problems.json             # generated manifest
├── scripts/
│   ├── grader/                    # grader_dump.js, grader_dump_day_cover.js, organize.py, problems.csv
│   ├── generate-manifest.mjs, check-project.mjs, build.mjs, serve.mjs
│   └── lib/manifest.mjs
├── src/
│   ├── app.js, styles.css
│   ├── lib/                       # content, cpp-highlight, testcase-viewer, ui (ported from Com_prog)
│   └── learn/
│       ├── engine/                # recorder.js, player.js
│       ├── render/                # array.js, linked.js, tree.js, table.js, graph.js
│       ├── data/                  # one file per Data module
│       └── algo/                  # one file per Algo module
├── test/
├── index.html
├── .github/workflows/pages.yml
└── docs/
```

The topic folders `01_STL Usage` … `17_ซ้อม Final` and `99_Other` move into `problems/` unchanged.
`_tools/` moves to `scripts/grader/`. Scratch files `input.txt`, `output.txt`, `sys.txt`, and `dist/`
are git-ignored.

npm scripts (same names as Com_prog): `dev`, `index`, `test`, `lint`, `build`, `verify`.

## Part 1 — Problems

### Manifest

`npm run index` walks `problems/*/*/config.json` and writes `data/problems.json`. Each entry holds:
`id` (`<topicDir>/<name>`, unique even when a problem sits in two topics), `graderId, name, title,
tags, topic, topicDir, topicOrder, schedule[]` (only the entries for this topic), `statement` (path or
null), `solution` (list of `{name, path}` displayable files, empty when there is no real solution),
`testcases[]` (pairs of input/output `{path, size, truncated}`).

- `topicOrder` comes from the `NN_` folder prefix. `99_Other` sorts last and is shown as "Other".
- Displayable solution files are `.cpp`, `.h`, `.hpp`. Other files (`.cbp`, `.layout`) are ignored.
  An empty `solution.cpp` counts as "no solution".
- A problem listed under two topics (for example `da66_f1_map_walk`) appears in both.

### Navigation

- Top bar: course title, search (code, title, topic), counters (problems, PDFs, solutions), and a
  `Problems | Learning` switch.
- Sidebar:
  - `★ This week`: links to `#/week`, a page of problems whose CSV date falls in the current
    Monday–Sunday week, grouped by date. If none match, it shows the next upcoming date ("Next up"),
    or the latest date when the course is over ("Latest").
  - One group per topic in CSV order, then Other.
  - Inside a topic, problems are split into `บ่าย` (afternoon) and `การบ้าน` (homework) using
    `schedule[].session`. Problems with no session go under `บ่าย`.
- Overview page: hero, counters, topics list, as in Com_prog.

### Problem page

Route `#/p/<topicDir>/<name>` (URL-encoded). Three tabs:

- **Statement**: embedded PDF with an "open in new tab" link.
- **Solution**: one sub-tab per displayable file with C++ highlighting and a copy button. Shows
  "No solution yet" when the list is empty.
- **Testcases**: Com_prog's testcase viewer (paired input/output, copy, raw link). Files marked as
  truncated show a badge "PREVIEW · FIRST 2 KB". `config.json` does not keep the original sizes,
  so the badge does not show them.

## Part 2 — Learning

Routes: `#/learn` (choose Data or Algo), `#/learn/data/<module>`, `#/learn/algo/<module>`.
A left list shows the modules of the current side.

### Data module page

1. A row of operation buttons for that container, for example `insert erase find lower_bound clear`.
2. Clicking a button shows that call as one line of code, such as `s.insert(▢);`. Only the number
   fields are editable. The line is not free-form code.
3. **Run** records the operation and plays it. The step message explains each step.
4. State persists across operations. A history strip lists the operations run so far. **Reset**
   returns to the module's preset (for example `{10, 20, 30}`).

### Algo module page

- Left: the full C++ source of the algorithm. The current line is highlighted.
- Right: the picture (bars, DP table, graph, recursion tree).
- Bottom: a variables panel, for example `i = 3`, `key = 7`, `dist[] = [0, 4, ∞, …]`.
- Input editing is numbers only. Arrays are a comma-separated list, plus fields such as `n`, `k`,
  and `target`. Graphs are chosen from presets, then edge weights and the start node can be edited
  in a small form.

### Engine (record, then replay)

Each module is one ES module that exports:

```js
// Data module (see src/learn/data/vector.js)
export default {
  id: 'set', side: 'data', group: 'Associative', title: 'set', summary: '…', renderer: 'tree',
  declare: 'set<int> s = {10, 20, 30};',          // shown above the op line
  complexity: { space: 'O(n)', note: 'optional footnote' },
  preset: () => initialState,                       // must return a fresh object
  ops: {
    insert: {
      params: [{ name: 'x', min: -99, max: 99, default: 25 }],
      time: 'O(log n)',                             // Big O shown on the op button
      code: 's.insert({x});',                       // one line; {name} becomes a number input
      check: (state, args) => null,                 // error text, or null when the op may run
      *run(state, { x }) { yield { line: 0, msg, state, hl }; },
    },
  },
};

// Algo module (see src/learn/algo/insertion-sort.js)
export default {
  id: 'insertion-sort', side: 'algo', group: 'Sort', title: 'Insertion sort', summary: '…', renderer: 'array',
  code: ['void insertion_sort(vector<int>& a) {', …],   // full source; frame.line indexes it
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)', note: 'optional footnote' },
  input: { fields: [{ name: 'a', label: 'a[]', kind: 'list', min: -99, max: 99, minLength: 1, maxLength: 12, default: [5, 2, 4] }] },
  *run(input) { yield { line, msg, state, hl, vars }; },
};
```

- Generators `yield { line, msg, state, hl, vars }`. `line` is an index into the displayed code.
  `hl` lists the highlighted elements (node ids, array indexes, edges, table cells). `vars` is used
  by Algo only.
- `recorder.js` runs the generator to the end and stores every yielded frame with a deep-copied
  `state`. Stop after 2,000 frames and show "Too many steps — use a smaller input".
- `player.js` is shared by every module. It has first, previous, play/pause, next, last, a frame
  slider, and speed control (0.5×, 1×, 2×, 4×). Stepping back is instant because all frames are
  stored. Keys: `←` / `→` step, `Space` play or pause.
- Renderers draw SVG from `(state, hl)`:
  - `array`: cells with index labels and pointers (`i`, `j`, `f`, `top`). Used by vector, stack,
    queue (circular buffer), sorts, and binary search.
  - `linked`: nodes with next and prev arrows, plus iterator markers.
  - `tree`: a binary tree laid out by inorder x and depth y. Node color shows red-black color.
    Rotations animate between frames.
  - `table`: a 1D or 2D grid with highlighted cells and dependency arrows. Used by DP.
  - `graph`: nodes at preset coordinates, weighted edges, and node and edge states (visited, in
    queue, in MST, relaxed).
- Animation: when moving forward one frame, elements with the same id tween position and color
  (CSS transitions on SVG attributes, 300 ms ÷ speed). Jumps and backward steps redraw without
  tweening. `prefers-reduced-motion` turns off tweening.

### Input validation and limits

- Number fields accept integers in the module's range. Invalid input shows an inline error and does
  not run.
- Size limits keep pictures readable. Arrays have at most 12 elements. Trees, lists, and heaps have
  at most 15 nodes. Graph presets have at most 8 nodes. Ops that would exceed a limit show an error.

### Module catalog

**Data (9)**

| Module | Ops | Picture |
|---|---|---|
| vector | push_back, pop_back, insert(pos, x), erase(pos), at/[] | array with size and capacity, reallocation ×2 shown |
| pair | make_pair, compare (<), sort vector<pair> | pair boxes, comparison of first then second |
| stack | push, pop, top | vertical array |
| queue | push, pop, front, back | circular buffer with front, size, cap |
| priority_queue | push, pop, top | heap as tree + array side by side, sift up and down |
| list | push_front, push_back, insert(it, x), erase(it), splice | linked nodes with prev and next, iterator marker |
| set | insert, erase, find, lower_bound | red-black tree with recolor and rotation steps |
| map | m[k] = v, insert, erase, find | same red-black tree, nodes show key:value |
| BST | insert, erase (leaf / one child / two children), find, inorder | plain binary search tree |

**Algo (14)**

| Group | Modules | Picture |
|---|---|---|
| Brute force | permutation (backtracking) | recursion tree + current array |
| Sort | insertion sort, merge sort, quick sort | bars |
| D&C | binary search (merge sort is shared with Sort) | array with lo, mid, hi |
| DP | fibonacci (memo vs table), nCk, LCS | table |
| Graph | BFS, DFS | graph + queue or stack |
| MST | Prim, Kruskal (with union-find) | graph + PQ or DSU |
| Shortest path | Dijkstra, Bellman-Ford | graph + dist[] |

## Build phases

1. **Base site.** Port the Problem Browser, move the topic folders into `problems/`, build the
   manifest, the three problem tabs, This week, and the Pages workflow. Add `.gitignore`.
2. **Engine.** Build the recorder, player, input parsing, keyed SVG patching, and the `array`
   renderer. Prove them with `vector` (Data) and `insertion sort` (Algo).
3. **Data modules.** stack, queue, pair, list, priority_queue, BST, set, map. The `linked` and
   `tree` renderers are built with their first module.
4. **Algo modules.** Remaining sorts, binary search, DP, BFS and DFS, Prim and Kruskal, Dijkstra
   and Bellman-Ford. The `table` and `graph` renderers are built with their first module.

Each phase ends with `npm run verify` passing and a manual check in the browser.

## Testing

`node --test`, no dependencies:

- Manifest: topic order, the duplicate topic case, empty `solution.cpp` counts as no solution,
  file filtering, and truncated flags.
- Every module:
  - The final state is correct (set inorder is sorted and unique, the heap property holds, sorts
    give sorted output, BFS order and Dijkstra and Bellman-Ford distances match hand-computed
    values for each preset, MST weight is minimal).
  - Every frame's `line` is a valid index into the displayed code.
  - Every frame's `state` is a deep copy, so later frames do not change earlier ones.
- Red-black tree: after every insert and erase on random sequences (fixed seed), the tree keeps
  its rules. The root is black, no red node has a red child, every root-to-leaf path has the same
  black-height, and inorder is sorted.
- Recorder: the frame cap triggers at 2,000.
- `npm run lint`: every problem has a valid `config.json` and the files it references exist.

## Out of scope (v1)

- Editing the code beyond number fields, and free-form C++.
- Drawing graphs on a canvas.
- AVL trees, hash tables, and other structures not in the course CSV.
- Fetching full testcases. The grader only exposes the first 2 KB to students.
