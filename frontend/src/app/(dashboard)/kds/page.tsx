'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, CheckCircle2, Clock, PlayCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Types
interface OrderItem {
  id: string;
  menuItem: {
    name: string;
  };
  quantity: number;
  status: 'pending' | 'preparing' | 'done' | 'served' | 'cancelled';
  notes: string | null;
}

interface Order {
  id: string;
  table: {
    tableNumber: string;
  };
  status: 'pending' | 'kitchen' | 'served' | 'paid' | 'cancelled';
  createdAt: string;
  items: OrderItem[];
}

export default function KDSPage() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch kitchen orders (we assume we have an endpoint for this, or we just fetch all active orders)
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['kds-orders'],
    queryFn: async () => {
      // In a real app we'd have a specific /orders/kitchen endpoint
      // For MVP, fetch all orders and filter frontend or assume backend returns only active ones
      const res = await api.get('/orders');
      // Only show orders that are confirmed (sent to kitchen)
      return res.data.filter((o: Order) => ['kitchen', 'confirmed'].includes(o.status)) as Order[];
    },
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:kitchen');
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('order:new', (data) => {
      toast.info(`Có order mới từ Bàn ${data.tableNumber}`);
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    });

    socket.on('order:created', (data) => {
      toast.info(`Có order mới từ Bàn ${data.tableNumber || data.tableCode}`);
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    });

    socket.on('kitchen:new_ticket', (data) => {
      toast.info(`Bếp có phiếu gọi món mới từ Bàn ${data.tableCode || data.tableNumber}`);
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    });

    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    });

    return () => {
      socket.off('kitchen:ticket_updated');
      socket.off('kitchen:new_ticket');
      socket.off('order:updated');
    };
  }, [queryClient]);

  // Update Item Status Mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const res = await api.patch(`/orders/items/${itemId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật trạng thái món');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
      case 'done': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ chế biến';
      case 'preparing': return 'Đang chế biến';
      case 'done': return 'Đã xong';
      default: return status;
    }
  };

  // Group items by status
  const pendingItems: Array<{order: Order, item: OrderItem}> = [];
  const preparingItems: Array<{order: Order, item: OrderItem}> = [];
  const readyItems: Array<{order: Order, item: OrderItem}> = [];

  orders.forEach(order => {
    order.items.forEach(item => {
      const obj = { order, item };
      if (item.status === 'pending') pendingItems.push(obj);
      if (item.status === 'preparing') preparingItems.push(obj);
      if (item.status === 'done') readyItems.push(obj);
    });
  });

  // Sort by created time (oldest first)
  const sortByTime = (a: any, b: any) => new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime();
  pendingItems.sort(sortByTime);
  preparingItems.sort(sortByTime);
  readyItems.sort(sortByTime);

  const Column = ({ title, icon: Icon, items, colorClass }: any) => (
    <div className="flex flex-col h-full bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${colorClass}`}>
        <h2 className="font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </h2>
        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 font-bold">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 italic text-sm">
              Trống
            </div>
          ) : (
            items.map(({ order, item }: any) => (
              <Card key={item.id} className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="p-3 pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant="outline" className="font-bold border-primary text-primary">
                      Bàn {order.table?.tableNumber || '...'}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.createdAt), { locale: vi })}
                    </span>
                  </div>
                  <CardTitle className="text-base leading-tight">
                    <span className="font-bold text-primary mr-2">{item.quantity}x</span>
                    {item.menuItem.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  {item.notes && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-xs p-2 rounded-md mb-3 border border-amber-100 dark:border-amber-900/50">
                      <span className="font-semibold">Ghi chú:</span> {item.notes}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    {item.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => updateItemStatusMutation.mutate({ itemId: item.id, status: 'preparing' })}
                        disabled={updateItemStatusMutation.isPending}
                      >
                        <PlayCircle className="h-4 w-4 mr-1.5" /> Chế biến
                      </Button>
                    )}
                    {item.status === 'preparing' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateItemStatusMutation.mutate({ itemId: item.id, status: 'done' })}
                        disabled={updateItemStatusMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Xong
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Màn hình Bếp (KDS)</h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            Theo dõi và quản lý tiến độ món ăn
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {isConnected ? 'Realtime (Đã kết nối)' : 'Mất kết nối realtime'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        <Column 
          title="Chờ chế biến" 
          icon={Clock} 
          items={pendingItems} 
          colorClass="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400"
        />
        <Column 
          title="Đang chế biến" 
          icon={ChefHat} 
          items={preparingItems} 
          colorClass="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
        />
        <Column 
          title="Đã xong" 
          icon={CheckCircle2} 
          items={readyItems} 
          colorClass="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400"
        />
      </div>
    </div>
  );
}
