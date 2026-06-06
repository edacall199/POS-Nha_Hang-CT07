# Tiêu chí 1 — Phân tích Bài toán & Yêu cầu Hệ thống
> **Điểm tối đa:** 1.0 | **Mục tiêu:** Xuất sắc (100%)

---

## 1. Bối cảnh & Bài toán thực tế

Mô hình kinh doanh nhà hàng / quán cà phê tại Việt Nam hiện đang đối mặt với các vấn đề:

- **Quản lý order thủ công**: Nhân viên ghi tay → dễ nhầm, chậm, khó theo dõi
- **Không có realtime giữa bàn và bếp**: Bếp không biết trạng thái, khách chờ lâu
- **Thiếu kiểm soát nguyên liệu**: Không biết hết nguyên liệu nào, khi nào cần nhập thêm
- **Quản lý ca/nhân viên rời rạc**: Không biết ai làm ca nào, doanh thu ca bao nhiêu
- **Thanh toán chậm**: Tính tiền thủ công, không hỗ trợ QR/chuyển khoản

**RestoPOS** giải quyết toàn bộ vấn đề trên thông qua một hệ thống POS số hóa toàn diện.

---

## 2. Người dùng và Vai trò (Actors)

| Vai trò | Mô tả | Quyền truy cập |
|---------|-------|----------------|
| **OWNER** | Chủ nhà hàng | Toàn quyền: xem tất cả báo cáo, cấu hình hệ thống, quản lý nhân viên |
| **MANAGER** | Quản lý ca | Quản lý menu, nhân viên, xem báo cáo ca, nhập nguyên liệu |
| **CASHIER** | Thu ngân | Tạo order, thanh toán, mở/đóng ca, xem hóa đơn |
| **KITCHEN** | Nhân viên bếp | Xem màn hình KDS, cập nhật trạng thái món |
| **WAITER** | Phục vụ | Gọi món tại bàn, gửi order lên bếp, xác nhận phục vụ |

---

## 3. Use Case Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │              HỆ THỐNG RESTOPOS                  │
                    │                                                  │
  ┌──────────┐      │  ╔═══════════════╗    ╔═══════════════════════╗ │
  │  OWNER   │──────┼─►║ Xem báo cáo  ║    ║ Cấu hình hệ thống    ║ │
  └──────────┘      │  ╚═══════════════╝    ╚═══════════════════════╝ │
                    │                                                  │
  ┌──────────┐      │  ╔═══════════════╗    ╔═══════════════════════╗ │
  │ MANAGER  │──────┼─►║ Quản lý menu ║    ║ Quản lý nhân viên    ║ │
  └──────────┘      │  ╚═══════════════╝    ╚═══════════════════════╝ │
        │           │  ╔═══════════════╗                              │
        └───────────┼─►║ Nhập NL/Kho  ║                              │
                    │  ╚═══════════════╝                              │
  ┌──────────┐      │  ╔═══════════════╗    ╔═══════════════════════╗ │
  │ CASHIER  │──────┼─►║  Mở/Đóng ca ║    ║   Xử lý thanh toán   ║ │
  └──────────┘      │  ╚═══════════════╝    ╚═══════════════════════╝ │
        │           │  ╔═══════════════╗    ╔═══════════════════════╗ │
        └───────────┼─►║  Tạo order   ║    ║    Xem hóa đơn       ║ │
                    │  ╚═══════════════╝    ╚═══════════════════════╝ │
  ┌──────────┐      │  ╔═══════════════╗                              │
  │ KITCHEN  │──────┼─►║  Xem KDS     ║                              │
  └──────────┘      │  ╚═══════════════╝                              │
        │           │  ╔═══════════════╗                              │
        └───────────┼─►║ Cập nhật     ║                              │
                    │  ║ trạng thái   ║                              │
                    │  ╚═══════════════╝                              │
  ┌──────────┐      │  ╔═══════════════╗    ╔═══════════════════════╗ │
  │  WAITER  │──────┼─►║  Gọi món     ║    ║   Gửi lên bếp        ║ │
  └──────────┘      │  ╚═══════════════╝    ╚═══════════════════════╝ │
                    └─────────────────────────────────────────────────┘
