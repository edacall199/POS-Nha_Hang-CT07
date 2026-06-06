# 🗄️ Tiêu Chí 5: Cơ Sở Dữ Liệu, Validation & Bảo Mật

> **Điểm tối đa:** 1.0 điểm  
> **Hệ thống:** RestoPOS – Phần mềm quản lý nhà hàng  
> **Database:** PostgreSQL 16 + Prisma ORM  
> **Bảo mật:** JWT, bcrypt, RBAC, Rate Limiting

---

## 1. 📐 Schema Database Đầy Đủ

### 1.1 Danh sách các bảng

| STT | Tên bảng | Mô tả | Số cột |
|-----|----------|-------|--------|
| 1 | `users` | Người dùng hệ thống (nhân viên, quản lý) | 12 |
| 2 | `roles` | Vai trò trong hệ thống | 4 |
| 3 | `zones` | Khu vực trong nhà hàng | 5 |
| 4 | `tables` | Bàn ăn | 7 |
| 5 | `categories` | Danh mục món ăn | 5 |
| 6 | `menu_items` | Món ăn trong thực đơn | 12 |
| 7 | `ingredients` | Nguyên liệu | 8 |
| 8 | `recipes` | Công thức nấu ăn (MenuItem ↔ Ingredient) | 6 |
| 9 | `work_shifts` | Ca làm việc | 9 |
| 10 | `orders` | Đơn hàng | 14 |
| 11 | `order_items` | Chi tiết đơn hàng | 8 |
| 12 | `payments` | Thanh toán | 10 |
| 13 | `reservations` | Đặt bàn | 10 |
| 14 | `inventory_logs` | Nhật ký xuất/nhập kho | 7 |
| 15 | `refresh_tokens` | Token làm mới JWT | 6 |

---

### 1.2 Chi Tiết Từng Bảng

#### 🧑‍💼 Bảng `users`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK, DEFAULT gen_random_uuid()` | Định danh duy nhất |
| `email` | `VARCHAR(255)` | `UNIQUE, NOT NULL` | Email đăng nhập |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Mật khẩu đã hash bcrypt |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Họ và tên |
| `phone` | `VARCHAR(20)` | `UNIQUE` | Số điện thoại |
| `role_id` | `UUID` | `FK → roles.id, NOT NULL` | Vai trò |
| `avatar_url` | `TEXT` | `NULL` | Ảnh đại diện |
| `is_active` | `BOOLEAN` | `DEFAULT true` | Trạng thái hoạt động |
| `last_login_at` | `TIMESTAMPTZ` | `NULL` | Lần đăng nhập cuối |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày tạo |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày cập nhật |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft delete |

#### 👥 Bảng `roles`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `name` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Tên vai trò (ADMIN, MANAGER, CASHIER, WAITER, KITCHEN) |
| `description` | `TEXT` | `NULL` | Mô tả vai trò |
| `permissions` | `JSONB` | `NOT NULL, DEFAULT '[]'` | Danh sách quyền |

#### 🏢 Bảng `zones`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `name` | `VARCHAR(100)` | `NOT NULL` | Tên khu vực (VIP, Sân thượng, Tầng 1...) |
| `description` | `TEXT` | `NULL` | Mô tả |
| `is_active` | `BOOLEAN` | `DEFAULT true` | Đang hoạt động |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày tạo |

#### 🪑 Bảng `tables`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `table_number` | `VARCHAR(20)` | `UNIQUE, NOT NULL` | Số bàn (A01, B02...) |
| `zone_id` | `UUID` | `FK → zones.id, NOT NULL` | Khu vực |
| `capacity` | `INTEGER` | `NOT NULL, CHECK > 0` | Sức chứa tối đa |
| `status` | `VARCHAR(20)` | `DEFAULT 'available'` | available / occupied / reserved / cleaning |
| `qr_code_url` | `TEXT` | `NULL` | URL mã QR bàn |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày tạo |

#### 🍽️ Bảng `categories`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `name` | `VARCHAR(100)` | `NOT NULL` | Tên danh mục |
| `icon` | `VARCHAR(50)` | `NULL` | Icon emoji |
| `sort_order` | `INTEGER` | `DEFAULT 0` | Thứ tự hiển thị |
| `is_active` | `BOOLEAN` | `DEFAULT true` | Đang hiển thị |

