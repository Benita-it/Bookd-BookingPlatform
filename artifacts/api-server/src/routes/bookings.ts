import { Router, type IRouter } from "express";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { db, bookingsTable, availabilityTable, serviceListingsTable, usersTable, reviewsTable, notificationsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";
import {
  CreateBookingBody,
  ListMyBookingsQueryParams,
  CancelBookingParams,
  CompleteBookingParams,
  ListProviderBookingsQueryParams,
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

function toServiceResponse(service: typeof serviceListingsTable.$inferSelect, provider: typeof usersTable.$inferSelect) {
  return {
    id: service.id,
    providerId: service.providerId,
    provider: toUserResponse(provider),
    title: service.title,
    description: service.description,
    category: service.category,
    price: Number(service.price),
    durationMinutes: service.durationMinutes,
    location: service.location,
    imageUrl: service.imageUrl ?? null,
    isActive: service.isActive,
    averageRating: null,
    reviewCount: 0,
    createdAt: service.createdAt.toISOString(),
  };
}

function toAvailabilityResponse(slot: typeof availabilityTable.$inferSelect) {
  return {
    id: slot.id,
    serviceListingId: slot.serviceListingId,
    slotDate: slot.slotDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
  };
}

async function buildBookingResponse(booking: typeof bookingsTable.$inferSelect) {
  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, booking.customerId));
  const [service] = await db.select().from(serviceListingsTable).where(eq(serviceListingsTable.id, booking.serviceListingId));
  const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, service.providerId));
  const [slot] = await db.select().from(availabilityTable).where(eq(availabilityTable.id, booking.availabilityId));
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, booking.id));

  return {
    id: booking.id,
    customerId: booking.customerId,
    customer: toUserResponse(customer),
    serviceListingId: booking.serviceListingId,
    service: toServiceResponse(service, provider),
    availabilityId: booking.availabilityId,
    availability: toAvailabilityResponse(slot),
    status: booking.status,
    totalPrice: Number(booking.totalPrice),
    notes: booking.notes ?? null,
    hasReview: !!review,
    createdAt: booking.createdAt.toISOString(),
  };
}

router.post("/bookings", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { serviceListingId, availabilityId, notes } = parsed.data;

  // Check availability and lock it
  const [slot] = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.id, availabilityId), eq(availabilityTable.serviceListingId, serviceListingId)));

  if (!slot) {
    res.status(404).json({ error: "Not found", message: "Availability slot not found" });
    return;
  }

  if (slot.isBooked) {
    res.status(409).json({ error: "Conflict", message: "This slot is already booked" });
    return;
  }

  const [service] = await db.select().from(serviceListingsTable).where(eq(serviceListingsTable.id, serviceListingId));
  if (!service || !service.isActive) {
    res.status(404).json({ error: "Not found", message: "Service not found" });
    return;
  }

  // Mark slot as booked
  await db.update(availabilityTable).set({ isBooked: true }).where(eq(availabilityTable.id, availabilityId));

  // Create booking
  const [booking] = await db
    .insert(bookingsTable)
    .values({
      customerId: req.user!.id,
      serviceListingId,
      availabilityId,
      status: "CONFIRMED",
      totalPrice: service.price,
      notes: notes ?? null,
    })
    .returning();

  // Create notification for provider
  await db.insert(notificationsTable).values({
    userId: service.providerId,
    type: "BOOKING",
    message: `New booking for ${service.title} on ${slot.slotDate} at ${slot.startTime}`,
    isRead: false,
  });

  res.status(201).json(await buildBookingResponse(booking));
});

router.get("/bookings/my", authenticate, async (req, res): Promise<void> => {
  const params = ListMyBookingsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const { status, page = 1, size = 10 } = params.data;
  const pageNum = Number(page);
  const pageSize = Number(size);
  const offset = (pageNum - 1) * pageSize;

  const conditions = [eq(bookingsTable.customerId, req.user!.id)];
  if (status) {
    conditions.push(eq(bookingsTable.status, status as typeof bookingsTable.$inferSelect["status"]));
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(and(...conditions));

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(and(...conditions))
    .orderBy(desc(bookingsTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  const enriched = await Promise.all(bookings.map(buildBookingResponse));
  const total = Number(totalResult.count);

  res.json({
    bookings: enriched,
    total,
    page: pageNum,
    size: pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.put("/bookings/:id/cancel", authenticate, async (req, res): Promise<void> => {
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.customerId, req.user!.id)));

  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    res.status(400).json({ error: "Bad request", message: "Cannot cancel this booking" });
    return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  // Free the slot
  await db
    .update(availabilityTable)
    .set({ isBooked: false })
    .where(eq(availabilityTable.id, booking.availabilityId));

  // Notify provider
  const [service] = await db.select().from(serviceListingsTable).where(eq(serviceListingsTable.id, booking.serviceListingId));
  if (service) {
    await db.insert(notificationsTable).values({
      userId: service.providerId,
      type: "CANCELLATION",
      message: `Booking for ${service.title} has been cancelled`,
      isRead: false,
    });
  }

  res.json(await buildBookingResponse(updated));
});

router.put("/bookings/:id/complete", authenticate, async (req, res): Promise<void> => {
  const params = CompleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  if (req.user!.role !== "PROVIDER") {
    res.status(403).json({ error: "Forbidden", message: "Only providers can complete bookings" });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Not found", message: "Booking not found" });
    return;
  }

  // Verify it's the provider's service
  const [service] = await db
    .select()
    .from(serviceListingsTable)
    .where(and(eq(serviceListingsTable.id, booking.serviceListingId), eq(serviceListingsTable.providerId, req.user!.id)));

  if (!service) {
    res.status(403).json({ error: "Forbidden", message: "Not your service" });
    return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  // Notify customer to leave a review
  await db.insert(notificationsTable).values({
    userId: booking.customerId,
    type: "REVIEW_REQUEST",
    message: `Your booking for ${service.title} is complete. Leave a review!`,
    isRead: false,
  });

  res.json(await buildBookingResponse(updated));
});

router.get("/provider/bookings", authenticate, async (req, res): Promise<void> => {
  if (req.user!.role !== "PROVIDER") {
    res.status(403).json({ error: "Forbidden", message: "Providers only" });
    return;
  }

  const params = ListProviderBookingsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const { status, page = 1, size = 10 } = params.data;
  const pageNum = Number(page);
  const pageSize = Number(size);
  const offset = (pageNum - 1) * pageSize;

  // Get provider's service IDs
  const providerServices = await db
    .select({ id: serviceListingsTable.id })
    .from(serviceListingsTable)
    .where(eq(serviceListingsTable.providerId, req.user!.id));

  if (providerServices.length === 0) {
    res.json({ bookings: [], total: 0, page: pageNum, size: pageSize, totalPages: 0 });
    return;
  }

  const serviceIds = providerServices.map((s) => s.id);
  const conditions = [inArray(bookingsTable.serviceListingId, serviceIds)];
  if (status) {
    conditions.push(eq(bookingsTable.status, status as typeof bookingsTable.$inferSelect["status"]));
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(bookingsTable)
    .where(and(...conditions));

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(and(...conditions))
    .orderBy(desc(bookingsTable.createdAt))
    .limit(pageSize)
    .offset(offset);

  const enriched = await Promise.all(bookings.map(buildBookingResponse));
  const total = Number(totalResult.count);

  res.json({
    bookings: enriched,
    total,
    page: pageNum,
    size: pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export default router;
