import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import * as propertiesController from '../controllers/properties.controller.js';

const router = Router();

router.get('/featured', propertiesController.getFeaturedProperties);

router.get('/my', authenticate, authorize('landlord'), propertiesController.getMyProperties);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('min_price').optional().isFloat({ min: 0 }),
    query('max_price').optional().isFloat({ min: 0 }),
    query('bedrooms').optional().isInt({ min: 0 }),
  ],
  validate,
  propertiesController.getAllProperties
);

router.get('/:id', optionalAuth, propertiesController.getPropertyById);

router.post('/',
  authenticate,
  authorize('landlord', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    body('location').trim().notEmpty().withMessage('Location required'),
    body('address').optional().trim(),
    body('bedrooms').optional().isInt({ min: 0 }),
    body('bathrooms').optional().isInt({ min: 0 }),
    body('area_sqm').optional().isFloat({ min: 0 }),
    body('category_id').isUUID().withMessage('Valid category required'),
    body('images').optional().isArray(),
    body('amenities').optional().isArray(),
    body('is_featured').optional().isBoolean(),
    body('vacant').optional().isBoolean(),
  ],
  validate,
  propertiesController.createProperty
);

router.put('/:id',
  authenticate,
  authorize('landlord', 'admin'),
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('location').optional().trim().notEmpty(),
    body('address').optional().trim(),
    body('bedrooms').optional().isInt({ min: 0 }),
    body('bathrooms').optional().isInt({ min: 0 }),
    body('area_sqm').optional().isFloat({ min: 0 }),
    body('category_id').optional().isUUID(),
    body('status').optional().isIn(['available', 'rented', 'maintenance']),
    body('images').optional().isArray(),
    body('amenities').optional().isArray(),
    body('is_featured').optional().isBoolean(),
    body('vacant').optional().isBoolean(),
  ],
  validate,
  propertiesController.updateProperty
);

router.delete('/:id', authenticate, authorize('landlord', 'admin'), propertiesController.deleteProperty);

router.patch('/:id/verify', authenticate, authorize('admin'), propertiesController.verifyProperty);

export default router;
