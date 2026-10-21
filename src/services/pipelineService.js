const crypto = require('crypto');
const config = require('../config');
const { assets, sourceCatalog, seedDocuments, priceSeries } = require('../data/marketSeed');
const {
  mapAssetFeatures,
  findAnalogs,
  calculateScenarioProbabilities,
  eventWindowReaction,
  correlation,
  beta,
  normalizeAndRankAnalogs
} = require('./analyticsService');

const state = {
  initialized: false,
  rawDocuments: [],
  marketEvents: [],
  claims: [],
  ingestionRuns: [],
  sourceStatus: sourceCatalog.map((source) => ({
    ...source,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastMessage: source.status === 'unconfigured' ? 'Требуется ключ/API' : 'Готов к загрузке',
    freshness: 'stale'
  })),
  scenariosByAsset: {},
  analogsByAsset: {},
  signalJournal: []
};

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sanitizeText(text = '') {
  return String(text)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]))
    .replace(/\s+/g, ' ')
    .trim();
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DemoSourceAdapter {
  constructor(sourceId) {
    this.sourceId = sourceId;
  }

  async fetchDocuments() {
    return seedDocuments.filter((doc) => doc.providerId === this.sourceId);
  }
}

class DisabledSourceAdapter {
  constructor(sourceId) {
    this.sourceId = sourceId;
  }

  async fetchDocuments() {
    throw new Error(`Источник ${this.sourceId} не настроен`);
  }
}

function createAdapter(source) {
  if (!source.endpoint || source.status === 'unconfigured') {
    return new DisabledSourceAdapter(source.id);
  }
  return new DemoSourceAdapter(source.id);
}

function classifyDocument(doc) {
  const tags = new Set(doc.tags || []);
  if (tags.has('shock') || tags.has('sanctions') || tags.has('stress')) return 'shock';
  if (tags.has('volatility') || tags.has('risk')) return 'risk';
  if (tags.has('rates') || tags.has('inflation')) return 'policy';
  return 'context';
}

function extractClaims(doc) {
  const factors = [...new Set((doc.tags || []).map((tag) => tag.toLowerCase()))];
  return [
    {
      id: `claim-${sha256(`${doc.externalId}-claim`).slice(0, 14)}`,
      documentExternalId: doc.externalId,
      text: sanitizeText(doc.body),
      factors,
      confidence: 0.62,
      sourceType: 'normalized_claim',
      createdAt: nowIso()
    }
  ];
}

function buildNormalizedEvent(doc, source, claims) {
  const occurredAt = doc.publishedAt;
  const eventId = `evt-${sha256(doc.externalId).slice(0, 12)}`;
  const primaryAsset = doc.assets?.[0] || 'MOEX';

  return {
    id: eventId,
    externalId: doc.externalId,
    status: 'published',
    title: sanitizeText(doc.title),
    context: sanitizeText(doc.body),
    eventType: classifyDocument(doc),
    occurredAt,
    publishedAt: occurredAt,
    ingestedAt: nowIso(),
    primaryAsset,
    assetSymbols: doc.assets || [],
    factors: claims[0]?.factors || [],
    tags: doc.tags || [],
    sourceReferences: [
      {
        sourceId: source.id,
        sourceName: source.name,
        url: doc.canonicalUrl,
        publishedAt: occurredAt,
        trustLevel: source.trustLevel,
        sourceType: source.type
      }
    ],
    evidence: claims.map((claim) => ({ id: claim.id, text: claim.text, confidence: claim.confidence })),
    freshness: 'fresh',
    processingStatus: 'processed',
    pipelineVersion: '1.0.0'
  };
}

function deduplicateRaw(document, runId) {
  const contentHash = sha256(`${document.title}|${document.body}|${document.publishedAt}`);
  const exists = state.rawDocuments.find((doc) =>
    doc.canonicalUrl === document.canonicalUrl ||
    doc.externalId === document.externalId ||
    doc.contentHash === contentHash
  );

  if (exists) {
    return { status: 'duplicate', document: exists };
  }

  const record = {
    id: `raw-${sha256(document.externalId).slice(0, 12)}`,
    runId,
    providerId: document.providerId,
    externalId: document.externalId,
    canonicalUrl: document.canonicalUrl,
    publishedAt: document.publishedAt,
    fetchedAt: nowIso(),
    contentHash,
    title: sanitizeText(document.title),
    body: sanitizeText(document.body),
    tags: document.tags || [],
    assets: document.assets || [],
    processingStatus: 'normalized',
    trustLevel: sourceCatalog.find((source) => source.id === document.providerId)?.trustLevel || 'medium',
    pipelineVersion: '1.0.0'
  };

  state.rawDocuments.push(record);
  return { status: 'new', document: record };
}

