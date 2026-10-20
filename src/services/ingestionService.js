const { assets, events } = require('../data/marketSeed');

function listAssets() {
  return assets.map((asset) => ({
    ...asset,
    eventCount: events.filter((event) => event.assetSymbol === asset.symbol).length
  }));
}

function getAssetBySymbol(symbol) {
  const normalized = String(symbol || '').trim();
  return assets.find((asset) => asset.symbol.toLowerCase() === normalized.toLowerCase()) || null;
}

function collectEventsForAsset(symbol, limit = 12) {
  const asset = getAssetBySymbol(symbol);

  if (!asset) {
    return [];
  }

  return events
    .filter((event) => event.assetSymbol === asset.symbol)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map((event) => ({
      ...event,
      score: Math.round((event.importance || 50) * 0.7 + (event.tags || []).length * 5)
    }));
}

function collectAllEvents(limit = 20) {
  return events
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map((event) => ({
      ...event,
      score: Math.round((event.importance || 50) * 0.7 + (event.tags || []).length * 5)
    }));
}

module.exports = {
  listAssets,
  getAssetBySymbol,
  collectEventsForAsset,
  collectAllEvents
};
