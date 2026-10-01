const pool = require('../config/database');

const confirmPickup = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { requestId } = req.params;
    const clientId = req.user.id;

    await connection.beginTransaction();

    // 1. Verify rental request exists
    // Using FOR UPDATE to prevent race conditions during activation
    const [requests] = await connection.query('SELECT * FROM rental_requests WHERE id = ? FOR UPDATE', [requestId]);
    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Rental request not found'
      });
    }

    const request = requests[0];

    // 2. Verify ownership
    if (request.client_id !== clientId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // 3. Verify status is APPROVED
    if (request.status !== 'APPROVED') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Rental request is not approved'
      });
    }

    // 4. Verify fulfillment method is PICKUP
    if (request.fulfillment_method !== 'PICKUP') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This rental uses delivery'
      });
    }

    // 5. Check if rental already exists (duplicate activation)
    const [existingRentals] = await connection.query('SELECT id FROM rentals WHERE rental_request_id = ?', [requestId]);
    if (existingRentals.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Rental has already been activated'
      });
    }

    // 6. Create Rental
    const status = 'ACTIVE';
    const [result] = await connection.query(
      `INSERT INTO rentals 
      (rental_request_id, client_id, vehicle_id, start_date, end_date, fulfillment_method, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [requestId, clientId, request.vehicle_id, request.start_date, request.end_date, request.fulfillment_method, status]
    );

    // 7. Update vehicle status to RENTED
    await connection.query('UPDATE vehicles SET status = ? WHERE id = ?', ['RENTED', request.vehicle_id]);

    // 8. Commit
    await connection.commit();

    // 9. Fetch inserted rental to format response
    const [newRentals] = await pool.query('SELECT * FROM rentals WHERE id = ?', [result.insertId]);
    const newRental = newRentals[0];

    res.status(201).json({
      success: true,
      message: 'Pickup confirmed and rental activated successfully',
      rental: {
        id: newRental.id,
        rental_request_id: newRental.rental_request_id,
        client_id: newRental.client_id,
        vehicle_id: newRental.vehicle_id,
        start_date: new Date(newRental.start_date).toISOString().split('T')[0],
        end_date: new Date(newRental.end_date).toISOString().split('T')[0],
        fulfillment_method: newRental.fulfillment_method,
        status: newRental.status,
        activated_at: newRental.activated_at
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Confirm Pickup Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while confirming pickup.'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  confirmPickup
};
