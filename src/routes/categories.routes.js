import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import * as categoriesController from '../controllers/categories.controller.js';

const router = Router();

router.get('/', categoriesController.getAllCategories);

router.get('/:slug', categoriesController.getCategoryBySlug);

router.get('/:slug/properties',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  categoriesController.getCategoryProperties
);

export default router;
