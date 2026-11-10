// Finds where an annotation lives in a header without hard-coded line numbers:
// the first line containing `match` (or the n-th with `occurrence`), extended to
// the brace that closes it. Braces inside strings, chars and comments are ignored.

function braceDelta(line, state) {
  let delta = 0;
  let opened = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (state.block) {
      if (char === '*' && next === '/') { state.block = false; i += 1; }
      continue;
    }
    if (char === '/' && next === '/') break;
    if (char === '/' && next === '*') { state.block = true; i += 1; continue; }
    if (char === '"' || char === "'") {
      for (i += 1; i < line.length && line[i] !== char; i += 1) if (line[i] === '\\') i += 1;
      continue;
    }
    if (char === '{') { delta += 1; opened = true; }
    if (char === '}') delta -= 1;
  }
  return { delta, opened };
}

export function findRegion(source, { match, occurrence = 1, lines }) {
  const all = source.split('\n');
  let seen = 0;
  const start = all.findIndex((line) => line.includes(match) && ++seen === occurrence);
  if (start === -1) return null;
  if (lines) return { start, end: Math.min(all.length - 1, start + lines - 1) };
  const state = { block: false };
  let depth = 0;
  let begun = false;
  for (let i = start; i < all.length; i += 1) {
    const { delta, opened } = braceDelta(all[i], state);
    depth += delta;
    if (opened) begun = true;
    if (begun && depth <= 0) return { start, end: i };
    // A declaration or field ends at ';' before any '{' appears.
    if (!begun && /;\s*(\/\/.*)?$/.test(all[i])) return { start, end: i };
  }
  return { start, end: start };
}

function findLine(source, range, match) {
  const all = source.split('\n');
  for (let i = range.start; i <= range.end; i += 1) if (all[i].includes(match)) return i;
  return null;
}

export function findRegions(source, annotations) {
  const out = {};
  for (const item of annotations) {
    const range = findRegion(source, item);
    out[item.id] = { range, noteLines: (item.notes || []).map((note) => (range && note.match ? findLine(source, range, note.match) : null)) };
  }
  return out;
}
