const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Create data directory
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'workshop.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from disk
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      console.log('✓ Loaded data from disk. Components:', data.components?.length || 0);
      return data;
    }
  } catch (err) {
    console.error('Error loading data:', err.message);
  }
  return {
    components: [],
    models: [],
    buildLog: [],
    salesLog: [],
    customOrders: []
  };
}

// Save data to disk
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('✓ Saved to disk. Components:', data.components?.length || 0);
    return true;
  } catch (err) {
    console.error('✗ Failed to save:', err.message);
    return false;
  }
}

let workshopData = loadData();

// GET /api/data
app.get('/api/data', (req, res) => {
  console.log('GET /api/data');
  res.json(workshopData);
});

// POST /api/data
app.post('/api/data', (req, res) => {
  try {
    const { components, models, buildLog, salesLog, customOrders } = req.body;
    
    workshopData = {
      components: components || [],
      models: models || [],
      buildLog: buildLog || [],
      salesLog: salesLog || [],
      customOrders: customOrders || []
    };
    
    const saved = saveData(workshopData);
    res.json({ success: saved });
  } catch (err) {
    console.error('Error in POST /api/data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    dataFile: DATA_FILE,
    fileExists: fs.existsSync(DATA_FILE)
  });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✓ PBTimePiece Server running on port ${PORT}`);
  console.log(`✓ Data file: ${DATA_FILE}`);
  console.log(`✓ Visit http://localhost:${PORT}\n`);
});
