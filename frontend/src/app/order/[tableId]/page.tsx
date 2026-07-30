'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Minus, ShoppingBag, UtensilsCrossed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

// We don't use the authenticated api instance here, just direct axios since it's public.
const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  return envUrl.endsWith('/public') ? envUrl : `${envUrl}/public`;
};

const publicApi = axios.create({
  baseURL: getBaseUrl(),
});

export default function CustomerOrderPage() {
  const params = useParams<{ tableId: string }>();
  const [cart, setCart] = useState<Record<string, { item: any, quantity: number, notes: string }>>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Fetch Table Info
  const { data: table, isLoading: tableLoading } = useQuery({
    queryKey: ['public', 'table', params.tableId],
    queryFn: async () => {
      const res = await publicApi.get(`/tables/${params.tableId}`);
      return res.data.data;
    },
    retry: false,
  });

  // Fetch Menu
  const { data: categories = [], isLoading: menuLoading } = useQuery({
    queryKey: ['public', 'menu'],
    queryFn: async () => {
      const res = await publicApi.get('/menus');
      return res.data.data;
    }
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await publicApi.post('/orders', {
        tableId: params.tableId,
        items
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Gửi order thành công! Bếp đang chuẩn bị món.');
      setCart({});
      setOrderSuccess(true);
    },
    onError: (err: any) => {
      toast.error('Có lỗi xảy ra', { description: err.response?.data?.message || err.message });
    }
  });

  if (tableLoading || menuLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center space-y-4">
        <UtensilsCrossed className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-bold">Bàn không hợp lệ</h2>
        <p className="text-muted-foreground">Vui lòng quét lại mã QR trên bàn của bạn.</p>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center space-y-4">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <UtensilsCrossed className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold">Order đã được gửi tới bếp!</h2>
        <p className="text-muted-foreground">Nhân viên sẽ sớm mang món ra cho bạn tại <strong>Bàn {table.tableNumber}</strong>.</p>
        <Button className="mt-8" onClick={() => setOrderSuccess(false)}>Gọi thêm món</Button>
      </div>
    );
  }

  const handleAdd = (item: any) => {
    setCart(prev => {
      const current = prev[item.id] || { item, quantity: 0, notes: '' };
      return { ...prev, [item.id]: { ...current, quantity: current.quantity + 1 } };
    });
  };

  const handleRemove = (item: any) => {
    setCart(prev => {
      const current = prev[item.id];
      if (!current) return prev;
      if (current.quantity <= 1) {
        const newCart = { ...prev };
        delete newCart[item.id];
        return newCart;
      }
      return { ...prev, [item.id]: { ...current, quantity: current.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cartItems.reduce((acc, curr) => acc + (curr.quantity * Number(curr.item.price)), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleSubmit = () => {
    if (totalItems === 0) return;
    setIsOrdering(true);
    const itemsPayload = cartItems.map(c => ({
      menuItemId: c.item.id,
      quantity: c.quantity,
      notes: c.notes
    }));
    placeOrderMutation.mutate(itemsPayload, {
      onSettled: () => setIsOrdering(false)
    });
  };

  return (
    <div className="pb-28">
      {/* Welcome Hero */}
      <div className="bg-primary text-primary-foreground p-6 shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-1">Xin chào!</h1>
        <p className="opacity-90 text-sm">Quý khách đang ngồi tại <strong>Bàn {table.tableNumber}</strong> ({table.zone?.name})</p>
      </div>

      {/* Menu List */}
      <div className="px-4 space-y-8">
        {categories.map((category: any) => (
          category.menuItems?.length > 0 && (
            <div key={category.id} className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2 sticky top-16 bg-slate-50 dark:bg-slate-900 z-10 py-2">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.menuItems.map((item: any) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="h-24 w-24 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <UtensilsCrossed className="h-8 w-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 leading-tight mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary">{formatCurrency(Number(item.price))}</span>
                        
                        {cart[item.id] ? (
                          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-1">
                            <button onClick={() => handleRemove(item)} className="p-1 text-slate-600 hover:text-slate-900">
                              <Minus className="h-5 w-5" />
                            </button>
                            <span className="font-medium w-4 text-center">{cart[item.id].quantity}</span>
                            <button onClick={() => handleAdd(item)} className="p-1 text-slate-600 hover:text-slate-900">
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAdd(item)}
                            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 shadow-sm transition-all active:scale-95"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Floating Cart Panel */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground font-medium">{totalItems} món</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalPrice)}</span>
            </div>
            <Button 
              size="lg" 
              className="flex-1 rounded-full shadow-md text-base"
              onClick={handleSubmit}
              disabled={isOrdering}
            >
              {isOrdering ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <ShoppingBag className="h-5 w-5 mr-2" />
              )}
              {isOrdering ? 'Đang gửi...' : 'Gửi Order Bếp'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
