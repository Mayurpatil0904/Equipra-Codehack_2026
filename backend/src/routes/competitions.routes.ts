// src/routes/competitions.routes.ts
import { Router } from "express";
import {
  listCompetitions, getCompetition, createCompetition,
  updateCompetition, deleteCompetition,
  submitEntry, updateEntry, deleteEntry, myEntries,
} from "../controllers/competitions.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Competitions
router.get("/",     listCompetitions);
router.get("/my-entries", myEntries);
router.get("/:id",  getCompetition);
router.post("/",    requireRole("ADMIN"), createCompetition);
router.patch("/:id", requireRole("ADMIN"), updateCompetition);
router.delete("/:id", requireRole("ADMIN"), deleteCompetition);

// Entries
router.post("/:id/entries", submitEntry);
router.patch("/entries/:entryId", updateEntry);
router.delete("/entries/:entryId", deleteEntry);

export default router;
