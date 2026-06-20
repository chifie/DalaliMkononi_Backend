import { query } from '../db/pool.js';

export const getMyInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role === 'tenant') {
      conditions.push(`i.tenant_id = $${idx++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'landlord') {
      conditions.push(`i.landlord_id = $${idx++}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`i.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: invoices } = await query(
      `SELECT i.*,
              p.title AS property_title, p.location AS property_location, p.images AS property_images,
              t.full_name AS tenant_name, t.phone AS tenant_phone,
              l.full_name AS landlord_name, l.phone AS landlord_phone
       FROM invoices i
       LEFT JOIN properties p ON p.id = i.property_id
       LEFT JOIN users t ON t.id = i.tenant_id
       LEFT JOIN users l ON l.id = i.landlord_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM invoices i ${where}`,
      params
    );

    res.json({
      invoices,
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

export const getInvoiceById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.*,
              p.title AS property_title, p.location AS property_location, p.images AS property_images, p.address AS property_address,
              t.full_name AS tenant_name, t.phone AS tenant_phone, t.email AS tenant_email,
              l.full_name AS landlord_name, l.phone AS landlord_phone, l.email AS landlord_email
       FROM invoices i
       LEFT JOIN properties p ON p.id = i.property_id
       LEFT JOIN users t ON t.id = i.tenant_id
       LEFT JOIN users l ON l.id = i.landlord_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = rows[0];

    if (req.user.role === 'tenant' && invoice.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    if (req.user.role === 'landlord' && invoice.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { tenant_id, property_id, amount, due_date, description } = req.body;

    const { rows: prop } = await query(
      'SELECT landlord_id FROM properties WHERE id = $1', [property_id]
    );

    if (!prop.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (prop[0].landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to create invoice for this property' });
    }

    const { rows: [invoice] } = await query(
      `INSERT INTO invoices (tenant_id, landlord_id, property_id, amount, due_date, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [tenant_id, req.user.id, property_id, amount, due_date, description || null]
    );

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const payInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;

    const { rows } = await query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = rows[0];

    if (req.user.role === 'tenant' && invoice.tenant_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to pay this invoice' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice has been cancelled' });
    }

    const { rows: updated } = await query(
      `UPDATE invoices
       SET status = 'paid', payment_method = $1, payment_reference = $2, paid_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [payment_method, payment_reference, id]
    );

    res.json({
      message: 'Payment successful',
      invoice: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rows } = await query('SELECT landlord_id FROM invoices WHERE id = $1', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (req.user.role === 'landlord' && rows[0].landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this invoice' });
    }

    const { rows: updated } = await query(
      'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      message: 'Invoice status updated',
      invoice: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT landlord_id, status FROM invoices WHERE id = $1', [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (rows[0].landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this invoice' });
    }

    if (rows[0].status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoice' });
    }

    await query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
