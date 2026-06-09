CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  family_members INTEGER DEFAULT 1,
  elderly     INTEGER DEFAULT 0,
  children    INTEGER DEFAULT 0,
  conditions  TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_alerts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(255) DEFAULT 'Anonymous',
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  address     TEXT DEFAULT '',
  message     TEXT DEFAULT 'Emergency SOS',
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symptom_reports (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name     VARCHAR(255) DEFAULT 'Citizen',
  location      VARCHAR(255) NOT NULL,
  symptoms      TEXT[] NOT NULL,
  age_group     VARCHAR(30) DEFAULT 'adult',
  severity      VARCHAR(20) DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),
  duration      VARCHAR(30) DEFAULT 'less_than_1_day',
  status        VARCHAR(30) DEFAULT 'pending_analysis',
  ai_condition  VARCHAR(255) DEFAULT NULL,
  ai_risk_level VARCHAR(20) DEFAULT NULL,
  ai_recommendation TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing table if they don't exist
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS age_group VARCHAR(30) DEFAULT 'adult';
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'mild';
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS duration VARCHAR(30) DEFAULT 'less_than_1_day';
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending_analysis';
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS ai_condition VARCHAR(255) DEFAULT NULL;
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS ai_risk_level VARCHAR(20) DEFAULT NULL;
ALTER TABLE symptom_reports ADD COLUMN IF NOT EXISTS ai_recommendation TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS complaints (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(255) DEFAULT 'Anonymous',
  location    TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url   TEXT DEFAULT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add image_url to existing complaints table if column doesn't exist yet
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS live_alerts (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(50) NOT NULL CHECK (type IN ('disaster', 'health', 'sos', 'geofence', 'proactive')),
  message     TEXT NOT NULL,
  severity    VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  area        TEXT NOT NULL,
  source      VARCHAR(255) DEFAULT 'system',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50) NOT NULL CHECK (type IN ('fire_station','police_station','hotel','food_point','hospital','government_office','water_body','rescue_center')),
  lat             NUMERIC(10,7) NOT NULL,
  lng             NUMERIC(10,7) NOT NULL,
  address         TEXT,
  contact         TEXT,
  food_available  BOOLEAN DEFAULT TRUE,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symptom_reports_created ON symptom_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_created ON sos_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_address ON sos_alerts(address);

CREATE INDEX IF NOT EXISTS idx_resources_lat_lng ON resources(lat, lng);

-- ── Disaster Alerts (Enhanced) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disaster_alerts (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(500) NOT NULL,
  description     TEXT NOT NULL,
  source          VARCHAR(255) DEFAULT 'NDMA',
  disaster_type   VARCHAR(50) NOT NULL,
  severity        VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  district        VARCHAR(255),
  state           VARCHAR(100) DEFAULT 'Tamil Nadu',
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  alert_status    VARCHAR(20) DEFAULT 'ACTIVE' CHECK (alert_status IN ('ACTIVE','RESOLVED')),
  external_id     VARCHAR(255) UNIQUE,
  is_ai           BOOLEAN DEFAULT false,
  reference_link  VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_disaster_alerts_issued ON disaster_alerts(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_status ON disaster_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_disaster_alerts_district ON disaster_alerts(district);

