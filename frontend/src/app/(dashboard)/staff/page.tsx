'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, Loader2, Search, Shield } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRole } from '@/lib/utils';
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

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '', roleId: '', isActive: true
  });

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res: any = await api.get('/users');
      return res.data;
    }
  });

  // Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res: any = await api.get('/roles');
      return res.data;
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã thêm nhân viên mới!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi thêm', { description: err.message })
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.patch(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã cập nhật nhân viên!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi cập nhật', { description: err.message })
  });

  const filteredItems = users.filter((item: any) => 
    item.fullName.toLowerCase().includes(search.toLowerCase()) ||
    item.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      fullName: '', email: '', phone: '', password: '', roleId: roles.length > 0 ? roles[0].id : '', isActive: true
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      fullName: item.fullName,
      email: item.email, // We probably shouldn't allow editing email but we put it here
      phone: item.phone || '',
      password: '', // Empty means don't change
      roleId: item.role.id,
      isActive: item.isActive
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      fullName: formData.fullName,
      phone: formData.phone || undefined,
      roleId: formData.roleId,
      isActive: formData.isActive
    };
    if (formData.password) payload.password = formData.password;

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      payload.email = formData.email;
      createMutation.mutate(payload);
    }
  };

  const toggleStatus = (item: any) => {
    updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } });
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHIER': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'KITCHEN': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'WAITER': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nhân sự</h2>
          <p className="text-muted-foreground">
            Quản lý tài khoản nhân viên và phân quyền hệ thống.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Thêm nhân viên
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm kiếm nhân viên..." 
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
              <TableHead>Nhân viên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Không tìm thấy nhân viên nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: any) => (
                <TableRow key={item.id} className={!item.isActive ? 'opacity-50 grayscale' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {item.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{item.fullName}</div>
                        <div className="text-xs text-muted-foreground">{item.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleBadge(item.role.name)}>
                      {formatRole(item.role.name)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'secondary'} className={item.isActive ? 'bg-emerald-500' : ''}>
                      {item.isActive ? 'Đang làm việc' : 'Đã khóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title={item.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        onClick={() => {
                          if (confirm(item.isActive ? 'Bạn có chắc muốn khóa tài khoản này?' : 'Mở khóa tài khoản này?')) {
                            toggleStatus(item);
                          }
                        }}
                      >
                        {item.isActive ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-emerald-500" />}
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
              <DialogTitle>{editingItem ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
              <DialogDescription>
                Cấp tài khoản đăng nhập cho nhân viên của bạn.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email đăng nhập</Label>
                <Input id="email" type="email" required disabled={!!editingItem} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{editingItem ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</Label>
                <Input id="password" type="password" required={!editingItem} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Phân quyền (Vai trò)</Label>
                <Select value={formData.roleId} onValueChange={(v) => setFormData({...formData, roleId: v as string})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue>
                      {formData.roleId ? formatRole(roles.find((r: any) => r.id === formData.roleId)?.name) : "Chọn quyền"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatRole(r.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
