# 📊 Tiêu Chí 6: Dashboard, Thống Kê & Báo Cáo

> **Điểm tối đa:** 0.75 điểm  
> **Hệ thống:** RestoPOS – Phần mềm quản lý nhà hàng  
> **Thư viện:** Recharts, React, Prisma ORM  
> **Database:** PostgreSQL 16

---

## 1. 🏠 Dashboard Overview

### 1.1 Các KPI Thẻ Chính (Summary Cards)

| Card | Dữ liệu hiển thị | Icon | Màu sắc |
|------|-----------------|------|---------|
| 💰 Doanh thu hôm nay | Tổng tiền các đơn PAID trong ngày | 💵 | Xanh lá |
| 📅 Doanh thu tháng này | Tổng tiền tháng hiện tại | 📈 | Xanh dương |
| 🧾 Số đơn hôm nay | Đếm đơn hàng trong ngày | 📋 | Cam |
| 🍽️ Đơn đang phục vụ | Đơn status = serving/preparing | ⏳ | Vàng |
| 🪑 Bàn đang có khách | Tables với status = occupied | 🔴 | Đỏ |
| ⭐ Món bán chạy nhất | Top 1 món theo số lượng hôm nay | 🏆 | Tím |

### 1.2 Component Dashboard Card

```tsx
// src/components/dashboard/StatsCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  changePercent?: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'orange' | 'red' | 'purple';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title, value, prefix, suffix, changePercent, icon, color
}) => {
  const colorMap = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  const getTrend = () => {
    if (!changePercent) return <Minus size={14} className="text-gray-400" />;
    if (changePercent > 0) return <TrendingUp size={14} className="text-green-500" />;
    return <TrendingDown size={14} className="text-red-500" />;
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium opacity-70">{title}</span>
        <div className="opacity-80">{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold">
          {prefix}{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}{suffix}
        </span>
      </div>
      {changePercent !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-sm">
          {getTrend()}
          <span className={changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(changePercent)}% so với hôm qua
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
```

---

## 2. 📈 Biểu Đồ Với Recharts

### 2.1 Cài đặt

```bash
npm install recharts
npm install date-fns  # Xử lý ngày tháng
```

### 2.2 Line Chart – Doanh Thu 7 Ngày Gần Nhất

```tsx
// src/components/charts/RevenueLineChart.tsx
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface Props {
  data: RevenueData[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', notation: 'compact'
  }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-lg p-4 border border-gray-100">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      <p className="text-blue-600">
        Doanh thu: {formatCurrency(payload[0]?.value || 0)}
      </p>
      <p className="text-orange-500">
        Số đơn: {payload[1]?.value || 0} đơn
      </p>
    </div>
  );
};

export const RevenueLineChart: React.FC<Props> = ({ data }) => {
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(new Date(item.date), 'dd/MM', { locale: vi }),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        📈 Doanh Thu 7 Ngày Gần Nhất
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
            width={80}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#3B82F6' }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            name="Số đơn"
            stroke="#F97316"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 2.3 Bar Chart – Doanh Thu Theo Khu Vực

```tsx
// src/components/charts/ZoneRevenueBarChart.tsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer
} from 'recharts';

interface ZoneData {
  zone_name: string;
  total_revenue: number;
  total_orders: number;
}

interface Props {
  data: ZoneData[];
}

const ZONE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444'];

