import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authenticate } from '../middleware/auth.middleware';

export const roleRouter = Router();

roleRouter.use(authenticate);
roleRouter.get('/', roleController.getAll);
