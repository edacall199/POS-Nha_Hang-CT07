import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

const SALT_ROUNDS = 10;

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleId: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  fullName?: string;
  phone?: string;
  roleId?: string;
  avatarUrl?: string;
  isActive?: boolean;
  password?: string;
}

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
};

export const userService = {
  async getAll() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    return user;
  },

  async create(dto: CreateUserDto) {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError('Email đã được sử dụng', 409);

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new AppError('Không tìm thấy vai trò', 404);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    return prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roleId: dto.roleId,
        avatarUrl: dto.avatarUrl,
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    });
  },

  async update(id: string, dto: UpdateUserDto) {
    await userService.getById(id); // ensure exists and not deleted

    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.roleId !== undefined) {
      const role = await prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new AppError('Không tìm thấy vai trò', 404);
      data.roleId = dto.roleId;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  },
};
