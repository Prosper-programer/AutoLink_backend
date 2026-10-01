const express = require('express');
const router = express.Router();
const rentalRequestController = require('../controllers/rentalRequestController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', requireAuth, requireRole('CLIENT'), rentalRequestController.createRentalRequest);
router.get('/', requireAuth, requireRole('STAFF_MANAGER'), rentalRequestController.getPendingRentalRequests);
router.patch('/:id/review', requireAuth, requireRole('STAFF_MANAGER'), rentalRequestController.reviewRentalRequest);

module.exports = router;
