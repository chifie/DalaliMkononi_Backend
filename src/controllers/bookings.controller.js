import { query } from '../db/pool.js';

export const createBooking = async (req, res, next) => {
  try {
    const { property_id, scheduled_at, notes } = req.body;

    const { rows: prop } = await query(
      'SELECT id, status, vacant FROM properties WHERE id = $1',
      [property_id]
    );

    if (!prop.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (prop[0].status !== 'available' || prop[0].vacant === false) {
      return res.status(400).json({ error: 'Property is not available for viewing' });
    }

    const { rows: [booking] } = await query(
      `INSERT INTO bookings (property_id, tenant_id, scheduled_at, notes, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [property_id, req.user.id, scheduled_at, notes || null]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.user.role === 'tenant') {
      conditions.push(`b.tenant_id = $${idx++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'landlord') {
      // Get landlord's property IDs first
      const { rows: props } = await query(
        'SELECT id FROM properties WHERE landlord_id = $1',
        [req.user.id]
      );
      const ids = props.map(p => p.id);
      if (!ids.length) {
        return res.json({ bookings: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      conditions.push(`b.property_id = ANY($${idx++}::uuid[])`);
      params.push(ids);
    }

    if (status) {
      conditions.push(`b.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: bookings } = await query(
      `SELECT b.*,
              p.id AS property_id, p.title AS property_title, p.location AS property_location, p.images AS property_images,
              l.full_name AS landlord_name, l.phone AS landlord_phone
       FROM bookings b
       LEFT JOIN properties p ON p.id = b.property_id
       LEFT JOIN users l ON l.id = p.landlord_id
       ${where}
       ORDER BY b.scheduled_at ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM bookings b ${where}`,
      params
    );

    res.json({
      bookings,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.*,
              p.id AS property_id, p.title AS property_title, p.location AS property_location,
              p.images AS property_images, p.address AS property_address,
              l.id AS landlord_id, l.full_name AS landlord_name, l.phone AS landlord_phone, l.email AS landlord_email,
              t.full_name AS tenant_name, t.phone AS tenant_phone, t.email AS tenant_email
       FROM bookings b
       LEFT JOIN properties p ON p.id = b.property_id
       LEFT JOIN users l ON l.id = p.landlord_id
       LEFT JOIN users t ON t.id = b.tenant_id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = rows[0];

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    if (req.user.role === 'landlord' && booking.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    res.json({ booking });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rows } = await query(
      `SELECT b.*, p.landlord_id
       FROM bookings b
       LEFT JOIN properties p ON p.id = b.property_id
       WHERE b.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = rows[0];
    const isLandlord = booking.landlord_id === req.user.id;
    const isTenant = booking.tenant_id === req.user.id;

    if (!isLandlord && !isTenant) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    const { rows: updated } = await query(
      `UPDATE bookings SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    res.json({
      message: 'Booking status updated',
      booking: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'SELECT tenant_id, status FROM bookings WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.user.role === 'tenant' && rows[0].tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (rows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    if (rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    await query(
      "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
};
