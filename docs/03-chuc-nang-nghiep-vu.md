# Tiêu chí 3 — Chức năng Hệ thống & Xử lý Nghiệp vụ POS

> **Điểm tối đa:** 2.0 | **Mục tiêu:** Xuất sắc (100%)

---

## Tổng quan kiến trúc module

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESTOPOS — MODULE MAP                           │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│  Auth/RBAC   │  Quản lý Bàn │    Order     │     KDS      │  Thanh toán │
│  (Module 1)  │  (Module 2)  │  (Module 3)  │  (Module 4)  │  (Module 5) │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│    Menu      │   Combo &    │  Nguyên liệu │  Đặt bàn     │   Loyalty   │
│  (Module 6)  │  KM (Mod 7)  │  (Module 8)  │  (Module 9)  │  (Mod 10)   │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────────┤
│                    Ca làm việc (Module 11)                               │
└─────────────────────────────────────────────────────────────────────────┘
                            ↕ Socket.IO (realtime)
                   PostgreSQL + Redis + BullMQ
```

---

## Module 1 — Xác thực & Phân quyền (Auth & RBAC)

### 1.1 Mô tả chức năng

Module xác thực chịu trách nhiệm:
- Xác minh danh tính người dùng qua **JWT (JSON Web Token)**
- Phân quyền truy cập tài nguyên theo mô hình **RBAC (Role-Based Access Control)**
- Quản lý vòng đời token: cấp phát, làm mới, thu hồi

**Các vai trò (Roles):**

| Role | Mô tả | Quyền hạn tiêu biểu |
|------|--------|----------------------|
| `OWNER` | Chủ nhà hàng | Toàn quyền hệ thống, xem mọi báo cáo |
| `MANAGER` | Quản lý ca | CRUD menu, nhập kho, xem báo cáo ca |
| `CASHIER` | Thu ngân | Tạo order, thanh toán, mở/đóng ca |
| `KITCHEN` | Bếp | Xem KDS, cập nhật trạng thái món |
| `WAITER` | Phục vụ | Gọi món, gửi bếp, xác nhận phục vụ |

### 1.2 Luồng xử lý (Flow)

```
┌──────────┐    POST /auth/login      ┌─────────────┐
│  Client  │ ──────────────────────► │  AuthService │
└──────────┘                          └──────┬──────┘
                                             │ 1. Tìm user theo username
                                             │ 2. So sánh bcrypt hash
                                             │ 3. Tạo Access Token (15 phút)
                                             │ 4. Tạo Refresh Token (7 ngày)
                                             │    → Lưu Refresh Token vào Redis
                                             ▼
                                      ┌─────────────┐
                                      │  Response   │
                                      │ accessToken │
                                      │ refreshToken│
                                      └─────────────┘

Request có bảo vệ:
┌──────────┐  Authorization: Bearer <token>  ┌──────────────────┐
│  Client  │ ──────────────────────────────► │  JwtAuthGuard    │
└──────────┘                                  └────────┬─────────┘
                                                       │ verify JWT
                                                       ▼
                                              ┌──────────────────┐
                                              │  RolesGuard      │
                                              │  @Roles(MANAGER) │
                                              └────────┬─────────┘
                                                       │ kiểm tra role
                                                       ▼
                                              ┌──────────────────┐
                                              │  Controller      │
                                              │  handler         │
                                              └──────────────────┘
```

### 1.3 Code minh họa logic quan trọng

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Sai mật khẩu');

    const payload = { sub: user.id, role: user.role, restaurantId: user.restaurantId };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { 
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // Lưu refresh token vào Redis với TTL 7 ngày
    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken, user: { id: user.id, role: user.role, name: user.name } };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET });
      const stored = await this.redis.get(`refresh_token:${payload.sub}`);
      if (stored !== token) throw new Error('Token đã bị thu hồi');

      const newAccess = this.jwt.sign(
        { sub: payload.sub, role: payload.role, restaurantId: payload.restaurantId },
        { expiresIn: '15m' },
      );
      return { accessToken: newAccess };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(userId: string) {
    await this.redis.del(`refresh_token:${userId}`);
  }
}

// auth/guards/roles.guard.ts — RBAC Middleware
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // route không yêu cầu role cụ thể

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

// Ví dụ sử dụng trong controller
@Get('reports')
@Roles(Role.OWNER, Role.MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
getReports() { ... }
```

### 1.4 Bảng trạng thái Token

| Trạng thái | Mô tả | Hành động |
|------------|-------|-----------|
| `VALID` | Token hợp lệ, chưa hết hạn | Cho phép truy cập |
| `EXPIRED` | Access token hết hạn (15 phút) | Dùng refresh token để lấy access mới |
| `REVOKED` | Đã logout, refresh bị xóa khỏi Redis | Yêu cầu đăng nhập lại |
| `INVALID` | Chữ ký sai hoặc bị giả mạo | Từ chối, ghi log bảo mật |

---

## Module 2 — Quản lý Bàn (Table Management)

### 2.1 Mô tả chức năng

- Hiển thị **sơ đồ bàn** tương tác theo khu vực (tầng 1, tầng 2, khu vực ngoài trời...)
- **Kéo thả** vị trí bàn bằng thư viện `dnd-kit`
- Xem trạng thái bàn **realtime** qua Socket.IO
- CRUD: thêm, sửa, xóa bàn; quản lý khu vực (area/zone)
- Merge bàn (gộp 2 bàn thành 1 order) / Split bàn

### 2.2 Luồng xử lý

```
Sơ đồ bàn:                  Cập nhật trạng thái (realtime):
┌─────────┐                  ┌───────────┐  order tạo    ┌──────────┐
│ Manager │──drag&drop──►   │  Server   │ ──────────► │  Redis   │
│ Sơ đồ   │  lưu vị trí X,Y │  (NestJS) │             │  Cache   │
└─────────┘                  └─────┬─────┘             └──────────┘
                                   │ emit socket event
                                   ▼
                            ┌─────────────────┐
                            │  Socket.IO Room  │
                            │  "restaurant:1"  │
                            └────────┬────────┘
                                     │ broadcast
                          ┌──────────┴──────────┐
                          ▼                     ▼
                   ┌──────────┐         ┌──────────────┐
                   │ Cashier  │         │  Waiter      │
                   │ (tablet) │         │  (tablet)    │
                   └──────────┘         └──────────────┘
```

### 2.3 Code minh họa

```typescript
// tables/tables.service.ts
@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private gateway: SocketGateway,
  ) {}

  /** Cập nhật trạng thái bàn và broadcast realtime */
  async updateStatus(tableId: string, status: TableStatus) {
    const table = await this.prisma.table.update({
      where: { id: tableId },
      data: { status, updatedAt: new Date() },
    });

    // Broadcast tới tất cả client trong restaurant room
    this.gateway.server
      .to(`restaurant:${table.restaurantId}`)
      .emit('table:status_changed', {
        tableId: table.id,
        tableCode: table.code,
        status: table.status,
        updatedAt: table.updatedAt,
      });

    return table;
  }

  /** Cập nhật vị trí bàn trên sơ đồ (kéo thả) */
  async updatePosition(tableId: string, x: number, y: number) {
    return this.prisma.table.update({
      where: { id: tableId },
      data: { posX: x, posY: y },
    });
  }

  /** Gộp 2 bàn vào chung 1 order */
  async mergeTables(primaryTableId: string, secondaryTableId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.table.update({ where: { id: secondaryTableId }, data: { mergedToId: primaryTableId } });
      await tx.order.update({ where: { id: orderId }, data: { tableId: primaryTableId } });
      // Cập nhật trạng thái cả 2 bàn
      await tx.table.updateMany({
        where: { id: { in: [primaryTableId, secondaryTableId] } },
        data: { status: 'OCCUPIED' },
      });
    });
  }
}

// gateway/socket.gateway.ts
@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join_restaurant')
  handleJoin(client: Socket, payload: { restaurantId: string }) {
    client.join(`restaurant:${payload.restaurantId}`);
    client.emit('joined', { room: `restaurant:${payload.restaurantId}` });
  }
}
```