```

---

## 4. Yêu cầu Chức năng (Functional Requirements)

### 4.1 Module Xác thực & Phân quyền
- FR-01: Đăng nhập bằng username/password
- FR-02: Đăng xuất, hủy session
- FR-03: Phân quyền theo role (OWNER/MANAGER/CASHIER/KITCHEN/WAITER)
- FR-04: Bảo vệ các route theo role — middleware RBAC

### 4.2 Module Quản lý Bàn
- FR-05: Hiển thị sơ đồ bàn theo khu vực/tầng
- FR-06: Kéo thả vị trí bàn trên sơ đồ (dnd-kit)
- FR-07: Xem trạng thái bàn realtime (AVAILABLE / OCCUPIED / RESERVED / CLEANING)
- FR-08: Thêm / sửa / xóa bàn và khu vực

### 4.3 Module Order
- FR-09: Tạo order mới cho bàn (DINE_IN) hoặc mang về (TAKE_AWAY)
- FR-10: Thêm/sửa/xóa món trong order
- FR-11: Chọn size (variant) và topping (modifier) cho từng món
- FR-12: Gửi order lên bếp (Kitchen Display System)
- FR-13: Xem trạng thái từng món: PENDING → SENT → PREPARING → READY → SERVED

### 4.4 Module Kitchen Display System (KDS)
- FR-14: Màn hình bếp hiển thị các ticket theo thứ tự thời gian
- FR-15: Bếp cập nhật trạng thái món: SENT → PREPARING → READY
- FR-16: Âm báo khi có order mới
- FR-17: Hiển thị thời gian chờ (prep time) cho từng món

### 4.5 Module Thanh toán & Hóa đơn
- FR-18: Tính tổng tiền tự động (subtotal + thuế VAT 8%)
- FR-19: Áp dụng voucher/combo giảm giá
- FR-20: Đổi điểm loyalty để giảm tiền
- FR-21: Thanh toán tiền mặt
- FR-22: Thanh toán QR (VietQR — quét mã ngân hàng)
- FR-23: Nhận webhook thanh toán (MoMo/VNPay) và tự động đánh dấu PAID
- FR-24: Tách hóa đơn theo người / theo món
- FR-25: In / xuất hóa đơn PDF

### 4.6 Module Quản lý Menu
- FR-26: CRUD danh mục menu
- FR-27: CRUD món ăn (tên, giá, ảnh, thời gian chế biến)
- FR-28: Thêm variant (size S/M/L) và modifier (topping) cho món
- FR-29: Upload ảnh món lên Cloudinary
- FR-30: Kích hoạt / tắt món

### 4.7 Module Combo & Khuyến mãi
- FR-31: Tạo combo (A + B + C giảm X%)
- FR-32: Set menu theo giờ (Happy Hour: 15h–18h)
- FR-33: Tự động áp dụng combo khi order đủ điều kiện

### 4.8 Module Nguyên liệu (Inventory)
- FR-34: Định nghĩa công thức (Recipe) cho từng món
- FR-35: Tự động trừ kho nguyên liệu khi tạo hóa đơn
- FR-36: Nhập kho nguyên liệu
- FR-37: Cảnh báo tồn kho thấp (low stock alert qua BullMQ)
- FR-38: Xem lịch sử xuất/nhập nguyên liệu

### 4.9 Module Đặt bàn (Reservation)
- FR-39: Khách đặt bàn trước (tên, điện thoại, giờ, số người)
- FR-40: Nhắc nhở tự động qua Telegram 30 phút trước giờ hẹn
- FR-41: Quản lý trạng thái: CONFIRMED / ARRIVED / NO_SHOW / CANCELLED

### 4.10 Module Khách hàng & Loyalty
- FR-42: Lưu thông tin khách hàng (tên, SĐT, ngày sinh)
- FR-43: Tích điểm sau mỗi giao dịch (10.000đ = 1 điểm)
- FR-44: Phân hạng thành viên: BRONZE / SILVER / GOLD / PLATINUM
- FR-45: Tạo voucher sinh nhật tự động
- FR-46: Đổi điểm lấy tiền giảm giá (1 điểm = 1.000đ)

### 4.11 Module Ca làm việc
- FR-47: Thu ngân mở ca (ghi nhận tiền quỹ đầu ca)
- FR-48: Thu ngân đóng ca (ghi nhận tiền quỹ cuối ca, in báo cáo ca)
- FR-49: Tất cả order & hóa đơn gắn với ca cụ thể

### 4.12 Module Báo cáo & Dashboard
- FR-50: Dashboard: doanh thu hôm nay, tháng này, top món bán chạy
- FR-51: Báo cáo doanh thu theo ngày/tuần/tháng
- FR-52: Báo cáo theo bàn / khu vực / ca / nhân viên
- FR-53: Báo cáo tồn kho nguyên liệu
- FR-54: Xuất báo cáo PDF/Excel

---

## 5. Yêu cầu Phi chức năng (Non-Functional Requirements)

| Nhóm | Yêu cầu |
|------|---------|
| **Hiệu năng** | API response < 500ms cho 95% request; WebSocket latency < 100ms |
| **Realtime** | Cập nhật trạng thái bàn/order trong vòng 1 giây |
| **Bảo mật** | JWT với access token 15 phút + refresh token 7 ngày; mật khẩu hash bcrypt (salt 12); HTTPS |
| **Tính sẵn sàng** | Uptime > 99% trong giờ kinh doanh (6h–23h) |
| **Khả năng mở rộng** | Hỗ trợ tối thiểu 50 bàn, 200 món, 10 nhân viên đồng thời |
| **Giao diện** | Responsive — hoạt động tốt trên màn hình 1920×1080 (máy tính) và 1024×768 (tablet) |
| **Dữ liệu** | Không mất dữ liệu khi server restart; backup database tự động hàng ngày |

---

## 6. Luồng nghiệp vụ chính (Main Business Flows)

### Flow 1: Gọi món & Phục vụ
```
Waiter chọn bàn → Gọi món (chọn size/topping) → Gửi bếp
→ KDS nhận ticket → Bếp làm → Bếp bấm "Xong"
→ Waiter nhận thông báo → Mang món ra → Bấm "Đã phục vụ"
```

### Flow 2: Thanh toán
```
Cashier chọn bàn → Xem order → Tạo hóa đơn
→ Áp dụng voucher/điểm → Chọn phương thức thanh toán
→ Tiền mặt: xác nhận → PAID
→ QR: hiển thị mã QR → Khách quét → Webhook → PAID
→ Bàn chuyển sang CLEANING
```

### Flow 3: Mở/Đóng ca
```
Cashier đăng nhập → Mở ca (nhập tiền quỹ đầu ca)
→ Bán hàng trong ca
→ Cuối ca: đóng ca (nhập tiền quỹ cuối ca)
→ Hệ thống tính: tiền thực thu = tổng tiền mặt - quỹ đầu ca
→ In báo cáo ca
```
