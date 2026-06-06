# Tiêu chí 8 — Báo cáo, Slide & Trình bày Đồ án
> **Điểm tối đa:** 0.75 | **Mục tiêu:** Xuất sắc (100%)

---

## 1. Cấu trúc Báo cáo Đồ án (outline đầy đủ)

### Chương 1: Giới thiệu
- 1.1. Tổng quan đề tài
- 1.2. Lý do chọn đề tài (Bài toán thực tế nhà hàng VN)
- 1.3. Mục tiêu hệ thống
- 1.4. Phạm vi thực hiện
- 1.5. Đối tượng sử dụng
- 1.6. Công nghệ sử dụng

### Chương 2: Phân tích Yêu cầu
- 2.1. Khảo sát hiện trạng (nhà hàng quản lý thủ công → vấn đề)
- 2.2. Xác định actors & vai trò (OWNER/MANAGER/CASHIER/KITCHEN/WAITER)
- 2.3. Yêu cầu chức năng (54 FR đã liệt kê)
- 2.4. Yêu cầu phi chức năng (performance, security, availability)
- 2.5. Use Case Diagram tổng thể
- 2.6. Mô tả chi tiết từng Use Case chính

### Chương 3: Thiết kế Hệ thống
- 3.1. Kiến trúc tổng thể (Client–Nginx–API–DB)
- 3.2. Thiết kế cơ sở dữ liệu (ERD, schema 24 bảng)
- 3.3. Thiết kế API (RESTful, 54+ endpoints)
- 3.4. Thiết kế Frontend (App Router structure, component hierarchy)
- 3.5. Sequence Diagram (3 luồng chính)
- 3.6. Activity Diagram (luồng order, luồng thanh toán)
- 3.7. Thiết kế realtime (Socket.IO rooms & events)

### Chương 4: Công nghệ Sử dụng
- 4.1. Backend: Node.js 22 + Express 5 + TypeScript 5
- 4.2. ORM & Database: Prisma 6 + PostgreSQL 16
- 4.3. Cache & Queue: Redis + BullMQ
- 4.4. Realtime: Socket.IO
- 4.5. Frontend: Next.js 15 App Router
- 4.6. UI: shadcn/ui + Tailwind CSS v4
- 4.7. State Management: Zustand + TanStack Query
- 4.8. DevOps: Docker Compose + GitHub Actions + Nginx
- 4.9. Lý do lựa chọn (bảng so sánh)

### Chương 5: Chức năng Đã Xây dựng
- 5.1. Module Xác thực & Phân quyền
- 5.2. Module Quản lý Bàn & Sơ đồ
- 5.3. Module Gọi món & Xử lý Order
- 5.4. Kitchen Display System (KDS)
- 5.5. Module Thanh toán (Tiền mặt + VietQR + Tách bill)
- 5.6. Module Quản lý Menu & Combo
- 5.7. Module Nguyên liệu & Công thức
- 5.8. Module Đặt bàn & Nhắc nhở Telegram
- 5.9. Module Loyalty & Thành viên
- 5.10. Module Ca làm việc
- 5.11. Dashboard & Báo cáo

### Chương 6: Cơ sở Dữ liệu & Bảo mật
- 6.1. Thiết kế database (24 bảng, đầy đủ FK)
- 6.2. Chuẩn hóa dữ liệu
- 6.3. Xác thực dữ liệu (Zod validation)
- 6.4. Bảo mật: JWT, bcrypt, RBAC, rate limiting, HTTPS

### Chương 7: Tính năng Nâng cao
- 7.1. Tích hợp VietQR
- 7.2. Webhook thanh toán MoMo/VNPay
- 7.3. Xuất hóa đơn PDF
- 7.4. Gửi hóa đơn qua Email
- 7.5. Nhắc nhở qua Telegram Bot
- 7.6. AI gợi ý combo

### Chương 8: Kiểm thử
- 8.1. Kiểm thử unit (Jest)
- 8.2. Kiểm thử API (Postman/Playwright)
- 8.3. Kiểm thử giao diện (E2E)
- 8.4. Kiểm thử tải (k6)

### Chương 9: Hướng dẫn Cài đặt & Chạy thử
- 9.1. Yêu cầu hệ thống
- 9.2. Chạy local (Docker Compose)
- 9.3. Tài khoản demo & dữ liệu mẫu
- 9.4. Hướng dẫn demo luồng nghiệp vụ

