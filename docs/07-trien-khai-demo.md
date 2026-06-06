# 🚀 Tiêu Chí 7: Triển Khai & Demo Sản Phẩm

> **Điểm tối đa:** 1.0 điểm  
> **Hệ thống:** RestoPOS – Phần mềm quản lý nhà hàng  
> **Stack:** Node.js 22, PostgreSQL 16, Redis 7, Docker, Nginx

---

## 1. 💻 Yêu Cầu Hệ Thống

### 1.1 Môi Trường Development

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|----------|---------------------|---------|
| **Node.js** | `22.x LTS` | Bắt buộc |
| **npm** | `10.x` | Đi kèm Node.js |
| **PostgreSQL** | `16.x` | Hoặc chạy qua Docker |
| **Redis** | `7.x` | Hoặc chạy qua Docker |
| **Git** | `2.40+` | Quản lý mã nguồn |
| **Docker Desktop** | `4.x` | Tùy chọn, cho môi trường đầy đủ |
| **VS Code** | Mới nhất | IDE khuyên dùng |

### 1.2 Môi Trường Production / Server

| Thành phần | Yêu cầu |
|------------|---------|
| **CPU** | Tối thiểu 2 vCPU |
| **RAM** | Tối thiểu 4 GB |
| **Disk** | Tối thiểu 20 GB SSD |
| **OS** | Ubuntu 22.04 LTS / Debian 12 |
| **Nginx** | Reverse proxy + SSL termination |
| **Certbot** | Let's Encrypt SSL miễn phí |

---

## 2. 🛠️ Hướng Dẫn Chạy Local (Step-by-Step)

### Bước 1: Clone Repository

```bash
git clone https://github.com/yourorg/restopos.git
cd restopos
```

### Bước 2: Cài Đặt Dependencies

```bash
# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install

# Quay về thư mục gốc
cd ../..
```

### Bước 3: Cấu Hình Biến Môi Trường

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Chỉnh sửa file .env với editor của bạn

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local
```

### Bước 4: Khởi Động PostgreSQL & Redis (Docker)

```bash
# Chỉ chạy database và redis, không cần toàn bộ stack
docker compose -f docker-compose.dev.yml up -d postgres redis

# Kiểm tra đã chạy chưa
docker compose -f docker-compose.dev.yml ps
```

### Bước 5: Chạy Database Migration

```bash
cd apps/backend

# Chạy migration tạo schema
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed dữ liệu mẫu
npm run seed
```

### Bước 6: Khởi Động Backend

```bash
cd apps/backend
npm run dev
# Server chạy tại: http://localhost:3001
# API Docs tại: http://localhost:3001/api-docs
```

### Bước 7: Khởi Động Frontend

```bash
cd apps/frontend
npm run dev
# App chạy tại: http://localhost:3000
```

### Bước 8: Kiểm Tra Hoạt Động

```bash
# Kiểm tra API health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected","timestamp":"..."}
```

---

## 3. 🐳 Docker Compose Setup

### 3.1 docker-compose.yml (Full Stack Production)

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ─────────────── PostgreSQL Database ───────────────
  postgres:
    image: postgres:16-alpine
    container_name: restopos_postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-restopos}
      POSTGRES_USER: ${POSTGRES_USER:-restopos}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"  # Chỉ expose trong development
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-restopos}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - restopos_network

  # ─────────────── Redis Cache ───────────────
  redis:
    image: redis:7-alpine
    container_name: restopos_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"  # Chỉ expose trong development
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - restopos_network

  # ─────────────── Backend API ───────────────
  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
      target: production
    container_name: restopos_backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    expose:
      - "3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - restopos_network

  # ─────────────── Frontend (Next.js) ───────────────
  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
      target: production
    container_name: restopos_frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL}
    expose:
      - "3000"
    depends_on:
      - backend
    networks:
      - restopos_network

  # ─────────────── Nginx Reverse Proxy ───────────────
  nginx:
    image: nginx:1.25-alpine
    container_name: restopos_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites:/etc/nginx/conf.d:ro
      - certbot_certs:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - restopos_network

volumes:
  postgres_data:
  redis_data:
  certbot_certs:
  certbot_www:

networks:
  restopos_network:
    driver: bridge
```

### 3.2 docker-compose.dev.yml (Development Only)

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: restopos_postgres_dev
    environment:
      POSTGRES_DB: restopos_dev
      POSTGRES_USER: restopos
      POSTGRES_PASSWORD: devpassword123
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: restopos_redis_dev
    ports:
      - "6379:6379"

  # Công cụ quản lý DB
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: restopos_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@restopos.dev
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "8080:80"

volumes:
  postgres_dev_data:
