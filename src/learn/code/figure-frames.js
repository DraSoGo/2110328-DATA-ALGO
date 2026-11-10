// Turns any figure (op, show, or scripted frames) into one list of frames, each
// holding one or more panels { label, renderer, state, hl }. Pure, so the tests
// can render every figure without a DOM.
import { record } from '../engine/recorder.js';

function context(module, base) {
  const clone = (value) => structuredClone(value);
  const run = (name, args, state = base) => {
    const op = module.ops[name];
    const values = args || Object.fromEntries(op.params.map((param) => [param.name, param.default]));
    return record(op.run(clone(state), values));
  };
  const after = (name, args, state = base) => {
    const frames = run(name, args, state);
    return frames.length ? frames.at(-1).state : clone(state);
  };
  return { module, base, clone, run, after };
}

function panelsOf(frame, renderer) {
  const panels = frame.panels || [{ state: frame.state, hl: frame.hl }];
  return panels.map((panel) => ({ label: panel.label || '', renderer: panel.renderer || renderer, state: panel.state, hl: panel.hl || {} }));
}

export function buildFigure(module, figure) {
  let base = module.preset();
  const ctx = context(module, base);
  for (const [name, args] of figure.prep || []) base = ctx.after(name, args, base);
  ctx.base = base;
  if (figure.frames) {
    return figure.frames(ctx).map((frame) => ({ msg: frame.msg || '', panels: panelsOf(frame, module.renderer) }));
  }
  const op = figure.op ? module.ops[figure.op] : null;
  if (op) {
    const args = figure.args || Object.fromEntries(op.params.map((param) => [param.name, param.default]));
    if (!(op.check && op.check(base, args))) {
      return ctx.run(figure.op, args, base).map((frame) => ({ msg: frame.msg, panels: panelsOf(frame, module.renderer) }));
    }
  }
  const look = figure.show ? figure.show(base) : {};
  const state = { ...base, ...(look.brackets ? { brackets: look.brackets } : {}), ...(look.pointers ? { pointers: look.pointers } : {}) };
  return [{ msg: '', panels: [{ label: '', renderer: module.renderer, state, hl: look.hl || {} }] }];
}
