# Data Algo Atlas

Static site for the CEDT Data Structures & Algorithms course: every grader problem (statement, provided files, testcase previews) grouped by course topic, plus a Learning section with interactive visualizers.

## Folder structure

```text
problems/<NN_topic>/<code>/
  config.json      # id, name, title, tags, topic, schedule, source, testcase_truncated
  statement.pdf
  solution/        # files provided by the grader, and/or
  solution.cpp     # your solution (empty file = no solution yet); listed first when both exist
  testcase/input/NN.in, testcase/output/NN.out
scripts/grader/    # console dump script + organizer for grader downloads
data/problems.json # generated manifest
src/               # browser app
```

Topics `18_Midterm 2023` to `25_Final 2025` hold past exam problems, one folder per exam PDF. A problem that also belongs to a course topic is copied (it may appear under two topics) and keeps its grader code and `id`. Exam problems that are not on the grader have `"id": null`; the optional `source` field (for example `"Midterm 2025 #1"`, `"Grader"`) lets lint accept a null `id`.

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

## Learning section

`#/learn` holds interactive visualizers (38 modules). Data modules let you run container operations, such as `push`, `insert`, or `erase`, and watch the real structure change. Algo modules step through C++ line by line with the current line highlighted and live variables.

| Side | Groups | Modules |
|---|---|---|
| Data | Sequence, Adaptor, Tree, Hash | vector, pair, list, stack, queue, priority_queue, BST, AVL tree, set and map (red-black tree), hash table |
| Algo | Analysis, Brute force, Sort, Divide and conquer, Dynamic programming, Graph, Tree traversal, Greedy, Minimum spanning tree, Shortest path | complexity growth, permutation, N-Queen, insertion/selection/merge/quick/heap sort, binary search, max subarray, Fibonacci (memo and table), nCk, LCS, 0/1 knapsack, BFS, DFS, topological sort, connected components, tree traversals, interval scheduling, fractional knapsack, Prim, Kruskal, Dijkstra, Bellman–Ford, Floyd–Warshall |

Every module shows its Big O time and space and links the matching course slides from `slides/`. To add a module, follow `docs/learn-module-guide.md`. The contract tests in `test/learn-modules.test.mjs` check every registered module automatically.

## Course slides and exams

- `slides/data/` and `slides/algo/` hold the course slide decks. The Learning home page lists all of them.
- Past exams live in the topics `18_Midterm 2023` … `25_Final 2025`. A problem that is also a grader exercise appears in both places, and its `config.json` `source` field names the exam.

