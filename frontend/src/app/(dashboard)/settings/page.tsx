'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Save, Store, Printer, ReceiptText, Banknote, ShieldAlert, Moon, Sun, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Đã lưu cấu hình thành công!');
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-slate-500 mt-1">Cấu hình nhà hàng, máy in hóa đơn và tùy chọn thanh toán.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general"><Store className="w-4 h-4 mr-2" /> Chung</TabsTrigger>
          <TabsTrigger value="payment"><Banknote className="w-4 h-4 mr-2" /> Thanh toán</TabsTrigger>
          <TabsTrigger value="printer"><Printer className="w-4 h-4 mr-2" /> Máy in</TabsTrigger>
          <TabsTrigger value="security"><ShieldAlert className="w-4 h-4 mr-2" /> Bảo mật</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cửa hàng</CardTitle>
              <CardDescription>
                Thông tin này sẽ được hiển thị trên hóa đơn và màn hình của khách hàng.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Tên cửa hàng</Label>
                  <Input id="store-name" defaultValue="RestoPOS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-phone">Số điện thoại</Label>
                  <Input id="store-phone" defaultValue="0123 456 789" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="store-address">Địa chỉ</Label>
                  <Input id="store-address" defaultValue="123 Đường Cầu Giấy, Hà Nội" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Tùy chọn hoạt động</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cho phép Khách tự gọi món (QR)</Label>
                    <p className="text-sm text-slate-500">Khách hàng có thể quét mã QR trên bàn để tự đặt món.</p>
                  </div>
                  <Checkbox defaultChecked className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tính thuế VAT mặc định</Label>
                    <p className="text-sm text-slate-500">Tự động cộng 8% VAT vào mọi hóa đơn.</p>
                  </div>
                  <Checkbox defaultChecked className="h-5 w-5" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Giao diện (Theme)</h3>
                <div className="flex gap-4">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    onClick={() => setTheme('light')}
                    className="flex-1"
                  >
                    <Sun className="w-4 h-4 mr-2" /> Sáng
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                  >
                    <Moon className="w-4 h-4 mr-2" /> Tối
                  </Button>
                  <Button 
                    variant={theme === 'system' ? 'default' : 'outline'} 
                    onClick={() => setTheme('system')}
                    className="flex-1"
                  >
                    <Monitor className="w-4 h-4 mr-2" /> Hệ thống
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 flex justify-end p-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : <><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</>}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tích hợp thanh toán</CardTitle>
              <CardDescription>
                Cấu hình mã VietQR và các phương thức thanh toán khác.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center border font-bold text-blue-600">
                      QR
                    </div>
                    <div>
                      <p className="font-semibold">Thanh toán VietQR động</p>
                      <p className="text-sm text-slate-500">Tự động tạo mã QR tương ứng với số tiền của hóa đơn.</p>
                    </div>
                  </div>
                  <Checkbox defaultChecked className="h-5 w-5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Ngân hàng nhận tiền (BIN)</Label>
                    <Input defaultValue="970436" placeholder="Mã BIN của ngân hàng" />
                  </div>
                  <div className="space-y-2">
                    <Label>Số tài khoản</Label>
                    <Input defaultValue="0000000000" placeholder="Nhập số tài khoản" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tên chủ tài khoản</Label>
                    <Input defaultValue="NGUYEN VAN A" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 flex justify-end p-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>Lưu cấu hình</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình máy in</CardTitle>
              <CardDescription>Cài đặt kết nối với máy in nhiệt tại quầy thu ngân và bếp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Máy in Hóa đơn (Thu ngân)</Label>
                    <p className="text-sm text-slate-500">Tự động in hóa đơn khi bấm "Xác nhận thanh toán".</p>
                  </div>
                  <Checkbox defaultChecked className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <Label>Khổ giấy</Label>
                  <select className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="80mm">80mm (Khuyên dùng)</option>
                    <option value="58mm">58mm</option>
                  </select>
                </div>
                
                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Máy in Phiếu Bếp (KDS)</Label>
                    <p className="text-sm text-slate-500">Tự động in phiếu chế biến khi gửi order xuống bếp.</p>
                  </div>
                  <Checkbox defaultChecked={false} className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900 flex justify-end p-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>Lưu cấu hình</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bảo mật & Phân quyền</CardTitle>
              <CardDescription>Tùy chỉnh các tính năng liên quan đến an toàn hệ thống.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Bảo mật 2 lớp (2FA)</Label>
                  <p className="text-sm text-slate-500">Yêu cầu nhập mã OTP khi quản trị viên đăng nhập.</p>
                </div>
                <Button variant="outline">Cài đặt</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                <div className="space-y-0.5">
                  <Label className="text-red-600 dark:text-red-400">Xóa dữ liệu (Reset hệ thống)</Label>
                  <p className="text-sm text-red-500/80">Xóa toàn bộ hóa đơn, doanh thu và trả về dữ liệu trống.</p>
                </div>
                <Button variant="destructive">Khôi phục gốc</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
