import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';

export const categoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getAll();
      res.json({ success: true, data: categories });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.getById((req.params.id as string));
      res.json({ success: true, data: category });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update((req.params.id as string), req.body);
      res.json({ success: true, data: category });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.remove((req.params.id as string));
      res.json({ success: true, message: 'Đã xóa danh mục' });
    } catch (err) { next(err); }
  },
};
