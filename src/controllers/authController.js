const pool = require('../config/database');
const { hashPassword } = require('../utils/passwordUtils');

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    // 1. Check missing fields
    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (full_name, email, phone, password) are required.'
      });
    }

    // 2. Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.'
      });
    }

    // 3. Check duplicate email
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists.'
      });
    }

    // 4. Hash password
    const hashedPassword = await hashPassword(password);

    // 5. Insert user (force role to CLIENT and status to ACTIVE)
    const role = 'CLIENT';
    const status = 'ACTIVE';

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, email, phone, hashedPassword, role, status]
    );

    // 6. Return successful response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.insertId,
        full_name,
        email,
        phone,
        role: [role],
        status
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again later.'
    });
  }
};

module.exports = {
  register
};
