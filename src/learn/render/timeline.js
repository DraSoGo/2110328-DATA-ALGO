import { escapeHtml } from '../../lib/html.js';
import { classesFor } from './array.js';

export const LABEL_W = 84;
export const PLOT_W = 420;
export const RIGHT_W = 60;
export const ROW_H = 30;
export const BAR_H = 20;
const PAD = 16;
const AXIS_H = 26;
const MARK_LANE = 18;

// Horizontal bars on a shared axis: activity timelines, a knapsack, operation counts.
// state: { max, rows: ['label', …], labelAt: 'in'|'end', axis?: false,
//          bars: [{ key, row, from, to, text? }], mark?: { at, text } | null }
// hl:    { active, compare, moved, done } as indexes into state.bars.
// Declare `mark` (even as null) to reserve a lane below the axis for a marker.
export function xFor(value, max) {
  return LABEL_W + (Math.max(0, value) / Math.max(max, 1)) * PLOT_W;
}

function tickStep(max) {
  if (max <= 24) return 1;
  const raw = max / 5;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= raw);
}

export function renderTimeline(state, hl = {}) {
  const max = Math.max(1, state.max || 1);
  const rows = state.rows || [];
  const bars = state.bars || [];
  const x = (value) => xFor(value, max);
  const axisY = PAD + rows.length * ROW_H;
  const markLane = 'mark' in state ? MARK_LANE : 0;
  const svgWidth = LABEL_W + PLOT_W + RIGHT_W;
  const svgHeight = axisY + AXIS_H + markLane + PAD;

  const staticMarkup = [];
  rows.forEach((label, row) => {
    const y = PAD + row * ROW_H;
    staticMarkup.push(`<line class="guide" x1="${LABEL_W}" x2="${LABEL_W + PLOT_W}" y1="${y + ROW_H}" y2="${y + ROW_H}"/>`);
    staticMarkup.push(`<text class="row-label" x="${LABEL_W - 8}" y="${y + ROW_H / 2 + 4}" text-anchor="end">${escapeHtml(label)}</text>`);
  });
  if (state.axis !== false) {
    staticMarkup.push(`<line class="axis" x1="${LABEL_W}" x2="${LABEL_W + PLOT_W}" y1="${axisY}" y2="${axisY}"/>`);
    const step = tickStep(max);
    for (let tick = 0; tick <= max; tick += step) {
      staticMarkup.push(`<line class="tick" x1="${x(tick)}" x2="${x(tick)}" y1="${axisY}" y2="${axisY + 4}"/><text class="index" x="${x(tick)}" y="${axisY + 17}" text-anchor="middle">${tick}</text>`);
    }
  }
  if (state.mark) {
    staticMarkup.push(`<line class="mark" x1="${x(state.mark.at)}" x2="${x(state.mark.at)}" y1="${PAD}" y2="${axisY}"/>`);
    staticMarkup.push(`<text class="mark-label" x="${x(state.mark.at)}" y="${axisY + AXIS_H + 12}" text-anchor="middle">${escapeHtml(state.mark.text || '')}</text>`);
  }

  const items = bars.map((bar, index) => {
    const w = Math.max(0, x(bar.to) - x(bar.from));
    const y = PAD + bar.row * ROW_H + (ROW_H - BAR_H) / 2;
    const classes = ['item', ...classesFor(index, hl)].join(' ');
    const text = bar.text === undefined || bar.text === null ? '' : `<text x="${state.labelAt === 'end' ? w + 6 : 8}" y="${BAR_H / 2 + 5}" text-anchor="start">${escapeHtml(bar.text)}</text>`;
    return `<g class="${classes}" data-key="${escapeHtml(bar.key)}" style="transform:translate(${x(bar.from)}px,${y}px)"><rect width="${w}" height="${BAR_H}" rx="4"/>${text}</g>`;
  });

  const label = `Bars: ${bars.map((bar) => `${rows[bar.row] ?? bar.row} ${bar.from} to ${bar.to}`).join('; ')}`;
  return `<svg class="viz viz-timeline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="${escapeHtml(label)}"><g class="layer-static">${staticMarkup.join('')}</g><g class="layer-items">${items.join('')}</g></svg>`;
}
