// src/server.ts
import "dotenv/config";
import http from "http";
import app from "./app";
import prisma from "./lib/prisma";
import { initSocket } from "./lib/socket";
import { autoSeed } from "./lib/autoSeed";

const PORT = process.env.PORT ?? 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
    try {
      const collegeCount = await prisma.college.count();
      if (collegeCount === 0) {
        console.log("🌱 Database is empty! Running autoSeed...");
        await autoSeed();
      }
    } catch (seedErr) {
      console.error("⚠️ AutoSeed check failed:", seedErr);
    }

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`\n🚀 Equipra backend running on http://localhost:${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV ?? "development"}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API base    : http://localhost:${PORT}/api`);
      console.log(`   WebSocket   : ws://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on("SIGINT",  async () => { await prisma.$disconnect(); process.exit(0); });
process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });

start();
