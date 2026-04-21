import { prisma } from "../../lib/prisma.js";

function getDayRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getMonthRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

function getRecentDaysRange(days: number, now = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function makeDateBuckets(days: number, endInclusive = new Date()): string[] {
  const buckets: string[] = [];
  const cursor = new Date(endInclusive);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    buckets.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

export async function getAdminDashboardStatsService() {
  const now = new Date();
  const today = getDayRange(now);
  const month = getMonthRange(now);
  const recent30Days = getRecentDaysRange(30, now);

  const [
    totalPlayers,
    totalGiftCodeBatches,
    totalShopItems,
    revenueTodayAgg,
    revenueMonthAgg,
    registrationsToday,
    registrationsMonth,
    recentApprovedDeposits,
    recentRegistrations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.activationcodeinfo.count(),
    prisma.shopItem.count(),
    prisma.depositRequest.aggregate({
      where: {
        status: "approved",
        createdAt: { gte: today.start, lt: today.end },
      },
      _sum: { amount: true },
    }),
    prisma.depositRequest.aggregate({
      where: {
        status: "approved",
        createdAt: { gte: month.start, lt: month.end },
      },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: { createTime: { gte: today.start, lt: today.end } },
    }),
    prisma.user.count({
      where: { createTime: { gte: month.start, lt: month.end } },
    }),
    prisma.depositRequest.findMany({
      where: {
        status: "approved",
        createdAt: { gte: recent30Days.start, lt: recent30Days.end },
      },
      select: { createdAt: true, amount: true },
    }),
    prisma.user.findMany({
      where: {
        createTime: { gte: recent30Days.start, lt: recent30Days.end },
      },
      select: { createTime: true },
    }),
  ]);

  const labels = makeDateBuckets(30, now);
  const revenueByDay = new Map<string, number>(labels.map((key) => [key, 0]));
  for (const row of recentApprovedDeposits) {
    const key = toDateKey(row.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + row.amount);
  }

  const registrationsByDay = new Map<string, number>(labels.map((key) => [key, 0]));
  for (const row of recentRegistrations) {
    const key = toDateKey(row.createTime);
    registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
  }

  const dailySeries = labels.map((label) => ({
    date: label,
    revenue: revenueByDay.get(label) ?? 0,
    registrations: registrationsByDay.get(label) ?? 0,
  }));

  return {
    overview: {
      totalPlayers,
      totalGiftCodeBatches,
      totalShopItems,
    },
    revenue: {
      today: revenueTodayAgg._sum.amount ?? 0,
      month: revenueMonthAgg._sum.amount ?? 0,
    },
    registrations: {
      today: registrationsToday,
      month: registrationsMonth,
    },
    dailySeries,
    generatedAt: now.toISOString(),
  };
}
