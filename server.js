const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database path
const dbPath = process.env.NODE_ENV === 'production' ? '/data/pbtimepiece.db' : './pbtimepiece.db';
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY,
      components TEXT,
      models TEXT,
      buildLog TEXT,
      salesLog TEXT,
      customOrders TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if table is empty
  db.get('SELECT COUNT(*) as count FROM data', (err, row) => {
    if (!err && row.count === 0) {
      db.run(
        `INSERT INTO data (components, models, buildLog, salesLog, customOrders) VALUES (?, ?, ?, ?, ?)`,
        [
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([])
        ]
      );
    }
  });
});

// GET data
app.get('/api/data', (req, res) => {
  db.get('SELECT components, models, buildLog, salesLog, customOrders FROM data LIMIT 1', (err, row) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.json({
        components: [],
        models: [],
        buildLog: [],
        salesLog: [],
        customOrders: []
      });
    }
    res.json({
      components: JSON.parse(row.components || '[]'),
      models: JSON.parse(row.models || '[]'),
      buildLog: JSON.parse(row.buildLog || '[]'),
      salesLog: JSON.parse(row.salesLog || '[]'),
      customOrders: JSON.parse(row.customOrders || '[]')
    });
  });
});

// POST data (save updates)
app.post('/api/data', (req, res) => {
  const { components, models, buildLog, salesLog, customOrders } = req.body;

  db.run(
    `UPDATE data SET components = ?, models = ?, buildLog = ?, salesLog = ?, customOrders = ?, updated_at = CURRENT_TIMESTAMP`,
    [
      JSON.stringify(components || []),
      JSON.stringify(models || []),
      JSON.stringify(buildLog || []),
      JSON.stringify(salesLog || []),
      JSON.stringify(customOrders || [])
    ],
    (err) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Failed to save data' });
      }
      res.json({ success: true });
    }
  );
});

// IMPORT endpoint - replaces all data with uploaded JSON
app.post('/api/import', (req, res) => {
  const { components, models, buildLog, salesLog, customOrders } = req.body;

  if (!components || !models) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    `UPDATE data SET components = ?, models = ?, buildLog = ?, salesLog = ?, customOrders = ?, updated_at = CURRENT_TIMESTAMP`,
    [
      JSON.stringify(components),
      JSON.stringify(models),
      JSON.stringify(buildLog || []),
      JSON.stringify(salesLog || []),
      JSON.stringify(customOrders || [])
    ],
    (err) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Failed to import data' });
      }
      res.json({
        success: true,
        imported: {
          components: components.length,
          models: models.length,
          buildLog: (buildLog || []).length,
          salesLog: (salesLog || []).length,
          customOrders: (customOrders || []).length
        }
      });
    }
  );
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PBTimePiece Server running on port ${PORT}`);
});