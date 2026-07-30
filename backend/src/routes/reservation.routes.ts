import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const reservationRouter = Router();
reservationRouter.use(authenticate);

// GET all reservations
reservationRouter.get('/', reservationController.getAll);
// GET single reservation by ID
reservationRouter.get('/:id', reservationController.getById);
// POST create reservation
reservationRouter.post('/', reservationController.create);
// PATCH update reservation
reservationRouter.patch('/:id', reservationController.update);
// DELETE reservation (ADMIN or MANAGER)
reservationRouter.delete('/:id', authorize('ADMIN', 'MANAGER'), reservationController.remove);
