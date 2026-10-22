const jwt = require('jsonwebtoken');
const clients = new Map();

module.exports = {
  setupWebSocket: (wss) => {
    wss.on('connection', (ws, req) => {
      const url = req.url || '';
      const token = url.split('token=')[1];
      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
          clients.set(userId, ws);
        } catch (e) {}
      }
      ws.on('close', () => {
        if (userId) clients.delete(userId);
      });
    });
  },
  notifyUser: (userId, message) => {
    const ws = clients.get(userId);
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'notification', data: message }));
  },
  broadcastNews: (news) => {
    clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'news', data: news }));
    });
  }
};