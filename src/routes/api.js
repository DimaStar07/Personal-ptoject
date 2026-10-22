const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) { res.status(401).json({ error: 'Неверный токен' }); }
};

router.get('/market/today', async (req, res) => {
  res.json({ status: 'ok', message: 'Рынок стабилен, аналогов не обнаружено' });
});

router.get('/assets', async (req, res) => {
  const result = await query('SELECT * FROM assets');
  res.json(result.rows);
});

router.post('/favorites', authMiddleware, async (req, res) => {
  const { asset_symbol } = req.body;
  await query('INSERT INTO user_favorites (user_id, asset_symbol) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.userId, asset_symbol]);
  res.json({ success: true });
});

router.get('/favorites', authMiddleware, async (req, res) => {
  const result = await query('SELECT asset_symbol FROM user_favorites WHERE user_id = $1', [req.user.userId]);
  res.json(result.rows.map(r => r.asset_symbol));
});

router.get('/scenarios/:symbol', async (req, res) => {
  res.json({
    symbol: req.params.symbol,
    branches: [
      { type: 'base', probability: 60, triggers: 'Ставка без изменений', sources: 'ЦБ РФ' },
      { type: 'bear', probability: 25, triggers: 'Усиление санкционного давления', sources: 'РБК, Reuters' },
      { type: 'bull', probability: 10, triggers: 'Смягчение денежно-кредитной риторики', sources: 'ТАСС' },
      { type: 'shock', probability: 5, triggers: 'Черный лебедь (геополитика)', sources: 'Исторические аналоги' }
    ]
  });
});

module.exports = router;