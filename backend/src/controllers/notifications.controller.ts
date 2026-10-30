// src/controllers/notifications.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, notFound } from "../lib/response";

// GET /api/notifications
export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where:   { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
    ok(res, notifications);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!n) { notFound(res, "Notification not found."); return; }
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data:  { isRead: true },
    });
    ok(res, updated);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data:  { isRead: true },
    });
    ok(res, { message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
}
