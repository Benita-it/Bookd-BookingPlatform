import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/notifications/my", authenticate, async (req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.id))
    .orderBy(notificationsTable.isRead, desc(notificationsTable.createdAt))
    .limit(20);

  res.json(
    notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }))
  );
});

router.put("/notifications/read-all", authenticate, async (req, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.user!.id));

  res.json({ success: true, message: "All notifications marked as read" });
});

export default router;
