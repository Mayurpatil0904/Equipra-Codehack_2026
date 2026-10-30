// src/controllers/messages.controller.ts
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest, forbidden } from "../lib/response";
import { createNotification } from "../lib/notify";
import { z } from "zod";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// GET /api/messages/threads
// Returns all unique conversation partners with latest message
export async function listThreads(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Get all distinct partners
    const sent = await prisma.directMessage.findMany({
      where:   { senderId: userId },
      select:  { receiverId: true },
      distinct: ["receiverId"],
    });
    const received = await prisma.directMessage.findMany({
      where:   { receiverId: userId },
      select:  { senderId: true },
      distinct: ["senderId"],
    });

    const partnerIds = [
      ...new Set([
        ...sent.map(m => m.receiverId),
        ...received.map(m => m.senderId),
      ]),
    ];

    // Build thread summaries
    const threads = await Promise.all(
      partnerIds.map(async (partnerId) => {
        const partner = await prisma.user.findUnique({
          where:  { id: partnerId },
          select: { id: true, name: true, role: true, enrollmentId: true },
        });

        const latest = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const unreadCount = await prisma.directMessage.count({
          where: { senderId: partnerId, receiverId: userId, isRead: false },
        });

        return { partner, latestMessage: latest, unreadCount };
      })
    );

    ok(res, threads);
  } catch (err) {
    next(err);
  }
}

// GET /api/messages/threads/:partnerId
// Full conversation with a specific user
export async function getThread(req: Request, res: Response, next: NextFunction) {
  try {
    const userId    = req.user!.userId;
    const partnerId = req.params.partnerId;

    const partner = await prisma.user.findUnique({
      where:  { id: partnerId },
      select: { id: true, name: true, role: true, enrollmentId: true },
    });
    if (!partner) { notFound(res, "User not found."); return; }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark received messages as read
    await prisma.directMessage.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data:  { isRead: true },
    });

    ok(res, { partner, messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/messages/threads/:partnerId
// Send a message (max 50 words)
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      text: z.string()
        .min(1, "Message cannot be empty.")
        .refine(t => countWords(t) <= 50, "Message cannot exceed 50 words."),
    });
    const { text } = schema.parse(req.body);

    const senderId   = req.user!.userId;
    const receiverId = req.params.partnerId;

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) { notFound(res, "Recipient not found."); return; }

    const message = await prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        text,
        wordCount: countWords(text),
      },
    });

    // Notify recipient
    const sender = await prisma.user.findUnique({
      where:  { id: senderId },
      select: { name: true },
    });
    await createNotification({
      userId: receiverId,
      title:  `New message from ${sender?.name}`,
      body:   text.slice(0, 80),
      type:   "message",
      link:   "/messages",
    });

    created(res, message);
  } catch (err) {
    next(err);
  }
}