### 2.4 Bảng trạng thái bàn (State Machine)

```
                ┌─────────────┐
           ┌───►│  AVAILABLE  │◄──────────────────┐
           │    └──────┬──────┘                   │
           │           │ order được tạo            │ thanh toán xong
           │           ▼                           │ & dọn bàn xong
           │    ┌─────────────┐             ┌──────┴──────┐
           │    │  OCCUPIED   │────────────►│  CLEANING   │
           │    └──────┬──────┘  bàn trống  └─────────────┘
           │           │
           │    ┌─────────────┐
           └────│  RESERVED   │ (đặt trước chưa đến)
                └─────────────┘
```

| Trạng thái | Màu sắc (UI) | Ý nghĩa |
|-----------|--------------|---------|
| `AVAILABLE` | 🟢 Xanh | Bàn trống, sẵn sàng nhận khách |
| `OCCUPIED` | 🔴 Đỏ | Đang có khách, có order active |
| `RESERVED` | 🟡 Vàng | Được đặt trước, chưa đến giờ |
| `CLEANING` | 🔵 Xanh dương | Khách vừa rời, đang dọn bàn |

### 2.5 Nghiệp vụ Chuyển bàn & Gộp bàn (Move & Merge Tables)

Trong thực tế nhà hàng, khách hàng thường xuyên có nhu cầu đổi chỗ hoặc nhóm bạn đến sau muốn ngồi chung bàn. Hệ thống hỗ trợ xử lý mượt mà các tình huống này:

**1. Chuyển bàn (Move Table):**
- **Trigger:** Khách từ Bàn A1 (OCCUPIED) muốn chuyển sang Bàn B2 (AVAILABLE).
- **Action:** Thu ngân/Phục vụ chọn "Chuyển bàn" → Chọn bàn đích B2.
- **System:**
  - Cập nhật `tableId` của Order từ A1 sang B2.
  - Cập nhật trạng thái Bàn A1 → `CLEANING` (để dọn dẹp) hoặc `AVAILABLE`.
  - Cập nhật trạng thái Bàn B2 → `OCCUPIED`.
  - Emit Socket để cập nhật lại giao diện KDS cho bếp (nếu muốn) và các POS khác.

**2. Gộp bàn (Merge Tables):**
- **Trigger:** Khách ở Bàn A1 và Bàn A2 muốn ngồi chung và tính chung 1 hóa đơn.
- **Action:** Chọn "Gộp bàn" → Chọn gộp A2 vào A1 (A1 là bàn chính).
- **System:**
  - Chuyển toàn bộ `order_items` của Order ở bàn A2 sang Order ở bàn A1.
  - Tính toán lại tổng tiền (`subtotal`) cho Order A1.
  - Hủy bỏ (Cancel) Order cũ của bàn A2 với lý do "MERGED".
  - Bàn A2 → `CLEANING` hoặc `AVAILABLE`.

---

## Module 3 — Order (Tạo & Quản lý Đơn hàng)

### 3.1 Mô tả chức năng

- Tạo đơn hàng mới cho bàn (DINE_IN) hoặc mang về (TAKE_AWAY)
- Thêm/sửa/xóa món, chọn **variant** (size S/M/L) và **modifier** (topping, ít đường...)
- **QR Order**: khách quét QR trên bàn → tự gọi món từ thiết bị cá nhân
- Gửi order lên bếp, theo dõi trạng thái từng món theo thời gian thực
- Ghi chú đặc biệt cho từng item (dị ứng, yêu cầu đặc biệt)

### 3.2 Luồng xử lý

```
Luồng DINE_IN (Phục vụ):
Waiter/Cashier → Chọn bàn → Tạo order
     │
     ▼
Thêm món → Chọn variant (M) → Chọn modifier (ít đường, thêm trân châu)
     │      → Nhập số lượng → Ghi chú
     ▼
"Gửi Bếp" → order item status: PENDING → SENT
     │       → Socket emit "kitchen:new_ticket"
     ▼
KDS hiển thị ticket → Bếp làm → PREPARING → READY
     │
     ▼
Waiter nhận thông báo "món sẵn" → Mang ra → "Đã phục vụ" → SERVED

Luồng QR Order (Khách tự gọi):
Khách quét QR bàn → Web app (no login) → Chọn món
     │
     ▼
Submit → Tạo OrderRequest (PENDING_APPROVAL)
     │
     ▼
Cashier/Waiter duyệt → Approve → Gửi bếp
                     → Reject  → Thông báo khách
```

### 3.3 Code minh họa

```typescript
// orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private gateway: SocketGateway,
    private inventoryService: InventoryService,
  ) {}

  /** Tạo order mới */
  async createOrder(dto: CreateOrderDto, cashierId: string) {
    const { tableId, type, items, note } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra bàn còn trống
      if (type === 'DINE_IN') {
        const table = await tx.table.findUnique({ where: { id: tableId } });
        if (table?.status === 'OCCUPIED') {
          throw new BadRequestException('Bàn đang có khách, hãy thêm món vào order hiện tại');
        }
      }

      // 2. Tính tổng tiền
      const itemsWithPrice = await this.calculateItemPrices(items, tx);
      const subtotal = itemsWithPrice.reduce((sum, i) => sum + i.totalPrice, 0);

      // 3. Tạo order
      const order = await tx.order.create({
        data: {
          tableId,
          type,
          status: 'OPEN',
          subtotal,
          total: subtotal, // sẽ cập nhật khi áp voucher/thuế
          note,
          cashierId,
          items: {
            create: itemsWithPrice.map((item) => ({
              menuItemId: item.menuItemId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              status: 'PENDING',
              modifiers: {
                create: item.modifiers?.map((m) => ({
                  modifierId: m.id,
                  name: m.name,
                  extraPrice: m.extraPrice,
                })),
              },
            })),
          },
        },
        include: { items: { include: { modifiers: true } } },
      });

      // 4. Cập nhật trạng thái bàn → OCCUPIED
      if (type === 'DINE_IN' && tableId) {
        await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
        this.gateway.server
          .to(`restaurant:${order.restaurantId}`)
          .emit('table:status_changed', { tableId, status: 'OCCUPIED' });
      }

      return order;
    });
  }

  /** Gửi order lên bếp */
  async sendToKitchen(orderId: string) {
    const pendingItems = await this.prisma.orderItem.findMany({
      where: { orderId, status: 'PENDING' },
      include: { menuItem: true, modifiers: true },
    });

    if (pendingItems.length === 0) {
      throw new BadRequestException('Không có món nào cần gửi bếp');
    }

    // Cập nhật trạng thái tất cả PENDING → SENT
    await this.prisma.orderItem.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Phát sự kiện tới màn hình bếp
    this.gateway.server
      .to(`kitchen:${pendingItems[0].restaurantId}`)
      .emit('kitchen:new_ticket', {
        orderId,
        tableCode: pendingItems[0].order?.table?.code,
        items: pendingItems.map((i) => ({
          id: i.id,
          name: i.menuItem.name,
          quantity: i.quantity,
          modifiers: i.modifiers.map((m) => m.name),
          note: i.note,
          prepTime: i.menuItem.prepTimeMinutes,
        })),
        sentAt: new Date(),
      });

    return { success: true, itemsSent: pendingItems.length };
  }

  /** Tính giá từng item (bao gồm variant + modifier) */
  private async calculateItemPrices(items: CreateOrderItemDto[], tx: any) {
    return Promise.all(
      items.map(async (item) => {
        const menuItem = await tx.menuItem.findUnique({ where: { id: item.menuItemId } });
        let unitPrice = menuItem.basePrice;

        if (item.variantId) {
          const variant = await tx.menuItemVariant.findUnique({ where: { id: item.variantId } });
          unitPrice = variant.price; // variant có giá riêng
        }

        let modifierExtra = 0;
        if (item.modifierIds?.length) {
          const mods = await tx.modifier.findMany({ where: { id: { in: item.modifierIds } } });
          modifierExtra = mods.reduce((sum, m) => sum + m.extraPrice, 0);
          item.modifiers = mods;
        }

        return {
          ...item,
          unitPrice: unitPrice + modifierExtra,
          totalPrice: (unitPrice + modifierExtra) * item.quantity,
        };
      }),
    );
  }
}
```