#### 🥩 Bảng `menu_items`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `category_id` | `UUID` | `FK → categories.id` | Danh mục |
| `name` | `VARCHAR(200)` | `NOT NULL` | Tên món |
| `description` | `TEXT` | `NULL` | Mô tả món |
| `price` | `DECIMAL(12,2)` | `NOT NULL, CHECK >= 0` | Giá bán |
| `cost_price` | `DECIMAL(12,2)` | `NULL` | Giá vốn |
| `image_url` | `TEXT` | `NULL` | Ảnh món |
| `is_available` | `BOOLEAN` | `DEFAULT true` | Còn phục vụ |
| `is_featured` | `BOOLEAN` | `DEFAULT false` | Món nổi bật |
| `prep_time_minutes` | `INTEGER` | `DEFAULT 15` | Thời gian chuẩn bị (phút) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày tạo |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft delete |

#### 🧄 Bảng `ingredients`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `name` | `VARCHAR(150)` | `NOT NULL` | Tên nguyên liệu |
| `unit` | `VARCHAR(30)` | `NOT NULL` | Đơn vị (kg, g, lít, cái) |
| `stock_quantity` | `DECIMAL(10,3)` | `DEFAULT 0` | Số lượng tồn kho |
| `min_quantity` | `DECIMAL(10,3)` | `DEFAULT 0` | Ngưỡng cảnh báo tối thiểu |
| `cost_per_unit` | `DECIMAL(12,2)` | `NOT NULL` | Giá nhập / đơn vị |
| `supplier` | `VARCHAR(200)` | `NULL` | Nhà cung cấp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Cập nhật lần cuối |

#### 📋 Bảng `recipes`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `menu_item_id` | `UUID` | `FK → menu_items.id` | Món ăn |
| `ingredient_id` | `UUID` | `FK → ingredients.id` | Nguyên liệu |
| `quantity` | `DECIMAL(10,3)` | `NOT NULL` | Số lượng cần dùng |
| `unit` | `VARCHAR(30)` | `NOT NULL` | Đơn vị |
| `note` | `TEXT` | `NULL` | Ghi chú |

> **Composite PK:** `(menu_item_id, ingredient_id)`

#### ⏰ Bảng `work_shifts`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `user_id` | `UUID` | `FK → users.id` | Nhân viên |
| `shift_date` | `DATE` | `NOT NULL` | Ngày làm |
| `start_time` | `TIMESTAMPTZ` | `NOT NULL` | Giờ bắt đầu ca |
| `end_time` | `TIMESTAMPTZ` | `NULL` | Giờ kết thúc ca |
| `opening_cash` | `DECIMAL(12,2)` | `DEFAULT 0` | Tiền mặt đầu ca |
| `closing_cash` | `DECIMAL(12,2)` | `NULL` | Tiền mặt cuối ca |
| `status` | `VARCHAR(20)` | `DEFAULT 'open'` | open / closed |
| `notes` | `TEXT` | `NULL` | Ghi chú ca |

#### 🧾 Bảng `orders`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `order_code` | `VARCHAR(20)` | `UNIQUE, NOT NULL` | Mã đơn (#ORD-20240601-001) |
| `table_id` | `UUID` | `FK → tables.id, NULL` | Bàn (null nếu mang về) |
| `user_id` | `UUID` | `FK → users.id` | Nhân viên tạo đơn |
| `shift_id` | `UUID` | `FK → work_shifts.id` | Ca làm việc |
| `order_type` | `VARCHAR(20)` | `DEFAULT 'dine_in'` | dine_in / takeaway / delivery |
| `status` | `VARCHAR(30)` | `DEFAULT 'pending'` | pending / confirmed / preparing / ready / served / paid / cancelled |
| `subtotal` | `DECIMAL(12,2)` | `DEFAULT 0` | Tổng trước giảm giá |
| `discount_amount` | `DECIMAL(12,2)` | `DEFAULT 0` | Số tiền giảm |
| `tax_amount` | `DECIMAL(12,2)` | `DEFAULT 0` | Thuế VAT |
| `total_amount` | `DECIMAL(12,2)` | `DEFAULT 0` | Tổng thanh toán |
| `notes` | `TEXT` | `NULL` | Ghi chú đơn |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo |
| `paid_at` | `TIMESTAMPTZ` | `NULL` | Thời gian thanh toán |

