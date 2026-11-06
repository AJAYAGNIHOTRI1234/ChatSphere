import { createContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

export const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [lastSeenMap, setLastSeenMap] = useState({});
    const socketRef = useRef(null);

    useEffect(() => {
        // Only connect when user is logged in with valid token
        if (token && user) {
            const newSocket = io(SOCKET_URL, {
                auth: { token },
                transports: ["websocket"]
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            newSocket.on("connect", () => {
                console.log("🟢 Connected to ChatSphere Socket:", newSocket.id);
                setIsConnected(true);
            });

            newSocket.on("disconnect", () => {
                console.log("🔴 Disconnected from ChatSphere Socket");
                setIsConnected(false);
            });

            // Receive real-time list of all currently online users
            newSocket.on("get_online_users", (users) => {
                setOnlineUsers(users);
            });

            // When a single user comes online
            newSocket.on("user_online", ({ userId }) => {
                setOnlineUsers((prev) => {
                    if (prev.includes(userId)) return prev;
                    return [...prev, userId];
                });
            });

            // When a user disconnects
            newSocket.on("user_offline", ({ userId, lastSeen }) => {
                setOnlineUsers((prev) => prev.filter((id) => id !== userId));
                if (userId && lastSeen) {
                    setLastSeenMap((prev) => ({
                        ...prev,
                        [String(userId)]: lastSeen
                    }));
                }
            });

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            };
        } else {
            // Disconnect if user logs out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
                setOnlineUsers([]);
                setLastSeenMap({});
            }
        }
    }, [token, user?._id || user?.id]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers, lastSeenMap }}>
            {children}
        </SocketContext.Provider>
    );
};