### 3.4 Bảng trạng thái Order Item

| Trạng thái | Mô tả | Chuyển tiếp |
|-----------|-------|-------------|
| `PENDING` | Mới thêm vào order, chưa gửi bếp | → `SENT` khi nhấn "Gửi bếp" |
| `SENT` | Đã gửi bếp, đang chờ xử lý | → `PREPARING` khi bếp bắt đầu |
| `PREPARING` | Bếp đang chế biến | → `READY` khi bếp xong |
| `READY` | Món đã xong, chờ phục vụ | → `SERVED` khi waiter mang ra |
| `SERVED` | Đã phục vụ cho khách | Kết thúc vòng đời |
| `CANCELLED` | Bị hủy (khách đổi ý / hết nguyên liệu) | Trạng thái cuối |

---

## Module 4 — KDS (Kitchen Display System)

### 4.1 Mô tả chức năng

- **Màn hình Kanban** dành riêng cho nhân viên bếp
- Nhận ticket realtime khi waiter gửi order
- **Âm báo** khi có ticket mới (`Audio API` trình duyệt)
- Hiển thị **bộ đếm thời gian** (thời gian từ khi gửi đến hiện tại)
- Bếp kéo thả hoặc bấm nút chuyển trạng thái: SENT → PREPARING → READY
- **Ưu tiên hóa**: Ticket quá 10 phút hiển thị nền đỏ cảnh báo

### 4.2 Luồng xử lý

```
Waiter gửi bếp
     │
     ▼  Socket emit "kitchen:new_ticket"
┌────────────────────────────────────────────┐
│            KDS - Kanban Board              │
│                                            │
│  [SENT]        [PREPARING]    [READY]      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Bàn A1    │  │Bàn B2    │  │Bàn C3    │ │
│  │• Phở bò  │  │• Bún bò  │  │• Cơm sườn│ │
│  │• Chả giò │  │  ×2      │  │  ×1 🔔   │ │
│  │⏱ 00:45   │  │⏱ 05:20  │  │⏱ 08:12  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────────────────────────────┘
     │ Bếp bấm "Bắt đầu"    │ Bếp bấm "Xong"
     ▼                       ▼
  PREPARING               READY
     │                       │
     │                       └─ emit "kitchen:item_ready"
     │                          → Waiter nhận thông báo
     └─ emit "kitchen:item_preparing"
```

### 4.3 Code minh họa

```typescript
// kds/kds.service.ts
@Injectable()
export class KdsService {
  constructor(
    private prisma: PrismaService,
    private gateway: SocketGateway,
  ) {}

  /** Bếp bắt đầu làm món */
  async startPreparing(orderItemId: string) {
    const item = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'PREPARING', preparingAt: new Date() },
      include: { order: { include: { table: true } } },
    });

    this.gateway.server
      .to(`kitchen:${item.restaurantId}`)
      .emit('kitchen:item_preparing', {
        orderItemId: item.id,
        orderId: item.orderId,
        tableCode: item.order.table?.code,
      });

    // Thông báo cho waiter
    this.gateway.server
      .to(`restaurant:${item.restaurantId}`)
      .emit('order:item_status', { orderItemId: item.id, status: 'PREPARING' });

    return item;
  }

  /** Bếp hoàn thành món */
  async markReady(orderItemId: string) {
    const item = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'READY', readyAt: new Date() },
      include: { order: { include: { table: true } }, menuItem: true },
    });

    // Thông báo waiter: có món sẵn sàng
    this.gateway.server.to(`restaurant:${item.restaurantId}`).emit('kitchen:item_ready', {
      orderItemId: item.id,
      orderId: item.orderId,
      menuItemName: item.menuItem.name,
      tableCode: item.order.table?.code,
      quantity: item.quantity,
    });

    return item;
  }

  /** Lấy tất cả tickets đang active cho màn hình bếp */
  async getActiveTickets(restaurantId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        restaurantId,
        status: { in: ['SENT', 'PREPARING'] },
      },
      include: {
        menuItem: true,
        modifiers: true,
        order: { include: { table: true } },
      },
      orderBy: { sentAt: 'asc' }, // Ưu tiên gửi trước
    });

    // Tính thời gian chờ và đánh dấu urgent
    return items.map((item) => ({
      ...item,
      waitMinutes: item.sentAt
        ? Math.floor((Date.now() - item.sentAt.getTime()) / 60000)
        : 0,
      isUrgent: item.sentAt
        ? (Date.now() - item.sentAt.getTime()) / 60000 > 10
        : false,
    }));
  }
}

// Frontend: KDS Component (React)
// Âm báo khi có ticket mới
socket.on('kitchen:new_ticket', (ticket) => {
  const audio = new Audio('/sounds/ding.mp3');
  audio.play();
  setTickets((prev) => [...prev, ticket]);
  toast.info(`🍳 Order mới: Bàn ${ticket.tableCode}`);
});
```

### 4.4 Bảng trạng thái KDS Ticket

| Cột Kanban | Trạng thái item | Màu indicator | Hành động |
|-----------|----------------|---------------|-----------|
| Mới vào | `SENT` | 🟠 Cam | "Bắt đầu làm" |
| Đang làm | `PREPARING` | 🔵 Xanh | "Xong rồi" |
| Xong | `READY` | 🟢 Xanh lá | Waiter lấy |
| > 10 phút | `SENT/PREPARING` | 🔴 Đỏ (urgent) | Cảnh báo chậm |

---

## Module 5 — Thanh toán (Payment)

### 5.1 Mô tả chức năng

- **Tính tổng tiền**: subtotal + thuế VAT 8%, áp dụng voucher/điểm
- **Tiền mặt**: Nhập tiền khách đưa → tính tiền thừa
- **VietQR**: Sinh mã QR chuẩn VietQR (Napas) → polling trạng thái
- **MoMo / VNPay**: Nhận webhook → tự động xác nhận PAID
- **Tách hóa đơn**: Chia đều hoặc chia theo món cho từng người
- Xuất hóa đơn PDF / in nhiệt

### 5.2 Luồng xử lý

