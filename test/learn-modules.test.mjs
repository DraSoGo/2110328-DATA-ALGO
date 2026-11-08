import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../src/learn/engine/recorder.js';
import { fieldDefaultRaw, parseField, parseInteger } from '../src/learn/engine/input.js';
import { findModule, MODULES, modulesFor } from '../src/learn/modules.js';
import { RENDERERS } from '../src/learn/render/index.js';

// Array pointers are drawn under slot `index` (or in the gutter for -1), so they
// must name a slot the renderer draws, or they land outside the viewBox.
function assertPointersInSlots(module, frame) {
  const { state } = frame;
  const rows = module.renderer === 'arrays' ? state.rows || [] : module.renderer === 'array' ? [state] : [];
  const slots = Math.max(1, state.capacity || 0, ...rows.map((row) => (row.cells || []).length));
  for (const row of rows) {
    for (const [name, index] of Object.entries(row.pointers || {})) {
      if (!Number.isInteger(index)) continue;
      assert.ok(index >= -1 && index < slots, `${module.id} pointer ${name} = ${index} is outside the ${slots} drawn slots: "${frame.msg}"`);
    }
  }
}

// Renders a frame and checks what animation depends on. Returns the viewBox.
function assertFrameRenders(module, frame) {
  assert.ok(frame.msg, `${module.id} frame needs a message`);
  assertPointersInSlots(module, frame);
  const svg = RENDERERS[module.renderer](frame.state, frame.hl);
  assert.match(svg, /^<svg /);
  const keys = [...svg.matchAll(/data-key="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(keys).size, keys.length, `${module.id} duplicate data-key`);
  return svg.match(/viewBox="([^"]+)"/)[1];
}

test('presets are fresh objects', () => {
  for (const module of modulesFor('data')) assert.notEqual(module.preset(), module.preset());
});

test('modules have unique ids per side, known renderers, and text fields', () => {
  const seen = new Set();
  for (const module of MODULES) {
    const id = `${module.side}/${module.id}`;
    assert.equal(seen.has(id), false, id);
    seen.add(id);
    assert.match(module.id, /^[\w-]+$/);
    assert.ok(['data', 'algo'].includes(module.side), id);
    assert.ok(RENDERERS[module.renderer], `${id} renderer`);
    for (const key of ['title', 'summary', 'group']) assert.equal(typeof module[key], 'string', `${id} ${key}`);
  }
  for (const module of MODULES) assert.equal(findModule(module.side, module.id), module);
  assert.equal(findModule('algo', 'vector'), null);
  assert.equal(findModule('data', 'missing'), null);
});

test('data ops: code mentions every param, defaults are valid, default run renders', () => {
  for (const module of modulesFor('data')) {
    assert.equal(typeof module.declare, 'string');
    for (const [name, op] of Object.entries(module.ops)) {
      for (const [, placeholder] of op.code.matchAll(/\{(\w+)\}/g)) {
        assert.ok(op.params.some((param) => param.name === placeholder), `${module.id}.${name} code has {${placeholder}} without a param`);
      }
      for (const param of op.params) {
        assert.ok(op.code.includes(`{${param.name}}`), `${module.id}.${name} code lacks {${param.name}}`);
        assert.deepEqual(parseInteger(String(param.default), param), { value: param.default }, `${module.id}.${name}.${param.name}`);
      }
      const args = Object.fromEntries(op.params.map((param) => [param.name, param.default]));
      const state = module.preset();
      assert.equal(op.check?.(state, args) ?? null, null, `${module.id}.${name} defaults must be valid on the preset`);
      const frames = record(op.run(structuredClone(state), args));
      assert.ok(frames.length >= 1, `${module.id}.${name} yields frames`);
      for (const frame of frames) {
        assert.equal(frame.line, 0, `${module.id}.${name}`);
        assertFrameRenders(module, frame);
      }
    }
  }
});

test('algo modules: defaults parse, every frame points at a code line and renders', () => {
  for (const module of modulesFor('algo')) {
    assert.ok(module.code.length > 0);
    const input = {};
    for (const field of module.input.fields) {
      const parsed = parseField(field, fieldDefaultRaw(field), input);
      assert.equal(parsed.error, undefined, `${module.id}.${field.name}`);
      input[field.name] = parsed.value;
    }
    const frames = record(module.run(input));
    assert.ok(frames.length >= 1);
    const boxes = new Set();
    for (const frame of frames) {
      assert.ok(Number.isInteger(frame.line) && frame.line >= 0 && frame.line < module.code.length, `${module.id} line ${frame.line}`);
      boxes.add(assertFrameRenders(module, frame));
    }
    assert.equal(boxes.size, 1, `${module.id} viewBox must stay fixed during a run so steps animate`);
  }
});

const BIG_O = /^O\(.+\)/;

test('every module states its Big O time and space', () => {
  for (const module of modulesFor('data')) {
    assert.match(module.complexity?.space ?? '', BIG_O, `${module.id} space`);
    for (const [name, op] of Object.entries(module.ops)) assert.match(op.time ?? '', BIG_O, `${module.id}.${name} time`);
  }
  for (const module of modulesFor('algo')) {
    for (const key of ['best', 'average', 'worst']) assert.match(module.complexity?.time?.[key] ?? '', BIG_O, `${module.id} ${key} time`);
    assert.match(module.complexity?.space ?? '', BIG_O, `${module.id} space`);
  }
});
