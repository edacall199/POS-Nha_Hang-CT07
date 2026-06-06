# 🚀 Tiêu Chí 9: Tính Năng Nâng Cao & API/AI

> **Điểm tối đa:** 0.5 điểm  
> **Hệ thống:** RestoPOS – Phần mềm quản lý nhà hàng  
> **Tính năng:** VietQR, MoMo/VNPay, PDF, Email, Telegram Bot, AI Chatbot, AI Combo Gợi Ý

---

## 1. 💳 VietQR Integration – Thanh Toán QR Banking

### 1.1 Mục Đích Thực Tế

> Cho phép khách hàng quét mã QR để chuyển khoản ngân hàng trực tiếp, không cần nhập số tài khoản thủ công. Hệ thống tự động xác nhận thanh toán và cập nhật trạng thái đơn hàng.

### 1.2 Tích Hợp Vào Nghiệp Vụ

```
Thu ngân chọn VietQR → Tạo QR với số tiền → Hiện QR cho khách quét
→ Hệ thống polling/webhook ngân hàng → Xác nhận PAID → Giải phóng bàn
```

### 1.3 Tạo Mã QR VietQR

```typescript
// src/services/vietqr.service.ts
import axios from 'axios';

interface VietQRConfig {
  bankCode: string;        // VCB, TCB, MB, ...
  accountNumber: string;
  accountName: string;
  apiKey: string;
}

interface CreateQRParams {
  orderId: string;
  amount: number;
  description: string;
}

export class VietQRService {
  private config: VietQRConfig;
  private baseUrl = 'https://api.vietqr.io/v2';

  constructor(config: VietQRConfig) {
    this.config = config;
  }

  /**
   * Tạo URL ảnh QR từ VietQR API
   * Chuẩn EMV QRCPS-MPM (Napas 271)
   */
  async createQRImage(params: CreateQRParams): Promise<string> {
    const addInfo = `RESTOPOS ${params.orderId} ${params.description}`.substring(0, 50);

    const response = await axios.post(
      `${this.baseUrl}/generate`,
      {
        accountNo: this.config.accountNumber,
        accountName: this.config.accountName,
        acqId: this.getBankBin(this.config.bankCode),
        amount: params.amount,
        addInfo,
        format: 'text',
        template: 'compact2',
      },
      {
        headers: {
          'x-client-id': this.config.apiKey,
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== '00') {
      throw new Error(`VietQR API error: ${response.data.desc}`);
    }

    return response.data.data.qrDataURL; // Base64 PNG image
  }

  /**
   * Lấy BIN code của ngân hàng (theo danh sách Napas)
   */
  private getBankBin(bankCode: string): string {
    const bankBinMap: Record<string, string> = {
      VCB: '970436', MB: '970422', TCB: '970407',
      VPB: '970432', BID: '970418', ACB: '970416',
      STB: '970403', VIB: '970441', TPB: '970423',
    };
    return bankBinMap[bankCode] || bankCode;
  }
}

// ─── API Endpoint tạo QR ───
// src/controllers/payment.controller.ts
export const generateVietQR = async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, order_code: true, total_amount: true, status: true },
  });

  if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
  if (order.status === 'paid') return res.status(400).json({ message: 'Đơn đã thanh toán' });

  const qrService = new VietQRService({
    bankCode: process.env.VIETQR_BANK_CODE!,
    accountNumber: process.env.VIETQR_ACCOUNT_NUMBER!,
    accountName: process.env.VIETQR_ACCOUNT_NAME!,
    apiKey: process.env.VIETQR_API_KEY!,
  });

  const qrImageBase64 = await qrService.createQRImage({
    orderId: order.order_code,
    amount: Number(order.total_amount),
    description: `TT don hang ${order.order_code}`,
  });

  // Lưu payment record với status pending
  await prisma.payment.upsert({
    where: { order_id: orderId },
    update: { method: 'vietqr', status: 'pending' },
    create: {
      order_id: orderId,
      method: 'vietqr',
      amount: order.total_amount,
      status: 'pending',
    },
  });

  return res.json({
    success: true,
    data: {
      qrImage: qrImageBase64,
      amount: Number(order.total_amount),
      orderCode: order.order_code,
      expiredAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 phút
    },
  });
};
```

### 1.4 Polling Xác Nhận Thanh Toán

