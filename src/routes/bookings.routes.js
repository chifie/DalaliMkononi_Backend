import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as bookingsController from '../controllers/bookings.controller.js';

const router = Router();

router.post('/',
  authenticate,
  [
    body('property_id').isUUID().withMessage('Valid property ID required'),
    body('scheduled_at').isISO8601().withMessage('Valid date and time required'),
    body('notes').optional().trim()
  ],
  validate,
  bookingsController.createBooking
);

router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled'])
  ],
  validate,
  bookingsController.getMyBookings
);

router.get('/:id', authenticate, bookingsController.getBookingById);

router.put('/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Valid status required')
  ],
  validate,
  bookingsController.updateBookingStatus
);

router.put('/:id/cancel', authenticate, bookingsController.cancelBooking);

export default router;
