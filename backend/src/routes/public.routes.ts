import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema } from '../validators/order.validator';

export const publicRouter = Router();

// NO authentication required for these routes
publicRouter.get('/menus', publicController.getMenu);
publicRouter.get('/tables/:tableId', publicController.getTableInfo);
publicRouter.post('/orders', validate(createOrderSchema), publicController.createGuestOrder);
