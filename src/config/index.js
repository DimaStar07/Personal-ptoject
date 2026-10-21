module.exports = {
  appName: 'Платформа вероятностных сценариев',
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  datasetMode: process.env.DATASET_MODE || 'seed',
  ingestionIntervalMinutes: Number(process.env.INGESTION_INTERVAL_MINUTES || 180),
  ingestionTimeoutMs: Number(process.env.INGESTION_TIMEOUT_MS || 4000),
  ingestionMaxRetries: Number(process.env.INGESTION_MAX_RETRIES || 2),
  ingestionRateLimitPerSecond: Number(process.env.INGESTION_RATE_LIMIT_PER_SECOND || 2)
};
