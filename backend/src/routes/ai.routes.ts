// src/routes/ai.routes.ts
import { Router } from "express";
import { aiDiscoverCompetitions, aiLabInsights } from "../controllers/ai.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.post("/discover-competitions", aiDiscoverCompetitions);
router.get("/lab-insights", aiLabInsights);

export default router;
