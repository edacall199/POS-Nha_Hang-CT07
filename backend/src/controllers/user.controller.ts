import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const user = await userService.getById(userId);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAll();
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update((req.params.id as string), req.body);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },
};
