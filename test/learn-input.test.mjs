import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInteger, parseIntegerList } from '../src/learn/engine/input.js';

test('parseInteger accepts whole numbers inside the range', () => {
  assert.deepEqual(parseInteger(' 42 ', { min: 0, max: 99 }), { value: 42 });
  assert.deepEqual(parseInteger('-7', { min: -99, max: 99 }), { value: -7 });
  assert.deepEqual(parseInteger('', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('3.5', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('abc', { min: 0, max: 9 }), { error: 'Enter a whole number' });
  assert.deepEqual(parseInteger('10', { min: 0, max: 9 }), { error: 'Use a number from 0 to 9' });
});

test('parseIntegerList splits on commas or spaces and checks every number', () => {
  const rules = { min: -99, max: 99, minLength: 1, maxLength: 4 };
  assert.deepEqual(parseIntegerList('5, 2  4,-1', rules), { value: [5, 2, 4, -1] });
  assert.deepEqual(parseIntegerList('  ', rules), { error: 'Enter at least 1 number' });
  assert.deepEqual(parseIntegerList('1 2 3 4 5', rules), { error: 'Use at most 4 numbers' });
  assert.deepEqual(parseIntegerList('1, x', rules), { error: 'x: enter a whole number' });
  assert.deepEqual(parseIntegerList('1, 500', rules), { error: '500: use a number from -99 to 99' });
  assert.deepEqual(parseIntegerList('1', { min: 0, max: 9, minLength: 2, maxLength: 4 }), { error: 'Enter at least 2 numbers' });
});

test('parseInteger normalises -0', () => {
  assert.equal(Object.is(parseInteger('-0', { min: -9, max: 9 }).value, 0), true);
});

import { fieldDefaultRaw, graphEdgesText, parseField, parseGraph, parseText } from '../src/learn/engine/input.js';

const PRESET = { id: 'tri', name: 'Triangle', directed: false, nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 1, y: 0 }, { id: 'C', x: 0, y: 1 }], edges: [['A', 'B', 4], ['B', 'C', 1]] };

test('parseText trims, optionally upper-cases, and checks length and pattern', () => {
  const rules = { minLength: 1, maxLength: 5, pattern: '^[A-Z]+$', patternHint: 'Use letters A–Z', uppercase: true };
  assert.deepEqual(parseText(' abc ', rules), { value: 'ABC' });
  assert.deepEqual(parseText('', rules), { error: 'Enter at least 1 character' });
  assert.deepEqual(parseText('ABCDEF', rules), { error: 'Use at most 5 characters' });
  assert.deepEqual(parseText('A1', rules), { error: 'Use letters A–Z' });
});

test('parseGraph reads "u v w" lines against the preset nodes', () => {
  const rules = { weighted: true, minWeight: 0, maxWeight: 9, maxEdges: 3 };
  assert.equal(graphEdgesText(PRESET), 'A B 4\nB C 1');
  assert.deepEqual(parseGraph('a b 4\nB C 1', PRESET, rules).value.edges, [{ u: 'A', v: 'B', w: 4 }, { u: 'B', v: 'C', w: 1 }]);
  assert.match(parseGraph('A D 1', PRESET, rules).error, /nodes are A, B, C/);
  assert.match(parseGraph('A A 1', PRESET, rules).error, /self-loop/);
  assert.match(parseGraph('A B', PRESET, rules).error, /u v w/);
  assert.match(parseGraph('A B 10', PRESET, rules).error, /from 0 to 9/);
  assert.match(parseGraph('', PRESET, rules).error, /at least one edge/);
  assert.match(parseGraph('A B 1\nA C 1\nB C 1\nA B 2', PRESET, rules).error, /at most 3 edges/);
  assert.deepEqual(parseGraph('A B', PRESET, { weighted: false }).value.edges, [{ u: 'A', v: 'B', w: 1 }]);
  assert.equal(parseGraph('A B', PRESET, { weighted: false }).value.directed, false);
});

test('parseField dispatches on kind and checks node fields against the parsed graph', () => {
  const graph = { name: 'g', kind: 'graph', presets: [PRESET], default: 'tri', weighted: true, minWeight: 0, maxWeight: 9 };
  const start = { name: 's', kind: 'node', graph: 'g', default: 'A' };
  const parsed = {};
  parsed.g = parseField(graph, fieldDefaultRaw(graph), parsed).value;
  assert.equal(parsed.g.edges.length, 2);
  assert.deepEqual(parseField(start, 'C', parsed), { value: 'C' });
  assert.match(parseField(start, 'Z', parsed).error, /Pick a node/);
  assert.deepEqual(parseField({ name: 'n', min: 0, max: 9, default: 3 }, fieldDefaultRaw({ name: 'n', min: 0, max: 9, default: 3 }), {}), { value: 3 });
  assert.deepEqual(parseField({ name: 'a', kind: 'list', min: 0, max: 9, maxLength: 3, default: [1, 2] }, '1, 2', {}), { value: [1, 2] });
  assert.deepEqual(fieldDefaultRaw({ kind: 'list', default: [1, 2] }), '1, 2');
  assert.deepEqual(fieldDefaultRaw(graph), { preset: 'tri', text: 'A B 4\nB C 1' });
});
