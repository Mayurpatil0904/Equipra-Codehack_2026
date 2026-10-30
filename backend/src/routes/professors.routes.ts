// src/routes/professors.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../lib/prisma";
import { ok } from "../lib/response";

const router = Router();
router.use(requireAuth);

// GET /api/professors — list all faculty for professor selector
router.get("/", async (req, res, next) => {
  try {
    const faculty = await prisma.user.findMany({
      where:   { role: "FACULTY", isActive: true },
      select:  { id: true, name: true, enrollmentId: true, department: true },
      orderBy: { name: "asc" },
    });
    ok(res, faculty);
  } catch (err) { next(err); }
});

export default router;
