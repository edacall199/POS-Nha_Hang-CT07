import { Request, Response, NextFunction } from 'express';
import { shiftService } from '../services/shift.service';

export const shiftController = {
  async openShift(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const shift = await shiftService.openShift({
        userId,
        openingCash: req.body.openingCash ?? 0,
        notes: req.body.notes,
      });
      res.status(201).json({ success: true, data: shift });
    } catch (err) { next(err); }
  },

  async closeShift(req: Request, res: Response, next: NextFunction) {
    try {
      const shift = await shiftService.closeShift((req.params.id as string), {
        closingCash: req.body.closingCash ?? 0,
        notes: req.body.notes,
      });
      res.json({ success: true, data: shift });
    } catch (err) { next(err); }
  },

  async getActiveShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.query as { userId?: string };
      const shift = await shiftService.getActiveShift(userId);
      res.json({ success: true, data: shift });
    } catch (err) { next(err); }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const shifts = await shiftService.getAll();
      res.json({ success: true, data: shifts });
    } catch (err) { next(err); }
  },
};
