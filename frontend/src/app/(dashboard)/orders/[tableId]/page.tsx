'use client';

import { useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  ChefHat,
  ReceiptText
, Loader2} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  categoryId: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  category?: Category;
}

interface CartItem {
  id: string; // unique ID for cart item (e.g. timestamp)
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

export default function OrderPage(props: { params: Promise<{ tableId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Queries
  const { data: menuItems = [], isLoading: isMenuLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await api.get('/menus');
      return res.data as MenuItem[];
    }
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data as Category[];
    }
  });

  const { data: table } = useQuery({
    queryKey: ['table', params.tableId],
    queryFn: async () => {
      const res = await api.get(`/tables/${params.tableId}`);
      return res.data;
    }
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || item.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, activeCategory]);

  // Cart actions
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => 
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { id: Date.now().toString(), menuItem: item, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === cartItemId) {
        const newQ = c.quantity + delta;
        return newQ > 0 ? { ...c, quantity: newQ } : c;
      }
      return c;
    }));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(c => c.id !== cartItemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  // Submit Order
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tableId: params.tableId,
        items: cart.map(c => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          notes: c.note || undefined
        }))
      };
      const res = await api.post('/orders', payload);
      
      // If successful, we also send it to kitchen immediately for MVP simplicity
      const orderId = res.data?.data?.id || res.data?.id;
      if (orderId) {
        await api.post(`/orders/${orderId}/send-kitchen`);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Đã gửi order xuống bếp thành công!');
      setCart([]);
      router.push('/tables');
    },
    onError: (error: any) => {
      toast.error('Có lỗi xảy ra', { description: error.message });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (isMenuLoading || isCategoriesLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Bàn {table?.tableNumber || '...'}
              {table?.status === 'occupied' && (
                <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  Đang phục vụ
                </Badge>
              )}
            </h1>
          </div>
        </div>
        <div className="relative w-64 md:w-80 hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm kiếm món ăn..." 
            className="pl-9 bg-slate-100 border-none dark:bg-slate-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main Menu Area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden min-h-0">
          <Tabs defaultValue="all" value={activeCategory} onValueChange={(val) => setActiveCategory(val as string)} className="flex flex-col h-full min-h-0">
            <div className="px-4 pt-4 shrink-0">
              <ScrollArea className="w-full whitespace-nowrap pb-2">
                <TabsList className="bg-transparent p-0 flex space-x-2">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                  >
                    Tất cả
                  </TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger 
                      key={cat.id} 
                      value={cat.id}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 flex items-center gap-1.5"
                    >
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </div>
            
            <ScrollArea className="flex-1 min-h-0 p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <Card 
                    key={item.id} 
                    className={`overflow-hidden cursor-pointer transition-all hover:border-primary/50 group ${!item.isAvailable ? 'opacity-50 grayscale' : ''}`}
                    onClick={() => addToCart(item)}
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 rounded-md mb-3 flex items-center justify-center text-4xl overflow-hidden relative">
                        {item.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          item.category?.icon || '🍽️'
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="text-white h-8 w-8" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold line-clamp-2">{item.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{formatCurrency(item.price)}</p>
                      </div>
                      {!item.isAvailable && (
                        <Badge variant="destructive" className="mt-2 w-fit">Hết món</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {filteredItems.length === 0 && (
                <div className="h-40 flex items-center justify-center text-slate-500">
                  Không tìm thấy món ăn nào phù hợp.
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </div>

        {/* Cart Sidebar */}
        <div className="w-80 xl:w-96 h-full min-h-0 overflow-hidden bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Phiếu gọi món
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
              )}
            </h2>
          </div>

          <ScrollArea className="flex-1 min-h-0 p-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-12">
                <ReceiptText className="h-12 w-12 opacity-20" />
                <p>Chưa có món nào được chọn</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3 animate-in slide-in-from-right-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm line-clamp-2">{item.menuItem.name}</span>
                        <span className="font-semibold text-sm whitespace-nowrap ml-2">
                          {formatCurrency(item.menuItem.price * item.quantity)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>
            
            <Button 
              className="w-full h-12 text-base font-semibold" 
              disabled={cart.length === 0 || submitOrderMutation.isPending}
              onClick={() => submitOrderMutation.mutate()}
            >
              {submitOrderMutation.isPending ? (
                'Đang xử lý...'
              ) : (
                <>
                  <ChefHat className="mr-2 h-5 w-5" />
                  Gửi thực đơn xuống Bếp
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
