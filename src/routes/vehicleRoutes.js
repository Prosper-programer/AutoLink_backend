const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', vehicleController.getAvailableVehicles);

// Protected routes
router.post('/', requireAuth, requireRole('OWNER'), vehicleController.createVehicle);
router.get('/my-vehicles', requireAuth, requireRole('OWNER'), vehicleController.getMyVehicles);
router.patch('/:id/verification', requireAuth, requireRole('STAFF_MANAGER'), vehicleController.verifyVehicle);

// Public route with parameter (must be placed after static routes like /my-vehicles)
router.get('/:id', vehicleController.getVehicleById);

module.exports = router;
