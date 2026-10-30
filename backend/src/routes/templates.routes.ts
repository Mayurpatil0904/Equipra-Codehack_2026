// src/routes/templates.routes.ts
import { Router } from "express";
import {
  listTemplates, getTemplate, createTemplate,
  deleteTemplate, applyTemplate,
} from "../controllers/templates.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/",            listTemplates);
router.get("/:id",         getTemplate);
router.post("/",           requireRole("ADMIN", "FACULTY"), createTemplate);
router.delete("/:id",      deleteTemplate);
router.post("/:id/apply",  applyTemplate);

export default router;
