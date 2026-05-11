import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { generateToken, generateRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { authenticate } from "../middlewares/auth.js";
import {
  RegisterBody,
  LoginBody,
  RefreshTokenBody,
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

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { name, email, password, role, phone } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role: role as "CUSTOMER" | "PROVIDER", phone })
    .returning();

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.status(201).json({ token, refreshToken, user: toUserResponse(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Forbidden", message: "Account is deactivated" });
    return;
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.json({ token, refreshToken, user: toUserResponse(user) });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  try {
    const decoded = verifyRefreshToken(parsed.data.refreshToken);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id));
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }
    const payload = { id: user.id, email: user.email, role: user.role };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.json({ token, refreshToken, user: toUserResponse(user) });
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token" });
  }
});

router.get("/users/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }
  res.json(toUserResponse(user));
});

router.put("/users/me", authenticate, async (req, res): Promise<void> => {
  const { name, phone, avatarUrl } = req.body as { name?: string; phone?: string; avatarUrl?: string };
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const [user] = await db
    .update(usersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.id))
    .returning();

  res.json(toUserResponse(user));
});

router.put("/users/me/password", authenticate, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Bad request", message: "Both passwords required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Bad request", message: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.id));

  res.json({ success: true, message: "Password updated successfully" });
});

export default router;
