// src/routes/teams.routes.ts
import { Router } from "express";
import { listTeams, getTeam, createTeam, uploadMembers, deactivateTeam } from "../controllers/teams.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadExcel } from "../middleware/upload";

const router = Router();
router.use(requireAuth);

router.get( "/",                   listTeams);
router.get( "/:code",              getTeam);
router.post("/",                   requireRole("FACULTY"), createTeam);
router.post("/:code/upload-members", requireRole("FACULTY"), uploadExcel, uploadMembers);
router.patch("/:code/deactivate",  requireRole("FACULTY"), deactivateTeam);

export default router;
