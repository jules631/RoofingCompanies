const express = require('express');
const cors = require('cors');
require('dotenv').config();

const leadsRouter = require('./routes/leads');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// For Twilio webhook signature validation, we need raw body for /api/webhooks
// Regular JSON parsing for all other routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/webhooks', webhooksRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`RoofPing API server running on port ${PORT}`);
});
