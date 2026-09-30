const jwt = require('jsonwebtoken');

const generateToken = (userId, userRoles) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload = {
    id: userId,
    role: userRoles
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

module.exports = {
  generateToken
};
