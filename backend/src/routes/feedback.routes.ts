// src/routes/feedback.routes.ts
import { Router } from "express";
import { submitFeedback, listFeedback, markRead } from "../controllers/feedback.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.post("/",           submitFeedback);
router.get( "/",           requireRole("ADMIN"), listFeedback);
router.patch("/:id/read",  requireRole("ADMIN"), markRead);

export default router;
