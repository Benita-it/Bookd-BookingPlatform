import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, serviceListingsTable, availabilityTable, bookingsTable, reviewsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger.js";

export async function seed() {
  const [existingUsers] = await db.select({ count: count() }).from(usersTable);
  if (Number(existingUsers.count) > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database with demo data...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const [provider1] = await db.insert(usersTable).values({
    name: "Dr. Sarah Chen",
    email: "sarah@bookd.com",
    passwordHash: await hash("password123"),
    role: "PROVIDER",
    phone: "+1 (555) 234-5678",
    avatarUrl: null,
  }).returning();

  const [provider2] = await db.insert(usersTable).values({
    name: "Marcus Williams",
    email: "marcus@bookd.com",
    passwordHash: await hash("password123"),
    role: "PROVIDER",
    phone: "+1 (555) 345-6789",
    avatarUrl: null,
  }).returning();

  const [customer1] = await db.insert(usersTable).values({
    name: "Alex Johnson",
    email: "alex@bookd.com",
    passwordHash: await hash("password123"),
    role: "CUSTOMER",
    phone: "+1 (555) 123-4567",
    avatarUrl: null,
  }).returning();

  await db.insert(usersTable).values({
    name: "Jamie Lee",
    email: "jamie@bookd.com",
    passwordHash: await hash("password123"),
    role: "CUSTOMER",
    phone: "+1 (555) 456-7890",
    avatarUrl: null,
  });

  const [service1] = await db.insert(serviceListingsTable).values({
    providerId: provider1.id,
    title: "Deep Tissue Massage Therapy",
    description: "Relieve chronic muscle tension with our professional deep tissue massage. Perfect for athletes and those with sedentary work lifestyles. Each session targets problem areas and promotes faster recovery.",
    category: "HEALTH",
    price: "120.00",
    durationMinutes: 60,
    location: "Downtown Wellness Center, San Francisco",
    imageUrl: "https://picsum.photos/seed/massage1/800/500",
    isActive: true,
  }).returning();

  const [service2] = await db.insert(serviceListingsTable).values({
    providerId: provider1.id,
    title: "Holistic Nutrition Consultation",
    description: "Personalized nutrition plan tailored to your health goals. Includes full dietary assessment, supplement recommendations, and a 30-day meal plan. Follow-up support included.",
    category: "HEALTH",
    price: "85.00",
    durationMinutes: 45,
    location: "Online / Virtual",
    imageUrl: "https://picsum.photos/seed/nutrition2/800/500",
    isActive: true,
  }).returning();

  const [service3] = await db.insert(serviceListingsTable).values({
    providerId: provider2.id,
    title: "Personal Training Session",
    description: "One-on-one personal training tailored to your fitness goals. Whether you want to lose weight, build muscle, or improve endurance, our certified trainer will create a program that works for you.",
    category: "FITNESS",
    price: "95.00",
    durationMinutes: 60,
    location: "FitLife Gym, San Francisco",
    imageUrl: "https://picsum.photos/seed/fitness3/800/500",
    isActive: true,
  }).returning();

  const [service4] = await db.insert(serviceListingsTable).values({
    providerId: provider2.id,
    title: "Luxury Hair Styling & Color",
    description: "Full hair transformation including consultation, cut, color, and styling. Using only premium, cruelty-free products. Walk out with a look that turns heads.",
    category: "BEAUTY",
    price: "180.00",
    durationMinutes: 120,
    location: "Studio M, Castro District",
    imageUrl: "https://picsum.photos/seed/beauty4/800/500",
    isActive: true,
  }).returning();

  const [service5] = await db.insert(serviceListingsTable).values({
    providerId: provider1.id,
    title: "Web Development Tutoring",
    description: "Learn modern web development from a senior engineer. Topics include React, TypeScript, Node.js, and system design. Ideal for beginners and intermediate developers looking to level up.",
    category: "EDUCATION",
    price: "150.00",
    durationMinutes: 90,
    location: "Online / Virtual",
    imageUrl: "https://picsum.photos/seed/education5/800/500",
    isActive: true,
  }).returning();

  const [service6] = await db.insert(serviceListingsTable).values({
    providerId: provider2.id,
    title: "Home Deep Clean & Organization",
    description: "Professional deep cleaning service for your entire home. We tackle every corner, from bathrooms to kitchens, leaving your space spotless. Eco-friendly products used throughout.",
    category: "HOME",
    price: "200.00",
    durationMinutes: 180,
    location: "Your Home (Bay Area)",
    imageUrl: "https://picsum.photos/seed/home6/800/500",
    isActive: true,
  }).returning();

  // Generate availability for next 14 days
  const services = [service1, service2, service3, service4, service5, service6];
  const timeSlots = [
    { startTime: "09:00:00", endTime: "10:00:00" },
    { startTime: "10:30:00", endTime: "11:30:00" },
    { startTime: "13:00:00", endTime: "14:00:00" },
    { startTime: "14:30:00", endTime: "15:30:00" },
    { startTime: "16:00:00", endTime: "17:00:00" },
  ];

  const today = new Date();
  const availabilityRecords: typeof availabilityTable.$inferInsert[] = [];

  for (const service of services) {
    for (let d = 1; d <= 14; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      if (date.getDay() === 0) continue; // Skip Sundays
      const dateStr = date.toISOString().split("T")[0];
      for (const slot of timeSlots) {
        availabilityRecords.push({
          serviceListingId: service.id,
          slotDate: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false,
        });
      }
    }
  }

  const createdSlots = await db.insert(availabilityTable).values(availabilityRecords).returning();

  // Pick specific slots to book
  const service1Slots = createdSlots.filter(s => s.serviceListingId === service1.id);
  const service2Slots = createdSlots.filter(s => s.serviceListingId === service2.id);
  const service3Slots = createdSlots.filter(s => s.serviceListingId === service3.id);
  const service5Slots = createdSlots.filter(s => s.serviceListingId === service5.id);

  const slot1 = service1Slots[0];
  const slot2 = service2Slots[0];
  const slot3 = service3Slots[0];
  const slot4 = service3Slots[1];
  const slot5 = service5Slots[0];
  const slot6 = service1Slots[1];

  // Mark slots as booked
  for (const slot of [slot1, slot2, slot3, slot4, slot5, slot6]) {
    await db.update(availabilityTable).set({ isBooked: true }).where(eq(availabilityTable.id, slot.id));
  }

  // Create bookings
  const [booking1] = await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service1.id,
    availabilityId: slot1.id,
    status: "CONFIRMED",
    totalPrice: service1.price,
    notes: "Please focus on lower back",
  }).returning();

  const [booking2] = await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service2.id,
    availabilityId: slot2.id,
    status: "CONFIRMED",
    totalPrice: service2.price,
    notes: null,
  }).returning();

  const [booking3] = await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service3.id,
    availabilityId: slot3.id,
    status: "COMPLETED",
    totalPrice: service3.price,
    notes: "First session",
  }).returning();

  await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service3.id,
    availabilityId: slot4.id,
    status: "CANCELLED",
    totalPrice: service3.price,
    notes: null,
  });

  const [booking5] = await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service5.id,
    availabilityId: slot5.id,
    status: "COMPLETED",
    totalPrice: service5.price,
    notes: "Interested in React and TypeScript",
  }).returning();

  const [booking6] = await db.insert(bookingsTable).values({
    customerId: customer1.id,
    serviceListingId: service1.id,
    availabilityId: slot6.id,
    status: "COMPLETED",
    totalPrice: service1.price,
    notes: null,
  }).returning();

  // Create reviews for completed bookings
  await db.insert(reviewsTable).values({
    bookingId: booking3.id,
    customerId: customer1.id,
    serviceListingId: service3.id,
    rating: 5,
    comment: "Marcus is an exceptional trainer. The session was challenging but perfectly tailored to my fitness level. Highly recommend!",
  });

  await db.insert(reviewsTable).values({
    bookingId: booking5.id,
    customerId: customer1.id,
    serviceListingId: service5.id,
    rating: 4,
    comment: "Great tutoring session. Dr. Chen explained complex concepts clearly. Will book again.",
  });

  await db.insert(reviewsTable).values({
    bookingId: booking6.id,
    customerId: customer1.id,
    serviceListingId: service1.id,
    rating: 5,
    comment: "Absolutely incredible massage! Dr. Chen has magic hands. Left feeling completely rejuvenated.",
  });

  // Mark booking1 and booking2 as "used" so future booking works
  void booking1;
  void booking2;

  logger.info("Database seeded successfully with demo data");
}
