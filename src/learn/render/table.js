import { escapeHtml } from '../../lib/html.js';

export const CELL = 40;
export const GAP = 4;
export const PAD = 16;
export const HEAD_H = 26;
const HEAD_MIN_W = 34;
const CHAR_W = 7.4;
const CAPTION_H = 28;
const MIN_WIDTH = 240;
// A declared caption reserves room for about 42 characters of 13px mono text;
// longer captions are squeezed with textLength so they never leave the viewBox.
const CAPTION_CHAR_W = 7.9;
const CAPTION_MIN_WIDTH = Math.ceil(2 * PAD + 42 * CAPTION_CHAR_W);
const HL_CLASSES = [['active', 'is-active'], ['compare', 'is-compare'], ['done', 'is-done'], ['path', 'is-path'], ['shaded', 'is-shaded']];

// Cell position id used by hl lists, e.g. pos(2, 3) is "2-3".
export const pos = (row, col) => `${row}-${col}`;
export const cellKey = (row, col) => `c-${row}-${col}`;

export function cellClasses(row, col, hl) {
  const id = pos(row, col);
  return HL_CLASSES.filter(([name]) => (hl[name] || []).includes(id)).map(([, className]) => className);
}

function gridOf(state) {
  const cells = state.cells || [];
  if (!cells.length) return [[]];
  return Array.isArray(cells[0]) ? cells : [cells];
}

// Straight arrow between two cell centres (trimmed to the cell edges), with a small head.
function arrowMarkup(index, from, to, x, y) {
  const [fr, fc] = from.split('-').map(Number);
  const [tr, tc] = to.split('-').map(Number);
  const ax = x(fc) + CELL / 2;
  const ay = y(fr) + CELL / 2;
  const bx = x(tc) + CELL / 2;
  const by = y(tr) + CELL / 2;
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / length;
  const uy = (by - ay) / length;
  const trim = 13;
  const sx = ax + ux * trim;
  const sy = ay + uy * trim;
  const ex = bx - ux * trim;
  const ey = by - uy * trim;
  const head = 6;
  const hx = ex - ux * head;
  const hy = ey - uy * head;
  const points = `${ex.toFixed(1)},${ey.toFixed(1)} ${(hx - uy * 3.5).toFixed(1)},${(hy + ux * 3.5).toFixed(1)} ${(hx + uy * 3.5).toFixed(1)},${(hy - ux * 3.5).toFixed(1)}`;
  return `<g class="arrow" data-key="arrow-${index}" style="transform:translate(0px,0px)"><line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/><polygon points="${points}"/></g>`;
}

// state: { cells, rowHeaders?, colHeaders?, board?, caption? }
//   cells: 2D array (or a flat array for one row) of values; null = not filled yet.
//   board: every square is a real cell (chess board); none is drawn as empty.
//   caption: reserves a text line under the table.
// hl: lists of "row-col" ids: active, compare, done, path, shaded; arrows: [[from, to], ...].
export function renderTable(state, hl = {}) {
  const grid = gridOf(state);
  const rows = grid.length;
  const cols = Math.max(1, ...grid.map((row) => row.length));
  const board = Boolean(state.board);
  const rowHeaders = state.rowHeaders || null;
  const colHeaders = state.colHeaders || null;
  const headerChars = rowHeaders ? Math.max(1, ...rowHeaders.map((text) => String(text).length)) : 0;
  const leftW = rowHeaders ? Math.max(HEAD_MIN_W, Math.ceil(headerChars * CHAR_W) + 14) : 0;
  const topH = colHeaders ? HEAD_H : 0;
  const x = (col) => PAD + leftW + col * (CELL + GAP);
  const y = (row) => PAD + topH + row * (CELL + GAP);
  const tableBottom = y(rows) - GAP;
  const captionH = 'caption' in state ? CAPTION_H : 0;
  const width = Math.max(captionH ? CAPTION_MIN_WIDTH : MIN_WIDTH, x(cols) - GAP + PAD);
  const height = tableBottom + captionH + PAD;

  const slotMarkup = [];
  const itemMarkup = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = grid[r][c];
      const filled = board || (value !== null && value !== undefined);
      if (!filled) {
        slotMarkup.push(`<rect class="slot spare" x="${x(c)}" y="${y(r)}" width="${CELL}" height="${CELL}" rx="6"/>`);
        continue;
      }
      const classes = ['item', 'cell', ...(board ? [(r + c) % 2 ? 'is-dark' : 'is-light'] : []), ...cellClasses(r, c, hl)].join(' ');
      itemMarkup.push(`<g class="${classes}" data-key="${cellKey(r, c)}" style="transform:translate(${x(c)}px,${y(r)}px)"><rect width="${CELL}" height="${CELL}" rx="6"/><text x="${CELL / 2}" y="${CELL / 2 + 5}" text-anchor="middle">${escapeHtml(value ?? '')}</text></g>`);
    }
  }

  const headMarkup = [];
  if (colHeaders) {
    colHeaders.forEach((text, c) => headMarkup.push(`<text class="head col-head" x="${x(c) + CELL / 2}" y="${PAD + HEAD_H - 9}" text-anchor="middle">${escapeHtml(text)}</text>`));
  }
  if (rowHeaders) {
    rowHeaders.forEach((text, r) => headMarkup.push(`<text class="head row-head" x="${PAD + leftW - 8}" y="${y(r) + CELL / 2 + 4}" text-anchor="end">${escapeHtml(text)}</text>`));
  }
  const captionText = String(state.caption ?? '');
  const captionRoom = width - 2 * PAD;
  const squeeze = captionText.length * CAPTION_CHAR_W > captionRoom ? ` textLength="${captionRoom}" lengthAdjust="spacingAndGlyphs"` : '';
  const captionMarkup = captionH ? `<text class="caption" x="${PAD}" y="${tableBottom + 20}"${squeeze}>${escapeHtml(captionText)}</text>` : '';
  const arrowMarkups = (hl.arrows || []).map(([from, to], index) => arrowMarkup(index, from, to, x, y));

  const label = `Table of ${rows} row${rows === 1 ? '' : 's'} and ${cols} column${cols === 1 ? '' : 's'}`;
  return `<svg class="viz viz-table${board ? ' is-board' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${slotMarkup.join('')}${headMarkup.join('')}${captionMarkup}</g><g class="layer-items">${itemMarkup.join('')}${arrowMarkups.join('')}</g></svg>`;
}
