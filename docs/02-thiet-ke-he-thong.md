# 📐 Tài Liệu Thiết Kế Hệ Thống — RestoPOS

> **Phiên bản:** 1.0.0 | **Ngày cập nhật:** 06/06/2026  
> **Nhóm:** CT07 | **Môn học:** Công nghệ phần mềm

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Sơ Đồ Kiến Trúc](#2-sơ-đồ-kiến-trúc)
3. [Thiết Kế Cơ Sở Dữ Liệu (ERD)](#3-thiết-kế-cơ-sở-dữ-liệu-erd)
4. [Thiết Kế API RESTful](#4-thiết-kế-api-restful)
5. [Sequence Diagram](#5-sequence-diagram)
6. [Thiết Kế Backend — Phân Lớp Chi Tiết](#6-thiết-kế-backend--phân-lớp-chi-tiết)
7. [Thiết Kế Frontend](#7-thiết-kế-frontend)
8. [Luồng Xử Lý Realtime (Socket.IO + BullMQ)](#8-luồng-xử-lý-realtime-socketio--bullmq)
9. [Hạ Tầng DevOps](#9-hạ-tầng-devops)
10. [Lý Do Chọn Công Nghệ](#10-lý-do-chọn-công-nghệ)

---

## 1. Tổng Quan Kiến Trúc Hệ Thống

### 1.1 Mô Hình Kiến Trúc

Hệ thống **RestoPOS** được thiết kế theo mô hình **Layered Architecture (Kiến trúc phân lớp)** kết hợp với **MVC pattern** ở tầng API, đảm bảo tính tách biệt trách nhiệm (Separation of Concerns) và dễ mở rộng.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│         (Next.js 15 App Router — SSR/SSG/CSR hybrid)           │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GATEWAY LAYER                              │
│              Nginx (Reverse Proxy + Load Balancer)              │
│         Rate Limiting · SSL Termination · Static Files          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│              Express 5 + TypeScript (MVC Pattern)               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ Routers  │  │Controllers│  │Middleware│  │Socket.IO     │  │
│   │ (Routes) │→ │(Handlers) │  │(Auth/Val)│  │(WS Handler)  │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LAYER                              │
│                      Service Layer                              │
│   ┌───────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐  │
│   │OrderService│ │PayService  │ │KitchenSvc│ │InventorySvc  │  │
│   └───────────┘ └────────────┘ └──────────┘ └──────────────┘  │
│                                                                 │
│                    ┌──────────────────┐                         │
│                    │  BullMQ Workers  │                         │
│                    │(Async Job Queue) │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                            │
│                  Prisma ORM (Repository Pattern)                │
│       Type-safe queries · Migrations · Connection Pooling       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────┐
│ PostgreSQL 16 │  │   Redis 7       │  │  File Storage│
│ (Primary DB)  │  │ (Cache/Queue/  │  │  (Uploads)   │
│               │  │  Sessions)     │  │              │
└───────────────┘  └────────────────┘  └──────────────┘
```

### 1.2 Các Nguyên Tắc Thiết Kế

| Nguyên tắc | Mô tả áp dụng |
|---|---|
| **Single Responsibility** | Mỗi class/module chỉ đảm nhiệm 1 nhiệm vụ (Controller chỉ parse request, Service chứa logic nghiệp vụ) |
| **Dependency Injection** | Services được inject vào Controllers, tạo điều kiện unit test dễ dàng |
| **Repository Pattern** | Prisma Client được bọc trong lớp repository, tách biệt query logic khỏi business logic |
| **Event-Driven** | Các thao tác async (in bill, gửi bếp, SMS) xử lý qua BullMQ queue |
| **CQRS Nhẹ** | Read queries (danh sách menu, báo cáo) dùng Redis cache, write operations ghi thẳng DB |

---

## 2. Sơ Đồ Kiến Trúc

### 2.1 Sơ Đồ Triển Khai (Deployment Diagram)

```
╔══════════════════════════════════════════════════════════════════════╗
║                        DOCKER COMPOSE NETWORK                       ║
║                                                                      ║
║  ┌────────────────┐    ┌──────────────────────────────────────────┐ ║
║  │   CLIENT       │    │             nginx:443                    │ ║
║  │                │    │   ┌──────────────────────────────────┐   │ ║
║  │ 🖥 POS Terminal │───▶│   │  /api/*  → backend:3000          │   │ ║
║  │ 📱 Mobile Waiter│    │   │  /ws/*   → backend:3000          │   │ ║
║  │ 🍳 Kitchen Disp │    │   │  /*      → frontend:3001         │   │ ║
║  │ 📊 Admin Panel  │    │   └──────────────────────────────────┘   │ ║
║  └────────────────┘    └──────────────────────────────────────────┘ ║
║                                     │                               ║
║                    ┌────────────────┴────────────────┐             ║
║                    ▼                                 ▼             ║
║  ┌─────────────────────────────┐  ┌───────────────────────────┐   ║
║  │   backend (Node.js:3000)    │  │  frontend (Next.js:3001)  │   ║
║  │                             │  │                           │   ║
║  │  Express 5 + Socket.IO      │  │  Next.js 15 App Router    │   ║
║  │  BullMQ Workers             │  │  shadcn/ui + Tailwind v4  │   ║
║  │  Prisma Client              │  │                           │   ║
║  └─────────────────────────────┘  └───────────────────────────┘   ║
║             │          │                                           ║
║             ▼          ▼                                           ║
║  ┌──────────────┐  ┌──────────────┐                               ║
║  │ postgres:5432│  │  redis:6379  │                               ║
║  │ PostgreSQL 16│  │  Redis 7     │                               ║
║  │ (pgdata vol) │  │  (redis vol) │                               ║
║  └──────────────┘  └──────────────┘                               ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 2.2 Sơ Đồ Luồng Dữ Liệu (Data Flow Diagram — Mức 0)

```
 Nhân viên        Hệ Thống POS           Nhà Bếp         Quản Lý
    │                   │                    │               │
    │── Gọi món ────────▶                   │               │
    │                   │── BullMQ job ─────▶               │
    │                   │                   │── Hiển thị    │
    │                   │◀── Xác nhận ──────│               │
    │◀── Cập nhật UI ───│                   │               │
    │                   │                   │               │
    │── Thanh toán ─────▶                   │               │
    │                   │── Tạo invoice ────────────────────▶
    │◀── QR / Biên lai ─│                   │               │
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (ERD)

### 3.1 Sơ Đồ Quan Hệ Thực Thể (Entity Relationship)

> Cơ sở dữ liệu gồm **20 bảng** được chuẩn hóa đến dạng **3NF (Third Normal Form)**, đảm bảo loại bỏ dư thừa dữ liệu và đảm bảo tính toàn vẹn.

#### Nhóm 1: Quản Lý Người Dùng & Ca Làm Việc

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│           users              │      │         work_shifts          │
├──────────────────────────────┤      ├──────────────────────────────┤
│ PK  id           UUID        │      │ PK  id           UUID        │
│     username     VARCHAR(50) │      │ FK  user_id      UUID        │◀──── users.id
│     password_hash TEXT       │      │     shift_date   DATE        │
│     full_name    VARCHAR(100)│      │     start_time   TIMESTAMP   │
│     role         ENUM        │      │     end_time     TIMESTAMP   │
│     phone        VARCHAR(20) │      │     status       ENUM        │
│     is_active    BOOLEAN     │      │     notes        TEXT        │
│     created_at   TIMESTAMP   │      │     created_at   TIMESTAMP   │
└──────────────────────────────┘      └──────────────────────────────┘
```

#### Nhóm 2: Quản Lý Khu Vực & Bàn

```
┌──────────────────┐          ┌───────────────────────────────────┐
│      zones       │          │              tables               │
├──────────────────┤          ├───────────────────────────────────┤
│ PK  id    UUID   │          │ PK  id           UUID             │
│     name  VARCHAR│◀── FK ───│ FK  zone_id      UUID             │
│     desc  TEXT   │          │     table_number  VARCHAR(10)     │
│     floor INT    │          │     capacity      INT             │
└──────────────────┘          │     status        ENUM            │
                              │     qr_code       TEXT            │
                              └───────────────────────────────────┘
```

#### Nhóm 3: Thực Đơn & Biến Thể

```
┌────────────────────┐     ┌──────────────────────────────────────┐
│  menu_categories   │     │            menu_items                │
├────────────────────┤     ├──────────────────────────────────────┤
│ PK  id    UUID     │     │ PK  id             UUID              │
│     name  VARCHAR  │◀────│ FK  category_id    UUID              │
│     sort_order INT │     │     name           VARCHAR(200)      │
│     is_active BOOL │     │     description    TEXT              │
└────────────────────┘     │     base_price     DECIMAL(12,2)     │
                           │     image_url      TEXT              │
                           │     is_available   BOOLEAN           │
                           │     prep_time_min  INT               │
                           └──────────────────────────────────────┘
                                        │                │
                         ┌──────────────┘                └─────────────┐
                         ▼                                             ▼
          ┌──────────────────────────┐           ┌──────────────────────────┐
          │   menu_item_variants     │           │      menu_modifiers      │
          ├──────────────────────────┤           ├──────────────────────────┤
          │ PK id          UUID      │           │ PK id          UUID      │
          │ FK menu_item_id UUID     │           │ FK menu_item_id UUID     │
          │    name         VARCHAR  │           │    name         VARCHAR  │
          │    price_delta  DECIMAL  │           │    price_delta  DECIMAL  │
          │    is_default   BOOLEAN  │           │    is_required  BOOLEAN  │
          └──────────────────────────┘           └──────────────────────────┘
```

#### Nhóm 4: Đơn Hàng

```
┌────────────────────────────────────┐
│              orders                │
├────────────────────────────────────┤
│ PK  id            UUID             │
│ FK  table_id      UUID  ──────────▶ tables.id
│ FK  user_id       UUID  ──────────▶ users.id (waiter)
│ FK  customer_id   UUID  ──────────▶ customers.id
│ FK  voucher_id    UUID  ──────────▶ vouchers.id
│     order_number  VARCHAR(20)      │
│     status        ENUM             │
│     subtotal      DECIMAL(12,2)    │
│     discount_amt  DECIMAL(12,2)    │
│     tax_amount    DECIMAL(12,2)    │
│     total_amount  DECIMAL(12,2)    │
│     notes         TEXT             │
│     opened_at     TIMESTAMP        │
│     closed_at     TIMESTAMP        │
└────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────┐
│           order_items              │
├────────────────────────────────────┤
│ PK  id               UUID         │
│ FK  order_id         UUID  ───────▶ orders.id
│ FK  menu_item_id     UUID  ───────▶ menu_items.id
│ FK  variant_id       UUID  ───────▶ menu_item_variants.id
│     quantity         INT           │
│     unit_price       DECIMAL(12,2)│
│     total_price      DECIMAL(12,2)│
│     status           ENUM         │
│     kitchen_notes    TEXT         │
│     sent_to_kitchen_at TIMESTAMP  │
└────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────┐
│      order_item_modifiers          │
├────────────────────────────────────┤
│ PK  id               UUID         │
│ FK  order_item_id    UUID  ───────▶ order_items.id
│ FK  modifier_id      UUID  ───────▶ menu_modifiers.id
│     price_at_order   DECIMAL(12,2)│
└────────────────────────────────────┘
```

#### Nhóm 5: Combo

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│           combos             │      │         combo_items          │
├──────────────────────────────┤      ├──────────────────────────────┤
│ PK  id           UUID        │      │ PK  id          UUID         │
│     name         VARCHAR     │      │ FK  combo_id    UUID  ───────▶ combos.id
│     description  TEXT        │      │ FK  menu_item_id UUID ───────▶ menu_items.id
│     price        DECIMAL     │      │     quantity    INT           │
│     image_url    TEXT        │      │     is_optional BOOLEAN       │
│     is_active    BOOLEAN     │      └──────────────────────────────┘
└──────────────────────────────┘
```

#### Nhóm 6: Kho Nguyên Liệu

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│        ingredients           │      │           recipes            │
├──────────────────────────────┤      ├──────────────────────────────┤
│ PK  id           UUID        │      │ PK  id            UUID       │
│     name         VARCHAR     │      │ FK  menu_item_id  UUID ──────▶ menu_items.id
│     unit         VARCHAR     │      │ FK  ingredient_id UUID ──────▶ ingredients.id
│     stock_qty    DECIMAL     │      │     quantity      DECIMAL     │
│     min_stock    DECIMAL     │      │     unit          VARCHAR     │
│     cost_per_unit DECIMAL    │      └──────────────────────────────┘
│     supplier     VARCHAR     │
└──────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│         ingredient_transactions          │
├──────────────────────────────────────────┤
│ PK  id               UUID               │
│ FK  ingredient_id    UUID  ─────────────▶ ingredients.id
│ FK  user_id          UUID  ─────────────▶ users.id
│     type             ENUM (in/out/adj)  │
│     quantity         DECIMAL            │
│     note             TEXT               │
│     transaction_at   TIMESTAMP          │
└──────────────────────────────────────────┘
```

#### Nhóm 7: Khách Hàng & Voucher

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│         customers            │      │           vouchers           │
├──────────────────────────────┤      ├──────────────────────────────┤
│ PK  id           UUID        │      │ PK  id           UUID        │
│     full_name    VARCHAR     │      │     code         VARCHAR(50) │
│     phone        VARCHAR     │      │     discount_type ENUM       │
│     email        VARCHAR     │      │     discount_val  DECIMAL    │
│     loyalty_pts  INT         │      │     min_order_val DECIMAL    │
│     total_spent  DECIMAL     │      │     max_discount  DECIMAL    │
│     created_at   TIMESTAMP   │      │     valid_from    TIMESTAMP  │
└──────────────────────────────┘      │     valid_until   TIMESTAMP  │
                                      │     usage_limit   INT        │
                                      │     used_count    INT        │
                                      └──────────────────────────────┘
```

#### Nhóm 8: Đặt Bàn

```
┌──────────────────────────────────────────────────────┐
│                    reservations                      │
├──────────────────────────────────────────────────────┤
│ PK  id               UUID                           │
│ FK  customer_id      UUID  ────────────────────────▶ customers.id
│ FK  table_id         UUID  ────────────────────────▶ tables.id
│     guest_count      INT                            │
│     reserved_at      TIMESTAMP                      │
│     arrival_time     TIMESTAMP                      │
│     status           ENUM (pending/confirmed/done)  │
│     notes            TEXT                           │
│     created_at       TIMESTAMP                      │
└──────────────────────────────────────────────────────┘
```

#### Nhóm 9: Hóa Đơn & Thanh Toán

```
┌──────────────────────────────────────────────────────┐
│                     invoices                         │
├──────────────────────────────────────────────────────┤
│ PK  id               UUID                           │
│ FK  order_id         UUID  ────────────────────────▶ orders.id
│ FK  customer_id      UUID  ────────────────────────▶ customers.id
│ FK  voucher_id       UUID  ────────────────────────▶ vouchers.id
│     invoice_number   VARCHAR(20)                    │
│     subtotal         DECIMAL(12,2)                  │
│     tax_rate         DECIMAL(5,4)                   │
│     tax_amount       DECIMAL(12,2)                  │
│     discount_amount  DECIMAL(12,2)                  │
│     total_amount     DECIMAL(12,2)                  │
│     status           ENUM (draft/paid/cancelled)    │
│     issued_at        TIMESTAMP                      │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────┐      ┌──────────────────────────────┐
│      invoice_payments        │      │    payment_transactions      │
├──────────────────────────────┤      ├──────────────────────────────┤
│ PK  id           UUID        │      │ PK  id           UUID        │
│ FK  invoice_id   UUID ───────▶      │ FK  payment_id   UUID ───────▶ invoice_payments.id
│     method       ENUM        │      │     gateway_txn_id VARCHAR   │
│     amount       DECIMAL     │      │     gateway_ref  VARCHAR     │
│     paid_at      TIMESTAMP   │      │     status       ENUM        │
│     reference_no VARCHAR     │      │     payload       JSONB      │
└──────────────────────────────┘      │     processed_at  TIMESTAMP  │
                                      └──────────────────────────────┘
```

#### Nhóm 10: Cấu Hình Hệ Thống

```
┌──────────────────────────────────────────┐
│              store_config                │
├──────────────────────────────────────────┤
│ PK  id               UUID               │
│     key              VARCHAR(100) UNIQUE │
│     value            TEXT               │
│     description      TEXT               │
│     updated_at       TIMESTAMP          │
└──────────────────────────────────────────┘
```

### 3.2 Bảng Tổng Hợp Quan Hệ

| Bảng | Quan hệ với | Loại quan hệ | Mô tả |
|---|---|---|---|
| `users` | `work_shifts` | 1:N | Một nhân viên có nhiều ca làm việc |
| `zones` | `tables` | 1:N | Một khu vực có nhiều bàn |
| `tables` | `orders` | 1:N | Một bàn có nhiều đơn theo thời gian |
| `menu_categories` | `menu_items` | 1:N | Một danh mục chứa nhiều món ăn |
| `menu_items` | `menu_item_variants` | 1:N | Một món có nhiều biến thể (size, loại) |
| `menu_items` | `menu_modifiers` | 1:N | Một món có nhiều topping/option |
| `menu_items` | `recipes` | 1:N | Một món có nhiều nguyên liệu (công thức) |
| `orders` | `order_items` | 1:N | Một order chứa nhiều dòng món |
| `order_items` | `order_item_modifiers` | 1:N | Một dòng món có nhiều modifier đã chọn |
| `combos` | `combo_items` | 1:N | Một combo gồm nhiều món |
| `ingredients` | `ingredient_transactions` | 1:N | Một nguyên liệu có nhiều giao dịch nhập/xuất |
| `invoices` | `invoice_payments` | 1:N | Một hóa đơn có thể thanh toán nhiều lần (split) |
| `invoice_payments` | `payment_transactions` | 1:N | Một lần thanh toán có nhiều giao dịch retry |
| `customers` | `reservations` | 1:N | Một khách có nhiều lần đặt bàn |
| `customers` | `invoices` | 1:N | Một khách có nhiều hóa đơn |
| `vouchers` | `orders` | 1:N | Một voucher có thể dùng cho nhiều đơn |

### 3.3 Enum Types

```sql
-- Trạng thái bàn
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');

-- Trạng thái đơn hàng
CREATE TYPE order_status AS ENUM ('open', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'closed', 'cancelled');

-- Trạng thái món trong đơn
CREATE TYPE order_item_status AS ENUM ('pending', 'sent', 'preparing', 'ready', 'served', 'cancelled');

-- Vai trò người dùng
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'waiter', 'kitchen');

-- Phương thức thanh toán
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'qr_transfer', 'momo', 'vnpay', 'zalopay');

-- Loại giảm giá
CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
```

---

## 4. Thiết Kế API RESTful

### 4.1 Quy Ước API

| Quy tắc | Áp dụng |
|---|---|
| **Base URL** | `/api/v1` |
| **Authentication** | Bearer JWT Token trong header `Authorization` |
| **Content-Type** | `application/json` |
| **Pagination** | `?page=1&limit=20` |
| **Sorting** | `?sort=created_at&order=desc` |
| **Filter** | `?status=open&zone_id=xxx` |
| **Response format** | `{ success, data, message, meta }` |
| **Error format** | `{ success: false, error: { code, message, details } }` |

### 4.2 Chuẩn Response

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Thành công",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Không tìm thấy đơn hàng",
    "details": null
  }
}
```

### 4.3 Danh Sách Endpoints

#### 🔐 Auth

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `POST` | `/auth/login` | Đăng nhập | Public |
| `POST` | `/auth/logout` | Đăng xuất | All |
| `POST` | `/auth/refresh` | Làm mới token | All |
| `GET` | `/auth/me` | Thông tin user hiện tại | All |
| `PUT` | `/auth/change-password` | Đổi mật khẩu | All |

#### 👥 Users

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/users` | Danh sách nhân viên | Admin/Manager |
| `POST` | `/users` | Thêm nhân viên | Admin |
| `GET` | `/users/:id` | Chi tiết nhân viên | Admin/Manager |
| `PUT` | `/users/:id` | Cập nhật nhân viên | Admin |
| `DELETE` | `/users/:id` | Vô hiệu hóa nhân viên | Admin |

#### 🗺️ Zones & Tables

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/zones` | Danh sách khu vực | All |
| `POST` | `/zones` | Thêm khu vực | Admin |
| `GET` | `/zones/:id/tables` | Bàn trong khu vực | All |
| `GET` | `/tables` | Tất cả bàn + trạng thái | All |
| `POST` | `/tables` | Thêm bàn | Admin |
| `PUT` | `/tables/:id/status` | Cập nhật trạng thái bàn | Waiter |
| `GET` | `/tables/:id/current-order` | Đơn đang mở của bàn | All |

#### 🍽️ Menu

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/menu/categories` | Danh mục thực đơn | All |
| `POST` | `/menu/categories` | Thêm danh mục | Admin |
| `GET` | `/menu/items` | Danh sách món | All |
| `POST` | `/menu/items` | Thêm món mới | Admin |
| `GET` | `/menu/items/:id` | Chi tiết món | All |
| `PUT` | `/menu/items/:id` | Cập nhật món | Admin |
| `PUT` | `/menu/items/:id/availability` | Bật/tắt khả dụng | Admin/Manager |
| `GET` | `/menu/items/:id/variants` | Biến thể của món | All |
| `GET` | `/menu/items/:id/modifiers` | Modifier của món | All |
| `GET` | `/menu/combos` | Danh sách combo | All |
| `POST` | `/menu/combos` | Tạo combo mới | Admin |

#### 📋 Orders

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/orders` | Danh sách đơn | Manager/Cashier |
| `POST` | `/orders` | Tạo đơn mới | Waiter/Cashier |
| `GET` | `/orders/:id` | Chi tiết đơn | All |
| `PUT` | `/orders/:id` | Cập nhật đơn | Waiter |
| `POST` | `/orders/:id/items` | Thêm món vào đơn | Waiter |
| `PUT` | `/orders/:id/items/:itemId` | Sửa món trong đơn | Waiter |
| `DELETE` | `/orders/:id/items/:itemId` | Xóa món khỏi đơn | Waiter/Manager |
| `POST` | `/orders/:id/send-to-kitchen` | Gửi lên bếp | Waiter |
| `PUT` | `/orders/:id/status` | Cập nhật trạng thái | Kitchen/Waiter |
| `POST` | `/orders/:id/close` | Đóng đơn hàng | Cashier |

#### 🍳 Kitchen

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/kitchen/queue` | Hàng đợi bếp | Kitchen |
| `PUT` | `/kitchen/items/:itemId/status` | Cập nhật trạng thái món | Kitchen |
| `GET` | `/kitchen/stats` | Thống kê thời gian chế biến | Manager |

#### 💰 Invoices & Payments

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `POST` | `/invoices` | Tạo hóa đơn từ order | Cashier |
| `GET` | `/invoices/:id` | Chi tiết hóa đơn | Cashier |
| `POST` | `/invoices/:id/payments` | Thanh toán hóa đơn | Cashier |
| `POST` | `/invoices/:id/qr` | Tạo QR thanh toán | Cashier |
| `POST` | `/payments/webhook` | Webhook từ cổng thanh toán | System |
| `GET` | `/payments/check/:txnId` | Kiểm tra trạng thái thanh toán | Cashier |

#### 🎟️ Vouchers & Customers

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/vouchers` | Danh sách voucher | Manager |
| `POST` | `/vouchers` | Tạo voucher | Manager |
| `POST` | `/vouchers/validate` | Kiểm tra voucher hợp lệ | Cashier/Waiter |
| `GET` | `/customers` | Danh sách khách hàng | Manager/Cashier |
| `POST` | `/customers` | Thêm khách hàng | Cashier |
| `GET` | `/customers/:id` | Chi tiết khách hàng | Cashier |
| `GET` | `/customers/phone/:phone` | Tìm khách theo SĐT | Cashier |

#### 📦 Inventory

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/inventory/ingredients` | Danh sách nguyên liệu | Manager |
| `POST` | `/inventory/ingredients` | Thêm nguyên liệu | Manager |
| `PUT` | `/inventory/ingredients/:id` | Cập nhật nguyên liệu | Manager |
| `POST` | `/inventory/transactions` | Nhập/Xuất kho | Manager |
| `GET` | `/inventory/transactions` | Lịch sử giao dịch kho | Manager |
| `GET` | `/inventory/low-stock` | Cảnh báo tồn kho thấp | Manager |

#### 📅 Reservations

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/reservations` | Danh sách đặt bàn | Manager/Cashier |
| `POST` | `/reservations` | Tạo đặt bàn | Cashier |
| `PUT` | `/reservations/:id/confirm` | Xác nhận đặt bàn | Manager |
| `PUT` | `/reservations/:id/cancel` | Hủy đặt bàn | Manager |

#### 📊 Reports

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| `GET` | `/reports/revenue` | Báo cáo doanh thu | Manager/Admin |
| `GET` | `/reports/orders` | Báo cáo đơn hàng | Manager/Admin |
| `GET` | `/reports/menu-performance` | Hiệu suất thực đơn | Manager |
| `GET` | `/reports/staff` | Báo cáo nhân viên | Admin |

---

## 5. Sequence Diagram

### 5.1 Luồng Đăng Nhập (Authentication Flow)

```
Client          Nginx          Express API        Redis           PostgreSQL
  │               │                │                │                 │
  │──POST /login─▶│                │                │                 │
  │               │──forward──────▶│                │                 │
  │               │                │── validate ────▶                 │
  │               │                │   body         │                 │
  │               │                │                │                 │
  │               │                │── SELECT user ─────────────────▶ │
  │               │                │   WHERE username=?              │
  │               │                │◀─────────────── user record ────│
  │               │                │                │                 │
  │               │                │── bcrypt.compare(pass, hash)    │
  │               │                │   [password check]              │
  │               │                │                │                 │
  │               │                │── generateJWT()│                 │
  │               │                │   (access 15m) │                 │
  │               │                │                │                 │
  │               │                │── SET session ─▶                │
  │               │                │   key=refreshToken (7d TTL)     │
  │               │                │◀──────────── OK ────────────────│
  │               │                │                │                 │
  │               │◀──────200──────│                │                 │
  │               │  { accessToken,│                │                 │
  │               │    refreshToken│                │                 │
  │               │    user }      │                │                 │
  │◀── response ──│                │                │                 │
  │               │                │                │                 │
  │ [Store tokens in Zustand + localStorage]        │                 │
```

### 5.2 Luồng Tạo Order & Gửi Bếp

```
Waiter App      Express API        OrderService      Prisma         Socket.IO      BullMQ
    │               │                   │               │               │              │
    │─POST /orders─▶│                   │               │               │              │
    │               │── auth middleware─▶               │               │              │
    │               │── validate body ──▶               │               │              │
    │               │                   │               │               │              │
    │               │──createOrder()───▶│               │               │              │
    │               │                   │──transaction──▶               │              │
    │               │                   │  BEGIN        │               │              │
    │               │                   │──INSERT order─▶               │              │
    │               │                   │──INSERT items─▶               │              │
    │               │                   │──INSERT modif─▶               │              │
    │               │                   │  COMMIT       │               │              │
    │               │                   │◀──── order ───│               │              │
    │               │                   │               │               │              │
    │               │                   │──UPDATE table status=occupied─▶              │
    │               │                   │               │               │              │
    │◀──201 order───│◀────order─────────│               │               │              │
    │               │                   │               │               │              │
    │─POST /:id/send-to-kitchen────────▶│               │               │              │
    │               │                   │               │               │              │
    │               │──sendToKitchen()─▶│               │               │              │
    │               │                   │──UPDATE items status=sent ────▶              │
    │               │                   │               │               │              │
    │               │                   │───────────────────────────────▶emit KDS      │
    │               │                   │               │     'kitchen:new-order'      │
    │               │                   │               │   [Kitchen Display System]   │
    │               │                   │               │               │              │
    │               │                   │────────────────────────────────────────▶addJob│
    │               │                   │               │               │  'deduct-stock'│
    │               │                   │               │               │              │
    │◀──200 OK──────│◀────OK────────────│               │               │              │
    │               │                   │               │               │              │
    │               │                   │               │        Kitchen Display        │
    │               │                   │               │◀──────────── receives ───────│
    │               │                   │               │              new ticket      │
```

### 5.3 Luồng Thanh Toán QR

```
Cashier         Express API       PaymentService      Redis        Payment GW    BullMQ
   │                │                  │                │              │             │
   │─POST /invoices─▶                  │                │              │             │
   │                │─createInvoice()─▶│                │              │             │
   │                │                  │─INSERT invoice─▶              │             │
   │                │◀─── invoice ─────│                │              │             │
   │◀── 201 invoice─│                  │                │              │             │
   │                │                  │                │              │             │
   │─POST /invoices/:id/qr────────────▶│                │              │             │
   │                │                  │                │              │             │
   │                │─generateQR()────▶│                │              │             │
   │                │                  │─SET qr_pending─▶              │             │
   │                │                  │  key=inv_id    │              │             │
   │                │                  │  TTL=15min     │              │             │
   │                │                  │                │              │             │
   │                │                  │─createQR()─────────────────▶  │             │
   │                │                  │  (VietQR/VNPay)│              │             │
   │                │                  │◀───────── qr_data/url ───────│             │
   │                │                  │                │              │             │
   │◀── QR payload ─│◀── qr_data ──────│                │              │             │
   │                │                  │                │              │             │
   │ [Render QR on screen]             │                │              │             │
   │                │                  │                │              │             │
   │                │                  │         [Khách quét QR & chuyển khoản]      │
   │                │                  │                │              │             │
   │                │◀─── webhook ─────────────────────────────────────│             │
   │                │  POST /payments/webhook           │              │             │
   │                │                  │                │              │             │
   │                │─handleWebhook()─▶│                │              │             │
   │                │                  │─verify signature              │             │
   │                │                  │─GET qr_pending─▶              │             │
   │                │                  │◀─── invoice_id─│              │             │
   │                │                  │                │              │             │
   │                │                  │─UPDATE invoice status=paid    │             │
   │                │                  │─INSERT payment_transaction    │             │
   │                │                  │                │              │             │
   │                │                  │──────────────────────────────────────────▶addJob
   │                │                  │               │               │  'print-receipt'
   │                │                  │               │               │  'loyalty-points'
   │                │                  │               │               │             │
   │                │                  │─emit payment_success──────────────────────▶  │
   │                │                  │  (Socket.IO → Cashier screen)               │
   │◀── realtime ───│                  │                │              │             │
   │  payment_success                  │                │              │             │
```

---

## 6. Thiết Kế Backend — Phân Lớp Chi Tiết

### 6.1 Cấu Trúc Thư Mục Backend

```
backend/
├── src/
│   ├── app.ts                    # Express app khởi tạo
│   ├── server.ts                 # HTTP server + Socket.IO
│   │
│   ├── config/
│   │   ├── database.ts           # Prisma client singleton
│   │   ├── redis.ts              # Redis client config
│   │   ├── env.ts                # Zod env validation
│   │   └── cors.ts               # CORS config
│   │
│   ├── routers/                  # 📍 ROUTES LAYER
│   │   ├── index.ts              # Route aggregator
│   │   ├── auth.router.ts
│   │   ├── orders.router.ts
│   │   ├── menu.router.ts
│   │   ├── payments.router.ts
│   │   └── ...
│   │
│   ├── controllers/              # 🎮 CONTROLLER LAYER (MVC)
│   │   ├── auth.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── menu.controller.ts
│   │   └── ...
│   │
│   ├── services/                 # ⚙️ SERVICE LAYER (Business Logic)
│   │   ├── auth.service.ts
│   │   ├── orders.service.ts
│   │   ├── payment.service.ts
│   │   ├── kitchen.service.ts
│   │   ├── inventory.service.ts
│   │   └── notification.service.ts
│   │
│   ├── repositories/             # 🗄️ DATA ACCESS LAYER
│   │   ├── order.repository.ts
│   │   ├── menu.repository.ts
│   │   ├── payment.repository.ts
│   │   └── base.repository.ts
│   │
│   ├── middlewares/              # 🔒 MIDDLEWARE
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── rbac.middleware.ts    # Role-based access
│   │   ├── validate.middleware.ts # Zod schema validation
│   │   ├── error.middleware.ts   # Global error handler
│   │   └── logger.middleware.ts  # Request logging
│   │
│   ├── socket/                   # 🔌 WEBSOCKET HANDLERS
│   │   ├── socket.manager.ts     # Socket.IO init + namespace
│   │   ├── handlers/
│   │   │   ├── kitchen.handler.ts
│   │   │   ├── order.handler.ts
│   │   │   └── table.handler.ts
│   │   └── events.ts             # Event name constants
│   │
│   ├── jobs/                     # 🔄 BULLMQ JOBS
│   │   ├── queues.ts             # Queue definitions
│   │   ├── workers/
│   │   │   ├── deduct-stock.worker.ts
│   │   │   ├── print-receipt.worker.ts
│   │   │   ├── loyalty-points.worker.ts
│   │   │   └── send-notification.worker.ts
│   │   └── schedulers/
│   │       └── reservation-reminder.ts
│   │
│   ├── validators/               # 📋 ZOD SCHEMAS
│   │   ├── auth.schema.ts
│   │   ├── order.schema.ts
│   │   └── payment.schema.ts
│   │
│   └── utils/
│       ├── jwt.utils.ts
│       ├── bcrypt.utils.ts
│       ├── response.utils.ts     # Chuẩn hóa response
│       └── pagination.utils.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── Dockerfile
└── package.json
```

### 6.2 Controllers (Tầng Điều Phối)

Controllers chỉ đảm nhiệm vai trò **parse request → gọi service → trả response**. Không chứa business logic.

```typescript
// orders.controller.ts
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  createOrder = async (req: Request, res: Response) => {
    const dto = CreateOrderSchema.parse(req.body);
    const userId = req.user.id; // từ auth middleware
    
    const order = await this.orderService.createOrder(dto, userId);
    
    return res.status(201).json(successResponse(order, 'Tạo đơn thành công'));
  };

  sendToKitchen = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.orderService.sendToKitchen(id, req.user.id);
    return res.json(successResponse(null, 'Đã gửi lên bếp'));
  };
}
```

### 6.3 Services (Tầng Nghiệp Vụ)

Services chứa toàn bộ **business logic**, tương tác với repositories và các services khác.

```typescript
// orders.service.ts
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly tableRepo: TableRepository,
    private readonly socketManager: SocketManager,
    private readonly kitchenQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string): Promise<Order> {
    // 1. Kiểm tra bàn còn trống
    const table = await this.tableRepo.findById(dto.tableId);
    if (table.status !== 'available') {
      throw new BusinessError('TABLE_OCCUPIED', 'Bàn đang có khách');
    }

    // 2. Tạo order trong transaction Prisma
    const order = await this.orderRepo.createWithItems(dto, userId);

    // 3. Cập nhật trạng thái bàn
    await this.tableRepo.updateStatus(dto.tableId, 'occupied');

    return order;
  }

  async sendToKitchen(orderId: string, userId: string): Promise<void> {
    const order = await this.orderRepo.findWithItems(orderId);
    
    // 1. Cập nhật status các món chưa gửi
    await this.orderRepo.markItemsAsSent(orderId);

    // 2. Emit realtime đến màn hình bếp
    this.socketManager.toRoom('kitchen').emit('kitchen:new-order', {
      orderId,
      tableNumber: order.table.tableNumber,
      items: order.items.filter(i => i.status === 'sent'),
    });

    // 3. Đẩy job trừ kho vào BullMQ
    await this.kitchenQueue.add('deduct-stock', {
      orderId,
      items: order.items,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }
}
```

### 6.4 Repositories (Tầng Truy Cập Dữ Liệu)

```typescript
// order.repository.ts
export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createWithItems(dto: CreateOrderDto, userId: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.create({
        data: {
          tableId: dto.tableId,
          userId,
          status: 'open',
          orderNumber: await this.generateOrderNumber(tx),
          items: {
            create: dto.items.map(item => ({
              menuItemId: item.menuItemId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              modifiers: {
                create: item.modifierIds?.map(mid => ({ modifierId: mid })) ?? [],
              },
            })),
          },
        },
        include: { items: { include: { modifiers: true } }, table: true },
      });
      return order;
    });
  }

  async findWithItems(orderId: string) {
    return this.prisma.orders.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
            variant: true,
            modifiers: { include: { modifier: true } },
          },
        },
        table: true,
        customer: true,
      },
    });
  }
}
```

### 6.5 Socket Handlers (WebSocket)

```typescript
// socket.manager.ts
export class SocketManager {
  private io: Server;

  initialize(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: { origin: process.env.FRONTEND_URL },
    });

    // Namespace: /kitchen → màn hình bếp
    const kitchenNS = this.io.of('/kitchen');
    kitchenNS.use(socketAuthMiddleware);
    kitchenNS.on('connection', (socket) => {
      socket.join('kitchen-room');
      new KitchenHandler(socket, kitchenNS).register();
    });

    // Namespace: /pos → các màn hình thu ngân/phục vụ
    const posNS = this.io.of('/pos');
    posNS.use(socketAuthMiddleware);
    posNS.on('connection', (socket) => {
      // Join room theo role
      const role = socket.data.user.role;
      socket.join(`role:${role}`);
    });
  }
}
```

### 6.6 BullMQ Jobs (Xử Lý Bất Đồng Bộ)

| Job Name | Queue | Trigger | Mô tả |
|---|---|---|---|
| `deduct-stock` | `kitchen` | Gửi bếp | Trừ tồn kho nguyên liệu theo recipe |
| `print-receipt` | `printing` | Thanh toán xong | Gửi lệnh in hóa đơn đến máy in nhiệt |
| `loyalty-points` | `crm` | Thanh toán xong | Cộng điểm tích lũy cho khách |
| `send-notification` | `notifications` | Đặt bàn | Gửi SMS/email nhắc nhở đặt bàn |
| `reservation-reminder` | `scheduled` | Cron mỗi giờ | Kiểm tra đặt bàn sắp đến, gửi nhắc nhở |
| `low-stock-alert` | `inventory` | Nhập/xuất kho | Cảnh báo nguyên liệu dưới mức tối thiểu |

```typescript
// deduct-stock.worker.ts
export const deductStockWorker = new Worker('kitchen', async (job) => {
  const { orderId, items } = job.data;
  
  for (const item of items) {
    const recipes = await prisma.recipes.findMany({
      where: { menuItemId: item.menuItemId },
    });
    
    for (const recipe of recipes) {
      const deductQty = recipe.quantity * item.quantity;
      await prisma.$transaction([
        prisma.ingredients.update({
          where: { id: recipe.ingredientId },
          data: { stockQty: { decrement: deductQty } },
        }),
        prisma.ingredientTransactions.create({
          data: {
            ingredientId: recipe.ingredientId,
            type: 'out',
            quantity: deductQty,
            note: `Auto deduct for order ${orderId}`,
          },
        }),
      ]);
    }
  }
}, { connection: redisConnection, concurrency: 5 });
```

---

## 7. Thiết Kế Frontend

### 7.1 Cấu Trúc App Router (Next.js 15)

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout (providers)
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Trang đăng nhập
│   │
│   ├── (pos)/                    # POS Layout (sidebar nav)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Tổng quan doanh thu hôm nay
│   │   ├── tables/
│   │   │   ├── page.tsx          # Sơ đồ bàn
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Chi tiết bàn + order
│   │   ├── orders/
│   │   │   ├── page.tsx          # Danh sách orders
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Chi tiết order
│   │   ├── menu/
│   │   │   ├── page.tsx          # Quản lý thực đơn
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Chỉnh sửa món
│   │   ├── checkout/
│   │   │   └── [orderId]/
│   │   │       └── page.tsx      # Màn hình thanh toán
│   │   ├── kitchen/
│   │   │   └── page.tsx          # Kitchen Display System
│   │   ├── customers/
│   │   │   └── page.tsx          # Quản lý khách hàng
│   │   ├── inventory/
│   │   │   └── page.tsx          # Quản lý kho
│   │   ├── reservations/
│   │   │   └── page.tsx          # Đặt bàn
│   │   └── reports/
│   │       └── page.tsx          # Báo cáo
│   │
│   └── api/                      # Next.js API routes (BFF layer)
│       └── proxy/[...path]/
│           └── route.ts
│
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AppShell.tsx
│   ├── tables/
│   │   ├── TableGrid.tsx         # Sơ đồ bàn dạng grid
│   │   ├── TableCard.tsx         # Card bàn với trạng thái
│   │   └── ZoneFilter.tsx        # Filter theo khu vực
│   ├── orders/
│   │   ├── OrderBuilder.tsx      # Giao diện tạo order
│   │   ├── MenuPanel.tsx         # Panel chọn món
│   │   ├── CartPanel.tsx         # Giỏ hàng bên phải
│   │   ├── MenuItem.tsx          # Card món ăn
│   │   └── ModifierModal.tsx     # Modal chọn toppings
│   ├── checkout/
│   │   ├── InvoiceSummary.tsx    # Tóm tắt hóa đơn
│   │   ├── PaymentMethods.tsx    # Chọn phương thức
│   │   ├── QRPaymentModal.tsx    # Hiển thị QR chờ thanh toán
│   │   └── VoucherInput.tsx      # Nhập mã giảm giá
│   ├── kitchen/
│   │   ├── KDSBoard.tsx          # Bảng KDS
│   │   ├── KDSTicket.tsx         # Ticket từng order
│   │   └── ItemStatusButton.tsx  # Nút cập nhật trạng thái món
│   └── common/
│       ├── StatusBadge.tsx
│       ├── LoadingSkeleton.tsx
│       └── ConfirmDialog.tsx
│
├── stores/                       # 🐻 Zustand Stores
│   ├── auth.store.ts             # Token, user info
│   ├── cart.store.ts             # Giỏ hàng đang build
│   ├── table.store.ts            # Trạng thái bàn realtime
│   └── notification.store.ts    # Toast notifications
│
├── hooks/                        # Custom hooks
│   ├── useSocket.ts              # Socket.IO connection
│   ├── useKitchenQueue.ts        # Realtime KDS
│   └── usePaymentStatus.ts      # Polling payment status
│
├── lib/
│   ├── api.ts                    # Axios instance + interceptors
│   └── query-client.ts           # TanStack Query config
│
└── types/
    └── api.types.ts              # TypeScript types từ API
```

### 7.2 Phân Cấp Component

```
AppShell
├── Sidebar
│   ├── NavItem (Dashboard)
│   ├── NavItem (Tables)
│   ├── NavItem (Orders)
│   └── ...
│
├── Header
│   ├── BreadCrumb
│   └── UserMenu
│
└── [Page Content]
    │
    ├── tables/page.tsx
    │   ├── ZoneFilter
    │   └── TableGrid
    │       └── TableCard (×N)
    │           └── [Click] → OrderBuilder
    │
    ├── orders/[id]/page.tsx
    │   ├── MenuPanel
    │   │   ├── CategoryTabs
    │   │   └── MenuItem (×N)
    │   │       └── [Click] → ModifierModal
    │   └── CartPanel
    │       ├── CartItem (×N)
    │       ├── VoucherInput
    │       └── SendToKitchenButton
    │
    ├── checkout/[orderId]/page.tsx
    │   ├── InvoiceSummary
    │   ├── PaymentMethods
    │   │   ├── CashInput
    │   │   └── QRPaymentModal
    │   │       └── [Socket] → auto close on payment
    │   └── PrintReceiptButton
    │
    └── kitchen/page.tsx
        └── KDSBoard
            └── KDSTicket (×N)
                └── ItemStatusButton (×N)
```

### 7.3 State Management

#### Zustand Store (Client State)

```typescript
// cart.store.ts — Zustand
interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null;
  
  addItem: (item: MenuItem, variant?: Variant, modifiers?: Modifier[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  setTable: (tableId: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      orderId: null,
      
      addItem: (item, variant, modifiers) => set(state => ({
        items: [...state.items, {
          id: crypto.randomUUID(),
          menuItem: item,
          variant,
          modifiers: modifiers ?? [],
          quantity: 1,
          unitPrice: item.basePrice + (variant?.priceDelta ?? 0),
        }],
      })),
      // ...
    }),
    { name: 'pos-cart' }
  )
);
```

#### TanStack Query (Server State)

```typescript
// hooks/useOrders.ts
export const useOrders = (params: OrderFilterParams) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.get('/orders', { params }),
    staleTime: 30_000,        // 30s — data tươi
    refetchInterval: 60_000,  // refetch mỗi 60s
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => api.post('/orders', dto),
    onSuccess: (data) => {
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Update cart store
      useCartStore.getState().setOrderId(data.id);
    },
  });
};
```

#### Socket.IO Integration

```typescript
// hooks/useSocket.ts
export const useSocket = (namespace: string) => {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL}${namespace}`, {
      auth: { token },
      transports: ['websocket'],
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [namespace, token]);

  return socketRef.current;
};

// Trong KDSBoard.tsx
const socket = useSocket('/kitchen');

useEffect(() => {
  if (!socket) return;

  socket.on('kitchen:new-order', (data: KitchenTicket) => {
    // Thêm ticket mới vào đầu danh sách
    setTickets(prev => [data, ...prev]);
    // Phát âm thanh thông báo
    playNotificationSound();
  });

  socket.on('kitchen:item-updated', (data) => {
    setTickets(prev => prev.map(t => 
      t.orderId === data.orderId ? { ...t, items: updateItems(t.items, data) } : t
    ));
  });
}, [socket]);
```

---

## 8. Luồng Xử Lý Realtime (Socket.IO + BullMQ)

### 8.1 Sơ Đồ Event Flow

```
 POS Terminal          Socket.IO Server         Kitchen Display
      │                      │                       │
      │──send-to-kitchen────▶│                       │
      │                      │── emit: new-order ───▶│
      │                      │                       │── 🔔 Thông báo âm thanh
      │                      │                       │── Hiện ticket
      │                      │                       │
      │                      │   [Bếp bắt đầu nấu]  │
      │                      │                       │
      │                      │◀── item:start-cooking─│
      │                      │                       │
      │◀─ order:item-updated─│                       │
      │  (status: preparing) │                       │
      │                      │                       │
      │                      │   [Bếp nấu xong]      │
      │                      │◀── item:ready ────────│
      │                      │                       │
      │◀─ order:item-ready───│                       │
      │  (status: ready)     │                       │
      │── 🔔 Nhắc phục vụ mang món                   │
```

### 8.2 BullMQ Queue Architecture

```
                    ┌─────────────────┐
                    │   Redis 7       │
                    │   (Bull Store)  │
                    └───────┬─────────┘
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
   │kitchen queue│  │payment queue │  │  crm queue   │
   │             │  │              │  │              │
   │ deduct-stock│  │print-receipt │  │loyalty-points│
   │ (concur: 5) │  │(concur: 2)   │  │(concur: 3)   │
   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
          │                │                  │
          ▼                ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
   │Worker: trừ  │  │Worker: in    │  │Worker: cộng  │
   │tồn kho      │  │hóa đơn       │  │điểm tích lũy │
   │nguyên liệu  │  │nhiệt         │  │khách hàng    │
   └─────────────┘  └──────────────┘  └──────────────┘
```

---

## 9. Hạ Tầng DevOps

### 9.1 Docker Compose Services

```yaml
# docker-compose.yml (tóm tắt)
services:
  nginx:          # Reverse proxy, port 80/443
  backend:        # Node.js API, port 3000 (internal)
  frontend:       # Next.js, port 3001 (internal)
  postgres:       # PostgreSQL 16, port 5432 (internal)
  redis:          # Redis 7, port 6379 (internal)
  
  # Môi trường dev thêm:
  pgadmin:        # DB management UI, port 5050
  redis-commander:# Redis UI, port 8081
```

### 9.2 CI/CD Pipeline (GitHub Actions)

```
Push to main branch
        │
        ▼
┌──────────────────────────────────────┐
│  Job 1: CI (lint + test + build)     │
│  ├── npm run lint (ESLint + Prettier)│
│  ├── npm run type-check (tsc)        │
│  ├── npm run test (Vitest)           │
│  └── docker build (validate)        │
└──────────────────┬───────────────────┘
                   │ success
                   ▼
┌──────────────────────────────────────┐
│  Job 2: CD (deploy to server)        │
│  ├── Build Docker images             │
│  ├── Push to GitHub Container Registry│
│  ├── SSH to server                   │
│  ├── docker compose pull             │
│  └── docker compose up -d            │
└──────────────────────────────────────┘
```

### 9.3 Nginx Config (Tóm Tắt)

```nginx
upstream backend  { server backend:3000; }
upstream frontend { server frontend:3001; }

server {
    listen 443 ssl;
    
    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend;
    }
}
```

---

## 10. Lý Do Chọn Công Nghệ

### 10.1 Bảng So Sánh Lựa Chọn Công Nghệ

| Thành phần | Lựa chọn | Thay thế đã xem xét | Lý do chọn |
|---|---|---|---|
| **Runtime** | Node.js 22 | Bun, Deno | LTS ổn định, ecosystem lớn nhất, native ESM, built-in fetch |
| **Framework** | Express 5 | Fastify, Hono, Elysia | Express 5 có async error handling native, middleware ecosystem rộng |
| **Language** | TypeScript | JavaScript | Type safety, IDE support tốt, giảm runtime errors |
| **ORM** | Prisma 6 | Drizzle, TypeORM, Knex | Type-safe queries, migration tự động, schema-first design |
| **Database** | PostgreSQL 16 | MySQL, SQLite | ACID transactions, JSONB, full-text search, row-level locking |
| **Cache/Queue** | Redis 7 | Memcached, RabbitMQ | Đa năng: cache + pub/sub + queue (BullMQ), persistence |
| **Job Queue** | BullMQ | Bull, Agenda, Bee-Queue | TypeScript-first, built on Redis, robust retry + delay |
| **WebSocket** | Socket.IO | ws, uWebSockets | Namespace, room, auto-reconnect, fallback |
| **Frontend** | Next.js 15 | Remix, Astro, SPA | App Router SSR/SSG/ISR, Server Components, routing |
| **UI Library** | shadcn/ui | MUI, Ant Design | Headless + Radix UI, copy-paste, full control, accessible |
| **CSS** | Tailwind v4 | CSS Modules, styled-components | Utility-first, v4 performance, Vite integration |
| **State** | Zustand + TanStack Query | Redux, Jotai, SWR | Lightweight, Zustand cho UI state; TQ cho server state cache |
| **Infra** | Docker Compose | K8s, bare metal | Phù hợp quy mô nhà hàng nhỏ/vừa, dễ deploy, portable |
| **Proxy** | Nginx | Traefik, Caddy | Hiệu suất cao, SSL termination, cấu hình ổn định |
| **CI/CD** | GitHub Actions | Jenkins, GitLab CI | Tích hợp trực tiếp với repo, miễn phí cho public |

### 10.2 Lý Do Kiến Trúc Phân Lớp

Kiến trúc **Layered (N-tier)** được chọn vì:

1. **📦 Tách biệt trách nhiệm (SoC)**: Mỗi lớp chỉ biết lớp kế tiếp, dễ thay thế implementation.
2. **🧪 Testability**: Service layer có thể unit test độc lập bằng cách mock repository.
3. **🔧 Maintainability**: Khi thay PostgreSQL sang MongoDB, chỉ cần viết lại Repository, không ảnh hưởng Service/Controller.
4. **👥 Team collaboration**: Phân công frontend/backend/database song song dễ dàng hơn.
5. **📈 Scalability**: Có thể tách Service layer thành microservices khi cần scale theo từng domain (Kitchen, Payment, Inventory).

### 10.3 Lý Do Chọn Realtime Stack

- **Socket.IO** với namespace `/kitchen` và `/pos` cho phép bếp và thu ngân nhận events riêng biệt, giảm noise.
- **BullMQ** đảm bảo các tác vụ như trừ kho, in hóa đơn **không bị mất** khi server restart, có retry tự động.
- **Redis** vừa làm backing store cho BullMQ, vừa làm cache cho các queries như `menu items` (stale-time: 5 phút).

---

## 📎 Phụ Lục

### A. Danh Sách Bảng Cơ Sở Dữ Liệu

| STT | Tên bảng | Số trường | Mô tả chức năng |
|---|---|---|---|
| 1 | `users` | 9 | Quản lý tài khoản nhân viên |
| 2 | `work_shifts` | 8 | Ca làm việc của nhân viên |
| 3 | `zones` | 5 | Khu vực trong nhà hàng |
| 4 | `tables` | 7 | Bàn ăn theo khu vực |
| 5 | `menu_categories` | 5 | Danh mục thực đơn |
| 6 | `menu_items` | 10 | Món ăn trong thực đơn |
| 7 | `menu_item_variants` | 6 | Biến thể món (size/loại) |
| 8 | `menu_modifiers` | 6 | Topping/option có thêm giá |
| 9 | `recipes` | 5 | Công thức nguyên liệu |
| 10 | `ingredients` | 8 | Kho nguyên liệu |
| 11 | `ingredient_transactions` | 7 | Lịch sử nhập/xuất kho |
| 12 | `combos` | 7 | Combo ưu đãi |
| 13 | `combo_items` | 5 | Thành phần trong combo |
| 14 | `customers` | 8 | Khách hàng thân thiết |
| 15 | `vouchers` | 11 | Mã giảm giá |
| 16 | `reservations` | 9 | Đặt bàn trước |
| 17 | `orders` | 13 | Đơn hàng chính |
| 18 | `order_items` | 10 | Dòng món trong đơn |
| 19 | `order_item_modifiers` | 4 | Modifier đã chọn |
| 20 | `invoices` | 11 | Hóa đơn thanh toán |
| 21 | `invoice_payments` | 7 | Lần thanh toán |
| 22 | `payment_transactions` | 8 | Giao dịch payment gateway |
| 23 | `store_config` | 5 | Cấu hình nhà hàng |

### B. Sơ Đồ Use Case Chính

```
┌──────────────────────────────────────────────────────────────────┐
│                      RESTOPOS SYSTEM                             │
│                                                                  │
│  ┌──────────┐  ── Đăng nhập ──────────────────────────────────  │
│  │          │  ── Xem sơ đồ bàn ──────────────────────────────  │
│  │  Phục vụ │  ── Tạo đơn hàng / Thêm món ──────────────────── │
│  │ (Waiter) │  ── Gửi order lên bếp ────────────────────────── │
│  │          │  ── Nhận thông báo món sẵn sàng ───────────────── │
│  └──────────┘  ── Xử lý đặt bàn ──────────────────────────────  │
│                                                                  │
│  ┌──────────┐  ── Xem hàng đợi bếp (KDS) ────────────────────  │
│  │  Đầu bếp │  ── Cập nhật trạng thái món ───────────────────  │
│  │ (Kitchen)│  ── Đánh dấu món đã hoàn thành ────────────────  │
│  └──────────┘                                                    │
│                                                                  │
│  ┌──────────┐  ── Chọn order cần thanh toán ──────────────────  │
│  │ Thu ngân │  ── Áp dụng voucher / giảm giá ────────────────  │
│  │(Cashier) │  ── Chọn phương thức thanh toán ───────────────  │
│  │          │  ── Tạo & hiển thị QR code ────────────────────  │
│  └──────────┘  ── In hóa đơn ──────────────────────────────── │
│                                                                  │
│  ┌──────────┐  ── Quản lý thực đơn ──────────────────────────  │
│  │ Quản lý  │  ── Quản lý nhân viên / ca làm ─────────────── │
│  │(Manager) │  ── Xem báo cáo doanh thu ────────────────────  │
│  │          │  ── Quản lý kho nguyên liệu ──────────────────  │
│  └──────────┘  ── Cấu hình nhà hàng ──────────────────────── │
└──────────────────────────────────────────────────────────────────┘
```

### C. Activity Diagram — Luồng Tạo & Thanh Toán Order

```
[Bắt đầu]
    │
    ▼
[Phục vụ chọn bàn]
    │
    ▼
[Thêm món vào giỏ] ◀─────────┐
    │                         │
    ▼                         │
[Chọn biến thể & toppings]   │
    │                         │
    ▼                    [Thêm món khác?]
[Tính giá món]                │ Có
    │                         │
    └─────────────────────────┘
    │ Không
    ▼
[Xác nhận & Tạo Order]
    │
    ▼
[Gửi lên bếp] ─────────────────────▶ [Bếp nhận ticket]
    │                                        │
    ▼                                        ▼
[Phục vụ chờ]                      [Bếp bắt đầu nấu]
    │                                        │
    │                                        ▼
    │◀──────── [Món đã sẵn sàng] ───[Bếp đánh dấu xong]
    │
    ▼
[Phục vụ mang món ra bàn]
    │
    ▼
[Khách yêu cầu thanh toán]
    │
    ▼
[Thu ngân chọn order → Tạo hóa đơn]
    │
    ▼
[Áp voucher?] ── Có ──▶ [Validate voucher] ──▶ [Tính lại tổng]
    │ Không                                           │
    └─────────────────────────────────────────────────┘
    │
    ▼
[Chọn phương thức thanh toán]
    │
    ├── Tiền mặt ──▶ [Nhập số tiền nhận] ──▶ [Tính tiền thừa]
    │
    └── QR ────────▶ [Tạo QR Code]
                         │
                         ▼
                    [Khách quét QR]
                         │
                         ▼
                    [Webhook nhận kết quả]
                         │
                         ▼
                    [Xác nhận thanh toán]
    │
    ▼
[Cập nhật trạng thái invoice = paid]
    │
    ▼
[Giải phóng bàn] + [Cộng điểm KH] + [In hóa đơn]
    │
    ▼
[Kết thúc]
```

---

*Tài liệu này là một phần của bộ tài liệu đồ án RestoPOS - CT07.*  
*Xem thêm: `01-tong-quan-du-an.md` | `03-ke-hoach-phat-trien.md`*

