import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_DELAY, createPlayer, SPEEDS } from '../src/learn/engine/player.js';

function fakeClock() {
  let pending = null;
  let nextId = 0;
  return {
    schedule(fn, ms) { nextId += 1; pending = { fn, ms, id: nextId }; return nextId; },
    cancel(id) { if (pending && pending.id === id) pending = null; },
    get pending() { return pending; },
    fire() { const job = pending; pending = null; job.fn(); },
  };
}

function setup(count) {
  const clock = fakeClock();
  const events = [];
  const frames = Array.from({ length: count }, (_, i) => ({ line: i, msg: `f${i}`, state: {}, hl: {}, vars: null }));
  const player = createPlayer({ frames, onChange: (event) => events.push(event), schedule: clock.schedule, cancel: clock.cancel });
  return { clock, events, player };
}

test('stepping clamps at both ends and only animates forward single steps', () => {
  const { events, player } = setup(3);
  player.first();
  player.prev();
  player.next();
  player.next();
  player.next();
  player.last();
  player.seek(-5);
  player.seek(99);
  assert.deepEqual(events.map((e) => [e.index, e.animate]), [[0, false], [0, false], [1, true], [2, true], [2, false], [2, false], [0, false], [2, false]]);
  assert.equal(events[0].total, 3);
  assert.equal(events[0].frame.msg, 'f0');
});

test('play advances on the timer and stops on the last frame', () => {
  const { clock, events, player } = setup(3);
  player.first();
  player.play();
  assert.equal(player.playing, true);
  assert.equal(clock.pending.ms, BASE_DELAY);
  clock.fire();
  clock.fire();
  assert.equal(player.index, 2);
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  assert.deepEqual(events.slice(-2).map((e) => [e.index, e.playing, e.animate]), [[1, true, true], [2, false, true]]);
});

test('play from the last frame restarts, pause cancels the timer', () => {
  const { clock, player } = setup(3);
  player.last();
  player.play();
  assert.equal(player.index, 0);
  player.pause();
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  player.toggle();
  assert.equal(player.playing, true);
  player.toggle();
  assert.equal(player.playing, false);
});

test('setSpeed accepts listed speeds only and reschedules while playing', () => {
  const { clock, player } = setup(4);
  assert.deepEqual(SPEEDS, [0.5, 1, 2, 4]);
  player.first();
  player.play();
  player.setSpeed(4);
  assert.equal(player.speed, 4);
  assert.equal(clock.pending.ms, BASE_DELAY / 4);
  player.setSpeed(3);
  assert.equal(player.speed, 4);
  player.destroy();
  assert.equal(clock.pending, null);
  assert.equal(player.playing, false);
});

test('a single frame never plays, and an empty frame list is rejected', () => {
  const { clock, player } = setup(1);
  player.first();
  player.play();
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
  assert.throws(() => createPlayer({ frames: [], onChange() {} }), /at least one frame/);
});

test('setSpeed and seek accept numeric strings and ignore junk', () => {
  const { player } = setup(4);
  player.first();
  player.setSpeed('2');
  assert.equal(player.speed, 2);
  player.seek('3');
  assert.equal(player.index, 3);
  player.seek('abc');
  player.seek(NaN);
  assert.equal(player.index, 3);
  player.seek(1.7);
  assert.equal(player.index, 1);
});

test('destroy makes the player inert', () => {
  const { clock, events, player } = setup(3);
  player.first();
  player.play();
  player.destroy();
  const count = events.length;
  player.next();
  player.play();
  player.seek(2);
  player.setSpeed(2);
  assert.equal(events.length, count);
  assert.equal(clock.pending, null);
});

test('pausing from inside onChange during play does not leave a timer behind', () => {
  const clock = fakeClock();
  const frames = Array.from({ length: 3 }, () => ({ line: 0, msg: '', state: {}, hl: {}, vars: null }));
  let player;
  player = createPlayer({ frames, onChange: (event) => { if (event.playing) player.pause(); }, schedule: clock.schedule, cancel: clock.cancel });
  player.play();
  assert.equal(player.playing, false);
  assert.equal(clock.pending, null);
});
