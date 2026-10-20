const express = require('express');
const {
  listAssets,
  getAssetBySymbol,
  collectEventsForAsset,
  collectAllEvents
} = require('../services/ingestionService');
const { buildScenario } = require('../services/scenarioService');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'market-scenario-lab',
    timestamp: new Date().toISOString()
  });
});

router.get('/assets', (req, res) => {
  res.json({
    items: listAssets()
  });
});

router.get('/assets/:symbol', (req, res) => {
  const asset = getAssetBySymbol(req.params.symbol);

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const events = collectEventsForAsset(asset.symbol, 12);
  const scenario = buildScenario(asset.symbol);

  res.json({
    asset,
    events,
    scenario
  });
});

router.get('/events', (req, res) => {
  res.json({
    items: collectAllEvents(25)
  });
});

router.post('/analyze', (req, res) => {
  const symbol = req.body?.symbol || 'MOEX';
  const scenario = buildScenario(symbol);

  if (!scenario.asset) {
    return res.status(404).json({ error: 'No scenario data found for this asset' });
  }

  res.json({
    symbol,
    asset: scenario.asset,
    currentEvent: scenario.currentEvent,
    scenarios: scenario.scenarios,
    analogs: scenario.analogs,
    events: scenario.events
  });
});

module.exports = router;
