'use client';

import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, TrendingUp, Users, Loader2, Download
} from 'lucide-react';

import { useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('day');

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'dashboard', timeRange],
    queryFn: async () => {
      const res: any = await api.get(`/analytics/dashboard?timeRange=${timeRange}`);
      return res.data;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-red-500 gap-4">
        <p>Lỗi tải dữ liệu. Vui lòng thử lại.</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 underline">Tải lại trang</button>
      </div>
    );
  }

  const { summary, revenueChart, topItems } = stats;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Revenue Sheet
    const revenueWs = XLSX.utils.json_to_sheet(
      revenueChart.map((item: any) => ({
        'Ngày': item.date,
        'Tổng doanh thu': item.total,
        'Tại quán': item.dineIn,
        'Mang về': item.takeaway
      }))
    );
    XLSX.utils.book_append_sheet(wb, revenueWs, 'Doanh thu 7 ngày');

    // 2. Top Items Sheet
    const topItemsWs = XLSX.utils.json_to_sheet(
      topItems.map((item: any, index: number) => ({
        'Top': index + 1,
        'Tên món': item.name,
        'Số lượng bán': item.quantity,
        'Doanh thu mang lại': item.revenue
      }))
    );
    XLSX.utils.book_append_sheet(wb, topItemsWs, 'Món bán chạy');

    // Generate and download
    XLSX.writeFile(wb, `BaoCao_DoanhThu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tổng quan</h2>
          <p className="text-muted-foreground">
            Xin chào! Đây là tình hình kinh doanh hôm nay.
          </p>
        </div>
        <Button onClick={handleExportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download className="h-4 w-4" /> Xuất Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu hôm nay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.revenueToday)}</div>
            <p className={`text-xs flex items-center mt-1 ${summary.revenueGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {summary.revenueGrowth >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
              {Math.abs(summary.revenueGrowth)}% so với hôm qua
            </p>
            {summary.shiftDifferenceToday !== 0 && (
              <p className={`text-xs flex items-center mt-2 font-medium ${summary.shiftDifferenceToday > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                Lệch ca: {summary.shiftDifferenceToday > 0 ? '+' : ''}{formatCurrency(summary.shiftDifferenceToday)}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số đơn hàng</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summary.ordersCountToday}</div>
            <p className={`text-xs flex items-center mt-1 ${summary.ordersGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {summary.ordersGrowth >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
              {Math.abs(summary.ordersGrowth)}% so với hôm qua
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách trung bình/Bàn</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-muted-foreground mt-1">
              +0.5 so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ tăng trưởng (Tháng)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12.5%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tốt hơn 4% so với kỳ vọng
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Biểu đồ doanh thu</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? 'So sánh theo 5 năm gần nhất' : timeRange === 'month' ? 'So sánh theo 12 tháng gần nhất' : 'So sánh theo 30 ngày gần nhất'}
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(val) => setTimeRange(val as string)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `${value / 1000000}M`}
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="dineIn" name="Tại quán" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="takeaway" name="Mang về" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Món bán chạy nhất</CardTitle>
            <CardDescription>
              Top 5 món có số lượng bán nhiều nhất trong 30 ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 mt-4">
              {topItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Chưa có dữ liệu bán hàng</div>
              ) : (
                topItems.map((item: any, index: number) => (
                  <div key={item.id} className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-slate-50 dark:bg-slate-900 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="ml-4 space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Đã bán: {item.quantity} phần</p>
                    </div>
                    <div className="ml-auto font-medium text-emerald-600">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
