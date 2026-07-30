'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Eye, Search, Receipt, FileSearch } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    }
  });

  // Backend orders list is usually returned in response.data directly or response (if our interceptor unwraps it, wait: our interceptor doesn't unwrap).
  // Actually, our API usually returns { success: true, data: [...] }.
  const orders = response?.data || response || [];
  const validOrders = Array.isArray(orders) ? orders : [];
  
  const filteredOrders = validOrders.filter((o: any) => 
    o.orderCode?.toLowerCase().includes(search.toLowerCase()) || 
    o.table?.tableNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500">Đã thanh toán</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Chờ thanh toán</Badge>;
      case 'cancelled': return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh sách Hóa đơn</h1>
          <p className="text-slate-500">Quản lý và tra cứu các hóa đơn thanh toán</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm theo mã HĐ hoặc số bàn..." 
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Receipt className="h-12 w-12 opacity-20 mb-4" />
              <p>Không tìm thấy hóa đơn nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Bàn</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderCode}</TableCell>
                    <TableCell>
                      {order.table?.tableNumber ? (
                        <span className="font-medium text-primary">Bàn {order.table.tableNumber}</span>
                      ) : (
                        <span className="text-slate-500">Mang về</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/invoice-preview/${order.id}`)}>
                          <FileSearch className="h-4 w-4 mr-2" /> Xem trước
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/payment/${order.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Thanh toán
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
