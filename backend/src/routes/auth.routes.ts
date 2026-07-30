import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, refreshTokenSchema } from '../validators/auth.validator';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', validate(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', validate(refreshTokenSchema), authController.logout);
authRouter.get('/me', authenticate, authController.me);
