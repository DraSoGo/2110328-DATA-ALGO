export const FRAME_LIMIT = 2000;

export class TooManyStepsError extends Error {
  constructor(limit) {
    super(`Too many steps (over ${limit}). Use a smaller input.`);
    this.name = 'TooManyStepsError';
  }
}

export function record(steps, limit = FRAME_LIMIT) {
  const frames = [];
  for (const step of steps) {
    if (frames.length === limit) throw new TooManyStepsError(limit);
    frames.push({
      line: step.line ?? null,
      msg: step.msg ?? '',
      state: structuredClone(step.state),
      hl: structuredClone(step.hl ?? {}),
      vars: step.vars === undefined ? null : structuredClone(step.vars),
    });
  }
  return frames;
}
