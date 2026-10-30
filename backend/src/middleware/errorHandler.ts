// src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/response";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Known app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Prisma unique constraint violation
  if ((err as any).code === "P2002") {
    res.status(409).json({ success: false, message: "A record with that value already exists." });
    return;
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    res.status(404).json({ success: false, message: "Record not found." });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message,
  });
}
