// Decides whether a solution file is still the grader's untouched starter code.
//
// A problem folder can have a solution/ that only holds the files the grader
// hands out (main.cpp, the class header and a student.h whose function body is
// a placeholder). Those files exist, but the problem is not solved yet. The
// starter marks the spot to fill in with a comment such as "// Your code here";
// a function body that holds such a comment and nothing beyond a dummy return
// is a stub.
//
// Rules, applied only inside the { } block that encloses a placeholder comment
// (a placeholder at file level, e.g. "you have to write something below this
// line", is ignored: the code after it is the answer):
//   * the body is empty once comments are removed;
//   * the body is one dummy statement: `return;`, `return 0;`, `return false;`,
//     `return end();`, `return T();`, `return *this;`, `return mData[i];`,
//     `throw ...;`, or `Type result; return result;`;
//   * the block still holds the starter's "example code".
// In a file that has a placeholder, a non-void function with an empty body
// (a helper the starter declared for you, e.g. `size_t leaves_count(node *n) {}`)
// is a stub too.

export const PLACEHOLDER_PATTERNS = [
  /your code here/i,
  /write your code/i,
  /add your code/i,
  /insert your code/i,
  /put your code/i,
  /write something below/i,
  /\btodo\b/i,
  /เขียนโค้ด(?:ตรง|ที่)นี่/,
  /ใส่โค้ด/,
];

const EXAMPLE_CODE = /example code/i;

const TRIVIAL_EXPRESSION = new RegExp(
  '^(?:'
  + [
    '',                                       // return;
    '-?\\d+(?:\\.\\d+)?[uUlLfF]*',            // 0, -1, 0.0
    'true|false|nullptr|NULL',
    '\\*this',
    '\\{\\s*\\}',                             // {}
    '(?:begin|end)\\(\\s*\\)',
    '[A-Za-z_][\\w:]*(?:<[^;]*>)?\\(\\s*\\)', // T(), CP::pair<T1, T2>()
    'm[A-Z]\\w*(?:\\[[^\\]]*\\])?',           // mSize, mData[0], mData[mFront]
  ].join('|')
  + ')$',
);

function isPlaceholder(text) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

// Comments with their offsets, skipping string and character literals.
function findComments(source) {
  const comments = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '"' || c === "'") {
      i++;
      while (i < source.length && source[i] !== c && source[i] !== '\n') i += source[i] === '\\' ? 2 : 1;
      i++;
    } else if (c === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      comments.push({ start: i, end: stop, text: source.slice(i, stop) });
      i = stop;
    } else if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      comments.push({ start: i, end: stop, text: source.slice(i, stop) });
      i = stop;
    } else {
      i++;
    }
  }
  return comments;
}

// Same length as the source, comments replaced by spaces, so offsets still line up.
function blankComments(source, comments) {
  let out = '';
  let last = 0;
  for (const comment of comments) {
    out += source.slice(last, comment.start) + source.slice(comment.start, comment.end).replace(/[^\n]/g, ' ');
    last = comment.end;
  }
  return out + source.slice(last);
}

function enclosingBlock(code, offset) {
  let depth = 0;
  let open = -1;
  for (let k = offset - 1; k >= 0; k--) {
    if (code[k] === '}') depth++;
    else if (code[k] === '{') {
      if (depth === 0) { open = k; break; }
      depth--;
    }
  }
  if (open < 0) return null;
  depth = 0;
  for (let k = open; k < code.length; k++) {
    if (code[k] === '{') depth++;
    else if (code[k] === '}' && --depth === 0) return { open, close: k };
  }
  return { open, close: code.length };
}

function isDummyBody(body) {
  const text = body.replace(/\s+/g, ' ').trim();
  if (!text) return true;
  const single = text.match(/^(return|throw)\b\s*([^;]*);$/);
  if (single) return single[1] === 'throw' || TRIVIAL_EXPRESSION.test(single[2].trim());
  // `CP::map_bst<K, V, C> result; return result;`
  return /^[\w:<>,\s*&]+?\s+(\w+)\s*(?:\{\s*\}|\(\s*\))?;\s*return\s+\1\s*;$/.test(text);
}

const NOT_A_FUNCTION = /^(?:if|else|for|while|switch|catch|do|return)\b/;

// A non-void function whose body is empty, e.g. `size_t CP::x<T>::f(node *n) {}`.
function hasEmptyValueFunction(code) {
  for (const match of code.matchAll(/\{\s*\}/g)) {
    const before = code.slice(0, match.index);
    const start = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}')) + 1;
    let signature = before.slice(start).trim().replace(/^(?:public|protected|private)\s*:\s*/, '');
    signature = signature.replace(/^template\s*<[^()]*?>\s*/, '').replace(/\s*(?:const|override|noexcept)\s*$/, '');
    if (!signature.endsWith(')') || NOT_A_FUNCTION.test(signature) || /[\]=]/.test(signature)) continue;
    const paren = signature.indexOf('(');
    if (paren <= 0 || /\)\s*:/.test(signature)) continue; // constructor initializer list
    const head = signature.slice(0, paren).trim();
    const words = head.replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>/g, '<>').split(/\s+/).filter(Boolean);
    if (words.length < 2) continue;                       // constructor, destructor or macro
    if (words.includes('void')) continue;
    return true;
  }
  return false;
}

export function isStubSource(source) {
  const comments = findComments(source);
  const placeholders = comments.filter((comment) => isPlaceholder(comment.text));
  if (!placeholders.length) return false;
  const code = blankComments(source, comments);
  for (const comment of placeholders) {
    const block = enclosingBlock(code, comment.start);
    if (!block) continue; // file level: the answer follows it
    if (isDummyBody(code.slice(block.open + 1, block.close))) return true;
    if (EXAMPLE_CODE.test(source.slice(block.open, block.close))) return true;
  }
  return hasEmptyValueFunction(code);
}