#### 🍱 Bảng `order_items`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `order_id` | `UUID` | `FK → orders.id, CASCADE DELETE` | Đơn hàng |
| `menu_item_id` | `UUID` | `FK → menu_items.id` | Món ăn |
| `quantity` | `INTEGER` | `NOT NULL, CHECK > 0` | Số lượng |
| `unit_price` | `DECIMAL(12,2)` | `NOT NULL` | Giá tại thời điểm order |
| `subtotal` | `DECIMAL(12,2)` | `NOT NULL` | Thành tiền |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | pending / preparing / done / cancelled |
| `notes` | `TEXT` | `NULL` | Ghi chú món (ít cay, không hành...) |

#### 💰 Bảng `payments`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `order_id` | `UUID` | `FK → orders.id, UNIQUE` | Đơn hàng |
| `method` | `VARCHAR(30)` | `NOT NULL` | cash / momo / vnpay / vietqr / card |
| `amount` | `DECIMAL(12,2)` | `NOT NULL` | Số tiền thanh toán |
| `received_amount` | `DECIMAL(12,2)` | `NULL` | Tiền nhận (tiền mặt) |
| `change_amount` | `DECIMAL(12,2)` | `NULL` | Tiền thừa |
| `transaction_id` | `VARCHAR(100)` | `NULL` | Mã giao dịch bên thứ 3 |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | pending / paid / failed / refunded |
| `paid_at` | `TIMESTAMPTZ` | `NULL` | Thời gian thanh toán |
| `metadata` | `JSONB` | `NULL` | Dữ liệu phụ (webhook payload) |

#### 📅 Bảng `reservations`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `table_id` | `UUID` | `FK → tables.id` | Bàn đặt |
| `customer_name` | `VARCHAR(100)` | `NOT NULL` | Tên khách |
| `customer_phone` | `VARCHAR(20)` | `NOT NULL` | Số điện thoại |
| `party_size` | `INTEGER` | `NOT NULL` | Số người |
| `reserved_at` | `TIMESTAMPTZ` | `NOT NULL` | Thời gian đặt bàn |
| `notes` | `TEXT` | `NULL` | Yêu cầu đặc biệt |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | pending / confirmed / arrived / cancelled / no_show |
| `telegram_chat_id` | `VARCHAR(50)` | `NULL` | Chat ID Telegram để nhắc |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày tạo |

#### 📦 Bảng `inventory_logs`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `ingredient_id` | `UUID` | `FK → ingredients.id` | Nguyên liệu |
| `change_quantity` | `DECIMAL(10,3)` | `NOT NULL` | Số lượng thay đổi (+ nhập, - xuất) |
| `reason` | `VARCHAR(100)` | `NOT NULL` | Lý do (order_consumed, stock_in, adjustment) |
| `reference_id` | `UUID` | `NULL` | ID tham chiếu (order_id...) |
| `user_id` | `UUID` | `FK → users.id` | Người thực hiện |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian |

#### 🔑 Bảng `refresh_tokens`

| Cột | Kiểu dữ liệu | Constraint | Mô tả |
|-----|-------------|------------|-------|
| `id` | `UUID` | `PK` | Định danh |
| `user_id` | `UUID` | `FK → users.id, CASCADE DELETE` | Người dùng |
| `token_hash` | `VARCHAR(255)` | `UNIQUE, NOT NULL` | Hash của refresh token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Hạn hết hạn |
| `is_revoked` | `BOOLEAN` | `DEFAULT false` | Đã thu hồi |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Ngày cấp |

---

## 2. 🔗 ERD – Entity Relationship Diagram

