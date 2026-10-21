const cfg = require('../config/analyticsConfig');
const { assets, priceSeries } = require('../data/marketSeed');
const {
  clamp,
  logReturns,
  rollingVolatility,
  momentum,
  maxDrawdown,
  normalizeValue,
  cosineSimilarity,
  softmax
} = require('../lib/analyticsMath');

function cyclePhase(features) {
  const mom = features.momentumMedium ?? 0;
  const vol = features.volatility30 ?? 0;
  const dd = features.drawdown120 ?? 0;

  if (dd < -0.25 && vol > 0.06) return 'crisis';
  if (mom > 0.12 && vol < 0.05) return 'expansion';
  if (mom < -0.06) return 'contraction';
  return 'transition';
}

function buildFeatureSet(symbol) {
  const series = priceSeries[symbol] || [];
  const returns = logReturns(series);

  const features = {
    symbol,
    hasData: series.length >= 10,
    observations: series.length,
    latest: series[series.length - 1]?.close ?? null,
    logReturnMean: returns.length ? returns.filter(Number.isFinite).reduce((s, v) => s + v, 0) / returns.filter(Number.isFinite).length : null,
    volatility30: rollingVolatility(returns, cfg.featureWindows.volatility),
    momentumShort: momentum(series, cfg.featureWindows.momentumShort),
    momentumMedium: momentum(series, cfg.featureWindows.momentumMedium),
    momentumLong: momentum(series, cfg.featureWindows.momentumLong),
    drawdown120: maxDrawdown(series, cfg.featureWindows.drawdown),
    returnsTail: returns.slice(-20).map((v) => (Number.isFinite(v) ? v : 0))
  };

  features.phase = cyclePhase(features);
  return features;
}

function mapAssetFeatures() {
  return assets.reduce((acc, a) => {
    acc[a.symbol] = buildFeatureSet(a.symbol);
    return acc;
  }, {});
}

function phaseSimilarity(a, b) {
  return a.phase === b.phase ? 1 : 0.4;
}

function factorSimilarity(baseFactors = [], analogFactors = []) {
  const a = new Set(baseFactors);
  const b = new Set(analogFactors);
  if (!a.size && !b.size) return 0.5;
  const overlap = [...a].filter((factor) => b.has(factor)).length;
  const union = new Set([...a, ...b]).size || 1;
  return overlap / union;
}

function semanticSimilarity(tagsA = [], tagsB = []) {
  const dictionary = ['rates', 'inflation', 'currency', 'risk', 'energy', 'sanctions', 'volatility', 'macro', 'equity-market', 'commodity', 'shock', 'fx'];
  const vec = (tags) => dictionary.map((term) => (tags.includes(term) ? 1 : 0));
  return cosineSimilarity(vec(tagsA), vec(tagsB)) ?? 0.5;
}

function behaviorSimilarity(featuresA, featuresB) {
  const valuesA = [featuresA.momentumShort, featuresA.momentumMedium, featuresA.momentumLong, featuresA.drawdown120]
    .map((v) => (Number.isFinite(v) ? v : null));
  const valuesB = [featuresB.momentumShort, featuresB.momentumMedium, featuresB.momentumLong, featuresB.drawdown120]
    .map((v) => (Number.isFinite(v) ? v : null));

  let present = 0;
  let sum = 0;
  for (let i = 0; i < valuesA.length; i += 1) {
    if (valuesA[i] == null || valuesB[i] == null) continue;
    present += 1;
    const diff = Math.abs(valuesA[i] - valuesB[i]);
    sum += 1 - clamp(diff / 0.5);
  }

  if (!present) return { score: 0.35, missing: 1 };
  return { score: clamp(sum / present), missing: 1 - present / valuesA.length };
}

function volatilitySimilarity(featuresA, featuresB) {
  if (!Number.isFinite(featuresA.volatility30) || !Number.isFinite(featuresB.volatility30)) {
    return { score: 0.4, missing: 1 };
  }
  const diff = Math.abs(featuresA.volatility30 - featuresB.volatility30);
  return { score: 1 - clamp(diff / 0.2), missing: 0 };
}