```

### 3.3 Nginx Configuration

```nginx
# nginx/sites/restopos.conf
server {
    listen 80;
    server_name restopos.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name restopos.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/restopos.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/restopos.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
}
```

---

## 4. ⚙️ Biến Môi Trường (.env.example)

```bash
# ════════════════════════════════════════════════
#  RestoPOS - Environment Variables Template
#  Copy to .env and fill in your values
# ════════════════════════════════════════════════

# App
NODE_ENV=development
PORT=3001
APP_NAME=RestoPOS
APP_VERSION=1.0.0

# ──────── Database ────────
POSTGRES_DB=restopos
POSTGRES_USER=restopos
POSTGRES_PASSWORD=your_strong_password_here
DATABASE_URL=postgresql://restopos:your_strong_password_here@localhost:5432/restopos

# ──────── Redis ────────
REDIS_PASSWORD=your_redis_password_here
REDIS_URL=redis://:your_redis_password_here@localhost:6379

# ──────── JWT Authentication ────────
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ──────── Frontend ────────
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001

# ──────── Email (Nodemailer) ────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=RestoPOS <noreply@restopos.com>

# ──────── VietQR / Ngân hàng ────────
VIETQR_BANK_CODE=VCB
VIETQR_ACCOUNT_NUMBER=1234567890
VIETQR_ACCOUNT_NAME=NGUYEN VAN A
VIETQR_API_KEY=your_vietqr_api_key

# ──────── MoMo ────────
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_REDIRECT_URL=http://localhost:3000/payment/callback
MOMO_IPN_URL=http://your-server.com/api/v1/webhooks/momo

# ──────── VNPay ────────
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return

# ──────── Telegram Bot ────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id

# ──────── File Upload ────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes

# ──────── Rate Limiting ────────
RATE_LIMIT_WINDOW_MS=900000  # 15 phút
RATE_LIMIT_MAX=200
```

---

## 5. 👥 Tài Khoản Demo (5 Role)

Sau khi chạy `npm run seed`, hệ thống sẽ tạo sẵn 5 tài khoản demo:

| Role | Email | Mật khẩu | Quyền hạn |
|------|-------|----------|-----------|
| 🔴 **Admin** | `admin@restopos.demo` | `Admin@123456` | Toàn quyền hệ thống |
| 🟠 **Manager** | `manager@restopos.demo` | `Manager@123456` | Quản lý nhân sự, thực đơn, báo cáo |
| 🟡 **Cashier** | `cashier@restopos.demo` | `Cashier@123456` | Thanh toán, xem báo cáo |
| 🟢 **Waiter** | `waiter@restopos.demo` | `Waiter@123456` | Tạo đơn, phục vụ bàn |
| 🔵 **Kitchen** | `kitchen@restopos.demo` | `Kitchen@123456` | Xem & cập nhật trạng thái món |

> ⚠️ **Lưu ý:** Tài khoản demo chỉ dùng cho mục đích kiểm thử. Thay đổi mật khẩu trước khi đưa lên production.

---

## 6. 🌱 Dữ Liệu Mẫu (Seed Data)

### 6.1 Script Seed

```typescript
// apps/backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RestoPOS database...');

  // ──── 1. Roles ────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'Quản trị viên hệ thống', permissions: ['*'] },
    }),
    prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: { name: 'MANAGER', description: 'Quản lý nhà hàng', permissions: ['menu:*', 'orders:*', 'reports:read'] },
    }),
    prisma.role.upsert({
      where: { name: 'CASHIER' },
      update: {},
      create: { name: 'CASHIER', description: 'Thu ngân', permissions: ['payments:*', 'orders:read'] },
    }),
    prisma.role.upsert({
      where: { name: 'WAITER' },
      update: {},
      create: { name: 'WAITER', description: 'Phục vụ bàn', permissions: ['orders:create', 'orders:update', 'tables:*'] },
    }),
    prisma.role.upsert({
      where: { name: 'KITCHEN' },
      update: {},
      create: { name: 'KITCHEN', description: 'Bếp', permissions: ['orders:read', 'orders:update_status'] },
    }),
  ]);

  // ──── 2. Users ────
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@restopos.demo' },
    update: {},
    create: {
      email: 'admin@restopos.demo',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Admin',
      role_id: roles[0].id,
    },
  });
  // ... (tương tự cho các role khác)

  // ──── 3. Zones & Tables ────
  const zones = [
    { name: 'Tầng 1', description: 'Khu vực tầng trệt' },
    { name: 'Tầng 2', description: 'Khu vực tầng 2' },
    { name: 'VIP', description: 'Phòng riêng VIP' },
    { name: 'Sân thượng', description: 'Khu vực ngoài trời' },
  ];

  for (const zone of zones) {
    const z = await prisma.zone.create({ data: zone });
    // Tạo 6 bàn cho mỗi khu vực
    for (let i = 1; i <= 6; i++) {
      await prisma.table.create({
        data: {
          table_number: `${zone.name[0]}${String(i).padStart(2, '0')}`,
          zone_id: z.id,
          capacity: i <= 3 ? 4 : 6,
        },
      });
    }
  }

  // ──── 4. Categories & Menu Items ────
  const menuData = [
    {
      category: { name: '🍜 Món Chính', icon: '🍜' },
      items: [
        { name: 'Bún bò Huế', price: 75000, description: 'Bún bò cay đặc trưng xứ Huế' },
        { name: 'Phở bò tái', price: 80000, description: 'Phở bò nước trong truyền thống' },
        { name: 'Cơm tấm sườn bì', price: 65000, description: 'Cơm tấm miền Nam đặc trưng' },
        { name: 'Hủ tiếu Nam Vang', price: 70000, description: 'Hủ tiếu nhân phong phú' },
        { name: 'Mì Quảng', price: 60000, description: 'Mì Quảng đặc sản Quảng Nam' },
      ],
    },
    {
      category: { name: '🥗 Khai Vị', icon: '🥗' },
      items: [
        { name: 'Gỏi cuốn tôm thịt', price: 45000, description: 'Gỏi cuốn tươi tôm thịt' },
        { name: 'Chả giò chiên', price: 50000, description: 'Chả giò giòn rụm' },
        { name: 'Soup cua bắp', price: 55000, description: 'Soup cua thơm ngon' },
      ],
    },
    {
      category: { name: '🧃 Đồ Uống', icon: '🧃' },
      items: [
        { name: 'Nước chanh muối', price: 25000 },
        { name: 'Sinh tố bơ', price: 40000 },
        { name: 'Cà phê sữa đá', price: 30000 },
        { name: 'Trà đào cam sả', price: 35000 },
        { name: 'Bia Tiger', price: 30000 },
      ],
    },
  ];

  for (const { category, items } of menuData) {
    const cat = await prisma.category.create({ data: category });
    for (const item of items) {
      await prisma.menuItem.create({
        data: { ...item, category_id: cat.id, is_available: true },
      });
    }
  }

  console.log('✅ Seed hoàn thành!');
  console.log('📊 Đã tạo: 5 roles, 5 users, 4 zones, 24 tables, 3 categories, 14 menu items');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 7. 🌐 URL Demo Các Màn Hình

