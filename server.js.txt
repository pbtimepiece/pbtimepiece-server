const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'pbtimepiece.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS business_data (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      components TEXT NOT NULL DEFAULT '[]',
      models TEXT NOT NULL DEFAULT '[]',
      buildLog TEXT NOT NULL DEFAULT '[]',
      salesLog TEXT NOT NULL DEFAULT '[]',
      customOrders TEXT NOT NULL DEFAULT '[]',
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      // Ensure we have one record
      db.run(`
        INSERT OR IGNORE INTO business_data (id, components, models, buildLog, salesLog, customOrders)
        VALUES (1, '[]', '[]', '[]', '[]', '[]')
      `, (err) => {
        if (err) console.error('Error initializing record:', err);
        else console.log('Database initialized');
      });
    }
  });
}

// GET /api/data - Retrieve all data
app.get('/api/data',