async function fetchWithRetry(adapter, { timeoutMs, retries, rateLimitPerSecond }) {
  const delayBase = Math.max(50, Math.floor(1000 / Math.max(1, rateLimitPerSecond)));

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await sleep(delayBase);
      const result = await Promise.race([
        adapter.fetchDocuments(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
      return result;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(delayBase * 2 ** attempt);
    }
  }

  return [];
}

function collectSignals(assetSymbol, features, scenarios, events) {
  const dominant = scenarios.slice().sort((a, b) => b.probability - a.probability)[0];
  return {
    id: `sig-${assetSymbol}-${Date.now()}`,
    assetSymbol,
    createdAt: nowIso(),
    signalType: dominant?.id || 'base',
    summary: `${assetSymbol}: доминирует ветвь «${dominant?.label || 'Базовый'}» (${dominant?.probability || 0}%).`,
    diagnostics: {
      phase: features.phase,
      volatility30: features.volatility30,
      momentum60: features.momentumMedium,
      drawdown120: features.drawdown120,
      eventCount: events.length
    },
    status: 'published'
  };
}

function recomputeAnalytics() {
  const featureMap = mapAssetFeatures();
  const allEvents = state.marketEvents.slice().sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  for (const asset of assets) {
    const assetEvents = allEvents.filter((event) => event.assetSymbols.includes(asset.symbol));
    const currentEvent = assetEvents[0];

    if (!currentEvent) {
      state.scenariosByAsset[asset.symbol] = [];
      state.analogsByAsset[asset.symbol] = [];
      continue;
    }

    const analogs = normalizeAndRankAnalogs(findAnalogs(currentEvent, allEvents, featureMap, 7));
    state.analogsByAsset[asset.symbol] = analogs;

    const feature = featureMap[asset.symbol];
    const scenarios = calculateScenarioProbabilities({ currentEvent, analogs, feature });
    state.scenariosByAsset[asset.symbol] = scenarios;

    const benchmark = priceSeries.MOEX;
    const contextSnapshot = {
      generatedAt: nowIso(),
      feature,
      eventWindowReaction: eventWindowReaction(priceSeries[asset.symbol] || [], currentEvent.occurredAt),
      correlationToMoex: asset.symbol === 'MOEX' ? 1 : correlation(priceSeries[asset.symbol] || [], benchmark),
      betaToMoex: asset.symbol === 'MOEX' ? 1 : beta(priceSeries[asset.symbol] || [], benchmark)
    };

    state.signalJournal.push(collectSignals(asset.symbol, feature, scenarios, assetEvents));
    state.scenariosByAsset[asset.symbol].contextSnapshot = contextSnapshot;
  }

  state.signalJournal = state.signalJournal
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100);
}

async function runIngestion(reason = 'manual') {
  const runId = `run-${Date.now()}`;
  const run = {
    id: runId,
    reason,
    status: 'running',
    pipelineVersion: '1.0.0',
    startedAt: nowIso(),
    finishedAt: null,
    processed: 0,
    deduplicated: 0,
    errors: [],
    stageLog: []
  };
  state.ingestionRuns.unshift(run);

  const sources = state.sourceStatus;
  for (const source of sources) {
    const adapter = createAdapter(source);

    try {
      run.stageLog.push({ sourceId: source.id, stage: 'fetch', at: nowIso() });
      const docs = await fetchWithRetry(adapter, {
        timeoutMs: config.ingestionTimeoutMs,
        retries: config.ingestionMaxRetries,
        rateLimitPerSecond: config.ingestionRateLimitPerSecond
      });

      for (const doc of docs) {
        const dedupe = deduplicateRaw(doc, runId);
        if (dedupe.status === 'duplicate') {
          run.deduplicated += 1;
          continue;
        }

        const claims = extractClaims(doc);
        state.claims.push(...claims);

        const normalized = buildNormalizedEvent(doc, source, claims);
        const existing = state.marketEvents.find((evt) => evt.externalId === normalized.externalId || evt.id === normalized.id);
        if (!existing) {
          state.marketEvents.push(normalized);
          run.processed += 1;
        } else {
          run.deduplicated += 1;
        }
      }

      source.lastSuccessAt = nowIso();
      source.lastMessage = `Получено документов: ${docs.length}`;
      source.freshness = 'fresh';
    } catch (error) {
      run.errors.push({ sourceId: source.id, message: error.message });
      source.lastErrorAt = nowIso();
      source.lastMessage = `Ошибка: ${error.message}`;
      source.freshness = source.status === 'unconfigured' ? 'unavailable' : 'stale';
    }
  }

  run.stageLog.push({ stage: 'recompute_analytics', at: nowIso() });
  recomputeAnalytics();

  run.status = run.errors.length ? 'partial_success' : 'success';
  run.finishedAt = nowIso();
  return run;
}

