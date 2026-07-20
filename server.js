const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Persistent storage
const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'appdata.json');

// In-memory storage
let appData = {
  components: [],
  models: [],
  buildLog: [],
  salesLog: [],
  customOrders: []
};

// Ensure the data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`✅ Created data directory at ${DATA_DIR}`);
    }
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Load data from disk on startup
function loadData() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      appData = {
        components: loaded.components || [],
        models: loaded.models || [],
        buildLog: loaded.buildLog || [],
        salesLog: loaded.salesLog || [],
        customOrders: loaded.customOrders || []
      };
      console.log(`✅ Loaded persisted data from ${DATA_FILE}`);
    } else {
      console.log('⚠️  No persisted data file found, starting with empty data');
    }
  } catch (err) {
    console.error('Error loading persisted data:', err);
  }
}

// Save data to disk
function saveData() {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

console.log('Starting PBTimePiece Server...');

// Load persisted data before serving requests
loadData();

// Load HTML file if it exists, otherwise use fallback
let appHTML = null;
try {
  appHTML = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
  console.log('✅ Loaded app.html');
} catch (err) {
  console.log('⚠️  app.html not found, using fallback');
}

// Serve app at root and /app
app.get('/', (req, res) => {
  if (appHTML) {
    res.setHeader('Content-Type', 'text/html');
    res.send(appHTML);
  } else {
    res.send('<h1>PBTimePiece Server is running!</h1><p>App HTML not available. Upload app.html to the server.</p>');
  }
});

app.get('/app', (req, res) => {
  if (appHTML) {
    res.setHeader('Content-Type', 'text/html');
    res.send(appHTML);
  } else {
    res.send('<h1>PBTimePiece Server is running!</h1><p>App HTML not available.</p>');
  }
});

// API: GET data
app.get('/api/data', (req, res) => {
  console.log('GET /api/data');
  res.json(appData);
});

// API: POST data (save)
app.post('/api/data', (req, res) => {
  try {
    appData = {
      components: req.body.components || [],
      models: req.body.models || [],
      buildLog: req.body.buildLog || [],
      salesLog: req.body.salesLog || [],
      customOrders: req.body.customOrders || []
    };
    saveData();
    console.log('POST /api/data - saved', appData.components.length, 'components');
    res.json({ success: true });
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: IMPORT data
app.post('/api/import', (req, res) => {
  try {
    if (!req.body.components || !req.body.models) {
      return res.status(400).json({ error: 'Missing components or models' });
    }
    
    appData = {
      components: req.body.components,
      models: req.body.models,
      buildLog: req.body.buildLog || [],
      salesLog: req.body.salesLog || [],
      customOrders: req.body.customOrders || []
    };
    
    saveData();
    console.log('IMPORT - imported', appData.components.length, 'components and', appData.models.length, 'models');
    
    res.json({
      success: true,
      imported: {
        components: appData.components.length,
        models: appData.models.length,
        buildLog: appData.buildLog.length,
        salesLog: appData.salesLog.length,
        customOrders: appData.customOrders.length
      }
    });
  } catch (err) {
    console.error('IMPORT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    stored_data: {
      components: appData.components.length,
      models: appData.models.length
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PBTimePiece Server running on port ${PORT}`);
  console.log(`🌐 App: https://pbtimepiece-server-production.up.railway.app/`);
  console.log(`📡 API: /api/data, /api/import`);
});