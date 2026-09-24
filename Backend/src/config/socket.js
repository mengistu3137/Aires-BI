import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import prisma from "./db.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // 1. Handshake JWT Authentication & RBAC Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (token && token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      if (!token) {
        return next(new Error("Authentication required. No token provided in handshake."));
      }

      // Verify JWT
      const decoded = verifyToken(token);

      // Verify user existence and active status in DB
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          role: true,
          active: true,
        },
      });

      if (!user) {
        return next(new Error("User associated with token no longer exists."));
      }

      if (!user.active) {
        return next(new Error("User account is deactivated."));
      }

      // Attach user details to socket instance
      socket.user = user;
      next();
    } catch (err) {
      console.warn(`🔒 [Socket Handshake Rejected]: ${err.message}`);
      next(new Error("Invalid or expired authentication token."));
    }
  });

  // 2. Connection Handling & Room Partitioning
  io.on("connection", (socket) => {
    const { id: userId, name, role } = socket.user;

    // Automatically join role-based and personal rooms
    const roleRoom = `role:${role}`;
    const userRoom = `user:${userId}`;

    socket.join(roleRoom);
    socket.join(userRoom);

    console.log(`🔌 [Socket Connected] ${name} (${role}) | ID: ${socket.id} | Rooms: [${roleRoom}, ${userRoom}]`);

    // Allow joining specific period or store rooms if authorized
    socket.on("join-period", (periodId) => {
      if (periodId) {
        const periodRoom = `period:${periodId}`;
        socket.join(periodRoom);
        console.log(`📡 [Socket Room] ${socket.id} joined ${periodRoom}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Socket Disconnected] ${name} | Reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

/**
 * Emit event to specific role rooms (e.g. ['ADMIN', 'MANAGER'])
 */
export const emitToRoles = (roles = [], event, payload) => {
  if (!io) return;
  const targetRoles = Array.isArray(roles) ? roles : [roles];
  let broadcaster = io;

  targetRoles.forEach((role) => {
    broadcaster = broadcaster.to(`role:${role}`);
  });

  broadcaster.emit(event, payload);
};

/**
 * Emit event to a specific user's private socket room
 */
export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
};