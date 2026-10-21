async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Ошибка ${response.status}`);
  return response.json();
}

const state = {
  selectedSymbol: 'MOEX',
  selectedEventId: null,
  assets: [],
  today: null,
  assetSnapshot: null,
  events: [],
  analogs: [],
  status: null,
  view: 'today'
};

const pageTitle = document.getElementById('page-title');
const assetList = document.getElementById('asset-list');
const refreshButton = document.getElementById('refresh-button');
const views = {
  today: document.getElementById('view-today'),
  asset: document.getElementById('view-asset'),
  event: document.getElementById('view-event'),
  analogs: document.getElementById('view-analogs'),
  status: document.getElementById('view-status')
};

function setView(viewId) {
  state.view = viewId;
  Object.entries(views).forEach(([id, element]) => {
    element.classList.toggle('active', id === viewId);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === viewId);
  });
  const titles = {
    today: 'Рынок сегодня',
    asset: `Актив ${state.selectedSymbol}`,
    event: 'Событие',
    analogs: 'Исторические аналоги',
    status: 'Статус автономной загрузки'
  };
  pageTitle.textContent = titles[viewId] || 'Рынок сегодня';
}

function loadingBlock(text = 'Загрузка...') {
  return `<div class="card"><p class="empty">${text}</p></div>`;
}

function emptyBlock(text) {
  return `<div class="card"><p class="empty">${text}</p></div>`;
}

function renderAssetButtons() {
  assetList.innerHTML = '';
  state.assets.forEach((asset) => {
    const button = document.createElement('button');
    button.className = `asset-button ${asset.symbol === state.selectedSymbol ? 'active' : ''}`;
    button.textContent = `${asset.symbol} · ${asset.category}`;
    button.addEventListener('click', async () => {
      state.selectedSymbol = asset.symbol;
      renderAssetButtons();
      await loadAssetSnapshot(asset.symbol);
      await loadAnalogs(asset.symbol);
      renderAssetView();
    });
    assetList.appendChild(button);
  });
}

function scoreBadge(score) {
  if (score >= 0.75) return 'ok';
  if (score >= 0.45) return 'warn';
  return 'danger';
}

function renderTodayView() {
  const root = views.today;
  if (!state.today) {
    root.innerHTML = loadingBlock('Загрузка раздела «Рынок сегодня»...');
    return;
  }

  const assetsCards = state.today.scenarioOverview.map((row) => `
    <article class="item">
      <div class="item-head">
        <strong>${row.symbol}</strong>
        <span class="badge ${scoreBadge((row.probability || 0) / 100)}">${row.probability}%</span>
      </div>
      <p>${row.branch}</p>
      <div class="meta">confidence ${row.confidence} · ${row.disclaimer}</div>
    </article>
  `).join('');

  const eventCards = (state.today.latestEvents || []).map((event) => `
    <article class="item">
      <strong>${event.title}</strong>
      <div class="meta">${event.occurredAt.slice(0, 10)} · ${event.primaryAsset} · ${event.eventType}</div>
    </article>
  `).join('');

  const signalCards = (state.today.activeSignals || []).map((signal) => `
    <article class="item">
      <strong>${signal.assetSymbol}</strong>
      <p>${signal.summary}</p>
      <div class="meta">${signal.createdAt.slice(0, 16).replace('T', ' ')}</div>
    </article>
  `).join('');

  root.innerHTML = `
    <div class="summary-grid">
      <div class="card"><span class="label">Состояние данных</span><strong>${state.today.dataStatus.events}</strong></div>
      <div class="card"><span class="label">Последнее обновление</span><strong>${state.today.generatedAt.slice(0, 16).replace('T', ' ')}</strong></div>
      <div class="card"><span class="label">Вертикаль</span><strong>MOEX + USD/RUB + EUR/RUB</strong></div>
    </div>
    <div class="content-grid">
      <section class="card"><span class="label">Текущие сценарии</span><div class="list">${assetsCards || '<p class="empty">Нет данных</p>'}</div></section>
      <section class="card"><span class="label">Свежие события</span><div class="list">${eventCards || '<p class="empty">Нет событий</p>'}</div></section>
    </div>
    <section class="card"><span class="label">Журнал сигналов</span><div class="list">${signalCards || '<p class="empty">Нет сигналов</p>'}</div></section>
  `;
}

function renderAssetView() {
  const root = views.asset;
  const snapshot = state.assetSnapshot;
  if (!snapshot) {
    root.innerHTML = loadingBlock('Загрузка страницы актива...');
    return;
  }

  const scenarios = (snapshot.scenarios || []).map((scenario) => `
    <article class="item">
      <div class="item-head">
        <strong>${scenario.label}</strong>
        <span class="badge ${scoreBadge((scenario.probability || 0) / 100)}">${scenario.probability}%</span>
      </div>
      <p>Горизонт: ${scenario.horizonDays} дн. · confidence ${scenario.confidence} · coverage ${scenario.coverage}</p>
      <div class="meta">Триггеры: ${scenario.triggers.join(', ')}</div>
      <div class="meta">Подтверждение: ${scenario.confirmationSignals.join(', ')}</div>
      <div class="meta">Отмена: ${scenario.invalidationSignals.join(', ')}</div>
    </article>
  `).join('');

  const analogs = (snapshot.analogs || []).slice(0, 5).map((analog) => `
    <article class="item">
      <div class="item-head">
        <strong>${analog.assetSymbol} · ${analog.date.slice(0, 10)}</strong>
        <span class="badge ${scoreBadge(analog.score)}">score ${analog.score}</span>
      </div>
      <p>${analog.title}</p>
      <div class="meta">Факторы: ${(analog.matchedFactors || []).join(', ') || '—'}</div>
    </article>
  `).join('');

  const events = (snapshot.events || []).slice(0, 6).map((event) => `
    <article class="item">
      <div class="item-head">
        <strong>${event.title}</strong>
        <button class="nav-btn" data-event-id="${event.id}">Открыть</button>
      </div>
      <div class="meta">${event.occurredAt.slice(0, 10)} · ${event.eventType} · ${event.status}</div>
    </article>
  `).join('');

  const chartData = (snapshot.series || []).slice(-10).map((point) => `${point.date.slice(2)}: ${point.close.toFixed(2)}`).join('<br/>');
  const context = snapshot.contextSnapshot || {};

  root.innerHTML = `
    <div class="summary-grid">
      <div class="card"><span class="label">Актив</span><strong>${snapshot.asset.name} (${snapshot.asset.symbol})</strong></div>
      <div class="card"><span class="label">Фаза цикла</span><strong>${context.feature?.phase || 'нет данных'}</strong></div>
      <div class="card"><span class="label">Vol 30</span><strong>${context.feature?.volatility30?.toFixed?.(4) || 'n/a'}</strong></div>
    </div>
    <div class="content-grid">
      <section class="card"><span class="label">Дерево сценариев</span><div class="list">${scenarios || '<p class="empty">Нет сценариев</p>'}</div></section>
      <section class="card"><span class="label">Исторические аналоги</span><div class="list">${analogs || '<p class="empty">Нет аналогов</p>'}</div></section>
    </div>
    <div class="content-grid">
      <section class="card"><span class="label">Динамика (последние 10 точек)</span><div class="meta">${chartData || 'Нет ряда'}</div></section>
      <section class="card"><span class="label">Контекстные признаки</span>
        <div class="meta">drawdown120: ${context.feature?.drawdown120?.toFixed?.(4) || 'n/a'}</div>
        <div class="meta">momentum60: ${context.feature?.momentumMedium?.toFixed?.(4) || 'n/a'}</div>
        <div class="meta">event-window reaction: ${context.eventWindowReaction?.toFixed?.(4) || 'n/a'}</div>
        <div class="meta">corr/beta к MOEX: ${context.correlationToMoex?.toFixed?.(3) || 'n/a'} / ${context.betaToMoex?.toFixed?.(3) || 'n/a'}</div>
      </section>
    </div>
    <section class="card"><span class="label">События по активу</span><div class="list">${events || '<p class="empty">Нет событий</p>'}</div></section>
  `;

  root.querySelectorAll('[data-event-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.selectedEventId = btn.dataset.eventId;
      await loadEvent(state.selectedEventId);
      setView('event');
      renderEventView();
    });
  });
}

function renderEventView() {
  const root = views.event;
  const event = state.events.find((item) => item.id === state.selectedEventId);
  if (!event) {
    root.innerHTML = emptyBlock('Выберите событие из страницы актива.');
    return;
  }

  const refs = (event.sourceReferences || []).map((ref) => `
    <article class="item">
      <strong>${ref.sourceName}</strong>
      <div class="meta">${ref.publishedAt.slice(0, 10)} · ${ref.sourceType} · trust ${ref.trustLevel}</div>
      <div class="meta"><a href="${ref.url}" target="_blank" rel="noopener">${ref.url}</a></div>
    </article>
  `).join('');

  const analogs = (event.relatedAnalogs || []).map((item) => `
    <article class="item">
      <strong>${item.assetSymbol} · ${item.date.slice(0, 10)}</strong>
      <div class="meta">score ${item.score} · normalized ${item.normalizedScore}</div>
      <div class="meta">${item.title}</div>
    </article>
  `).join('');

  root.innerHTML = `
    <div class="summary-grid">
      <div class="card"><span class="label">Дата</span><strong>${event.occurredAt.slice(0, 10)}</strong></div>
      <div class="card"><span class="label">Активы</span><strong>${event.assetSymbols.join(', ')}</strong></div>
      <div class="card"><span class="label">Статус</span><strong>${event.status}</strong></div>
    </div>
    <section class="card"><span class="label">Контекст события</span><p>${event.context}</p></section>
    <div class="content-grid">
      <section class="card"><span class="label">Источники</span><div class="list">${refs || '<p class="empty">Нет источников</p>'}</div></section>
      <section class="card"><span class="label">Аналоги и сценарии</span><div class="list">${analogs || '<p class="empty">Нет аналогов</p>'}</div></section>
    </div>
  `;
}

function renderAnalogsView() {
  const root = views.analogs;
  if (!state.analogs.length) {
    root.innerHTML = emptyBlock('Нет аналогов для выбранного фильтра.');
    return;
  }
  const rows = state.analogs.map((item) => `
    <article class="item">
      <div class="item-head">
        <strong>${item.assetSymbol} · ${item.date.slice(0, 10)}</strong>
        <span class="badge ${scoreBadge(item.score)}">${item.normalizedScore}</span>
      </div>
      <p>${item.title}</p>
      <div class="meta">score: ${item.score} · factors: ${(item.matchedFactors || []).join(', ') || '—'}</div>
      <div class="meta">decompose: factor ${item.scoreBreakdown.factor.toFixed(2)}, price ${item.scoreBreakdown.priceBehavior.toFixed(2)}, vol ${item.scoreBreakdown.volatility.toFixed(2)}, phase ${item.scoreBreakdown.cyclePhase.toFixed(2)}, semantic ${item.scoreBreakdown.semantic.toFixed(2)}, penalty ${item.scoreBreakdown.missingPenalty.toFixed(2)}</div>
    </article>
  `).join('');

  root.innerHTML = `
    <section class="card">
      <span class="label">Фильтр</span>
      <div class="meta">Актив: ${state.selectedSymbol}, сортировка детерминированная по normalized score и ID.</div>
    </section>
    <section class="card"><span class="label">Рейтинг аналогов</span><div class="list">${rows}</div></section>
  `;
}

function renderStatusView() {
  const root = views.status;
  if (!state.status) {
    root.innerHTML = loadingBlock('Загрузка статуса...');
    return;
  }

  const runs = (state.status.ingestion.runs || []).slice(0, 5).map((run) => `
    <article class="item">
      <strong>${run.id}</strong>
      <div class="meta">${run.status} · processed ${run.processed} · deduplicated ${run.deduplicated}</div>
      <div class="meta">start: ${run.startedAt.slice(0, 16).replace('T', ' ')} · finish: ${run.finishedAt ? run.finishedAt.slice(0, 16).replace('T', ' ') : 'running'}</div>
    </article>
  `).join('');

  const sources = (state.status.sources || []).map((source) => `
    <article class="item">
      <div class="item-head">
        <strong>${source.name}</strong>
        <span class="badge ${source.freshness === 'fresh' ? 'ok' : source.freshness === 'unavailable' ? 'danger' : 'warn'}">${source.freshness}</span>
      </div>
      <div class="meta">status: ${source.status} · trust: ${source.trustLevel}</div>
      <div class="meta">${source.lastMessage}</div>
    </article>
  `).join('');

  root.innerHTML = `
    <section class="card">
      <span class="label">Автозагрузка</span>
      <p>Pipeline: fetch → normalize → deduplicate → classify → extract claims/factors → attach assets → build context snapshot → find analogs → recalc scores → update scenarios → publish.</p>
      <p class="meta">Идемпотентность: canonical URL / external ID / content hash.</p>
    </section>
    <div class="content-grid">
      <section class="card"><span class="label">Источники</span><div class="list">${sources}</div></section>
      <section class="card"><span class="label">Журнал запусков</span><div class="list">${runs || '<p class="empty">Нет запусков</p>'}</div></section>
    </div>
  `;
}

async function loadAssets() {
  const payload = await fetchJson('/api/assets');
  state.assets = payload.items || [];
  renderAssetButtons();
}

async function loadToday() {
  state.today = await fetchJson('/api/market/today');
  renderTodayView();
}

async function loadAssetSnapshot(symbol) {
  state.assetSnapshot = await fetchJson(`/api/assets/${encodeURIComponent(symbol)}`);
}

async function loadEvent(eventId) {
  const payload = await fetchJson(`/api/events/${encodeURIComponent(eventId)}`);
  const idx = state.events.findIndex((item) => item.id === eventId);
  if (idx >= 0) {
    state.events[idx] = payload;
  } else {
    state.events.push(payload);
  }
}

async function loadAnalogs(symbol) {
  const payload = await fetchJson(`/api/analogs?symbol=${encodeURIComponent(symbol)}&limit=40`);
  state.analogs = payload.items || [];
  renderAnalogsView();
}

async function loadStatus() {
  state.status = await fetchJson('/api/status');
  renderStatusView();
}

async function triggerIngestion(reason = 'ui_refresh') {
  await fetchJson('/api/ingestion/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
}

async function refreshAll() {
  try {
    refreshButton.disabled = true;
    await triggerIngestion('manual_refresh');
    await Promise.all([loadToday(), loadAssetSnapshot(state.selectedSymbol), loadAnalogs(state.selectedSymbol), loadStatus()]);
    renderAssetView();
    renderEventView();
  } catch (error) {
    console.error(error);
    Object.values(views).forEach((v) => {
      if (v.classList.contains('active')) {
        v.innerHTML = `<div class="card"><p class="error">Ошибка загрузки: ${error.message}</p></div>`;
      }
    });
  } finally {
    refreshButton.disabled = false;
  }
}

async function bootstrap() {
  Object.values(views).forEach((view) => { view.innerHTML = loadingBlock(); });
  try {
    await loadAssets();
    await refreshAll();
    setView('today');
  } catch (error) {
    console.error(error);
    views.today.innerHTML = `<div class="card"><p class="error">Не удалось загрузить приложение: ${error.message}</p></div>`;
  }
}

document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.tab;
    setView(view);
    if (view === 'asset') renderAssetView();
    if (view === 'event') renderEventView();
    if (view === 'analogs') renderAnalogsView();
    if (view === 'status') renderStatusView();
    if (view === 'today') renderTodayView();
  });
});

refreshButton.addEventListener('click', () => refreshAll());

bootstrap();
