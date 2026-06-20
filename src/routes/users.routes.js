import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

router.get('/me', authenticate, usersController.getProfile);

router.put('/me',
  authenticate,
  [
    body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('phone').optional().trim(),
    body('avatar_url').optional().isURL().withMessage('Valid URL required for avatar'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  usersController.updateProfile
);

router.get('/landlords', authenticate, usersController.getLandlords);

router.get('/',
  authenticate,
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['tenant', 'landlord', 'admin']).withMessage('Invalid role filter'),
  ],
  validate,
  usersController.getAllUsers
);

router.get('/:id', authenticate, authorize('admin'), usersController.getUserById);

router.delete('/:id', authenticate, authorize('admin'), usersController.deleteUser);

export default router;
