require('dotenv').config();
const db = require('./db');

async function run() {
  const table = `
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
    external_id     VARCHAR(255) UNIQUE
  );
  `;
  
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_disaster_alerts_issued ON disaster_alerts(issued_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_disaster_alerts_status ON disaster_alerts(alert_status);",
    "CREATE INDEX IF NOT EXISTS idx_disaster_alerts_district ON disaster_alerts(district);"
  ];
  
  try {
    await db.query(table);
    for (const idx of indexes) {
      await db.query(idx);
    }
    console.log('✅ disaster_alerts table migrated');
  } catch(e) {
    console.error('❌', e.message);
  }
  process.exit(0);
}
run();
