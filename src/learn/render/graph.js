import { escapeHtml } from '../../lib/html.js';

export const GRAPH_W = 400;
export const GRAPH_H = 300;
export const PANEL_W = 260;
export const NODE_R = 18;
const MARGIN = NODE_R + 16;
const PAD = 14;
const TITLE_H = 18;
const CELL_H = 26;
const CELL_GAP = 4;
const TABLE_ROW = 22;
const PANEL_GAP = 12;
const PARALLEL_STEP = 10;

const NODE_CLASSES = [['visited', 'is-visited'], ['queued', 'is-queued'], ['compare', 'is-compare'], ['active', 'is-active'], ['done', 'is-done'], ['bad', 'is-bad']];
const EDGE_CLASSES = [['edgeRemoved', 'is-removed'], ['edgeTree', 'is-tree'], ['edgeMst', 'is-mst'], ['edgeRelaxed', 'is-relaxed'], ['edgeRejected', 'is-rejected'], ['edgeBad', 'is-bad'], ['edgeCurrent', 'is-current']];
const GROUP_COUNT = 4;

// Unique, stable data-key per edge: "e-u-v", with "-2", "-3" for repeated lines.
export function edgeKeys(edges) {
  const seen = new Map();
  return edges.map(({ u, v }) => {
    const base = `e-${u}-${v}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

const round = (value) => Math.round(value * 100) / 100;

// Scales the preset coordinates uniformly into the fixed graph area.
export function layoutNodes(nodes) {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const innerW = GRAPH_W - 2 * MARGIN;
  const innerH = GRAPH_H - 2 * MARGIN;
  const scale = Math.min(maxX > minX ? innerW / (maxX - minX) : Infinity, maxY > minY ? innerH / (maxY - minY) : Infinity, 3);
  const offsetX = MARGIN + (innerW - (maxX - minX) * scale) / 2;
  const offsetY = MARGIN + (innerH - (maxY - minY) * scale) / 2;
  return new Map(nodes.map((node) => [node.id, { x: round(offsetX + (node.x - minX) * scale), y: round(offsetY + (node.y - minY) * scale) }]));
}

const classList = (table, hl, index) => table.filter(([name]) => (hl[name] || []).includes(index)).map(([, className]) => className);

function groupClass(hl, id) {
  const index = (hl.groups || []).findIndex((group) => group.includes(id));
  return index < 0 ? [] : [`is-g${index % GROUP_COUNT}`];
}

function listRows(panel) {
  const perRow = Math.max(1, Math.floor((PANEL_W - 2 * PAD) / ((panel.cellW || 44) + CELL_GAP)));
  return { perRow, rows: Math.max(1, Math.ceil(panel.capacity / perRow)) };
}

function panelHeight(panel) {
  if (panel.kind === 'table') return TITLE_H + (panel.rows.length + 1) * TABLE_ROW + PANEL_GAP;
  return TITLE_H + listRows(panel).rows * (CELL_H + CELL_GAP) + PANEL_GAP;
}

function tableMarkup(panel, left, top) {
  const headW = Math.max(26, ...panel.rows.map((row) => String(row.head).length * 8 + 8));
  const colW = Math.max(18, Math.min(34, Math.floor((PANEL_W - 2 * PAD - headW) / panel.cols.length)));
  const marks = new Map((panel.marks || []).map(({ r, c, kind }) => [`${r}:${c}`, kind]));
  const x0 = left + headW;
  const y0 = top + TITLE_H;
  const header = panel.cols.map((col, c) => `<text class="thead" x="${x0 + c * colW + colW / 2}" y="${y0 + 15}" text-anchor="middle">${escapeHtml(col)}</text>`).join('');
  const body = panel.rows.map((row, r) => {
    const y = y0 + (r + 1) * TABLE_ROW;
    const cells = row.cells.map((value, c) => `<g class="tcell${marks.has(`${r}:${c}`) ? ` is-${marks.get(`${r}:${c}`)}` : ''}"><rect x="${x0 + c * colW}" y="${y}" width="${colW}" height="${TABLE_ROW}"/><text x="${x0 + c * colW + colW / 2}" y="${y + 15}" text-anchor="middle">${escapeHtml(value)}</text></g>`).join('');
    return `<text class="thead" x="${left + headW - 5}" y="${y + 15}" text-anchor="end">${escapeHtml(row.head)}</text>${cells}`;
  }).join('');
  return `<g class="panel panel-table"><text class="ptitle" x="${left}" y="${top + 12}">${escapeHtml(panel.title)}</text>${header}${body}</g>`;
}

function listStatic(panel, left, top) {
  const { perRow } = listRows(panel);
  const cellW = panel.cellW || 44;
  const slots = Array.from({ length: panel.capacity }, (_, i) => `<rect class="slot spare" x="${left + (i % perRow) * (cellW + CELL_GAP)}" y="${top + TITLE_H + Math.floor(i / perRow) * (CELL_H + CELL_GAP)}" width="${cellW}" height="${CELL_H}" rx="5"/>`).join('');
  return `<g class="panel panel-list"><text class="ptitle" x="${left}" y="${top + 12}">${escapeHtml(panel.title)}</text>${slots}</g>`;
}

function listItems(panel, left, top) {
  const { perRow } = listRows(panel);
  const cellW = panel.cellW || 44;
  return panel.items.slice(0, panel.capacity).map((item, i) => {
    const x = left + (i % perRow) * (cellW + CELL_GAP);
    const y = top + TITLE_H + Math.floor(i / perRow) * (CELL_H + CELL_GAP);
    return `<g class="item pitem${item.cls ? ` ${escapeHtml(item.cls)}` : ''}" data-key="p-${escapeHtml(panel.id)}-${escapeHtml(item.key)}" style="transform:translate(${x}px,${y}px)"><rect width="${cellW}" height="${CELL_H}" rx="5"/><text x="${cellW / 2}" y="${CELL_H / 2 + 4}" text-anchor="middle">${escapeHtml(item.text)}</text></g>`;
  }).join('');
}

function edgeMarkup(state, hl, pos) {
  const keys = edgeKeys(state.edges);
  const pairCount = new Map();
  const pairIndex = state.edges.map(({ u, v }) => {
    const pair = [u, v].sort().join('|');
    const index = pairCount.get(pair) || 0;
    pairCount.set(pair, index + 1);
    return { pair, index };
  });
  return state.edges.map(({ u, v, w }, i) => {
    const a = pos.get(u);
    const b = pos.get(v);
    if (!a || !b) return '';
    const total = pairCount.get(pairIndex[i].pair);
    // Offsets use a canonical direction so antiparallel edges separate.
    const flip = u > v ? -1 : 1;
    const shift = (pairIndex[i].index - (total - 1) / 2) * PARALLEL_STEP * flip;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / len, dy / len];
    const [nx, ny] = [-uy, ux];
    const start = { x: a.x + ux * NODE_R + nx * shift, y: a.y + uy * NODE_R + ny * shift };
    const end = { x: b.x - ux * NODE_R + nx * shift, y: b.y - uy * NODE_R + ny * shift };
    const classes = ['edge', ...classList(EDGE_CLASSES, hl, keys[i])].join(' ');
    let arrow = '';
    if (state.directed) {
      const [bx, by] = [end.x - ux * 10, end.y - uy * 10];
      arrow = `<polygon class="earrow" points="${round(end.x)},${round(end.y)} ${round(bx + nx * 4.5)},${round(by + ny * 4.5)} ${round(bx - nx * 4.5)},${round(by - ny * 4.5)}"/>`;
    }
    const label = state.weighted ? `<text class="wlabel" x="${round((start.x + end.x) / 2 + nx * 8)}" y="${round((start.y + end.y) / 2 + ny * 8 + 4)}" text-anchor="middle">${escapeHtml(w)}</text>` : '';
    return `<g class="${classes}" data-key="${escapeHtml(keys[i])}" style="transform:translate(0px,0px)"><line class="eline" x1="${round(start.x)}" y1="${round(start.y)}" x2="${round(end.x)}" y2="${round(end.y)}"/>${arrow}${label}</g>`;
  }).join('');
}

export function renderGraph(state, hl = {}) {
  const nodes = state.nodes || [];
  const edges = state.edges || [];
  const panels = state.panels || [];
  const pos = layoutNodes(nodes);
  const panelLeft = GRAPH_W + PAD;
  let top = PAD;
  const placed = panels.map((panel) => {
    const at = top;
    top += panelHeight(panel);
    return { panel, top: at };
  });
  const width = GRAPH_W + PANEL_W;
  const height = Math.max(GRAPH_H, top + PAD - PANEL_GAP);

  const staticMarkup = placed.map(({ panel, top: at }) => (panel.kind === 'table' ? tableMarkup(panel, panelLeft, at) : listStatic(panel, panelLeft, at))).join('');
  const nodeMarkup = nodes.map((node) => {
    const { x, y } = pos.get(node.id);
    const classes = ['gnode', ...classList(NODE_CLASSES, hl, node.id), ...groupClass(hl, node.id)].join(' ');
    const tag = (state.tags || {})[node.id];
    const tagMarkup = tag === undefined || tag === null || tag === '' ? '' : `<text class="ntag" y="${NODE_R + 14}" text-anchor="middle">${escapeHtml(tag)}</text>`;
    return `<g class="${classes}" data-key="n-${escapeHtml(node.id)}" style="transform:translate(${x}px,${y}px)"><circle r="${NODE_R}"/><text class="nid" y="5" text-anchor="middle">${escapeHtml(node.id)}</text>${tagMarkup}</g>`;
  }).join('');
  const itemMarkup = placed.filter(({ panel }) => panel.kind !== 'table').map(({ panel, top: at }) => listItems(panel, panelLeft, at)).join('');

  const label = `${state.directed ? 'Directed' : 'Undirected'} graph with ${nodes.length} nodes and ${edges.length} edges`;
  return `<svg class="viz viz-graph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${staticMarkup}</g><g class="layer-items">${edgeMarkup(state, hl, pos)}${nodeMarkup}${itemMarkup}</g></svg>`;
}