```
Luồng thanh toán QR (VietQR):

Cashier → "Thanh toán QR"
     │
     ▼
Server tạo QR payload (bank_code + account + amount + ref_code)
     │
     ▼
Hiển thị QR trên màn hình → Khách quét bằng app ngân hàng
     │
     ▼
Polling mỗi 3 giây: GET /payment/check-status?ref=...
     │                 hoặc
     ▼
Webhook từ ngân hàng: POST /webhooks/bank-transfer
     │  { amount, ref, bankCode, timestamp }
     ▼
Server xác minh chữ ký → Tìm hóa đơn theo ref
     │
     ▼
Cập nhật hóa đơn: status=PAID → Emit socket "payment:confirmed"
     │
     ▼
Bàn → CLEANING, Trừ kho nguyên liệu, Tích điểm loyalty

Luồng tách hóa đơn:
Order (10 items) → Cashier chọn "Tách bill"
     │
     ▼
UI: Kéo thả items vào từng split
     │  Split 1: item 1, 2, 3 → Người A
     │  Split 2: item 4, 5    → Người B
     │  Split 3: còn lại      → Người C
     ▼
Tạo 3 Invoice con từ 1 Order cha
Mỗi invoice thanh toán độc lập
```

### 5.3 Code minh họa

```typescript
// payments/payments.service.ts
@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private gateway: SocketGateway,
    private inventoryService: InventoryService,
    private loyaltyService: LoyaltyService,
  ) {}

  /** Tạo hóa đơn */
  async createInvoice(orderId: string, dto: CreateInvoiceDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } } },
    });

    let discount = 0;
    // Áp dụng voucher
    if (dto.voucherCode) {
      const voucher = await this.applyVoucher(dto.voucherCode, order.subtotal);
      discount += voucher.discountAmount;
    }
    // Đổi điểm loyalty
    if (dto.loyaltyPoints > 0) {
      const pointDiscount = dto.loyaltyPoints * 1000; // 1 điểm = 1.000đ
      discount += pointDiscount;
    }

    const vatAmount = Math.round(order.subtotal * 0.08);
    const total = order.subtotal + vatAmount - discount;

    return this.prisma.invoice.create({
      data: {
        orderId,
        subtotal: order.subtotal,
        vatAmount,
        discountAmount: discount,
        total: Math.max(0, total),
        paymentMethod: dto.paymentMethod,
        status: dto.paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
        voucherCode: dto.voucherCode,
        loyaltyPointsUsed: dto.loyaltyPoints,
      },
    });
  }

  /** Xử lý webhook thanh toán từ ngân hàng */
  async handleBankWebhook(payload: BankWebhookPayload, signature: string) {
    // 1. Xác minh chữ ký webhook
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid) throw new ForbiddenException('Webhook signature không hợp lệ');

    // 2. Tìm hóa đơn theo reference code
    const invoice = await this.prisma.invoice.findFirst({
      where: { refCode: payload.ref, status: 'PENDING' },
      include: { order: { include: { table: true, items: { include: { menuItem: true } } } } },
    });
    if (!invoice) return { status: 'ignored' }; // ref không thuộc hệ thống

    // 3. Xác nhận số tiền khớp
    if (payload.amount < invoice.total) {
      throw new BadRequestException('Số tiền thanh toán không đủ');
    }

    // 4. Cập nhật trạng thái PAID trong transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), bankRef: payload.bankRef },
      });
      await tx.order.update({ where: { id: invoice.orderId }, data: { status: 'COMPLETED' } });
      if (invoice.order.tableId) {
        await tx.table.update({ where: { id: invoice.order.tableId }, data: { status: 'CLEANING' } });
      }
    });

    // 5. Xử lý sau thanh toán (async)
    await Promise.all([
      this.inventoryService.deductByOrder(invoice.orderId), // Trừ kho
      this.loyaltyService.addPoints(invoice),               // Tích điểm
    ]);

    // 6. Thông báo realtime
    this.gateway.server
      .to(`restaurant:${invoice.restaurantId}`)
      .emit('payment:confirmed', { invoiceId: invoice.id, orderId: invoice.orderId });

    return { status: 'processed' };
  }

  /** Sinh VietQR content */
  generateVietQR(amount: number, description: string): string {
    const bankAccount = process.env.BANK_ACCOUNT; // e.g., "0123456789"
    const bankBin = process.env.BANK_BIN;         // e.g., "970436" (VPBank)
    // VietQR format: https://vietqr.io/danh-sach-api/tao-ma-qr/
    return `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png` +
      `?amount=${amount}&addInfo=${encodeURIComponent(description)}`;
  }
}
```

### 5.4 Nghiệp vụ Tách Hóa Đơn (Split Bill)

Nghiệp vụ tách bill (Split Bill) là tính năng bắt buộc phải có khi một nhóm khách ăn chung nhưng muốn thanh toán riêng phần của từng người.

**Hai phương thức tách hóa đơn chính:**

1. **Tách chia đều (Split Evenly):**
   - Áp dụng khi nhóm bạn muốn chia đều tổng hóa đơn thành N phần bằng nhau (AA).
   - *Logic:* Từ 1 Order cha, sinh ra N Invoice con. Mỗi Invoice con có giá trị `total = Order.total / N`. Khi tất cả N Invoice con đều báo `PAID` thì Order cha mới chuyển sang `COMPLETED`.

2. **Tách theo món (Split by Items):**
   - Áp dụng khi khách nào ăn món nào thì tự trả tiền món đó.
   - *Trải nghiệm người dùng:* Màn hình thu ngân sẽ hiển thị giao diện kéo thả (Drag & Drop). Thu ngân chọn "Tạo Hóa đơn 1" → Kéo ly Cà phê và Bánh mì vào; "Tạo Hóa đơn 2" → Kéo Trà sữa vào.
   - *Logic hệ thống:* 
     - Nhóm lại các `order_items` và tạo các Invoice con tương ứng.
     - Hệ thống tự động chia lại thuế VAT và Discount (nếu có) theo tỷ lệ phần trăm tiền món trên tổng tiền.
     - Đảm bảo tính toàn vẹn: Tổng số lượng món và tổng tiền của các Invoice con **phải bằng chính xác 100%** Order gốc.

### 5.5 Bảng trạng thái hóa đơn

| Trạng thái | Mô tả | Chuyển tiếp |
|-----------|-------|-------------|
| `PENDING` | Đã tạo, chờ thanh toán | → `PAID`, `CANCELLED` |
| `PAID` | Đã thanh toán thành công | Trạng thái cuối |
| `PARTIALLY_PAID` | Tách bill, mới thanh toán 1 phần | → `PAID` khi tất cả splits xong |
| `CANCELLED` | Hủy hóa đơn (hoàn tiền) | Trạng thái cuối |
| `REFUNDED` | Đã hoàn tiền | Trạng thái cuối |

---

## Module 6 — Quản lý Menu

### 6.1 Mô tả chức năng

- **CRUD Danh mục**: Thêm/sửa/xóa danh mục (Category), sắp xếp thứ tự hiển thị
- **CRUD Món ăn**: Tên, mô tả, giá gốc, thời gian chế biến, ảnh, danh mục
- **Variant**: Mỗi món có thể có nhiều size (S/M/L) với giá khác nhau
- **Modifier Group**: Nhóm tùy chọn (ví dụ: "Độ ngọt", "Topping") với các lựa chọn
- **Upload ảnh**: Tích hợp Cloudinary — resize, tối ưu định dạng WebP tự động
- **Toggle**: Bật/tắt món (hết nguyên liệu, theo mùa)
- Sắp xếp thứ tự hiển thị menu bằng kéo thả

### 6.2 Luồng xử lý

