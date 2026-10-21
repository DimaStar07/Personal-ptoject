const coreAssets = [
  { symbol: 'MOEX', name: 'Индекс МосБиржи', market: 'russia', category: 'index', currency: 'RUB', exchange: 'MOEX', country: 'RU' },
  { symbol: 'SBER', name: 'Сбербанк', market: 'russia', category: 'equity', currency: 'RUB', exchange: 'MOEX', country: 'RU' },
  { symbol: 'GAZP', name: 'Газпром', market: 'russia', category: 'equity', currency: 'RUB', exchange: 'MOEX', country: 'RU' },
  { symbol: 'LKOH', name: 'ЛУКОЙЛ', market: 'russia', category: 'equity', currency: 'RUB', exchange: 'MOEX', country: 'RU' },
  { symbol: 'USD/RUB', name: 'Доллар США / Рубль', market: 'fx', category: 'currency', currency: 'RUB', exchange: 'FX', country: 'US/RU' },
  { symbol: 'EUR/RUB', name: 'Евро / Рубль', market: 'fx', category: 'currency', currency: 'RUB', exchange: 'FX', country: 'EU/RU' }
];

const additionalAssets = [
  // Российские акции
  ['ROSN', 'Роснефть'], ['NVTK', 'НОВАТЭК'], ['TATN', 'Татнефть'], ['GMKN', 'Норникель'], ['ALRS', 'АЛРОСА'],
  ['CHMF', 'Северсталь'], ['MAGN', 'ММК'], ['NLMK', 'НЛМК'], ['YDEX', 'Яндекс'], ['VKCO', 'VK'],
  ['MTSS', 'МТС'], ['AFLT', 'Аэрофлот'], ['PHOR', 'ФосАгро'], ['RUAL', 'РУСАЛ'], ['IRAO', 'Интер РАО'],
  ['SNGS', 'Сургутнефтегаз'], ['VTBR', 'ВТБ'], ['MOEX-SEC', 'Мосбиржа (акции)'], ['PIKK', 'ПИК'], ['FIVE', 'X5 Group'],
  ['BELU', 'Novabev Group'], ['AFKS', 'АФК Система'], ['BSPB', 'Банк Санкт-Петербург'], ['RTKM', 'Ростелеком'], ['HYDR', 'РусГидро'],
  // Иностранные акции
  ['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft Corp'], ['GOOGL', 'Alphabet Class A'], ['AMZN', 'Amazon.com Inc'], ['META', 'Meta Platforms'],
  ['NVDA', 'NVIDIA Corp'], ['TSLA', 'Tesla Inc'], ['JPM', 'JPMorgan Chase'], ['XOM', 'Exxon Mobil'], ['CVX', 'Chevron Corp'],
  ['BABA', 'Alibaba Group'], ['TCEHY', 'Tencent Holdings'], ['SHEL', 'Shell plc'], ['BP', 'BP plc'], ['SAP', 'SAP SE'],
  ['ASML', 'ASML Holding'], ['NESN', 'Nestle SA'], ['ORCL', 'Oracle Corp'], ['INTC', 'Intel Corp'], ['AMD', 'Advanced Micro Devices'],
  // Индексы
  ['IMOEX2', 'Индекс МосБиржи 2'], ['RTSI', 'Индекс РТС'], ['SPX', 'S&P 500'], ['NDX', 'NASDAQ 100'], ['DJI', 'Dow Jones'],
  ['DAX', 'DAX 40'], ['FTSE', 'FTSE 100'], ['HSI', 'Hang Seng'], ['N225', 'Nikkei 225'], ['STOXX', 'Euro Stoxx 50'],
  // Валюты
  ['CNY/RUB', 'Китайский юань / Рубль'], ['JPY/RUB', 'Японская иена / Рубль'], ['GBP/RUB', 'Фунт стерлингов / Рубль'],
  ['USD/CNY', 'Доллар США / Юань'], ['EUR/USD', 'Евро / Доллар США'], ['USD/JPY', 'Доллар США / Иена'], ['GBP/USD', 'Фунт / Доллар'],
  ['CHF/RUB', 'Швейцарский франк / Рубль'], ['AED/RUB', 'Дирхам / Рубль'], ['KZT/RUB', 'Тенге / Рубль'],
  // Облигации
  ['OFZ-26243', 'ОФЗ 26243'], ['OFZ-26242', 'ОФЗ 26242'], ['RGBI', 'Индекс гособлигаций RGBI'], ['UST10Y', 'US Treasury 10Y'], ['BUND10Y', 'Germany Bund 10Y'],
  ['RU-CORP-AAA', 'Индекс корп. облигаций AAA RU'], ['RU-CORP-BBB', 'Индекс корп. облигаций BBB RU'], ['EMB', 'JPM EM Bond Index proxy'],
  // ETF
  ['FXRL', 'FinEx Russian RTS UCITS ETF'], ['FXUS', 'FinEx USA UCITS ETF'], ['FXIT', 'FinEx USA IT UCITS ETF'], ['FXGD', 'FinEx Gold ETF'],
  ['SPY', 'SPDR S&P 500 ETF'], ['QQQ', 'Invesco QQQ'], ['GLD', 'SPDR Gold Shares'], ['SLV', 'iShares Silver Trust'],
  // Сырьё
  ['BRENT', 'Нефть Brent'], ['WTI', 'Нефть WTI'], ['XAU/USD', 'Золото спот'], ['XAG/USD', 'Серебро спот'], ['NG', 'Природный газ Henry Hub'],
  ['COPPER', 'Медь COMEX'], ['ALUMINUM', 'Алюминий LME'], ['WHEAT', 'Пшеница CBOT'], ['CORN', 'Кукуруза CBOT'], ['NICKEL', 'Никель LME'],
  // Криптовалюты
  ['BTC/USD', 'Bitcoin'], ['ETH/USD', 'Ethereum'], ['SOL/USD', 'Solana'], ['BNB/USD', 'BNB'], ['XRP/USD', 'XRP'],
  ['TON/USD', 'Toncoin'], ['DOGE/USD', 'Dogecoin'], ['ADA/USD', 'Cardano'], ['TRX/USD', 'TRON'], ['LTC/USD', 'Litecoin'],
  // Макроэкономика
  ['RU-CPI', 'Инфляция РФ (CPI)'], ['RU-KEYRATE', 'Ключевая ставка ЦБ РФ'], ['RU-GDP', 'ВВП РФ'], ['RU-UNEMP', 'Безработица РФ'], ['RU-INDPROD', 'Промпроизводство РФ'],
  ['US-CPI', 'Инфляция США (CPI)'], ['US-FEDFUNDS', 'Ставка ФРС'], ['US-GDP', 'ВВП США'], ['CN-CPI', 'Инфляция КНР'], ['EU-HICP', 'Инфляция еврозоны'],
  ['EU-ECB-RATE', 'Ставка ЕЦБ'], ['PMI-GLOBAL', 'Global Manufacturing PMI'], ['VIX', 'Индекс волатильности VIX'], ['MOVE', 'Индекс волатильности облигаций MOVE']
];