```typescript
// Frontend polling (React)
// src/hooks/usePaymentPolling.ts
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../utils/api';

export const usePaymentPolling = (orderId: string, enabled: boolean) => {
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const res = await apiClient.get(`/payments/${orderId}/status`);
        if (res.data.status === 'paid') {
          setStatus('paid');
          clearInterval(intervalRef.current);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    intervalRef.current = setInterval(poll, 3000); // Poll mỗi 3 giây
    poll(); // Poll ngay lập tức

    return () => clearInterval(intervalRef.current);
  }, [orderId, enabled]);

  return { paymentStatus: status };
};
```

### 1.5 Webhook Xác Nhận Tự Động (PAID)

```typescript
// src/controllers/webhook.controller.ts
export const handleBankWebhook = async (req: Request, res: Response) => {
  // Xác thực chữ ký webhook (HMAC-SHA256)
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  if (signature !== `sha256=${expectedSig}`) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { description, amount, transactionId } = req.body;

  // Tìm mã đơn trong nội dung chuyển khoản
  const orderCodeMatch = description.match(/RESTOPOS\s+([A-Z0-9-]+)/i);
  if (!orderCodeMatch) return res.status(200).json({ received: true }); // Không phải giao dịch của hệ thống

  const orderCode = orderCodeMatch[1];

  // Cập nhật trạng thái thanh toán
  const order = await prisma.order.findFirst({
    where: { order_code: orderCode },
    include: { payment: true },
  });

  if (order && order.payment?.status === 'pending') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { order_id: order.id },
        data: {
          status: 'paid',
          transaction_id: transactionId,
          paid_at: new Date(),
          amount,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid', paid_at: new Date() },
      }),
      prisma.table.updateMany({
        where: { id: order.table_id ?? undefined },
        data: { status: 'cleaning' },
      }),
    ]);

    // Emit Socket.IO event để frontend cập nhật realtime
    io.to(`order:${order.id}`).emit('payment:confirmed', { orderId: order.id });
  }

  return res.status(200).json({ received: true });
};
```

---

## 2. 📱 MoMo & VNPay Webhook Handling

### 2.1 Mục Đích Thực Tế

> Tích hợp ví điện tử MoMo và cổng thanh toán VNPay giúp nhà hàng đáp ứng xu hướng thanh toán không tiền mặt ngày càng phổ biến. Webhook tự động cập nhật trạng thái không cần thao tác thủ công.

### 2.2 MoMo Webhook Handler

```typescript
// src/controllers/webhooks/momo.webhook.ts
import crypto from 'crypto';

interface MoMoWebhookPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  resultCode: number; // 0 = success
  transId: string;
  message: string;
  signature: string;
}

export const handleMoMoWebhook = async (req: Request, res: Response) => {
  const payload = req.body as MoMoWebhookPayload;

  // Xác thực chữ ký MoMo
  const rawHash = [
    `accessKey=${process.env.MOMO_ACCESS_KEY}`,
    `amount=${payload.amount}`,
    `message=${payload.message}`,
    `orderId=${payload.orderId}`,
    `partnerCode=${payload.partnerCode}`,
    `requestId=${payload.requestId}`,
    `resultCode=${payload.resultCode}`,
    `transId=${payload.transId}`,
  ].join('&');

  const expectedSignature = crypto
    .createHmac('sha256', process.env.MOMO_SECRET_KEY!)
    .update(rawHash)
    .digest('hex');

  if (payload.signature !== expectedSignature) {
    console.warn('⚠️ MoMo webhook: Invalid signature');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  // resultCode = 0 nghĩa là thanh toán thành công
  if (payload.resultCode === 0) {
    // orderId format: RESTOPOS-{order_code}
    const orderCode = payload.orderId.replace('RESTOPOS-', '');
    
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { order_code: orderCode } });
      if (!order) return;

      await tx.payment.update({
        where: { order_id: order.id },
        data: {
          status: 'paid',
          transaction_id: String(payload.transId),
          paid_at: new Date(),
          metadata: payload as any,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'paid', paid_at: new Date() },
      });
    });
  }

  // MoMo yêu cầu phản hồi ngay với HTTP 204
  return res.status(204).send();
};
```

### 2.3 VNPay Return URL Handler