```
Manager thêm món mới:

Form tạo món
  ├── Tên, mô tả, danh mục
  ├── Giá gốc, thời gian chế biến
  ├── Upload ảnh → Cloudinary API
  │       └── nhận lại: publicId, url, thumbnailUrl
  ├── Thêm Variants:
  │       ├── Size S: 29.000đ
  │       ├── Size M: 35.000đ (default)
  │       └── Size L: 42.000đ
  └── Thêm Modifier Groups:
          ├── "Độ ngọt" (single select, required)
          │       ├── Ít đường: +0đ
          │       ├── 50%: +0đ
          │       └── 100%: +0đ
          └── "Topping" (multi select, optional)
                  ├── Trân châu trắng: +8.000đ
                  ├── Thạch dừa: +5.000đ
                  └── Kem béo: +10.000đ
```

### 6.3 Code minh họa

```typescript
// menu/menu.service.ts
@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async createMenuItem(dto: CreateMenuItemDto, file?: Express.Multer.File) {
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    // Upload ảnh lên Cloudinary
    if (file) {
      const uploaded = await this.cloudinary.upload(file.buffer, {
        folder: `restopos/${dto.restaurantId}/menu`,
        transformation: [
          { width: 800, height: 600, crop: 'fill' }, // Resize chuẩn
          { format: 'webp', quality: 'auto' },         // Tối ưu định dạng
        ],
      });
      imageUrl = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice,
        prepTimeMinutes: dto.prepTimeMinutes,
        categoryId: dto.categoryId,
        restaurantId: dto.restaurantId,
        imageUrl,
        imagePublicId,
        isActive: true,
        sortOrder: await this.getNextSortOrder(dto.categoryId),
        variants: {
          create: dto.variants?.map((v, idx) => ({
            name: v.name,
            price: v.price,
            isDefault: v.isDefault ?? idx === 0,
          })),
        },
        modifierGroups: {
          create: dto.modifierGroups?.map((g) => ({
            name: g.name,
            isRequired: g.isRequired,
            isMultiSelect: g.isMultiSelect,
            maxSelect: g.maxSelect,
            modifiers: {
              create: g.modifiers.map((m) => ({
                name: m.name,
                extraPrice: m.extraPrice,
              })),
            },
          })),
        },
      },
    });
  }

  /** Tắt món khi hết nguyên liệu */
  async toggleAvailability(menuItemId: string, isActive: boolean) {
    const item = await this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isActive },
    });
    // Broadcast cập nhật menu cho các tablet
    // gateway.emit('menu:item_toggled', { menuItemId, isActive });
    return item;
  }
}

// cloudinary/cloudinary.service.ts
@Injectable()
export class CloudinaryService {
  async upload(buffer: Buffer, options: UploadApiOptions) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result!);
      });
      stream.end(buffer);
    });
  }

  async delete(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
```

---

## Module 7 — Combo & Khuyến mãi

### 7.1 Mô tả chức năng

- **Combo cố định**: Mua A + B + C → giảm X% hoặc giảm Y đồng
- **Happy Hour**: Giảm giá theo khung giờ (ví dụ: 14h–17h giảm 20% toàn menu)
- **Voucher code**: Mã giảm giá 1 lần hoặc nhiều lần, giới hạn số lần dùng
- **Tự động áp dụng**: Server tự detect combo phù hợp khi tạo order
- Lịch sử sử dụng khuyến mãi, thống kê hiệu quả chiến dịch

### 7.2 Luồng xử lý

```
Khi tạo order hoặc thanh toán:

Order items → promotionEngine.evaluate(items, orderTime)
     │
     ├── Kiểm tra Happy Hour
     │       is_happy_hour = 14:00 <= now <= 17:00
     │       → giảm 20% tất cả items trong khung giờ
     │
     ├── Kiểm tra Combo tự động
     │       items chứa [Bún bò + Chả giò + Nước ngọt]?
     │       → áp dụng "Combo Bữa Trưa" giảm 15%
     │
     └── Kiểm tra Voucher (nếu user nhập code)
             code valid? → còn lượt dùng? → đúng điều kiện?
             → áp dụng giảm giá
     │
     ▼
Trả về: { appliedPromotions: [], totalDiscount: number }
```

### 7.3 Code minh họa

```typescript
// promotions/promotion-engine.service.ts
@Injectable()
export class PromotionEngineService {
  constructor(private prisma: PrismaService) {}

  async evaluate(
    orderItems: OrderItem[],
    orderTime: Date,
    restaurantId: string,
  ): Promise<PromotionResult> {
    const appliedPromotions: AppliedPromotion[] = [];
    let totalDiscount = 0;

    // 1. Kiểm tra Happy Hour
    const happyHour = await this.prisma.promotion.findFirst({
      where: {
        restaurantId,
        type: 'HAPPY_HOUR',
        isActive: true,
        startTime: { lte: orderTime },
        endTime: { gte: orderTime },
      },
    });

    if (happyHour) {
      const discount = this.calculateHappyHour(orderItems, happyHour);
      if (discount > 0) {
        appliedPromotions.push({ promotion: happyHour, discountAmount: discount });
        totalDiscount += discount;
      }
    }

    // 2. Kiểm tra Combo tự động
    const combos = await this.prisma.combo.findMany({
      where: { restaurantId, isActive: true },
      include: { requiredItems: true },
    });

    for (const combo of combos) {
      const isMatch = this.checkComboMatch(orderItems, combo.requiredItems);
      if (isMatch) {
        const discount = this.calculateComboDiscount(orderItems, combo);
        appliedPromotions.push({ promotion: combo, discountAmount: discount });
        totalDiscount += discount;
        break; // Chỉ áp 1 combo tốt nhất
      }
    }

    return { appliedPromotions, totalDiscount };
  }

  private calculateHappyHour(items: OrderItem[], promotion: Promotion): number {
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    // Giờ vàng: giảm theo phần trăm hoặc số tiền cố định
    if (promotion.discountType === 'PERCENTAGE') {
      return Math.round(subtotal * (promotion.discountValue / 100));
    }
    return promotion.discountValue;
  }

  private checkComboMatch(orderItems: OrderItem[], requiredItems: ComboItem[]): boolean {
    const itemMap = new Map(orderItems.map((i) => [i.menuItemId, i.quantity]));
    return requiredItems.every((required) => {
      const qty = itemMap.get(required.menuItemId) ?? 0;
      return qty >= required.minQuantity;
    });
  }
}
```

### 7.4 Cấu trúc chương trình khuyến mãi

| Loại | Điều kiện kích hoạt | Giảm giá | Ưu tiên |
|------|--------------------|---------:|---------|
| `HAPPY_HOUR` | Đúng khung giờ | 15–30% | Thấp |
| `COMBO` | Có đủ items yêu cầu | 10–25% | Cao |
| `VOUCHER` | Nhập code hợp lệ | Linh hoạt | Cao nhất |
| `BIRTHDAY` | Ngày sinh khách hàng | 20% hoặc voucher | Cao |

---

## Module 8 — Nguyên liệu & Tồn kho (Inventory)

### 8.1 Mô tả chức năng

- **Recipe-based deduction**: Định nghĩa công thức nguyên liệu cho từng món, khi bán tự động trừ kho
- **Nhập kho**: Ghi nhận phiếu nhập (số lượng, nhà cung cấp, giá nhập)
- **Cảnh báo tồn thấp**: Khi số lượng nguyên liệu < ngưỡng → gửi cảnh báo (BullMQ queue)
- **Lịch sử**: Xem toàn bộ lịch sử xuất/nhập theo nguyên liệu và theo thời gian
- **Tắt món tự động**: Khi nguyên liệu hết → tự động set `isActive = false`

