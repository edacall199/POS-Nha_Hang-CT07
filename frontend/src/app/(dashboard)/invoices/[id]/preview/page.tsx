'use client';

import { use, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download, Loader2, CheckCircle2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/axios';

export default function InvoicePreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}`);
      return res.data;
    }
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const handlePrintThermal = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Không tìm thấy hóa đơn</p>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </div>
    );
  }

  const subtotal = Number(order.subtotal) || 0;
  const taxAmount = Number(order.taxAmount) || 0;
  const totalAmount = Number(order.totalAmount) || 0;
  const discount = subtotal + taxAmount - totalAmount;

  return (
    <>
      {/* ========== SCREEN VIEW (hidden when printing) ========== */}
      <div className="print:hidden min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
        {/* Top bar */}
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePrintThermal} className="gap-2">
              <Printer className="h-4 w-4" /> In máy in nhiệt (80mm)
            </Button>
            <Button onClick={handlePrintThermal} className="gap-2 bg-primary text-white">
              <Download className="h-4 w-4" /> Xuất PDF / In
            </Button>
          </div>
        </div>

        {/* A4 Invoice Preview */}
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
          {/* Header gradient */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-10 py-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-wide">RestoPOS</h1>
                </div>
                <p className="text-slate-300 text-sm">123 Đường Cầu Giấy, Hà Nội</p>
                <p className="text-slate-300 text-sm">SĐT: 0123 456 789</p>
              </div>
              <div className="text-right">
                <p className="text-slate-300 text-xs uppercase tracking-widest mb-1">Hóa đơn</p>
                <p className="text-xl font-bold font-mono">{order.orderCode}</p>
                <Badge className={`mt-2 ${order.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-400 text-black'}`}>
                  {order.status === 'paid' ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Đã thanh toán</>
                  ) : 'Chờ thanh toán'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Invoice details */}
          <div className="px-10 py-6">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Thông tin bàn</p>
                <p className="font-semibold text-lg">Bàn {order.table?.tableNumber || '—'}</p>
                {order.table?.zone?.name && (
                  <p className="text-slate-500 text-xs">{order.table.zone.name}</p>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Thời gian</p>
                <p className="font-semibold">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                {order.paidAt && (
                  <p className="text-slate-500 text-xs">Thanh toán: {new Date(order.paidAt).toLocaleString('vi-VN')}</p>
                )}
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-300 w-8">#</th>
                  <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-300">Tên món</th>
                  <th className="text-center py-3 font-semibold text-slate-600 dark:text-slate-300 w-16">SL</th>
                  <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-300 w-28">Đơn giá</th>
                  <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-300 w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 text-slate-400">{idx + 1}</td>
                    <td className="py-3">
                      <p className="font-medium">{item.menuItem?.name}</p>
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(Number(item.menuItem?.price) || 0)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatCurrency((Number(item.menuItem?.price) || 0) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Thuế (VAT 8%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Giảm giá / Điểm thưởng</span>
                    <span>- {formatCurrency(discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Tổng thanh toán</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                {order.payment && (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Phương thức</span>
                    <span className="capitalize">{order.payment.method === 'cash' ? 'Tiền mặt' : order.payment.method === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-slate-400 text-sm">
              <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Cảm ơn Quý Khách đã sử dụng dịch vụ!</p>
              <p>Hẹn gặp lại tại RestoPOS 🙏</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== THERMAL PRINT VIEW (80mm — shown ONLY when printing) ========== */}
      <div
        ref={receiptRef}
        className="hidden print:block font-mono text-black bg-white"
        style={{ width: '80mm', padding: '6mm', fontSize: '11px', lineHeight: '1.6' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>RestoPOS</div>
          <div>123 Đường Cầu Giấy, Hà Nội</div>
          <div>SĐT: 0123 456 789</div>
          <div style={{ borderBottom: '2px dashed #000', margin: '6px 0' }}></div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>HÓA ĐƠN THANH TOÁN</div>
          <div>Số: {order.orderCode}</div>
          <div>Bàn: {order.table?.tableNumber || 'Mang về'}</div>
          <div>Ngày: {new Date(order.createdAt).toLocaleString('vi-VN')}</div>
          <div style={{ borderBottom: '2px dashed #000', margin: '6px 0' }}></div>
        </div>

        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Món</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px' }}>SL</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any) => (
              <tr key={item.id}>
                <td style={{ paddingTop: '3px', paddingRight: '4px' }}>{item.menuItem?.name}</td>
                <td style={{ paddingTop: '3px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ paddingTop: '3px', textAlign: 'right' }}>
                  {new Intl.NumberFormat('vi-VN').format((Number(item.menuItem?.price) || 0) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderBottom: '2px dashed #000', margin: '6px 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Tạm tính:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Thuế (VAT 8%):</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Giảm giá:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px', marginBottom: '4px' }}>
          <span>TỔNG CỘNG:</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        {order.payment && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#555' }}>
            <span>Thanh toán bằng:</span>
            <span>{order.payment.method === 'cash' ? 'Tiền mặt' : order.payment.method === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}</span>
          </div>
        )}

        <div style={{ borderBottom: '2px dashed #000', margin: '6px 0' }}></div>
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CẢM ƠN QUÝ KHÁCH!</div>
          <div>Hẹn gặp lại 🙏</div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#777' }}>Powered by RestoPOS</div>
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
