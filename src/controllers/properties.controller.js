import { query } from '../db/pool.js';

export const getAllProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.query.category) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(req.query.category);
    }

    if (req.query.status) {
      conditions.push(`p.status = $${idx++}`);
      params.push(req.query.status);
    }

    if (req.query.vacant) {
      conditions.push(`p.vacant = $${idx++}`);
      params.push(req.query.vacant === 'true');
    }

    if (req.query.is_verified) {
      conditions.push(`p.is_verified = $${idx++}`);
      params.push(req.query.is_verified === 'true');
    }

    if (req.query.min_price) {
      conditions.push(`p.price >= $${idx++}`);
      params.push(parseFloat(req.query.min_price));
    }

    if (req.query.max_price) {
      conditions.push(`p.price <= $${idx++}`);
      params.push(parseFloat(req.query.max_price));
    }

    if (req.query.location) {
      conditions.push(`p.location ILIKE $${idx++}`);
      params.push(`%${req.query.location}%`);
    }

    if (req.query.bedrooms) {
      conditions.push(`p.bedrooms >= $${idx++}`);
      params.push(parseInt(req.query.bedrooms));
    }

    if (req.query.is_featured) {
      conditions.push(`p.is_featured = $${idx++}`);
      params.push(true);
    }

    if (req.query.landlord_id) {
      conditions.push(`p.landlord_id = $${idx++}`);
      params.push(req.query.landlord_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: properties } = await query(
      `SELECT p.*,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
              u.id AS landlord_user_id, u.full_name AS landlord_name, u.phone AS landlord_phone, u.avatar_url AS landlord_avatar
       FROM properties p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.landlord_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM properties p ${where}`,
      params
    );

    res.json({
      properties,
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

export const getPropertyById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
              u.id AS landlord_user_id, u.full_name AS landlord_name, u.phone AS landlord_phone, u.avatar_url AS landlord_avatar, u.email AS landlord_email
       FROM properties p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.landlord_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ property: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createProperty = async (req, res, next) => {
  try {
    const {
      title, description, price, location, address,
      bedrooms, bathrooms, area_sqm, category_id,
      images, amenities, is_featured, vacant,
    } = req.body;

    const { rows: [property] } = await query(
      `INSERT INTO properties
         (title, description, price, location, address, bedrooms, bathrooms,
          area_sqm, category_id, landlord_id, images, amenities, is_featured, vacant)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        title, description, price, location, address,
        bedrooms || null, bathrooms || null, area_sqm || null,
        category_id, req.user.id,
        images || '{}', amenities || '{}',
        is_featured || false, vacant !== undefined ? vacant : true,
      ]
    );

    res.status(201).json({
      message: 'Property created successfully',
      property,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { rows: existing } = await query(
      'SELECT landlord_id FROM properties WHERE id = $1', [id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (existing[0].landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const allowed = [
      'title', 'description', 'price', 'location', 'address',
      'bedrooms', 'bathrooms', 'area_sqm', 'category_id',
      'status', 'images', 'amenities', 'is_featured', 'vacant',
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(req.body[key]);
      }
    }

    if (req.user.role !== 'admin') {
      const vi = fields.findIndex(f => f.startsWith('is_verified'));
      if (vi !== -1) { fields.splice(vi, 1); values.splice(vi, 1); }
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE properties SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({
      message: 'Property updated successfully',
      property: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProperty = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT landlord_id FROM properties WHERE id = $1', [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (rows[0].landlord_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }

    await query('DELETE FROM properties WHERE id = $1', [req.params.id]);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMyProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows: properties } = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM properties p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.landlord_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM properties WHERE landlord_id = $1',
      [req.user.id]
    );

    res.json({
      properties,
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

export const getFeaturedProperties = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const { rows: properties } = await query(
      `SELECT p.*,
              c.name AS category_name, c.slug AS category_slug,
              u.full_name AS landlord_name, u.phone AS landlord_phone, u.avatar_url AS landlord_avatar
       FROM properties p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.landlord_id
       WHERE p.is_featured = true AND p.status = 'available'
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ properties });
  } catch (error) {
    next(error);
  }
};

export const verifyProperty = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE properties SET is_verified = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      message: 'Property verified successfully',
      property: rows[0],
    });
  } catch (error) {
    next(error);
  }
};
