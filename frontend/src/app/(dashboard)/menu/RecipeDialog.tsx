'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: any;
}

export function RecipeDialog({ isOpen, onClose, menuItem }: RecipeDialogProps) {
  const queryClient = useQueryClient();
  const [recipes, setRecipes] = useState<any[]>([]);

  // Fetch ingredients
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data;
    },
    enabled: isOpen,
  });

  // Fetch current recipes
  const { data: currentRecipes, isLoading } = useQuery({
    queryKey: ['recipes', menuItem?.id],
    queryFn: async () => {
      if (!menuItem?.id) return [];
      const res = await api.get(`/menus/${menuItem.id}/recipes`);
      return res.data;
    },
    enabled: isOpen && !!menuItem?.id,
  });

  useEffect(() => {
    if (currentRecipes) {
      setRecipes(currentRecipes.map((r: any) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
        unit: r.unit,
        note: r.note || '',
      })));
    } else {
      setRecipes([]);
    }
  }, [currentRecipes, isOpen]);

  const addRecipe = () => {
    setRecipes([...recipes, { ingredientId: '', quantity: 1, unit: 'g', note: '' }]);
  };

  const removeRecipe = (index: number) => {
    setRecipes(recipes.filter((_, i) => i !== index));
  };

  const updateRecipe = (index: number, field: string, value: any) => {
    const newRecipes = [...recipes];
    
    if (field === 'ingredientId') {
      const ing = ingredients.find((i: any) => i.id === value);
      if (ing) {
        newRecipes[index].unit = ing.unit;
      }
    }
    
    newRecipes[index][field] = value;
    setRecipes(newRecipes);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/menus/${menuItem.id}/recipes`, {
        recipes: recipes.map(r => ({
          ...r,
          quantity: Number(r.quantity)
        }))
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Đã lưu định lượng thành công!');
      queryClient.invalidateQueries({ queryKey: ['recipes', menuItem?.id] });
      onClose();
    },
    onError: (err: any) => {
      toast.error('Lỗi khi lưu định lượng', { description: err.message });
    }
  });

  const handleSave = () => {
    // Validate
    if (recipes.some(r => !r.ingredientId || r.quantity <= 0)) {
      toast.error('Vui lòng chọn nguyên liệu và nhập số lượng > 0');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-blue-500" />
            Định lượng nguyên liệu (BOM)
          </DialogTitle>
          <DialogDescription>
            Thiết lập định lượng nguyên liệu cho món <strong className="text-slate-800">{menuItem?.name}</strong>. Khi món này được bán, hệ thống sẽ tự động trừ kho.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {recipes.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed text-slate-500">
                Chưa có định lượng nào. Bấm thêm nguyên liệu để bắt đầu.
              </div>
            ) : (
              <div className="space-y-3">
                {recipes.map((recipe, index) => (
                  <div key={index} className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Nguyên liệu</Label>
                          <Select
                            value={recipe.ingredientId}
                            onValueChange={(val) => updateRecipe(index, 'ingredientId', val as string)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map((ing: any) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Số lượng ({recipe.unit || 'đơn vị'})</Label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={recipe.quantity}
                            onChange={(e) => updateRecipe(index, 'quantity', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Ghi chú (Tùy chọn)</Label>
                        <Input
                          placeholder="VD: Cắt nhỏ..."
                          value={recipe.note}
                          onChange={(e) => updateRecipe(index, 'note', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeRecipe(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="w-full border-dashed" onClick={addRecipe}>
              <Plus className="h-4 w-4 mr-2" /> Thêm nguyên liệu
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu định lượng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
