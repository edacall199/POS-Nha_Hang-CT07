'use client';

import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Printer, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  table: any;
}

export function QrDialog({ isOpen, onClose, table }: QrDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!table) return null;

  // Generate URL for self-ordering
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const orderUrl = `${baseUrl}/order/${table.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    toast.success('Đã sao chép link gọi món!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrCanvas = document.getElementById('table-qr-code') as HTMLCanvasElement;
    const qrDataUrl = qrCanvas?.toDataURL('image/png') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>In mã QR Bàn ${table.tableNumber}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .container { border: 2px dashed #ccc; padding: 30px; display: inline-block; border-radius: 16px; }
            .table-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .instruction { font-size: 16px; color: #555; margin-bottom: 20px; }
            img { width: 250px; height: 250px; }
            .footer { margin-top: 20px; font-size: 14px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="table-name">Bàn ${table.tableNumber}</div>
            <div class="instruction">Quét mã QR để xem Menu & Gọi món</div>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="footer">RestoPOS - Quét bằng Camera điện thoại</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-500" />
            Mã QR Gọi Món (Bàn {table.tableNumber})
          </DialogTitle>
          <DialogDescription>
            In mã QR này để tại bàn. Khách hàng có thể tự quét mã để gọi món không cần nhân viên.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <QRCodeCanvas 
              id="table-qr-code"
              value={orderUrl} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center space-y-2 w-full px-6">
            <p className="text-sm font-medium text-slate-700">Link gọi món trực tiếp:</p>
            <div className="flex items-center gap-2">
              <input 
                readOnly 
                value={orderUrl} 
                className="flex-1 text-xs px-3 py-2 bg-slate-100 rounded-md border-slate-200 border text-slate-500 outline-none"
              />
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            In mã QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
