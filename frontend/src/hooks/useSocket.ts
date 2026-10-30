// src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  (import.meta as any).env?.VITE_API_URL?.replace("/api", "") ??
  "https://equipra-codehack-2026-backend.onrender.com";

export function useSocket(projectId: string | undefined, onTelemetry: (data: any) => void) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onTelemetry);
  callbackRef.current = onTelemetry;

  useEffect(() => {
    if (!projectId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WS] Connected:", socket.id);
      socket.emit("join:project", projectId);
    });

    socket.on("telemetry:live", (data: any) => {
      callbackRef.current(data);
    });

    socket.on("device:status", (data: any) => {
      console.log("[WS] Device status:", data);
    });

    socket.on("disconnect", () => {
      console.log("[WS] Disconnected");
    });

    return () => {
      socket.emit("leave:project", projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  return socketRef;
}
