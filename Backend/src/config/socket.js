import { Server as SocketIOServer } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Aires-BI Socket] Client connected: ${socket.id}`);

    // Join room for real-time survey period or role
    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`📡 [Aires-BI Socket] ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [Aires-BI Socket] Client disconnected: ${socket.id}`);
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