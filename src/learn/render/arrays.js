import { escapeHtml } from '../../lib/html.js';
import { CELL, GAP, GUTTER, PAD, classesFor, slotX } from './array.js';

const BAR_MAX = 100;
const BAR_MIN = 20;
const LABEL_SPACE = 20;
const POINTER_ROW = 16;
const ROW_GAP = 14;
const SPAN_LANE = 18;

// Several aligned rows of cells (for example a[] above tmp[], or sol[] above used[]).
// state: { mode: 'bars'|'cells', capacity?, range?: { low, high }, span?: { lo, hi } | null,
//          rows: [{ name, base?, cells: [{key, value} | null], pointers?: { i: 3, j: null } }] }
// hl:    { active, compare, moved, done }  index lists for row 0,
//        plus rows: [ {…lists for row 0}, {…lists for row 1}, … ] to address any row.
// Declare `span` (even as null) to reserve a lane for the bracket above row 0, and list every
// pointer name (even with a null index) so the viewBox stays fixed.
export function renderArrays(state, hl = {}) {
  const rows = state.rows || [];
  const bars = state.mode === 'bars';
  const width = state.cellWidth || CELL;
  const x = (index) => slotX(index, width);
  const slots = Math.max(1, state.capacity || 0, ...rows.map((row) => row.cells.length));
  const values = rows.flatMap((row) => row.cells.filter(Boolean).map((cell) => Number(cell.value) || 0));
  const low = state.range ? state.range.low : Math.min(0, ...values);
  const high = state.range ? Math.max(state.range.high, low + 1) : Math.max(1, ...values);
  const rowHeight = bars ? BAR_MAX : CELL;
  const heightOf = (value) => (bars ? BAR_MIN + Math.round((((Number(value) || 0) - low) / (high - low || 1)) * (BAR_MAX - BAR_MIN)) : CELL);
  const spanLane = 'span' in state ? SPAN_LANE : 0;

  let top = PAD + spanLane;
  const layout = rows.map((row) => {
    const pointerRows = Object.keys(row.pointers || {}).length;
    const entry = { row, top, baseline: top + rowHeight };
    top += rowHeight + LABEL_SPACE + pointerRows * POINTER_ROW + ROW_GAP;
    return entry;
  });
  const svgWidth = x(slots) - GAP + PAD;
  const svgHeight = Math.max(top - ROW_GAP + PAD, PAD * 2 + rowHeight);

  const slotMarkup = [];
  const itemMarkup = [];
  layout.forEach(({ row, top: rowTop, baseline }, r) => {
    const marks = r === 0 ? { ...hl, ...(hl.rows?.[0] || {}) } : hl.rows?.[r] || {};
    const base = row.base || 0;
    for (let index = 0; index < slots; index += 1) {
      slotMarkup.push(`<rect class="slot${!row.cells[index] ? ' spare' : ''}" x="${x(index)}" y="${rowTop}" width="${width}" height="${rowHeight}" rx="6"/>`);
      slotMarkup.push(`<text class="index" x="${x(index) + width / 2}" y="${baseline + 15}" text-anchor="middle">${index + base}</text>`);
    }
    slotMarkup.push(`<text class="row-label" x="${PAD / 2}" y="${rowTop + 14}">${escapeHtml(row.name || '')}</text>`);
    row.cells.forEach((cell, index) => {
      if (!cell) return;
      const h = heightOf(cell.value);
      const classes = ['item', ...classesFor(index, marks)].join(' ');
      itemMarkup.push(`<g class="${classes}" data-key="${escapeHtml(cell.key)}" style="transform:translate(${x(index)}px,${baseline - h}px)"><rect width="${width}" height="${h}" rx="6"/><text x="${width / 2}" y="${bars ? h - 8 : CELL / 2 + 5}" text-anchor="middle">${escapeHtml(cell.value)}</text></g>`);
    });
    const stack = new Map();
    Object.entries(row.pointers || {}).forEach(([name, index]) => {
      if (!Number.isInteger(index)) return;
      const level = stack.get(index) || 0;
      stack.set(index, level + 1);
      const px = index < 0 ? GUTTER / 2 : x(index) + width / 2;
      itemMarkup.push(`<g class="pointer" data-key="ptr-${r}-${escapeHtml(name)}" style="transform:translate(${px}px,${baseline + LABEL_SPACE + level * POINTER_ROW}px)"><text text-anchor="middle" y="11">↑${escapeHtml(name)}</text></g>`);
    });
  });
  if (state.span) {
    const left = x(state.span.lo);
    const right = x(state.span.hi) + width;
    const y = PAD + spanLane - 8;
    slotMarkup.push(`<path class="span" d="M${left} ${y + 5}V${y}H${right}V${y + 5}"/>`);
  }

  const label = rows.map((row) => `${row.name || 'row'}: ${row.cells.map((cell) => (cell ? cell.value : '_')).join(', ')}`).join('; ');
  return `<svg class="viz viz-arrays${bars ? ' is-bars' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup.join('')}</g><g class="layer-items">${itemMarkup.join('')}</g></svg>`;
}