```typescript
// src/controllers/webhooks/vnpay.webhook.ts
import crypto from 'crypto';
import querystring from 'qs';

export const handleVNPayReturn = async (req: Request, res: Response) => {
  const vnpParams = { ...req.query } as Record<string, string>;
  const secureHash = vnpParams['vnp_SecureHash'];
  
  // Xóa hash trước khi verify
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  // Sort params theo thứ tự alphabet
  const sortedParams = Object.fromEntries(
    Object.entries(vnpParams).sort(([a], [b]) => a.localeCompare(b))
  );

  const signData = querystring.stringify(sortedParams, { encode: false });
  const expectedHash = crypto
    .createHmac('sha512', process.env.VNPAY_HASH_SECRET!)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  if (secureHash !== expectedHash) {
    return res.redirect('/payment/failed?reason=invalid_signature');
  }

  const responseCode = vnpParams['vnp_ResponseCode'];
  const orderInfo = vnpParams['vnp_OrderInfo'];
  const amount = Number(vnpParams['vnp_Amount']) / 100; // VNPay trả về * 100

  if (responseCode === '00') {
    // Thanh toán thành công
    const orderCode = orderInfo.replace('Thanh toan don hang ', '');
    await markOrderAsPaid(orderCode, amount, 'vnpay', vnpParams['vnp_TransactionNo']);
    return res.redirect(`/payment/success?orderId=${orderCode}`);
  }

  return res.redirect(`/payment/failed?code=${responseCode}`);
};
```

---

## 3. 🖨️ Xuất Hóa Đơn PDF

### 3.1 Mục Đích Thực Tế

> Tạo hóa đơn PDF chuyên nghiệp để in tại quầy hoặc gửi email cho khách. Hóa đơn có đầy đủ thông tin pháp lý, logo nhà hàng, mã đơn, danh sách món, tổng tiền và phương thức thanh toán.

### 3.2 Cài Đặt

```bash
npm install html-pdf-node
npm install handlebars  # Template engine cho HTML
```

### 3.3 Template Hóa Đơn HTML

```typescript
// src/templates/invoice.template.ts
export const invoiceTemplate = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #333; }
  .invoice { max-width: 400px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
  .logo { font-size: 24px; font-weight: bold; color: #E53E3E; }
  .restaurant-info { color: #666; font-size: 11px; margin-top: 5px; }
  .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 15px; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .items-table th { background: #f5f5f5; padding: 6px; text-align: left; border-bottom: 1px solid #ddd; }
  .items-table td { padding: 5px 6px; border-bottom: 1px solid #f0f0f0; }
  .totals { border-top: 2px solid #333; padding-top: 10px; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .total-final { font-size: 16px; font-weight: bold; color: #E53E3E; margin-top: 5px; }
  .payment-badge { background: #48BB78; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; }
  .footer { text-align: center; margin-top: 20px; color: #999; font-size: 10px; border-top: 1px dashed #ddd; padding-top: 10px; }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="logo">🍜 RestoPOS</div>
    <div class="restaurant-info">
      Nhà hàng ẩm thực Việt<br>
      123 Đường ABC, Quận 1, TP.HCM<br>
      Tel: 028 1234 5678 | MST: 0123456789
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 15px;">
    <strong>HÓA ĐƠN BÁN HÀNG</strong><br>
    <span style="color: #666;">Số: #{{orderCode}}</span>
  </div>

  <div class="invoice-meta">
    <div>
      <div><strong>Bàn:</strong> {{tableName}}</div>
      <div><strong>Thu ngân:</strong> {{cashierName}}</div>
    </div>
    <div style="text-align: right;">
      <div>{{date}}</div>
      <div>{{time}}</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Món</th>
        <th style="text-align: center;">SL</th>
        <th style="text-align: right;">Đơn giá</th>
        <th style="text-align: right;">T.Tiền</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.name}}{{#if this.notes}}<br><small style="color:#999">→ {{this.notes}}</small>{{/if}}</td>
        <td style="text-align: center;">{{this.quantity}}</td>
        <td style="text-align: right;">{{formatCurrency this.unit_price}}</td>
        <td style="text-align: right;">{{formatCurrency this.subtotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Tạm tính:</span><span>{{formatCurrency subtotal}}</span></div>
    {{#if discountAmount}}<div class="total-row" style="color: green;"><span>Giảm giá:</span><span>-{{formatCurrency discountAmount}}</span></div>{{/if}}
    <div class="total-row"><span>VAT ({{vatRate}}%):</span><span>{{formatCurrency taxAmount}}</span></div>
    <div class="total-row total-final"><span>TỔNG CỘNG:</span><span>{{formatCurrency totalAmount}}</span></div>
    {{#if cashPayment}}
    <div class="total-row" style="color: #666;"><span>Tiền nhận:</span><span>{{formatCurrency receivedAmount}}</span></div>
    <div class="total-row" style="color: #666;"><span>Tiền thừa:</span><span>{{formatCurrency changeAmount}}</span></div>
    {{/if}}
  </div>

  <div style="text-align: center; margin-top: 10px;">
    <span class="payment-badge">✓ {{paymentMethod}}</span>
  </div>

  <div class="footer">
    Cảm ơn quý khách đã ghé thăm!<br>
    Hẹn gặp lại quý khách lần sau 🙏<br>
    <small>In lúc: {{printTime}}</small>
  </div>
</div>
</body>
</html>
`;
```

### 3.4 Service Tạo PDF

```typescript
// src/services/invoice.service.ts
import htmlPdf from 'html-pdf-node';
import Handlebars from 'handlebars';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { invoiceTemplate } from '../templates/invoice.template';

