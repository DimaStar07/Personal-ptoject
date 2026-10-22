const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const { initDB } = require('./src/config/database');
const { startIngestion } = require('./src/services/ingestionService');
const { setupWebSocket } = require('./src/services/websocketService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

setupWebSocket(wss);

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
    startIngestion(wss);
  });
}).catch(err => {
  console.error('DB Init Error:', err);
  process.exit(1);
});