// Engine fixture tests — the two bugs fixed on 2026-07-02 live here forever.
const test = require('node:test');
const assert = require('node:assert');
const { __test } = require('../server.js');
const { analyzeHeadline, detectAssets, scamScore, projectCone } = __test;

test('the word "try" does not hijack the Turkish lira', () => {
  const a = analyzeHeadline('Investors try to buy the dip as stocks rally to record high');
  assert.ok(!a.impacts.some(i => i.symbol === 'TRY'));
});

test('"lira slides" attributes the fall to TRY, not the inflation verb', () => {
  const a = analyzeHeadline('Turkish lira slides as inflation surges');
  const imp = a.impacts.find(i => i.symbol === 'TRY');
  assert.ok(imp && imp.dir === -1);
});

test('negation suppresses the crash reading', () => {
  const a = analyzeHeadline("Bitcoin won't crash this year, says analyst");
  assert.equal(a.impacts.length, 0);
});

test('rebound reads bullish', () => {
  const a = analyzeHeadline('Turkey markets rebound after politics-driven tumble');
  assert.ok(a.impacts.some(i => i.symbol === 'TRY' && i.dir === 1));
});

test('opposing rules cancel to no impact, never dir 0', () => {
  const a = analyzeHeadline('Bitcoin rallies to record high but crashes after selloff fears');
  assert.ok(a.impacts.every(i => i.dir !== 0));
});

test('uppercase ticker is detected', () => {
  assert.ok(detectAssets('BTC surges past $70k on ETF inflows').includes('BTC'));
});

test('gold safe-haven rule fires', () => {
  const a = analyzeHeadline('Gold hits record as investors seek safe haven');
  assert.ok(a.impacts.some(i => i.symbol === 'GOLD' && i.dir === 1));
});

test('geopolitics lifts gold & oil, hits risk assets', () => {
  const a = analyzeHeadline('Markets slide as war fears grow after missile strike');
  assert.ok(a.impacts.some(i => i.symbol === 'GOLD' && i.dir === 1));
  assert.ok(a.impacts.some(i => i.symbol === 'OIL' && i.dir === 1));
  assert.ok(a.impacts.some(i => i.symbol === 'BTC' && i.dir === -1));
});

test('political headlines are flagged', () => {
  assert.ok(analyzeHeadline('Trump supporter says avoid US stocks').political);
});

test('clean energy rule waters the green grove', () => {
  const a = analyzeHeadline('Senate passes clean energy climate bill');
  assert.ok(a.impacts.some(i => i.symbol === 'ICLN' && i.dir === 1));
});

test('scam lexicon flags a giveaway', () => {
  assert.ok(scamScore('Free bitcoin giveaway, connect wallet now!').score >= 40);
});

test('boring headline is not a scam', () => {
  assert.equal(scamScore('Fed holds rates steady in June meeting').score, 0);
});

test('possibility cone orders bull > base > bear', () => {
  const h = Array.from({ length: 30 }, (_, i) => ({ t: i * 86400000, price: 100 + Math.sin(i) * 5 + i * 0.3 }));
  const c = projectCone(h, 30);
  assert.ok(c.endpoints.bull > c.endpoints.base && c.endpoints.base > c.endpoints.bear);
});
