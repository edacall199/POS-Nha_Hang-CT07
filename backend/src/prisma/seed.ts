import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Prisma 7: dùng prisma.config.ts để cấu hình DB, client không cần options
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // 0. Seed StoreConfig
  await prisma.storeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', taxRate: 0.08, storeName: 'RestoPOS Demo' },
  });
  console.log(`✅ Đã seed StoreConfig`);

  // 1. Seed Roles
  const roleNames = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];
  const roleDescriptions: Record<string, string> = {
    ADMIN: 'Quản trị viên hệ thống',
    MANAGER: 'Quản lý nhà hàng',
    CASHIER: 'Thu ngân',
    WAITER: 'Nhân viên phục vụ',
    KITCHEN: 'Nhân viên bếp',
  };

  const roles: Record<string, { id: string; name: string }> = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: roleDescriptions[name] },
      create: { name, description: roleDescriptions[name] },
    });
    roles[name] = role;
  }
  console.log(`✅ Đã seed ${roleNames.length} roles`);

  // 2. Seed Users
  const adminHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'admin@restopos.com' },
    update: {},
    create: {
      email: 'admin@restopos.com',
      passwordHash: adminHash,
      fullName: 'Quản trị viên',
      roleId: roles['ADMIN']!.id,
      isActive: true,
    },
  });

  const managerHash = await bcrypt.hash('Manager@123', SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'manager@restopos.com' },
    update: {},
    create: {
      email: 'manager@restopos.com',
      passwordHash: managerHash,
      fullName: 'Quản lý',
      roleId: roles['MANAGER']!.id,
      isActive: true,
    },
  });
  console.log('✅ Đã seed 2 users (admin, manager)');

  // 3. Seed Zones
  let zone1 = await prisma.zone.findFirst({ where: { name: 'Tầng 1' } });
  if (!zone1) zone1 = await prisma.zone.create({ data: { name: 'Tầng 1', description: 'Khu vực tầng 1', isActive: true } });

  let zoneVip = await prisma.zone.findFirst({ where: { name: 'VIP' } });
  if (!zoneVip) zoneVip = await prisma.zone.create({ data: { name: 'VIP', description: 'Khu vực VIP', isActive: true } });
  console.log('✅ Đã seed 2 zones (Tầng 1, VIP)');

  // 4. Seed Tables
  const tablesData = [
    { tableNumber: 'A01', zoneId: zone1.id, capacity: 4 },
    { tableNumber: 'A02', zoneId: zone1.id, capacity: 4 },
    { tableNumber: 'A03', zoneId: zone1.id, capacity: 6 },
    { tableNumber: 'V01', zoneId: zoneVip.id, capacity: 8 },
    { tableNumber: 'V02', zoneId: zoneVip.id, capacity: 10 },
  ];
  for (const t of tablesData) {
    const existing = await prisma.table.findUnique({ where: { tableNumber: t.tableNumber } });
    if (!existing) await prisma.table.create({ data: { ...t, status: 'available' } });
  }
  console.log('✅ Đã seed 5 tables');

  // 5. Seed Categories
  const categoriesData = [
    { name: 'Món chính', icon: '🍽️', sortOrder: 1 },
    { name: 'Đồ uống', icon: '🥤', sortOrder: 2 },
    { name: 'Tráng miệng', icon: '🍮', sortOrder: 3 },
  ];
  const categories: Record<string, { id: string }> = {};
  for (const cat of categoriesData) {
    let category = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!category) category = await prisma.category.create({ data: { ...cat, isActive: true } });
    categories[cat.name] = category;
  }
  console.log('✅ Đã seed 3 categories');

  // 6. Seed Menu Items
  const menuItemsData = [
    { name: 'Phở bò', categoryKey: 'Món chính', price: 85000, description: 'Phở bò truyền thống', prepTimeMinutes: 10 },
    { name: 'Bún bò', categoryKey: 'Món chính', price: 75000, description: 'Bún bò Huế đặc trưng', prepTimeMinutes: 10 },
    { name: 'Cơm sườn', categoryKey: 'Món chính', price: 70000, description: 'Cơm sườn nướng', prepTimeMinutes: 15 },
    { name: 'Cà phê sữa', categoryKey: 'Đồ uống', price: 35000, description: 'Cà phê sữa đá', prepTimeMinutes: 5 },
    { name: 'Trà đào', categoryKey: 'Đồ uống', price: 45000, description: 'Trà đào cam sả', prepTimeMinutes: 5 },
    { name: 'Chè thái', categoryKey: 'Tráng miệng', price: 40000, description: 'Chè thái đặc biệt', prepTimeMinutes: 5 },
  ];
  for (const item of menuItemsData) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name, deletedAt: null } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          categoryId: categories[item.categoryKey]!.id,
          price: item.price,
          description: item.description,
          prepTimeMinutes: item.prepTimeMinutes,
          isAvailable: true,
          isFeatured: false,
        },
      });
    }
  }
  console.log('✅ Đã seed 6 menu items');

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 Admin:   admin@restopos.com   / Admin@123');
  console.log('📧 Manager: manager@restopos.com / Manager@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
