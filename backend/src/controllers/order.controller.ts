import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';

export const orderController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: string };
      const orders = await orderService.getAll(status);
      res.json({ success: true, data: orders });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getById((req.params.id as string));
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const order = await orderService.create(req.body, userId);
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  },

  async sendToKitchen(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.sendToKitchen((req.params.id as string));
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await orderService.updateItemStatus((req.params.itemId as string), req.body.status);
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.updateStatus((req.params.id as string), req.body.status);
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  },
};
