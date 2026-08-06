import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRole(roleName: string): string {
  switch (roleName?.toUpperCase()) {
    case 'ADMIN': return 'Quản trị viên';
    case 'MANAGER': return 'Quản lý';
    case 'CASHIER': return 'Thu ngân';
    case 'WAITER': return 'Phục vụ';
    case 'KITCHEN': return 'Bếp trưởng';
    default: return roleName || 'Chưa phân quyền';
  }
}
