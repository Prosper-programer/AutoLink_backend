const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/:requestId/confirm-pickup', requireAuth, requireRole('CLIENT'), rentalController.confirmPickup);

module.exports = router;
