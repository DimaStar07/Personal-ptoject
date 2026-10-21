const express = require('express');
const config = require('../config');
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
  getSignalJournal,
  searchInstruments,
  listInstrumentCatalog,
  listNews,
  getScenarioMap,
  subscribeSse,
  unsubscribeSse
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

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  subscribeSse(res);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ now: new Date().toISOString() })}\n\n`);
  }, config.sseHeartbeatMs);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribeSse(res);
    res.end();
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

router.get('/scenario-map/:symbol', (req, res) => {
  const map = getScenarioMap(req.params.symbol);
  if (!map) {
    return res.status(404).json({ error: 'Актив не найден' });
  }
  res.json(map);
});

router.get('/signals', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit || 100));
  res.json({ items: getSignalJournal(limit) });
});

router.get('/catalog', (req, res) => {
  res.json({ items: listInstrumentCatalog() });
});

router.get('/search/instruments', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit || 50));
  const query = req.query.q || '';
  const category = req.query.category || 'все';
  res.json(searchInstruments({ query, category, limit }));
});

router.get('/news', (req, res) => {
  const limit = Math.min(300, Number(req.query.limit || 100));
  const topic = req.query.topic || 'все';
  const source = req.query.source || 'all';
  const hotOnly = req.query.hot === '1' || req.query.hot === 'true';
  const symbol = req.query.symbol;
  const q = req.query.q || '';

  res.json({
    items: listNews({ topic, source, q, symbol, hotOnly, limit })
  });
});

module.exports = router;
