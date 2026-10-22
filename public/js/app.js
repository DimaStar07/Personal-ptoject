let ws;
let currentUser = null;
let currentAsset = 'SBER';
let chart;
let candleSeries;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initChart();
  initAuth();
  initWebSocket();
  loadAssets();
  
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  document.getElementById('assetSearch').addEventListener('input', handleSearch);
  document.getElementById('favBtn').addEventListener('click', toggleFavorite);
});

function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  if (chart) {
    chart.applyOptions({ 
      layout: { 
        background: { color: next === 'dark' ? '#131722' : '#ffffff' }, 
        textColor: next === 'dark' ? '#d1d4dc' : '#131722' 
      },
      grid: { vertLines: { color: next === 'dark' ? '#2a2e39' : '#e0e3eb' }, horzLines: { color: next === 'dark' ? '#2a2e39' : '#e0e3eb' } }
    });
  }
}

function initChart() {
  const chartContainer = document.getElementById('chart');
  const theme = document.documentElement.getAttribute('data-theme');
  chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: { background: { color: theme === 'dark' ? '#131722' : '#ffffff' }, textColor: theme === 'dark' ? '#d1d4dc' : '#131722' },
    grid: { vertLines: { color: theme === 'dark' ? '#2a2e39' : '#e0e3eb' }, horzLines: { color: theme === 'dark' ? '#2a2e39' : '#e0e3eb' } },
    timeScale: { timeVisible: true, secondsVisible: false }
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350'
  });
  generateMockData();
  window.addEventListener('resize', () => chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight }));
}

function generateMockData() {
  const data = [];
  let price = currentAsset === 'USD/RUB' ? 95 : 250;
  for (let i = 0; i < 150; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (150 - i));
    const open = price;
    const close = price + (Math.random() - 0.5) * (price * 0.05);
    const high = Math.max(open, close) + Math.random() * (price * 0.02);
    const low = Math.min(open, close) - Math.random() * (price * 0.02);
    data.push({ time: date.toISOString().split('T')[0], open: parseFloat(open.toFixed(2)), high: parseFloat(high.toFixed(2)), low: parseFloat(low.toFixed(2)), close: parseFloat(close.toFixed(2)) });
    price = close;
  }
  candleSeries.setData(data);
  candleSeries.setMarkers([{ time: data[100].time, position: 'aboveBar', color: '#f68410', shape: 'circle', text: 'Event' }]);
}

function initAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    currentUser = JSON.parse(localStorage.getItem('user'));
    updateAuthUI();
    loadFavorites();
  } else {
    updateAuthUI();
  }
  
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      document.getElementById('modal').style.display = 'flex';
      document.getElementById('modalTitle').textContent = 'Вход';
      document.getElementById('captchaBox').style.display = 'none';
      document.getElementById('authError').textContent = '';
    });
  }
  
  document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
  });
  
  document.getElementById('authForm').addEventListener('submit', handleAuth);
}

async function handleAuth(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const isRegister = document.getElementById('modalTitle').textContent === 'Регистрация';
  
  const payload = { username, password };
  if (isRegister) {
    payload.captchaAnswer = document.getElementById('captchaAnswer').value;
    payload.captchaId = window.currentCaptchaId;
  }
  
  const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  if (!res.ok) {
    document.getElementById('authError').textContent = data.error;
    if (isRegister && (data.error.includes('Никнейм') || data.error.includes('короткий'))) {
      document.getElementById('captchaBox').style.display = 'block';
      loadCaptcha();
    }
    return;
  }
  
  if (isRegister) {
    document.getElementById('modalTitle').textContent = 'Вход';
    document.getElementById('authError').textContent = 'Успешно! Теперь войдите.';
    document.getElementById('captchaBox').style.display = 'none';
    return;
  }
  
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  currentUser = data.user;
  document.getElementById('modal').style.display = 'none';
  updateAuthUI();
  initWebSocket();
  loadFavorites();
}

async function loadCaptcha() {
  const res = await fetch('/api/auth/captcha');
  const data = await res.json();
  window.currentCaptchaId = data.id;
  document.getElementById('captchaQuestion').textContent = 'Проверка: ' + data.question;
}

function updateAuthUI() {
  const section = document.getElementById('authSection');
  if (currentUser) {
    section.innerHTML = '<span style="margin-right:10px; font-weight:500;">' + currentUser.username + '</span> <button onclick="logout()" style="background:#ef5350;">Выйти</button>';
  } else {
    section.innerHTML = '<button id="loginBtn">Войти</button> <button onclick="showRegister()" style="background:transparent; border:1px solid var(--accent); color:var(--accent);">Регистрация</button>';
    setTimeout(() => {
      const btn = document.getElementById('loginBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          document.getElementById('modal').style.display = 'flex';
          document.getElementById('modalTitle').textContent = 'Вход';
          document.getElementById('captchaBox').style.display = 'none';
          document.getElementById('authError').textContent = '';
        });
      }
    }, 0);
  }
}

