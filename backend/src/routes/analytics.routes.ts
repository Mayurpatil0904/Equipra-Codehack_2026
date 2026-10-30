// src/routes/analytics.routes.ts
import { Router } from "express";
import { getProjectAnalytics, getFieldAnalytics } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// GET /api/analytics/:projectId — full project analytics (health score, anomalies, etc.)
router.get("/:projectId", getProjectAnalytics);

// GET /api/analytics/:projectId/field/:fieldName — detailed field analysis + chart data
router.get("/:projectId/field/:fieldName", getFieldAnalytics);

export default router;
