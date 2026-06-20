import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function stripPassword(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    // Check email uniqueness
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check phone uniqueness
    if (phone) {
      const phoneCheck = await query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { rows: [user] } = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, phone, role, avatar_url, is_verified, created_at`,
      [email.toLowerCase(), password_hash, full_name, phone || null, role || 'tenant']
    );

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const id = identifier.trim().toLowerCase();

    // Try email first, then phone
    let result = await query(
      'SELECT * FROM users WHERE email = $1',
      [id]
    );

    if (!result.rows.length) {
      result = await query(
        'SELECT * FROM users WHERE phone = $1',
        [identifier.trim()]
      );
    }

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: stripPassword(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req, res) => {
  res.json({ message: 'Logout successful' });
};

export const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, full_name, phone, role, avatar_url, is_verified, created_at FROM users WHERE id = $1',
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
