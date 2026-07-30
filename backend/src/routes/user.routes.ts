import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const userRouter = Router();
userRouter.use(authenticate);

// GET own profile
userRouter.get('/me', userController.getMe);
// GET all users (ADMIN or MANAGER only)
userRouter.get('/', authorize('ADMIN', 'MANAGER'), userController.getAll);
// POST create user (ADMIN only)
userRouter.post('/', authorize('ADMIN'), userController.create);
// PATCH update user (ADMIN or MANAGER)
userRouter.patch('/:id', authorize('ADMIN', 'MANAGER'), userController.update);
