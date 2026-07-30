import { prisma } from '../lib/prisma';

export const analyticsService = {
  async getDashboardStats(timeRange: string = 'day') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Revenue Today vs Yesterday
    const todayOrders = await prisma.order.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: today },
      },
    });
    
    const yesterdayOrders = await prisma.order.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: yesterday, lt: today },
      },
    });

    const todayShifts = await prisma.workShift.findMany({
      where: { status: 'closed', endTime: { gte: today } },
      include: { orders: { include: { payment: true } } }
    });
    let todayDifference = 0;
    todayShifts.forEach(s => {
      const cashSales = s.orders.reduce((sum, o) => sum + (o.payment?.method === 'cash' ? Number(o.totalAmount) : 0), 0);
      todayDifference += (Number(s.closingCash) - (Number(s.openingCash) + cashSales));
    });

    const yesterdayShifts = await prisma.workShift.findMany({
      where: { status: 'closed', endTime: { gte: yesterday, lt: today } },
      include: { orders: { include: { payment: true } } }
    });
    let yesterdayDifference = 0;
    yesterdayShifts.forEach(s => {
      const cashSales = s.orders.reduce((sum, o) => sum + (o.payment?.method === 'cash' ? Number(o.totalAmount) : 0), 0);
      yesterdayDifference += (Number(s.closingCash) - (Number(s.openingCash) + cashSales));
    });

    const revenueToday = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const revenueYesterday = yesterdayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const revenueGrowth = revenueYesterday === 0 ? 100 : ((revenueToday - revenueYesterday) / revenueYesterday) * 100;

    const ordersCountToday = todayOrders.length;
    const ordersCountYesterday = yesterdayOrders.length;
    const ordersGrowth = ordersCountYesterday === 0 ? 100 : ((ordersCountToday - ordersCountYesterday) / ordersCountYesterday) * 100;

    // 2. Revenue Chart
    let startDate = new Date(today);
    const chartDataMap = new Map<string, { date: string, dineIn: number, takeaway: number, total: number }>();

    if (timeRange === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 4); // Last 5 years
      startDate.setMonth(0, 1);
      for (let i = 4; i >= 0; i--) {
        const y = today.getFullYear() - i;
        const dateStr = y.toString();
        chartDataMap.set(dateStr, { date: dateStr, dineIn: 0, takeaway: 0, total: 0 });
      }
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 11); // Last 12 months
      startDate.setDate(1);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
        chartDataMap.set(dateStr, { date: dateStr, dineIn: 0, takeaway: 0, total: 0 });
      }
    } else {
      // Default: day
      startDate.setDate(startDate.getDate() - 29); // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        chartDataMap.set(dateStr, { date: dateStr, dineIn: 0, takeaway: 0, total: 0 });
      }
    }

    const recentOrders = await prisma.order.findMany({
      where: {
        status: 'paid',
        paidAt: { gte: startDate },
      },
      select: {
        paidAt: true,
        totalAmount: true,
        orderType: true,
      }
    });

    recentOrders.forEach(order => {
      if (!order.paidAt) return;
      let dateStr = '';
      if (timeRange === 'year') {
        dateStr = order.paidAt.getFullYear().toString();
      } else if (timeRange === 'month') {
        dateStr = order.paidAt.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
      } else {
        dateStr = order.paidAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
      
      const entry = chartDataMap.get(dateStr);
      if (entry) {
        const amt = Number(order.totalAmount);
        entry.total += amt;
        if (order.orderType === 'dine_in') entry.dineIn += amt;
        else entry.takeaway += amt;
      }
    });

    const revenueChart = Array.from(chartDataMap.values());

    // 3. Top Items (Last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const topItemsData = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: { status: 'paid', paidAt: { gte: last30Days } }
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 5,
    });

    const topItems = await Promise.all(topItemsData.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      return {
        id: item.menuItemId,
        name: menuItem?.name || 'Unknown',
        quantity: item._sum.quantity || 0,
        revenue: Number(item._sum.subtotal || 0),
      };
    }));

    return {
      summary: {
        revenueToday,
        revenueGrowth: Math.round(revenueGrowth),
        shiftDifferenceToday: todayDifference,
        ordersCountToday,
        ordersGrowth: Math.round(ordersGrowth),
      },
      revenueChart,
      topItems,
    };
  }
};
