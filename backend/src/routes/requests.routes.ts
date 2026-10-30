// src/routes/requests.routes.ts
import { Router } from "express";
import {
  listRequests, getRequest, createRequest,
  facultyDecision, labDecision, addMessage,
  markReturned, clearInspection, getByQr,
} from "../controllers/requests.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// ✅ FIX — "/scan/:token" and "/equipment/:slug/..." MUST be registered
// before "/:id", otherwise Express matches "scan"/"equipment" as :id
//
// ✅ Auth only (not admin-only) — getByQr() itself enforces:
//   admin = full access, student/faculty = own requests only
router.get( "/scan/:token",                       getByQr);
router.patch("/equipment/:slug/clear-inspection", requireRole("ADMIN"), clearInspection);

router.get( "/",                              listRequests);
router.get( "/:id",                           getRequest);
router.post("/", requireRole("STUDENT", "FACULTY"), createRequest);
router.post("/:id/faculty-decision", requireRole("FACULTY"), facultyDecision);
router.post("/:id/lab-decision",     requireRole("ADMIN"),   labDecision);
router.post("/:id/messages",                  addMessage);
router.patch("/:id/return",                   requireRole("ADMIN"), markReturned);

export default router;
