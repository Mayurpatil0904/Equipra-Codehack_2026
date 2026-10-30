import prisma from "./prisma";

/**
 * Check for equipment due for return soon and create reminder notifications.
 * Called on login and when listing requests (fire-and-forget).
 */
export async function checkReturnReminders(): Promise<void> {
  try {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find issued requests where dateTo is within next 3 days
    const dueRequests = await prisma.equipmentRequest.findMany({
      where: {
        status: "issued" as any,
        dateTo: { lte: threeDays, gte: now },
      },
      include: {
        equipment: { select: { name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    for (const req of dueRequests) {
      const daysLeft = Math.ceil((req.dateTo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      const existing = await prisma.notification.findFirst({
        where: {
          userId: req.studentId,
          type: "return_reminder",
          createdAt: { gte: today },
          body: { contains: req.requestCode },
        },
      });
      if (existing) continue;

      const title = daysLeft <= 1
        ? `⏰ Equipment Due Tomorrow`
        : `📅 Equipment Due in ${daysLeft} Days`;

      await prisma.notification.create({
        data: {
          title,
          body: `${req.equipment.name} (${req.requestCode}) is due on ${req.dateTo.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Please return it to the lab.`,
          type: "return_reminder",
          link: "/my-requests",
          userId: req.studentId,
        },
      });
      console.log(`[REMINDER] → ${req.student.name}: ${req.equipment.name} (${daysLeft}d left)`);
    }

    // Check OVERDUE (past dateTo but still issued)
    const overdueRequests = await prisma.equipmentRequest.findMany({
      where: {
        status: "issued" as any,
        dateTo: { lt: now },
      },
      include: {
        equipment: { select: { name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    for (const req of overdueRequests) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: req.studentId,
          type: "return_reminder",
          createdAt: { gte: today },
          body: { contains: req.requestCode },
        },
      });
      if (existing) continue;

      const daysOverdue = Math.ceil((now.getTime() - req.dateTo.getTime()) / (24 * 60 * 60 * 1000));

      await prisma.notification.create({
        data: {
          title: `🚨 Equipment ${daysOverdue}+ Days Overdue!`,
          body: `${req.equipment.name} (${req.requestCode}) was due on ${req.dateTo.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Please return it immediately.`,
          type: "return_reminder",
          link: "/my-requests",
          userId: req.studentId,
        },
      });
      console.log(`[REMINDER] → ${req.student.name}: ${req.equipment.name} (${daysOverdue}d OVERDUE)`);
    }
  } catch (err: any) {
    console.error("[REMINDER] Error:", err.message);
  }
}
