# Market Scenario Lab

A structured skeleton for a finance-oriented historical scenario analysis platform.

## Overview
This project is a full-stack starter for a platform that:
- tracks financial and macro events;
- maps them to asset-specific scenarios;
- finds historical analogs;
- compares current conditions with prior cycles;
- presents a scenario tree and source-backed narrative for each market symbol.

The current goal is to create a clear, working base structure without spending time on final visual polish.

## Architecture

### Frontend
- Static web UI served from `public/`
- Minimal dashboard shell with asset selector, summary cards, scenario list, and event timeline
- Fetches all data from the backend API

### Backend
- Express server in `server.js`
- API endpoints in `src/routes/api.js`
- Domain logic in `src/services/`
- Seed data in `src/data/marketSeed.js`

### Domain services
- `ingestionService.js`: asset listing, event sorting, filtering, market event extraction
- `scenarioService.js`: probability-based scenario generation and historical analogs

## Current product direction
This is oriented toward:
- MOEX equities;
- ruble and FX pairs;
- macro and geopolitical event tracking;
- historical cycle comparison;
- scenario branching for market decisions;

It is intentionally built as a clean foundation, ready for later expansion into:
- broader global finance domains;
- additional market sectors;
- automatic event ingestion;
- deeper semantic similarity search;
- richer dashboards and reports.

## Run locally

```bash
npm install
npm run dev
```

Then open:
- http://localhost:3000

## API examples

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/assets
curl http://localhost:3000/api/assets/MOEX
curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"symbol":"USD/RUB"}'
```

## Planned future upgrades
- richer market event collectors;
- vector/semantic matching for historical analogs;
- scheduled ingestion jobs;
- persist data in PostgreSQL;
- scenario confidence scoring;
- user auth and saved reports.
