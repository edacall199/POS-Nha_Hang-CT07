import { prisma } from '../lib/prisma';
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
    const taxAmount = Math.round(subtotal * 0.08);
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

    // Mark order as kitchen and items as preparing, and deduct inventory
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'kitchen' } });
      await tx.orderItem.updateMany({
        where: { orderId, status: 'pending' },
        data: { status: 'preparing' },
      });

      // Deduct inventory based on recipes
      const orderUser = pendingItems[0]?.order?.userId; // fallback user for logs
      for (const item of pendingItems) {
        const itemRecipes = recipes.filter(r => r.menuItemId === item.menuItemId);
        for (const recipe of itemRecipes) {
          const deductAmount = Number(recipe.quantity) * item.quantity;
          
          await tx.ingredient.update({
            where: { id: recipe.ingredientId },
            data: { stockQuantity: { decrement: deductAmount } }
          });

          await tx.inventoryLog.create({
            data: {
              ingredientId: recipe.ingredientId,
              changeQuantity: -deductAmount,
              reason: `Chế biến món: ${item.menuItem.name} (SL: ${item.quantity})`,
              referenceId: orderId,
              userId: orderUser,
            }
          });
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

      // Auto-deduct inventory when item is marked as done
      if (status === 'done' && currentItem.status !== 'done') {
        const recipes = await tx.recipe.findMany({
          where: { menuItemId: item.menuItemId },
        });

        for (const recipe of recipes) {
          const deduction = Number(recipe.quantity) * item.quantity;
          
          const updatedIngredient = await tx.ingredient.update({
            where: { id: recipe.ingredientId },
            data: {
              stockQuantity: { decrement: deduction }
            }
          });

          await tx.inventoryLog.create({
            data: {
              ingredientId: recipe.ingredientId,
              changeQuantity: -deduction,
              reason: `Bán ${item.quantity}x ${item.menuItem.name} (ĐH: ${item.order.orderCode})`,
              referenceId: item.orderId,
              userId: item.order.userId, // Assume the person who created the order or a system bot
            }
          });

          // Check if low stock to emit warning
          if (Number(updatedIngredient.stockQuantity) <= Number(updatedIngredient.minQuantity)) {
            io.emit('inventory:low_stock', {
              ingredientId: updatedIngredient.id,
              name: updatedIngredient.name,
              stock: updatedIngredient.stockQuantity
            });
          }
        }
      }

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
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });
    io.emit('order:status_changed', { orderId: order.id, status: order.status });
    return order;
  },
};
