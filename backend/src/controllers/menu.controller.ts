import { Request, Response, NextFunction } from 'express';
import { menuService } from '../services/menu.service';

export const menuController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.query as { categoryId?: string };
      const items = await menuService.getAll(categoryId);
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await menuService.getById((req.params.id as string));
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await menuService.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await menuService.update((req.params.id as string), req.body);
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await menuService.remove((req.params.id as string));
      res.json({ success: true, message: 'Đã xóa món ăn' });
    } catch (err) { next(err); }
  },

  async getRecipes(req: Request, res: Response, next: NextFunction) {
    try {
      const recipes = await menuService.getRecipes((req.params.id as string));
      res.json({ success: true, data: recipes });
    } catch (err) { next(err); }
  },

  async setRecipes(req: Request, res: Response, next: NextFunction) {
    try {
      const recipes = await menuService.setRecipes((req.params.id as string), req.body);
      res.json({ success: true, data: recipes, message: 'Đã cập nhật công thức' });
    } catch (err) { next(err); }
  },
};
