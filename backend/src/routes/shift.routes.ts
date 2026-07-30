import { Router } from 'express';
import { shiftController } from '../controllers/shift.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const shiftRouter = Router();
shiftRouter.use(authenticate);

// POST open a new shift (ADMIN or MANAGER)
shiftRouter.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), shiftController.openShift);
// PATCH close a shift by ID
shiftRouter.patch('/:id/close', authorize('ADMIN', 'MANAGER', 'CASHIER'), shiftController.closeShift);
// GET currently active shift
shiftRouter.get('/active', shiftController.getActiveShift);
// GET all shifts (ADMIN or MANAGER)
shiftRouter.get('/', authorize('ADMIN', 'MANAGER'), shiftController.getAll);
