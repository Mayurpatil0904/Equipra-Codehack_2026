// src/app.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import "dotenv/config";

import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import equipmentRoutes from "./routes/equipment.routes";
import requestsRoutes from "./routes/requests.routes";
import teamsRoutes from "./routes/teams.routes";
import faultScanRoutes from "./routes/faultScan.routes";
import feedbackRoutes from "./routes/feedback.routes";
import messagesRoutes from "./routes/messages.routes";
import notificationsRoutes from "./routes/notifications.routes";
import adminRoutes from "./routes/admin.routes";
import professorsRoutes from "./routes/professors.routes";
import projectsRoutes from "./routes/projects.routes";
import telemetryRoutes from "./routes/telemetry.routes";
import analyticsRoutes from "./routes/analytics.routes";
import competitionsRoutes from "./routes/competitions.routes";
import labAnalyticsRoutes from "./routes/labAnalytics.routes";
import templatesRoutes from "./routes/templates.routes";
import aiRoutes from "./routes/ai.routes";
import searchRoutes from "./routes/search.routes";
import showcaseRoutes from "./routes/showcase.routes";

const app = express();

// Trust proxy (Render uses reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS — dynamic reflection for all Vercel domains (production & previews) and localhost
app.use(
  cors({
    origin: (origin, callback) => {
      // Allows all incoming origins dynamically so credentials and preflight checks succeed on all domains
      callback(null, true);
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// Global API rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 600,

  message: {
    success: false,
    message:
      "Too many requests. Try again later.",
  },
});

// Telemetry ingest limiter — IoT devices send frequently
const telemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: "Telemetry rate limit exceeded. Increase your send interval.",
  },
});

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 30,

  message: {
    success: false,
    message:
      "Too many login attempts. Try again in 15 minutes.",
  },
});

app.use("/api/telemetry", telemetryLimiter);

app.use("/api", limiter);

app.use("/api/auth/login", authLimiter);

// Body parser
app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan(
      process.env.NODE_ENV === "production"
        ? "combined"
        : "dev"
    )
  );
}

// Root route
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "Equipra Backend API is running 🚀",
  });
});

// Health route
app.get("/health", (_req, res) => {
  res.json({
    success: true,

    status: "ok",

    timestamp: new Date().toISOString(),

    service: "equipra-backend",
  });
});

// API Routes (mounted under both /api and root)
const registerRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/equipment`, equipmentRoutes);
  app.use(`${prefix}/requests`, requestsRoutes);
  app.use(`${prefix}/teams`, teamsRoutes);
  app.use(`${prefix}/fault-scans`, faultScanRoutes);
  app.use(`${prefix}/feedback`, feedbackRoutes);
  app.use(`${prefix}/messages`, messagesRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/professors`, professorsRoutes);
  app.use(`${prefix}/projects`, projectsRoutes);
  app.use(`${prefix}/telemetry`, telemetryRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/competitions`, competitionsRoutes);
  app.use(`${prefix}/lab-analytics`, labAnalyticsRoutes);
  app.use(`${prefix}/templates`, templatesRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/showcase`, showcaseRoutes);
};

registerRoutes("/api");
registerRoutes("");

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
