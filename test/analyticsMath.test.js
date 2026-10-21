const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clamp,
  logReturns,
  rollingVolatility,
  momentum,
  maxDrawdown,
  softmax
} = require('../src/lib/analyticsMath');

test('logReturns handles short and invalid series', () => {
  assert.deepEqual(logReturns([]), []);
  assert.deepEqual(logReturns([{ close: 1 }]), []);

  const result = logReturns([{ close: 10 }, { close: 0 }, { close: 12 }]);
  assert.equal(result.length, 2);
  assert.equal(result[0], null);
  assert.equal(result[1], null);
});

test('rollingVolatility handles missing and zero variance', () => {
  assert.equal(rollingVolatility([0.1], 3), null);
  const vol = rollingVolatility([0.01, 0.01, 0.01, 0.01], 3);
  assert.equal(vol, 0);
});

test('momentum and drawdown boundaries', () => {
  const series = [{ close: 100 }, { close: 80 }, { close: 90 }, { close: 120 }];
  assert.equal(momentum(series, 20), null);
  assert.ok(maxDrawdown(series, 4) <= 0);
});

test('softmax normalizes to 1 and clamp boundaries', () => {
  const probs = softmax([10, 10, 10]);
  const sum = probs.reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
});
