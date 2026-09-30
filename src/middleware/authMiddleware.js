const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check header existence and format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // 2. Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // 3. Verify token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing');
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach payload to req
    req.user = decoded;
    
    // 5. Continue
    next();
  } catch (error) {
    // This catches expired tokens, malformed tokens, and signature mismatches
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

module.exports = {
  requireAuth
};
