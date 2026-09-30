const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

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

module.exports = router;
