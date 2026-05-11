import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, desc, asc, sql, avg, count } from "drizzle-orm";
import { db, usersTable, serviceListingsTable, reviewsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";
import {
  ListServicesQueryParams,
  GetServiceParams,
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  DeleteServiceParams,
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

async function enrichService(service: typeof serviceListingsTable.$inferSelect, provider: typeof usersTable.$inferSelect) {
  const reviews = await db
    .select({ avg: avg(reviewsTable.rating), count: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(eq(reviewsTable.serviceListingId, service.id));

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
    averageRating: reviews[0]?.avg != null ? Number(reviews[0].avg) : null,
    reviewCount: Number(reviews[0]?.count ?? 0),
    createdAt: service.createdAt.toISOString(),
  };
}

router.get("/services", async (req, res): Promise<void> => {
  const params = ListServicesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const { category, minPrice, maxPrice, location, search, sort, page = 1, size = 12 } = params.data;

  const conditions = [eq(serviceListingsTable.isActive, true)];
  if (category) conditions.push(eq(serviceListingsTable.category, category as typeof serviceListingsTable.$inferSelect["category"]));
  if (minPrice != null) conditions.push(gte(serviceListingsTable.price, String(minPrice)));
  if (maxPrice != null) conditions.push(lte(serviceListingsTable.price, String(maxPrice)));
  if (location) conditions.push(ilike(serviceListingsTable.location, `%${location}%`));
  if (search) conditions.push(ilike(serviceListingsTable.title, `%${search}%`));

  const pageNum = Number(page);
  const pageSize = Number(size);
  const offset = (pageNum - 1) * pageSize;

  const orderBy =
    sort === "price_asc"
      ? asc(serviceListingsTable.price)
      : sort === "price_desc"
      ? desc(serviceListingsTable.price)
      : desc(serviceListingsTable.createdAt);

  const [totalResult] = await db
    .select({ count: count() })
    .from(serviceListingsTable)
    .where(and(...conditions));

  const services = await db
    .select()
    .from(serviceListingsTable)
    .leftJoin(usersTable, eq(serviceListingsTable.providerId, usersTable.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  const enriched = await Promise.all(
    services.map(({ service_listings, users }) =>
      enrichService(service_listings, users!)
    )
  );

  const total = Number(totalResult.count);
  res.json({
    services: enriched,
    total,
    page: pageNum,
    size: pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.post("/services", authenticate, async (req, res): Promise<void> => {
  if (req.user!.role !== "PROVIDER") {
    res.status(403).json({ error: "Forbidden", message: "Only providers can create services" });
    return;
  }

  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { title, description, category, price, durationMinutes, location, imageUrl } = parsed.data;

  const [service] = await db
    .insert(serviceListingsTable)
    .values({
      providerId: req.user!.id,
      title,
      description,
      category: category as typeof serviceListingsTable.$inferInsert["category"],
      price: String(price),
      durationMinutes,
      location,
      imageUrl: imageUrl ?? null,
    })
    .returning();

  const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.status(201).json(await enrichService(service, provider));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [result] = await db
    .select()
    .from(serviceListingsTable)
    .leftJoin(usersTable, eq(serviceListingsTable.providerId, usersTable.id))
    .where(and(eq(serviceListingsTable.id, params.data.id), eq(serviceListingsTable.isActive, true)));

  if (!result) {
    res.status(404).json({ error: "Not found", message: "Service not found" });
    return;
  }

  res.json(await enrichService(result.service_listings, result.users!));
});

router.put("/services/:id", authenticate, async (req, res): Promise<void> => {
  const paramsResult = UpdateServiceParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Validation error", message: paramsResult.error.message });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(serviceListingsTable)
    .where(eq(serviceListingsTable.id, paramsResult.data.id));

  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Service not found" });
    return;
  }

  if (existing.providerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden", message: "Not your service" });
    return;
  }

  const updates: Partial<typeof serviceListingsTable.$inferInsert> = {};
  const d = parsed.data;
  if (d.title) updates.title = d.title;
  if (d.description) updates.description = d.description;
  if (d.category) updates.category = d.category as typeof serviceListingsTable.$inferInsert["category"];
  if (d.price != null) updates.price = String(d.price);
  if (d.durationMinutes != null) updates.durationMinutes = d.durationMinutes;
  if (d.location) updates.location = d.location;
  if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl ?? null;
  if (d.isActive !== undefined) updates.isActive = d.isActive;

  const [service] = await db
    .update(serviceListingsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(serviceListingsTable.id, paramsResult.data.id))
    .returning();

  const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, service.providerId));
  res.json(await enrichService(service, provider));
});

router.delete("/services/:id", authenticate, async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Validation error", message: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(serviceListingsTable)
    .where(eq(serviceListingsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Service not found" });
    return;
  }

  if (existing.providerId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden", message: "Not your service" });
    return;
  }

  await db
    .update(serviceListingsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(serviceListingsTable.id, params.data.id));

  res.sendStatus(204);
});

router.get("/provider/services", authenticate, async (req, res): Promise<void> => {
  const services = await db
    .select()
    .from(serviceListingsTable)
    .where(eq(serviceListingsTable.providerId, req.user!.id))
    .orderBy(desc(serviceListingsTable.createdAt));

  const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  const enriched = await Promise.all(services.map((s) => enrichService(s, provider)));
  res.json(enriched);
});

export default router;
