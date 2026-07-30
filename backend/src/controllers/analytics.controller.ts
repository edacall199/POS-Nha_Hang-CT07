import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const timeRange = (req.query.timeRange as string) || 'day';
      const stats = await analyticsService.getDashboardStats(timeRange);
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  }
};
