<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/store.svg" alt="RestoPOS Logo" width="120"/>
  <h1>🍽️ RestoPOS — Hệ thống POS Nhà hàng</h1>
  <p><strong>Dự án Đồ án Công nghệ Phần mềm</strong></p>
</div>

---

## 📖 Giới thiệu
**RestoPOS** là một hệ thống Quản lý Điểm bán hàng (Point of Sale) toàn diện, được thiết kế chuyên biệt cho mô hình nhà hàng và nhà hàng. Hệ thống giải quyết các bài toán thực tế như: order gọi món thời gian thực, quản lý sơ đồ bàn, tích hợp hiển thị màn hình bếp (KDS), quản lý tồn kho nguyên liệu, thanh toán QR tự động và báo cáo doanh thu chi tiết.

Dự án áp dụng kiến trúc Event-Driven kết hợp với Realtime WebSocket để mang lại trải nghiệm mượt mà, đồng bộ lập tức giữa nhân viên phục vụ, thu ngân và bếp.

## 🚀 Công nghệ sử dụng (Tech Stack)

### Backend
- **Framework:** Node.js 22 + Express 5 + TypeScript
- **Database & ORM:** PostgreSQL 16 + Prisma 6
- **Realtime:** Socket.IO
- **Cache & Queue:** Redis 7 + BullMQ (xử lý background jobs)
- **Security & Validation:** JWT, bcrypt, Zod

### Frontend
- **Framework:** Next.js 15 (App Router, Server Components)
- **UI & Styling:** Tailwind CSS v4 + shadcn/ui + dnd-kit (kéo thả)
- **State Management:** Zustand + TanStack Query

### DevOps & Tools
- **Deployment:** Docker & Docker Compose + Nginx
- **CI/CD:** GitHub Actions

## ✨ Cập nhật mới nhất
- **Sổ nhật ký điểm khách hàng (Loyalty Ledger):** Xem chi tiết lịch sử tích điểm, tiêu điểm và hoàn điểm minh bạch.
- **Tối ưu hóa UI/UX:** Dọn dẹp giao diện Sơ đồ bàn, tinh chỉnh menu theo quyền hạn.
- **Sửa lỗi Phân quyền & Điều hướng:** Ngăn chặn các tài khoản truy cập trái phép và tự động điều hướng đúng nghiệp vụ.

## ✨ Tính năng nổi bật

- 🔐 **Xác thực & Phân quyền (RBAC):** Hỗ trợ 5 vai trò (OWNER, MANAGER, CASHIER, KITCHEN, WAITER).
- 🗺️ **Sơ đồ bàn tương tác:** Kéo thả bàn vị trí tự do, màu sắc trạng thái realtime (Trống, Đang dùng, Đặt trước).
- 🛒 **Xử lý Order thông minh:** Hỗ trợ size, topping (variants/modifiers), gọi món tại bàn hoặc mang về.
- 🍳 **Kitchen Display System (KDS):** Màn hình hiển thị cho bếp với luồng Kanban, cập nhật trạng thái món ngay lập tức.
- 💳 **Thanh toán VietQR tự động:** Khách quét QR, hệ thống nhận webhook, tự động chốt hóa đơn.
- 📦 **Quản lý nguyên liệu (Inventory):** Công thức định lượng món ăn, tự động trừ kho và cảnh báo qua BullMQ khi tồn kho thấp.
- 🎁 **Khuyến mãi & Combo:** Hỗ trợ Happy Hour, combo món, mã giảm giá và hệ thống thẻ thành viên tích điểm.
- 📊 **Dashboard & Báo cáo:** Thống kê doanh thu, số đơn, top món bán chạy bằng biểu đồ (Recharts) thời gian thực.
- 🤖 **Tính năng nâng cao (AI/API):** Tự động nhắc lịch đặt bàn qua Telegram Bot, xuất hóa đơn PDF.

## 📚 Tài liệu hệ thống

Chi tiết toàn bộ tài liệu thiết kế, phân tích và hướng dẫn được đặt trong thư mục `docs/`.

| Tài liệu | Mô tả |
|----------|--------|
| [1. Phân tích yêu cầu](./docs/01-phan-tich-yeu-cau.md) | Use case, bài toán thực tế, FR/NFR |
| [2. Thiết kế hệ thống](./docs/02-thiet-ke-he-thong.md) | Kiến trúc MVC, ERD, Sequence & Activity Diagram |
| [3. Chức năng nghiệp vụ](./docs/03-chuc-nang-nghiep-vu.md) | Chi tiết 11 module chính, flow, state machine |
| [4. Thiết kế UI/UX](./docs/04-giao-dien-uxui.md) | Design system, cấu trúc màn hình |
| [5. Database & Bảo mật](./docs/05-co-so-du-lieu-bao-mat.md) | Schema, chuẩn hóa, phân quyền, security |
| [6. Dashboard & Báo cáo](./docs/06-dashboard-bao-cao.md) | Các loại báo cáo thống kê, biểu đồ |
| [7. Triển khai & Demo](./docs/07-trien-khai-demo.md) | Hướng dẫn chạy Docker, tài khoản test |
| [8. Báo cáo & Slide](./docs/08-bao-cao-slide.md) | Cấu trúc làm báo cáo và slide thuyết trình |
| [9. Tính năng nâng cao](./docs/09-tinh-nang-nang-cao.md) | VietQR, Telegram Bot, Cloudinary, Job queue |
| [10. Quản lý mã nguồn](./docs/10-chat-luong-ma-nguon.md) | Cấu trúc thư mục, quy chuẩn code, GitHub Flow |

## 🛠️ Hướng dẫn cài đặt & Chạy nhanh (Local)

1. **Clone repository:**
   ```bash
   git clone https://github.com/edacall199/POS-Nha_Hang-CT07.git
   cd POS-Nha_Hang-CT07
   ```

2. **Cấu hình môi trường:**
   Tạo file `.env` cho backend và frontend dựa trên file `.env.example`.
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Khởi chạy bằng Docker Compose:**
   Hệ thống yêu cầu cài đặt sẵn Docker Desktop.
   ```bash
   docker-compose up -d
   ```

4. **Khởi tạo cơ sở dữ liệu và dữ liệu mẫu:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npx prisma db seed
   ```

5. **Truy cập:**
   - Ứng dụng: `http://localhost:3000`
   - Tài khoản test (Thu ngân): `cashier` / `Demo@123`

*(Xem thêm chi tiết tại [Hướng dẫn triển khai](./docs/07-trien-khai-demo.md))*

---
<p align="center">
  <i>Được thiết kế và xây dựng bằng tất cả nhiệt huyết của Cá nhân ❤️</i>
</p>

