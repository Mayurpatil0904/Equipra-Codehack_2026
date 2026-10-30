// src/routes/messages.routes.ts
import { Router } from "express";
import { listThreads, getThread, sendMessage } from "../controllers/messages.controller";
import { listContacts } from "../controllers/contacts.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// ✅ FIX — this route was missing, causing "no one to message"
router.get( "/contacts",            listContacts);

router.get( "/threads",             listThreads);
router.get( "/threads/:partnerId",  getThread);
router.post("/threads/:partnerId",  sendMessage);

export default router;
