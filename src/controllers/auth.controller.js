import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { supabase } from '../db/supabase.js';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    // Check email uniqueness
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check phone uniqueness (if provided)
    if (phone) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        full_name,
        phone,
        role: role || 'tenant',
      })
      .select('id, email, full_name, phone, role, avatar_url, is_verified, created_at')
      .single();

    if (error) throw error;

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
    let query = supabase.from('users').select('*').eq('email', id);
    let { data: user, error } = await query.maybeSingle();

    // If not found by email, try phone
    if (!user) {
      const phoneResult = await supabase
        .from('users')
        .select('*')
        .eq('phone', identifier.trim())
        .maybeSingle();
      user = phoneResult.data;
      error = phoneResult.error;
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const token = generateToken(user);
    const { password_hash: _pw, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req, res, _next) => {
  res.json({ message: 'Logout successful' });
};

export const getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, avatar_url, is_verified, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
