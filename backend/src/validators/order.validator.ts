import { z } from 'zod';

export const createOrderItemSchema = z.object({
  menuItemId: z.string().uuid('Menu item ID phải là UUID'),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0').max(99),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  shiftId: z.string().uuid('Shift ID phải là UUID').optional(),
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
  items: z.array(createOrderItemSchema).min(1, 'Phải có ít nhất 1 món').max(50),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled']),
});

export const addOrderItemsSchema = z.object({
  items: z.array(createOrderItemSchema).min(1),
});

export const moveTableSchema = z.object({
  targetTableId: z.string().uuid('Target table ID phải là UUID'),
});

export const mergeTableSchema = z.object({
  sourceOrderId: z.string().uuid('Source order ID phải là UUID'),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
