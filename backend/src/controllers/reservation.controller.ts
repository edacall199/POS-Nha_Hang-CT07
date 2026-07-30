import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';

export const reservationController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: string };
      const reservations = await reservationService.getAll(status);
      res.json({ success: true, data: reservations });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.getById((req.params.id as string));
      res.json({ success: true, data: reservation });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.create(req.body);
      res.status(201).json({ success: true, data: reservation });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.update((req.params.id as string), req.body);
      res.json({ success: true, data: reservation });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await reservationService.remove((req.params.id as string));
      res.json({ success: true, message: 'Đã xóa đặt bàn' });
    } catch (err) { next(err); }
  },
};