const categoryBySymbol = (symbol) => {
  if (symbol.includes('/')) return 'currency';
  if (symbol.startsWith('OFZ') || symbol.includes('10Y') || symbol.includes('BOND') || symbol.includes('RGBI')) return 'bond';
  if (['SPX', 'NDX', 'DJI', 'DAX', 'FTSE', 'HSI', 'N225', 'STOXX', 'RTSI', 'IMOEX2', 'VIX', 'MOVE'].includes(symbol)) return 'index';
  if (['FXRL', 'FXUS', 'FXIT', 'FXGD', 'SPY', 'QQQ', 'GLD', 'SLV'].includes(symbol)) return 'etf';
  if (['BRENT', 'WTI', 'XAU/USD', 'XAG/USD', 'NG', 'COPPER', 'ALUMINUM', 'WHEAT', 'CORN', 'NICKEL'].includes(symbol)) return 'commodity';
  if (symbol.endsWith('USD') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('DOGE') || symbol.includes('TON') || symbol.includes('ADA') || symbol.includes('TRX') || symbol.includes('LTC') || symbol.includes('BNB') || symbol.includes('XRP')) return 'crypto';
  if (symbol.includes('CPI') || symbol.includes('RATE') || symbol.includes('GDP') || symbol.includes('UNEMP') || symbol.includes('PMI') || symbol.includes('INDPROD')) return 'macro';
  return 'equity';
};

const exchangeByCategory = {
  equity: 'MOEX/NYSE/NASDAQ',
  index: 'Global Indexes',
  currency: 'FX',
  bond: 'Debt Market',
  etf: 'ETF Market',
  commodity: 'Commodity Market',
  crypto: 'Crypto Market',
  macro: 'Macro DB'
};

const marketByCategory = {
  equity: 'stocks',
  index: 'indices',
  currency: 'fx',
  bond: 'bonds',
  etf: 'funds',
  commodity: 'commodities',
  crypto: 'crypto',
  macro: 'macro'
};

