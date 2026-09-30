const express = require('express');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();

// Enable JSON request parsing
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "AutoLink API is running"
  });
});

module.exports = app;
