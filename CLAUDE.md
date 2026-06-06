# RestoPOS — Claude Code Project Context

## Project Overview
Restaurant / Coffee Shop POS System — Node.js/TypeScript + Next.js 15.

## Tech Stack

### Backend (Node.js 22 + Express 5 + TypeScript 5)
- **ORM**: Prisma 6 + PostgreSQL 16
- **Cache**: Redis (ioredis)
- **Queue**: BullMQ (retry, delay, priority queues)
- **Realtime**: Socket.IO (WebSocket + fallback)
- **Validation**: Zod (shared with frontend)
- **Auth**: JWT (access 15m + refresh 7d)
- **File Storage**: Cloudinary

### Frontend (Next.js 15 App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui (headless)
- **State**: Zustand (global) + useState (local)
- **Server State**: TanStack Query v5
- **Tables**: TanStack Table v8
- **Forms**: React Hook Form + Zod resolver
- **Charts**: Recharts
- **DnD**: dnd-kit (table floor plan)
- **HTTP**: Axios + auto refresh token interceptor

### Infrastructure
- Docker Compose (full stack)
- Nginx (reverse proxy + static)
- GitHub Actions (CI/CD)

## Architecture

```
Client (Next.js) → Nginx → Express API → Prisma → PostgreSQL
                                        → Socket.IO rooms
                                        → BullMQ → Redis
                                        → Cloudinary
```

## Key Domain Models (Prisma)

```
User → WorkShift → Order → OrderItem → OrderItemModifier
Table → Zone
MenuItem → MenuCategory | MenuItemVariant | MenuModifier | Recipe
Recipe → Ingredient → IngredientTransaction
Invoice → InvoicePayment | PaymentTransaction
Customer → Voucher | Reservation
Combo → ComboItem
```

## Business Roles
```
OWNER > MANAGER > CASHIER / KITCHEN / WAITER
```

## Critical Business Flows

### Order Flow
```
createOrder() → sendToKitchen() → updateItemStatus(PREPARING) 
→ updateItemStatus(READY) → updateItemStatus(SERVED) 
→ createInvoice() → deductIngredients() → processPayment()
```

### Socket.IO Rooms
- `pos-room`: Cashiers & Waiters (order updates, table status)
- `kitchen-room`: Kitchen Display (new items, item ready events)

### Payment Flow
- VietQR: Generate QR → polling/webhook → mark PAID
- MoMo/VNPay: Webhook validation → update invoice status

## Code Conventions

### TypeScript Strict Rules
- `strict: true` — no `any`, use `unknown`
- Interfaces for objects, types for unions
- Explicit return types on all async functions
- No implicit returns

### Backend Pattern
```typescript
// Route → Controller → Service → Prisma
router.post('/', validate(schema), controller.create);
// Controller: thin, just parse request + call service
// Service: all business logic, use prisma.$transaction for multi-table ops
// AppError(message, statusCode) for expected errors
```

### Frontend Pattern
```typescript
// Default: Server Component
// Client: only add 'use client' at leaf level
// Data: useQuery/useMutation from TanStack Query
// Forms: useForm + zodResolver
// Global: Zustand stores in /stores/
```

### API Contract
- Base: `/api/v1/`
- Auth: `Authorization: Bearer <token>`
- Success: `{ data: T, message: string, meta?: PaginationMeta }`
- Error: `{ error: string, message: string, statusCode: number }`

## Environment Variables
```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET
CLOUDINARY_URL, TELEGRAM_BOT_TOKEN, VIETQR_API_KEY
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
```

## Development Commands
```bash
# Backend
npm run dev              # ts-node-dev (hot reload)
npx prisma migrate dev   # run migrations  
npx prisma seed          # seed initial data
npx prisma studio        # DB GUI

# Frontend  
npm run dev              # Next.js dev server :3000

# Docker
docker-compose up -d     # start all services
```

## File Structure (Brief)
```
backend/src/
├── index.ts / app.ts          # server setup
├── socket/                    # Socket.IO namespaces & handlers
├── routes/                    # Express routers
├── controllers/               # HTTP request handlers
├── services/                  # Business logic (OrderService, InvoiceService...)
├── jobs/                      # BullMQ workers
├── middleware/                # JWT, RBAC, Zod validate
├── schemas/                   # Zod schemas
└── lib/                       # prisma.ts, redis.ts, vietqr.ts

frontend/
├── app/                       # Next.js App Router
├── components/pos/            # TableMap, MenuGrid, OrderPanel
├── components/kitchen/        # KitchenBoard, OrderCard
├── hooks/                     # useSocket, useOrderItems, useTableStatus
├── stores/                    # authStore, orderStore, tableStore
└── types/                     # Shared TypeScript types
```

## Important Notes for Claude
1. Always use Prisma transactions (`prisma.$transaction`) for multi-table writes
2. Socket events must be emitted AFTER database commit
3. Recipe deduction happens inside invoice creation transaction
4. Table status updates are realtime via Socket.IO
5. JWT refresh uses sliding window — always use Axios interceptor
6. BullMQ jobs for: payment sync, reservation reminders, low stock alerts
7. NEVER expose password_hash in API responses (use Prisma `omit` or DTO mapping)
