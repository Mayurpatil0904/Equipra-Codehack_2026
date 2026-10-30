// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { unauthorized, forbidden } from "../lib/response";

// Extend Express Request to carry the decoded JWT
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── Require any valid token ───────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    unauthorized(res, "No token provided.");
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    unauthorized(res, "Invalid or expired token.");
  }
}

// ── Require specific roles ────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { unauthorized(res); return; }
    if (!roles.includes(req.user.role)) {
      forbidden(res, `Access restricted to: ${roles.join(", ")}`);
      return;
    }
    next();
  };
}

// ── Require canManageAdmins (superadmin) ─────────────────────
export function requireCanManageAdmins(req: Request, res: Response, next: NextFunction) {
  if (!req.user) { unauthorized(res); return; }
  if (!req.user.canManageAdmins) {
    forbidden(res, "Only super-admins can perform this action.");
    return;
  }
  next();
}
