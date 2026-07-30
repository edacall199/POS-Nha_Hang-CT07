'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Archive, PackagePlus, Loader2, AlertTriangle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  const [ingredientForm, setIngredientForm] = useState({
    name: '', unit: 'kg', minQuantity: '10', costPerUnit: '0', supplier: ''
  });

  const [stockInForm, setStockInForm] = useState({
    quantity: '', costPerUnit: ''
  });

  // Fetch Inventory
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res: any = await api.get('/inventory');
      return res.data;
    }
  });

  // Create Ingredient Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/inventory', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Đã thêm nguyên liệu mới!');
      setIsAddIngredientOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi thêm', { description: err.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.put(`/inventory/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Đã cập nhật nguyên liệu!');
      setIsEditDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi cập nhật', { description: err.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/inventory/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Đã xóa nguyên liệu!');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi xóa', { description: err.message })
  });

  // Stock In Mutation
  const stockInMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.post(`/inventory/${id}/stock`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Đã nhập kho thành công!');
      setIsStockInOpen(false);
    },
    onError: (err: any) => toast.error('Lỗi khi nhập kho', { description: err.message })
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const filteredItems = ingredients.filter((item: any) => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: ingredientForm.name,
      unit: ingredientForm.unit,
      minQuantity: Number(ingredientForm.minQuantity),
      costPerUnit: Number(ingredientForm.costPerUnit),
      supplier: ingredientForm.supplier
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    updateMutation.mutate({
      id: selectedIngredient.id,
      data: {
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        minQuantity: Number(ingredientForm.minQuantity),
        costPerUnit: Number(ingredientForm.costPerUnit),
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!selectedIngredient) return;
    deleteMutation.mutate(selectedIngredient.id);
  };

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    stockInMutation.mutate({
      id: selectedIngredient.id,
      data: {
        quantity: Number(stockInForm.quantity),
        costPerUnit: Number(stockInForm.costPerUnit),
      }
    });
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kho hàng</h2>
          <p className="text-muted-foreground">
            Quản lý nguyên liệu và theo dõi tồn kho.
          </p>
        </div>
        <Button onClick={() => {
          setIngredientForm({ name: '', unit: 'kg', minQuantity: '10', costPerUnit: '0', supplier: '' });
          setIsAddIngredientOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Thêm nguyên liệu mới
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Input 
          placeholder="Tìm kiếm nguyên liệu..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên nguyên liệu</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead className="text-right">Mức tối thiểu</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              <TableHead>Cảnh báo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Chưa có dữ liệu nguyên liệu.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: any) => {
                const isLow = Number(item.stockQuantity) <= Number(item.minQuantity);
                return (
                  <TableRow key={item.id} className={isLow ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className={`text-right font-bold ${isLow ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {Number(item.stockQuantity).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {Number(item.minQuantity).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.costPerUnit))}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Sắp hết hàng
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                          Đầy đủ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant={isLow ? 'default' : 'outline'}
                          className={isLow ? 'bg-blue-600 hover:bg-blue-700' : ''}
                          onClick={() => {
                            setSelectedIngredient(item);
                            setStockInForm({ quantity: '', costPerUnit: item.costPerUnit.toString() });
                            setIsStockInOpen(true);
                          }}
                        >
                          <PackagePlus className="h-4 w-4 mr-2" /> Nhập kho
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-8 w-8 p-0 transition-colors">
                            <span className="sr-only">Mở menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedIngredient(item);
                              setIngredientForm({
                                name: item.name,
                                unit: item.unit,
                                minQuantity: item.minQuantity.toString(),
                                costPerUnit: item.costPerUnit.toString(),
                                supplier: item.supplier || ''
                              });
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => {
                              setSelectedIngredient(item);
                              setIsDeleteDialogOpen(true);
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Thêm nguyên liệu mới</DialogTitle>
              <DialogDescription>Khai báo nguyên liệu để dùng trong công thức.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên nguyên liệu</Label>
                <Input id="name" required value={ingredientForm.name} onChange={e => setIngredientForm({...ingredientForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="unit">Đơn vị</Label>
                  <Select 
                    value={ingredientForm.unit} 
                    onValueChange={(val) => setIngredientForm({...ingredientForm, unit: val as string})}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="lít">lít</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="thùng">thùng</SelectItem>
                      <SelectItem value="hộp">hộp</SelectItem>
                      <SelectItem value="chai">chai</SelectItem>
                      <SelectItem value="lon">lon</SelectItem>
                      <SelectItem value="bịch">bịch</SelectItem>
                      <SelectItem value="quả">quả</SelectItem>
                      <SelectItem value="phần">phần</SelectItem>
                      <SelectItem value="ly">ly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minQty">Mức cảnh báo (Tối thiểu)</Label>
                  <Input id="minQty" type="number" required value={ingredientForm.minQuantity} onChange={e => setIngredientForm({...ingredientForm, minQuantity: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost">Giá dự kiến (VNĐ/Đơn vị)</Label>
                <Input id="cost" type="number" required value={ingredientForm.costPerUnit} onChange={e => setIngredientForm({...ingredientForm, costPerUnit: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddIngredientOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock In Dialog */}
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleStockInSubmit}>
            <DialogHeader>
              <DialogTitle>Nhập kho</DialogTitle>
              <DialogDescription>Thêm số lượng cho: <strong className="text-primary">{selectedIngredient?.name}</strong></DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="stockQty">Số lượng nhập ({selectedIngredient?.unit})</Label>
                <Input 
                  id="stockQty" 
                  type="number" 
                  step={['kg', 'g', 'lít', 'ml'].includes(selectedIngredient?.unit) ? "0.01" : "1"} 
                  min={['kg', 'g', 'lít', 'ml'].includes(selectedIngredient?.unit) ? "0.01" : "1"} 
                  required 
                  value={stockInForm.quantity} 
                  onChange={e => setStockInForm({...stockInForm, quantity: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stockCost">Giá thực tế lô này (VNĐ/{selectedIngredient?.unit})</Label>
                <Input id="stockCost" type="number" required value={stockInForm.costPerUnit} onChange={e => setStockInForm({...stockInForm, costPerUnit: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStockInOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={stockInMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {stockInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận nhập
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Ingredient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle>Sửa nguyên liệu</DialogTitle>
              <DialogDescription>Cập nhật thông tin cho nguyên liệu.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Tên nguyên liệu</Label>
                <Input id="edit-name" required value={ingredientForm.name} onChange={e => setIngredientForm({...ingredientForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">Đơn vị</Label>
                  <Select 
                    value={ingredientForm.unit} 
                    onValueChange={(val) => setIngredientForm({...ingredientForm, unit: val as string})}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="lít">lít</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="thùng">thùng</SelectItem>
                      <SelectItem value="hộp">hộp</SelectItem>
                      <SelectItem value="chai">chai</SelectItem>
                      <SelectItem value="lon">lon</SelectItem>
                      <SelectItem value="bịch">bịch</SelectItem>
                      <SelectItem value="quả">quả</SelectItem>
                      <SelectItem value="phần">phần</SelectItem>
                      <SelectItem value="ly">ly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minQty">Mức cảnh báo</Label>
                  <Input id="edit-minQty" type="number" required value={ingredientForm.minQuantity} onChange={e => setIngredientForm({...ingredientForm, minQuantity: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Nguyên liệu <strong>{selectedIngredient?.name}</strong> sẽ bị ẩn khỏi hệ thống. Thao tác này không ảnh hưởng đến lịch sử kho trước đây.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteSubmit(); }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Xóa nguyên liệu'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
