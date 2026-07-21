const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.dirname(__filename)));

// Data persistence
const dataDir = path.join(path.dirname(__filename), 'data');
const dataFile = path.join(dataDir, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
}

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load data:', e.message);
  }
  return { components: [], models: [], buildLog: [], salesLog: [], customOrders: [] };
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save data:', e.message);
    return false;
  }
}

let db = loadData();

// GET /api/data
app.get('/api/data', (req, res) => {
  res.json(db);
});

// POST /api/data
app.post('/api/data', (req, res) => {
  try {
    const { components, models, buildLog, salesLog, customOrders } = req.body;
    db = { components, models, buildLog, salesLog, customOrders };
    saveData(db);
    res.json({ success: true });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: 'Save failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Serve app.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(path.dirname(__filename), 'app.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
