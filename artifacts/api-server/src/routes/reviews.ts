import { Router, type IRouter } from "express";
import { eq, and, desc, count } from "drizzle-orm";
import { db, reviewsTable, bookingsTable, usersTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";
import {
  CreateReviewBody,
  ListServiceReviewsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toUserResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/reviews", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { bookingId, rating, comment } = parsed.data;

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "Bad request", message: "Rating must be between 1 and 5" });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.customerId, req.user!.id)));

  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  if (booking.status !== "COMPLETED") {
    res.status(400).json({ error: "Bad request", message: "Can only review completed bookings" });
    return;
  }

  const [existingReview] = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bookingId));
  if (existingReview) {
    res.status(409).json({ error: "Conflict", message: "Review already submitted for this booking" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      bookingId,
      customerId: req.user!.id,
      serviceListingId: booking.serviceListingId,
      rating,
      comment: comment ?? null,
    })
    .returning();

  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));

  res.status(201).json({
    id: review.id,
    bookingId: review.bookingId,
    customerId: review.customerId,
    customer: toUserResponse(customer),
    serviceListingId: review.serviceListingId,
    rating: review.rating,
    comment: review.comment ?? null,
    createdAt: review.createdAt.toISOString(),
  });
});

router.get("/reviews", async (req, res): Promise<void> => {
  const params = ListServiceReviewsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const { serviceId, page = 1, size = 10 } = params.data;
  const pageNum = Number(page);
  const pageSize = Number(size);
  const offset = (pageNum - 1) * pageSize;

  const [totalResult] = await db
    .select({ count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.serviceListingId, serviceId));

  const reviews = await db
    .select()
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.customerId, usersTable.id))
    .where(eq(reviewsTable.serviceListingId, serviceId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = Number(totalResult.count);

  res.json({
    reviews: reviews.map(({ reviews: r, users: u }) => ({
      id: r.id,
      bookingId: r.bookingId,
      customerId: r.customerId,
      customer: toUserResponse(u!),
      serviceListingId: r.serviceListingId,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / pageSize),
  });
});

export default router;
