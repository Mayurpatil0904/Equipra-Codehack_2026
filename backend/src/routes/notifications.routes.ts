// src/routes/notifications.routes.ts
import { Router } from "express";
import { listNotifications, markRead, markAllRead } from "../controllers/notifications.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(  "/",              listNotifications);
router.patch("/read-all",      markAllRead);
router.patch("/:id/read",      markRead);

export default router;
