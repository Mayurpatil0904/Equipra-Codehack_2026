// src/controllers/feedback.controller.ts

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound } from "../lib/response";
import { z } from "zod";

// POST /api/feedback
export async function submitFeedback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const schema = z.object({
      department: z
        .string()
        .min(1, "Department is required"),

      type: z.enum([
        "New Equipment Request",
        "Maintenance Report",
        "Process Improvement",
        "Other",
      ]),

      message: z
        .string()
        .min(10, "Feedback must be at least 10 characters")
        .max(1000, "Feedback cannot exceed 1000 characters"),

      rating: z
        .number()
        .int()
        .min(0)
        .max(5)
        .default(0),
    });

    const parsedData = schema.parse(req.body);

    const fb = await prisma.feedback.create({
      data: {
        department: parsedData.department,

        type: parsedData.type,

        message: parsedData.message,

        rating: parsedData.rating,

        submittedBy: {
          connect: {
            id: req.user!.userId,
          },
        },
      },

      include: {
        submittedBy: {
          select: {
            name: true,
            role: true,
            enrollmentId: true,
            department: true,
          },
        },
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        isActive: true,
      },

      select: {
        id: true,
      },
    });

    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,

        title: `New Feedback — ${parsedData.department}`,

        body: `${parsedData.type}: "${parsedData.message.slice(
          0,
          80
        )}${parsedData.message.length > 80 ? "…" : ""}"`,

        type: "feedback",

        link: "/admin",
      })),
    });

    created(res, fb);
  } catch (err) {
    next(err);
  }
}

// GET /api/feedback
export async function listFeedback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { department, unread } =
      req.query as Record<string, string>;

    const feedbacks = await prisma.feedback.findMany({
      where: {
        ...(department && {
          department,
        }),

        ...(unread === "true" && {
          isRead: false,
        }),
      },

      include: {
        submittedBy: {
          select: {
            name: true,
            role: true,
            enrollmentId: true,
            department: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    ok(res, feedbacks);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/feedback/:id/read
export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const fb = await prisma.feedback.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!fb) {
      notFound(res, "Feedback not found.");
      return;
    }

    const updated = await prisma.feedback.update({
      where: {
        id: req.params.id,
      },

      data: {
        isRead: true,
      },
    });

    ok(res, updated);
  } catch (err) {
    next(err);
  }
}
