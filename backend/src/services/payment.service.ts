import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { io } from '../app';
import type { CreatePaymentDto, SplitBillDto } from '../validators/payment.validator';
import { tableService } from './table.service';

export const paymentService = {
  async createPayment(dto: CreatePaymentDto) {
    const order = await prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { table: true, items: true },
    });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (order.status === 'paid') throw new AppError('Đơn hàng đã được thanh toán', 400);

    const existingPayment = await prisma.payment.findUnique({ where: { orderId: dto.orderId } });
    if (existingPayment && existingPayment.status === 'paid') {
      throw new AppError('Đơn hàng đã được thanh toán', 400);
    }

    const discountAmount = dto.discountAmount || 0;
    const amount = Math.max(0, Number(order.totalAmount) - discountAmount);
    const receivedAmount = dto.receivedAmount || amount; // default to exact amount if not provided
    const changeAmount = receivedAmount ? Math.max(0, receivedAmount - amount) : 0;
    
    // Earn 1 point per 10,000 VND spent
    const pointsEarned = Math.floor(amount / 10000);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId: dto.orderId,
          method: dto.method,
          amount,
          receivedAmount,
          changeAmount,
          status: 'paid',
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: { 
          status: 'paid', 
          paidAt: new Date(),
          discountAmount: discountAmount,
          totalAmount: amount,
          customerId: dto.customerId,
          pointsUsed: dto.pointsUsed || 0,
          pointsEarned: dto.customerId ? pointsEarned : 0
        },
      });

      if (dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            points: {
              increment: pointsEarned - (dto.pointsUsed || 0)
            },
            totalSpent: {
              increment: amount
            }
          }
        });
      }

      if (order.tableId) {
        await tx.table.update({ where: { id: order.tableId }, data: { status: 'cleaning' } });
      }

      return p;
    });

    // Broadcast
    io.emit('payment:confirmed', { orderId: dto.orderId, paymentId: payment.id });
    if (order.tableId) {
      io.emit('table:status_changed', { tableId: order.tableId, status: 'cleaning' });
      tableService.startCleaningTimer(order.tableId);
    }

    return { payment, changeAmount };
  },

  async splitBill(dto: SplitBillDto) {
    const order = await prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
    if (order.status === 'paid') throw new AppError('Đơn hàng đã thanh toán', 400);

    const allItemIds = order.items.map((i) => i.id);
    const missingIds = dto.itemIdsToSplit.filter((id) => !allItemIds.includes(id));
    if (missingIds.length > 0) {
      throw new AppError('Một số món không thuộc đơn hàng này', 400);
    }
    if (dto.itemIdsToSplit.length === allItemIds.length) {
      throw new AppError('Không thể tách toàn bộ món sang hóa đơn mới', 400);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create a new child order
      const newOrder = await tx.order.create({
        data: {
          orderCode: `${order.orderCode}-S${Math.floor(Math.random() * 100)}`,
          tableId: order.tableId,
          userId: order.userId,
          shiftId: order.shiftId,
          orderType: order.orderType,
          status: 'pending',
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
        }
      });

      // 2. Move selected items to new order
      await tx.orderItem.updateMany({
        where: { id: { in: dto.itemIdsToSplit } },
        data: { orderId: newOrder.id },
      });

      // 3. Recalculate Original Order
      const remainingItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
      const origSubtotal = remainingItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const origTax = Math.round(origSubtotal * 0.08);
      await tx.order.update({
        where: { id: order.id },
        data: { subtotal: origSubtotal, taxAmount: origTax, totalAmount: origSubtotal + origTax }
      });

      // 4. Recalculate New Order
      const splitItems = await tx.orderItem.findMany({ where: { orderId: newOrder.id } });
      const newSubtotal = splitItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const newTax = Math.round(newSubtotal * 0.08);
      await tx.order.update({
        where: { id: newOrder.id },
        data: { subtotal: newSubtotal, taxAmount: newTax, totalAmount: newSubtotal + newTax }
      });

      io.emit('order:updated', { tableId: order.tableId });

      return { newOrderId: newOrder.id, message: 'Đã tách hóa đơn thành công' };
    });
  },

  async generateVietQR(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    const bankBin = process.env.BANK_BIN ?? '970436';
    const bankAccount = process.env.BANK_ACCOUNT ?? '0000000000';
    const amount = Math.round(Number(order.totalAmount));
    const description = encodeURIComponent(`Thanh toan ${order.orderCode}`);

    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${description}`;

    return { qrUrl, amount, orderCode: order.orderCode };
  },
};
