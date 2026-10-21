const test = require('node:test');
const assert = require('node:assert/strict');

const {
  state,
  ensureInitialized,
  runIngestion,
  listAnalogs,
  getAssetSnapshot
} = require('../src/services/pipelineService');

test('ingestion is idempotent on repeated runs', async () => {
  ensureInitialized();

  const first = await runIngestion('test_first');
  const docsAfterFirst = state.rawDocuments.length;
  const eventsAfterFirst = state.marketEvents.length;

  const second = await runIngestion('test_second');
  const docsAfterSecond = state.rawDocuments.length;
  const eventsAfterSecond = state.marketEvents.length;

  assert.ok(first.processed > 0);
  assert.ok(second.deduplicated > 0);
  assert.equal(docsAfterSecond, docsAfterFirst);
  assert.equal(eventsAfterSecond, eventsAfterFirst);
});

test('analogs are bounded and deterministic order', () => {
  const analogs = listAnalogs({ symbol: 'MOEX', limit: 10 });
  if (!analogs.length) return;

  analogs.forEach((item) => {
    assert.ok(item.score >= 0 && item.score <= 1);
    assert.ok(item.normalizedScore >= 0 && item.normalizedScore <= 1);
  });

  for (let i = 1; i < analogs.length; i += 1) {
    assert.ok(analogs[i - 1].score >= analogs[i].score || analogs[i - 1].id <= analogs[i].id);
  }
});

test('scenario probabilities sum to ~100', () => {
  const snapshot = getAssetSnapshot('USD/RUB');
  assert.ok(snapshot);
  const sum = snapshot.scenarios.reduce((s, scenario) => s + scenario.probability, 0);
  assert.ok(Math.abs(sum - 100) <= 0.5);
});
