// src/routes/projects.routes.ts
import { Router } from "express";
import {
  listProjects, getProject, createProject,
  updateProject, deleteProject, addMember, removeMember,
  lookupUserByEnrollment,
  listDocuments, addDocument, deleteDocument,
  listLinkedEquipment, listLinkableEquipment, linkEquipment, unlinkEquipment,
} from "../controllers/projects.controller";
import {
  createDevice, listDevices, saveTelemetryDefs,
} from "../controllers/devices.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Projects CRUD
router.get(  "/",                                listProjects);
router.post( "/",                                createProject);
// ✅ NEW — must be registered BEFORE "/:id" or "lookup-user" is treated as an id
router.get(  "/lookup-user/:enrollmentId",        lookupUserByEnrollment);
router.get(  "/:id",                             getProject);
router.patch("/:id",                             updateProject);
router.delete("/:id",                            deleteProject);

// Members
router.post(  "/:id/members",                    addMember);
router.delete("/:id/members/:userId",            removeMember);

// Devices (nested under project)
router.get(  "/:projectId/devices",              listDevices);
router.post( "/:projectId/devices",              createDevice);

// Telemetry field definitions
router.put(  "/:projectId/telemetry-defs",       saveTelemetryDefs);

// Documents (link references — no file upload, students paste a URL)
router.get(   "/:id/documents",            listDocuments);
router.post(  "/:id/documents",            addDocument);
router.delete("/:id/documents/:docId",     deleteDocument);

// Equipment auto-linking
// NOTE: "/available" must be registered before "/:linkId"-style routes would
// ever be needed here — there are none, so order is safe either way.
router.get(   "/:id/equipment",            listLinkedEquipment);
router.get(   "/:id/equipment/available",  listLinkableEquipment);
router.post(  "/:id/equipment",            linkEquipment);
router.delete("/:id/equipment/:linkId",    unlinkEquipment);

export default router;
