import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service';

export const inventoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await inventoryService.getAll();
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  },

  async addStock(req: Request, res: Response, next: NextFunction) {
    try {
      // User ID from auth middleware
      const userId = req.user!.sub;
      const { quantity, costPerUnit } = req.body;
      if (!quantity || !costPerUnit) {
        return res.status(400).json({ success: false, message: 'Cần nhập số lượng và giá nhập kho' });
      }
      const updated = await inventoryService.addStock((req.params.id as string)!, Number(quantity), Number(costPerUnit), userId);
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await inventoryService.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { ingredientId } = req.query;
      const logs = await inventoryService.getLogs(ingredientId as string);
      res.json({ success: true, data: logs });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await inventoryService.update(req.params.id as string, req.body);
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryService.delete(req.params.id as string);
      res.json({ success: true, message: 'Đã xóa nguyên liệu' });
    } catch (err) { next(err); }
  }
};
