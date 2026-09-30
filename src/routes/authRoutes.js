const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.loginUser);

// Temporary test route for JWT verification
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

// Temporary test route for CLIENT role
router.get('/test-client', requireAuth, requireRole('CLIENT'), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted'
  });
});

// Temporary test route for ADMIN role
router.get('/test-admin', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted'
  });
});

module.exports = router;
