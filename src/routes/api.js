const express = require('express');
const {
  ensureInitialized,
  runIngestion,
  getDataStatus,
  listAssetsExtended,
  getAssetSnapshot,
  listEvents,
  getEventById,
  listAnalogs,
  marketToday,
  getSignalJournal
} = require('../services/pipelineService');

const router = express.Router();

router.use(async (req, res, next) => {
  ensureInitialized();
  const hasRun = getDataStatus().ingestion.runs.length > 0;
  if (!hasRun) {
    await runIngestion('bootstrap');
  }
  next();
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'probabilistic-market-scenarios',
    timestamp: new Date().toISOString()
  });
});

router.post('/ingestion/run', async (req, res) => {
  const reason = req.body?.reason || 'manual';
  const run = await runIngestion(reason);
  res.json({ run, status: getDataStatus() });
});

router.get('/status', (req, res) => {
  res.json(getDataStatus());
});

router.get('/market/today', (req, res) => {
  res.json(marketToday());
});

router.get('/assets', (req, res) => {
  res.json({ items: listAssetsExtended() });
});

router.get('/assets/:symbol', (req, res) => {
  const snapshot = getAssetSnapshot(req.params.symbol);
  if (!snapshot) {
    return res.status(404).json({ error: 'Актив не найден' });
  }
  res.json(snapshot);
});

router.get('/events', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit || 50));
  res.json({ items: listEvents(limit) });
});

router.get('/events/:id', (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Событие не найдено' });
  }
  res.json(event);
});

router.get('/analogs', (req, res) => {
  const minScore = Number(req.query.minScore || 0);
  const limit = Math.min(200, Number(req.query.limit || 100));
  const symbol = req.query.symbol;
  const status = req.query.status;

  res.json({
    items: listAnalogs({ symbol, minScore, status, limit })
  });
});

router.get('/scenarios/:symbol', (req, res) => {
  const snapshot = getAssetSnapshot(req.params.symbol);
  if (!snapshot) {
    return res.status(404).json({ error: 'Актив не найден' });
  }
  res.json({
    symbol: snapshot.asset.symbol,
    scenarios: snapshot.scenarios,
    contextSnapshot: snapshot.contextSnapshot,
    disclaimer: 'Сценарии — модельная оценка на основе исторических аналогий.'
  });
});

router.get('/signals', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit || 100));
  res.json({ items: getSignalJournal(limit) });
});

module.exports = router;
