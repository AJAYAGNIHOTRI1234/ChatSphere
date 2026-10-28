import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

// In-memory map to support multiple devices/tabs per user
// Key: userId (string) -> Value: Set of socketIds
const onlineUsers = new Map();

export const initSocketHandler = (io) => {

    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();

        console.log(`🔌 Authenticated socket connected: ${socket.user.name} (${socket.id})`);

        // 1. Add socket to user's set of active connections
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // 2. Join personal room (for direct user-specific notifications)
        socket.join(userId);

        // 3. Update database isOnline status if this is the user's first active tab/device
        try {
            await User.findByIdAndUpdate(userId, { isOnline: true });
        } catch (err) {
            console.error("Failed to update user online status in DB:", err.message);
        }

        // 4. Broadcast updated list of online user IDs to all clients
        io.emit("get_online_users", Array.from(onlineUsers.keys()));
        io.emit("user_online", { userId });

        // ====================================
        // JOIN CONVERSATION ROOM
        // ====================================
        socket.on("join_conversation", async (conversationId) => {
            try {
                if (!conversationId) return;

                const conversation = await Conversation.findById(conversationId);

                if (!conversation) {
                    socket.emit("socket_error", { message: "Conversation not found" });
                    return;
                }

                // Verify user is authorized participant
                const isParticipant = conversation.participants.some(
                    (p) => p.toString() === userId
                );

                if (!isParticipant) {
                    socket.emit("socket_error", {
                        message: "Unauthorized: You are not a participant in this conversation"
                    });
                    return;
                }

                socket.join(conversationId.toString());
                socket.emit("conversation_joined", { conversationId });

                console.log(`👥 ${socket.user.name} joined conversation room: ${conversationId}`);
            } catch (error) {
                console.error("Join Conversation Socket Error:", error.message);
                socket.emit("socket_error", { message: "Failed to join conversation room" });
            }
        });

        // ====================================
        // LEAVE CONVERSATION ROOM
        // ====================================
        socket.on("leave_conversation", (conversationId) => {
            if (conversationId) {
                socket.leave(conversationId.toString());
                console.log(`🚪 ${socket.user.name} left conversation room: ${conversationId}`);
            }
        });

        // ====================================
        // TYPING INDICATORS
        // ====================================
        socket.on("typing", ({ conversationId }) => {
            if (!conversationId) return;
            socket.to(conversationId.toString()).emit("user_typing", {
                conversationId,
                userId,
                userName: socket.user.name
            });
        });

        socket.on("stop_typing", ({ conversationId }) => {
            if (!conversationId) return;
            socket.to(conversationId.toString()).emit("user_stop_typing", {
                conversationId,
                userId
            });
        });

        // ====================================
        // REAL-TIME MARK MESSAGES READ
        // ====================================
        socket.on("mark_messages_read", async ({ conversationId }) => {
            try {
                if (!conversationId) return;

                await Message.updateMany(
                    {
                        conversation: conversationId,
                        sender: { $ne: socket.user._id },
                        readBy: { $ne: socket.user._id }
                    },
                    {
                        $addToSet: {
                            readBy: socket.user._id,
                            deliveredTo: socket.user._id
                        }
                    }
                );

                io.to(conversationId.toString()).emit("messages_read", {
                    conversationId: conversationId.toString(),
                    readerId: userId
                });
            } catch (err) {
                console.error("Socket mark_messages_read error:", err.message);
            }
        });

        // ====================================
        // DISCONNECT
        // ====================================
        socket.on("disconnect", async () => {
            console.log(`❌ Socket disconnected: ${socket.user.name} (${socket.id})`);

            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);

                // If user has no more active socket connections left
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);

                    const lastSeen = new Date();
                    try {
                        await User.findByIdAndUpdate(userId, {
                            isOnline: false,
                            lastSeen
                        });
                    } catch (err) {
                        console.error("Failed to update user offline status in DB:", err.message);
                    }

                    // Inform all clients that user went offline
                    io.emit("user_offline", { userId, lastSeen });
                    io.emit("get_online_users", Array.from(onlineUsers.keys()));
                }
            }
        });
    });
};

export default initSocketHandler;
