import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').trim().notEmpty().withMessage('Full name required'),
    body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
    body('role').optional().isIn(['tenant', 'landlord']).withMessage('Invalid role'),
  ],
  validate,
  authController.register
);

router.post('/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authController.login
);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

export default router;
