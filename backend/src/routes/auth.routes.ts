// src/routes/auth.routes.ts
import { Router } from "express";
import { login, me, changePassword } from "../controllers/auth.controller";
import { listColleges } from "../controllers/admin.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get( "/colleges",        listColleges);   // public — for login page
router.post("/login",           login);
router.get( "/me",              requireAuth, me);
router.put( "/change-password", requireAuth, changePassword);

export default router;
