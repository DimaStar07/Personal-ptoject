const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test('health endpoint works', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, 'ok');
});

test('asset endpoint returns scenarios and context', async () => {
  const response = await fetch(`${baseUrl}/api/assets/MOEX`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.asset.symbol === 'MOEX');
  assert.ok(Array.isArray(payload.scenarios));
  assert.ok(payload.contextSnapshot);
});

test('analogs endpoint supports filtering and returns decomposition', async () => {
  const response = await fetch(`${baseUrl}/api/analogs?symbol=MOEX&minScore=0.05&limit=5`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.items));
  if (payload.items.length) {
    assert.ok(payload.items[0].scoreBreakdown);
  }
});
