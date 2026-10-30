// src/controllers/requests.controller.ts

import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { ok, created, notFound, badRequest, forbidden } from "../lib/response";
import { createNotification } from "../lib/notify";
import {
  emailRequestSubmitted,
  emailFacultyNewRequest,
  emailFacultyDecision,
  emailLabNewRequest,
  emailLabDecision,
  emailReturnProcessed,
} from "../lib/email";

import { z } from "zod";
import { nextRequestCode } from "../lib/requestCode";
import { generateQrToken, buildQrUrl } from "../lib/qr";

// countWords helper

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// GET /api/requests
export async function listRequests(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { role, userId } = req.user!;
    const { status } = req.query as Record<string, string>;

    const where: any = {};

    if (role === "STUDENT") where.studentId = userId;
    if (role === "FACULTY") where.facultyId = userId;

    if (status) where.status = status;

    const requests = await prisma.equipmentRequest.findMany({
      where,
      include: {
        equipment: {
          select: {
            slug: true,
            name: true,
            emoji: true,
            labLocation: true,
          },
        },

        student: {
          select: {
            id: true,
            name: true,
            enrollmentId: true,
            email: true,
          },
        },

        faculty: {
          select: {
            id: true,
            name: true,
            enrollmentId: true,
            email: true,
          },
        },

        team: {
          select: {
            id: true,
            teamCode: true,
            name: true,
          },
        },

        messages: {
          orderBy: { createdAt: "asc" },

          include: {
            sentBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    ok(res, requests);
  } catch (err) {
    next(err);
  }
}

// GET /api/requests/:id
export async function getRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const request = await prisma.equipmentRequest.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        equipment: true,

        student: {
          select: {
            id: true,
            name: true,
            enrollmentId: true,
            email: true,
          },
        },

        faculty: {
          select: {
            id: true,
            name: true,
            enrollmentId: true,
            email: true,
          },
        },

        team: true,

        messages: {
          orderBy: {
            createdAt: "asc",
          },

          include: {
            sentBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      notFound(res, "Request not found.");
      return;
    }

    ok(res, request);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests
export async function createRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const schema = z.object({
      equipmentSlug: z.string().min(1),

      project: z.string().min(3),

      purpose: z.string().min(10),

      description: z.string().default(""),

      // optional for faculty self-request
      professorId: z.string().optional(),

      dateFrom: z
        .string()
        .refine((d) => !isNaN(Date.parse(d)), "Invalid dateFrom"),

      dateTo: z
        .string()
        .refine((d) => !isNaN(Date.parse(d)), "Invalid dateTo"),

      type: z.enum(["individual", "team"]).default("individual"),

      teamCode: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const studentId = req.user!.userId;

    // Date validation
    const from = new Date(body.dateFrom);
    const to = new Date(body.dateTo);

    const days = Math.round(
      (to.getTime() - from.getTime()) / 86_400_000
    );

    if (days < 1 || days > 14) {
      badRequest(res, "Borrowing period must be 1–14 days.");
      return;
    }

    // Equipment lookup
    const equipment = await prisma.equipment.findUnique({
      where: {
        slug: body.equipmentSlug,
      },
    });

    if (!equipment) {
      notFound(res, "Equipment not found.");
      return;
    }

    // FACULTY SELF REQUEST SUPPORT
    let professor;

    if (req.user!.role === "FACULTY") {
      professor = await prisma.user.findUnique({
        where: {
          id: req.user!.userId,
        },
      });
    } else {
      professor = await prisma.user.findFirst({
        where: {
          id: body.professorId,
          role: "FACULTY",
        },
      });

      if (!professor) {
        professor = await prisma.user.findFirst({
          where: {
            enrollmentId: body.professorId,
            role: "FACULTY",
          },
        });
      }

      if (!professor) {
        professor = await prisma.user.findFirst({
          where: {
            role: "FACULTY",
          },
        });
      }
    }

    if (!professor) {
      notFound(res, "Professor not found.");
      return;
    }

    // TEAM VALIDATION
    let teamRecord = null;

    if (body.type === "team") {
      if (!body.teamCode) {
        badRequest(res, "Team ID is required for team requests.");
        return;
      }

      teamRecord = await prisma.team.findUnique({
        where: {
          teamCode: body.teamCode,
        },
      });

      if (!teamRecord) {
        notFound(res, `Team ${body.teamCode} not found.`);
        return;
      }

      if (!teamRecord.active) {
        badRequest(res, "This team project is no longer active.");
        return;
      }

      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: teamRecord.id,
          userId: studentId,
        },
      });

      if (!membership) {
        forbidden(res, "You are not a member of this team.");
        return;
      }
    }

    // Individual lock check
    // faculty bypasses this
    if (
      body.type === "individual" &&
      req.user!.role !== "FACULTY"
    ) {
      const activeMembership = await prisma.teamMember.findFirst({
        where: {
          userId: studentId,
          team: {
            active: true,
          },
        },
      });

      if (activeMembership) {
        badRequest(
          res,
          "Your individual ID is locked while you are in an active team project. Use your Team ID."
        );

        return;
      }
    }

    const isFacultyRequest =
      req.user!.role === "FACULTY";

    const requestCode = await nextRequestCode();

    const request = await prisma.equipmentRequest.create({
      data: {
        requestCode,

        project: body.project,

        purpose: body.purpose,

        description: body.description,

        dateFrom: from,

        dateTo: to,

        // faculty skips faculty approval
        status: isFacultyRequest
          ? "pending_lab"
          : "pending_faculty",

        type: body.type as any,

        studentId,

        facultyId: professor.id,

        equipmentId: equipment.id,

        teamId: teamRecord?.id,
      },

      include: {
        equipment: true,

        student: {
          select: {
            name: true,
            email: true,
            enrollmentId: true,
          },
        },

        faculty: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Notifications
    await createNotification({
      userId: studentId,

      title: "Request Submitted",

      body: `Request ${request.requestCode} for ${equipment.name} submitted.`,

      type: "request_update",

      link: "/my-requests",
    });

    // Faculty in-app notification
    await createNotification({
      userId: request.facultyId,
      title: "New Equipment Request",
      body: `${request.student.name} submitted request ${request.requestCode} for ${equipment.name}.`,
      type: "request_update",
      link: "/faculty",
    });

    // Student Email
    if (request.student.email) {
      emailRequestSubmitted({
        studentEmail: request.student.email,

        studentName: request.student.name,

        requestCode: request.requestCode,

        itemName: equipment.name,

        professorName: request.faculty.name,
      }).catch(() => {});
    }

    // Faculty Email
    if (request.faculty.email) {
      emailFacultyNewRequest({
        facultyEmail: request.faculty.email,

        facultyName: request.faculty.name,

        studentName: request.student.name,

        requestCode: request.requestCode,

        itemName: equipment.name,

        project: request.project,
      }).catch(() => {});
    }

    created(res, request);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/faculty-decision
export async function facultyDecision(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { approved } = z
      .object({
        approved: z.boolean(),
      })
      .parse(req.body);

    const facultyId = req.user!.userId;

    const request = await prisma.equipmentRequest.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        equipment: true,

        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        faculty: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      notFound(res, "Request not found.");
      return;
    }

    if (request.facultyId !== facultyId) {
      forbidden(res, "Not assigned to you.");
      return;
    }

    if (request.status !== "pending_faculty") {
      badRequest(
        res,
        `Cannot action request with status '${request.status}'.`
      );

      return;
    }

    const newStatus = approved
      ? "pending_lab"
      : "rejected";

    const updated =
      await prisma.equipmentRequest.update({
        where: {
          id: request.id,
        },

        data: {
          status: newStatus as any,
        },
      });

    await createNotification({
      userId: request.studentId,

      title: approved
        ? "Request Approved by Faculty ✅"
        : "Request Rejected by Faculty ❌",

      body: approved
        ? `Your request ${request.requestCode} forwarded to lab assistant.`
        : `Your request ${request.requestCode} was rejected by faculty.`,

      type: "request_update",

      link: "/my-requests",
    });

    if (request.student.email) {
      emailFacultyDecision({
        studentEmail: request.student.email,

        studentName: request.student.name,

        requestCode: request.requestCode,

        itemName: request.equipment.name,

        approved,

        facultyName: request.faculty.name,
      }).catch(() => {});
    }

    // notify admins
    if (approved) {
      const labUsers = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          isActive: true,
        },

        select: {
          id: true,
          email: true,
        },
      });

      if (labUsers.length) {
        await prisma.notification.createMany({
          data: labUsers.map((u) => ({
            userId: u.id,

            title: "New Request for Lab Approval",

            body: `Request ${request.requestCode} for ${request.equipment.name} awaits your decision.`,

            type: "request_update",

            link: "/admin",
          })),
        });

        const labEmail =
          labUsers.find((u) => u.email)?.email;

        if (labEmail) {
          emailLabNewRequest({
            labEmail,

            studentName: request.student.name,

            requestCode: request.requestCode,

            itemName: request.equipment.name,

            project: request.project,

            dateFrom:
              request.dateFrom.toLocaleDateString("en-IN"),

            dateTo:
              request.dateTo.toLocaleDateString("en-IN"),
          }).catch(() => {});
        }
      }
    }

    ok(res, updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/lab-decision
export async function labDecision(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const schema = z.object({
      approved: z.boolean(),

      message: z
        .string()
        .min(5, "Message must be at least 5 characters.")
        .refine(
          (m) => countWords(m) <= 50,
          "Message cannot exceed 50 words."
        ),
    });

    const { approved, message } = schema.parse(req.body);

    const labUserId = req.user!.userId;

    const request = await prisma.equipmentRequest.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        equipment: true,

        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      notFound(res, "Request not found.");
      return;
    }

    if (request.status !== "pending_lab") {
      badRequest(
        res,
        `Cannot action request with status '${request.status}'.`
      );

      return;
    }

    const newStatus = approved
      ? "approved"
      : "rejected";

    const [updated] = await prisma.$transaction([
      prisma.equipmentRequest.update({
        where: {
          id: request.id,
        },

        data: {
          status: newStatus as any,
        },
      }),

      prisma.requestMessage.create({
        data: {
          requestId: request.id,

          text: message,

          wordCount: countWords(message),

          sender: "lab",

          sentById: labUserId,
        },
      }),
    ]);

    // Generate QR token on approval
    let qrUrl: string | undefined;
    if (approved) {
      const qrToken = generateQrToken();
      await prisma.equipmentRequest.update({
        where: { id: request.id },
        data: { qrToken },
      });
      qrUrl = buildQrUrl(qrToken);
    }

    await createNotification({
      userId: request.studentId,

      title: approved
        ? "Request Approved ✅"
        : "Request Rejected ❌",

      body: message,

      type: "request_update",

      link: "/my-requests",
    });

    if (request.student.email) {
      emailLabDecision({
        studentEmail: request.student.email,

        studentName: request.student.name,

        requestCode: request.requestCode,

        itemName: request.equipment.name,

        approved,

        message,
      }).catch(() => {});
    }

    ok(res, { ...updated, qrUrl });
  } catch (err) {
    next(err);
  }
}

// POST /api/requests/:id/messages
export async function addMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { text } = z
      .object({
        text: z
          .string()
          .min(1)
          .refine(
            (t) => countWords(t) <= 50,
            "Message cannot exceed 50 words."
          ),
      })
      .parse(req.body);

    const { userId, role } = req.user!;

    const request =
      await prisma.equipmentRequest.findUnique({
        where: {
          id: req.params.id,
        },
      });

    if (!request) {
      notFound(res, "Request not found.");
      return;
    }

    const senderType =
      role === "STUDENT"
        ? "student"
        : role === "FACULTY"
        ? "faculty"
        : "lab";

    const msg = await prisma.requestMessage.create({
      data: {
        requestId: request.id,

        text,

        wordCount: countWords(text),

        sender: senderType as any,

        sentById: userId,
      },

      include: {
        sentBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    created(res, msg);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/requests/:id/return — mark returned with inspection
export async function markReturned(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schema = z.object({
      conditionRating: z.number().min(1).max(5),
      damageNotes: z.string().optional(),
      damagePercent: z.number().min(0).max(100).optional(),
    });
    const data = schema.parse(req.body);

    const request = await prisma.equipmentRequest.findUnique({
      where: { id },
      include: { equipment: true },
    });
    if (!request) { notFound(res, "Request not found"); return; }
    if (request.status !== "issued" && request.status !== "approved") {
      badRequest(res, "Request is not in issued/approved state"); return;
    }

    const rating = data.conditionRating;
    const HOLD_HOURS = 24;
    const availableAt = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);

    let reqStatus: string = "returned";
    let timelineDesc = "";
    let timelineStatus = "success";

    // Equipment update payload — built conditionally below
    const equipmentUpdate: any = {};

    if (rating >= 4) {
      // ✅ Good/Excellent condition — unit goes into a 24h hold
      // (pendingUnits) before it re-enters availableUnits.
      // We deliberately do NOT mark availabilityStatus as "available"
      // here — the unit isn't actually issuable yet. releaseExpiredHolds()
      // will set availabilityStatus = "available" once the 24h hold expires
      // and the unit moves into availableUnits.
      equipmentUpdate.pendingUnits = { increment: 1 };
      // ✅ Only set availableAt to the EARLIEST pending release time.
      // If there's already an earlier pending hold, keep it — otherwise
      // every new return would push the release time further out and
      // delay units that were already waiting.
      const existingAvailableAt = request.equipment.availableAt;
      equipmentUpdate.availableAt =
        existingAvailableAt && existingAvailableAt < availableAt
          ? existingAvailableAt
          : availableAt;
      timelineDesc =
        rating === 5
          ? "Returned in excellent condition — entering 24h inspection hold before becoming available again."
          : "Returned in good condition — entering 24h inspection hold before becoming available again.";
      timelineStatus = "success";
    } else if (rating === 3) {
      // Fair — goes to inspection queue, admin manually clears
      equipmentUpdate.availabilityStatus = "inspection";
      equipmentUpdate.inspectionUnits = { increment: 1 };
      reqStatus = "returned_pending_inspection";
      timelineDesc = "Returned — pending manual inspection.";
      timelineStatus = "pending";
    } else if (rating === 2) {
      // Damaged — straight to maintenance, no unit returned to pool
      equipmentUpdate.availabilityStatus = "maintenance";
      timelineDesc = `Returned with damage: ${data.damageNotes || "N/A"}`;
      timelineStatus = "warning";
    } else {
      // Faulty — maintenance + fault flag, no unit returned to pool
      equipmentUpdate.availabilityStatus = "maintenance";
      equipmentUpdate.faultScanStatus = "fault_detected";
      timelineDesc = "Returned faulty — requires inspection.";
      timelineStatus = "warning";
    }

    if (data.damageNotes) {
      equipmentUpdate.conditionLog = data.damageNotes;
    }

    await prisma.$transaction([
      prisma.equipmentRequest.update({
        where: { id },
        data: {
          status: reqStatus as any,
          returnedAt: new Date(),
          conditionRating: rating,
          damageNotes: data.damageNotes,
          damagePercent: data.damagePercent,
        },
      }),
      prisma.equipment.update({
        where: { id: request.equipmentId },
        data: equipmentUpdate,
      }),
      prisma.equipmentTimeline.create({
        data: {
          equipmentId: request.equipmentId,
          description: timelineDesc,
          status: timelineStatus as any,
        },
      }),
    ]);

    // Notify student about return
    const conditionLabels: Record<number, string> = {
      5: "Excellent", 4: "Good", 3: "Fair — Pending Inspection",
      2: "Damaged", 1: "Faulty",
    };
    await createNotification({
      userId: request.studentId,
      title: "Equipment Returned",
      body: `${request.equipment.name} returned — Condition: ${conditionLabels[rating] ?? "Unknown"}${data.damageNotes ? `. Notes: ${data.damageNotes}` : ""}`,
      type: "request_update",
      link: "/my-requests",
    });

    // Fetch student details for email
    const student = await prisma.user.findUnique({
      where: { id: request.studentId },
      select: { name: true, email: true },
    });
    if (student?.email) {
      emailReturnProcessed({
        studentEmail: student.email,
        studentName: student.name,
        requestCode: request.requestCode,
        itemName: request.equipment.name,
        conditionRating: rating,
        damageNotes: data.damageNotes,
      }).catch(() => {});
    }

    ok(res, {
      message: "Return processed successfully",
      ...(rating >= 4 && {
        holdUntil: availableAt,
        note: `This unit will be available again at ${availableAt.toLocaleString("en-IN")} (24h inspection hold).`,
      }),
    });
  } catch (err) { next(err); }
}

// PATCH /api/requests/equipment/:slug/clear-inspection
export async function clearInspection(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const { action } = req.body; // "pass" or "fail"

    const equipment = await prisma.equipment.findUnique({ where: { slug } });
    if (!equipment) { notFound(res, "Equipment not found"); return; }

    const equipmentUpdate: any = {};
    let timelineDesc: string;
    let timelineStatus: string;

    // ✅ Prefer clearing the manual inspection queue (rating-3 returns)
    if (equipment.inspectionUnits > 0) {
      equipmentUpdate.inspectionUnits = { decrement: 1 };

      if (action === "pass") {
        equipmentUpdate.availableUnits = { increment: 1 };
        equipmentUpdate.availabilityStatus = "available";
        timelineDesc = "Inspection passed — unit returned to available pool.";
        timelineStatus = "success";
      } else {
        equipmentUpdate.availabilityStatus = "maintenance";
        timelineDesc = "Inspection failed — unit moved to maintenance.";
        timelineStatus = "warning";
      }
    }
    // ✅ Otherwise, allow an admin to manually release a unit early
    // from the 24h post-return hold (pendingUnits)
    else if (equipment.pendingUnits > 0) {
      equipmentUpdate.pendingUnits = { decrement: 1 };

      if (action === "pass") {
        equipmentUpdate.availableUnits = { increment: 1 };
        timelineDesc = "24h hold cleared early by admin — unit now available.";
        timelineStatus = "success";
      } else {
        equipmentUpdate.availabilityStatus = "maintenance";
        timelineDesc = "Unit held for inspection failed manual review — moved to maintenance.";
        timelineStatus = "warning";
      }

      // If this was the last pending unit, clear availableAt
      if (equipment.pendingUnits - 1 <= 0) {
        equipmentUpdate.availableAt = null;
      }
    } else {
      badRequest(res, "No units are currently pending inspection or hold for this equipment.");
      return;
    }

    await prisma.$transaction([
      prisma.equipment.update({
        where: { slug },
        data: equipmentUpdate,
      }),
      prisma.equipmentTimeline.create({
        data: {
          equipmentId: equipment.id,
          description: timelineDesc,
          status: timelineStatus as any,
        },
      }),
    ]);

    ok(res, { message: `Inspection ${action}ed` });
  } catch (err) { next(err); }
}

// GET /api/requests/scan/:token
// ─────────────────────────────────────────────────────────────
// GET /api/requests/scan/:token
// ✅ Used by /scan/:token landing page after the user logs in.
//
// Access rules:
//   - ADMIN   → can view ANY request (full details, including
//               return status, condition, damage notes — used to
//               process pickup/return at the lab counter)
//   - STUDENT → can ONLY view a request that belongs to them (their
//               own collection pass, read-only)
//   - FACULTY → can view requests they verified (read-only)
//   - anyone else → 403
// ─────────────────────────────────────────────────────────────
export async function getByQr(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const include = {
      equipment: true,
      student: { select: { id: true, name: true, enrollmentId: true, department: true } },
      faculty: { select: { id: true, name: true } },
      // ✅ CollectionPass reads the last lab-admin message for
      // collection instructions — include it so the scan view matches
      // what the student sees on My Requests.
      messages: {
        orderBy: { createdAt: "asc" as const },
        include: { sentBy: { select: { name: true, role: true } } },
      },
    };

    let request = await prisma.equipmentRequest.findFirst({
      where: { qrToken: token },
      include,
    });

    if (!request) {
      request = await prisma.equipmentRequest.findFirst({
        where: { requestCode: token },
        include,
      });
    }

    if (!request) { notFound(res, "Request not found"); return; }

    const { role, userId } = req.user!;

    if (role === "ADMIN") {
      // full access
    } else if (role === "STUDENT") {
      if (request.studentId !== userId) {
        forbidden(res, "This collection pass doesn't belong to you.");
        return;
      }
    } else if (role === "FACULTY") {
      if (request.facultyId !== userId) {
        forbidden(res, "You're not the verifying faculty for this request.");
        return;
      }
    } else {
      forbidden(res, "You don't have access to this collection pass.");
      return;
    }

    // ✅ NEW — Admin also sees this student's past issued items and the
    // condition each was returned in, so they can spot patterns
    // (repeat damage, late returns, etc.) right from the scan screen.
    let studentHistory: any[] = [];
    if (role === "ADMIN") {
      studentHistory = await prisma.equipmentRequest.findMany({
        where: {
          studentId: request.studentId,
          id: { not: request.id },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          equipment: { select: { name: true, emoji: true, equipmentId: true, slug: true } },
        },
      });
    }

    // ✅ Tell the frontend whether the viewer can take admin actions
    // (mark as returned, etc.) on this request.
    ok(res, { ...request, canManage: role === "ADMIN", studentHistory });
  } catch (err) { next(err); }
}