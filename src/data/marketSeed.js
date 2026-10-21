const assets = [
  { symbol: 'MOEX', name: 'Индекс МосБиржи', market: 'russia', category: 'index', currency: 'RUB' },
  { symbol: 'SBER', name: 'Сбербанк', market: 'russia', category: 'equity', currency: 'RUB' },
  { symbol: 'GAZP', name: 'Газпром', market: 'russia', category: 'equity', currency: 'RUB' },
  { symbol: 'LKOH', name: 'ЛУКОЙЛ', market: 'russia', category: 'equity', currency: 'RUB' },
  { symbol: 'USD/RUB', name: 'Доллар США / Рубль', market: 'fx', category: 'currency', currency: 'RUB' },
  { symbol: 'EUR/RUB', name: 'Евро / Рубль', market: 'fx', category: 'currency', currency: 'RUB' }
];

const sourceCatalog = [
  { id: 'demo-cbr', name: 'ЦБ РФ (demo)', type: 'public', trustLevel: 'high', status: 'active', endpoint: 'seed://cbr' },
  { id: 'demo-moex', name: 'MOEX (demo)', type: 'public', trustLevel: 'high', status: 'active', endpoint: 'seed://moex' },
  { id: 'demo-rbc', name: 'РБК (demo)', type: 'media', trustLevel: 'medium', status: 'active', endpoint: 'seed://rbc' },
  { id: 'demo-taas', name: 'ТАСС (demo)', type: 'media', trustLevel: 'medium', status: 'active', endpoint: 'seed://tass' },
  { id: 'reuters-public', name: 'Reuters public feed (demo)', type: 'public', trustLevel: 'high', status: 'degraded', endpoint: 'seed://reuters' },
  { id: 'bloomberg-paid', name: 'Bloomberg API', type: 'paid', trustLevel: 'high', status: 'unconfigured', endpoint: null }
];

const seedDocuments = [
  {
    providerId: 'demo-cbr',
    externalId: 'cbr-2024-10-key-rate',
    canonicalUrl: 'https://www.cbr.ru/press/key-rate-2024-10',
    publishedAt: '2024-10-25T08:00:00Z',
    title: 'ЦБ РФ сохранил жёсткую риторику по ставке',
    body: 'Инфляционные ожидания остаются повышенными. Регулятор отметил необходимость длительного периода жёстких ДКП условий.',
    tags: ['rates', 'inflation', 'macro'],
    assets: ['MOEX', 'SBER', 'USD/RUB']
  },
  {
    providerId: 'demo-moex',
    externalId: 'moex-2024-09-vol',
    canonicalUrl: 'https://www.moex.com/news/volatility-2024-09',
    publishedAt: '2024-09-09T11:00:00Z',
    title: 'Рост внутридневной волатильности в индексе',
    body: 'На фоне внешнего новостного фона индекс МосБиржи показал расширение дневного диапазона.',
    tags: ['volatility', 'equity-market', 'risk'],
    assets: ['MOEX', 'LKOH', 'GAZP']
  },
  {
    providerId: 'demo-rbc',
    externalId: 'rbc-2024-08-fx',
    canonicalUrl: 'https://www.rbc.ru/markets/2024/08/fx-pressure',
    publishedAt: '2024-08-13T09:30:00Z',
    title: 'Давление на рубль усилилось при росте импорта',
    body: 'Курс рубля ослаб на фоне сезонного спроса на валюту и ожиданий по платежному балансу.',
    tags: ['fx', 'currency', 'balance'],
    assets: ['USD/RUB', 'EUR/RUB']
  },
  {
    providerId: 'demo-taas',
    externalId: 'tass-2023-11-energy',
    canonicalUrl: 'https://tass.ru/ekonomika/energy-exports-2023-11',
    publishedAt: '2023-11-18T12:15:00Z',
    title: 'Экспортные потоки нефти и газа перестраиваются',
    body: 'Энергетические компании адаптируют логистику и структуру контрактов под изменившиеся ограничения.',
    tags: ['energy', 'commodity', 'sanctions'],
    assets: ['GAZP', 'LKOH']
  },
  {
    providerId: 'reuters-public',
    externalId: 'reuters-2022-02-shock',
    canonicalUrl: 'https://www.reuters.com/markets/europe/russia-market-shock-2022-02-24/',
    publishedAt: '2022-02-24T15:40:00Z',
    title: 'Санкционный шок и всплеск риск-премий',
    body: 'Рынок резко пересчитал риск-премии, курс рубля и акции показали экстремальные движения.',
    tags: ['sanctions', 'risk', 'shock', 'fx'],
    assets: ['MOEX', 'USD/RUB', 'GAZP', 'SBER']
  },
  {
    providerId: 'demo-cbr',
    externalId: 'cbr-2014-12-ruble',
    canonicalUrl: 'https://www.cbr.ru/press/ruble-stress-2014-12',
    publishedAt: '2014-12-16T06:00:00Z',
    title: 'Стресс на валютном рынке и экстренные меры',
    body: 'В период высокой турбулентности регулятор применил экстренные меры стабилизации.',
    tags: ['fx', 'currency', 'stress', 'rates'],
    assets: ['USD/RUB', 'EUR/RUB', 'MOEX']
  },
  {
    providerId: 'demo-moex',
    externalId: 'moex-2020-03-pandemic',
    canonicalUrl: 'https://www.moex.com/news/pandemic-vol-2020-03',
    publishedAt: '2020-03-19T10:00:00Z',
    title: 'Пандемический шок и рост волатильности',
    body: 'Индекс и отдельные бумаги испытали высокую просадку и последующую фазу восстановления.',
    tags: ['crisis', 'volatility', 'macro', 'equity-market'],
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
  'EUR/RUB': generateSeries('EUR/RUB', 40, 0.0047, 1.4, 'up')
};

module.exports = {
  assets,
  sourceCatalog,
  seedDocuments,
  priceSeries
};
