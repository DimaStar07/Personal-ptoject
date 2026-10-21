function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function mean(values) {
  const filtered = values.filter(Number.isFinite);
  if (!filtered.length) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

function std(values) {
  const m = mean(values);
  if (m == null) return null;
  const variance = mean(values.map((v) => (v - m) ** 2));
  if (variance == null) return null;
  return Math.sqrt(variance);
}

function logReturns(series) {
  if (!Array.isArray(series) || series.length < 2) return [];

  const out = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1]?.close;
    const curr = series[i]?.close;
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0 || curr <= 0) {
      out.push(null);
    } else {
      out.push(Math.log(curr / prev));
    }
  }
  return out;
}

function rollingVolatility(returns, window) {
  if (!Array.isArray(returns) || window <= 1) return null;
  const clean = returns.filter(Number.isFinite);
  if (clean.length < window) return null;
  const segment = clean.slice(-window);
  return std(segment);
}

function momentum(series, window) {
  if (!Array.isArray(series) || series.length <= window) return null;
  const from = series[series.length - 1 - window]?.close;
  const to = series[series.length - 1]?.close;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return (to - from) / from;
}

function maxDrawdown(series, window) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const sliced = series.slice(-window);
  if (!sliced.length) return null;

  let peak = sliced[0].close;
  let minDrawdown = 0;
  for (const point of sliced) {
    if (!Number.isFinite(point.close)) continue;
    peak = Math.max(peak, point.close);
    const dd = (point.close - peak) / peak;
    minDrawdown = Math.min(minDrawdown, dd);
  }
  return minDrawdown;
}

function normalizeValue(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return 0.5;
  }
  return clamp((value - min) / (max - min));
}

function cosineSimilarity(a, b) {
  if (!a.length || !b.length || a.length !== b.length) return null;
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i]) || 0;
    const y = Number(b[i]) || 0;
    dot += x * y;
    ma += x * x;
    mb += y * y;
  }
  if (ma === 0 || mb === 0) return null;
  return clamp((dot / (Math.sqrt(ma) * Math.sqrt(mb)) + 1) / 2);
}

function softmax(values) {
  if (!values.length) return [];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  if (!Number.isFinite(sum) || sum === 0) return values.map(() => 1 / values.length);
  return exps.map((v) => v / sum);
}

module.exports = {
  clamp,
  mean,
  std,
  logReturns,
  rollingVolatility,
  momentum,
  maxDrawdown,
  normalizeValue,
  cosineSimilarity,
  softmax
};
