import { Request, Response, NextFunction } from 'express';
import { publicService } from '../services/public.service';

export const publicController = {
  async getMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const menu = await publicService.getMenu();
      res.json({ success: true, data: menu });
    } catch (err) { next(err); }
  },

  async getTableInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await publicService.getTableInfo((req.params.id as string));
      res.json({ success: true, data: table });
    } catch (err) { next(err); }
  },

  async createGuestOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { tableId, items } = req.body;
      const order = await publicService.createGuestOrder(tableId, items);
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  }
};
