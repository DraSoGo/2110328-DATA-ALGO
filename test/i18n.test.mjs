import test from 'node:test';
import assert from 'node:assert/strict';
import { DICT, getLang, MODULE_SUMMARY_TH, moduleSummary, setLang, t } from '../src/lib/i18n.js';
import { MODULES } from '../src/learn/modules.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((name) => name !== 's').sort(); // {s} is the English plural

test('every English key has a Thai translation with the same placeholders', () => {
  for (const [key, text] of Object.entries(DICT.en)) {
    assert.ok(key in DICT.th, `th missing ${key}`);
    assert.deepEqual(placeholders(DICT.th[key]), placeholders(text), key);
  }
  for (const key of Object.keys(DICT.th)) assert.ok(key in DICT.en, `en missing ${key}`);
});

test('t fills placeholders, falls back to English, and switches language', () => {
  setLang('en');
  assert.equal(t('week.title', { n: 3 }), 'Week 3');
  assert.equal(t('no.such.key'), 'no.such.key');
  setLang('th');
  assert.equal(getLang(), 'th');
  assert.equal(t('week.title', { n: 3 }), 'สัปดาห์ที่ 3');
  setLang('xx');
  assert.equal(getLang(), 'en');
});

test('every learning module has a Thai summary', () => {
  for (const module of MODULES) assert.ok(MODULE_SUMMARY_TH[`${module.side}/${module.id}`], `${module.side}/${module.id}`);
  setLang('th');
  assert.equal(moduleSummary(MODULES[0]), MODULE_SUMMARY_TH[`${MODULES[0].side}/${MODULES[0].id}`]);
  setLang('en');
  assert.equal(moduleSummary(MODULES[0]), MODULES[0].summary);
});
