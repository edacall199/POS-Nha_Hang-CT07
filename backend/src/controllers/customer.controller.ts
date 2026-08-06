import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';

export const customerController = {
  async getByPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const phone = req.params.phone as string;
      const customer = await customerService.findByPhone(phone);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      res.json({ success: true, data: customer });
    } catch (error) { next(error); }
  },

  async registerOrUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.createOrUpdateCustomer(req.body);
      res.json({ success: true, data: customer });
    } catch (error) { next(error); }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await customerService.getAll();
      res.json({ success: true, data: customers });
    } catch (error) { next(error); }
  },

  async getPointTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const transactions = await customerService.getPointTransactions(id);
      res.json({ success: true, data: transactions });
    } catch (error) { next(error); }
  }
};
