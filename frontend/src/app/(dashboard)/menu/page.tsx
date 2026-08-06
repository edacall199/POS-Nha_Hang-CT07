'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Search, Image as ImageIcon, ChefHat } from 'lucide-react';
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
import { RecipeDialog } from './RecipeDialog';

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [recipeItem, setRecipeItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    prepTimeMinutes: '15',
    isAvailable: true
  });

  // Fetch Menu
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      const res: any = await api.get('/menus');
      return res.data;
    }
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res: any = await api.get('/categories');
      return res.data;
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/menus', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Đã thêm món mới!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi thêm', { description: err.message })
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.patch(`/menus/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Đã cập nhật món!');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi cập nhật', { description: err.message })
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/menus/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Đã xóa món ăn!');
    },
    onError: (err: any) => toast.error('Lỗi khi xóa', { description: err.message })
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const filteredItems = menuItems.filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      imageUrl: '',
      prepTimeMinutes: '15',
      isAvailable: true
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl || '',
      prepTimeMinutes: item.prepTimeMinutes?.toString() || '15',
      isAvailable: item.isAvailable
    });
    setIsDialogOpen(true);
  };

  const handleOpenRecipe = (item: any) => {
    setRecipeItem(item);
    setIsRecipeDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      price: Number(formData.price),
      categoryId: formData.categoryId,
      imageUrl: formData.imageUrl || undefined,
      prepTimeMinutes: Number(formData.prepTimeMinutes),
      isAvailable: formData.isAvailable
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Thực đơn</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách các món ăn và đồ uống.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Thêm món mới
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm kiếm món ăn..." 
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
              <TableHead className="w-[80px]">Ảnh</TableHead>
              <TableHead>Tên món</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
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
                  Không tìm thấy món ăn nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-md object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center border text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category?.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isAvailable ? 'default' : 'secondary'} className={item.isAvailable ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {item.isAvailable ? 'Đang bán' : 'Tạm ngưng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenRecipe(item)} title="Định lượng BOM">
                        <ChefHat className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa món này?')) deleteMutation.mutate(item.id);
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
              <DialogTitle>{editingItem ? 'Sửa món ăn' : 'Thêm món mới'}</DialogTitle>
              <DialogDescription>
                Điền thông tin chi tiết về món ăn dưới đây.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên món</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Giá bán (VNĐ)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: e.target.value})} 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prepTime">T.gian c.bị (phút)</Label>
                  <Input 
                    id="prepTime" 
                    type="number" 
                    value={formData.prepTimeMinutes} 
                    onChange={(e) => setFormData({...formData, prepTimeMinutes: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Danh mục</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v as string})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục">
                      {categories.find((c: any) => c.id === formData.categoryId)?.name || "Chọn danh mục"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Đường dẫn ảnh (URL)</Label>
                <Input 
                  id="imageUrl" 
                  placeholder="https://..."
                  value={formData.imageUrl} 
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isAvailable" 
                  checked={formData.isAvailable} 
                  onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="isAvailable" className="font-normal cursor-pointer">Cho phép bán ngay</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu lại
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RecipeDialog 
        isOpen={isRecipeDialogOpen} 
        onClose={() => setIsRecipeDialogOpen(false)} 
        menuItem={recipeItem} 
      />
    </div>
  );
}