### Chương 10: Phân công Công việc

| Thành viên | Vai trò | Công việc |
|-----------|---------|----------|
| (Tên) | Backend Lead | API, Socket.IO, BullMQ jobs |
| (Tên) | Frontend Lead | Next.js, UI components, stores |
| (Tên) | Database | Prisma schema, migrations, seed |
| (Tên) | DevOps | Docker, CI/CD, Nginx |
| (Tên) | Docs & QA | Tài liệu, kiểm thử |

### Chương 11: Kết quả & Hạn chế
- 11.1. Kết quả đạt được (checklist tính năng)
- 11.2. Hạn chế hiện tại
- 11.3. Hướng phát triển tiếp theo

---

## 2. Cấu trúc Slide Trình bày (30 slides)

| Slide | Nội dung |
|-------|---------|
| 1 | Trang bìa: Tên đồ án, nhóm, GVHD |
| 2 | Mục lục |
| 3-4 | Giới thiệu bài toán (thống kê thực tế nhà hàng VN) |
| 5 | Mục tiêu & phạm vi hệ thống |
| 6 | Actors & vai trò |
| 7 | Use Case Diagram |
| 8 | Kiến trúc hệ thống (sơ đồ layer) |
| 9 | Sơ đồ ERD (highlight) |
| 10 | Công nghệ sử dụng (tech stack visual) |
| 11-12 | Demo: Đăng nhập, sơ đồ bàn |
| 13-14 | Demo: Gọi món + gửi bếp |
| 15 | Demo: Kitchen Display System |
| 16-17 | Demo: Thanh toán QR + tiền mặt |
| 18 | Demo: Tách hóa đơn |
| 19 | Demo: Dashboard & báo cáo |
| 20 | Demo: Quản lý nguyên liệu |
| 21 | Tính năng nâng cao (VietQR, Telegram, PDF) |
| 22 | Bảo mật (JWT flow, bcrypt, RBAC) |
| 23 | Kiểm thử & kết quả |
| 24 | Phân công & đóng góp (Git commits) |
| 25 | Kết quả đạt được (checklist) |
| 26 | Hạn chế & hướng phát triển |
| 27 | Q&A |

---

## 3. Câu hỏi thường gặp & Gợi ý trả lời

**Q: Tại sao chọn Next.js 15 thay vì React thuần?**
> A: Next.js 15 App Router cho phép SSR + Server Components giúp trang tải nhanh hơn, SEO tốt hơn, và có built-in routing/layout. Với Admin dashboard nhiều dữ liệu, Server Components giúp fetch data trực tiếp mà không cần round-trip API.

**Q: Socket.IO hoạt động như thế nào trong hệ thống?**
> A: Khi thu ngân gửi order lên bếp, backend emit event `kitchen:new_items` vào room `kitchen-room`. Màn hình KDS đang listen room này sẽ nhận ngay lập tức, không cần reload trang. Ngược lại khi bếp xong món, emit `order:item_status_changed` vào `pos-room` để thu ngân biết mang món ra.

**Q: Tại sao dùng Prisma thay vì Sequelize/TypeORM?**
> A: Prisma 6 có type-safety hoàn toàn — query result có đúng type TypeScript, không cần cast. Migration tự động từ schema. Performance tốt hơn với PostgreSQL. Schema-first approach dễ maintain hơn.

**Q: Làm sao đảm bảo nguyên liệu trừ chính xác?**
> A: Sử dụng Prisma `$transaction` — toàn bộ thao tác trừ nguyên liệu và tạo hóa đơn nằm trong 1 database transaction. Nếu bất kỳ bước nào thất bại, toàn bộ rollback. Điều này đảm bảo không bao giờ có trường hợp tạo hóa đơn thành công nhưng chưa trừ kho.

**Q: VietQR hoạt động thế nào?**
> A: Khi khách chọn QR, hệ thống gọi VietQR API tạo QR với nội dung chuyển khoản duy nhất (mã hóa đơn). Đồng thời BullMQ queue một job polling mỗi 5 giây kiểm tra webhook. Khi nhận webhook báo đã nhận tiền, khớp với nội dung chuyển khoản → tự động cập nhật invoice PAID + bàn CLEANING.
