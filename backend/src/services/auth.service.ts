import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import type { LoginDto } from '../validators/auth.validator';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'refresh_secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_DAYS = 7;

export const authService = {
  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }
    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, role: user.role.name, email: user.email };
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` } as jwt.SignOptions);

    // Hash refresh token and store
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        avatarUrl: user.avatarUrl,
      },
    };
  },

  async refreshAccessToken(refreshToken: string) {
    let payload: { sub: string; role: string; email: string };
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET) as typeof payload;
    } catch {
      throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token đã bị thu hồi hoặc hết hạn', 401);
    }

    const newAccessToken = jwt.sign(
      { sub: payload.sub, role: payload.role, email: payload.email },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions,
    );

    return { accessToken: newAccessToken };
  },

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  },
};
