import { prisma } from '../lib/prisma';
import { getTaxRate } from './config.service';
import { AppError } from '../middleware/error.middleware';
import { io } from '../app';

const cleaningTimers = new Map<string, NodeJS.Timeout>();
const cleaningEndTimes = new Map<string, number>();

export const tableService = {
  startCleaningTimer(tableId: string) {
    if (cleaningTimers.has(tableId)) {
      clearTimeout(cleaningTimers.get(tableId));
    }
    
    const DURATION = 5 * 60 * 1000; // 5 minutes
    const endTime = Date.now() + DURATION;
    cleaningEndTimes.set(tableId, endTime);
    
    io.emit('table:cleaning_started', { tableId, endTime });

    const timer = setTimeout(async () => {
      try {
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (table?.status === 'cleaning') {
          // Only emit warning, do NOT auto-change status
          io.emit('table:cleaning_overtime', {
            tableId,
            tableNumber: table.tableNumber,
            message: 'Bàn đã quá thời gian dọn dẹp, cần nhân viên xác nhận!'
          });
        }
      } catch (e) {
        console.error('Error checking cleaning table:', e);
      }
      // Keep timer references so UI still shows the overtime state
    }, DURATION);
    
    cleaningTimers.set(tableId, timer);
  },

  clearCleaningTimer(tableId: string) {
    if (cleaningTimers.has(tableId)) {
      clearTimeout(cleaningTimers.get(tableId));
      cleaningTimers.delete(tableId);
      cleaningEndTimes.delete(tableId);
    }
  },

  async getAll(restaurantZoneId?: string) {
    const tables = await prisma.table.findMany({
      where: restaurantZoneId ? { zoneId: restaurantZoneId } : undefined,
      include: { 
        zone: true,
        orders: {
          where: { status: { in: ['pending', 'confirmed', 'kitchen', 'preparing', 'ready', 'served'] } },
          take: 1
        }
      },
      orderBy: [{ zone: { name: 'asc' } }, { tableNumber: 'asc' }],
    });

    return tables.map(t => {
      if (t.status === 'cleaning') {
        if (cleaningEndTimes.has(t.id)) {
          return { ...t, cleaningEndTime: cleaningEndTimes.get(t.id) };
        } else {
          // Self-healing: if a table is cleaning but has no timer (e.g. after server restart or old data)
          // We start a new timer for it so the UI shows the countdown and it eventually clears.
          this.startCleaningTimer(t.id);
          return { ...t, cleaningEndTime: cleaningEndTimes.get(t.id) };
        }
      }
      return t;
    });
  },

  async getById(id: string) {
    const table = await prisma.table.findUnique({
      where: { id },
      include: { zone: true },
    });
    if (!table) throw new AppError('Không tìm thấy bàn', 404);
    return table;
  },

  async create(data: { tableNumber: string; zoneId: string; capacity: number }) {
    return prisma.table.create({
      data,
      include: { zone: true },
    });
  },

  async updateStatus(id: string, status: string) {
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Trạng thái bàn không hợp lệ', 400);
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status },
      include: { zone: true },
    });

    io.emit('table:status_changed', { tableId: table.id, status: table.status, tableNumber: table.tableNumber });

    if (status === 'cleaning') {
      this.startCleaningTimer(table.id);
    } else {
      this.clearCleaningTimer(table.id);
    }

    return table;
  },

  async moveOrder(orderId: string, targetTableId: string) {
    const targetTable = await prisma.table.findUnique({ where: { id: targetTableId } });
    if (!targetTable) throw new AppError('Không tìm thấy bàn đích', 404);
    if (targetTable.status !== 'available') {
      throw new AppError('Bàn đích không còn trống', 400);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    const sourceTableId = order.tableId;

    const result = await prisma.$transaction(async (tx) => {
      // Move order to target table
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
      });

      // Free source table
      if (sourceTableId) {
        await tx.table.update({ where: { id: sourceTableId }, data: { status: 'cleaning' } });
        io.emit('table:status_changed', { tableId: sourceTableId, status: 'cleaning' });
        // Can't call this.startCleaningTimer directly in transaction as it's async outer context,
        // but we can schedule it using setImmediate or just call it.
      }

      // Mark target table as occupied
      await tx.table.update({ where: { id: targetTableId }, data: { status: 'occupied' } });
      io.emit('table:status_changed', { tableId: targetTableId, status: 'occupied' });

      return { updated, sourceTableId };
    });

    // Start timer after tx succeeds
    if (result.sourceTableId) {
      this.startCleaningTimer(result.sourceTableId);
    }

    return result.updated;
  },

  async mergeTables(primaryOrderId: string, sourceOrderId: string) {
    const primaryOrder = await prisma.order.findUnique({
      where: { id: primaryOrderId },
      include: { items: true },
    });
    const sourceOrder = await prisma.order.findUnique({
      where: { id: sourceOrderId },
      include: { items: true },
    });

    if (!primaryOrder || !sourceOrder) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (primaryOrder.status === 'paid' || sourceOrder.status === 'paid') {
      throw new AppError('Không thể gộp đơn hàng đã thanh toán', 400);
    }

    const taxRate = await getTaxRate();
    const result = await prisma.$transaction(async (tx) => {
      // Move all items from source order to primary order
      await tx.orderItem.updateMany({
        where: { orderId: sourceOrderId },
        data: { orderId: primaryOrderId },
      });

      // Recalculate primary order total
      const allItems = await tx.orderItem.findMany({ where: { orderId: primaryOrderId } });
      const newSubtotal = allItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const newTax = Math.round(newSubtotal * taxRate);

      const updated = await tx.order.update({
        where: { id: primaryOrderId },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTax,
          totalAmount: newSubtotal + newTax,
        },
        include: { items: { include: { menuItem: true } } },
      });

      // Cancel source order
      await tx.order.update({ where: { id: sourceOrderId }, data: { status: 'cancelled', notes: 'MERGED into order ' + primaryOrderId } });

      // Free source table (change to cleaning as requested)
      if (sourceOrder.tableId) {
        await tx.table.update({ where: { id: sourceOrder.tableId }, data: { status: 'cleaning' } });
        io.emit('table:status_changed', { tableId: sourceOrder.tableId, status: 'cleaning' });
      }

      io.emit('order:merged', { primaryOrderId, sourceOrderId });

      return { updated, sourceTableId: sourceOrder.tableId };
    });

    if (result.sourceTableId) {
      this.startCleaningTimer(result.sourceTableId);
    }

    return result.updated;
  },
};
