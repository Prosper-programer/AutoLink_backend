const pool = require('../config/database');

const createRentalRequest = async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, fulfillment_method } = req.body;
    const client_id = req.user.id;

    // 1. Validate vehicle_id
    if (!vehicle_id || isNaN(vehicle_id) || vehicle_id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle ID'
      });
    }

    // 2. Validate dates
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required'
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // 3. Validate fulfillment method
    if (fulfillment_method !== 'PICKUP' && fulfillment_method !== 'DELIVERY') {
      return res.status(400).json({
        success: false,
        message: 'Invalid fulfillment method'
      });
    }

    // 4. Check Vehicle Availability
    const [vehicles] = await pool.query('SELECT id FROM vehicles WHERE id = ? AND status = ?', [vehicle_id, 'AVAILABLE']);
    
    if (vehicles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not available'
      });
    }

    // 5. Prevent Conflicting Overlapping Requests
    // Overlap condition: start1 < end2 AND end1 > start2
    const formattedStartDate = start.toISOString().split('T')[0];
    const formattedEndDate = end.toISOString().split('T')[0];

    const [conflicts] = await pool.query(
      `SELECT id FROM rental_requests 
       WHERE vehicle_id = ? 
       AND status IN ('PENDING', 'APPROVED') 
       AND start_date < ? 
       AND end_date > ?`,
      [vehicle_id, formattedEndDate, formattedStartDate]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle is already requested for these dates'
      });
    }

    // 6. Insert Request
    const status = 'PENDING';
    const [result] = await pool.query(
      `INSERT INTO rental_requests 
      (client_id, vehicle_id, start_date, end_date, fulfillment_method, status) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [client_id, vehicle_id, formattedStartDate, formattedEndDate, fulfillment_method, status]
    );

    // 7. Successful Response
    res.status(201).json({
      success: true,
      message: 'Rental request submitted successfully',
      rentalRequest: {
        id: result.insertId,
        client_id,
        vehicle_id: Number(vehicle_id),
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        fulfillment_method,
        status
      }
    });

  } catch (error) {
    console.error('Create Rental Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting the rental request.'
    });
  }
};

const getPendingRentalRequests = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.client_id, u.full_name AS client_name, u.phone AS client_phone,
        r.vehicle_id, v.brand AS vehicle_brand, v.model AS vehicle_model, v.registration_number,
        r.start_date, r.end_date, r.fulfillment_method, r.status, r.created_at
      FROM rental_requests r
      JOIN users u ON r.client_id = u.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.status = 'PENDING'
      ORDER BY r.created_at DESC
    `;
    const [rentalRequests] = await pool.query(query);

    res.status(200).json({
      success: true,
      rentalRequests
    });
  } catch (error) {
    console.error('Get Pending Rental Requests Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving rental requests.'
    });
  }
};

const reviewRentalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    // 1. Validate decision
    if (decision !== 'APPROVE' && decision !== 'REJECT') {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision'
      });
    }

    // 2. Request Must Exist
    const [requests] = await pool.query('SELECT * FROM rental_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental request not found'
      });
    }

    const request = requests[0];

    // 3. Only PENDING requests can be reviewed
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Rental request has already been processed'
      });
    }

    // 4. Concurrency Check (only if APPROVE)
    if (decision === 'APPROVE') {
      const formattedStartDate = new Date(request.start_date).toISOString().split('T')[0];
      const formattedEndDate = new Date(request.end_date).toISOString().split('T')[0];

      const [conflicts] = await pool.query(
        `SELECT id FROM rental_requests 
         WHERE vehicle_id = ? 
         AND id != ?
         AND status IN ('PENDING', 'APPROVED') 
         AND start_date < ? 
         AND end_date > ?`,
        [request.vehicle_id, id, formattedEndDate, formattedStartDate]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle is already requested for these dates'
        });
      }
    }

    // 5. Update Status
    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await pool.query('UPDATE rental_requests SET status = ? WHERE id = ?', [newStatus, id]);

    // 6. Response
    const message = decision === 'APPROVE' ? 'Rental request approved successfully' : 'Rental request rejected successfully';
    res.status(200).json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Review Rental Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while reviewing the rental request.'
    });
  }
};

module.exports = {
  createRentalRequest,
  getPendingRentalRequests,
  reviewRentalRequest
};
