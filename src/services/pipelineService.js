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
    lastMessage: source.status === 'unconfigured' ? 'Источник не настроен (нет доступа/ключа)' : 'Готов к загрузке',
    freshness: source.status === 'unconfigured' ? 'unavailable' : 'stale',
    quality: source.status === 'unconfigured' ? 'unconfigured' : 'demo'
  })),
  scenariosByAsset: {},
  analogsByAsset: {},
  signalJournal: [],
  scheduler: {
    started: false,
    intervalMs: Math.max(1, config.ingestionIntervalMinutes) * 60 * 1000,
    timer: null,
    nextRunAt: null
  },
  realtime: {
    clients: new Set(),
    lastPublishedAt: null
  },
  isIngestionRunning: false,
  activeRunId: null
};

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sanitizeText(text = '') {
  return String(text)
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

function isSourceConfigured(source) {
  if (!source.envKey) return Boolean(source.endpoint);
  return Boolean(process.env[source.envKey]);
}

function createAdapter(source) {
  if (!isSourceConfigured(source) || !source.endpoint || source.status === 'unconfigured') {
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

function classifyTopic(doc) {
  const tags = new Set(doc.tags || []);
  if (tags.has('shock') || tags.has('sanctions') || tags.has('геополитика')) return 'политика/геополитика';
  if (tags.has('energy') || tags.has('commodity') || tags.has('энергетика')) return 'сырьё';
  if (tags.has('rates') || tags.has('inflation') || tags.has('macro') || tags.has('макроэкономика')) return 'макроэкономика';
  if (tags.has('banking') || tags.has('banks')) return 'банковский сектор';
  if (tags.has('tech') || tags.has('технологии')) return 'технологии';
  return 'рынок';
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
    verificationStatus: source.trustLevel === 'high' ? 'reviewed' : 'draft',
    trustLevel: source.trustLevel,
    title: sanitizeText(doc.title),
    context: sanitizeText(doc.body),
    eventType: classifyDocument(doc),
    topic: classifyTopic(doc),
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
        canonicalUrl: doc.canonicalUrl,
        publishedAt: occurredAt,
        trustLevel: source.trustLevel,
        sourceType: source.type
      }
    ],
    evidence: claims.map((claim) => ({ id: claim.id, text: claim.text, confidence: claim.confidence })),
    freshness: 'fresh',
    processingStatus: 'processed',
    pipelineVersion: '1.1.0'
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
    pipelineVersion: '1.1.0'
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
    .slice(0, 250);
}

function publishRealtime(event, payload) {
  state.realtime.lastPublishedAt = nowIso();
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of state.realtime.clients) {
    client.write(data);
  }
}

function computeFreshness(lastRun) {
  if (!lastRun?.finishedAt) return 'stale';
  const ageMs = Date.now() - new Date(lastRun.finishedAt).getTime();
  const staleThresholdMs = Math.max(1, config.ingestionIntervalMinutes) * 60 * 1000 * 2.5;
  return ageMs > staleThresholdMs ? 'stale' : 'fresh';
}

async function runIngestion(reason = 'manual') {
  if (state.isIngestionRunning) {
    return {
      id: state.activeRunId,
      reason,
      status: 'running',
      skipped: true,
      message: 'Запуск пропущен: ingestion уже выполняется'
    };
  }

  state.isIngestionRunning = true;
  const runId = `run-${Date.now()}`;
  state.activeRunId = runId;
  const run = {
    id: runId,
    reason,
    status: 'running',
    pipelineVersion: '1.1.0',
    startedAt: nowIso(),
    finishedAt: null,
    processed: 0,
    deduplicated: 0,
    errors: [],
    stageLog: []
  };
  state.ingestionRuns.unshift(run);
  publishRealtime('ingestion', { type: 'start', runId, reason, startedAt: run.startedAt });

  const sources = state.sourceStatus;
  for (const source of sources) {
    const configured = isSourceConfigured(source);
    if (!configured || source.status === 'unconfigured' || !source.endpoint) {
      source.freshness = 'unavailable';
      source.lastMessage = `Источник не настроен: ${source.envKey || 'нет публичного endpoint'}`;
      source.quality = 'unconfigured';
      continue;
    }

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
      source.lastMessage = `Документов: ${docs.length} (${source.type === 'official' ? 'official/demo' : 'demo'})`;
      source.freshness = 'fresh';
      source.quality = source.status === 'degraded' ? 'mixed' : 'demo';
    } catch (error) {
      run.errors.push({ sourceId: source.id, message: error.message });
      source.lastErrorAt = nowIso();
      source.lastMessage = `Ошибка: ${error.message}`;
      source.freshness = source.status === 'unconfigured' ? 'unavailable' : 'stale';
      source.quality = 'error';
    }
  }

  run.stageLog.push({ stage: 'recompute_analytics', at: nowIso() });
  recomputeAnalytics();

  run.status = run.errors.length ? 'partial_success' : 'success';
  run.finishedAt = nowIso();
  state.isIngestionRunning = false;
  state.activeRunId = null;

  publishRealtime('ingestion', {
    type: 'finish',
    runId,
    status: run.status,
    processed: run.processed,
    deduplicated: run.deduplicated,
    errors: run.errors,
    finishedAt: run.finishedAt
  });

  return run;
}

