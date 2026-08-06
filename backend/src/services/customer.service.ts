import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export const customerService = {
  async findByPhone(phone: string) {
    return prisma.customer.findUnique({
      where: { phone }
    });
  },

  async getCustomerById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  },

  async createOrUpdateCustomer(data: { phone: string; fullName: string; pointsToAdd?: number; spendToAdd?: number }) {
    const { phone, fullName, pointsToAdd = 0, spendToAdd = 0 } = data;
    const existing = await prisma.customer.findUnique({ where: { phone } });

    if (existing) {
      return prisma.customer.update({
        where: { phone },
        data: {
          fullName,
          points: { increment: pointsToAdd },
          totalSpent: { increment: spendToAdd }
        }
      });
    }

    return prisma.customer.create({
      data: {
        phone,
        fullName,
        points: pointsToAdd,
        totalSpent: spendToAdd
      }
    });
  },

  async redeemPoints(phone: string, pointsToRedeem: number) {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new AppError('Không tìm thấy khách hàng', 404);
    if (customer.points < pointsToRedeem) {
      throw new AppError('Khách hàng không đủ điểm', 400);
    }

    return prisma.customer.update({
      where: { phone },
      data: {
        points: { decrement: pointsToRedeem }
      }
    });
  },

  async getAll() {
    return prisma.customer.findMany({
      include: {
        _count: { select: { orders: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getPointTransactions(customerId: string) {
    return prisma.pointTransaction.findMany({
      where: { customerId },
      include: {
        order: {
          select: { orderCode: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
};