### 2.1 Sơ đồ quan hệ (dạng text)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RESTOPOS DATABASE ERD                          │
└─────────────────────────────────────────────────────────────────────┘

  roles ──────────── users ─────────────── work_shifts
    1                 1│N                       1│N
    │                  │                          │
    │           refresh_tokens              orders ──── payments
    │                                        1│N         1:1
    │                                          │
    │                                     order_items
    │                                          │N
    │                                          │
  zones ──── tables ──────────── orders    menu_items ──── categories
    1│N        1│N                              │
                │                              │1
             reservations                   recipes
                                              │N
                                              │
                                         ingredients ── inventory_logs
```

### 2.2 Các mối quan hệ chính

| Quan hệ | Loại | Mô tả |
|---------|------|-------|
| `roles` → `users` | **1:N** | Một role có nhiều users |
| `users` → `work_shifts` | **1:N** | Một nhân viên có nhiều ca làm |
| `work_shifts` → `orders` | **1:N** | Một ca có nhiều đơn hàng |
| `orders` → `order_items` | **1:N** | Một đơn có nhiều món |
| `orders` → `payments` | **1:1** | Một đơn có một thanh toán |
| `menu_items` → `order_items` | **1:N** | Một món xuất hiện nhiều lần |
| `menu_items` → `recipes` | **1:N** | Một món có nhiều nguyên liệu |
| `ingredients` → `recipes` | **1:N** | Một nguyên liệu dùng cho nhiều món |
| `zones` → `tables` | **1:N** | Một khu vực có nhiều bàn |
| `tables` → `orders` | **1:N** | Một bàn có nhiều đơn theo thời gian |
| `tables` → `reservations` | **1:N** | Một bàn có nhiều lượt đặt |
| `categories` → `menu_items` | **1:N** | Một danh mục có nhiều món |
| `users` → `refresh_tokens` | **1:N** | Một user có nhiều token (đa thiết bị) |

---

## 3. ✅ Chuẩn Hóa Dữ Liệu (Database Normalization)

### 3.1 1NF – First Normal Form

> **Quy tắc:** Mỗi cột chứa giá trị nguyên tử (atomic), không có nhóm lặp.

**✅ Đạt 1NF vì:**
- Tất cả các cột đều chứa giá trị đơn (không có mảng trong cột quan hệ)
- Mỗi bảng có khóa chính (PK) duy nhất
- Không có nhóm lặp (repeating groups)

**Ví dụ vi phạm 1NF (❌ Sai) vs đúng (✅ Đúng):**

```
❌ Sai: order_items = "Bún bò, Phở, Cơm tấm" (nhiều giá trị trong 1 cột)

✅ Đúng: Bảng riêng order_items với từng dòng là 1 món:
  order_id | menu_item_id | quantity
  ord-001  | item-bun-bo  | 2
  ord-001  | item-pho     | 1
```

### 3.2 2NF – Second Normal Form

> **Quy tắc:** Đạt 1NF + mọi cột non-key phụ thuộc hoàn toàn vào toàn bộ khóa chính.

**✅ Đạt 2NF vì:**
- Bảng `recipes` có composite key `(menu_item_id, ingredient_id)` và cột `quantity` phụ thuộc vào cả 2 khóa
- Không có phụ thuộc hàm bộ phận (partial dependency)

**Ví dụ:**
```
recipes(menu_item_id, ingredient_id, quantity, unit)
  ✅ quantity phụ thuộc vào (menu_item_id, ingredient_id)
  ✅ unit phụ thuộc vào (menu_item_id, ingredient_id)
```

### 3.3 3NF – Third Normal Form

> **Quy tắc:** Đạt 2NF + không có phụ thuộc bắc cầu (transitive dependency).

**✅ Đạt 3NF vì:**

```
❌ Vi phạm 3NF (nếu để):
  orders(order_id, user_id, user_name, user_phone)
  → user_name phụ thuộc vào user_id (không phải order_id)

✅ Đúng (đã tách):
  orders(order_id, user_id, ...)
  users(user_id, full_name, phone, ...)
