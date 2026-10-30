// src/routes/telemetry.routes.ts
import { Router } from "express";
import {
  ingestTelemetry,
  getLiveReading,
  getTelemetryHistory,
} from "../controllers/telemetry.controller";
import {
  getDeviceKey,
  regenerateDeviceKey,
  deleteDevice,
} from "../controllers/devices.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ✅ PUBLIC — ESP32 calls this, authenticated by X-API-Key header only.
// Must NOT use requireAuth (ESP32 has no JWT token, only the API key).
router.post("/", ingestTelemetry);

// ✅ AUTHENTICATED — frontend polling endpoints
router.get( "/live/:deviceId",     requireAuth, getLiveReading);
router.get( "/history/:deviceId",  requireAuth, getTelemetryHistory);

// Device management (authenticated)
router.get(   "/devices/:id/key",            requireAuth, getDeviceKey);
router.post(  "/devices/:id/regenerate-key", requireAuth, regenerateDeviceKey);
router.delete("/devices/:id",                requireAuth, deleteDevice);

export default router;
