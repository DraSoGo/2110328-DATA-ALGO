import test from 'node:test';
import assert from 'node:assert/strict';
import { callLabel } from '../src/learn/view.js';

test('history label fills the arguments and drops the semicolon', () => {
  assert.equal(callLabel('v.insert(v.begin() + {pos}, {x});', { pos: 1, x: 7 }), 'v.insert(v.begin() + 1, 7)');
});

test('history label drops a trailing comment', () => {
  assert.equal(callLabel('l.push_back({x});  // insert(end(), x)', { x: 40 }), 'l.push_back(40)');
  assert.equal(callLabel('l.pop_front();  // erase(begin())', {}), 'l.pop_front()');
});