function ensureInitialized() {
  if (state.initialized) return;
  state.initialized = true;
}

function getDataStatus() {
  const lastRun = state.ingestionRuns[0] || null;
  return {
    ingestion: {
      lastRun,
      runs: state.ingestionRuns.slice(0, 20)
    },
    sources: state.sourceStatus,
    freshness: {
      events: state.marketEvents.length ? 'fresh' : 'stale',
      series: 'seed-demo',
      updatedAt: lastRun?.finishedAt || null
    }
  };
}

function listAssetsExtended() {
  return assets.map((asset) => ({
    ...asset,
    hasSeries: Boolean(priceSeries[asset.symbol]),
    dataPoints: (priceSeries[asset.symbol] || []).length,
    scenarios: (state.scenariosByAsset[asset.symbol] || []).length,
    analogs: (state.analogsByAsset[asset.symbol] || []).length
  }));
}

function getAssetSnapshot(symbol) {
  const asset = assets.find((item) => item.symbol.toLowerCase() === String(symbol).toLowerCase());
  if (!asset) return null;

  const events = state.marketEvents
    .filter((event) => event.assetSymbols.includes(asset.symbol))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const scenarios = state.scenariosByAsset[asset.symbol] || [];
  const contextSnapshot = scenarios.contextSnapshot || null;

  return {
    asset,
    series: priceSeries[asset.symbol] || [],
    currentEvent: events[0] || null,
    events: events.slice(0, 15),
    analogs: state.analogsByAsset[asset.symbol] || [],
    scenarios,
    contextSnapshot
  };
}

function listEvents(limit = 50) {
  return state.marketEvents
    .slice()
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, limit);
}

function getEventById(eventId) {
  const event = state.marketEvents.find((item) => item.id === eventId);
  if (!event) return null;

  const relatedAnalogs = Object.values(state.analogsByAsset)
    .flat()
    .filter((item) => item.currentEventId === event.id || item.analogEventId === event.id);

  return {
    ...event,
    relatedAnalogs,
    scenarios: state.scenariosByAsset[event.primaryAsset] || []
  };
}

function listAnalogs({ symbol, minScore = 0, status, limit = 100 }) {
  const all = symbol
    ? state.analogsByAsset[symbol] || []
    : Object.values(state.analogsByAsset).flat();

  return all
    .filter((item) => item.score >= minScore)
    .filter((item) => (status ? item.status === status : true))
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function marketToday() {
  const assetsExtended = listAssetsExtended();
  const latestEvents = listEvents(12);
  const activeSignals = state.signalJournal.slice(0, assetsExtended.length);

  const scenarioOverview = assetsExtended.map((asset) => {
    const scenarios = state.scenariosByAsset[asset.symbol] || [];
    const top = scenarios.slice().sort((a, b) => b.probability - a.probability)[0] || null;
    return {
      symbol: asset.symbol,
      branch: top?.label || 'Нет данных',
      probability: top?.probability || 0,
      confidence: top?.confidence || 0,
      disclaimer: 'Модельная оценка, не гарантия результата.'
    };
  });

  return {
    generatedAt: nowIso(),
    assets: assetsExtended,
    latestEvents,
    activeSignals,
    scenarioOverview,
    dataStatus: getDataStatus().freshness,
    disclaimer: 'Информационный продукт: вероятности являются аналитической моделью, а не персональной инвестиционной рекомендацией.'
  };
}

function getSignalJournal(limit = 100) {
  return state.signalJournal.slice(0, limit);
}

module.exports = {
  state,
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
};
