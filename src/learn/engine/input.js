import { plural, t } from '../../lib/i18n.js';

export function parseInteger(text, { min, max }) {
  const trimmed = String(text ?? '').trim();
  if (!/^-?\d+$/.test(trimmed)) return { error: t('in.whole') };
  const value = Number(trimmed) + 0;
  if (value < min || value > max) return { error: t('in.range', { min, max }) };
  return { value };
}

export function parseIntegerList(text, { min, max, minLength = 1, maxLength }) {
  const parts = String(text ?? '').split(/[\s,]+/).filter(Boolean);
  if (parts.length < minLength) return { error: t('in.atLeastNumbers', { count: minLength, s: plural(minLength) }) };
  if (parts.length > maxLength) return { error: t('in.atMostNumbers', { count: maxLength }) };
  const value = [];
  for (const part of parts) {
    const parsed = parseInteger(part, { min, max });
    if (parsed.error) return { error: `${part}: ${parsed.error.charAt(0).toLowerCase()}${parsed.error.slice(1)}` };
    value.push(parsed.value);
  }
  return { value };
}

const lowerFirst = (text) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

export function parseText(text, { minLength = 1, maxLength = 20, pattern, patternHint = 'Use only the allowed characters', uppercase = false }) {
  let value = String(text ?? '').trim();
  if (uppercase) value = value.toUpperCase();
  if (value.length < minLength) return { error: t('in.atLeastChars', { count: minLength, s: plural(minLength) }) };
  if (value.length > maxLength) return { error: t('in.atMostChars', { count: maxLength }) };
  if (pattern && !new RegExp(pattern).test(value)) return { error: patternHint };
  return { value };
}

export function graphEdgesText(preset) {
  return preset.edges.map(([u, v, w]) => (w === undefined ? `${u} ${v}` : `${u} ${v} ${w}`)).join('\n');
}

// Parses one edge per line ("u v w", or "u v" when unweighted) against the
// preset's fixed node set. Node coordinates always come from the preset.
export function parseGraph(text, preset, { weighted = true, minWeight = -99, maxWeight = 99, maxEdges = 16 } = {}) {
  const ids = preset.nodes.map((node) => node.id);
  const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { error: t('in.edgeNone') };
  if (lines.length > maxEdges) return { error: t('in.edgeMax', { count: maxEdges }) };
  const edges = [];
  for (const line of lines) {
    const parts = line.split(/[\s,]+/);
    if (parts.length !== (weighted ? 3 : 2)) return { error: t('in.edgeShape', { line, shape: weighted ? 'u v w' : 'u v' }) };
    const [u, v] = [parts[0].toUpperCase(), parts[1].toUpperCase()];
    if (!ids.includes(u) || !ids.includes(v)) return { error: t('in.edgeNodes', { line, nodes: ids.join(', ') }) };
    if (u === v) return { error: t('in.edgeLoop', { line }) };
    let w = 1;
    if (weighted) {
      const parsed = parseInteger(parts[2], { min: minWeight, max: maxWeight });
      if (parsed.error) return { error: `"${line}": ${lowerFirst(parsed.error)}` };
      w = parsed.value;
    }
    edges.push({ u, v, w });
  }
  return { value: { directed: Boolean(preset.directed), nodes: structuredClone(preset.nodes), edges } };
}

// The raw form value a field starts with: a string, or {preset, text} for graphs.
export function fieldDefaultRaw(field) {
  if (field.kind === 'list') return field.default.join(', ');
  if (field.kind === 'graph') {
    const preset = field.presets.find((item) => item.id === field.default);
    return { preset: preset.id, text: graphEdgesText(preset) };
  }
  return String(field.default);
}

// Parses one algo input field. `parsed` holds the fields parsed before it, so a
// node field can check its graph.
export function parseField(field, raw, parsed) {
  switch (field.kind) {
    case 'list': return parseIntegerList(raw, field);
    case 'text': return parseText(raw, field);
    case 'graph': {
      const preset = field.presets.find((item) => item.id === raw.preset);
      if (!preset) return { error: t('in.pickPreset') };
      return parseGraph(raw.text, preset, field);
    }
    case 'node': {
      const graph = parsed[field.graph];
      const id = String(raw ?? '').trim().toUpperCase();
      return graph && graph.nodes.some((node) => node.id === id) ? { value: id } : { error: t('in.pickNode') };
    }
    default: return parseInteger(raw, field);
  }
}
