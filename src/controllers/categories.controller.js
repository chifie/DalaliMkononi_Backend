import { query } from '../db/pool.js';

export const getAllCategories = async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json({ categories: rows });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM categories WHERE slug = $1',
      [req.params.slug]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getCategoryProperties = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows: cat } = await query(
      'SELECT id FROM categories WHERE slug = $1',
      [slug]
    );

    if (!cat.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { rows: properties } = await query(
      `SELECT p.*,
              u.full_name AS landlord_name, u.phone AS landlord_phone, u.avatar_url AS landlord_avatar
       FROM properties p
       LEFT JOIN users u ON u.id = p.landlord_id
       WHERE p.category_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [cat[0].id, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM properties WHERE category_id = $1',
      [cat[0].id]
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
