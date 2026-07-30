import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';

import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/not-found.middleware';
import { authRouter } from './routes/auth.routes';
import { tableRouter } from './routes/table.routes';
import { menuRouter } from './routes/menu.routes';
import { orderRouter } from './routes/order.routes';
import { paymentRouter } from './routes/payment.routes';
import { categoryRouter } from './routes/category.routes';
import { userRouter } from './routes/user.routes';
import { shiftRouter } from './routes/shift.routes';
import { reservationRouter } from './routes/reservation.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { inventoryRouter } from './routes/inventory.routes';
import { roleRouter } from './routes/role.routes';
import { publicRouter } from './routes/public.routes';
import { customerRouter } from './routes/customer.routes';
import { registerSocketHandlers } from './socket/socket.handler';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Public API (No auth required)
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/public`, publicRouter);

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/roles`, roleRouter);
app.use(`${API_PREFIX}/customers`, customerRouter);
app.use(`${API_PREFIX}/tables`, tableRouter);
app.use(`${API_PREFIX}/menus`, menuRouter);
app.use(`${API_PREFIX}/categories`, categoryRouter);
app.use(`${API_PREFIX}/orders`, orderRouter);
app.use(`${API_PREFIX}/payments`, paymentRouter);
app.use(`${API_PREFIX}/shifts`, shiftRouter);
app.use(`${API_PREFIX}/reservations`, reservationRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);
app.use(`${API_PREFIX}/inventory`, inventoryRouter);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket.IO handlers
registerSocketHandlers(io);

export { httpServer };
