async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

const state = {
  selectedSymbol: 'MOEX',
  assets: []
};

const assetList = document.getElementById('asset-list');
const pageTitle = document.getElementById('page-title');
const assetName = document.getElementById('asset-name');
const currentEvent = document.getElementById('current-event');
const analogCount = document.getElementById('analog-count');
const scenarioList = document.getElementById('scenario-list');
const analogList = document.getElementById('analog-list');
const eventList = document.getElementById('event-list');
const refreshButton = document.getElementById('refresh-button');

function renderAssetButtons() {
  assetList.innerHTML = '';

  state.assets.forEach((asset) => {
    const button = document.createElement('button');
    button.className = `asset-button ${asset.symbol === state.selectedSymbol ? 'active' : ''}`;
    button.textContent = `${asset.symbol} · ${asset.category}`;
    button.addEventListener('click', () => {
      state.selectedSymbol = asset.symbol;
      renderAssetButtons();
      loadAsset(asset.symbol);
    });
    assetList.appendChild(button);
  });
}

function renderScenarios(scenarios = []) {
  if (!scenarios.length) {
    scenarioList.innerHTML = '<div class="scenario-item"><p>No scenario data yet.</p></div>';
    return;
  }

  scenarioList.innerHTML = scenarios.map((scenario) => {
    const badgeClass = scenario.risk === 'high' ? 'danger' : scenario.risk === 'moderate' ? 'warn' : '';
    return `
      <article class="scenario-item">
        <header>
          <strong>${scenario.label}</strong>
          <span class="badge ${badgeClass}">${scenario.probability}%</span>
        </header>
        <p>${scenario.narrative}</p>
        <div class="event-meta">Triggers: ${scenario.triggers.join(', ')}</div>
      </article>
    `;
  }).join('');
}

function renderAnalogs(analogs = []) {
  if (!analogs.length) {
    analogList.innerHTML = '<div class="analog-item"><p>No analogs available for this asset yet.</p></div>';
    return;
  }

  analogList.innerHTML = analogs.map((entry) => `
    <article class="analog-item">
      <header>
        <strong>${entry.assetSymbol}</strong>
        <span class="badge">${entry.similarityScore}%</span>
      </header>
      <p>${entry.title}</p>
      <div class="event-meta">${entry.date} · ${entry.source}</div>
    </article>
  `).join('');
}

function renderEvents(events = []) {
  if (!events.length) {
    eventList.innerHTML = '<div class="event-item"><p>No events available.</p></div>';
    return;
  }

  eventList.innerHTML = events.map((event) => `
    <article class="event-item">
      <strong>${event.title}</strong>
      <p>${event.summary}</p>
      <div class="event-meta">${event.date} · ${event.source} · score ${event.score}</div>
    </article>
  `).join('');
}

async function loadAsset(symbol) {
  try {
    const payload = await fetchJson(`/api/assets/${symbol}`);
    const asset = payload.asset;
    const scenario = payload.scenario;
    const events = payload.events || [];

    pageTitle.textContent = asset.symbol;
    assetName.textContent = `${asset.name} (${asset.symbol})`;
    currentEvent.textContent = scenario?.currentEvent?.title || 'N/A';
    analogCount.textContent = String((scenario?.analogs || []).length);
    renderScenarios(scenario?.scenarios || []);
    renderAnalogs(scenario?.analogs || []);
    renderEvents(events);
  } catch (error) {
    console.error('Failed to load asset', error);
  }
}

async function bootstrap() {
  try {
    const payload = await fetchJson('/api/assets');
    state.assets = payload.items || [];

    if (!state.assets.length) {
      return;
    }

    renderAssetButtons();
    loadAsset(state.selectedSymbol);
  } catch (error) {
    console.error('Failed to bootstrap app', error);
  }
}

refreshButton.addEventListener('click', () => loadAsset(state.selectedSymbol));

bootstrap();
