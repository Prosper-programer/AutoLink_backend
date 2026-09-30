const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateToken } = require('../utils/tokenUtils');

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

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check missing fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required.'
      });
    }

    // 2. Find user by email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // 3. Compare passwords
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    // 5. Generate JWT token
    const userRoles = user.role ? user.role.split(',') : [];
    const token = generateToken(user.id, userRoles);

    // 6. Return user details and token (without password)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: userRoles,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again later.'
    });
  }
};

module.exports = {
  register,
  loginUser
};
