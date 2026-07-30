import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const roleController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: roles });
    } catch (err) { next(err); }
  }
};
