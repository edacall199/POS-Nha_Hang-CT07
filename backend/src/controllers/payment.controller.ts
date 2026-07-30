import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';

export const paymentController = {
  async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.createPayment(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async splitBill(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.splitBill(req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async generateVietQR(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.generateVietQR((req.params.orderId as string));
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
};
