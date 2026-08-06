'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard,
  LayoutGrid, 
  UtensilsCrossed, 
  ChefHat, 
  Receipt, 
  Settings, 
  LogOut,
  Menu,
  X,
  Package,
  Users,
  CalendarClock,
  Clock,
  UserSquare
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';
import { formatRole } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Protected route check
  useEffect(() => {
    if (isMounted) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!user) {
        logout();
      }
    }
  }, [isAuthenticated, user, isMounted, router, logout]);

  // Role-based route guard
  useEffect(() => {
    if (isMounted && isAuthenticated && user) {
      const menuItems = [
        { href: '/', roles: ['ADMIN', 'MANAGER'] },
        { href: '/tables', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
        { href: '/kds', roles: ['ADMIN', 'MANAGER', 'KITCHEN'] },
        { href: '/menu', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'] },
        { href: '/inventory', roles: ['ADMIN', 'MANAGER'] },
        { href: '/customers', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
        { href: '/staff', roles: ['ADMIN', 'MANAGER'] },
        { href: '/shifts', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
        { href: '/reservations', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
        { href: '/invoices', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
        { href: '/settings', roles: ['ADMIN', 'MANAGER'] },
      ];
      const allowedItem = menuItems.find(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
      if (allowedItem && !allowedItem.roles.includes(user.role)) {
        toast.error('Truy cập bị từ chối', { description: 'Bạn không có quyền xem trang này.' });
        if (user.role === 'KITCHEN') router.push('/kds');
        else if (user.role === 'ADMIN' || user.role === 'MANAGER') router.push('/');
        else router.push('/tables');
      }
    }
  }, [pathname, isMounted, isAuthenticated, user, router]);

  // Wait until mounted to prevent hydration mismatch and false redirects
  if (!isMounted || !isAuthenticated || !user) {
    return null; 
  }

  const handleLogout = () => {
    logout();
    toast.info('Đã đăng xuất', { description: 'Hẹn gặp lại bạn lần sau!' });
    router.push('/login');
  };

  const menuItems = [
    { href: '/', icon: LayoutDashboard, label: 'Tổng quan', roles: ['ADMIN', 'MANAGER'] },
    { href: '/tables', icon: LayoutGrid, label: 'Sơ đồ bàn', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'] },
    { href: '/kds', icon: ChefHat, label: 'Bếp (KDS)', roles: ['ADMIN', 'MANAGER', 'KITCHEN'] },
    { href: '/menu', icon: UtensilsCrossed, label: 'Thực đơn', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'] },
    { href: '/inventory', icon: Package, label: 'Kho hàng', roles: ['ADMIN', 'MANAGER'] },
    { href: '/customers', icon: UserSquare, label: 'Khách hàng', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/staff', icon: Users, label: 'Nhân sự', roles: ['ADMIN', 'MANAGER'] },
    { href: '/shifts', icon: Clock, label: 'Ca làm việc', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/reservations', icon: CalendarClock, label: 'Đặt bàn', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/invoices', icon: Receipt, label: 'Hóa đơn', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { href: '/settings', icon: Settings, label: 'Cài đặt', roles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex dark:bg-slate-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mr-3">
            <span className="font-bold">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight">RestoPOS</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-medium">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-32">{user.fullName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatRole(user.role)}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-slate-200 dark:border-slate-800" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex h-16 items-center justify-between px-4 border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mr-3">
              <span className="font-bold">R</span>
            </div>
            <span className="font-bold">RestoPOS</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