// Đăng ký helper format tiền VND
Handlebars.registerHelper('formatCurrency', (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
);

export const generateInvoicePDF = async (orderId: string): Promise<Buffer> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: { include: { zone: true } },
      orderItems: { include: { menuItem: true } },
      payment: true,
      user: true,
    },
  });

  if (!order) throw new Error('Order not found');

  const now = new Date();
  const templateData = {
    orderCode: order.order_code,
    tableName: order.table
      ? `${order.table.zone.name} - ${order.table.table_number}`
      : 'Mang về',
    cashierName: order.user.full_name,
    date: format(order.created_at, 'dd/MM/yyyy', { locale: vi }),
    time: format(order.created_at, 'HH:mm', { locale: vi }),
    printTime: format(now, 'dd/MM/yyyy HH:mm:ss', { locale: vi }),
    items: order.orderItems.map(item => ({
      name: item.menuItem.name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      notes: item.notes,
    })),
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discount_amount) || 0,
    taxAmount: Number(order.tax_amount),
    totalAmount: Number(order.total_amount),
    vatRate: 10,
    paymentMethod: order.payment?.method?.toUpperCase() || 'TIỀN MẶT',
    cashPayment: order.payment?.method === 'cash',
    receivedAmount: Number(order.payment?.received_amount) || 0,
    changeAmount: Number(order.payment?.change_amount) || 0,
  };

  const template = Handlebars.compile(invoiceTemplate);
  const html = template(templateData);

  const pdfBuffer = await htmlPdf.generatePdf(
    { content: html },
    {
      format: 'A6', // Kích thước hóa đơn nhỏ
      margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' },
      printBackground: true,
    }
  );

  return pdfBuffer as Buffer;
};
```

---

## 4. 📧 Gửi Hóa Đơn Qua Email (Nodemailer)

### 4.1 Mục Đích Thực Tế

> Gửi hóa đơn điện tử qua email ngay sau khi thanh toán, giúp khách hàng lưu trữ và dễ dàng yêu cầu hoàn tiền hoặc kiểm tra lịch sử. Tăng tính chuyên nghiệp và trải nghiệm khách hàng.

### 4.2 Cài Đặt

```bash
npm install nodemailer @types/nodemailer
```

### 4.3 Email Service

```typescript
// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { generateInvoicePDF } from './invoice.service';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvoiceEmail = async (orderId: string, customerEmail: string) => {
  // Tạo PDF
  const pdfBuffer = await generateInvoicePDF(orderId);
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { order_code: true, total_amount: true, paid_at: true },
  });

  if (!order) throw new Error('Order not found');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #E53E3E, #C53030); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">🍜 RestoPOS</h1>
        <p style="color: rgba(255,255,255,0.8);">Cảm ơn quý khách đã sử dụng dịch vụ!</p>
      </div>

      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333;">Xác nhận thanh toán thành công ✅</h2>
        <p>Chúng tôi xác nhận đơn hàng <strong>#${order.order_code}</strong> đã được thanh toán thành công.</p>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #666; padding: 6px 0;">Mã đơn hàng:</td>
              <td style="font-weight: bold; text-align: right;">#${order.order_code}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 6px 0;">Tổng tiền:</td>
              <td style="font-weight: bold; color: #E53E3E; text-align: right;">
                ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total_amount))}
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #666; font-size: 13px;">
          📎 Hóa đơn chi tiết đính kèm trong email này (file PDF).
          Quý khách vui lòng giữ lại hóa đơn để đối chiếu khi cần.
        </p>
      </div>

      <div style="background: #333; color: #999; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        Nhà hàng RestoPOS | 123 Đường ABC, Quận 1, TP.HCM<br>
        Hotline: 028 1234 5678 | Email: contact@restopos.com
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: customerEmail,
    subject: `🧾 Hóa đơn #${order.order_code} - RestoPOS`,
    html: emailHtml,
    attachments: [
      {
        filename: `hoa-don-${order.order_code}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log(`✅ Đã gửi hóa đơn #${order.order_code} đến ${customerEmail}`);
};
```

---

## 5. 🤖 Telegram Bot – Nhắc Đặt Bàn

### 5.1 Mục Đích Thực Tế

> Tự động gửi thông báo nhắc nhở qua Telegram cho khách khi gần đến giờ đặt bàn (30 phút trước). Giảm tỷ lệ khách no-show và giúp nhà hàng chuẩn bị sẵn sàng phục vụ.

### 5.2 Cài Đặt

```bash
npm install node-telegram-bot-api @types/node-telegram-bot-api
npm install node-cron  # Để chạy job nhắc nhở theo lịch
```

### 5.3 Telegram Bot Service

```typescript
// src/services/telegram.service.ts
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });

