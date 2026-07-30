import { z } from 'zod';

export const createPaymentSchema = z
  .object({
    orderId: z.string().uuid('Order ID phải là UUID'),
    method: z.string(), // Relaxed for UI compatibility
    receivedAmount: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    customerId: z.string().uuid().optional(),
    pointsUsed: z.number().nonnegative().optional(),
  });

export const splitBillSchema = z.object({
  orderId: z.string().uuid(),
  itemIdsToSplit: z.array(z.string().uuid()).min(1, 'Phải chọn ít nhất 1 món để tách'),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type SplitBillDto = z.infer<typeof splitBillSchema>;
