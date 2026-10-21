module.exports = {
  featureWindows: {
    momentumShort: 20,
    momentumMedium: 60,
    momentumLong: 120,
    volatility: 30,
    drawdown: 120,
    correlation: 90
  },
  similarityWeights: {
    factor: 0.25,
    priceBehavior: 0.25,
    volatility: 0.2,
    cyclePhase: 0.15,
    semantic: 0.15
  },
  missingDataPenalty: 0.08,
  scenarioModel: {
    priorLogOdds: {
      base: 0.2,
      bear: -0.05,
      bull: -0.15,
      shock: -0.55
    },
    evidenceWeights: {
      analogStrength: 1.1,
      marketStress: 0.9,
      positiveMomentum: 0.8,
      eventShock: 1.2,
      coverage: 0.7
    },
    confidenceFloor: 0.25
  }
};