/**
 * Gửi thông báo xác nhận đặt bàn
 */
export const sendReservationConfirmation = async (
  chatId: string,
  reservation: {
    customerName: string;
    tableName: string;
    reservedAt: Date;
    partySize: number;
    notes?: string;
  }
) => {
  const reservedTime = reservation.reservedAt.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const message = `
✅ *ĐẶT BÀN THÀNH CÔNG*

🏪 Nhà hàng RestoPOS
📋 Khách hàng: *${reservation.customerName}*
🪑 Bàn: *${reservation.tableName}*
👥 Số người: *${reservation.partySize}*
📅 Thời gian: *${reservedTime}*
${reservation.notes ? `📝 Yêu cầu: _${reservation.notes}_` : ''}

⏰ Chúng tôi sẽ nhắc bạn 30 phút trước giờ hẹn.

📞 Liên hệ thay đổi: 028 1234 5678
  `.trim();

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

/**
 * Gửi thông báo nhắc nhở trước 30 phút
 */
export const sendReservationReminder = async (
  chatId: string,
  reservation: { customerName: string; tableName: string; reservedAt: Date }
) => {
  const message = `
⏰ *NHẮC NHỞ ĐẶT BÀN*

Xin chào *${reservation.customerName}*!

Bàn của bạn tại RestoPOS sẽ sẵn sàng trong *30 phút* nữa.

🪑 Bàn: ${reservation.tableName}
⏱️ Giờ hẹn: ${reservation.reservedAt.toLocaleTimeString('vi-VN')}

Chúng tôi mong được phục vụ bạn! 🙏
  `.trim();

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Tôi đến đúng giờ', callback_data: 'confirm_arrival' },
        { text: '❌ Hủy đặt bàn', callback_data: 'cancel_reservation' },
      ]],
    },
  });
};

/**
 * Cron job chạy mỗi phút để kiểm tra và gửi nhắc nhở
 */
