'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, PlayCircle, StopCircle, Clock, Banknote } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Dialog State
  const [isOpenShiftDialog, setIsOpenShiftDialog] = useState(false);
  const [isCloseShiftDialog, setIsCloseShiftDialog] = useState(false);
  
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch Shifts
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res: any = await api.get('/shifts');
      return res.data;
    }
  });

  // Find active shift for current user
  const myActiveShift = shifts.find((s: any) => s.userId === user?.id && s.status === 'open');

  // Open Shift Mutation
  const openMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/shifts', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Đã mở ca làm việc!');
      setIsOpenShiftDialog(false);
      setOpeningCash('');
      setNotes('');
    },
    onError: (err: any) => toast.error('Lỗi mở ca', { description: err.message })
  });

  // Close Shift Mutation
  const closeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.patch(`/shifts/${id}/close`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Đã chốt ca thành công!');
      setIsCloseShiftDialog(false);
      setClosingCash('');
      setNotes('');
    },
    onError: (err: any) => toast.error('Lỗi chốt ca', { description: err.message })
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openMutation.mutate({
      openingCash: Number(openingCash),
      notes
    });
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myActiveShift) return;
    closeMutation.mutate({
      id: myActiveShift.id,
      data: {
        closingCash: Number(closingCash),
        notes
      }
    });
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ca làm việc</h2>
          <p className="text-muted-foreground">
            Quản lý giao ca và đối soát tiền mặt.
          </p>
        </div>
        <div className="flex gap-2">
          {myActiveShift ? (
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                setClosingCash('');
                setNotes('');
                setIsCloseShiftDialog(true);
              }}
            >
              <StopCircle className="mr-2 h-4 w-4" /> Chốt ca
            </Button>
          ) : (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setOpeningCash('');
                setNotes('');
                setIsOpenShiftDialog(true);
              }}
            >
              <PlayCircle className="mr-2 h-4 w-4" /> Mở ca mới
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {myActiveShift && (
          <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 text-card-foreground shadow border-emerald-100 dark:border-emerald-900 col-span-full md:col-span-2">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-emerald-800 dark:text-emerald-400">Ca hiện tại của bạn</h3>
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">
                Bắt đầu lúc {format(new Date(myActiveShift.startTime), 'HH:mm')}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Tiền mặt đầu ca: {formatCurrency(Number(myActiveShift.openingCash))}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">TM Đầu ca</TableHead>
              <TableHead className="text-right text-emerald-700">TM Bán hàng</TableHead>
              <TableHead className="text-right">Khai báo Cuối ca</TableHead>
              <TableHead className="text-right">Chênh lệch</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Chưa có dữ liệu ca làm việc.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift: any) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">
                    {format(new Date(shift.shiftDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{shift.user?.fullName}</TableCell>
                  <TableCell>
                    {format(new Date(shift.startTime), 'HH:mm')} - {shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : '...'}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {formatCurrency(Number(shift.openingCash))}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {shift.cashSales != null ? '+' + formatCurrency(Number(shift.cashSales)) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {shift.closingCash !== null ? formatCurrency(Number(shift.closingCash)) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${Number(shift.difference) < 0 ? 'text-red-600' : Number(shift.difference) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {shift.difference !== null 
                      ? (Number(shift.difference) > 0 ? '+' : '') + formatCurrency(Number(shift.difference))
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {shift.status === 'open' ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Đang mở</Badge>
                    ) : (
                      <Badge variant="secondary">Đã chốt</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={isOpenShiftDialog} onOpenChange={setIsOpenShiftDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleOpenSubmit}>
            <DialogHeader>
              <DialogTitle>Mở ca làm việc</DialogTitle>
              <DialogDescription>Nhập số tiền mặt có trong két trước khi bắt đầu nhận khách.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="openingCash">Tiền mặt đầu ca (VNĐ)</Label>
                <Input 
                  id="openingCash" 
                  type="number" 
                  min="0"
                  required 
                  value={openingCash} 
                  onChange={e => setOpeningCash(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openNotes">Ghi chú (Tùy chọn)</Label>
                <Input 
                  id="openNotes" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpenShiftDialog(false)}>Hủy</Button>
              <Button type="submit" disabled={openMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {openMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Bắt đầu ca
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={isCloseShiftDialog} onOpenChange={setIsCloseShiftDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCloseSubmit}>
            <DialogHeader>
              <DialogTitle>Chốt ca làm việc</DialogTitle>
              <DialogDescription>Kiểm đếm và nhập tổng số tiền mặt hiện có trong két.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="closingCash">Tiền mặt cuối ca (VNĐ)</Label>
                <Input 
                  id="closingCash" 
                  type="number" 
                  min="0"
                  required 
                  value={closingCash} 
                  onChange={e => setClosingCash(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closeNotes">Ghi chú (Bàn giao, thiếu hụt...)</Label>
                <Input 
                  id="closeNotes" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCloseShiftDialog(false)}>Hủy</Button>
              <Button type="submit" disabled={closeMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận chốt ca
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