### 8.2 Luồng xử lý

```
Khi hóa đơn PAID:

invoice → inventoryService.deductByOrder(orderId)
     │
     ▼
Lấy tất cả items trong order
     │
     ├── Với mỗi menuItem → lấy Recipe (danh sách nguyên liệu cần)
     │       menuItem: "Phở bò" (×2)
     │       recipe:
     │         - bánh phở: 200g × 2 = 400g
     │         - thịt bò: 100g × 2 = 200g
     │         - xương hầm: 500ml × 2 = 1000ml
     │
     ▼
Transaction: Trừ từng nguyên liệu khỏi kho
     │
     ├── Kiểm tra tồn kho sau khi trừ
     │       nếu stock < minStockLevel → enqueue cảnh báo (BullMQ)
     │
     └── Nếu stock = 0 → toggle món sang isActive = false
                         → broadcast menu:item_toggled
```

### 8.3 Code minh họa

```typescript
// inventory/inventory.service.ts
@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('inventory-alerts') private alertQueue: Queue,
    private gateway: SocketGateway,
  ) {}

  /** Trừ nguyên liệu dựa trên recipe khi hóa đơn PAID */
  async deductByOrder(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, status: 'SERVED' },
      include: {
        menuItem: {
          include: {
            recipe: { include: { ingredient: true } }, // Công thức nguyên liệu
          },
        },
      },
    });

    // Tổng hợp nguyên liệu cần trừ
    const deductMap = new Map<string, number>(); // ingredientId → tổng lượng cần trừ
    for (const item of orderItems) {
      for (const recipeRow of item.menuItem.recipe) {
        const needed = recipeRow.quantity * item.quantity;
        const current = deductMap.get(recipeRow.ingredientId) ?? 0;
        deductMap.set(recipeRow.ingredientId, current + needed);
      }
    }

    // Thực hiện trừ kho trong transaction
    await this.prisma.$transaction(async (tx) => {
      for (const [ingredientId, amount] of deductMap.entries()) {
        const ingredient = await tx.ingredient.update({
          where: { id: ingredientId },
          data: { stockQuantity: { decrement: amount } },
        });

        // Ghi lịch sử xuất kho
        await tx.inventoryLog.create({
          data: {
            ingredientId,
            type: 'DEDUCT',
            quantity: amount,
            reason: `Bán hàng - Order #${orderId}`,
            balanceAfter: ingredient.stockQuantity,
          },
        });

        // Cảnh báo tồn thấp
        if (ingredient.stockQuantity <= ingredient.minStockLevel) {
          await this.alertQueue.add('low-stock-alert', {
            ingredientId,
            ingredientName: ingredient.name,
            currentStock: ingredient.stockQuantity,
            unit: ingredient.unit,
            minLevel: ingredient.minStockLevel,
            restaurantId: ingredient.restaurantId,
          }, { delay: 1000 }); // delay 1s để tránh spam
        }

        // Tắt món nếu hết nguyên liệu
        if (ingredient.stockQuantity <= 0) {
          const affectedItems = await tx.menuItem.findMany({
            where: { recipe: { some: { ingredientId } } },
          });
          for (const menu of affectedItems) {
            await tx.menuItem.update({ where: { id: menu.id }, data: { isActive: false } });
            this.gateway.server
              .to(`restaurant:${menu.restaurantId}`)
              .emit('menu:item_toggled', { menuItemId: menu.id, isActive: false });
          }
        }
      }
    });
  }

  /** BullMQ Processor: xử lý cảnh báo tồn thấp */
  @Process('low-stock-alert')
  async handleLowStockAlert(job: Job) {
    const { ingredientName, currentStock, unit, restaurantId } = job.data;
    // Gửi notification qua Socket
    this.gateway.server.to(`restaurant:${restaurantId}`).emit('inventory:low_stock', job.data);
    // Gửi email/Telegram cho quản lý (tùy cấu hình)
    console.warn(`⚠️ Tồn kho thấp: ${ingredientName} còn ${currentStock} ${unit}`);
  }
}
```

### 8.4 Bảng trạng thái tồn kho

| Mức tồn | Ngưỡng | Màu cảnh báo | Hành động |
|---------|--------|--------------|-----------|
| Đủ hàng | > minLevel × 2 | 🟢 Xanh | Bình thường |
| Sắp hết | minLevel < stock ≤ minLevel × 2 | 🟡 Vàng | Gửi cảnh báo |
| Tồn thấp | 0 < stock ≤ minLevel | 🔴 Đỏ | Cảnh báo + đề xuất nhập |
| Hết hàng | stock = 0 | ⛔ Đỏ đậm | Tắt món tự động |

---

## Module 9 — Đặt bàn (Reservation)

### 9.1 Mô tả chức năng

- Khách hoặc nhân viên tạo **đặt bàn trước** (tên, SĐT, ngày/giờ, số người, ghi chú)
- **Nhắc nhở tự động** qua Telegram Bot 30 phút trước giờ hẹn (BullMQ delayed job)
- Quản lý trạng thái đặt bàn từ CONFIRMED đến ARRIVED/NO_SHOW
- Khi khách đến → chuyển bàn sang OCCUPIED và tạo order
- Xem lịch đặt bàn theo ngày trên giao diện calendar

### 9.2 Luồng xử lý

```
Tạo đặt bàn:
Khách/Nhân viên → Nhập thông tin đặt bàn
     │
     ▼
Server tạo Reservation (status: CONFIRMED)
     │
     ├── Gửi SMS/Zalo xác nhận đến SĐT khách
     │
     └── Đặt lịch BullMQ: delay = reservationTime - 30 phút
             └── Job: "send-telegram-reminder"
                       → Gửi tin nhắn Telegram cho quản lý:
                          "🔔 30 phút nữa: [Tên khách] đặt [N người]
                           Bàn: [Mã bàn], Giờ: [HH:mm]"

Khách đến:
Nhân viên → Tìm reservation → "Khách đã đến" (ARRIVED)
     │
     ▼
Hệ thống tự động:
  - Bàn → OCCUPIED
  - Tạo order mới gắn với reservation
  - Nhắc nhở đã hết (cancel delayed job nếu còn)
```

### 9.3 Code minh họa

```typescript
// reservations/reservations.service.ts
@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('reservation-reminders') private reminderQueue: Queue,
    private telegramService: TelegramService,
    private ordersService: OrdersService,
  ) {}

  async create(dto: CreateReservationDto) {
    const reservation = await this.prisma.reservation.create({
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        reservedAt: new Date(dto.reservedAt),
        partySize: dto.partySize,
        tableId: dto.tableId,
        note: dto.note,
        restaurantId: dto.restaurantId,
        status: 'CONFIRMED',
      },
    });

    // Cập nhật bàn thành RESERVED
    await this.prisma.table.update({
      where: { id: dto.tableId },
      data: { status: 'RESERVED' },
    });

    // Đặt lịch nhắc nhở Telegram: 30 phút trước giờ hẹn
    const delay = new Date(dto.reservedAt).getTime() - Date.now() - 30 * 60 * 1000;
    if (delay > 0) {
      const job = await this.reminderQueue.add(
        'send-telegram-reminder',
        { reservationId: reservation.id },
        { delay, jobId: `reservation-${reservation.id}` },
      );
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { reminderJobId: job.id as string },
      });
    }

    return reservation;
  }

  /** Xử lý khi khách đến */
  async markArrived(reservationId: string) {
    const reservation = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'ARRIVED', arrivedAt: new Date() },
      include: { table: true },
    });

    // Hủy job nhắc nhở (nếu còn)
    if (reservation.reminderJobId) {
      const job = await this.reminderQueue.getJob(reservation.reminderJobId);
      await job?.remove();
    }

    // Tạo order tự động cho bàn
    await this.ordersService.createOrder({
      tableId: reservation.tableId!,
      type: 'DINE_IN',
      items: [],
      reservationId,
    }, reservation.restaurantId);

    return reservation;
  }
}

