const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static files from root
app.use(express.static(path.join(__dirname)));

let workshopData = {
  components: [],
  models: [],
  buildLog: [],
  salesLog: [],
  customOrders: []
};

app.get('/api/data', (req, res) => {
  res.json(workshopData);
});

app.post('/api/data', (req, res) => {
  try {
    const { components, models, buildLog, salesLog, customOrders } = req.body;
    workshopData = { components, models, buildLog, salesLog, customOrders };
    console.log('Saved:', components.length, 'components');
    res.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for SPA - serve app.html from root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
