import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import prisma from "./src/config/db.js";
import { initSocket } from "./src/config/socket.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect to PostgreSQL via Prisma
    await prisma.$connect();
    console.log("✅ [Aires-BI] Database connected successfully");

    // 2. Wrap Express with HTTP Server for WebSockets (for live survey sync)
    const httpServer = http.createServer(app);

    // 3. Initialize WebSocket Gateway
    initSocket(httpServer);
    console.log("✅ [Aires-BI] Real-time Survey WebSocket gateway initialized");

    // 4. Start HTTP + WebSocket Server
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`
  🚀 Aires-BI Platform Server
  📡 Environment: ${process.env.NODE_ENV || "development"}
  🔗 Listening on: http://localhost:${PORT}
  📊 BI & Field Survey Gateway: Active
      `);
    });

    const handleShutdown = (signal) => {
      console.log(`⚠️  ${signal} received. Shutting down gracefully...`);
      httpServer.close(async () => {
        await prisma.$disconnect();
        console.log("✅ [Aires-BI] Database disconnected. Bye!");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

    process.on("unhandledRejection", async (err) => {
      console.error("💥 Unhandled Rejection:", err);
      httpServer.close(async () => {
        await prisma.$disconnect();
        process.exit(1);
      });
    });

    process.on("uncaughtException", async (err) => {
      console.error("💥 Uncaught Exception:", err);
      httpServer.close(async () => {
        await prisma.$disconnect();
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("❌ [Aires-BI] Server boot failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();