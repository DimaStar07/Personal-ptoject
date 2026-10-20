module.exports = {
  appName: 'Market Scenario Lab',
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  datasetMode: process.env.DATASET_MODE || 'seed'
};
