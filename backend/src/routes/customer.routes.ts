import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';

export const customerRouter = Router();

customerRouter.use(authenticate);
customerRouter.get('/phone/:phone', customerController.getByPhone);
customerRouter.post('/', customerController.registerOrUpdate);
customerRouter.get('/', customerController.getAll);
