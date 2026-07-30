import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { io } from '../app';

export const publicService = {
  async getMenu() {
    // Return all active categories with their active menu items
    return prisma.category.findMany({
      where: { isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true, deletedAt: null },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  },

  async getTableInfo(tableId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: { zone: true }
    });
    if (!table) throw new AppError('Không tìm thấy bàn', 404);
    return table;
  },

  async createGuestOrder(tableId: string, items: Array<{ menuItemId: string, quantity: number, notes?: string }>) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new AppError('Không tìm thấy bàn', 404);

    // Find any open shift to attach the order to. If none, use a generic admin user if possible
    // For a real app, an active shift is required. Here we find the first open shift.
    const activeShift = await prisma.workShift.findFirst({
      where: { status: 'open' },
      include: { user: true }
    });

    if (!activeShift) {
      throw new AppError('Nhà hàng hiện chưa mở ca làm việc. Vui lòng gọi nhân viên!', 400);
    }

    const userId = activeShift.userId;

    // Check if table already has a pending order, if so, append to it, or just create a new one.
    // For simplicity, we create a new order each time a guest submits.

    // Calculate prices
    const itemsWithPrice = await Promise.all(
      items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem || !menuItem.isAvailable) {
          throw new AppError(`Món "${menuItem?.name ?? item.menuItemId}" đã hết`, 400);
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
      })
    );

    const subtotal = itemsWithPrice.reduce((sum, i) => sum + i.subtotal, 0);
    const taxAmount = Math.round(subtotal * 0.08); // 8% VAT
    const totalAmount = subtotal + taxAmount;

    // Generate Order Code
    const dateStr = new Date().toISOString().replace(/\D/g, '').slice(0, 8);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const orderCode = `GUEST-${dateStr}-${rand}`;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderCode,
          tableId,
          userId, // Attached to whoever opened the shift
          shiftId: activeShift.id,
          orderType: 'dine_in',
          status: 'pending', // Pending confirmation or going straight to kitchen?
          subtotal,
          taxAmount,
          totalAmount,
          notes: 'Khách tự gọi món từ QR',
          items: { create: itemsWithPrice },
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      // Update table status
      if (table.status !== 'occupied') {
        await tx.table.update({ where: { id: tableId }, data: { status: 'occupied' } });
      }

      return created;
    });

    // Notify Cashier
    io.emit('order:created', { orderId: order.id, tableId: order.tableId, orderCode: order.orderCode });
    io.emit('table:status_changed', { tableId: order.tableId, status: 'occupied' });

    // Auto send to kitchen? Yes, if it's self-ordering we might want it to go straight to kitchen
    // Let's mark items as pending and notify KDS to show them in pending.
    // We update order status to confirmed so KDS sees it.
    await prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } });
    
    io.emit('kitchen:new_ticket', {
      orderId: order.id,
      tableCode: order.table?.tableNumber,
      items: order.items.map((i) => ({
        id: i.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        notes: i.notes,
        prepTime: i.menuItem.prepTimeMinutes,
      })),
      sentAt: new Date(),
    });

    return order;
  }
};
