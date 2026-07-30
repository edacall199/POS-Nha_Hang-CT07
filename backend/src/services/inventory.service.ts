import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { io } from '../app';

export const inventoryService = {
  async getAll() {
    return prisma.ingredient.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  async addStock(id: string, quantity: number, costPerUnit: number, userId: string) {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) throw new AppError('Không tìm thấy nguyên liệu', 404);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id },
        data: {
          stockQuantity: { increment: quantity },
          costPerUnit: costPerUnit, // Update latest cost
        },
      });

      await tx.inventoryLog.create({
        data: {
          ingredientId: id,
          changeQuantity: quantity,
          reason: 'Nhập kho',
          userId,
        },
      });

      io.emit('inventory:updated', { ingredientId: id, stock: updated.stockQuantity });

      return updated;
    });
  },

  async create(data: { name: string; unit: string; minQuantity: number; costPerUnit: number; supplier?: string }) {
    return prisma.ingredient.create({
      data: {
        name: data.name,
        unit: data.unit,
        minQuantity: data.minQuantity,
        costPerUnit: data.costPerUnit,
        supplier: data.supplier,
        stockQuantity: 0,
      },
    });
  },

  async update(id: string, data: { name?: string; unit?: string; minQuantity?: number; costPerUnit?: number; supplier?: string }) {
    return prisma.ingredient.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.ingredient.update({
      where: { id },
      data: { isActive: false },
    });
  },
  
  async getLogs(ingredientId?: string) {
    return prisma.inventoryLog.findMany({
      where: ingredientId ? { ingredientId } : undefined,
      include: { user: { select: { fullName: true } }, ingredient: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
};
