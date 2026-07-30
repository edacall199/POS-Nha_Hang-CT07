import { Router } from 'express';
import { tableController } from '../controllers/table.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const tableRouter = Router();
tableRouter.use(authenticate);
tableRouter.get('/', tableController.getAll);
tableRouter.get('/:id', tableController.getById);
tableRouter.post('/', authorize('ADMIN', 'MANAGER'), tableController.create);
tableRouter.patch('/:id/status', tableController.updateStatus);
tableRouter.post('/move', tableController.moveOrder);
tableRouter.post('/merge', tableController.mergeTables);
