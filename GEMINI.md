# RestoPOS — Gemini CLI Project Context

## Tổng quan dự án
Hệ thống POS (Point of Sale) cho nhà hàng / quán cà phê, xây dựng trên Node.js/TypeScript + Next.js 15.

## Tech Stack

### Backend
- **Runtime**: Node.js 22
- **Framework**: Express 5 + TypeScript 5
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16
- **Cache / Queue**: Redis + BullMQ
- **Realtime**: Socket.IO
- **Validation**: Zod
- **Auth**: JWT (access + refresh token)

### Frontend
- **Framework**: Next.js 15 App Router (SSR + RSC)
- **UI**: shadcn/ui + Tailwind CSS v4
- **State**: Zustand
- **Data Fetching**: TanStack Query v5
- **Tables**: TanStack Table v8
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit
- **HTTP Client**: Axios với interceptor tự động refresh token

### DevOps
- Docker Compose (PostgreSQL, Redis, Backend, Frontend, Nginx)
- GitHub Actions CI/CD
- Cloudinary (image storage)

## Cấu trúc thư mục

```
POS-Nha_Hang-CT07/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── index.ts          # Entry point
│       ├── app.ts            # Express config
│       ├── socket/           # Socket.IO handlers
│       ├── routes/           # API routes
│       ├── controllers/      # Request handlers
│       ├── services/         # Business logic
│       ├── jobs/             # BullMQ jobs
│       ├── middleware/       # Auth, RBAC, validation
│       ├── schemas/          # Zod schemas
│       ├── lib/              # Singletons (prisma, redis)
│       └── utils/
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # UI components
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand stores
│   ├── lib/                  # Utilities
│   └── types/
├── docker-compose.yml
├── .github/workflows/
├── GEMINI.md
├── CLAUDE.md
└── README.md
```

## Vai trò người dùng (RBAC)
- **OWNER**: Toàn quyền, xem báo cáo tổng
- **MANAGER**: Quản lý menu, nhân viên, báo cáo
- **CASHIER**: Thu ngân, tạo order, thanh toán
- **KITCHEN**: Xem và cập nhật trạng thái món
- **WAITER**: Gọi món, gửi bếp, phục vụ

## Các tính năng chính
1. Sơ đồ bàn kéo thả (dnd-kit) theo khu vực/tầng
2. Order theo bàn realtime (Socket.IO)
3. Kitchen Display System (KDS) — Kanban board bếp
4. Tách / Ghép hóa đơn
5. Combo & Set Menu (Happy Hour)
6. Đặt bàn trước (Reservation) + nhắc Telegram
7. Quản lý nguyên liệu theo công thức (Recipe)
8. Báo cáo doanh thu đa chiều
9. Loyalty & Membership (Gold/Silver/Bronze)
10. Thanh toán: Tiền mặt + VietQR + MoMo/VNPay webhook

## Quy ước code

### TypeScript
- Dùng `interface` cho object types, `type` cho union/intersection
- Bật `strict: true` trong tsconfig
- Không dùng `any`, dùng `unknown` khi cần
- Tất cả async function phải có return type rõ ràng

### Backend
- Controller chỉ nhận request/response, gọi service
- Service chứa business logic thuần túy
- Prisma transaction cho các thao tác multi-table
- AppError class cho error có status code
- Middleware validate Zod schema trước khi vào controller

### Frontend
- Server Components mặc định, Client Components khi cần interactivity
- `use client` chỉ ở component leaf, không ở layout/page
- Zustand cho global state, useState cho local state
- TanStack Query cho server state (fetch, cache, mutate)
- shadcn/ui components, không custom CSS inline

### Git
- Branch: `feature/`, `fix/`, `chore/`
- Commit message: tiếng Anh, imperative mood: "Add table drag feature"
- PR cần review trước khi merge vào `main`

## Scripts thường dùng

```bash
# Backend
cd backend
npm run dev          # ts-node-dev watch mode
npm run build        # tsc compile
npx prisma migrate dev   # tạo migration mới
npx prisma studio        # GUI database

# Frontend
cd frontend
npm run dev          # Next.js dev server port 3000
npm run build        # production build
npm run lint         # ESLint

# Docker
docker-compose up -d          # khởi động toàn bộ stack
docker-compose logs -f backend # xem log backend
```

## API Conventions
- Base URL: `/api/v1`
- Auth: Bearer JWT trong header
- Response format: `{ data, message, meta? }`
- Error format: `{ error, message, statusCode }`
- Pagination: `?page=1&limit=20`

## Biến môi trường quan trọng
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/restopos
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_URL=...
TELEGRAM_BOT_TOKEN=...
VIETQR_API_KEY=...
```

## MCP Tools có sẵn
- **context7**: Lấy tài liệu mới nhất cho Next.js, Prisma, Socket.IO, shadcn/ui...
- **github**: Tạo PR, xem issues, quản lý branches
- **prisma**: Chạy migrations, xem schema database
- **filesystem**: Đọc/ghi file dự án
