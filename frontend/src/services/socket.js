
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let activeSocket = null;

export const connectSocket = (token) => {
    if (activeSocket?.connected) {
        return activeSocket;
    }

    if (activeSocket) {
        activeSocket.disconnect();
    }

    activeSocket = io(SOCKET_URL, {
        auth: {
            token
        },
        transports: ["websocket"]
    });

    activeSocket.on("connect", () => {
        console.log("Connected to ChatSphere:", activeSocket.id);
    });

    activeSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    return activeSocket;
};

export const getSocket = () => activeSocket;
