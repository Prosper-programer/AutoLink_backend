const pool = require('../config/database');

const createVehicle = async (req, res) => {
  try {
    const { 
      brand, model, year, registration_number, 
      category, color, fuel_type, transmission, 
      seats, description, rental_price_per_day 
    } = req.body;

    // 1. Validate required fields
    if (!brand || !model || !year || !registration_number || !category || rental_price_per_day === undefined) {
      return res.status(400).json({
        success: false,
        message: 'brand, model, year, registration_number, category, and rental_price_per_day are required.'
      });
    }

    // 2. Validate types and reasonable limits
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      return res.status(400).json({
        success: false,
        message: 'year must be a valid numeric year.'
      });
    }

    if (seats !== undefined && (isNaN(seats) || seats < 1)) {
      return res.status(400).json({
        success: false,
        message: 'seats must be a numeric value greater than 0.'
      });
    }

    if (isNaN(rental_price_per_day) || rental_price_per_day <= 0) {
      return res.status(400).json({
        success: false,
        message: 'rental_price_per_day must be a valid positive number.'
      });
    }

    if (String(registration_number).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'registration_number cannot be empty.'
      });
    }

    // 3. Check for duplicate registration_number
    const [existing] = await pool.query('SELECT id FROM vehicles WHERE registration_number = ?', [registration_number]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle with this registration number already exists'
      });
    }

    // 4. Set secure fields
    const owner_id = req.user.id; // Always from token
    const status = 'PENDING_VERIFICATION'; // Always forced
    
    // Map optional fields
    const vehicleColor = color || null;
    const vehicleFuel = fuel_type || null;
    const vehicleTransmission = transmission || null;
    const vehicleSeats = seats || null;
    const vehicleDesc = description || null;

    // 5. Insert vehicle
    const [result] = await pool.query(
      `INSERT INTO vehicles 
      (owner_id, brand, model, year, registration_number, category, color, fuel_type, transmission, seats, description, rental_price_per_day, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [owner_id, brand, model, year, registration_number, category, vehicleColor, vehicleFuel, vehicleTransmission, vehicleSeats, vehicleDesc, rental_price_per_day, status]
    );

    // 6. Return response
    res.status(201).json({
      success: true,
      message: 'Vehicle submitted for verification',
      vehicle: {
        id: result.insertId,
        owner_id,
        brand,
        model,
        year,
        registration_number,
        category,
        color: vehicleColor,
        fuel_type: vehicleFuel,
        transmission: vehicleTransmission,
        seats: vehicleSeats,
        description: vehicleDesc,
        rental_price_per_day,
        status
      }
    });

  } catch (error) {
    console.error('Create Vehicle Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting the vehicle.'
    });
  }
};

const verifyVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    // 1. Validate decision
    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res.status(400).json({
        success: false,
        message: 'Decision must be APPROVE or REJECT'
      });
    }

    // 2. Find the vehicle
    const [vehicles] = await pool.query('SELECT id, status FROM vehicles WHERE id = ?', [id]);
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const vehicle = vehicles[0];

    // 3. Check if pending
    if (vehicle.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not pending verification'
      });
    }

    // 4. Update status
    const newStatus = decision === 'APPROVE' ? 'AVAILABLE' : 'UNAVAILABLE';
    
    await pool.query('UPDATE vehicles SET status = ? WHERE id = ?', [newStatus, id]);

    // 5. Response
    res.status(200).json({
      success: true,
      message: decision === 'APPROVE' ? 'Vehicle approved successfully' : 'Vehicle rejected',
      vehicle: {
        id: vehicle.id,
        status: newStatus
      }
    });

  } catch (error) {
    console.error('Verify Vehicle Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the vehicle.'
    });
  }
};

const getMyVehicles = async (req, res) => {
  try {
    // 1. Get owner ID securely from the JWT token
    const ownerId = req.user.id;

    // 2. Fetch only vehicles belonging to this specific owner
    const [vehicles] = await pool.query(
      'SELECT * FROM vehicles WHERE owner_id = ? ORDER BY created_at DESC', 
      [ownerId]
    );

    // 3. Return the array (even if empty, it will be [])
    res.status(200).json({
      success: true,
      vehicles
    });

  } catch (error) {
    console.error('Get My Vehicles Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving your vehicles.'
    });
  }
};

const getAvailableVehicles = async (req, res) => {
  try {
    const { search, category, transmission, fuel_type, min_price, max_price } = req.query;

    let query = `
      SELECT id, brand, model, year, registration_number, category, 
             color, fuel_type, transmission, seats, description, 
             rental_price_per_day, status 
      FROM vehicles 
      WHERE status = 'AVAILABLE'
    `;
    const queryParams = [];

    // 1. Search (partial matching)
    if (search) {
      query += ` AND (brand LIKE ? OR model LIKE ? OR category LIKE ?)`;
      const searchPattern = \`%\${search}%\`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 2. Exact Filters
    if (category) {
      query += ` AND category = ?`;
      queryParams.push(category);
    }
    if (transmission) {
      query += ` AND transmission = ?`;
      queryParams.push(transmission);
    }
    if (fuel_type) {
      query += ` AND fuel_type = ?`;
      queryParams.push(fuel_type);
    }

    // 3. Price Validation and Filters
    let min = null;
    let max = null;

    if (min_price) {
      min = parseFloat(min_price);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
      query += ` AND rental_price_per_day >= ?`;
      queryParams.push(min);
    }

    if (max_price) {
      max = parseFloat(max_price);
      if (isNaN(max) || max < 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
      query += ` AND rental_price_per_day <= ?`;
      queryParams.push(max);
    }

    if (min !== null && max !== null && min > max) {
      return res.status(400).json({ success: false, message: 'Invalid price range' });
    }

    query += ` ORDER BY id DESC`;
    
    const [vehicles] = await pool.query(query, queryParams);

    // 4. Return the array (even if empty, it will be [])
    res.status(200).json({
      success: true,
      vehicles
    });

  } catch (error) {
    console.error('Get Available Vehicles Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving available vehicles.'
    });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate ID is numeric
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle ID'
      });
    }

    // 2. Fetch only if status 'AVAILABLE' and exclude private fields
    const query = `
      SELECT id, brand, model, year, registration_number, category, 
             color, fuel_type, transmission, seats, description, 
             rental_price_per_day, status 
      FROM vehicles 
      WHERE id = ? AND status = 'AVAILABLE'
    `;
    
    const [vehicles] = await pool.query(query, [id]);

    // 3. Return 404 if not found or not AVAILABLE
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // 4. Return successful response
    res.status(200).json({
      success: true,
      vehicle: vehicles[0]
    });

  } catch (error) {
    console.error('Get Vehicle By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving the vehicle details.'
    });
  }
};

module.exports = {
  createVehicle,
  verifyVehicle,
  getMyVehicles,
  getAvailableVehicles,
  getVehicleById
};
