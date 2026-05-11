import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  pgEnum,
  uuid,
  index,
  date,
  time,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["CUSTOMER", "PROVIDER"]);
export const categoryEnum = pgEnum("category", [
  "HEALTH",
  "BEAUTY",
  "FITNESS",
  "EDUCATION",
  "HOME",
  "OTHER",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("CUSTOMER"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const serviceListingsTable = pgTable("service_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const availabilityTable = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceListingId: uuid("service_listing_id")
      .notNull()
      .references(() => serviceListingsTable.id),
    slotDate: date("slot_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isBooked: boolean("is_booked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_availability_service_date").on(t.serviceListingId, t.slotDate)],
);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id),
    serviceListingId: uuid("service_listing_id")
      .notNull()
      .references(() => serviceListingsTable.id),
    availabilityId: uuid("availability_id")
      .notNull()
      .references(() => availabilityTable.id),
    status: bookingStatusEnum("status").notNull().default("CONFIRMED"),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_bookings_customer_status").on(t.customerId, t.status),
    index("idx_bookings_service").on(t.serviceListingId),
  ],
);

export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookingsTable.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id),
    serviceListingId: uuid("service_listing_id")
      .notNull()
      .references(() => serviceListingsTable.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uq_review_booking").on(t.bookingId)],
);

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertServiceSchema = createInsertSchema(serviceListingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof serviceListingsTable.$inferSelect;

export const insertAvailabilitySchema = createInsertSchema(availabilityTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availabilityTable.$inferSelect;

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
