const crypto = require('crypto');
const badWords = ['блять', 'сука', 'хуй', 'пизда', 'ебать', 'мудак', 'говно', 'fuck', 'shit', 'bitch', 'damn'];
const captchas = new Map();

module.exports = {
  isProfane: (text) => badWords.some(word => text.toLowerCase().includes(word)),
  generateCaptcha: () => {
    const id = crypto.randomUUID();
    const a = Math.floor(Math.random() * 10);
    const b = Math.floor(Math.random() * 10);
    captchas.set(id, { answer: a + b, expires: Date.now() + 300000 });
    return { id, question: a + ' + ' + b + ' = ?' };
  },
  verifyCaptcha: (id, answer) => {
    const cap = captchas.get(id);
    if (!cap || Date.now() > cap.expires) return false;
    captchas.delete(id);
    return parseInt(answer) === cap.answer;
  }
};