import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, availabilityTable, serviceListingsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";
import {
  GetServiceAvailabilityQueryParams,
  CreateAvailabilityBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

router.get("/availability", async (req, res): Promise<void> => {
  const params = GetServiceAvailabilityQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const { serviceId, date } = params.data;
  const conditions = [eq(availabilityTable.serviceListingId, serviceId)];
  if (date) conditions.push(eq(availabilityTable.slotDate, date));

  const slots = await db
    .select()
    .from(availabilityTable)
    .where(and(...conditions))
    .orderBy(availabilityTable.slotDate, availabilityTable.startTime);

  res.json(slots.map(toAvailabilityResponse));
});

router.post("/availability", authenticate, async (req, res): Promise<void> => {
  if (req.user!.role !== "PROVIDER") {
    res.status(403).json({ error: "Forbidden", message: "Only providers can create availability" });
    return;
  }

  const parsed = CreateAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { serviceListingId, startDate, endDate, slots } = parsed.data;

  // Verify service belongs to provider
  const [service] = await db
    .select()
    .from(serviceListingsTable)
    .where(and(eq(serviceListingsTable.id, serviceListingId), eq(serviceListingsTable.providerId, req.user!.id)));

  if (!service) {
    res.status(404).json({ error: "Not found", message: "Service not found or not yours" });
    return;
  }

  // Generate all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  const toInsert: typeof availabilityTable.$inferInsert[] = [];
  for (const date of dates) {
    for (const slot of slots) {
      toInsert.push({
        serviceListingId,
        slotDate: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: false,
      });
    }
  }

  const created = await db.insert(availabilityTable).values(toInsert).returning();
  res.status(201).json(created.map(toAvailabilityResponse));
});

export default router;
