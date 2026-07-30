'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  email: z.string().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(1, { message: 'Mật khẩu không được để trống' }),
});

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isAuthenticated) {
      if (!user) {
        // Xử lý trường hợp state bị hỏng (isAuthenticated = true nhưng user = null)
        useAuthStore.getState().logout();
        return;
      }
      if (user.role === 'KITCHEN') {
        router.push('/kds');
      } else {
        router.push('/tables');
      }
    }
  }, [isMounted, isAuthenticated, user, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const res: any = await api.post('/auth/login', values);
      
      if (res.success) {
        const { user: userData, accessToken, refreshToken } = res.data;
        setAuth(userData, accessToken, refreshToken);
        toast.success('Đăng nhập thành công', {
          description: `Chào mừng ${userData.fullName} trở lại!`,
        });
        
        // Redirect based on role
        if (userData.role === 'KITCHEN') {
          router.push('/kds');
        } else {
          router.push('/tables');
        }
      }
    } catch (error: any) {
      toast.error('Đăng nhập thất bại', {
        description: error.message || 'Email hoặc mật khẩu không đúng.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isMounted || isAuthenticated) {
    return null; // Prevents flashing login screen if already authenticated
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <Card className="z-10 w-full max-w-md shadow-xl border-slate-200/50 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl font-bold text-primary">R</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">RestoPOS</CardTitle>
          <CardDescription>Nhập thông tin tài khoản để truy cập hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@restopos.com" {...field} disabled={isLoading} className="bg-white/50 focus:bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Mật khẩu</FormLabel>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                          disabled={isLoading} 
                          className="bg-white/50 focus:bg-white pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Tài khoản dùng thử:</p>
            <div className="mt-2 flex justify-center gap-4">
              <div className="rounded-md bg-slate-100 px-3 py-1 text-xs">admin@restopos.com</div>
              <div className="rounded-md bg-slate-100 px-3 py-1 text-xs">Admin@123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
