import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase(),
  password: z.string().min(1, 'Mật khẩu không được trống'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được trống'),
});

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(100),
  fullName: z.string().min(2).max(100).trim(),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ')
    .optional(),
  roleId: z.string().uuid('Role ID phải là UUID'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