function similarityScore(currentEvent, analogEvent, featureMap) {
  const baseFeatures = featureMap[currentEvent.primaryAsset] || buildFeatureSet(currentEvent.primaryAsset);
  const analogFeatures = featureMap[analogEvent.primaryAsset] || buildFeatureSet(analogEvent.primaryAsset);

  const factor = factorSimilarity(currentEvent.factors, analogEvent.factors);
  const behavior = behaviorSimilarity(baseFeatures, analogFeatures);
  const volatility = volatilitySimilarity(baseFeatures, analogFeatures);
  const phase = phaseSimilarity(baseFeatures, analogFeatures);
  const semantic = semanticSimilarity(currentEvent.tags || [], analogEvent.tags || []);

  const w = cfg.similarityWeights;
  let score = (
    factor * w.factor +
    behavior.score * w.priceBehavior +
    volatility.score * w.volatility +
    phase * w.cyclePhase +
    semantic * w.semantic
  );

  const missingPenalty = cfg.missingDataPenalty * (behavior.missing + volatility.missing);
  score = clamp(score - missingPenalty);

  return {
    score,
    components: {
      factor,
      priceBehavior: behavior.score,
      volatility: volatility.score,
      cyclePhase: phase,
      semantic,
      missingPenalty
    }
  };
}

function findAnalogs(currentEvent, historicalEvents, featureMap, limit = 7) {
  const items = historicalEvents
    .filter((event) => event.id !== currentEvent.id)
    .map((event) => {
      const result = similarityScore(currentEvent, event, featureMap);
      return {
        id: `${currentEvent.id}::${event.id}`,
        eventId: event.id,
        status: 'reviewed',
        score: Number(result.score.toFixed(4)),
        scoreBreakdown: result.components,
        matchedFactors: (currentEvent.factors || []).filter((f) => (event.factors || []).includes(f)),
        currentEventId: currentEvent.id,
        analogEventId: event.id,
        title: event.title,
        date: event.occurredAt,
        assetSymbol: event.primaryAsset,
        sourceReferences: event.sourceReferences,
        confidence: clamp(0.35 + result.score * 0.6)
      };
    })
    .filter((item) => item.score >= 0.05)
    .sort((a, b) => (b.score - a.score) || a.analogEventId.localeCompare(b.analogEventId))
    .slice(0, limit);

  return items;
}

function calculateScenarioProbabilities({ currentEvent, analogs, feature }) {
  const priors = cfg.scenarioModel.priorLogOdds;
  const w = cfg.scenarioModel.evidenceWeights;
  const analogStrength = analogs.length ? analogs.reduce((s, item) => s + item.score, 0) / analogs.length : 0;
  const marketStress = clamp(Math.abs(feature.drawdown120 || 0) * 2 + (feature.volatility30 || 0) * 4);
  const positiveMomentum = clamp((feature.momentumMedium || 0) + 0.5);
  const eventShock = (currentEvent.tags || []).includes('shock') ? 1 : 0.25;
  const coverage = clamp((currentEvent.sourceReferences || []).length / 3);

  const logits = {
    base: priors.base + w.analogStrength * analogStrength - w.marketStress * marketStress * 0.2 + w.coverage * coverage,
    bear: priors.bear + w.marketStress * marketStress + w.eventShock * eventShock - w.positiveMomentum * positiveMomentum * 0.6,
    bull: priors.bull + w.positiveMomentum * positiveMomentum + w.analogStrength * analogStrength * 0.5 - w.marketStress * marketStress * 0.5,
    shock: priors.shock + w.eventShock * eventShock + w.marketStress * marketStress * 1.1 - w.coverage * coverage * 0.2
  };

  const keys = ['base', 'bear', 'bull', 'shock'];
  const probs = softmax(keys.map((k) => logits[k]));

  const labels = {
    base: 'Базовый',
    bear: 'Медвежий',
    bull: 'Бычий',
    shock: 'Шоковый'
  };

  const confidence = clamp(
    cfg.scenarioModel.confidenceFloor +
      0.35 * coverage +
      0.2 * Math.min(1, analogs.length / 5) +
      0.15 * (1 - Math.min(1, Math.abs((feature.volatility30 || 0.03) - 0.04) / 0.2))
  );

  return keys.map((id, index) => ({
    id,
    status: id === 'shock' ? 'draft' : 'reviewed',
    label: labels[id],
    probability: Number((probs[index] * 100).toFixed(1)),
    horizonDays: id === 'shock' ? 30 : 90,
    confidence: Number(confidence.toFixed(2)),
    coverage: Number(coverage.toFixed(2)),
    triggers: id === 'bull'
      ? ['снижение инфляционного давления', 'стабильный курс RUB', 'подтверждение от 2+ источников']
      : id === 'bear'
        ? ['рост волатильности', 'ухудшение ликвидности', 'новые санкционные риски']
        : id === 'shock'
          ? ['внешний политический шок', 'стресс в валюте', 'сбой в ликвидности']
          : ['нейтральная макродинамика', 'контролируемая волатильность'],
    confirmationSignals: id === 'bull'
      ? ['momentum 60d > 0', 'drawdown улучшается']
      : ['рост realized volatility', 'отрицательный momentum'],
    invalidationSignals: id === 'bull'
      ? ['резкий скачок волатильности', 'новый негативный event-window']
      : ['стабилизация волатильности и курса'],
    evidenceType: 'model_estimate',
    disclaimer: 'Вероятность является модельной оценкой и не является гарантией.'
  }));
}

