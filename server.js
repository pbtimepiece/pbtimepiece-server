const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbPath = path.join(__dirname, 'pbtimepiece.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else {
    console.log('Connected to database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS business_data (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      components TEXT DEFAULT '[]',
      models TEXT DEFAULT '[]',
      buildLog TEXT DEFAULT '[]',
      salesLog TEXT DEFAULT '[]',
      customOrders TEXT DEFAULT '[]',
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Table error:', err);
    else {
      db.run(`INSERT OR IGNORE INTO business_data (id) VALUES (1)`, (err) => {
        if (err) console.error('Init error:', err);
        else console.log('Database ready');
      });
    }
  });
}

app.get('/api/data', (req, res) => {
  db.get('SELECT components, models, buildLog, salesLog, customOrders FROM business_data WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ error: 'Read error' });
    if (!row) return res.json({ components: [], models: [], buildLog: [], salesLog: [], customOrders: [] });
    
    try {
      res.json({
        components: JSON.parse(row.components || '[]'),
        models: JSON.parse(row.models || '[]'),
        buildLog: JSON.parse(row.buildLog || '[]'),
        salesLog: JSON.parse(row.salesLog || '[]'),
        customOrders: JSON.parse(row.customOrders || '[]')
      });
    } catch (e) {
      res.status(500).json({ error: 'Parse error' });
    }
  });
});

app.post('/api/data', (req, res) => {
  const { components, models, buildLog, salesLog, customOrders } = req.body;
  
  if (!components || !models || !buildLog || !salesLog || !customOrders) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  db.run(
    `UPDATE business_data SET components = ?, models = ?, buildLog = ?, salesLog = ?, customOrders = ?, lastUpdated = CURRENT_TIMESTAMP WHERE id = 1`,
    [JSON.stringify(components), JSON.stringify(models), JSON.stringify(buildLog), JSON.stringify(salesLog), JSON.stringify(customOrders)],
    function(err) {
      if (err) return res.status(500).json({ error: 'Update error' });
      res.json({ success: true, timestamp: new Date().toISOString() });
    }
  );
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});