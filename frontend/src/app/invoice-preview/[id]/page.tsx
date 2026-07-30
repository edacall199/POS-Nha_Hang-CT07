'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft, CheckCircle2, Clock, Store } from 'lucide-react';
import api from '@/lib/axios';

export default function InvoicePreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;

  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-preview', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    }
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <p className="text-slate-500">Không tìm thấy hóa đơn</p>
        <button onClick={() => router.back()} className="text-blue-600 underline">Quay lại</button>
      </div>
    );
  }

  const subtotal = Number(order.subtotal) || 0;
  const taxAmount = Number(order.taxAmount) || 0;
  const totalAmount = Number(order.totalAmount) || 0;
  const discount = subtotal + taxAmount - totalAmount;
  const isPaid = order.status === 'paid';

  return (
    <>
      {/* ===== SCREEN VIEW (hidden when printing) ===== */}
      <div className="print:hidden min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        {/* Top action bar */}
        <div className="max-w-3xl mx-auto flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-700 transition-colors shadow-lg"
          >
            <Printer className="h-4 w-4" /> In / Xuất PDF
          </button>
        </div>

        {/* A4-style invoice card */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white px-10 py-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold tracking-wide">RestoPOS</span>
                </div>
                <p className="text-slate-400 text-sm">123 Đường Cầu Giấy, Hà Nội</p>
                <p className="text-slate-400 text-sm">SĐT: 0123 456 789</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Hóa đơn</p>
                <p className="text-2xl font-bold font-mono tracking-wide">{order.orderCode}</p>
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-400/20 text-amber-400'}`}>
                  {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-10 py-8">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Bàn</p>
                <p className="text-xl font-bold">Bàn {order.table?.tableNumber || '—'}</p>
                {order.table?.zone?.name && <p className="text-slate-400 text-xs mt-0.5">{order.table.zone.name}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Thời gian</p>
                <p className="font-semibold text-sm">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                {order.paidAt && (
                  <p className="text-slate-400 text-xs mt-1">Thanh toán: {new Date(order.paidAt).toLocaleString('vi-VN')}</p>
                )}
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 text-slate-500 font-semibold w-8">#</th>
                  <th className="text-left py-3 text-slate-500 font-semibold">Tên món</th>
                  <th className="text-center py-3 text-slate-500 font-semibold w-14">SL</th>
                  <th className="text-right py-3 text-slate-500 font-semibold w-28">Đơn giá</th>
                  <th className="text-right py-3 text-slate-500 font-semibold w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{item.menuItem?.name}</p>
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5 italic">({item.notes})</p>}
                    </td>
                    <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-500">{formatCurrency(Number(item.menuItem?.price) || 0)}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">
                      {formatCurrency((Number(item.menuItem?.price) || 0) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-10">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Tạm tính</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Thuế VAT (8%)</span><span>{formatCurrency(taxAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Giảm giá</span><span>- {formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
                  <span>Tổng thanh toán</span><span>{formatCurrency(totalAmount)}</span>
                </div>
                {order.payment?.method && (
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>Phương thức</span>
                    <span>{order.payment.method === 'cash' ? 'Tiền mặt' : order.payment.method === 'transfer' ? 'Chuyển khoản / QR' : 'Thẻ ngân hàng'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-6 text-center text-slate-400 text-sm">
              <p className="font-semibold text-slate-600 mb-1">Cảm ơn Quý Khách đã sử dụng dịch vụ!</p>
              <p>Hẹn gặp lại tại RestoPOS 🙏</p>
              <p className="text-xs mt-2 text-slate-300">Powered by RestoPOS — v2.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== THERMAL PRINT ONLY (80mm — visible ONLY when printing) ===== */}
      <div
        className="hidden print:block"
        style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5', color: '#000', background: '#fff', width: '72mm', padding: '4mm', margin: '0' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>RestoPOS</div>
          <div style={{ fontSize: '11px' }}>123 Đường Cầu Giấy, Hà Nội</div>
          <div style={{ fontSize: '11px' }}>SĐT: 0123 456 789</div>
          <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>HÓA ĐƠN THANH TOÁN</div>
          <div style={{ fontSize: '11px' }}>Mã: {order.orderCode}</div>
          <div style={{ fontSize: '11px' }}>Bàn: {order.table?.tableNumber || 'Mang về'}</div>
          <div style={{ fontSize: '11px' }}>Ngày: {new Date(order.createdAt).toLocaleString('vi-VN')}</div>
          <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #000', paddingBottom: '3px' }}>Món</th>
              <th style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '3px', width: '20px' }}>SL</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #000', paddingBottom: '3px' }}>T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any) => (
              <tr key={item.id}>
                <td style={{ paddingTop: '3px' }}>{item.menuItem?.name}</td>
                <td style={{ paddingTop: '3px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ paddingTop: '3px', textAlign: 'right' }}>
                  {new Intl.NumberFormat('vi-VN').format((Number(item.menuItem?.price) || 0) * item.quantity)}đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '1px dashed #000', marginTop: '5px', paddingTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>Tạm tính:</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>Thuế (VAT 8%):</span><span>{formatCurrency(taxAmount)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Giảm giá:</span><span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px dashed #000', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
            <span>TỔNG CỘNG:</span><span>{formatCurrency(totalAmount)}</span>
          </div>
          {order.payment?.method && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginTop: '2px' }}>
              <span>Thanh toán:</span>
              <span>{order.payment.method === 'cash' ? 'Tiền mặt' : order.payment.method === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '8px', textAlign: 'center', fontSize: '11px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>CẢM ƠN QUÝ KHÁCH!</div>
          <div>Hẹn gặp lại tại RestoPOS 🙏</div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        }
      `}</style>
    </>
  );
}