// Processor: gửi Telegram
@Process('send-telegram-reminder')
async sendReminder(job: Job<{ reservationId: string }>) {
  const reservation = await this.prisma.reservation.findUnique({
    where: { id: job.data.reservationId },
    include: { table: true },
  });
  if (!reservation || reservation.status !== 'CONFIRMED') return;

  await this.telegramService.sendMessage(
    process.env.TELEGRAM_CHAT_ID!,
    `🔔 *Nhắc lịch đặt bàn*\n` +
    `👤 Khách: ${reservation.customerName}\n` +
    `📞 SĐT: ${reservation.customerPhone}\n` +
    `🪑 Bàn: ${reservation.table?.code} | 👥 ${reservation.partySize} người\n` +
    `⏰ Giờ hẹn: ${format(reservation.reservedAt, 'HH:mm dd/MM/yyyy')}\n` +
    `📝 Ghi chú: ${reservation.note || 'Không có'}`,
  );
}
```

### 9.4 Bảng trạng thái đặt bàn

| Trạng thái | Mô tả | Chuyển tiếp |
|-----------|-------|-------------|
| `CONFIRMED` | Đã xác nhận, chờ khách đến | → `ARRIVED`, `NO_SHOW`, `CANCELLED` |
| `ARRIVED` | Khách đã đến, đang phục vụ | Trạng thái cuối |
| `NO_SHOW` | Quá giờ 30 phút, khách không đến | Trạng thái cuối |
| `CANCELLED` | Khách hủy đặt bàn | Trạng thái cuối |

---

## Module 10 — Loyalty (Tích điểm & Hạng thành viên)

### 10.1 Mô tả chức năng

- **Tích điểm**: Mỗi 10.000đ chi tiêu = 1 điểm tích lũy
- **Hạng thành viên**: BRONZE → SILVER → GOLD → PLATINUM với quyền lợi tăng dần
- **Đổi điểm**: 1 điểm = 1.000đ giảm giá khi thanh toán
- **Voucher sinh nhật**: Hệ thống tự động tạo voucher giảm 20% vào ngày sinh
- **Lịch sử điểm**: Xem toàn bộ lịch sử tích/đổi điểm

### 10.2 Bảng hạng thành viên

| Hạng | Điểm tích lũy | Quyền lợi | Badge |
|------|--------------|-----------|-------|
| `BRONZE` | 0 – 999 | Tích điểm cơ bản 1x | 🥉 |
| `SILVER` | 1.000 – 4.999 | Tích điểm 1.2x, ưu tiên đặt bàn | 🥈 |
| `GOLD` | 5.000 – 19.999 | Tích điểm 1.5x, sinh nhật giảm 20% | 🥇 |
| `PLATINUM` | ≥ 20.000 | Tích điểm 2x, ưu tiên đặc biệt, gift hàng tháng | 💎 |

### 10.3 Luồng xử lý

```
Sau thanh toán thành công:

invoice (total = 350.000đ)
     │
     ▼
loyaltyService.addPoints(invoice)
     │
     ├── Tìm customer theo SĐT
     │       customer không tồn tại? → bỏ qua
     │
     ├── Tính điểm: floor(350.000 / 10.000) = 35 điểm
     │       × multiplier theo hạng (GOLD = 1.5x) = 52 điểm
     │
     ├── Cộng điểm vào tài khoản, ghi lịch sử
     │
     └── Kiểm tra nâng hạng:
             totalPoints vượt ngưỡng? → upgrade tier
             Gửi thông báo: "Chúc mừng! Bạn đạt hạng GOLD 🥇"

Tạo voucher sinh nhật (Cron Job 0 6 * * *):
Mỗi ngày 6:00 sáng → Tìm khách có sinh nhật hôm nay
     │
     └── Tạo voucher mã ngẫu nhiên: BDAY_XXXXXXXX
             Giá trị: 20% (tối đa 100.000đ)
             Hạn dùng: 30 ngày
             → Gửi SMS/Zalo thông báo cho khách
```

### 10.4 Code minh họa

```typescript
// loyalty/loyalty.service.ts
@Injectable()
export class LoyaltyService {
  private readonly TIER_MULTIPLIERS: Record<string, number> = {
    BRONZE: 1.0,
    SILVER: 1.2,
    GOLD: 1.5,
    PLATINUM: 2.0,
  };

  private readonly TIER_THRESHOLDS = [
    { tier: 'PLATINUM', points: 20000 },
    { tier: 'GOLD', points: 5000 },
    { tier: 'SILVER', points: 1000 },
    { tier: 'BRONZE', points: 0 },
  ];

