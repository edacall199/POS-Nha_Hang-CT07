import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';

export interface JwtPayload {
  sub: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Không có token xác thực', 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AppError('Không có token xác thực', 401);
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET ?? '';
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError('Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Chưa xác thực', 401);
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError('Không có quyền thực hiện thao tác này', 403);
    }
    next();
  };
};
