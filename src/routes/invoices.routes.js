import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import * as invoicesController from '../controllers/invoices.controller.js';

const router = Router();

router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'paid', 'overdue', 'cancelled'])
  ],
  validate,
  invoicesController.getMyInvoices
);

router.get('/:id', authenticate, invoicesController.getInvoiceById);

router.post('/',
  authenticate,
  authorize('landlord', 'admin'),
  [
    body('tenant_id').isUUID().withMessage('Valid tenant ID required'),
    body('property_id').isUUID().withMessage('Valid property ID required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('due_date').isDate().withMessage('Valid due date required'),
    body('description').optional().trim()
  ],
  validate,
  invoicesController.createInvoice
);

router.put('/:id/pay',
  authenticate,
  [
    body('payment_method').trim().notEmpty().withMessage('Payment method required'),
    body('payment_reference').trim().notEmpty().withMessage('Payment reference required')
  ],
  validate,
  invoicesController.payInvoice
);

router.put('/:id/status',
  authenticate,
  authorize('landlord', 'admin'),
  [
    body('status').isIn(['pending', 'paid', 'overdue', 'cancelled']).withMessage('Valid status required')
  ],
  validate,
  invoicesController.updateInvoiceStatus
);

router.delete('/:id', authenticate, authorize('landlord', 'admin'), invoicesController.deleteInvoice);

export default router;
