# Платформа «Вероятностные сценарии на основе исторических аналогий»

MVP аналитической платформы для первой вертикали российского рынка:
- акции MOEX: `SBER`, `GAZP`, `LKOH`, индекс `MOEX`;
- валюты: `USD/RUB`, `EUR/RUB`;
- демонстрационный диапазон ~15 лет (детерминированный seed-датасет без обязательных API-ключей).

> Важно: это **информационный аналитический продукт**. Все вероятности — модельные оценки и **не являются гарантией** и персональной инвестиционной рекомендацией.

## Что реализовано

### Пользовательские разделы
1. **Рынок сегодня** (`/api/market/today`, вкладка UI): сигналы, активы, события, сценарии, свежесть данных.
2. **Страница актива** (`/api/assets/:symbol`): динамика ряда, фазовые признаки цикла, контекст, аналоги, дерево сценариев.
3. **Страница события** (`/api/events/:id`): дата, активы, контекст, источники, аналоги, связанные сценарии.
4. **Страница аналогов** (`/api/analogs`): фильтрация, ranking, `score`, декомпозиция факторов.
5. **Сценарное дерево**: ветви `base / bear / bull / shock`, вероятность, триггеры, сигналы подтверждения/отмены, горизонт.
6. **Журнал сигналов + статус автономной загрузки** (`/api/signals`, `/api/status`, `/api/ingestion/run`).

### Данные и сущности
В коде введены унифицированные сущности:
- `Asset`
- `RawDocument`
- `SourceReference`
- `Evidence/Claim`
- `MarketEvent`
- `HistoricalAnalog`
- `ScenarioBranch`
- `DataIngestionRun`

Сырые документы отделены от нормализованных фактов и вычисленных аналитических метрик.

## Ingestion pipeline

Реализован модульный pipeline:

`fetch → normalize → deduplicate → classify → extract claims/factors → attach assets → build context snapshot → find analogs → recalc scores → update scenarios → publish`

### Ключевые свойства
- **Идемпотентность**: дедупликация по `canonicalUrl`, `externalId`, `contentHash`.
- **Data provenance**: источник, `publishedAt`, `fetchedAt/ingestedAt`, trust-level, `pipelineVersion`, ошибки.
- **Partial failure safety**: падение одного источника не ломает run целиком (`status: partial_success`).
- **Retry/backoff/rate-limit/timeout**: реализованы в `fetchWithRetry`.
- **Статус источников**: `active/degraded/unconfigured`, fresh/stale/unavailable.

### Источники
Рабочие в MVP (без ключей):
- demo adapters: CBR, MOEX, РБК, ТАСС, Reuters public demo

Точки расширения (не имитируется доступ к платным API):
- ЦБ РФ, Минфин, Росстат, MOEX, Интерфакс, РБК, ТАСС, Reuters, Bloomberg

Если API отсутствует, источник показывается как `unconfigured`, а система продолжает работать на seed/demo.

## Математическая методика

Конфиг формул и весов: `src/config/analyticsConfig.js`.

### Признаки временных рядов
- лог-доходности `log(P_t / P_{t-1})`
- rolling volatility (окно 30)
- momentum/returns (окна 20/60/120)
- max drawdown (окно 120)
- event-window reaction (до/после события)
- correlation/beta к MOEX (при наличии данных)
- фазовый признак цикла (`crisis`, `contraction`, `transition`, `expansion`)

### Similarity score аналогов
Итоговый score ограничен `[0,1]` и детерминированно сортируется.

Компоненты:
- factor similarity
- price behavior similarity
- volatility similarity
- cycle phase similarity
- semantic/tag similarity

`score = Σ(weight_i * component_i) - missing_data_penalty`

Все веса вынесены в конфиг. Есть явный penalty за missing data.

### Вероятности сценариев
Используется прозрачная модель на основе `prior log-odds + evidence weights`, затем softmax-нормализация до 100%.

Ветки:
- `base`
- `bear`
- `bull`
- `shock`

Дополнительно считаются `confidence` и `coverage`, чтобы слабая доказательная база не выглядела «высоконадежной».

## Статусы проверки
Для событий/аналогов/сценариев используются статусы:
- `draft`
- `reviewed`
- `published`
- `rejected` (точка расширения)

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`

## API (основные)

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/market/today
curl http://localhost:3000/api/assets
curl http://localhost:3000/api/assets/MOEX
curl http://localhost:3000/api/events
curl http://localhost:3000/api/analogs?symbol=USD%2FRUB
curl http://localhost:3000/api/scenarios/MOEX
curl http://localhost:3000/api/status
curl -X POST http://localhost:3000/api/ingestion/run -H 'Content-Type: application/json' -d '{"reason":"manual"}'
```

## Тесты

```bash
npm test
```

Покрываются:
- математические крайние случаи (короткий ряд, пропуски, нулевая дисперсия, границы score)
- инжест idempotency
- ключевые API сценарии

## Ограничения MVP
- Источники сейчас demo/seed и не заменяют экспертную верификацию.
- Семантика реализована на теговом baseline, embeddings — следующая итерация.
- Нет персональных рекомендаций, только аналитические вероятностные сценарии.

## Как подключать реальные источники
1. Добавить адаптер с тем же интерфейсом, что `DemoSourceAdapter`.
2. Подключить его в фабрике `createAdapter`.
3. Задать переменные окружения (см. `.env.example`).
4. Обеспечить нормализацию в общую схему `RawDocument`.
