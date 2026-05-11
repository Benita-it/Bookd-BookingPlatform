import { Router, type IRouter } from "express";
import { eq, and, sum, avg, count, gte, sql } from "drizzle-orm";
import { db, bookingsTable, serviceListingsTable, reviewsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/provider/stats", authenticate, async (req, res): Promise<void> => {
  if (req.user!.role !== "PROVIDER") {
    res.status(403).json({ error: "Forbidden", message: "Providers only" });
    return;
  }

  const providerId = req.user!.id;

  const providerServices = await db
    .select({ id: serviceListingsTable.id })
    .from(serviceListingsTable)
    .where(eq(serviceListingsTable.providerId, providerId));

  const serviceIds = providerServices.map((s) => s.id);

  const [activeServicesResult] = await db
    .select({ count: count() })
    .from(serviceListingsTable)
    .where(and(eq(serviceListingsTable.providerId, providerId), eq(serviceListingsTable.isActive, true)));

  if (serviceIds.length === 0) {
    res.json({
      totalBookings: 0,
      totalRevenue: 0,
      averageRating: null,
      bookingsThisMonth: 0,
      activeServices: Number(activeServicesResult.count),
      revenueByWeek: [],
    });
    return;
  }

  // Fetch all bookings for provider's services and compute stats in JS
  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(sql`${bookingsTable.serviceListingId} = ANY(${sql`ARRAY[${sql.raw(serviceIds.map(id => `'${id}'`).join(','))}]::uuid[]`})`);

  const confirmedOrCompleted = allBookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED");
  const completed = allBookings.filter(b => b.status === "COMPLETED");

  const totalBookings = confirmedOrCompleted.length;
  const totalRevenue = completed.reduce((acc, b) => acc + Number(b.totalPrice), 0);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const bookingsThisMonth = confirmedOrCompleted.filter(
    (b) => new Date(b.createdAt) >= thisMonthStart
  ).length;

  // Average rating
  const allReviews = await db
    .select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .where(sql`${reviewsTable.serviceListingId} = ANY(${sql`ARRAY[${sql.raw(serviceIds.map(id => `'${id}'`).join(','))}]::uuid[]`})`);

  const averageRating = allReviews.length > 0
    ? allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length
    : null;

  // Revenue by week (last 8 weeks) — compute in JS
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(now.getDate() - 56);

  const recentCompleted = completed.filter(b => new Date(b.createdAt) >= eightWeeksAgo);

  const weekMap = new Map<string, number>();
  for (const b of recentCompleted) {
    const date = new Date(b.createdAt);
    // Get Monday of the week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split("T")[0];
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + Number(b.totalPrice));
  }

  const revenueByWeek = Array.from(weekMap.entries())
    .map(([week, revenue]) => ({ week, revenue }))
    .sort((a, b) => a.week.localeCompare(b.week));

  res.json({
    totalBookings,
    totalRevenue,
    averageRating,
    bookingsThisMonth,
    activeServices: Number(activeServicesResult.count),
    revenueByWeek,
  });
});

export default router;