  async addPoints(invoice: Invoice & { order: Order & { customer?: Customer } }) {
    const customer = invoice.order.customer;
    if (!customer) return; // Khách vãng lai, không tích điểm

    const basePoints = Math.floor(invoice.total / 10000);
    const multiplier = this.TIER_MULTIPLIERS[customer.tier] ?? 1.0;
    const earnedPoints = Math.floor(basePoints * multiplier);

    if (earnedPoints === 0) return;

    const updatedCustomer = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        points: { increment: earnedPoints },
        totalSpent: { increment: invoice.total },
        pointsHistory: {
          create: {
            type: 'EARN',
            points: earnedPoints,
            description: `Tích điểm từ hóa đơn #${invoice.id}`,
            invoiceId: invoice.id,
          },
        },
      },
    });

    // Kiểm tra nâng hạng
    const newTier = this.calculateTier(updatedCustomer.points);
    if (newTier !== customer.tier) {
      await this.prisma.customer.update({ where: { id: customer.id }, data: { tier: newTier } });
      // Gửi thông báo nâng hạng
    }
  }

  /** Cron: Tạo voucher sinh nhật */
  @Cron('0 6 * * *') // Mỗi ngày 6:00 sáng
  async createBirthdayVouchers() {
    const today = new Date();
    const customers = await this.prisma.customer.findMany({
      where: {
        birthday: {
          // Tìm khách có ngày-tháng sinh = hôm nay
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });

    for (const customer of customers) {
      const voucherCode = `BDAY_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await this.prisma.voucher.create({
        data: {
          code: voucherCode,
          type: 'PERCENTAGE',
          discountValue: 20,
          maxDiscountAmount: 100000,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
          customerId: customer.id,
          usageLimit: 1,
          restaurantId: customer.restaurantId,
        },
      });
      // Gửi thông báo cho khách (Zalo/SMS)
    }
  }

  private calculateTier(totalPoints: number): string {
    return this.TIER_THRESHOLDS.find((t) => totalPoints >= t.points)?.tier ?? 'BRONZE';
  }
}
```

---

## Module 11 — Ca làm việc (Shift Management)

### 11.1 Mô tả chức năng

- **Mở ca**: Thu ngân khai báo tiền mặt đầu ca (quỹ mở đầu)
- **Đóng ca**: Khai báo tiền mặt cuối ca → hệ thống đối chiếu
- Tất cả order và hóa đơn trong ca gắn với **shiftId** tương ứng
- **Báo cáo ca**: Tổng doanh thu, số order, tiền mặt, QR, tiền thừa/thiếu
- Chỉ có 1 ca active tại một thời điểm trên mỗi thiết bị/quầy
- OWNER/MANAGER có thể xem và so sánh các ca

### 11.2 Luồng xử lý

```
Mở ca:
Thu ngân đăng nhập → "Mở ca mới"
     │  Nhập: Tiền mặt đầu ca (ví dụ: 500.000đ)
     │
     ▼
Server tạo Shift:
  - cashierId, startedAt = now()
  - openingCash = 500.000đ
  - status = OPEN
     │
     ▼
Mọi order/invoice tạo ra đều có shiftId = shift.id

Đóng ca:
Thu ngân → "Đóng ca"
     │  Nhập: Tiền mặt cuối ca (đếm thực tế)
     │
     ▼
Server tính toán:
  - totalCashSales     = tổng tiền mặt thu từ hóa đơn trong ca
  - expectedCash       = openingCash + totalCashSales
  - actualCash         = closingCash (thu ngân báo cáo)
  - discrepancy        = actualCash - expectedCash
     │
     ├── discrepancy = 0 → Khớp sổ ✅
     ├── discrepancy > 0 → Thừa tiền mặt ⚠️
     └── discrepancy < 0 → Thiếu tiền mặt ❌
     │
     ▼
Shift status = CLOSED
In/Export báo cáo ca PDF
```

### 11.3 Code minh họa

```typescript
// shifts/shifts.service.ts
@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(dto: OpenShiftDto, cashierId: string) {
    // Kiểm tra không có ca đang mở tại quầy này
    const existingShift = await this.prisma.shift.findFirst({
      where: { cashierId, status: 'OPEN', restaurantId: dto.restaurantId },
    });
    if (existingShift) {
      throw new ConflictException('Đã có ca đang mở. Vui lòng đóng ca cũ trước.');
    }

    return this.prisma.shift.create({
      data: {
        cashierId,
        restaurantId: dto.restaurantId,
        openingCash: dto.openingCash,
        startedAt: new Date(),
        status: 'OPEN',
      },
    });
  }

  async closeShift(shiftId: string, closingCash: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { invoices: true },
    });
    if (shift?.status !== 'OPEN') throw new BadRequestException('Ca đã đóng hoặc không tồn tại');

    // Tính toán doanh thu từng phương thức
    const cashInvoices = shift.invoices.filter((i) => i.paymentMethod === 'CASH' && i.status === 'PAID');
    const qrInvoices = shift.invoices.filter((i) => i.paymentMethod === 'QR' && i.status === 'PAID');

    const totalCashSales = cashInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalQrSales = qrInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalRevenue = totalCashSales + totalQrSales;

    const expectedCash = shift.openingCash + totalCashSales;
    const discrepancy = closingCash - expectedCash;

    const closedShift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closingCash,
        totalCashSales,
        totalQrSales,
        totalRevenue,
        totalOrders: shift.invoices.length,
        discrepancy,
        endedAt: new Date(),
        status: 'CLOSED',
      },
    });

    return {
      shift: closedShift,
      summary: {
        openingCash: shift.openingCash,
        totalCashSales,
        totalQrSales,
        totalRevenue,
        expectedCash,
        actualCash: closingCash,
        discrepancy,
        status: discrepancy === 0 ? 'BALANCED' : discrepancy > 0 ? 'SURPLUS' : 'DEFICIT',
      },
    };
  }
}
```

### 11.4 Báo cáo ca mẫu

```
╔════════════════════════════════════════════╗
║           BÁO CÁO CA LÀM VIỆC             ║
║       RestoPOS — Nhà hàng ABC              ║
╠════════════════════════════════════════════╣
║  Nhân viên : Nguyễn Văn A (CASHIER)       ║
║  Mở ca     : 06/06/2026  08:00            ║
║  Đóng ca   : 06/06/2026  14:30            ║
╠════════════════════════════════════════════╣
║  Tổng order: 47 đơn                        ║
║  Doanh thu : 12.350.000 đ                  ║
║  ├── Tiền mặt : 8.200.000 đ               ║
║  └── QR/CK   : 4.150.000 đ               ║
╠════════════════════════════════════════════╣
║  Tiền quỹ đầu ca  : 500.000 đ             ║
║  Tiền thu (mặt)   : 8.200.000 đ           ║
║  Tiền dự kiến có  : 8.700.000 đ           ║
║  Tiền thực tế đếm : 8.700.000 đ           ║
║  Chênh lệch       : 0 đ ✅               ║
╚════════════════════════════════════════════╝
```

### 11.5 Bảng trạng thái ca

| Trạng thái | Mô tả | Hành động |
|-----------|-------|-----------|
| `OPEN` | Ca đang hoạt động | Tiếp nhận order và thanh toán |
| `CLOSED` | Ca đã đóng | Chỉ đọc — không tạo order mới |
| `VOID` | Ca bị hủy (lỗi hệ thống) | Admin xử lý thủ công |

---

## Tổng kết — Tích hợp giữa các module

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LUỒNG TÍCH HỢP HOÀN CHỈNH                      │
│                                                                     │
│  [Auth] → xác thực → [Shift mở ca]                                 │
│                            │                                        │
│  [Reservation] → khách đến → [Quản lý bàn] → OCCUPIED              │
│                                    │                                │
│  [Order] ← gọi món ────────────────┘                               │
│     │                                                               │
│     ├── [Combo/KM] → áp dụng giảm giá                              │
│     ├── [KDS] ←── gửi bếp, realtime Socket.IO                       │
│     │              └── bếp xong → waiter phục vụ                   │
│     │                                                               │
│  [Thanh toán] ← cashier chọn phương thức                           │
│     │   ├── Cash → PAID ngay                                        │
│     │   └── QR → Webhook ngân hàng → PAID                          │
│     │                                                               │
│     ├── [Inventory] → trừ kho theo recipe                           │
│     ├── [Loyalty] → tích điểm cho khách                            │
│     ├── [Shift] → cộng doanh thu vào ca                            │
│     └── [Bàn] → CLEANING                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Ma trận phân quyền theo module

| Module | OWNER | MANAGER | CASHIER | KITCHEN | WAITER |
|--------|:-----:|:-------:|:-------:|:-------:|:------:|
| Auth/RBAC | ✅ CRUD | ✅ Đọc | ✅ Đăng nhập | ✅ Đăng nhập | ✅ Đăng nhập |
| Quản lý Bàn | ✅ CRUD | ✅ CRUD | ✅ Đọc | — | ✅ Đọc |
| Order | ✅ Tất cả | ✅ Tất cả | ✅ CRUD | — | ✅ Tạo/Xem |
| KDS | — | ✅ Xem | — | ✅ Đầy đủ | — |
| Thanh toán | ✅ Tất cả | ✅ Xem | ✅ CRUD | — | — |
| Menu | ✅ CRUD | ✅ CRUD | ✅ Đọc | ✅ Đọc | ✅ Đọc |
| Combo/KM | ✅ CRUD | ✅ CRUD | ✅ Áp dụng | — | — |
| Inventory | ✅ CRUD | ✅ CRUD | — | — | — |
| Reservation | ✅ CRUD | ✅ CRUD | ✅ CRUD | — | ✅ Xem |
| Loyalty | ✅ CRUD | ✅ Xem | ✅ Áp dụng | — | — |
| Ca làm việc | ✅ Tất cả | ✅ Xem | ✅ Mở/Đóng ca | — | — |

---

*Tài liệu được tạo cho đồ án POS Nhà Hàng — CT07 | RestoPOS v1.0*

