const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database setup
let dbPath = '/tmp/pbtimepiece.db';
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to database');
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
            if (err) console.error('Error initializing:', err);
            else console.log('Database initialized');
          }
        );
      }
    });
  });
}

// Serve import page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PBTimePiece - Import</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #1C1A17 0%, #2C2620 100%);
    color: #EAE3D3;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 20px;
  }
  .container {
    background: #242019;
    border: 1px solid #3A342C;
    border-radius: 12px;
    padding: 40px;
    max-width: 500px;
    width: 100%;
  }
  h1 { font-size: 28px; color: #D9B57E; margin: 0 0 8px 0; }
  .subtitle { color: #9C917E; font-size: 14px; margin-bottom: 32px; }
  .info { background: rgba(184, 147, 91, 0.08); border-left: 3px solid #B8935B; padding: 12px; margin-bottom: 24px; font-size: 13px; border-radius: 4px; color: #9C917E; }
  .form-group { margin-bottom: 24px; }
  label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: #9C917E; margin-bottom: 8px; }
  input[type="file"] { display: block; width: 100%; padding: 12px; background: #2C2620; border: 1px solid #463F35; border-radius: 6px; color: #EAE3D3; }
  input[type="file"]:focus { outline: none; border-color: #B8935B; }
  button { width: 100%; padding: 12px; background: #B8935B; color: #1C1A17; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  button:hover:not(:disabled) { background: #D9B57E; }
  button:disabled { background: #463F35; color: #9C917E; cursor: not-allowed; }
  .status { margin-top: 24px; padding: 16px; border-radius: 6px; font-size: 13px; text-align: center; display: none; }
  .status.loading { display: block; background: rgba(184, 147, 91, 0.12); color: #D9B57E; }
  .status.success { display: block; background: rgba(138, 163, 127, 0.12); color: #8AA37F; border: 1px solid #8AA37F; }
  .status.error { display: block; background: rgba(193, 85, 61, 0.12); color: #C1553D; border: 1px solid #C1553D; }
</style>
</head>
<body>
<div class="container">
  <h1>PBTimePiece</h1>
  <p class="subtitle">Import your inventory data</p>
  
  <div class="info">
    📤 Select your <strong>inventory_data.json</strong> file to import all components, models, and sales data.
  </div>

  <form id="importForm">
    <div class="form-group">
      <label for="jsonFile">Select JSON File</label>
      <input type="file" id="jsonFile" accept=".json" required />
    </div>
    <button type="submit" id="importBtn">📤 Import Data</button>
  </form>

  <div class="status" id="status"></div>
</div>

<script>
const form = document.getElementById('importForm');
const fileInput = document.getElementById('jsonFile');
const status = document.getElementById('status');
const importBtn = document.getElementById('importBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = fileInput.files[0];
  if (!file) {
    showStatus('Please select a file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      showStatus('Uploading...', 'loading');
      
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Server error: ' + response.status);
      }

      const result = await response.json();
      if (result.success) {
        const { imported } = result;
        showStatus(
          \`✅ Import successful!\\n\\n\${imported.components} components\\n\${imported.models} models\\n\${imported.buildLog} builds\\n\${imported.salesLog} sales\\n\${imported.customOrders} custom orders\`,
          'success'
        );
        fileInput.value = '';
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      showStatus('❌ ' + error.message, 'error');
    }
  };

  reader.onerror = () => {
    showStatus('❌ Failed to read file', 'error');
  };

  reader.readAsText(file);
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = 'status ' + type;
  importBtn.disabled = type === 'loading';
}
</script>
</body>
</html>
  `);
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

// POST data
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

// IMPORT endpoint
app.post('/api/import', (req, res) => {
  const { components, models, buildLog, salesLog, customOrders } = req.body;

  if (!components || !models) {
    return res.status(400).json({ error: 'Missing components or models' });
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
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Failed to import: ' + err.message });
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
  console.log(`Visit: https://pbtimepiece-server-prod.up.railway.app/`);
});