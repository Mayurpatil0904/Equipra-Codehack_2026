// src/routes/admin.routes.ts
import { Router } from "express";
import {
  getStats, listUsers, createUser, deactivateUser,
  listColleges, resetUserPassword, updateUser, createCollege,
  updateCollege, deleteCollege,
  getEquipmentTransactionReport,
  downloadUserTemplate, bulkUploadUsers,
  reactivateUser, deleteUserPermanent,
  listSemesterFolders, upsertSemesterFolder,
} from "../controllers/admin.controller";
import { requireAuth, requireRole, requireCanManageAdmins } from "../middleware/auth";
import { uploadExcel } from "../middleware/upload";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(  "/stats",                    getStats);
router.get(  "/users",                    listUsers);
router.post( "/users",                    createUser);
router.patch("/users/:id",                updateUser);
router.patch("/users/:id/deactivate",     deactivateUser);
// ✅ NEW — reactivate a deactivated user, and permanently delete a user
router.patch("/users/:id/reactivate",     reactivateUser);
router.delete("/users/:id",               deleteUserPermanent);
router.patch("/users/:id/reset-password", resetUserPassword);
router.get(  "/users/bulk-upload-template", downloadUserTemplate);
router.post( "/users/bulk-upload",          uploadExcel, bulkUploadUsers);
router.get(  "/colleges",                 listColleges);
router.post( "/colleges",                 requireCanManageAdmins, createCollege);
router.patch("/colleges/:id",             requireCanManageAdmins, updateCollege);
router.delete("/colleges/:id",            requireCanManageAdmins, deleteCollege);
// ✅ NEW — editable semester folder labels (Students tab grouping)
router.get(  "/semester-folders",         listSemesterFolders);
router.put(  "/semester-folders/:key",    upsertSemesterFolder);
// ✅ bank-statement-style equipment transaction report
router.get(  "/equipment-report",         getEquipmentTransactionReport);

export default router;