export const startReservationReminderCron = () => {
  cron.schedule('* * * * *', async () => {
    const thirtyMinutesLater = new Date(Date.now() + 30 * 60 * 1000);
    const twentyNineMinutesLater = new Date(Date.now() + 29 * 60 * 1000);

    const upcoming = await prisma.reservation.findMany({
      where: {
        reserved_at: { gte: twentyNineMinutesLater, lte: thirtyMinutesLater },
        status: 'confirmed',
        telegram_chat_id: { not: null },
      },
      include: { table: { include: { zone: true } } },
    });

    for (const res of upcoming) {
      if (res.telegram_chat_id) {
        await sendReservationReminder(res.telegram_chat_id, {
          customerName: res.customer_name,
          tableName: `${res.table.zone.name} - ${res.table.table_number}`,
          reservedAt: res.reserved_at,
        });
      }
    }
  });

  console.log('✅ Reservation reminder cron started');
};
```

---

## 6. 💬 Chatbot Tra Cứu Menu (AI-Powered)

### 6.1 Mục Đích Thực Tế

> Chatbot trả lời tự động các câu hỏi thường gặp của khách như: "Có món chay không?", "Món nào phù hợp trẻ em?", "Phở bao nhiêu tiền?". Giảm tải cho nhân viên và cải thiện trải nghiệm khách hàng.

### 6.2 Tích Hợp Vào Nghiệp Vụ

```
Khách nhắn tin trên website/Zalo → Chatbot xử lý NLP
→ Tra cứu menu từ DB → Trả lời thông minh
→ Không trả lời được → Chuyển cho nhân viên
```

### 6.3 Cài Đặt

```bash
npm install openai  # Hoặc @google/generative-ai cho Gemini
```

### 6.4 Menu Chatbot Service

```typescript
// src/services/chatbot.service.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class MenuChatbot {
  /**
   * Lấy context thực đơn từ DB để đưa vào prompt
   */
  private async getMenuContext(): Promise<string> {
    const menuItems = await prisma.menuItem.findMany({
      where: { is_available: true, deleted_at: null },
      include: { category: true },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    const groupedByCategory = menuItems.reduce((acc, item) => {
      const cat = item.category.name;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(`  - ${item.name}: ${Number(item.price).toLocaleString('vi-VN')}đ${item.description ? ` (${item.description})` : ''}`);
      return acc;
    }, {} as Record<string, string[]>);

    return Object.entries(groupedByCategory)
      .map(([cat, items]) => `${cat}:\n${items.join('\n')}`)
      .join('\n\n');
  }

  /**
   * Trả lời câu hỏi từ khách
   */
  async chat(userMessage: string, conversationHistory: { role: string; content: string }[]) {
    const menuContext = await this.getMenuContext();

    const systemPrompt = `Bạn là trợ lý ảo của nhà hàng RestoPOS. Hãy trả lời thân thiện, ngắn gọn bằng tiếng Việt.

THỰC ĐƠN HIỆN TẠI:
${menuContext}

HƯỚNG DẪN:
- Chỉ tư vấn về thực đơn và dịch vụ của nhà hàng
- Nếu khách hỏi về giá, hãy báo giá chính xác từ menu
- Nếu không có thông tin, nói "Tôi sẽ chuyển câu hỏi này cho nhân viên hỗ trợ bạn ngay"
- Đề xuất combo khi phù hợp
- Luôn lịch sự và nhiệt tình`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({ // Giữ 10 tin nhắn gần nhất
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || 'Xin lỗi, tôi không hiểu câu hỏi của bạn.';
  }
}

// API Endpoint
// POST /api/v1/chatbot/message
export const chatbotHandler = async (req: Request, res: Response) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Tin nhắn không được trống' });
  }

  const chatbot = new MenuChatbot();
  const response = await chatbot.chat(message, history);

  return res.json({ success: true, data: { reply: response } });
};
```

---

## 7. 🧠 AI Gợi Ý Combo Dựa Trên Lịch Sử Order

### 7.1 Mục Đích Thực Tế

> Phân tích lịch sử đặt món để gợi ý combo thông minh, tăng giá trị đơn hàng trung bình (upsell). Ví dụ: Khách hay gọi Phở → gợi ý thêm Chả giò + Nước cam.

### 7.2 Tích Hợp Vào Nghiệp Vụ

```
Nhân viên mở màn hình order → AI phân tích lịch sử
→ Hiển thị gợi ý "Khách thường gọi kèm..." 
→ Nhân viên đề xuất với khách → Tăng doanh thu
```

### 7.3 Market Basket Analysis (Apriori Algorithm)

```typescript
// src/services/combo-suggestion.service.ts

interface ComboSuggestion {
  suggestedItem: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
  };
  confidence: number; // % khách gọi thêm món này
  supportCount: number; // Số lần xuất hiện cùng nhau
  reason: string;
}

