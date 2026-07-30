// Direct PostgreSQL seed — bypass Prisma for initial data
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/restopos';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('🔌 Connected to PostgreSQL');

  const SALT_ROUNDS = 10;

  // 1. Seed Roles
  const roles = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];
  const roleDescs = {
    ADMIN: 'Quản trị viên hệ thống',
    MANAGER: 'Quản lý nhà hàng',
    CASHIER: 'Thu ngân',
    WAITER: 'Nhân viên phục vụ',
    KITCHEN: 'Nhân viên bếp',
  };

  const roleIds = {};
  for (const name of roles) {
    await client.query(
      `INSERT INTO roles (name, description, permissions)
       VALUES ($1, $2, '[]'::jsonb)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [name, roleDescs[name]]
    );
    const r = await client.query('SELECT id FROM roles WHERE name = $1', [name]);
    roleIds[name] = r.rows[0].id;
  }
  console.log('✅ Seed 5 roles');

  // 2. Seed Users
  const adminHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, is_active, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (email) DO NOTHING`,
    ['admin@restopos.com', adminHash, 'Quản trị viên', roleIds['ADMIN']]
  );

  const managerHash = await bcrypt.hash('Manager@123', SALT_ROUNDS);
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, is_active, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (email) DO NOTHING`,
    ['manager@restopos.com', managerHash, 'Quản lý', roleIds['MANAGER']]
  );
  console.log('✅ Seed 2 users (admin@restopos.com / Admin@123, manager@restopos.com / Manager@123)');

  // 3. Seed Zones
  await client.query(
    `INSERT INTO zones (name, description, is_active)
     VALUES ('Tầng 1', 'Khu vực tầng 1', true),
            ('VIP', 'Khu vực VIP', true)
     ON CONFLICT DO NOTHING`
  );
  const zone1 = await client.query("SELECT id FROM zones WHERE name = 'Tầng 1'");
  const zoneVip = await client.query("SELECT id FROM zones WHERE name = 'VIP'");
  const zone1Id = zone1.rows[0].id;
  const zoneVipId = zoneVip.rows[0].id;
  console.log('✅ Seed 2 zones');

  // 4. Seed Tables
  const tables = [
    { number: 'A01', zone: zone1Id, cap: 4 },
    { number: 'A02', zone: zone1Id, cap: 4 },
    { number: 'A03', zone: zone1Id, cap: 6 },
    { number: 'V01', zone: zoneVipId, cap: 8 },
    { number: 'V02', zone: zoneVipId, cap: 10 },
  ];
  for (const t of tables) {
    await client.query(
      `INSERT INTO tables (table_number, zone_id, capacity, status)
       VALUES ($1, $2, $3, 'available')
       ON CONFLICT (table_number) DO NOTHING`,
      [t.number, t.zone, t.cap]
    );
  }
  console.log('✅ Seed 5 tables');

  // 5. Seed Categories
  const cats = [
    { name: 'Món chính', icon: '🍽️', order: 1 },
    { name: 'Đồ uống', icon: '🥤', order: 2 },
    { name: 'Tráng miệng', icon: '🍮', order: 3 },
  ];
  for (const c of cats) {
    await client.query(
      `INSERT INTO categories (name, icon, sort_order, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT DO NOTHING`,
      [c.name, c.icon, c.order]
    );
  }
  const catIds = {};
  for (const c of cats) {
    const r = await client.query('SELECT id FROM categories WHERE name = $1', [c.name]);
    catIds[c.name] = r.rows[0].id;
  }
  console.log('✅ Seed 3 categories');

  // 6. Seed Menu Items
  const items = [
    { name: 'Phở bò', cat: 'Món chính', price: 85000, desc: 'Phở bò truyền thống', prep: 10 },
    { name: 'Bún bò', cat: 'Món chính', price: 75000, desc: 'Bún bò Huế đặc trưng', prep: 10 },
    { name: 'Cơm sườn', cat: 'Món chính', price: 70000, desc: 'Cơm sườn nướng', prep: 15 },
    { name: 'Cà phê sữa', cat: 'Đồ uống', price: 35000, desc: 'Cà phê sữa đá', prep: 5 },
    { name: 'Trà đào', cat: 'Đồ uống', price: 45000, desc: 'Trà đào cam sả', prep: 5 },
    { name: 'Chè thái', cat: 'Tráng miệng', price: 40000, desc: 'Chè thái đặc biệt', prep: 5 },
  ];
  for (const i of items) {
    await client.query(
      `INSERT INTO menu_items (category_id, name, description, price, prep_time_minutes, is_available, is_featured)
       VALUES ($1, $2, $3, $4, $5, true, false)
       ON CONFLICT DO NOTHING`,
      [catIds[i.cat], i.name, i.desc, i.price, i.prep]
    );
  }
  console.log('✅ Seed 6 menu items');

  await client.end();

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 admin@restopos.com   / Admin@123');
  console.log('📧 manager@restopos.com / Manager@123');
}

main().catch((e) => {
  console.error('❌ Seed thất bại:', e.message);
  process.exit(1);
});