```

**Bảng kiểm tra 3NF:**

| Bảng | Phụ thuộc bắc cầu | Xử lý |
|------|--------------------|-------|
| `orders` | `user_name` phụ thuộc qua `user_id` | Tách sang bảng `users` ✅ |
| `order_items` | `item_name` phụ thuộc qua `menu_item_id` | Tách sang bảng `menu_items` ✅ |
| `tables` | `zone_name` phụ thuộc qua `zone_id` | Tách sang bảng `zones` ✅ |
| `work_shifts` | `user_name` phụ thuộc qua `user_id` | Tách sang bảng `users` ✅ |

---

## 4. 🛡️ Validation Với Zod

### 4.1 Cài đặt

```bash
npm install zod
```

### 4.2 Schema Validation Người Dùng

```typescript
// src/validators/user.validator.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .email('Email không hợp lệ')
    .toLowerCase()
    .max(255),

  password: z
    .string({ required_error: 'Mật khẩu là bắt buộc' })
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải có chữ hoa, chữ thường và số'
    ),

  full_name: z
    .string({ required_error: 'Họ tên là bắt buộc' })
    .min(2, 'Họ tên tối thiểu 2 ký tự')
    .max(100)
    .trim(),

  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại Việt Nam không hợp lệ')
    .optional(),

  role_id: z.string().uuid('Role ID phải là UUID hợp lệ'),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được trống'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
```

### 4.3 Schema Validation Đơn Hàng

```typescript
// src/validators/order.validator.ts
import { z } from 'zod';

const OrderItemSchema = z.object({
  menu_item_id: z.string().uuid('Menu item ID phải là UUID'),
  quantity: z
    .number({ required_error: 'Số lượng là bắt buộc' })
    .int('Số lượng phải là số nguyên')
    .positive('Số lượng phải lớn hơn 0')
    .max(99, 'Số lượng tối đa 99'),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  table_id: z.string().uuid().optional(),
  order_type: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
  items: z
    .array(OrderItemSchema)
    .min(1, 'Đơn hàng phải có ít nhất 1 món')
    .max(50, 'Tối đa 50 món trong một đơn'),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'
  ]),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
```

### 4.4 Schema Validation Thanh Toán

```typescript
// src/validators/payment.validator.ts
import { z } from 'zod';

export const createPaymentSchema = z.object({
  order_id: z.string().uuid('Order ID phải là UUID'),
  method: z.enum(['cash', 'momo', 'vnpay', 'vietqr', 'card']),
  received_amount: z
    .number()
    .positive()
    .optional()
    .refine(
      (val) => val === undefined || val >= 0,
      'Số tiền nhận phải >= 0'
    ),
}).superRefine((data, ctx) => {
  if (data.method === 'cash' && !data.received_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['received_amount'],
      message: 'Thanh toán tiền mặt phải nhập số tiền nhận',
    });
  }
});
```

### 4.5 Middleware Validate Request

```typescript
// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(422).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors,
      });
    }

    req.body = result.data; // Dữ liệu đã được transform
    next();
  };
};

// Sử dụng trong router:
// router.post('/users', validate(createUserSchema), userController.create);
```

---

## 5. 🔐 Bảo Mật Hệ Thống

### 5.1 JWT Access + Refresh Token

```typescript
// src/services/auth.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  email: string;
}

// Tạo Access Token (hết hạn sau 15 phút)
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'restopos-api',
    audience: 'restopos-client',
  });
};

// Tạo Refresh Token (hết hạn sau 7 ngày)
export const generateRefreshToken = (): { token: string; hash: string } => {
  const token = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

// Verify Access Token
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'restopos-api',
      audience: 'restopos-client',
    }) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error('TOKEN_INVALID');
  }
};
```

### 5.2 Bcrypt Password Hashing

```typescript
// src/utils/password.util.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Cân bằng bảo mật vs performance

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const verifyPassword = async (
  plainPassword: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hash);
};

// Ví dụ sử dụng:
// const hash = await hashPassword('MyPassword@123');
// const isValid = await verifyPassword('MyPassword@123', hash);
```

### 5.3 Authentication Middleware

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        roleId: string;
        roleName: string;
        email: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Không có token xác thực',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng làm mới',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
    });
  }
};
```

### 5.4 RBAC – Role-Based Access Control

