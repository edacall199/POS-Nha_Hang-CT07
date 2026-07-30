'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CreditCard, QrCode, CheckCircle2, Loader2, FileText, SplitSquareHorizontal, Printer, User } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PaymentPage(props: { params: Promise<{ orderId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Loyalty State
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  // Fetch Order
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.orderId}`);
      return res.data;
    }
  });

  // Fetch VietQR
  const { data: qrData, isLoading: isQrLoading } = useQuery({
    queryKey: ['vietqr', params.orderId],
    queryFn: async () => {
      const res = await api.get(`/payments/vietqr/${params.orderId}`);
      return res.data;
    },
    enabled: !!order && order.status !== 'paid' && paymentMethod === 'transfer',
  });

  // Process Payment
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      let finalCustomerId = customer?.id;

      // If phone is entered but no customer ID exists (new customer), create them first
      if (phone && !finalCustomerId) {
        try {
          const custRes: any = await api.post('/customers', {
            phone,
            fullName: customer?.fullName || 'Khách vãng lai',
            pointsToAdd: 0,
            spendToAdd: 0
          });
          finalCustomerId = custRes.data?.data?.id;
        } catch (e) {
          console.error("Loyalty error", e);
        }
      }

      const res = await api.post('/payments', {
        orderId: order.id,
        discountAmount: loyaltyDiscount,
        method: paymentMethod,
        customerId: finalCustomerId,
        pointsUsed: usePoints && customer ? customer.points : 0
      });
      
      
      return res.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success('Thanh toán thành công!');
    },
    onError: (error: any) => {
      toast.error('Thanh toán thất bại', { description: error.message });
    }
  });

  // Process Split Bill
  const splitBillMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const res = await api.post('/payments/split', {
        orderId: order.id,
        itemIdsToSplit: selectedItemIds
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Đã tách hóa đơn thành công!');
      setSplitDialogOpen(false);
      // Automatically redirect to the newly created split order
      router.push(`/payment/${data.newOrderId}`);
    },
    onError: (error: any) => {
      toast.error('Tách hóa đơn thất bại', { description: error.message });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleToggleSplitItem = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAllSplit = () => {
    if (selectedItemIds.length === order?.items.length - 1) { // Leave at least 1 item
      setSelectedItemIds([]);
    } else {
      const allButOne = order?.items.slice(1).map((i: any) => i.id) || [];
      setSelectedItemIds(allButOne);
    }
  };

  const handleSearchCustomer = async () => {
    if (!phone || phone.length < 10) return;
    setIsSearchingCustomer(true);
    try {
      const res = await api.get(`/customers/phone/${phone}`);
      // axios interceptor already unwraps response.data → { success, data }
      const customerData = res.data;
      setCustomer(customerData);
      toast.success(`Đã tìm thấy: ${customerData.fullName} (${customerData.points} điểm)`);
    } catch (e) {
      setCustomer({ fullName: 'Khách hàng mới', points: 0 });
      toast.info('Khách hàng mới, sẽ được tích điểm sau khi thanh toán');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handlePrintReceipt = () => {
    setPrintPreviewOpen(true);
  };

  const loyaltyDiscount = usePoints && customer ? customer.points * 1000 : 0;
  const finalAmount = order ? Math.max(0, order.totalAmount - loyaltyDiscount) : 0;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-slate-500 gap-4">
        <FileText className="h-16 w-16 opacity-20" />
        <p>Không tìm thấy hóa đơn</p>
        <Button onClick={() => router.push('/tables')} variant="outline">Quay lại sơ đồ bàn</Button>
      </div>
    );
  }

  if (isSuccess || order.status === 'paid') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] max-w-md mx-auto print:hidden">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thanh toán thành công</h1>
        <p className="text-slate-500 mb-8 text-center">
          Đơn hàng {order.id.split('-')[0].toUpperCase()} đã được thanh toán hoàn tất.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-2" /> In hóa đơn
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => router.push(`/invoice-preview/${order.id}`)}>
              <FileText className="w-4 h-4 mr-2" /> Xem trước hóa đơn
            </Button>
          </div>
          <Button className="w-full" onClick={() => router.push('/tables')}>
            Về sơ đồ bàn
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto space-y-6 print:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thanh toán</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Hóa đơn cho Bàn {order.table?.tableNumber || '...'}
            </p>
          </div>
        </div>
        
        {/* Nút tách bill */}
        {order.items.length > 1 && (
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedItemIds([]);
              setSplitDialogOpen(true);
            }}
          >
            <SplitSquareHorizontal className="mr-2 h-4 w-4" />
            Tách hóa đơn
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-start">
        {/* Order Summary */}
        <Card className="h-full max-h-[calc(100vh-10rem)] flex flex-col shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle>Chi tiết hóa đơn</CardTitle>
            <CardDescription>Mã: {order.orderCode}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 w-6">{item.quantity}x</span>
                      <div>
                        <p className="font-medium leading-none">{item.menuItem.name}</p>
                        {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                      </div>
                    </div>
                    <span className="font-medium whitespace-nowrap">
                      {formatCurrency(item.menuItem.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
              <div className="flex justify-between text-slate-500">
                <span>Tạm tính</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Thuế (VAT 8%)</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Khuyến mãi (Điểm)</span>
                  <span>- {formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              
              <Separator className="my-2" />
              <div className="flex justify-between text-xl font-bold">
                <span>Tổng thanh toán</span>
                <span className="text-primary">{formatCurrency(finalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Loyalty + Payment Methods */}
        <div className="space-y-6">
          {/* Customer Loyalty Card */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Khách hàng thân thiết
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Nhập SĐT khách hàng..." 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                />
                <Button variant="secondary" onClick={handleSearchCustomer} disabled={isSearchingCustomer || !phone}>
                  {isSearchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tìm'}
                </Button>
              </div>
              
              {customer && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">{customer.fullName}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {customer.points} điểm
                    </Badge>
                  </div>
                  {customer.points > 0 && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-primary/10">
                      <Checkbox 
                        id="use-points" 
                        checked={usePoints}
                        onCheckedChange={(c) => setUsePoints(c as boolean)}
                      />
                      <label htmlFor="use-points" className="text-sm font-medium leading-none cursor-pointer">
                        Dùng <span className="font-bold text-primary">{customer.points}</span> điểm giảm {formatCurrency(customer.points * 1000)}
                      </label>
                    </div>
                  )}
                  {!usePoints && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Sẽ được tích thêm <span className="font-bold text-primary">{Math.floor(finalAmount / 10000)}</span> điểm sau hóa đơn này.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                  className={`h-24 flex flex-col gap-2 ${paymentMethod === 'cash' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-6 w-6" />
                  Tiền mặt
                </Button>
                <Button 
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'} 
                  className={`h-24 flex flex-col gap-2 ${paymentMethod === 'transfer' ? 'ring-2 ring-primary ring-offset-2 bg-[#0052CC] hover:bg-[#0040A8] text-white border-transparent' : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  <QrCode className="h-6 w-6" />
                  Chuyển khoản / QR
                </Button>
                <Button 
                  variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                  className={`h-24 flex flex-col gap-2 ${paymentMethod === 'card' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-6 w-6" />
                  Thẻ
                </Button>
              </div>

              {/* VietQR Display */}
              {paymentMethod === 'transfer' && (
                <div className="mt-8 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#0052CC]/30 rounded-xl bg-[#0052CC]/5">
                  <h3 className="font-bold text-[#0052CC] mb-4">Quét mã VietQR để thanh toán</h3>
                  
                  {isQrLoading ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-white rounded-lg shadow-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
                    </div>
                  ) : qrData?.qrUrl ? (
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <img src={qrData.qrUrl} alt="VietQR" className="w-48 h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-white rounded-lg shadow-sm text-red-500 text-center p-4">
                      Lỗi không thể tải mã QR
                    </div>
                  )}
                  
                  <p className="text-sm text-slate-500 mt-4 text-center">
                    Giao dịch sẽ được tự động xác nhận sau khi chuyển khoản thành công.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-6">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-bold"
                onClick={() => processPaymentMutation.mutate()}
                disabled={processPaymentMutation.isPending}
              >
                {processPaymentMutation.isPending ? (
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                )}
                Xác nhận thu {formatCurrency(finalAmount)}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Split Bill Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tách hóa đơn theo món</DialogTitle>
            <DialogDescription>
              Chọn các món bạn muốn chuyển sang một hóa đơn phụ mới.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-slate-500">Danh sách món ăn</span>
              <Button variant="ghost" size="sm" onClick={handleSelectAllSplit}>
                Chọn nhiều
              </Button>
            </div>
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <Checkbox 
                      id={item.id} 
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={() => handleToggleSplitItem(item.id)}
                    />
                    <div className="grid gap-1.5 leading-none cursor-pointer flex-1" onClick={() => handleToggleSplitItem(item.id)}>
                      <label
                        htmlFor={item.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex justify-between"
                      >
                        <span>{item.quantity}x {item.menuItem.name}</span>
                        <span>{formatCurrency(item.menuItem.price * item.quantity)}</span>
                      </label>
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={() => splitBillMutation.mutate()} 
              disabled={selectedItemIds.length === 0 || selectedItemIds.length === order.items.length || splitBillMutation.isPending}
            >
              {splitBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận tách ({selectedItemIds.length} món)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="max-w-md bg-slate-100 dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Bản xem trước hóa đơn</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-white p-4 shadow-md font-mono text-xs w-[300px] text-black">
              <div className="text-center mb-4">
                <h1 className="font-bold text-xl mb-1">RestoPOS</h1>
                <p className="mb-1">123 Đường Cầu Giấy, Hà Nội</p>
                <p>SĐT: 0123 456 789</p>
                <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
                <h2 className="font-bold text-lg">HÓA ĐƠN THANH TOÁN</h2>
                <p className="mt-1">Số: #{order.orderCode}</p>
                <p>Bàn: {order.table?.tableNumber || 'Mang về'}</p>
                <p>Ngày: {new Date().toLocaleString('vi-VN')}</p>
                <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left font-semibold pb-1">Món</th>
                    <th className="text-center font-semibold pb-1">SL</th>
                    <th className="text-right font-semibold pb-1">T.Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1 pr-1">{item.menuItem.name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{new Intl.NumberFormat('vi-VN').format(item.menuItem.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between mb-1">
                <span>Tạm tính:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Thuế (VAT 8%):</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between mb-1">
                  <span>Giảm trừ điểm:</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm mt-2 mb-2">
                <span>TỔNG CỘNG:</span>
                <span>{formatCurrency(finalAmount)}</span>
              </div>
              {customer && (
                <>
                  <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
                  <div className="text-center space-y-1">
                    <p>Khách hàng: <strong>{customer.fullName}</strong></p>
                    {!usePoints && <p>Tích lũy thêm: {Math.floor(finalAmount / 10000)} điểm</p>}
                  </div>
                </>
              )}
              <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
              <div className="text-center mt-4">
                <p className="font-bold mb-1">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</p>
                <p>Powered by RestoPOS</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>Đóng</Button>
            <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Xác nhận In Máy In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Receipt Template (80mm width standard) */}
      <div id="receipt-print-area" className="hidden print:block font-mono text-sm absolute top-0 left-0 bg-white" style={{ width: '80mm', padding: '10mm', color: 'black' }}>
        <div className="text-center mb-4">
          <h1 className="font-bold text-xl mb-1">RestoPOS</h1>
          <p className="text-xs mb-1">123 Đường Cầu Giấy, Hà Nội</p>
          <p className="text-xs">SĐT: 0123 456 789</p>
          <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
          <h2 className="font-bold text-lg">HÓA ĐƠN THANH TOÁN</h2>
          <p className="text-xs mt-1">Số: #{order.orderCode}</p>
          <p className="text-xs">Bàn: {order.table?.tableNumber || 'Mang về'}</p>
          <p className="text-xs">Ngày: {new Date().toLocaleString('vi-VN')}</p>
          <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
        </div>

        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left font-semibold pb-1">Món</th>
                <th className="text-center font-semibold pb-1">SL</th>
                <th className="text-right font-semibold pb-1">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-1 pr-1">{item.menuItem.name}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{new Intl.NumberFormat('vi-VN').format(item.menuItem.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-b-2 border-dashed border-gray-400 my-2"></div>

        <div className="flex justify-between mb-1">
          <span>Tạm tính:</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Thuế (VAT 8%):</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>
        
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between mb-1">
            <span>Giảm trừ điểm:</span>
            <span>-{formatCurrency(loyaltyDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-base mt-2 mb-2">
          <span>TỔNG CỘNG:</span>
          <span>{formatCurrency(finalAmount)}</span>
        </div>

        {customer && (
          <>
            <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
            <div className="text-xs text-center space-y-1">
              <p>Khách hàng: <strong>{customer.fullName}</strong></p>
              {!usePoints && <p>Tích lũy thêm: {Math.floor(finalAmount / 10000)} điểm</p>}
            </div>
          </>
        )}

        <div className="border-b-2 border-dashed border-gray-400 my-2"></div>
        <div className="text-center text-xs mt-4">
          <p className="font-bold mb-1">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</p>
          <p>Powered by RestoPOS</p>
        </div>
      </div>

    </div>
    </>
  );
}