| Màn hình | URL | Role được phép |
|----------|-----|---------------|
| 🔐 Đăng nhập | `/login` | Tất cả |
| 🏠 Dashboard | `/dashboard` | ADMIN, MANAGER |
| 🪑 Sơ đồ bàn (Floor Plan) | `/tables` | WAITER, CASHIER |
| 🧾 Tạo đơn hàng | `/orders/new?tableId=xxx` | WAITER |
| 📋 Danh sách đơn hàng | `/orders` | CASHIER, MANAGER |
| 👨‍🍳 Màn hình bếp (KDS) | `/kitchen` | KITCHEN |
| 💰 Thanh toán | `/orders/:id/payment` | CASHIER |
| 🍽️ Quản lý thực đơn | `/menu` | MANAGER, ADMIN |
| 👥 Quản lý nhân viên | `/staff` | ADMIN, MANAGER |
| 📊 Báo cáo doanh thu | `/reports/revenue` | MANAGER, ADMIN |
| 📦 Quản lý kho | `/inventory` | MANAGER, ADMIN |
| ⏰ Quản lý ca làm | `/shifts` | MANAGER, ADMIN |
| 📅 Đặt bàn | `/reservations` | WAITER, CASHIER |
| ⚙️ Cài đặt hệ thống | `/settings` | ADMIN |

---

## 8. ⚡ GitHub Actions CI/CD Workflow