```typescript
// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

// Định nghĩa các quyền theo role
export const ROLE_PERMISSIONS = {
  ADMIN: [
    'users:*', 'menu:*', 'orders:*', 'reports:*',
    'inventory:*', 'shifts:*', 'zones:*', 'tables:*',
  ],
  MANAGER: [
    'users:read', 'menu:*', 'orders:*', 'reports:read',
    'inventory:*', 'shifts:*', 'zones:read', 'tables:*',
  ],
  CASHIER: [
    'orders:read', 'orders:update', 'payments:*',
    'tables:read', 'reports:read',
  ],
  WAITER: [
    'orders:create', 'orders:read', 'orders:update',
    'tables:read', 'tables:update', 'menu:read',
  ],
  KITCHEN: [
    'orders:read', 'orders:update_status',
    'menu:read', 'inventory:read',
  ],
} as const;

type RoleName = keyof typeof ROLE_PERMISSIONS;

// Kiểm tra quyền
const hasPermission = (roleName: string, requiredPermission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[roleName as RoleName];
  if (!permissions) return false;

  return permissions.some((perm) => {
    if (perm.endsWith(':*')) {
      const resource = perm.split(':')[0];
      return requiredPermission.startsWith(resource + ':');
    }
    return perm === requiredPermission;
  });
};

// Middleware kiểm tra quyền
export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực',
      });
    }

    const { roleName } = req.user;

    const isAuthorized = requiredPermissions.every((permission) =>
      hasPermission(roleName, permission)
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện hành động này. Role hiện tại: ${roleName}`,
      });
    }

    next();
  };
};

// Sử dụng trong router:
// router.get('/reports', authenticate, authorize('reports:read'), reportController.get);
// router.delete('/users/:id', authenticate, authorize('users:*'), userController.delete);
```

### 5.5 Rate Limiting

```typescript
// src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';

// Rate limit cho API chung
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút',
  },
});

// Rate limit nghiêm ngặt cho đăng nhập (chống brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Tối đa 10 lần thử đăng nhập
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  },
});
```

### 5.6 CORS Configuration

```typescript
// src/config/cors.ts
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://restopos.yourdomain.com',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} không được phép truy cập`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
});
```

### 5.7 Bảo Mật Response – Không Lộ Sensitive Data

```typescript
// src/utils/sanitize.util.ts

// Loại bỏ các trường nhạy cảm trước khi trả về client
export const sanitizeUser = (user: any) => {
  const { password_hash, deleted_at, ...safeUser } = user;
  return safeUser;
};

// Ví dụ trong controller:
// const user = await userService.findById(id);
// return res.json({ success: true, data: sanitizeUser(user) });

// Sử dụng Prisma select để không query password_hash ngay từ đầu:
const userWithoutPassword = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    full_name: true,
    phone: true,
    avatar_url: true,
    is_active: true,
    role: {
      select: { id: true, name: true, permissions: true },
    },
    created_at: true,
    // ❌ KHÔNG select password_hash
  },
});
```

### 5.8 Helmet & Security Headers

```typescript
// src/app.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 năm
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
}));
```

### 5.9 Tổng Hợp Các Biện Pháp Bảo Mật

| Biện pháp | Công cụ | Mô tả |
|-----------|---------|-------|
| 🔐 Mã hóa mật khẩu | `bcrypt` (salt 12) | Không lưu plain text |
| 🎫 Xác thực | `JWT` (HS256) | Access 15m + Refresh 7d |
| 👮 Phân quyền | RBAC custom | 5 roles, permission-based |
| 🚦 Rate Limiting | `express-rate-limit` + Redis | 200 req/15min, 10 login/15min |
| 🌐 CORS | `cors` package | Whitelist domain cho phép |
| 🪖 Security Headers | `helmet` | CSP, HSTS, XSS protection |
| 🔏 HTTPS | Nginx SSL/TLS | Certbot Let's Encrypt |
| 🧹 Input Sanitize | `Zod` | Validate & transform input |
| 🙈 Data Masking | Prisma `select` | Không expose password_hash |
| 📦 SQL Injection | Prisma ORM | Parameterized queries tự động |

---

> 📌 **Lưu ý:** Tất cả các secret key (JWT_SECRET, DB_PASSWORD...) phải được lưu trong `.env` và KHÔNG commit lên Git. Sử dụng `.env.example` làm template.