function eventWindowReaction(series, eventDate, pre = 5, post = 10) {
  const idx = series.findIndex((item) => item.date >= eventDate);
  if (idx < 0) return null;
  const before = series[Math.max(0, idx - pre)]?.close;
  const after = series[Math.min(series.length - 1, idx + post)]?.close;
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === 0) return null;
  return (after - before) / before;
}

function correlation(seriesA, seriesB, window = 90) {
  const retA = logReturns(seriesA).slice(-window);
  const retB = logReturns(seriesB).slice(-window);
  const paired = retA.map((a, i) => [a, retB[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (paired.length < 3) return null;
  const as = paired.map((pair) => pair[0]);
  const bs = paired.map((pair) => pair[1]);
  const ma = as.reduce((s, v) => s + v, 0) / as.length;
  const mb = bs.reduce((s, v) => s + v, 0) / bs.length;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < paired.length; i += 1) {
    const da = as[i] - ma;
    const db = bs[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

function beta(seriesA, benchmarkSeries, window = 90) {
  const retA = logReturns(seriesA).slice(-window);
  const retB = logReturns(benchmarkSeries).slice(-window);
  const paired = retA.map((a, i) => [a, retB[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (paired.length < 3) return null;
  const as = paired.map((pair) => pair[0]);
  const bs = paired.map((pair) => pair[1]);
  const meanA = as.reduce((s, v) => s + v, 0) / as.length;
  const meanB = bs.reduce((s, v) => s + v, 0) / bs.length;

  let cov = 0;
  let varB = 0;
  for (let i = 0; i < paired.length; i += 1) {
    cov += (as[i] - meanA) * (bs[i] - meanB);
    varB += (bs[i] - meanB) ** 2;
  }
  if (varB === 0) return null;
  return cov / varB;
}

function normalizeAndRankAnalogs(analogs) {
  if (!analogs.length) return [];
  const scores = analogs.map((a) => a.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return analogs
    .map((item) => ({
      ...item,
      normalizedScore: Number(normalizeValue(item.score, min, max).toFixed(4))
    }))
    .sort((a, b) => (b.normalizedScore - a.normalizedScore) || a.analogEventId.localeCompare(b.analogEventId));
}

module.exports = {
  buildFeatureSet,
  mapAssetFeatures,
  findAnalogs,
  calculateScenarioProbabilities,
  eventWindowReaction,
  correlation,
  beta,
  normalizeAndRankAnalogs
};
