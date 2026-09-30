const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', requireAuth, requireRole('OWNER'), vehicleController.createVehicle);

module.exports = router;
