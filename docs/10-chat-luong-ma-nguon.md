# Tiêu chí 10 — Chất lượng Mã nguồn & Quản lý Dự án
> **Điểm tối đa:** 0.5 | **Mục tiêu:** Xuất sắc (100%)

---

## 1. Cấu trúc thư mục rõ ràng

```
POS-Nha_Hang-CT07/
├── backend/                   # Node.js + Express 5 + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma      # Single source of truth cho database
│   │   ├── migrations/        # Auto-generated, versioned
│   │   └── seed.ts            # Dữ liệu mẫu ban đầu
│   ├── src/
│   │   ├── index.ts           # Entry point — khởi động HTTP + Socket.IO
│   │   ├── app.ts             # Express config, middleware stack
│   │   ├── socket/            # Socket.IO event handlers
│   │   │   ├── index.ts
│   │   │   ├── orderSocket.ts
│   │   │   └── tableSocket.ts
│   │   ├── routes/            # Express routers (thin)
│   │   ├── controllers/       # HTTP request/response handlers
│   │   ├── services/          # Business logic (pure)
│   │   ├── jobs/              # BullMQ workers
│   │   ├── middleware/        # Auth, RBAC, validation, errors
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── lib/               # Singletons (prisma, redis, vietqr, telegram)
│   │   └── utils/             # Helper functions
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # Next.js 15 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/login/
│   │   └── (app)/             # Protected routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── pos/               # POS-specific components
│   │   ├── kitchen/           # KDS components
│   │   └── shared/            # Reusable components
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   ├── lib/                   # API client, socket client, utils
│   ├── types/                 # TypeScript type definitions
│   └── Dockerfile
├── .github/
│   └── workflows/
│       ├── ci.yml             # Test + lint on PR
│       └── deploy.yml         # Deploy on merge to main
├── docker-compose.yml         # Full stack local setup
├── docker-compose.prod.yml    # Production overrides
├── nginx.conf                 # Reverse proxy config
├── .gitignore
├── .skill/                    # AI agent context (local only)
├── docs/                      # Tài liệu đồ án
└── README.md
```

---

## 2. Quy ước đặt tên

### Files
```
kebab-case.ts          # order.service.ts, auth.middleware.ts
PascalCase.tsx         # OrderPanel.tsx, TableMap.tsx
camelCase.ts           # useSocket.ts, orderStore.ts
```

### Biến & Hàm
```typescript
// ✅ Đúng — descriptive, camelCase
const activeOrderItems = await getOrderItemsByStatus('PENDING');
async function sendToKitchen(orderId: number, itemIds: number[]) {}
const isTableAvailable = table.status === 'AVAILABLE';

// ❌ Sai — quá ngắn, không rõ nghĩa
const x = await getItems('P');
async function fn(id: number, ids: number[]) {}
const ok = table.status === 'AVAILABLE';
```

### TypeScript Types
```typescript
// Interface cho objects (mutable shape)
interface CreateOrderDto {
  tableId?: number;
  type: OrderType;
  guestCount: number;
  items: CreateOrderItemDto[];
}

// Type cho unions/intersections
type OrderStatus = 'DRAFT' | 'OPEN' | 'SERVED' | 'BILLING' | 'PAID' | 'CANCELLED';
type ApiResponse<T> = { data: T; message: string; meta?: PaginationMeta };
```

---

## 3. Code pattern chuẩn

### Backend — Service pattern
```typescript
// src/services/order.service.ts
export class OrderService {
  constructor(
    private readonly io: Server,
    private readonly recipeService: RecipeService
  ) {}

  /**
   * Tạo order mới. Validate ca làm việc và trạng thái bàn.
   * Emit WebSocket event sau khi commit thành công.
   */
  async createOrder(dto: CreateOrderDto, userId: number): Promise<Order> {
    const shift = await this.getOpenShift(userId);
    if (dto.type === 'DINE_IN') await this.validateTable(dto.tableId!);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({ /* ... */ });
      if (dto.tableId) {
        await tx.table.update({ where: { id: dto.tableId }, data: { status: 'OCCUPIED' } });
      }
      return newOrder;
    });

    // Socket emit SAU khi transaction commit
    this.io.to('pos-room').emit('order:created', { orderId: order.id });
    return order;
  }
}
```

### Frontend — Component pattern
```tsx
// components/pos/OrderPanel.tsx
'use client'; // chỉ khai báo khi cần interactivity

interface OrderPanelProps {
  tableId: number | null;
  items: CartItem[];
  onRemoveItem: (itemId: number) => void;
  onOrderComplete: () => void;
}

export function OrderPanel({ tableId, items, onRemoveItem, onOrderComplete }: OrderPanelProps) {
  const { mutateAsync: createOrder, isPending } = useMutation({
    mutationFn: (dto: CreateOrderDto) => orderApi.create(dto),
    onSuccess: onOrderComplete,
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Order items list */}
      {/* Total calculation */}
      {/* Action buttons */}
    </div>
  );
}
```

### Error handling chuẩn
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code ?? 'APP_ERROR',
      message: err.message,
      statusCode: err.statusCode,
    });
  }
  // Unhandled error — log và trả 500
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Lỗi hệ thống', statusCode: 500 });
}
```

---

## 4. Quản lý dự án với Git

### Chiến lược branching
```
main           # Production-ready code
├── develop    # Integration branch
│   ├── feature/table-drag-drop
│   ├── feature/kitchen-display
│   ├── feature/vietqr-payment
│   ├── fix/order-status-socket
│   └── chore/update-prisma-schema
```

### Commit message format (Conventional Commits)
```
feat(order): add send-to-kitchen endpoint with Socket.IO emit
fix(auth): resolve JWT refresh token race condition
chore(deps): upgrade Prisma to 6.1.0
docs(api): add OpenAPI spec for invoice endpoints
test(order): add unit tests for OrderService.createOrder
refactor(invoice): extract RecipeService.deductIngredients
```

### Pull Request template
```markdown
## Mô tả thay đổi
<!-- Mô tả ngắn gọn PR này làm gì -->

## Tiêu chí kiểm tra
- [ ] Code build thành công
- [ ] Unit tests pass
- [ ] Đã test thủ công trên local
- [ ] Không có console.log còn sót
- [ ] Đã cập nhật tài liệu (nếu cần)

## Screenshots (nếu có thay đổi UI)
```

---

## 5. GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
        working-directory: backend
      - run: npm run build   # TypeScript compile check
        working-directory: backend
      - run: npm run lint
        working-directory: backend
      - run: npm test
        working-directory: backend

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
      - run: npm run lint
        working-directory: frontend
```

---

## 6. Quản lý tiến độ cá nhân

Dự án được thực hiện cá nhân với tiến độ được quản lý chặt chẽ qua hệ thống Git.

- Phân chia các nhánh tính năng (`feature/`) rõ ràng và độc lập.
- Có log commit chi tiết theo từng tính năng, module hoàn thiện (Backend API, Frontend UI, Database schema, DevOps).
- Commit đều đặn mỗi ngày làm việc để track quá trình code.

> **Xem lịch sử commit**: `git log --oneline --all --graph`

---

## 7. Hướng dẫn cài đặt dễ dàng

```bash
# Clone dự án
git clone https://github.com/edacall199/POS-Nha_Hang-CT07.git
cd POS-Nha_Hang-CT07

# Copy env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Khởi động toàn bộ stack
docker-compose up -d

# Seed dữ liệu mẫu
docker-compose exec backend npx prisma db seed

# Truy cập
# Frontend: http://localhost:3000
# API:      http://localhost:4000
# DB GUI:   http://localhost:5555 (Prisma Studio)
```

