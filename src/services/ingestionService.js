const { query } = require('../config/database');
const { notifyUser, broadcastNews } = require('./websocketService');

const mockNews = [
  { source: 'РБК', title: 'ЦБ РФ сохранил ключевую ставку на текущем уровне', asset: 'MOEX' },
  { source: 'ТАСС', title: 'Сбербанк отчитался о рекордной чистой прибыли', asset: 'SBER' },
  { source: 'Интерфакс', title: 'Нефть марки Brent выросла на 2% на новостях ОПЕК', asset: 'LKOH' },
  { source: 'Reuters', title: 'Dollar strengthens against ruble amid new sanctions', asset: 'USD/RUB' }
];

module.exports = {
  startIngestion: (wss) => {
    console.log('Ingestion service started (Demo Mode, 60s interval)');
    setInterval(async () => {
      const news = mockNews[Math.floor(Math.random() * mockNews.length)];
      news.timestamp = new Date().toISOString();
      broadcastNews(news);
      
      try {
        const favs = await query('SELECT user_id, asset_symbol FROM user_favorites WHERE asset_symbol = $1', [news.asset]);
        favs.rows.forEach(row => {
          notifyUser(row.user_id, 'Новая новость по ' + row.asset_symbol + ': ' + news.title + ' (' + news.source + ')');
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }, 60000);
  }
};