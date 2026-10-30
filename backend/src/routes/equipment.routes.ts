// src/routes/equipment.routes.ts
import { Router } from "express";
import {
  listEquipment, getEquipment, createEquipment,
  updateEquipment, deleteEquipment, getCategories,
  getEquipmentByEquipmentId, bulkUploadEquipment,
  downloadBulkUploadTemplate,
} from "../controllers/equipment.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadExcel } from "../middleware/upload";

const router = Router();

router.use(requireAuth);

router.get("/",           listEquipment);
router.get("/categories", getCategories);
// ✅ NEW — must be registered BEFORE "/:slug" or these get treated as a slug
router.get("/lookup/:equipmentId",      getEquipmentByEquipmentId);
router.get("/bulk-upload-template",     requireRole("ADMIN"), downloadBulkUploadTemplate);
router.post("/bulk-upload",             requireRole("ADMIN"), uploadExcel, bulkUploadEquipment);
router.get("/:slug",      getEquipment);
router.post(  "/",        requireRole("ADMIN"), createEquipment);
router.patch( "/:slug",   requireRole("ADMIN"), updateEquipment);
router.delete("/:slug",   requireRole("ADMIN"), deleteEquipment);

export default router;
