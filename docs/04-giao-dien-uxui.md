# Tiêu chí 4 — Giao diện & Trải nghiệm Người dùng (UI/UX)
> **Điểm tối đa:** 1.0 | **Mục tiêu:** Xuất sắc (100%)

---

## 1. Design System

### Màu sắc & Theme
```css
/* Tailwind CSS v4 — Custom Design Tokens */
:root {
  --color-primary: oklch(55% 0.2 250);      /* Xanh dương đậm */
  --color-accent:  oklch(70% 0.25 30);       /* Cam nổi bật */
  --color-success: oklch(65% 0.18 142);      /* Xanh lá */
  --color-danger:  oklch(55% 0.22 20);       /* Đỏ cảnh báo */
  --color-surface: oklch(12% 0.01 260);      /* Nền tối (dark mode) */
  --color-muted:   oklch(40% 0.01 260);      /* Text phụ */
}
```

### Typography
- Font chính: **Inter** (Google Fonts) — đọc số tiền và tên món rõ ràng
- Font số: **JetBrains Mono** — hiển thị mã order, mã hóa đơn

### Nguyên tắc thiết kế
- **Dark mode mặc định**: giảm mỏi mắt cho nhân viên làm ca dài
- **Touch-friendly**: nút tối thiểu 44×44px — hỗ trợ màn hình cảm ứng tablet
- **High contrast**: text trên nền tối đạt WCAG AA
- **Micro-animations**: phản hồi thị giác khi thao tác (thêm món, chuyển trạng thái)

---

## 2. Các màn hình chính

### 2.1 Màn hình Đăng nhập
- Form đăng nhập tối giản, logo nhà hàng nổi bật
- Hiển thị lỗi inline (không dùng alert)
- Auto-focus vào input username
- Enter để submit

### 2.2 Màn hình POS Chính (Thu ngân)
```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo]  RestoPOS            Ca: Nguyễn Văn A   [Đóng ca] [Đăng xuất]│
├──────────┬──────────────────────────────┬───────────────────────┤
│ SƠ ĐỒ   │         MENU                 │    ORDER PANEL        │
│ BÀN     │                              │                       │
│         │ [Đồ uống] [Đồ ăn] [Tráng miệng]│ Bàn A1 — 2 khách   │
│ [A1 🟡] │ ┌────────┐ ┌────────┐        │ ─────────────────────│
│ [A2 🟢] │ │Cà phê  │ │Trà sữa │        │ 1x Cà phê sữa   35k │
│ [A3 🔴] │ │sữa     │ │trân châu│        │ 2x Bánh mì    60k   │
│ [B1 🟢] │ │35.000đ │ │55.000đ │        │ ─────────────────────│
│ [B2 🟡] │ └────────┘ └────────┘        │ Subtotal:    95.000đ │
│ [B3 🟢] │ ┌────────┐ ┌────────┐        │ VAT 8%:       7.600đ │
│         │ │Bánh mì │ │Phở bò  │        │ **Tổng: 102.600đ**  │
│  [Khu B]│ │30.000đ │ │75.000đ │        │ ─────────────────────│
│         │ └────────┘ └────────┘        │ [Gửi bếp] [Thanh toán]│
└──────────┴──────────────────────────────┴───────────────────────┘
```

**Chi tiết:**
- **Cột trái (sơ đồ bàn)**: Bàn được tô màu theo trạng thái — xanh (trống), vàng (đang dùng), đỏ (đặt trước). Click để chọn bàn.
- **Cột giữa (menu)**: Filter theo danh mục, tìm kiếm real-time, ảnh món từ Cloudinary, giá hiển thị rõ
- **Cột phải (order panel)**: Danh sách món đã chọn, tổng tiền tự tính, nút hành động

### 2.3 Màn hình Kitchen Display System (KDS)
```
┌─────────────────────────────────────────────────────────────────┐
│                    🍳 KITCHEN DISPLAY                           │
├──────────────────┬───────────────────┬────────────────────────┤
│  🟡 MỚI VÀO (3) │  🔵 ĐANG LÀM (2) │  🟢 SẴN SÀNG (1)     │
│                  │                   │                        │
│ ┌──────────────┐ │ ┌───────────────┐ │ ┌──────────────────┐  │
│ │ Bàn A1 #021  │ │ │ Bàn B2 #019  │ │ │ Bàn A3 #018      │  │
│ │ 2x Phở bò   │ │ │ 1x Bún bò    │ │ │ 1x Gà xào       │  │
│ │ 1x Cơm sườn │ │ │ [Đang làm ⏱]│ │ │ [Mang ra ✓]     │  │
│ │ 5 phút trước│ │ │              │ │ │                  │  │
│ │ [Bắt đầu ▶] │ │ │ [Xong ✅]    │ │ └──────────────────┘  │
│ └──────────────┘ │ └───────────────┘ │                        │
└──────────────────┴───────────────────┴────────────────────────┘
```

**Chi tiết:**
- Màn hình full-screen, font lớn — dễ đọc từ xa trong bếp
- Màu nền tối, chữ sáng — thân thiện với môi trường sáng của bếp
- Âm báo khi có ticket mới
- Hiển thị thời gian chờ và đếm ngược

### 2.4 Modal Thanh toán
- Hiển thị tổng hóa đơn lớn, rõ ràng
- Tab chọn phương thức: Tiền mặt | QR VietQR | Thẻ
- Tiền mặt: nhập số tiền khách đưa → tự tính tiền thối
- QR: hiển thị mã QR fullscreen, auto-refresh sau 5 phút
- Nút "Xác nhận" lớn, màu xanh lá

### 2.5 Màn hình Sơ đồ bàn (Table Map)
- Canvas kéo thả bàn bằng dnd-kit
- Bàn hình chữ nhật/tròn với số bàn và trạng thái
- Filter theo khu vực (Khu A, Khu B, Tầng 2...)
- Button thêm/xóa bàn

### 2.6 Dashboard Admin
- Stat cards: Doanh thu hôm nay, Số đơn, Bàn đang dùng, Tồn kho thấp
- Line chart: Doanh thu 7 ngày qua (Recharts)
- Bar chart: Top 10 món bán chạy
- Bảng: Đơn hàng mới nhất

---

## 3. Responsive & Compatibility

| Thiết bị | Độ phân giải | Tối ưu hóa |
|---------|-------------|-----------|
| Máy tính (POS chính) | 1920×1080 | Full 3-column layout |
| Tablet (KDS bếp) | 1024×768 | Full-screen Kanban board |
| Tablet (phục vụ) | 768×1024 | Simplified order panel |
| Điện thoại | 390×844 | Admin dashboard only |

---

## 4. Micro-animations & Interactions

| Sự kiện | Animation |
|---------|----------|
| Thêm món vào giỏ | Card pulse + số lượng ++  |
| Order item status đổi | Slide + fade transition |
| Bàn đổi trạng thái | Color interpolation 0.3s |
| Mở modal | Scale-in từ 0.95 → 1.0 |
| Nút submit | Loading spinner → checkmark |
| Toast notification | Slide-in từ phải + auto-dismiss 3s |

---

## 5. Accessibility & UX

- **Keyboard navigation**: Toàn bộ actions có thể thực hiện bằng phím tắt
- **Error states**: Mỗi form field có lỗi inline rõ ràng
- **Loading states**: Skeleton loading thay vì spinner trống
- **Empty states**: Màn hình trống có hướng dẫn hành động tiếp theo
- **Confirmation dialogs**: Hành động không thể hoàn tác luôn có confirm