export const ZoneRevenueBarChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        🏢 Doanh Thu Theo Khu Vực
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis dataKey="zone_name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) =>
              new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v) + 'đ'
            }
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('vi-VN', {
                style: 'currency', currency: 'VND'
              }).format(value)
            }
          />
          <Bar dataKey="total_revenue" name="Doanh thu" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={ZONE_COLORS[index % ZONE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 2.4 Pie Chart – Phân Bổ Phương Thức Thanh Toán

```tsx
// src/components/charts/PaymentMethodPieChart.tsx
import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface PaymentData {
  method: string;
  count: number;
  total: number;
}

interface Props {
  data: PaymentData[];
}

const METHOD_CONFIG = {
  cash: { label: 'Tiền mặt', color: '#10B981' },
  momo: { label: 'MoMo', color: '#D946EF' },
  vnpay: { label: 'VNPay', color: '#0EA5E9' },
  vietqr: { label: 'VietQR', color: '#F97316' },
  card: { label: 'Thẻ ngân hàng', color: '#8B5CF6' },
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export const PaymentMethodPieChart: React.FC<Props> = ({ data }) => {
  const chartData = data.map(item => ({
    ...item,
    name: METHOD_CONFIG[item.method as keyof typeof METHOD_CONFIG]?.label || item.method,
    color: METHOD_CONFIG[item.method as keyof typeof METHOD_CONFIG]?.color || '#gray',
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        💳 Phương Thức Thanh Toán
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            dataKey="total"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name) => [
              new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value),
              name
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 2.5 Top Món Bán Chạy (Horizontal Bar Chart)

```tsx
// src/components/charts/TopMenuItemsChart.tsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface TopItemData {
  name: string;
  quantity: number;
  revenue: number;
}

interface Props {
  data: TopItemData[];
  limit?: number;
}

export const TopMenuItemsChart: React.FC<Props> = ({ data, limit = 10 }) => {
  const topData = [...data].sort((a, b) => b.quantity - a.quantity).slice(0, limit);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">
        🏆 Top {limit} Món Bán Chạy
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={topData} layout="vertical" margin={{ left: 120 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
          <Tooltip
            formatter={(value: number) => [`${value} phần`, 'Số lượng']}
          />
          <Bar dataKey="quantity" name="Số lượng" radius={[0, 4, 4, 0]}>
            {topData.map((_, index) => (
              <Cell
                key={index}
                fill={`hsl(${220 + index * 15}, 80%, ${60 - index * 3}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

---

## 3. 📋 Báo Cáo Ca Làm Việc

### 3.1 Cấu Trúc Báo Cáo Ca

| Mục | Nội dung |
|-----|---------|
| **Thông tin ca** | Nhân viên, ngày, giờ bắt đầu/kết thúc |
| **Tổng đơn** | Số đơn xử lý trong ca |
| **Doanh thu ca** | Tổng tiền các đơn PAID trong ca |
| **Tiền mặt** | Tiền đầu ca → cuối ca, chênh lệch |
| **Theo phương thức** | Breakdown cash/momo/vnpay/vietqr |
| **Đơn bị hủy** | Số đơn cancelled và lý do |

### 3.2 API Endpoint Báo Cáo Ca

```typescript
// src/routes/reports.routes.ts
router.get('/reports/shifts/:shiftId', authenticate, authorize('reports:read'), async (req, res) => {
  const { shiftId } = req.params;
  
  const shiftReport = await prisma.$queryRaw<ShiftReport[]>`
    SELECT 
      ws.id as shift_id,
      u.full_name as staff_name,
      ws.shift_date,
      ws.start_time,
      ws.end_time,
      ws.opening_cash,
      ws.closing_cash,
      COUNT(DISTINCT o.id)::int as total_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END)::int as cancelled_orders,
      COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.total_amount END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN p.method = 'cash' AND p.status = 'paid' THEN p.amount END), 0) as cash_revenue,
      COALESCE(SUM(CASE WHEN p.method != 'cash' AND p.status = 'paid' THEN p.amount END), 0) as digital_revenue
    FROM work_shifts ws
    JOIN users u ON ws.user_id = u.id
    LEFT JOIN orders o ON o.shift_id = ws.id
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE ws.id = ${shiftId}
    GROUP BY ws.id, u.full_name, ws.shift_date, ws.start_time, ws.end_time,
             ws.opening_cash, ws.closing_cash
  `;

  if (!shiftReport.length) {
    return res.status(404).json({ success: false, message: 'Ca làm việc không tồn tại' });
  }

  return res.json({ success: true, data: shiftReport[0] });
});
```

### 3.3 Prisma ORM Query – Báo Cáo Ca (Không dùng raw SQL)

```typescript
// src/services/shift-report.service.ts
export const getShiftReport = async (shiftId: string) => {
  const shift = await prisma.workShift.findUnique({
    where: { id: shiftId },
    include: {
      user: {
        select: { id: true, full_name: true, phone: true },
      },
      orders: {
        include: {
          payment: true,
          orderItems: {
            include: { menuItem: true },
          },
        },
      },
    },
  });

  if (!shift) throw new Error('Shift not found');

  const paidOrders = shift.orders.filter(o => o.status === 'paid');
  const cancelledOrders = shift.orders.filter(o => o.status === 'cancelled');

  const totalRevenue = paidOrders.reduce(
    (sum, o) => sum + Number(o.total_amount), 0
  );

  const revenueByMethod = paidOrders.reduce((acc, o) => {
    if (o.payment) {
      const method = o.payment.method;
      acc[method] = (acc[method] || 0) + Number(o.payment.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    shift: {
      id: shift.id,
      staffName: shift.user.full_name,
      date: shift.shift_date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      openingCash: Number(shift.opening_cash),
      closingCash: Number(shift.closing_cash),
    },
    summary: {
      totalOrders: shift.orders.length,
      paidOrders: paidOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      cashDifference:
        Number(shift.closing_cash) - Number(shift.opening_cash) - (revenueByMethod['cash'] || 0),
    },
    revenueByMethod,
  };
};
```

---

## 4. 📦 Báo Cáo Tồn Kho Nguyên Liệu

### 4.1 Cấu Trúc Báo Cáo

| Cột | Mô tả |
|-----|-------|
| Tên nguyên liệu | Tên và đơn vị |
| Tồn kho hiện tại | Số lượng còn trong kho |
| Ngưỡng tối thiểu | Min quantity cảnh báo |
| Trạng thái | 🟢 Đủ / 🟡 Sắp hết / 🔴 Hết hàng |
| Giá trị tồn kho | stock_quantity × cost_per_unit |
| Tiêu thụ hôm nay | Xuất kho trong ngày |

### 4.2 Query Báo Cáo Tồn Kho

```typescript
// src/services/inventory-report.service.ts
export const getInventoryReport = async (date?: Date) => {
  const reportDate = date || new Date();

  // Lấy tồn kho và tiêu thụ hôm nay
  const inventory = await prisma.ingredient.findMany({
    where: { deleted_at: null },
    include: {
      inventoryLogs: {
        where: {
          created_at: {
            gte: new Date(reportDate.setHours(0, 0, 0, 0)),
            lte: new Date(reportDate.setHours(23, 59, 59, 999)),
          },
          change_quantity: { lt: 0 }, // Chỉ lấy xuất kho
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return inventory.map(item => {
    const todayConsumed = item.inventoryLogs.reduce(
      (sum, log) => sum + Math.abs(Number(log.change_quantity)), 0
    );

    const stockValue = Number(item.stock_quantity) * Number(item.cost_per_unit);
    
    let status: 'sufficient' | 'low' | 'out_of_stock';
    if (Number(item.stock_quantity) <= 0) status = 'out_of_stock';
    else if (Number(item.stock_quantity) <= Number(item.min_quantity)) status = 'low';
    else status = 'sufficient';

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      stockQuantity: Number(item.stock_quantity),
      minQuantity: Number(item.min_quantity),
      status,
      stockValue,
      todayConsumed,
      supplier: item.supplier,
    };
  });
};
```

---

## 5. 📊 Báo Cáo Theo Bàn & Nhân Viên

### 5.1 Báo Cáo Theo Bàn (Raw SQL với Prisma)

```typescript
// src/services/table-report.service.ts
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export const getTableReport = async (startDate: Date, endDate: Date) => {
  const result = await prisma.$queryRaw<TableReportRow[]>(
    Prisma.sql`
      SELECT
        t.table_number,
        z.name as zone_name,
        COUNT(DISTINCT o.id)::int as total_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) as total_revenue,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (o.paid_at - o.created_at)) / 60)
          FILTER (WHERE o.paid_at IS NOT NULL), 0
        ) as avg_dining_minutes,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_count
      FROM tables t
      JOIN zones z ON t.zone_id = z.id
      LEFT JOIN orders o ON o.table_id = t.id
        AND o.created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY t.id, t.table_number, z.name
      ORDER BY total_revenue DESC
    `
  );

  return result;
};
```

### 5.2 Báo Cáo Theo Nhân Viên

```typescript
// src/services/staff-report.service.ts
export const getStaffReport = async (startDate: Date, endDate: Date) => {
  const result = await prisma.$queryRaw<StaffReportRow[]>(
    Prisma.sql`
      SELECT
        u.id as user_id,
        u.full_name,
        r.name as role_name,
        COUNT(DISTINCT ws.id)::int as total_shifts,
        SUM(
          EXTRACT(EPOCH FROM (COALESCE(ws.end_time, NOW()) - ws.start_time)) / 3600
        )::numeric(10,1) as total_hours,
        COUNT(DISTINCT o.id)::int as total_orders_handled,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) as total_revenue_handled
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN work_shifts ws ON ws.user_id = u.id
        AND ws.shift_date BETWEEN ${startDate} AND ${endDate}
      LEFT JOIN orders o ON o.user_id = u.id
        AND o.created_at BETWEEN ${startDate} AND ${endDate}
      WHERE u.is_active = true AND u.deleted_at IS NULL
      GROUP BY u.id, u.full_name, r.name
      ORDER BY total_revenue_handled DESC
    `
  );

  return result;
};
```

---

## 6. 🔍 Các SQL Query Thống Kê Quan Trọng

### 6.1 Doanh Thu Theo Ngày (7 ngày gần nhất)

```sql
-- Sử dụng Prisma.$queryRaw
SELECT
  DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as date,
  COUNT(DISTINCT o.id)::int as total_orders,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) as total_revenue
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '7 days'
  AND o.status != 'cancelled'
GROUP BY DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
ORDER BY date ASC;
```

### 6.2 Top 10 Món Bán Chạy Theo Tháng

```sql
SELECT
  mi.id,
  mi.name,
  mi.price,
  SUM(oi.quantity)::int as total_quantity,
  SUM(oi.subtotal) as total_revenue,
  COUNT(DISTINCT oi.order_id)::int as order_count
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE 
  o.status = 'paid'
  AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', NOW())
GROUP BY mi.id, mi.name, mi.price
ORDER BY total_quantity DESC
LIMIT 10;
```

### 6.3 Doanh Thu Theo Giờ Trong Ngày

```sql
SELECT
  EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as hour,
  COUNT(o.id)::int as order_count,
  COALESCE(SUM(o.total_amount), 0) as revenue
FROM orders o
WHERE 
  o.status = 'paid'
  AND DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
GROUP BY hour
ORDER BY hour ASC;
```

### 6.4 So Sánh Doanh Thu Tháng Này vs Tháng Trước

```sql
SELECT
  CASE 
    WHEN DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', NOW())
    THEN 'current_month'
    ELSE 'last_month'
  END as period,
  COUNT(DISTINCT o.id)::int as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(AVG(o.total_amount), 0) as avg_order_value
FROM orders o
WHERE 
  o.status = 'paid'
  AND o.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY period;
```

### 6.5 Nguyên Liệu Sắp Hết (Cảnh Báo)

```sql
SELECT
  i.name,
  i.unit,
  i.stock_quantity,
  i.min_quantity,
  i.supplier,
  ROUND((i.stock_quantity / NULLIF(i.min_quantity, 0)) * 100, 1) as stock_percent
FROM ingredients i
WHERE 
  i.stock_quantity <= i.min_quantity * 1.2  -- Cảnh báo khi còn < 120% ngưỡng
  AND i.deleted_at IS NULL
ORDER BY stock_percent ASC;
```

### 6.6 Prisma ORM – Doanh Thu Dashboard

```typescript
// src/services/dashboard.service.ts
export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayRevenue, monthRevenue, todayOrders, activeOrders, occupiedTables, lowStock] =
    await Promise.all([
      // Doanh thu hôm nay
      prisma.order.aggregate({
        where: { status: 'paid', paid_at: { gte: today, lt: tomorrow } },
        _sum: { total_amount: true },
        _count: { id: true },
      }),

      // Doanh thu tháng này
      prisma.order.aggregate({
        where: {
          status: 'paid',
          paid_at: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
        _sum: { total_amount: true },
      }),

      // Số đơn hôm nay
      prisma.order.count({
        where: { created_at: { gte: today, lt: tomorrow } },
      }),

      // Đơn đang phục vụ
      prisma.order.count({
        where: { status: { in: ['confirmed', 'preparing', 'ready', 'served'] } },
      }),

      // Bàn đang có khách
      prisma.table.count({ where: { status: 'occupied' } }),

      // Nguyên liệu sắp hết
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::int as count FROM ingredients
        WHERE stock_quantity <= min_quantity AND deleted_at IS NULL
      `,
    ]);

  return {
    todayRevenue: Number(todayRevenue._sum.total_amount || 0),
    todayOrders: todayRevenue._count.id,
    monthRevenue: Number(monthRevenue._sum.total_amount || 0),
    activeOrders,
    occupiedTables,
    lowStockCount: Number(lowStock[0]?.count || 0),
  };
};
```

---

## 7. 📤 Xuất Báo Cáo

### 7.1 Xuất Excel với xlsx

```typescript
// src/utils/export.util.ts
import xlsx from 'xlsx';

export const exportToExcel = (data: any[], sheetName: string, filename: string) => {
  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  
  // Tự động điều chỉnh độ rộng cột
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2,
  }));
  ws['!cols'] = colWidths;
  
  xlsx.writeFile(wb, filename);
  return filename;
};
```

---

> 📌 **Lưu ý Performance:** Các query báo cáo phức tạp nên được cache bằng Redis với TTL 5-10 phút để tránh load nặng cho database trong giờ cao điểm.
