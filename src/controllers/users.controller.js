import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

export const getProfile = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, full_name, phone, role, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, avatar_url, password } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
    if (phone !== undefined)     { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (avatar_url !== undefined){ fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    if (password) {
      fields.push(`password_hash = $${idx++}`);
      values.push(await bcrypt.hash(password, 12));
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING id, email, full_name, phone, role, avatar_url, is_verified, created_at, updated_at`,
      values
    );

    res.json({
      message: 'Profile updated successfully',
      user: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const roleFilter = req.query.role;

    let where = '';
    const params = [];
    if (roleFilter) {
      where = 'WHERE role = $1';
      params.push(roleFilter);
    }

    const { rows: users } = await query(
      `SELECT id, email, full_name, phone, role, avatar_url, is_verified, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      roleFilter ? [roleFilter] : []
    );

    res.json({
      users,
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

export const getUserById = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, full_name, phone, role, avatar_url, is_verified, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);

    if (!rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getLandlords = async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, full_name, phone, avatar_url FROM users WHERE role = 'landlord' ORDER BY full_name ASC"
    );
    res.json({ landlords: rows });
  } catch (error) {
    next(error);
  }
};
