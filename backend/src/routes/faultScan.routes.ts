// src/routes/faultScan.routes.ts
import { Router } from "express";
import { listScans, createScan } from "../controllers/faultScan.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get( "/", listScans);
router.post("/", requireRole("ADMIN"), createScan);

export default router;
