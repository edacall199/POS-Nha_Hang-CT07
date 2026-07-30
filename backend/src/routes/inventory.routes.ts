import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);
inventoryRouter.use(authorize('ADMIN', 'MANAGER'));

inventoryRouter.get('/', inventoryController.getAll);
inventoryRouter.post('/', inventoryController.create);
inventoryRouter.put('/:id', inventoryController.update);
inventoryRouter.delete('/:id', inventoryController.delete);
inventoryRouter.post('/:id/stock', inventoryController.addStock);
inventoryRouter.get('/logs', inventoryController.getLogs);
