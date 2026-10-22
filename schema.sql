CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  symbol VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS market_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_symbol VARCHAR(20) REFERENCES assets(symbol),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  importance INTEGER DEFAULT 1,
  context JSONB
);

CREATE TABLE IF NOT EXISTS historical_analogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES market_events(id) ON DELETE CASCADE,
  analog_date DATE,
  conditions TEXT,
  outcome TEXT,
  source_url VARCHAR(500),
  similarity_score DECIMAL(5,4)
);

CREATE TABLE IF NOT EXISTS scenario_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES market_events(id) ON DELETE CASCADE,
  branch_type VARCHAR(20) NOT NULL,
  probability DECIMAL(5,2) NOT NULL,
  triggers TEXT,
  sources TEXT
);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_symbol VARCHAR(20) REFERENCES assets(symbol) ON DELETE CASCADE,
  PRIMARY KEY (user_id, asset_symbol)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_symbol VARCHAR(20),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO assets (symbol, name, type) VALUES
  ('SBER', 'Сбербанк', 'stock'),
  ('GAZP', 'Газпром', 'stock'),
  ('LKOH', 'Лукойл', 'stock'),
  ('MOEX', 'Индекс Мосбиржи', 'index'),
  ('USD/RUB', 'Доллар США', 'currency'),
  ('EUR/RUB', 'Евро', 'currency')
ON CONFLICT DO NOTHING;