import { Request, Response, NextFunction } from 'express';
import { tableService } from '../services/table.service';

export const tableController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { zoneId } = req.query as { zoneId?: string };
      const tables = await tableService.getAll(zoneId);
      res.json({ success: true, data: tables });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await tableService.getById((req.params.id as string));
      res.json({ success: true, data: table });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await tableService.create(req.body);
      res.status(201).json({ success: true, data: table });
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await tableService.updateStatus((req.params.id as string), req.body.status);
      res.json({ success: true, data: table });
    } catch (err) { next(err); }
  },

  async moveOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, targetTableId } = req.body as { orderId: string; targetTableId: string };
      const result = await tableService.moveOrder(orderId, targetTableId);
      res.json({ success: true, data: result, message: 'Đã chuyển bàn thành công' });
    } catch (err) { next(err); }
  },

  async mergeTables(req: Request, res: Response, next: NextFunction) {
    try {
      const { primaryOrderId, sourceOrderId } = req.body as { primaryOrderId: string; sourceOrderId: string };
      const result = await tableService.mergeTables(primaryOrderId, sourceOrderId);
      res.json({ success: true, data: result, message: 'Đã gộp bàn thành công' });
    } catch (err) { next(err); }
  },
};
