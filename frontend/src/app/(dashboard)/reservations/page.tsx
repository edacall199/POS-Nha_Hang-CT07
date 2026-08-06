'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Search, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function ReservationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerName: '', customerPhone: '', partySize: '2', reservedAt: '', tableId: '', notes: '', status: 'pending'
  });

  // Fetch Reservations
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res: any = await api.get('/reservations');
      return res.data;
    }
  });

  // Fetch Tables
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res: any = await api.get('/tables');
      return res.data;
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/reservations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Đã lưu thông tin đặt bàn!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi lưu', { description: err.message })
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.patch(`/reservations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Đã cập nhật đặt bàn!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi cập nhật', { description: err.message })
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/reservations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Đã hủy đặt bàn!');
    },
    onError: (err: any) => toast.error('Lỗi khi xóa', { description: err.message })
  });

  const filteredItems = reservations.filter((item: any) => 
    item.customerName.toLowerCase().includes(search.toLowerCase()) ||
    item.customerPhone.includes(search)
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      customerName: '', customerPhone: '', partySize: '2', 
      reservedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
      tableId: tables.length > 0 ? tables[0].id : '', 
      notes: '', status: 'pending'
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      partySize: item.partySize.toString(),
      reservedAt: format(new Date(item.reservedAt), "yyyy-MM-dd'T'HH:mm"),
      tableId: item.tableId,
      notes: item.notes || '',
      status: item.status
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      partySize: Number(formData.partySize),
      reservedAt: new Date(formData.reservedAt).toISOString(),
      tableId: formData.tableId,
      notes: formData.notes,
      status: formData.status
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Chờ xác nhận</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Đã chốt</Badge>;
      case 'seated': return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Đã nhận bàn</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">Hoàn thành</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Đặt bàn</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách khách hàng đặt trước chỗ.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Đặt bàn mới
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm theo tên hoặc SĐT..." 
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
              <TableHead>Bàn/Khu vực</TableHead>
              <TableHead>Giờ đến</TableHead>
              <TableHead>Trạng thái</TableHead>
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
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Chưa có lịch đặt bàn nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: any) => (
                <TableRow key={item.id} className={item.status === 'cancelled' ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    {item.customerName}
                    <div className="text-xs text-muted-foreground font-normal">{item.partySize} khách</div>
                  </TableCell>
                  <TableCell>{item.customerPhone}</TableCell>
                  <TableCell>
                    <div className="font-medium">Bàn {item.table?.tableNumber}</div>
                    <div className="text-xs text-muted-foreground">{item.table?.zone?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      <span>{format(new Date(item.reservedAt), 'HH:mm - dd/MM/yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa lịch đặt bàn này?')) deleteMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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
              <DialogTitle>{editingItem ? 'Cập nhật đặt bàn' : 'Tạo lịch đặt bàn'}</DialogTitle>
              <DialogDescription>
                Nhập thông tin khách hàng muốn đặt giữ chỗ.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên khách hàng</Label>
                <Input id="name" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" required value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partySize">Số khách</Label>
                  <Input id="partySize" type="number" required value={formData.partySize} onChange={e => setFormData({...formData, partySize: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Thời gian đến</Label>
                <Input id="time" type="datetime-local" required value={formData.reservedAt} onChange={e => setFormData({...formData, reservedAt: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="table">Xếp Bàn</Label>
                <Select value={formData.tableId} onValueChange={(v) => setFormData({...formData, tableId: v as string})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bàn trống">
                      {tables.find((t: any) => t.id === formData.tableId)
                        ? `Bàn ${tables.find((t: any) => t.id === formData.tableId)?.tableNumber} - ${tables.find((t: any) => t.id === formData.tableId)?.zone?.name}`
                        : "Chọn bàn trống"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>Bàn {t.tableNumber} - {t.zone?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingItem && (
                <div className="grid gap-2">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as string})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Chờ xác nhận</SelectItem>
                      <SelectItem value="confirmed">Đã chốt</SelectItem>
                      <SelectItem value="seated">Đã nhận bàn</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="notes">Ghi chú (Tùy chọn)</Label>
                <Input id="notes" placeholder="VD: Khách dặn sinh nhật" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu lại
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
