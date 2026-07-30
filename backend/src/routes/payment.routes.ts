import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createPaymentSchema, splitBillSchema } from '../validators/payment.validator';

export const paymentRouter = Router();
paymentRouter.use(authenticate);
paymentRouter.post('/', validate(createPaymentSchema), paymentController.createPayment);
paymentRouter.post('/split', validate(splitBillSchema), paymentController.splitBill);
paymentRouter.get('/vietqr/:orderId', paymentController.generateVietQR);
