// src/lib/socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer) {
  try {
    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    const origins = clientUrl.split(",").map(s => s.trim());

    io = new SocketServer(httpServer, {
      cors: {
        origin: origins.length === 1 ? origins[0] : origins,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      socket.on("join:project", (projectId: string) => {
        socket.join(`project:${projectId}`);
        console.log(`[WS] ${socket.id} joined project:${projectId}`);
      });

      socket.on("leave:project", (projectId: string) => {
        socket.leave(`project:${projectId}`);
      });

      socket.on("disconnect", () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
      });
    });

    console.log("✅ WebSocket server initialized");
    return io;
  } catch (err) {
    console.error("❌ WebSocket init failed (non-fatal):", err);
    return null;
  }
}

// Emit telemetry to all clients watching a project
export function emitTelemetry(projectId: string, deviceId: string, data: any) {
  if (!io) return;
  io.to(`project:${projectId}`).emit("telemetry:live", {
    deviceId,
    projectId,
    data,
    timestamp: new Date().toISOString(),
  });
}

// Emit device status change (online/offline)
export function emitDeviceStatus(projectId: string, deviceId: string, status: string) {
  if (!io) return;
  io.to(`project:${projectId}`).emit("device:status", {
    deviceId,
    status,
    timestamp: new Date().toISOString(),
  });
}

export function getIO() { return io; }
