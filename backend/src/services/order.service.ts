import { prisma } from '../lib/prisma';
import { getTaxRate } from './config.service';
import { AppError } from '../middleware/error.middleware';
import { io } from '../app';
import type { CreateOrderDto } from '../validators/order.validator';

function generateOrderCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${dateStr}-${rand}`;
}

export const orderService = {
  async getAll(status?: string) {
    return prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        table: { include: { zone: true } },
        user: { select: { id: true, fullName: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  async getById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { include: { zone: true } },
        user: { select: { id: true, fullName: true } },
        items: { include: { menuItem: { include: { category: true } } } },
        payment: true,
      },
    });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    return order;
  },

  async create(dto: CreateOrderDto, userId: string) {
    // Validate table availability for dine-in
    if (dto.orderType === 'dine_in' && dto.tableId) {
      const table = await prisma.table.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new AppError('Không tìm thấy bàn', 404);
      if (table.status === 'occupied') {
        throw new AppError('Bàn đang có khách. Hãy thêm món vào order hiện tại.', 400);
      }
    }

    let shiftId = dto.shiftId;
    if (!shiftId) {
      const activeShift = await prisma.workShift.findFirst({
        where: { userId, status: 'open' },
      });
      if (activeShift) {
        shiftId = activeShift.id;
      } else {
        const newShift = await prisma.workShift.create({
          data: {
            userId,
            shiftDate: new Date(),
            startTime: new Date(),
            status: 'open',
            openingCash: 0,
          }
        });
        shiftId = newShift.id;
      }
    }

    // Calculate prices
    const itemsWithPrice = await Promise.all(
      dto.items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem || !menuItem.isAvailable) {
          throw new AppError(`Món "${menuItem?.name ?? item.menuItemId}" không còn phục vụ`, 400);
        }
        const unitPrice = Number(menuItem.price);
        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          notes: item.notes,
          status: 'pending',
        };
      }),
    );

    const subtotal = itemsWithPrice.reduce((sum, i) => sum + i.subtotal, 0);
    const taxRate = await getTaxRate();
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderCode: generateOrderCode(),
          tableId: dto.tableId,
          userId,
          shiftId: shiftId,
          orderType: dto.orderType,
          status: 'pending',
          subtotal,
          taxAmount,
          totalAmount,
          notes: dto.notes,
          items: { create: itemsWithPrice },
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      // Mark table as occupied
      if (dto.tableId && dto.orderType === 'dine_in') {
        await tx.table.update({ where: { id: dto.tableId }, data: { status: 'occupied' } });
      }

      return created;
    });

    // Broadcast new order
    io.emit('order:created', { orderId: order.id, tableId: order.tableId, orderCode: order.orderCode });
    if (order.tableId) {
      io.emit('table:status_changed', { tableId: order.tableId, status: 'occupied' });
    }

    return order;
  },

  async sendToKitchen(orderId: string) {
    const pendingItems = await prisma.orderItem.findMany({
      where: { orderId, status: 'pending' },
      include: { menuItem: true, order: { include: { table: true } } },
    });

    if (pendingItems.length === 0) {
      throw new AppError('Không có món nào cần gửi bếp', 400);
    }

    // Fetch recipes to deduct inventory
    const menuItemIds = pendingItems.map(i => i.menuItemId);
    const recipes = await prisma.recipe.findMany({
      where: { menuItemId: { in: menuItemIds } }
    });

    // Mark order as kitchen, items remain pending (Chờ chế biến), and deduct inventory
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'kitchen' } });

      // Deduct inventory based on recipes
      const orderUser = pendingItems[0]?.order?.userId; // fallback user for logs
      for (const item of pendingItems) {
        const itemRecipes = recipes.filter(r => r.menuItemId === item.menuItemId);
        for (const recipe of itemRecipes) {
          const deductAmount = Number(recipe.quantity) * item.quantity;
          
          // Conditional update: only deduct if sufficient stock
          const result = await tx.$executeRaw`
            UPDATE ingredients 
            SET stock_quantity = stock_quantity - ${deductAmount}, 
                updated_at = NOW()
            WHERE id = ${recipe.ingredientId}::uuid 
              AND stock_quantity >= ${deductAmount}
          `;
          
          if (result === 0) {
            const ingredient = await tx.ingredient.findUnique({ where: { id: recipe.ingredientId } });
            throw new AppError(
              `Không đủ tồn kho nguyên liệu "${ingredient?.name ?? recipe.ingredientId}" (cần ${deductAmount}, còn ${ingredient?.stockQuantity ?? 0})`,
              400
            );
          }

          await tx.inventoryLog.create({
            data: {
              ingredientId: recipe.ingredientId,
              changeQuantity: -deductAmount,
              reason: `Chế biến món: ${item.menuItem.name} (SL: ${item.quantity})`,
              referenceId: orderId,
              userId: orderUser,
            }
          });

          // Check low stock warning
          const updatedIngredient = await tx.ingredient.findUnique({ where: { id: recipe.ingredientId } });
          if (updatedIngredient && Number(updatedIngredient.stockQuantity) <= Number(updatedIngredient.minQuantity)) {
            io.emit('inventory:low_stock', {
              ingredientId: updatedIngredient.id,
              name: updatedIngredient.name,
              stock: updatedIngredient.stockQuantity
            });
          }
        }
      }
    });

    // Emit to kitchen display
    const tableCode = pendingItems[0]?.order?.table?.tableNumber ?? 'Mang về';
    io.emit('kitchen:new_ticket', {
      orderId,
      tableCode,
      items: pendingItems.map((i) => ({
        id: i.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        notes: i.notes,
        prepTime: i.menuItem.prepTimeMinutes,
      })),
      sentAt: new Date(),
    });

    return { success: true, itemsSent: pendingItems.length };
  },

  async updateItemStatus(itemId: string, status: string) {
    const validStatuses = ['pending', 'preparing', 'done', 'cancelled'];
    if (!validStatuses.includes(status)) throw new AppError('Trạng thái không hợp lệ', 400);

    const currentItem = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!currentItem) throw new AppError('Không tìm thấy món', 404);

    return prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { status },
        include: { order: { include: { table: true } }, menuItem: true },
      });

      // Inventory was already deducted in sendToKitchen — no double deduction

      io.emit('kitchen:item_updated', {
        itemId: item.id,
        orderId: item.orderId,
        status: item.status,
        menuItemName: item.menuItem.name,
        tableCode: item.order.table?.tableNumber,
      });

      return item;
    });
  },

  async updateStatus(id: string, status: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    // Refund points if cancelling a paid order with customer
    if (status === 'cancelled' && order.status === 'paid' && order.customerId) {
      const pointsToRefund = order.pointsUsed - order.pointsEarned; // positive = need to give back
      
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status } });
        
        if (pointsToRefund !== 0) {
          await tx.customer.update({
            where: { id: order.customerId! },
            data: { points: { increment: pointsToRefund } },
          });
        }

        // Log refund in point_transactions ledger
        if (order.pointsEarned > 0) {
          await tx.pointTransaction.create({
            data: {
              customerId: order.customerId!,
              orderId: id,
              type: 'refund',
              points: -order.pointsEarned,
              note: `Hoàn trừ điểm tích lũy do hủy đơn ${order.orderCode}`,
            },
          });
        }
        if (order.pointsUsed > 0) {
          await tx.pointTransaction.create({
            data: {
              customerId: order.customerId!,
              orderId: id,
              type: 'refund',
              points: order.pointsUsed,
              note: `Hoàn trả điểm đã dùng do hủy đơn ${order.orderCode}`,
            },
          });
        }

        if (order.tableId) {
          await tx.table.update({ where: { id: order.tableId }, data: { status: 'cleaning' } });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status } });
        if (status === 'cancelled' && order.tableId) {
          await tx.table.update({ where: { id: order.tableId }, data: { status: 'cleaning' } });
        }
      });
    }

    if (status === 'cancelled' && order.tableId) {
      io.emit('table:status_changed', { tableId: order.tableId, status: 'cleaning' });
    }

    io.emit('order:status_changed', { orderId: id, status });
    return { id, status };
  },
};