export class ComboSuggestionService {
  /**
   * Lấy gợi ý combo dựa trên item đã chọn
   * Sử dụng Association Rule Mining đơn giản
   */
  async getSuggestions(selectedItemIds: string[]): Promise<ComboSuggestion[]> {
    // Lấy tất cả đơn hàng trong 30 ngày gần nhất chứa các món đã chọn
    const ordersWithItems = await prisma.order.findMany({
      where: {
        status: 'paid',
        created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        orderItems: {
          some: { menu_item_id: { in: selectedItemIds } },
        },
      },
      include: {
        orderItems: {
          where: { status: { not: 'cancelled' } },
          include: {
            menuItem: {
              select: { id: true, name: true, price: true, image_url: true, is_available: true },
            },
          },
        },
      },
    });

    // Đếm tần suất xuất hiện cùng nhau
    const itemFrequency: Record<string, { count: number; item: any }> = {};
    const totalOrders = ordersWithItems.length;

    for (const order of ordersWithItems) {
      const otherItems = order.orderItems.filter(
        oi => !selectedItemIds.includes(oi.menu_item_id) && oi.menuItem.is_available
      );

      for (const oi of otherItems) {
        if (!itemFrequency[oi.menu_item_id]) {
          itemFrequency[oi.menu_item_id] = { count: 0, item: oi.menuItem };
        }
        itemFrequency[oi.menu_item_id].count++;
      }
    }

    // Tính confidence và sort
    const suggestions: ComboSuggestion[] = Object.values(itemFrequency)
      .filter(({ count }) => count >= 3) // Tối thiểu 3 lần để đủ tin cậy
      .map(({ count, item }) => ({
        suggestedItem: {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          imageUrl: item.image_url,
        },
        confidence: Math.round((count / totalOrders) * 100),
        supportCount: count,
        reason: `${count} khách đã gọi kèm trong 30 ngày qua`,
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 gợi ý

    return suggestions;
  }

  /**
   * Gợi ý AI thông minh hơn dùng Gemini API
   */
  async getAISuggestions(
    selectedItems: { name: string; category: string }[],
    timeOfDay: string
  ): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Bạn là chuyên gia ẩm thực. Khách đang gọi: ${selectedItems.map(i => i.name).join(', ')}.
Thời điểm: ${timeOfDay}.

Hãy gợi ý ngắn gọn 1-2 món ăn kèm hoặc đồ uống phù hợp nhất (chỉ 1-2 câu, thân thiện).
    `.trim();

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// API Endpoint
// POST /api/v1/suggestions/combo
export const getComboSuggestions = async (req: Request, res: Response) => {
  const { selectedItemIds } = req.body;

  if (!Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
    return res.status(400).json({ error: 'Cần ít nhất 1 món đã chọn' });
  }

  const service = new ComboSuggestionService();
  const [statistical, aiText] = await Promise.all([
    service.getSuggestions(selectedItemIds),
    service.getAISuggestions([], getTimeOfDay()),
  ]);

  return res.json({
    success: true,
    data: {
      statistical, // Gợi ý từ phân tích lịch sử
      aiRecommendation: aiText, // Gợi ý từ AI
    },
  });
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'sáng sớm';
  if (hour < 12) return 'buổi sáng';
  if (hour < 14) return 'buổi trưa';
  if (hour < 18) return 'buổi chiều';
  return 'buổi tối';
}
```

---

## 8. 📋 Tổng Hợp Tính Năng Nâng Cao

| Tính năng | Công nghệ | Giá trị nghiệp vụ | Độ phức tạp |
|-----------|-----------|-------------------|-------------|
| 💳 VietQR | VietQR API + Polling | Thanh toán nhanh, không tiền mặt | ⭐⭐⭐ |
| 📱 MoMo Webhook | HMAC-SHA256 signature | Xác nhận tự động, an toàn | ⭐⭐⭐ |
| 💳 VNPay | VNPay sandbox API | Hỗ trợ thẻ ATM/VISA/Master | ⭐⭐⭐ |
| 🖨️ PDF Invoice | html-pdf-node + Handlebars | Hóa đơn chuyên nghiệp, lưu trữ | ⭐⭐ |
| 📧 Email | Nodemailer + SMTP | Gửi hóa đơn điện tử cho khách | ⭐⭐ |
| 🤖 Telegram Bot | node-telegram-bot-api | Nhắc đặt bàn, giảm no-show | ⭐⭐⭐ |
| 💬 AI Chatbot | OpenAI GPT-4o-mini | Tư vấn menu 24/7, giảm tải NV | ⭐⭐⭐⭐ |
| 🧠 AI Combo | Market Basket + Gemini | Tăng giá trị đơn hàng (upsell) | ⭐⭐⭐⭐ |

---

> 💡 **Lưu ý tích hợp:** Tất cả API key của bên thứ ba (OpenAI, Telegram, MoMo, VNPay) cần được lưu trong biến môi trường `.env` và không commit lên Git. Sử dụng sandbox/test mode khi phát triển để tránh phát sinh chi phí thực tế.

