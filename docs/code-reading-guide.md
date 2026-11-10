# Code reading pages (`#/learn/code/<id>`)

Each page shows one course header, such as `vector.h`, with every important part explained. Students solve grader problems by writing one extra method in `student.h`, using the class's protected members directly. These pages teach how the professor's header works and what you must know before writing that method.

## Files

- `src/learn/code/headers/<file>.h`: the canonical header text that the page shows.
  - Start from the copies in `problems/**/solution/` (`find problems -path '*solution*' -name vector.h`) and pick the plainest variant.
  - Remove the one problem-specific declaration (for example `void uniq();`). In its place, put the single comment line `// grader problems add one method declaration here; you write its body in student.h`.
  - Keep everything else exactly as the professor wrote it, including comments, spacing and odd naming.
  - For headers that exist only in slides (`map_avl.h`, `unordered_map.h`), transcribe the class from the slide (`pdftotext -layout slides/data/<deck>.pdf -`). Put this as the first line: `// Transcribed from the course slides <deck>.pdf`.
- `src/learn/code/<id>.js`: the annotations (format below).
- `src/learn/code/index.js`: the registry `HEADERS`, already listing every id. Do not edit it.

## Annotation module

```js
export default {
  id: 'vector',
  file: 'vector.h',
  title: 'vector.h',
  className: 'CP::vector<T>',
  module: 'data/vector',                 // the animated Learning module, or null
  source: { en: '…where this header comes from…', th: '…' },
  overview: { en: '3-5 sentences: how the data is stored and the big idea.', th: '…' },
  fields: [{ name: 'mData', type: 'T *', en: 'what it holds / when it changes', th: '…' }],
  invariants: [{ en: 'mSize <= mCap at every moment between calls', th: '…' }],
  checklist: [{ en: 'Before writing your method: …', th: '…' }],   // 4-8 practical items
  pitfalls: [{ en: 'Forgetting to update mSize after …', th: '…' }],  // 3-6 bugs students really make
  student: {                             // how a student.h method for this class looks
    en: 'one paragraph', th: '…',
    code: 'template <typename T>\nvoid CP::vector<T>::my_method(int k) {\n  // use mData, mSize, mCap directly\n}',
  },
  problems: [{ name: 'd58_q1_erase_many', en: 'what the method must do, and the key idea', th: '…' }],
  regions: [
    {
      id: 'expand',                      // unique within the file, [a-z0-9-]
      match: 'void expand(size_t capacity)', // a substring of the first line of the region
      occurrence: 1,                     // optional: the n-th line containing match
      lines: 1,                          // optional: fixed length (fields, typedefs); otherwise runs to the closing brace or ';'
      kind: 'field' | 'type' | 'ctor' | 'method' | 'operator' | 'helper' | 'iterator' | 'class',
      title: { en: 'expand(capacity)', th: '…' },
      what: { en: 'What it does and why, 2-4 sentences.', th: '…' },
      notes: [{ match: 'new T[capacity]()', en: 'what this line does', th: '…' }], // match must lie inside the region
      time: 'O(n)',                      // optional
      op: 'reserve',                     // optional: an op name in the Learning module that animates this
    },
  ],
};
```

## What to annotate

- **Every member field and typedef**, with `kind` `field` or `type`.
- **Every function**: protected helpers, constructors and destructors, the copy and assignment operators, accessors, modifiers, and operators. Annotate the iterator class and its `operator++` / `operator--` when the header has them.
- **3-6 `notes` per non-trivial function** pointing at the lines that matter, for example memory allocation, the `% mCap` wrap-around, pointer relinking, `mLess` comparisons, or parent updates.
- **Facts you check, not guess.** Read the code and state exactly what it does, including quirks. Two examples: `ensureCapacity` grows to `max(capacity, 2 * mCap)`; `pop_back` only decrements `mSize`.

## Problems and language

- **Problems:** list every grader problem in `problems/` whose `solution/` includes this header (use `grep -l`), using the folder name. Say what the student's method must do and the main idea. Read the statement PDF (`pdftotext`) if needed.
- **Language:** every `{ en, th }` pair needs real, natural text in both languages. In Thai, keep code identifiers in English, such as `mSize` and `expand()`. Be concrete and short.

## Tests

`test/learn-code.test.mjs` runs over every registered header and checks:
- every region's `match` is found;
- every note's `match` lies inside its region;
- region ids are unique;
- every text has both `en` and `th`;
- `module` exists among the Learning modules, and `op` is one of that module's ops;
- every listed problem exists in `data/problems.json`.

Run `node --test test/learn-code.test.mjs test/learn-code-regions.test.mjs`.
