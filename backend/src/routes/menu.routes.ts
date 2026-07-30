import { Router } from 'express';
import { menuController } from '../controllers/menu.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const menuRouter = Router();
menuRouter.use(authenticate);

// GET all menu items - optional ?categoryId= filter
menuRouter.get('/', menuController.getAll);
// GET single menu item by ID
menuRouter.get('/:id', menuController.getById);
// POST create menu item (ADMIN or MANAGER only)
menuRouter.post('/', authorize('ADMIN', 'MANAGER'), menuController.create);
// PATCH update menu item (ADMIN or MANAGER only)
menuRouter.patch('/:id', authorize('ADMIN', 'MANAGER'), menuController.update);
// DELETE soft-delete menu item (ADMIN or MANAGER only)
menuRouter.delete('/:id', authorize('ADMIN', 'MANAGER'), menuController.remove);

// GET recipes for a menu item
menuRouter.get('/:id/recipes', menuController.getRecipes);
// POST set recipes for a menu item
menuRouter.post('/:id/recipes', authorize('ADMIN', 'MANAGER'), menuController.setRecipes);
