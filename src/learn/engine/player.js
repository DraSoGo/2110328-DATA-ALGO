export const SPEEDS = [0.5, 1, 2, 4];
export const BASE_DELAY = 700;

export function createPlayer({ frames, onChange, schedule = setTimeout, cancel = clearTimeout }) {
  if (!frames.length) throw new Error('A player needs at least one frame');
  let index = 0;
  let playing = false;
  let speed = 1;
  let timer = null;
  let destroyed = false;

  const lastIndex = () => frames.length - 1;
  const emit = (animate) => !destroyed && onChange({ index, frame: frames[index], total: frames.length, playing, speed, animate });
  const stopTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const halt = () => {
    stopTimer();
    playing = false;
  };
  const scheduleNext = () => {
    timer = schedule(tick, BASE_DELAY / speed);
  };

  function tick() {
    timer = null;
    if (!playing) return;
    index = Math.min(index + 1, lastIndex());
    if (index === lastIndex()) playing = false;
    emit(true);
    if (playing) scheduleNext();
  }

  function go(target) {
    const wanted = Math.trunc(Number(target));
    if (destroyed || !Number.isFinite(wanted)) return;
    halt();
    index = Math.max(0, Math.min(lastIndex(), wanted));
    emit(false);
  }

  function next() {
    if (destroyed) return;
    halt();
    if (index < lastIndex()) {
      index += 1;
      emit(true);
    } else {
      emit(false);
    }
  }

  function play() {
    if (destroyed || playing || frames.length < 2) return;
    if (index === lastIndex()) index = 0;
    playing = true;
    emit(false);
    // onChange may have paused or destroyed the player.
    if (playing) scheduleNext();
  }

  function pause() {
    if (!playing) return;
    halt();
    emit(false);
  }

  function setSpeed(value) {
    const wanted = Number(value);
    if (destroyed || !SPEEDS.includes(wanted)) return;
    speed = wanted;
    if (playing) {
      stopTimer();
      scheduleNext();
    }
    emit(false);
  }

  return {
    get index() { return index; },
    get playing() { return playing; },
    get speed() { return speed; },
    get total() { return frames.length; },
    first: () => go(0),
    last: () => go(lastIndex()),
    prev: () => go(index - 1),
    next,
    seek: (target) => go(target),
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    setSpeed,
    destroy: () => {
      halt();
      destroyed = true;
    },
  };
}