function ensureInitialized() {
  if (state.initialized) return;
  state.initialized = true;
}

function startScheduler() {
  if (state.scheduler.started) return;
  const intervalMs = Math.max(1, config.ingestionIntervalMinutes) * 60 * 1000;
  state.scheduler.intervalMs = intervalMs;
  state.scheduler.started = true;
  state.scheduler.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
  state.scheduler.timer = setInterval(() => {
    state.scheduler.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    runIngestion('scheduler').catch(() => null);
  }, intervalMs);
  if (state.scheduler.timer?.unref) {
    state.scheduler.timer.unref();
  }
}

function stopScheduler() {
  if (state.scheduler.timer) {
    clearInterval(state.scheduler.timer);
    state.scheduler.timer = null;
  }
  state.scheduler.started = false;
  state.scheduler.nextRunAt = null;
}

function subscribeSse(res) {
  state.realtime.clients.add(res);
  res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: nowIso() })}\n\n`);
}

function unsubscribeSse(res) {
  state.realtime.clients.delete(res);
}

function mapCategoryForSearch(asset) {
  switch (asset.category) {
    case 'equity':
      return asset.country === 'RU' ? 'российские акции' : 'иностранные акции';
    case 'index':
      return 'индексы';
    case 'currency':
      return 'валюты';
    case 'bond':
      return 'облигации';
    case 'etf':
      return 'ETF';
    case 'commodity':
      return 'сырьё';
    case 'crypto':
      return 'криптовалюты';
    case 'macro':
      return 'макроэкономика';
    default:
      return 'все';
  }
}

function listInstrumentCatalog() {
  return assets.map((asset) => {
    const series = priceSeries[asset.symbol] || [];
    const sourceState = state.sourceStatus.find((s) => s.id === 'moex');
    return {
      ...asset,
      searchCategory: mapCategoryForSearch(asset),
      hasSeries: Boolean(series.length),
      dataStatus: series.length ? 'seed/demo series' : 'catalog only',
      sourceStatus: sourceState?.status || 'active'
    };
  });
}

function searchInstruments({ query = '', category = 'все', limit = 50 }) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const catalog = listInstrumentCatalog();

  const filtered = catalog
    .filter((asset) => (category === 'все' ? true : asset.searchCategory.toLowerCase() === String(category).toLowerCase()))
    .filter((asset) => {
      if (!normalizedQuery) return true;
      const haystack = [asset.symbol, asset.name, asset.exchange, asset.category, asset.country, asset.currency].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .slice(0, limit);

  return {
    total: filtered.length,
    query,
    category,
    items: filtered
  };
}

function getDataStatus() {
  const lastRun = state.ingestionRuns[0] || null;
  const freshness = computeFreshness(lastRun);
  return {
    ingestion: {
      lastRun,
      runs: state.ingestionRuns.slice(0, 50),
      isRunning: state.isIngestionRunning,
      scheduler: {
        enabled: state.scheduler.started,
        intervalMinutes: Math.max(1, Math.floor(state.scheduler.intervalMs / 60000)),
        nextRunAt: state.scheduler.nextRunAt
      }
    },
    sources: state.sourceStatus,
    freshness: {
      events: state.marketEvents.length ? freshness : 'stale',
      series: 'seed-demo',
      updatedAt: lastRun?.finishedAt || null,
      qualityLabel: freshness === 'fresh' ? 'данные актуальны в пределах SLA demo' : 'данные могут быть устаревшими'
    },
    realtime: {
      transport: 'sse+polling-fallback',
      connectedClients: state.realtime.clients.size,
      lastPublishedAt: state.realtime.lastPublishedAt
    }
  };
}

function listAssetsExtended() {
  return assets.map((asset) => ({
    ...asset,
    hasSeries: Boolean(priceSeries[asset.symbol]),
    dataPoints: (priceSeries[asset.symbol] || []).length,
    scenarios: (state.scenariosByAsset[asset.symbol] || []).length,
    analogs: (state.analogsByAsset[asset.symbol] || []).length,
    dataStatus: priceSeries[asset.symbol] ? 'seed-demo' : 'catalog-only'
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
    events: events.slice(0, 30),
    analogs: state.analogsByAsset[asset.symbol] || [],
    scenarios,
    contextSnapshot,
    limitations: {
      model: 'Вероятности и сценарные диапазоны являются модельной оценкой, не гарантия результата.',
      data: priceSeries[asset.symbol] ? 'seed/demo history' : 'нет исторического ряда; каталоговый актив'
    }
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

function listNews({ topic = 'все', source = 'all', q = '', symbol, hotOnly = false, limit = 100 }) {
  const query = String(q || '').trim().toLowerCase();

  return state.marketEvents
    .slice()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter((event) => (topic === 'все' ? true : event.topic === topic))
    .filter((event) => (source === 'all' ? true : event.sourceReferences.some((ref) => ref.sourceId === source)))
    .filter((event) => (symbol ? event.assetSymbols.includes(symbol) : true))
    .filter((event) => {
      if (!query) return true;
      return `${event.title} ${event.context} ${(event.tags || []).join(' ')}`.toLowerCase().includes(query);
    })
    .filter((event) => {
      if (!hotOnly) return true;
      const ageDays = (Date.now() - new Date(event.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays <= 30 || event.tags.includes('shock') || event.tags.includes('volatility');
    })
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.context,
      topic: event.topic,
      trustLevel: event.trustLevel,
      verificationStatus: event.verificationStatus,
      source: event.sourceReferences[0]?.sourceName || 'unknown',
      sourceId: event.sourceReferences[0]?.sourceId || 'unknown',
      sourceUrl: event.sourceReferences[0]?.url || null,
      publishedAt: event.publishedAt,
      assetSymbols: event.assetSymbols
    }));
}

function marketToday() {
  const assetsExtended = listAssetsExtended();
  const latestEvents = listEvents(15);
  const activeSignals = state.signalJournal.slice(0, Math.min(25, assetsExtended.length));

  const scenarioOverview = assetsExtended.slice(0, 24).map((asset) => {
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
    watchlist: ['MOEX', 'SBER', 'GAZP', 'LKOH', 'USD/RUB', 'EUR/RUB', 'BRENT', 'XAU/USD', 'BTC/USD'],
    dataStatus: getDataStatus().freshness,
    disclaimer: 'Информационный продукт: вероятности являются аналитической моделью, а не персональной инвестиционной рекомендацией.'
  };
}

function getSignalJournal(limit = 100) {
  return state.signalJournal.slice(0, limit);
}

function getScenarioMap(symbol) {
  const snapshot = getAssetSnapshot(symbol);
  if (!snapshot) return null;
  const scenarios = (snapshot.scenarios || []).map((scenario) => ({
    ...scenario,
    probabilityRange: [Math.max(0, scenario.probability - 8), Math.min(100, scenario.probability + 8)],
    conditions: {
      confirm: scenario.confirmationSignals,
      cancel: scenario.invalidationSignals,
      horizonDays: scenario.horizonDays
    }
  }));

  return {
    symbol: snapshot.asset.symbol,
    title: `Сценарная карта ${snapshot.asset.symbol}`,
    branches: scenarios,
    methodology: 'prior + evidence weighted log-odds + softmax, сумма вероятностей = 100%',
    note: 'Сценарные ветви показывают диапазоны и направления, а не обещанный прогноз цены.'
  };
}

module.exports = {
  state,
  ensureInitialized,
  runIngestion,
  startScheduler,
  stopScheduler,
  subscribeSse,
  unsubscribeSse,
  getDataStatus,
  listAssetsExtended,
  getAssetSnapshot,
  listEvents,
  getEventById,
  listAnalogs,
  marketToday,
  getSignalJournal,
  listInstrumentCatalog,
  searchInstruments,
  listNews,
  getScenarioMap,
  publishRealtime
};
