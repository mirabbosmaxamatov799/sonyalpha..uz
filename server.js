require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'backend/uploads')));

// API routes
app.use('/api/products', require('./backend/routes/products'));
app.use('/api', require('./backend/routes/api'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve frontend in production
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ SonyAlpha server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/products`);
  console.log(`   Admin login: admin / admin123`);
});





