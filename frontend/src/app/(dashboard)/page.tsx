'use client';

import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, TrendingUp, Users, Loader2, Download
} from 'lucide-react';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('day');
  const [paymentTimeRange, setPaymentTimeRange] = useState('day');
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    
    // Connect if not connected (dashboard might be the first page they land on)
    if (!socket.connected) {
      socket.connect();
    }

    const onAnalyticsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    };

    socket.on('analytics:update', onAnalyticsUpdate);

    return () => {
      socket.off('analytics:update', onAnalyticsUpdate);
    };
  }, [queryClient]);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'dashboard', timeRange],
    queryFn: async () => {
      const res: any = await api.get(`/analytics/dashboard?timeRange=${timeRange}`);
      return res.data;
    }
  });

  const { data: paymentStats } = useQuery({
    queryKey: ['analytics', 'payment', paymentTimeRange],
    queryFn: async () => {
      const res: any = await api.get(`/analytics/dashboard?timeRange=${paymentTimeRange}`);
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
  const paymentMethods = paymentStats?.paymentMethods || stats.paymentMethods || [];

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

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

      {/* Top Row: 4 Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu hôm nay</CardTitle>
            <div className={`text-xs px-2 py-1 rounded-full ${summary.revenueGrowth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {summary.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.revenueGrowth)}%
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.revenueToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.revenueMonth || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng hôm nay</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.ordersCountToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Món bán chạy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold break-words" title={topItems[0]?.name || 'Không có'}>
              {topItems[0]?.name || 'Không có'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Full Width Chart */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Biểu đồ doanh thu</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? 'So sánh theo 5 năm gần nhất' : timeRange === 'quarter' ? 'So sánh theo 4 quý gần nhất' : timeRange === 'month' ? 'So sánh theo 12 tháng gần nhất' : 'So sánh theo 30 ngày gần nhất'}
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(val) => setTimeRange(val as string)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý (mùa)</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="dineIn" name="Tại quán" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="takeaway" name="Mang về" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Items & Payment Methods */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top 5 món bán chạy</CardTitle>
            <CardDescription>
              Top 5 món có số lượng bán nhiều nhất trong 30 ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {topItems.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Chưa có dữ liệu bán hàng</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={topItems} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={120}
                      tick={{ fill: '#f8fafc', fontSize: 14, fontWeight: 500 }}
                    />
                    <RechartsTooltip 
                      formatter={(value: any, name: any, props: any) => [`${value} phần (${formatCurrency(props.payload.revenue)})`, 'Đã bán']}
                      cursor={{ fill: '#334155' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                    />
                    <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Hình thức thanh toán</CardTitle>
              <CardDescription>
                Tỉ trọng doanh thu theo các hình thức tính tiền
              </CardDescription>
            </div>
            <Select value={paymentTimeRange} onValueChange={(val) => setPaymentTimeRange(val as string)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {paymentMethods.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Chưa có dữ liệu thanh toán</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethods.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