```yaml
# .github/workflows/ci-cd.yml
name: 🚀 RestoPOS CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─────────── CI: Test & Lint ───────────
  test:
    name: 🧪 Test & Lint
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: restopos_test
          POSTGRES_USER: restopos
          POSTGRES_PASSWORD: testpassword
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: 'apps/backend/package-lock.json'

      - name: 📦 Install backend dependencies
        run: npm ci
        working-directory: apps/backend

      - name: 🔍 Lint backend
        run: npm run lint
        working-directory: apps/backend

      - name: 🧪 Run backend tests
        run: npm run test:ci
        working-directory: apps/backend
        env:
          DATABASE_URL: postgresql://restopos:testpassword@localhost:5432/restopos_test
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test_access_secret_min_32_chars_long
          JWT_REFRESH_SECRET: test_refresh_secret_min_32_chars_long
          NODE_ENV: test

      - name: 📊 Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: apps/backend/coverage

      - name: 📦 Install frontend dependencies
        run: npm ci
        working-directory: apps/frontend

      - name: 🔍 Lint frontend
        run: npm run lint
        working-directory: apps/frontend

      - name: 🏗️ Build frontend
        run: npm run build
        working-directory: apps/frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1

  # ─────────── CD: Build & Push Docker Image ───────────
  build-and-push:
    name: 🐳 Build & Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: 🔑 Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 🏷️ Extract Docker metadata
        id: meta-backend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            latest

      - name: 🐳 Build & push backend image
        uses: docker/build-push-action@v5
        with:
          context: apps/backend
          push: true
          tags: ${{ steps.meta-backend.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: 🐳 Build & push frontend image
        uses: docker/build-push-action@v5
        with:
          context: apps/frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}

  # ─────────── CD: Deploy to Server ───────────
  deploy:
    name: 🚀 Deploy to Production
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: 🔐 Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/restopos
            git pull origin main
            docker compose pull
            docker compose up -d --no-deps --build backend frontend
            docker compose exec backend npx prisma migrate deploy
            docker system prune -f
            echo "✅ Deployment completed at $(date)"

      - name: 📢 Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '🚀 RestoPOS deployed to production successfully!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## 9. ✅ Checklist Demo Luồng Nghiệp Vụ

### 9.1 Luồng Phục Vụ Khách Tại Bàn

- [ ] 🔐 **Đăng nhập** với tài khoản WAITER
- [ ] 🗺️ **Xem sơ đồ bàn** – Kiểm tra trạng thái các bàn
- [ ] 🪑 **Chọn bàn A01** – Bàn hiển thị màu xanh (trống)
- [ ] ➕ **Tạo đơn hàng** – Thêm 3 món ăn, 2 đồ uống
- [ ] 📝 **Thêm ghi chú** – "Ít cay, không hành" cho một món
- [ ] ✅ **Xác nhận đơn** – Order được gửi xuống bếp
- [ ] 🪑 **Bàn chuyển sang trạng thái** Occupied (đỏ)

### 9.2 Luồng Bếp Xử Lý Đơn

- [ ] 🔐 **Đăng nhập** với tài khoản KITCHEN
- [ ] 📺 **Xem màn hình KDS** – Đơn mới hiển thị ở cột "Đang chờ"
- [ ] 🔔 **Nhận thông báo** realtime khi có đơn mới
- [ ] 🍳 **Cập nhật trạng thái** từng món: Pending → Preparing → Done
- [ ] ✅ **Hoàn thành tất cả món** – Đơn chuyển sang "Sẵn sàng phục vụ"

### 9.3 Luồng Thanh Toán

- [ ] 🔐 **Đăng nhập** với tài khoản CASHIER
- [ ] 🧾 **Tìm đơn cần thanh toán** – Lọc theo bàn A01
- [ ] 💰 **Chọn phương thức** – Thử thanh toán VietQR
- [ ] 📱 **Quét mã QR** – Mã QR hiển thị với số tiền chính xác
- [ ] ✅ **Xác nhận PAID** – Webhook/polling cập nhật trạng thái
- [ ] 🖨️ **In hóa đơn** hoặc gửi qua email
- [ ] 🪑 **Bàn tự động giải phóng** – Trạng thái về Available (xanh)

### 9.4 Luồng Quản Lý & Báo Cáo

- [ ] 🔐 **Đăng nhập** với tài khoản MANAGER
- [ ] 📊 **Xem Dashboard** – KPI hôm nay, biểu đồ 7 ngày
- [ ] 📈 **Xem báo cáo doanh thu** – Lọc theo ngày/tháng
- [ ] 🏢 **Xem báo cáo theo khu vực** – So sánh Zone A vs Zone B
- [ ] 📦 **Kiểm tra tồn kho** – Danh sách nguyên liệu sắp hết
- [ ] 👥 **Xem báo cáo nhân viên** – Doanh thu từng nhân viên
- [ ] 📅 **Đặt bàn cho khách** – Đặt bàn và nhận thông báo Telegram

### 9.5 Luồng Admin Hệ Thống

- [ ] 🔐 **Đăng nhập** với tài khoản ADMIN
- [ ] 👤 **Tạo nhân viên mới** – Điền form, phân role
- [ ] 🍽️ **Thêm món mới vào menu** – Upload ảnh, đặt giá
- [ ] 🏢 **Tạo khu vực và bàn** – Thêm Zone VIP, 5 bàn
- [ ] ⚙️ **Cài đặt hệ thống** – Logo, tên nhà hàng, VAT
- [ ] 📋 **Mở ca làm việc** – Nhập tiền đầu ca

---

> 🎯 **Mục tiêu demo:** Hoàn thành toàn bộ checklist trên trong vòng 10 phút để chứng minh hệ thống hoạt động end-to-end đầy đủ.

