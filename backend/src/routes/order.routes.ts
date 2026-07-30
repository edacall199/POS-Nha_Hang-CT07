import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';

export const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.get('/', orderController.getAll);
orderRouter.get('/:id', orderController.getById);
orderRouter.post('/', validate(createOrderSchema), orderController.create);
orderRouter.post('/:id/send-kitchen', orderController.sendToKitchen);
orderRouter.patch('/items/:itemId/status', orderController.updateItemStatus);
orderRouter.patch('/:id/status', validate(updateOrderStatusSchema), orderController.updateStatus);
