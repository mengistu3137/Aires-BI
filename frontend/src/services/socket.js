import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/auth/auth.store.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;
const listeners = new Map(); // eventName -> Set<callbacks>

/**
 * Initializes or retrieves the singleton authenticated Socket.IO connection
 */
export const getSocket = () => {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
        disconnectSocket();
        return null;
    }

    // Reuse active socket if connected with same token
    if (socket && socket.connected) {
        return socket;
    }

    if (socket) {
        socket.auth = { token };
        socket.connect();
        return socket;
    }

    // Create new socket connection
    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.on("connect", () => {
        console.log(`🔌 [Aires-BI Realtime] Connected (ID: ${socket.id})`);
        // Re-bind all active listeners on reconnect
        listeners.forEach((callbacks, event) => {
            callbacks.forEach((cb) => {
                socket.off(event, cb);
                socket.on(event, cb);
            });
        });
    });

    socket.on("connect_error", (error) => {
        console.warn(`⚠️ [Aires-BI Realtime] Connection error: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`🔌 [Aires-BI Realtime] Disconnected: ${reason}`);
    });

    return socket;
};

/**
 * Disconnect socket on logout or cleanup
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        listeners.clear();
        console.log("🔌 [Aires-BI Realtime] Socket disconnected cleanly.");
    }
};

/**
 * Safely subscribe to a real-time event. Returns an unsubscribe cleanup function.
 */
export const subscribeToRealtimeEvent = (event, callback) => {
    if (!listeners.has(event)) {
        listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);

    const activeSocket = getSocket();
    if (activeSocket) {
        activeSocket.on(event, callback);
    }

    return () => {
        const callbacks = listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                listeners.delete(event);
            }
        }
        if (activeSocket) {
            activeSocket.off(event, callback);
        }
    };
};