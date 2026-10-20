const assets = [
  {
    symbol: 'MOEX',
    name: 'MOEX Russia Index',
    market: 'russia',
    category: 'index',
    currency: 'RUB',
    tags: ['equity-market', 'risk', 'liquidity', 'macro']
  },
  {
    symbol: 'SBER',
    name: 'Sberbank',
    market: 'russia',
    category: 'equity',
    currency: 'RUB',
    tags: ['banking', 'rates', 'capitalization', 'macro']
  },
  {
    symbol: 'GAZP',
    name: 'Gazprom',
    market: 'russia',
    category: 'equity',
    currency: 'RUB',
    tags: ['energy', 'exports', 'currency', 'commodity']
  },
  {
    symbol: 'LKOH',
    name: 'LUKOIL',
    market: 'russia',
    category: 'equity',
    currency: 'RUB',
    tags: ['oil', 'energy', 'commodity', 'sanctions']
  },
  {
    symbol: 'USD/RUB',
    name: 'US Dollar / Russian Ruble',
    market: 'fx',
    category: 'currency',
    currency: 'RUB',
    tags: ['fx', 'currency', 'rates', 'sanctions']
  },
  {
    symbol: 'EUR/RUB',
    name: 'Euro / Russian Ruble',
    market: 'fx',
    category: 'currency',
    currency: 'RUB',
    tags: ['fx', 'currency', 'euro', 'risk']
  }
];

const events = [
  {
    id: 'evt-2024-01',
    assetSymbol: 'USD/RUB',
    date: '2024-01-18',
    title: 'CBR raises key rate to curb inflation and ruble pressure',
    summary: 'The central bank hikes the policy rate as inflation and depreciation pressure persist.',
    importance: 92,
    tags: ['rates', 'inflation', 'currency', 'macro'],
    source: 'CBR',
    sourceUrl: 'https://www.cbr.ru',
    impact: 'high',
    region: 'Russia'
  },
  {
    id: 'evt-2024-02',
    assetSymbol: 'MOEX',
    date: '2024-02-09',
    title: 'FX risk and capital outflow concerns hit Russian equity benchmark',
    summary: 'Banking and export sectors are under pressure as currency volatility rises.',
    importance: 80,
    tags: ['equity-market', 'risk', 'currency', 'liquidity'],
    source: 'MOEX',
    sourceUrl: 'https://www.moex.com',
    impact: 'medium',
    region: 'Russia'
  },
  {
    id: 'evt-2023-01',
    assetSymbol: 'SBER',
    date: '2023-10-20',
    title: 'Banking sector re-prices under higher rate expectations',
    summary: 'Sberbank and peers adjust as the policy cycle tightens and credit conditions worsen.',
    importance: 78,
    tags: ['banking', 'rates', 'equity', 'macro'],
    source: 'Sberbank',
    sourceUrl: 'https://www.sberbank.com',
    impact: 'medium',
    region: 'Russia'
  },
  {
    id: 'evt-2022-01',
    assetSymbol: 'GAZP',
    date: '2022-02-24',
    title: 'Large geopolitical shock reshapes energy logistics and pricing',
    summary: 'The market re-prices energy exposure under sanctions and transport disruption.',
    importance: 96,
    tags: ['energy', 'sanctions', 'commodity', 'geopolitics'],
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com',
    impact: 'high',
    region: 'Europe'
  },
  {
    id: 'evt-2022-02',
    assetSymbol: 'USD/RUB',
    date: '2022-02-25',
    title: 'Ruble collapses under sanctions and capital controls',
    summary: 'The currency sharpens volatility as external restrictions and market disruption intensify.',
    importance: 98,
    tags: ['fx', 'sanctions', 'currency', 'risk'],
    source: 'CBR',
    sourceUrl: 'https://www.cbr.ru',
    impact: 'high',
    region: 'Russia'
  },
  {
    id: 'evt-2020-01',
    assetSymbol: 'MOEX',
    date: '2020-03-19',
    title: 'Pandemic shock hits Russian equities and liquidity',
    summary: 'Risk assets fall sharply as liquidity pressure and global volatility spike.',
    importance: 90,
    tags: ['equity-market', 'liquidity', 'crisis', 'macro'],
    source: 'MOEX',
    sourceUrl: 'https://www.moex.com',
    impact: 'high',
    region: 'Russia'
  },
  {
    id: 'evt-2014-01',
    assetSymbol: 'USD/RUB',
    date: '2014-12-16',
    title: 'FX depreciation and capital outflow accelerate under currency stress',
    summary: 'The ruble weakens as central bank interventions and macro risk intensify.',
    importance: 87,
    tags: ['fx', 'currency', 'risk', 'capital-outflow'],
    source: 'CBR',
    sourceUrl: 'https://www.cbr.ru',
    impact: 'high',
    region: 'Russia'
  },
  {
    id: 'evt-2014-02',
    assetSymbol: 'MOEX',
    date: '2014-12-01',
    title: 'Equity market weakens amid falling oil and policy uncertainty',
    summary: 'The index drops as oil prices and confidence both deteriorate.',
    importance: 84,
    tags: ['equity-market', 'oil', 'risk', 'macro'],
    source: 'MOEX',
    sourceUrl: 'https://www.moex.com',
    impact: 'high',
    region: 'Russia'
  },
  {
    id: 'evt-2015-01',
    assetSymbol: 'LKOH',
    date: '2015-01-30',
    title: 'Oil price collapse amplifies pressure on hydrocarbon majors',
    summary: 'Commodity concentration and weaker global demand compress the sector.',
    importance: 88,
    tags: ['oil', 'energy', 'commodity', 'macro'],
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com',
    impact: 'high',
    region: 'Global'
  },
  {
    id: 'evt-2021-01',
    assetSymbol: 'SBER',
    date: '2021-06-17',
    title: 'Banks benefit from credit growth once macro conditions stabilize',
    summary: 'Higher confidence and stronger credit demand support the banking sector.',
    importance: 66,
    tags: ['banking', 'growth', 'rates', 'equity'],
    source: 'Sberbank',
    sourceUrl: 'https://www.sberbank.com',
    impact: 'medium',
    region: 'Russia'
  }
];

module.exports = { assets, events };
