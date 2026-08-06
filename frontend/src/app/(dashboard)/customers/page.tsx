'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus, Search, UserSquare, History } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    fullName: ''
  });
  
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: pointHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['pointHistory', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const res: any = await api.get(`/customers/${selectedCustomer.id}/points`);
      return res.data;
    },
    enabled: !!selectedCustomer && isHistoryDialogOpen,
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res: any = await api.get('/customers');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/customers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Đã lưu thông tin khách hàng!');
      setIsDialogOpen(false);
      setFormData({ phone: '', fullName: '' });
    },
    onError: (err: any) => toast.error('Lỗi khi lưu', { description: err.message })
  });

  const filteredCustomers = customers.filter((c: any) => 
    c.phone.includes(search) || 
    c.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Khách hàng & Tích điểm</h2>
          <p className="text-muted-foreground">
            Quản lý thông tin khách hàng thân thiết.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm khách hàng
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm theo SĐT hoặc Tên..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead className="text-right">Điểm tích lũy</TableHead>
              <TableHead className="text-right">Tổng chi tiêu</TableHead>
              <TableHead className="text-center">Số đơn</TableHead>
              <TableHead className="text-right">Ngày tham gia</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Không tìm thấy khách hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <UserSquare className="h-4 w-4 text-slate-400" />
                    {customer.fullName}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {customer.points} pt
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {formatCurrency(Number(customer.totalSpent))}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer._count?.orders || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {format(new Date(customer.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsHistoryDialogOpen(true);
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Lịch sử điểm
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Thêm/Cập nhật Khách hàng</DialogTitle>
              <DialogDescription>
                Hệ thống sẽ tự động cập nhật nếu SĐT đã tồn tại.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName} 
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu khách hàng
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lịch sử điểm thưởng</DialogTitle>
            <DialogDescription>
              Khách hàng: {selectedCustomer?.fullName} - {selectedCustomer?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pointHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Chưa có giao dịch điểm nào.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Giao dịch</TableHead>
                    <TableHead className="text-right">Điểm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointHistory.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{tx.order?.orderCode || '-'}</TableCell>
                      <TableCell>
                        {tx.points > 0 ? (
                          <span className="text-emerald-600 font-medium">Tích điểm</span>
                        ) : (
                          <span className="text-red-600 font-medium">Tiêu điểm / Hoàn lại</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
