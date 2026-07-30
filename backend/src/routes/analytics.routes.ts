import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);
analyticsRouter.get('/dashboard', authorize('ADMIN', 'MANAGER'), analyticsController.getDashboardStats);
