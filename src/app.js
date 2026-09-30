const express = require('express');

const app = express();

// Enable JSON request parsing
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "AutoLink API is running"
  });
});

module.exports = app;
