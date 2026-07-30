import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface OpenShiftDto {
  userId: string;
  openingCash: number;
  notes?: string;
}

export interface CloseShiftDto {
  closingCash: number;
  notes?: string;
}

export const shiftService = {
  async openShift(dto: OpenShiftDto) {
    // Check if user already has an open shift
    const existing = await prisma.workShift.findFirst({
      where: { userId: dto.userId, status: 'open' },
    });
    if (existing) {
      throw new AppError('Người dùng đang có ca làm việc chưa đóng', 400);
    }

    const now = new Date();
    const shiftDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return prisma.workShift.create({
      data: {
        userId: dto.userId,
        shiftDate,
        startTime: now,
        openingCash: dto.openingCash,
        status: 'open',
        notes: dto.notes,
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  },

  async closeShift(id: string, dto: CloseShiftDto) {
    const shift = await prisma.workShift.findUnique({ where: { id } });
    if (!shift) throw new AppError('Không tìm thấy ca làm việc', 404);
    if (shift.status !== 'open') throw new AppError('Ca làm việc đã được đóng', 400);

    return prisma.workShift.update({
      where: { id },
      data: {
        endTime: new Date(),
        closingCash: dto.closingCash,
        status: 'closed',
        notes: dto.notes ?? shift.notes,
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  },

  async getActiveShift(userId?: string) {
    return prisma.workShift.findFirst({
      where: {
        status: 'open',
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  },

  async getAll() {
    const shifts = await prisma.workShift.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { orders: true } },
        orders: {
          include: { payment: true }
        }
      },
      orderBy: { startTime: 'desc' },
    });

    return shifts.map(s => {
      const cashSales = s.orders.reduce((sum, o) => sum + (o.payment?.method === 'cash' ? Number(o.totalAmount) : 0), 0);
      const expectedCash = Number(s.openingCash) + cashSales;
      const difference = s.status === 'closed' ? Number(s.closingCash) - expectedCash : null;
      
      const { orders, ...rest } = s;
      return { ...rest, cashSales, expectedCash, difference };
    });
  },
};
