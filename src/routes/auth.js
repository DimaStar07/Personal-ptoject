const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { isProfane, generateCaptcha, verifyCaptcha } = require('../services/authService');

router.post('/register', async (req, res) => {
  try {
    const { username, password, captchaAnswer, captchaId } = req.body;
    if (!verifyCaptcha(captchaId, captchaAnswer)) return res.status(400).json({ error: 'Неверная капча' });
    if (isProfane(username)) return res.status(400).json({ error: 'Никнейм содержит недопустимые слова' });
    if (username.length < 3) return res.status(400).json({ error: 'Никнейм слишком короткий' });
    
    const hash = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [username, hash]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows[0] || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const token = jwt.sign({ userId: result.rows[0].id, username: result.rows[0].username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.rows[0].id, username: result.rows[0].username } });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

router.get('/captcha', (req, res) => {
  res.json(generateCaptcha());
});

module.exports = router;