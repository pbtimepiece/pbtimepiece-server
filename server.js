const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database setup - use /tmp for Railway (persistent storage)
let dbPath;
if (process.env.NODE_ENV === 'production') {
  // Railway: use /tmp directory (writable)
  dbPath = '/tmp/pbtimepiece.db';
} else {
  // Local: use current directory
  dbPath = './pbtimepiece.db';
}

console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to database at:', dbPath);
    initializeDatabase();
  }
});

// Initialize database
function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY,
        components TEXT DEFAULT '[]',
        models TEXT DEFAULT '[]',
        buildLog TEXT DEFAULT '[]',
        salesLog TEXT DEFAULT '[]',
        customOrders TEXT DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating table:', err);
    });

    // Check if table has data
    db.get('SELECT COUNT(*) as count FROM data', (err, row) => {
      if (err) {
        console.error('Error checking data:', err);
        return;
      }
      
      if (row.count === 0) {
        console.log('Initializing empty database...');
        db.run(
          `INSERT INTO data (components, models, buildLog, salesLog, customOrders) VALUES (?, ?, ?, ?, ?)`,
          [
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify([])
          ],
          (err) => {
            if (err) console.error('Error initializing data:', err);
            else console.log('Database initialized successfully');
          }
        );
      } else {
        console.log('Database has existing data');
      }
    });
  });
}

// GET data
app.get('/api/data', (req, res) => {
  db.get('SELECT components, models, buildLog, salesLog, customOrders FROM data LIMIT 1', (err, row) => {
    if (err) {
      console.error('DB Error on GET:', err);
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
        console.error('DB Error on POST:', err);
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
    return res.status(400).json({ error: 'Missing required fields: components and models' });
  }

  console.log(`Importing: ${components.length} components, ${models.length} models`);

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
        console.error('DB Error on IMPORT:', err);
        return res.status(500).json({ error: 'Failed to import data: ' + err.message });
      }
      console.log('Import successful!');
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
  res.json({ status: 'ok', database: dbPath });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PBTimePiece Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});