window.showRegister = () => {
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modalTitle').textContent = 'Регистрация';
  document.getElementById('captchaBox').style.display = 'block';
  document.getElementById('authError').textContent = '';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('captchaAnswer').value = '';
  loadCaptcha();
};

window.logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateAuthUI();
  if (ws) ws.close();
  document.getElementById('favBtn').classList.remove('active');
  document.getElementById('favBtn').textContent = 'В избранное';
};

function initWebSocket() {
  if (ws) ws.close();
  const token = localStorage.getItem('token');
  const wsUrl = 'ws://' + window.location.host + '?token=' + (token || '');
  ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'news') {
      addNewsItem(msg.data);
    } else if (msg.type === 'notification') {
      showNotification(msg.data);
    }
  };
  
  ws.onclose = () => {
    setTimeout(initWebSocket, 3000);
  };
}

function addNewsItem(news) {
  const feed = document.getElementById('newsFeed');
  const li = document.createElement('li');
  li.innerHTML = '<strong>[' + news.source + ']</strong> ' + news.title + ' <br><small style="color:var(--text-secondary)">' + new Date(news.timestamp).toLocaleTimeString() + '</small>';
  feed.prepend(li);
  if (feed.children.length > 20) feed.lastChild.remove();
}

function showNotification(message) {
  const div = document.createElement('div');
  div.className = 'notification';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translateX(120%)';
    setTimeout(() => div.remove(), 400);
  }, 5000);
}

async function loadAssets() {
  const res = await fetch('/api/assets');
  const assets = await res.json();
  window.assetsList = assets;
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.style.display = 'none'; return; }
  
  const filtered = window.assetsList.filter(a => a.symbol.toLowerCase().includes(query) || a.name.toLowerCase().includes(query));
  results.innerHTML = filtered.map(a => '<div onclick="selectAsset(\'' + a.symbol + '\')"><strong>' + a.symbol + '</strong> - ' + a.name + '</div>').join('');
  results.style.display = filtered.length ? 'block' : 'none';
}

window.selectAsset = (symbol) => {
  currentAsset = symbol;
  document.getElementById('currentAsset').textContent = symbol;
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('assetSearch').value = '';
  generateMockData();
  loadScenarios(symbol);
  checkFavorite(symbol);
};

async function loadScenarios(symbol) {
  const res = await fetch('/api/scenarios/' + symbol);
  const data = await res.json();
  const container = document.getElementById('scenarioTree');
  container.innerHTML = data.branches.map(b => {
    const color = b.type === 'bull' ? '#26a69a' : b.type === 'bear' ? '#ef5350' : b.type === 'shock' ? '#ff9800' : '#2962ff';
    return '<div style="padding: 12px; margin: 8px 0; background: var(--bg-primary); border-left: 4px solid ' + color + '; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
      '<div style="display:flex; justify-content:space-between; margin-bottom:4px;">' +
      '<strong style="text-transform:uppercase;">' + b.type + '</strong>' +
      '<strong style="color:var(--accent);">' + b.probability + '%</strong>' +
      '</div>' +
      '<div style="font-size:0.85rem; margin-bottom:4px;">Триггер: ' + b.triggers + '</div>' +
      '<div style="font-size:0.8rem; color:var(--text-secondary);">Источник: ' + b.sources + '</div>' +
      '</div>';
  }).join('');
}

async function toggleFavorite() {
  if (!currentUser) return alert('Сначала войдите в систему');
  const btn = document.getElementById('favBtn');
  const isFav = btn.classList.contains('active');
  
  await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
    body: JSON.stringify({ asset_symbol: currentAsset })
  });
  
  if (!isFav) {
    btn.classList.add('active');
    btn.textContent = 'В избранном';
    showNotification(currentAsset + ' добавлен в избранное. Вы будете получать уведомления.');
  }
}

async function checkFavorite(symbol) {
  if (!currentUser) {
    document.getElementById('favBtn').classList.remove('active');
    document.getElementById('favBtn').textContent = 'В избранное';
    return;
  }
  const res = await fetch('/api/favorites', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
  const favs = await res.json();
  const btn = document.getElementById('favBtn');
  if (favs.includes(symbol)) {
    btn.classList.add('active');
    btn.textContent = 'В избранном';
  } else {
    btn.classList.remove('active');
    btn.textContent = 'В избранное';
  }
}

async function loadFavorites() {
  checkFavorite(currentAsset);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
  document.getElementById(tabName + 'Tab').classList.add('active');
}