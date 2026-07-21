const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.dirname(__filename)));

// Use Railway's persistent volume mount point
const dataDir = process.env.DATA_DIR || path.join(path.dirname(__filename), 'data');
const dataFile = path.join(dataDir, 'db.json');

console.log('=== STARTUP ===');
console.log('Data dir:', dataDir);
console.log('Data file:', dataFile);

// Create data directory
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✓ Created data directory');
  } else {
    console.log('✓ Data directory exists');
  }
  // Test write access
  fs.accessSync(dataDir, fs.constants.W_OK);
  console.log('✓ Data directory is writable');
} catch (err) {
  console.error('✗ Error with data directory:', err.message);
}

// Load data
function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      console.log('✓ Loaded data from file:', Object.keys(data).join(', '));
      return data;
    } else {
      console.log('ℹ No existing data file');
      return { components: [], models: [], buildLog: [], salesLog: [], customOrders: [] };
    }
  } catch (err) {
    console.error('✗ Failed to load data:', err.message);
    return { components: [], models: [], buildLog: [], salesLog: [], customOrders: [] };
  }
}

// Save data
function saveData(data) {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(dataFile, json);
    console.log('✓ Saved', data.components?.length || 0, 'components to disk');
    return true;
  } catch (err) {
    console.error('✗ Failed to save:', err.message);
    return false;
  }
}

let db = loadData();

// GET /api/data
app.get('/api/data', (req, res) => {
  console.log('GET /api/data');
  res.json(db);
});

// POST /api/data
app.post('/api/data', (req, res) => {
  try {
    const { components, models, buildLog, salesLog, customOrders } = req.body;
    console.log('POST /api/data - received', components?.length || 0, 'components');
    
    db = { components, models, buildLog, salesLog, customOrders };
    const saved = saveData(db);
    
    res.json({ success: saved });
  } catch (err) {
    console.error('POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, dataFile, fileExists: fs.existsSync(dataFile) });
});

// Serve app.html
app.get('*', (req, res) => {
  res.sendFile(path.join(path.dirname(__filename), 'app.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log('=== READY ===\n');
});
