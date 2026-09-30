const express = require('express');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Enable JSON request parsing
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "AutoLink API is running"
  });
});

module.exports = app;
