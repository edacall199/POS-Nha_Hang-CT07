import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError || (err as any).isOperational) {
    res.status((err as any).statusCode || 400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: `Giá trị đã tồn tại: ${prismaErr.meta?.target?.join(', ')}`,
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi' });
      return;
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Lỗi hệ thống nội bộ',
  });
};
