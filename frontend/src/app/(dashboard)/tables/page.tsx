'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Clock, Loader2, RefreshCcw, UtensilsCrossed, MoreVertical, ArrowRightLeft, Combine, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { QrDialog } from './QrDialog';

function CleaningCountdown({ endTime }: { endTime: number }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, endTime - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  
  if (timeLeft <= 0) return <span className="text-red-500 font-bold animate-pulse">⚠ Quá hạn dọn!</span>;
  return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
}

// Define types
interface Zone {
  id: string;
  name: string;
  description: string | null;
}

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  zoneId: string;
  orders?: { id: string, status: string }[];
  updatedAt?: string;
  createdAt: string;
  cleaningEndTime?: number;
}

export default function TablesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeZone, setActiveZone] = useState<string>('all');
  
  // Dialog States
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedTableForMove, setSelectedTableForMove] = useState<Table | null>(null);
  const [targetMoveTableId, setTargetMoveTableId] = useState<string>("");

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedTableForMerge, setSelectedTableForMerge] = useState<Table | null>(null);
  const [sourceMergeTableId, setSourceMergeTableId] = useState<string>("");

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null);

  // Fetch Tables
  const { data: tables = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await api.get('/tables');
      return res.data as Table[];
    }
  });

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    };

    socket.on('table:status_changed', handleUpdate);
    socket.on('table:updated', handleUpdate);
    socket.on('table:cleaning_overtime', handleUpdate);
    socket.on('order:created', handleUpdate);

    return () => {
      socket.off('table:status_changed', handleUpdate);
      socket.off('table:updated', handleUpdate);
      socket.off('table:cleaning_overtime', handleUpdate);
      socket.off('order:created', handleUpdate);
    };
  }, [queryClient]);

  // Unique Zones
  const zonesMap = new Map<string, string>();
  tables.forEach(t => {
    if ((t as any).zone) {
      zonesMap.set(t.zoneId, (t as any).zone.name);
    } else {
      zonesMap.set(t.zoneId, 'Khu vực');
    }
  });
  const uniqueZones = Array.from(zonesMap.entries()).map(([id, name]) => ({ id, name }));

  const filteredTables = activeZone === 'all' 
    ? tables 
    : tables.filter(t => t.zoneId === activeZone);

  const availableTables = tables.filter(t => t.status === 'available');
  const occupiedTables = tables.filter(t => t.status === 'occupied');

  // Mutations
  const moveMutation = useMutation({
    mutationFn: async ({ orderId, targetTableId }: { orderId: string, targetTableId: string }) => {
      return api.post('/tables/move', { orderId, targetTableId });
    },
    onSuccess: () => {
      toast.success('Chuyển bàn thành công');
      setMoveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast.error('Chuyển bàn thất bại', { description: err.message });
    }
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryOrderId, sourceOrderId }: { primaryOrderId: string, sourceOrderId: string }) => {
      return api.post('/tables/merge', { primaryOrderId, sourceOrderId });
    },
    onSuccess: () => {
      toast.success('Gộp bàn thành công');
      setMergeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast.error('Gộp bàn thất bại', { description: err.message });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: string, status: string }) => {
      return api.put(`/tables/${tableId}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái bàn');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast.error('Lỗi khi cập nhật trạng thái', { description: err.message });
    }
  });

  // Handlers
  const handleOpenMoveDialog = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!table.orders || table.orders.length === 0) {
      toast.error('Không tìm thấy hóa đơn của bàn này');
      return;
    }
    setSelectedTableForMove(table);
    setTargetMoveTableId("");
    setMoveDialogOpen(true);
  };

  const handleOpenMergeDialog = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!table.orders || table.orders.length === 0) {
      toast.error('Không tìm thấy hóa đơn của bàn này');
      return;
    }
    setSelectedTableForMerge(table); // This will be the primary table receiving items
    setSourceMergeTableId("");
    setMergeDialogOpen(true);
  };

  const handleExecuteMove = () => {
    if (!selectedTableForMove || !targetMoveTableId) return;
    const orderId = selectedTableForMove.orders?.[0]?.id;
    if (!orderId) return;
    moveMutation.mutate({ orderId, targetTableId: targetMoveTableId });
  };

  const handleExecuteMerge = () => {
    if (!selectedTableForMerge || !sourceMergeTableId) return;
    const primaryOrderId = selectedTableForMerge.orders?.[0]?.id;
    const sourceTable = tables.find(t => t.id === sourceMergeTableId);
    const sourceOrderId = sourceTable?.orders?.[0]?.id;
    
    if (!primaryOrderId || !sourceOrderId) return;
    mergeMutation.mutate({ primaryOrderId, sourceOrderId });
  };

  const handleCopyQrLink = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/order/${table.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Đã copy link gọi món!', { description: link });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'occupied': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800';
      case 'reserved': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
      case 'cleaning': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Bàn trống';
      case 'occupied': return 'Đang sử dụng';
      case 'reserved': return 'Đã đặt';
      case 'cleaning': return 'Đang dọn';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sơ đồ bàn</h1>
          <p className="text-slate-500 dark:text-slate-400">Quản lý và theo dõi trạng thái các bàn trong nhà hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm mr-4">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Trống</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Đang phục vụ</div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="all" value={activeZone} onValueChange={(val) => setActiveZone(val as string)} className="w-full">
          <TabsList className="mb-6 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="all">Tất cả khu vực</TabsTrigger>
            {uniqueZones.map(z => (
              <TabsTrigger key={z.id} value={z.id}>{z.name}</TabsTrigger>
            ))}
          </TabsList>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredTables.map((table) => (
              <Card 
                key={table.id} 
                onClick={() => router.push(`/orders/${table.id}`)}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border-2 relative group ${getStatusColor(table.status)}`}
              >
                {/* Context Actions Menu for All Tables */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      className="inline-flex items-center justify-center h-8 w-8 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => handleCopyQrLink(table, e as any)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        <span>Copy Link QR Khách</span>
                      </DropdownMenuItem>
                      {table.status === 'occupied' && (
                        <>
                          <DropdownMenuItem onClick={(e) => handleOpenMoveDialog(table, e as any)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            <span>Chuyển sang bàn khác</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleOpenMergeDialog(table, e as any)}>
                            <Combine className="mr-2 h-4 w-4" />
                            <span>Gộp một bàn vào đây</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setSelectedTableForQr(table);
                        setQrDialogOpen(true);
                      }}>
                        <QrCode className="mr-2 h-4 w-4" /> Tạo mã QR
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-0">
                  <div className="p-4 md:p-5 flex flex-col h-full min-h-[140px] justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-bold">{table.tableNumber}</span>
                      <span className="flex items-center text-xs font-medium bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded-full">
                        <Users className="w-3 h-3 mr-1" />
                        {table.capacity}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-1">
                      <span className="text-sm font-semibold">{getStatusLabel(table.status)}</span>
                      {table.status === 'cleaning' && table.cleaningEndTime && (
                        <span className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400">
                          <Clock className="w-3 h-3 mr-1" />
                          <CleaningCountdown endTime={table.cleaningEndTime} />
                        </span>
                      )}
                      {table.status === 'cleaning' && (
                        <Button 
                          size="sm" 
                          className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs w-fit"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({ tableId: table.id, status: 'available' });
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          ✓ Dọn xong
                        </Button>
                      )}
                      {table.status === 'occupied' && (table.updatedAt || table.createdAt) && (
                        <span className="flex items-center text-xs opacity-80">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(table.updatedAt || table.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-8 h-8 opacity-50" />
              </div>
              <p>Không có bàn nào trong khu vực này</p>
            </div>
          )}
        </Tabs>
      )}

      {/* Move Table Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chuyển bàn</DialogTitle>
            <DialogDescription>
              Di chuyển toàn bộ khách và món ăn từ Bàn {selectedTableForMove?.tableNumber} sang một bàn trống khác.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={(val) => setTargetMoveTableId(val as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn bàn..." />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map(t => (
                  <SelectItem key={t.id} value={t.id}>Bàn {t.tableNumber} (Sức chứa: {t.capacity})</SelectItem>
                ))}
                {availableTables.length === 0 && (
                  <SelectItem value="empty" disabled>Không có bàn trống nào</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleExecuteMove} disabled={!targetMoveTableId || moveMutation.isPending}>
              {moveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận Chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Table Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gộp bàn</DialogTitle>
            <DialogDescription>
              Chọn một bàn đang phục vụ khác để gộp <span className="font-bold">vào Bàn {selectedTableForMerge?.tableNumber}</span>. Bàn được chọn sẽ trở thành bàn trống sau khi gộp.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={(val) => setSourceMergeTableId(val as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn bàn..." />
              </SelectTrigger>
              <SelectContent>
                {occupiedTables.filter(t => t.id !== selectedTableForMerge?.id).map(t => (
                  <SelectItem key={t.id} value={t.id}>Bàn {t.tableNumber} (Đang phục vụ)</SelectItem>
                ))}
                {occupiedTables.filter(t => t.id !== selectedTableForMerge?.id).length === 0 && (
                  <SelectItem value="empty" disabled>Không có bàn nào khác đang phục vụ</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleExecuteMerge} disabled={!sourceMergeTableId || mergeMutation.isPending}>
              {mergeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận Gộp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <QrDialog
        isOpen={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        table={selectedTableForQr}
      />
    </div>
  );
}