const countryBySymbol = (symbol) => {
  if (symbol.startsWith('RU-') || ['SBER', 'GAZP', 'LKOH', 'MOEX', 'ROSN', 'NVTK', 'TATN', 'GMKN', 'ALRS', 'CHMF', 'MAGN', 'NLMK', 'YDEX', 'VKCO', 'MTSS', 'AFLT', 'PHOR', 'RUAL', 'IRAO', 'SNGS', 'VTBR', 'PIKK', 'FIVE', 'BELU', 'AFKS', 'BSPB', 'RTKM', 'HYDR', 'OFZ-26243', 'OFZ-26242', 'RGBI'].includes(symbol)) return 'RU';
  if (symbol.startsWith('US-') || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'XOM', 'CVX', 'ORCL', 'INTC', 'AMD', 'SPX', 'NDX', 'DJI', 'SPY', 'QQQ', 'UST10Y', 'US-CPI', 'US-FEDFUNDS', 'US-GDP', 'VIX', 'MOVE'].includes(symbol)) return 'US';
  return 'GLOBAL';
};

const currencyByCategory = {
  equity: 'USD',
  index: 'points',
  currency: 'RUB',
  bond: 'percent',
  etf: 'USD',
  commodity: 'USD',
  crypto: 'USD',
  macro: 'value'
};

const enrichedAdditionalAssets = additionalAssets.map(([symbol, name]) => {
  const category = categoryBySymbol(symbol);
  return {
    symbol,
    name,
    market: marketByCategory[category],
    category,
    currency: currencyByCategory[category],
    exchange: exchangeByCategory[category],
    country: countryBySymbol(symbol)
  };
});

const assets = [...coreAssets, ...enrichedAdditionalAssets];

const sourceCatalog = [
  { id: 'cbr', name: 'ЦБ РФ', type: 'official', trustLevel: 'high', status: 'active', endpoint: 'seed://cbr', envKey: null },
  { id: 'moex', name: 'MOEX', type: 'official', trustLevel: 'high', status: 'active', endpoint: 'seed://moex', envKey: null },
  { id: 'minfin', name: 'Минфин РФ', type: 'official', trustLevel: 'high', status: 'unconfigured', endpoint: null, envKey: 'MINFIN_API_KEY' },
  { id: 'rosstat', name: 'Росстат', type: 'official', trustLevel: 'high', status: 'unconfigured', endpoint: null, envKey: 'ROSSTAT_API_KEY' },
  { id: 'interfax', name: 'Интерфакс', type: 'media', trustLevel: 'medium', status: 'unconfigured', endpoint: null, envKey: 'INTERFAX_API_KEY' },
  { id: 'rbc', name: 'РБК', type: 'media', trustLevel: 'medium', status: 'active', endpoint: 'seed://rbc', envKey: null },
  { id: 'tass', name: 'ТАСС', type: 'media', trustLevel: 'medium', status: 'active', endpoint: 'seed://tass', envKey: null },
  { id: 'reuters', name: 'Reuters', type: 'public', trustLevel: 'high', status: 'degraded', endpoint: 'seed://reuters', envKey: null },
  { id: 'bloomberg', name: 'Bloomberg', type: 'paid', trustLevel: 'high', status: 'unconfigured', endpoint: null, envKey: 'BLOOMBERG_API_KEY' }
];

