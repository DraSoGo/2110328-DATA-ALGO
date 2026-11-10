import test from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, figureFor } from '../src/learn/code/figures.js';
import { findHeader, HEADERS, loadAnnotations } from '../src/learn/code/index.js';
import { brief } from '../src/learn/code/view.js';
import { buildFigure } from '../src/learn/code/figure-frames.js';
import { internalsFor } from '../src/learn/internals.js';
import { findModule } from '../src/learn/modules.js';
import { RENDERERS } from '../src/learn/render/index.js';

test('every figure points at a real region and builds frames that render', async () => {
  for (const [headerId, figures] of Object.entries(FIGURES)) {
    const header = findHeader(headerId);
    const data = await loadAnnotations(headerId);
    const module = findModule('data', header.module);
    const memberNames = new Set();
    for (const [regionId, figure] of Object.entries(figures)) {
      assert.ok(data.regions.some((region) => region.id === regionId), `${headerId}#${regionId} region`);
      if (figure.op) {
        const op = module.ops[figure.op];
        assert.ok(op, `${headerId}#${regionId} op ${figure.op}`);
      }
      const frames = buildFigure(module, figure);
      assert.ok(frames.length >= 1 && frames.length < 400, `${headerId}#${regionId} frames`);
      if (figure.op) assert.ok(frames.length > 1 || frames[0].msg, `${headerId}#${regionId} op runs on its base`);
      for (const frame of frames) {
        assert.ok(frame.panels.length >= 1 && frame.panels.length <= 3, `${headerId}#${regionId} panels`);
        for (const panel of frame.panels) {
          assert.ok(RENDERERS[panel.renderer], `${headerId}#${regionId} renderer ${panel.renderer}`);
          const svg = RENDERERS[panel.renderer](panel.state, panel.hl);
          assert.match(svg, /^<svg /);
          const keys = [...svg.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
          assert.equal(new Set(keys).size, keys.length, `${headerId}#${regionId} duplicate keys`);
        }
        internalsFor(module).members(frame.panels[0].state).forEach((row) => memberNames.add(row.name));
      }
      for (const name of figure.members || []) assert.ok(memberNames.has(name), `${headerId}#${regionId} member ${name}`);
    }
  }
});

test('regions with an op animate and fields get at least a still picture', async () => {
  for (const header of HEADERS) {
    const data = await loadAnnotations(header.id);
    for (const region of data.regions) {
      const figure = figureFor(header.id, region);
      if (region.op || region.kind === 'field') assert.ok(figure, `${header.id}#${region.id}`);
    }
  }
});

test('brief keeps the first sentence or cuts long text', () => {
  assert.equal(brief('The first sentence is long enough. Second sentence here.'), 'The first sentence is long enough.');
  assert.equal(brief('no stop'), 'no stop');
  const thai = 'คำ '.repeat(80);
  assert.ok(brief(thai).length <= 122 && brief(thai).endsWith('…'));
});
