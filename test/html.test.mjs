import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/html.js';

test('escapeHtml escapes markup and quote characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(escapeHtml(42), '42');
});