const seedDocuments = [
  {
    providerId: 'cbr',
    externalId: 'cbr-2024-10-key-rate',
    canonicalUrl: 'https://www.cbr.ru/press/key-rate-2024-10',
    publishedAt: '2024-10-25T08:00:00Z',
    title: 'ЦБ РФ сохранил жёсткую риторику по ставке',
    body: 'Инфляционные ожидания остаются повышенными. Регулятор отметил необходимость длительного периода жёстких ДКП условий.',
    tags: ['rates', 'inflation', 'macro', 'рынок'],
    assets: ['MOEX', 'SBER', 'USD/RUB']
  },
  {
    providerId: 'moex',
    externalId: 'moex-2024-09-vol',
    canonicalUrl: 'https://www.moex.com/news/volatility-2024-09',
    publishedAt: '2024-09-09T11:00:00Z',
    title: 'Рост внутридневной волатильности в индексе',
    body: 'На фоне внешнего новостного фона индекс МосБиржи показал расширение дневного диапазона.',
    tags: ['volatility', 'equity-market', 'risk', 'рынок'],
    assets: ['MOEX', 'LKOH', 'GAZP']
  },
  {
    providerId: 'rbc',
    externalId: 'rbc-2024-08-fx',
    canonicalUrl: 'https://www.rbc.ru/markets/2024/08/fx-pressure',
    publishedAt: '2024-08-13T09:30:00Z',
    title: 'Давление на рубль усилилось при росте импорта',
    body: 'Курс рубля ослаб на фоне сезонного спроса на валюту и ожиданий по платежному балансу.',
    tags: ['fx', 'currency', 'balance', 'макроэкономика'],
    assets: ['USD/RUB', 'EUR/RUB']
  },
  {
    providerId: 'tass',
    externalId: 'tass-2023-11-energy',
    canonicalUrl: 'https://tass.ru/ekonomika/energy-exports-2023-11',
    publishedAt: '2023-11-18T12:15:00Z',
    title: 'Экспортные потоки нефти и газа перестраиваются',
    body: 'Энергетические компании адаптируют логистику и структуру контрактов под изменившиеся ограничения.',
    tags: ['energy', 'commodity', 'sanctions', 'энергетика'],
    assets: ['GAZP', 'LKOH', 'BRENT']
  },
  {
    providerId: 'reuters',
    externalId: 'reuters-2022-02-shock',
    canonicalUrl: 'https://www.reuters.com/markets/europe/russia-market-shock-2022-02-24/',
    publishedAt: '2022-02-24T15:40:00Z',
    title: 'Санкционный шок и всплеск риск-премий',
    body: 'Рынок резко пересчитал риск-премии, курс рубля и акции показали экстремальные движения.',
    tags: ['sanctions', 'risk', 'shock', 'fx', 'геополитика'],
    assets: ['MOEX', 'USD/RUB', 'GAZP', 'SBER']
  },
  {
    providerId: 'cbr',
    externalId: 'cbr-2014-12-ruble',
    canonicalUrl: 'https://www.cbr.ru/press/ruble-stress-2014-12',
    publishedAt: '2014-12-16T06:00:00Z',
    title: 'Стресс на валютном рынке и экстренные меры',
    body: 'В период высокой турбулентности регулятор применил экстренные меры стабилизации.',
    tags: ['fx', 'currency', 'stress', 'rates', 'макроэкономика'],
    assets: ['USD/RUB', 'EUR/RUB', 'MOEX']
  },
  {
    providerId: 'moex',
    externalId: 'moex-2020-03-pandemic',
    canonicalUrl: 'https://www.moex.com/news/pandemic-vol-2020-03',
    publishedAt: '2020-03-19T10:00:00Z',
    title: 'Пандемический шок и рост волатильности',
    body: 'Индекс и отдельные бумаги испытали высокую просадку и последующую фазу восстановления.',
    tags: ['crisis', 'volatility', 'macro', 'equity-market', 'рынок'],
    assets: ['MOEX', 'SBER', 'LKOH']
  }
];

function pseudoRandom(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function generateSeries(symbol, startPrice, drift, seasonalAmp, shockDirection) {
  const out = [];
  let price = startPrice;
  const start = new Date('2012-01-01T00:00:00Z');

  for (let i = 0; i < 180; i += 1) {
    const date = new Date(start);
    date.setUTCMonth(start.getUTCMonth() + i);
    const season = Math.sin(i / 6) * seasonalAmp;
    const noise = (pseudoRandom(i + symbol.length) - 0.5) * seasonalAmp * 0.8;

    if (i === 35 || i === 122) {
      price *= shockDirection === 'up' ? 1.18 : 0.8;
    }
    if (i === 108) {
      price *= shockDirection === 'up' ? 1.1 : 0.78;
    }

    price = Math.max(1, price * (1 + drift + season * 0.005 + noise * 0.004));

    out.push({
      date: date.toISOString().slice(0, 10),
      close: Number(price.toFixed(4))
    });
  }

  return out;
}

const priceSeries = {
  MOEX: generateSeries('MOEX', 1450, 0.004, 1.4, 'down'),
  SBER: generateSeries('SBER', 82, 0.006, 2, 'down'),
  GAZP: generateSeries('GAZP', 118, 0.0034, 2.4, 'down'),
  LKOH: generateSeries('LKOH', 1680, 0.0066, 1.7, 'down'),
  'USD/RUB': generateSeries('USD/RUB', 30, 0.005, 1.3, 'up'),
  'EUR/RUB': generateSeries('EUR/RUB', 40, 0.0047, 1.4, 'up'),
  BRENT: generateSeries('BRENT', 70, 0.0022, 1.8, 'down'),
  'XAU/USD': generateSeries('XAU/USD', 1300, 0.0032, 1.1, 'up'),
  'BTC/USD': generateSeries('BTC/USD', 6000, 0.008, 2.9, 'up')
};

module.exports = {
  assets,
  sourceCatalog,
  seedDocuments,
  priceSeries
};
