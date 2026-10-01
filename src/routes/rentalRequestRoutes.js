const express = require('express');
const router = express.Router();
const rentalRequestController = require('../controllers/rentalRequestController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', requireAuth, requireRole('CLIENT'), rentalRequestController.createRentalRequest);

module.exports = router;
