const { getAssetBySymbol, collectEventsForAsset, listAssets } = require('./ingestionService');

function similarityScore(eventA, eventB) {
  const tagOverlap = new Set(eventA.tags || []).intersection
    ? null
    : null;

  const aTags = new Set(eventA.tags || []);
  const bTags = new Set(eventB.tags || []);
  const commonTags = [...aTags].filter((tag) => bTags.has(tag));
  const tagScore = commonTags.length * 25;
  const impactDelta = Math.abs((eventA.importance || 1) - (eventB.importance || 1));
  const impactScore = Math.max(0, 30 - Math.min(impactDelta, 30));
  const sameRegion = eventA.region === eventB.region ? 15 : 0;
  const sameAsset = eventA.assetSymbol === eventB.assetSymbol ? 10 : 0;

  return Math.min(100, Math.round(tagScore + impactScore + sameRegion + sameAsset));
}

function findHistoricalAnalogs(symbol, limit = 4) {
  const asset = getAssetBySymbol(symbol);

  if (!asset) {
    return [];
  }

  const events = collectEventsForAsset(symbol, 10);

  if (!events.length) {
    return [];
  }

  const currentEvent = events[0];
  const pool = listAssets()
    .filter((candidate) => candidate.symbol !== symbol)
    .map((candidate) => ({
      symbol: candidate.symbol,
      events: collectEventsForAsset(candidate.symbol, 6)
    }))
    .flatMap((candidate) => candidate.events.map((event) => ({
      assetSymbol: candidate.symbol,
      event,
      score: similarityScore(currentEvent, event)
    })));

  return pool
    .filter((entry) => entry.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      assetSymbol: entry.assetSymbol,
      eventId: entry.event.id,
      title: entry.event.title,
      date: entry.event.date,
      similarityScore: entry.score,
      summary: entry.event.summary,
      source: entry.event.source,
      sourceUrl: entry.event.sourceUrl,
      tags: entry.event.tags
    }));
}

function buildScenario(symbol) {
  const asset = getAssetBySymbol(symbol);
  const events = collectEventsForAsset(symbol, 8);
  const analogs = findHistoricalAnalogs(symbol, 4);

  if (!asset) {
    return {
      symbol,
      scenarios: [],
      events: [],
      analogs: []
    };
  }

  const current = events[0] || {
    title: 'No event data available',
    summary: 'The asset is not yet mapped to a current event.',
    importance: 50,
    tags: ['watchlist']
  };

  const scenarios = [
    {
      id: 'base',
      label: 'Base case',
      probability: 42,
      narrative: `The current environment remains broadly consistent with a medium-volatility phase for ${asset.symbol}.`,
      triggers: ['policy stays stable', 'liquidity remains sufficient', 'market absorbs noise'],
      risk: 'moderate'
    },
    {
      id: 'bear',
      label: 'Stress case',
      probability: 35,
      narrative: `A shock in liquidity or policy sentiment worsens risk conditions and pushes ${asset.symbol} into a sharper correction.`,
      triggers: ['rate shock', 'capital outflow', 'new external pressure'],
      risk: 'high'
    },
    {
      id: 'bull',
      label: 'Recovery case',
      probability: 23,
      narrative: `Macro stabilization and improving sentiment allow ${asset.symbol} to recover from its current pressure.`,
      triggers: ['rate normalization', 'stronger liquidity', 'positive sentiment shift'],
      risk: 'low'
    }
  ];

  return {
    asset,
    currentEvent: current,
    analogs,
    scenarios,
    events
  };
}

module.exports = {
  similarityScore,
  findHistoricalAnalogs,
  buildScenario
};
