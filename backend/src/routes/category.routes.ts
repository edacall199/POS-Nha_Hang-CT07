import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const categoryRouter = Router();
categoryRouter.use(authenticate);

// GET all categories
categoryRouter.get('/', categoryController.getAll);
// GET single category by ID
categoryRouter.get('/:id', categoryController.getById);
// POST create category (ADMIN or MANAGER only)
categoryRouter.post('/', authorize('ADMIN', 'MANAGER'), categoryController.create);
// PATCH update category (ADMIN or MANAGER only)
categoryRouter.patch('/:id', authorize('ADMIN', 'MANAGER'), categoryController.update);
// DELETE category (ADMIN only)
categoryRouter.delete('/:id', authorize('ADMIN'), categoryController.remove);
