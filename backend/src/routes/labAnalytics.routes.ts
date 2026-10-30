// src/routes/labAnalytics.routes.ts
import { Router } from "express";
import {
  getOverview, getByDepartment, getByType,
  getDeviceHealth, getEquipmentUtilization, getActivityTimeline,
} from "../controllers/labAnalytics.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// All endpoints require admin role
router.use(requireAuth, requireRole("ADMIN"));

router.get("/overview",              getOverview);
router.get("/by-department",         getByDepartment);
router.get("/by-type",               getByType);
router.get("/device-health",         getDeviceHealth);
router.get("/equipment-utilization", getEquipmentUtilization);
router.get("/timeline",              getActivityTimeline);

export default router;
