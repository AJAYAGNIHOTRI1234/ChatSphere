import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// ========================================
// SEND MESSAGE
// ========================================
export const sendMessage = async (req, res) => {
    try {
        const { conversationId, text, image, messageType = "text" } = req.body;

        // Validate input
        if (!conversationId || (!text && !image)) {
            return res.status(400).json({
                success: false,
                message: "Conversation ID and message content are required"
            });
        }

        // Find conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Check whether user is a participant
        const isParticipant = conversation.participants.some(
            id => id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to send messages in this conversation"
            });
        }

        const io = req.app.get("io");

        // Identify online participants to mark as delivered
        const deliveredTo = [req.user._id];
        if (io) {
            conversation.participants.forEach((participantId) => {
                const pIdStr = participantId.toString();
                if (pIdStr !== req.user._id.toString()) {
                    const userRoom = io.sockets.adapter.rooms.get(pIdStr);
                    if (userRoom && userRoom.size > 0) {
                        deliveredTo.push(participantId);
                    }
                }
            });
        }

        // Create message
        const message = new Message({
            conversation: conversationId,
            sender: req.user._id,
            text: text ? text.trim() : "",
            image: image || "",
            messageType: image ? "image" : messageType,
            readBy: [req.user._id],
            deliveredTo
        });

        // Save message in MongoDB
        const savedMessage = await message.save();

        // Populate sender details
        await savedMessage.populate(
            "sender",
            "name email profilePicture"
        );

        // Update conversation's last message
        conversation.lastMessage = savedMessage._id;
        await conversation.save();

        // Broadcast message through Socket.IO
        if (io) {
            io.to(conversationId.toString()).emit(
                "new_message",
                savedMessage
            );
        }

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: savedMessage
        });

    } catch (error) {
        console.error("Send Message Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send message",
            error: error.message
        });
    }
};

// ========================================
// UPLOAD MESSAGE IMAGE ATTACHMENT
// ========================================
export const uploadMessageImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided"
            });
        }

        const imageUrl = await uploadToCloudinary(
            req.file.buffer,
            req.file.mimetype,
            "chatsphere/messages"
        );

        return res.status(200).json({
            success: true,
            imageUrl
        });

    } catch (error) {
        console.error("Message Image Upload Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: error.message
        });
    }
};

// ========================================
// GET MESSAGES
// ========================================
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const isParticipant = conversation.participants.some(
            id => id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view these messages"
            });
        }

        // Fetch messages
        const messages = await Message.find({
            conversation: conversationId
        })
            .populate("sender", "name email profilePicture")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {
        console.error("Get Messages Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch messages",
            error: error.message
        });
    }
};

// ========================================
// MARK ALL MESSAGES AS READ IN CONVERSATION
// ========================================
export const markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                readBy: { $ne: userId }
            },
            {
                $addToSet: {
                    readBy: userId,
                    deliveredTo: userId
                }
            }
        );

        const io = req.app.get("io");
        if (io) {
            io.to(conversationId.toString()).emit("messages_read", {
                conversationId,
                readerId: userId.toString()
            });
        }

        return res.status(200).json({
            success: true,
            message: "Messages marked as read"
        });

    } catch (error) {
        console.error("Mark Messages Read Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark messages as read",
            error: error.message
        });
    }
};

// ========================================
// MARK SINGLE MESSAGE AS READ
// ========================================
export const markSingleMessageAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const message = await Message.findByIdAndUpdate(
            id,
            {
                $addToSet: {
                    readBy: userId,
                    deliveredTo: userId
                }
            },
            { new: true }
        ).populate("sender", "name email profilePicture");

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(message.conversation.toString()).emit("messages_read", {
                conversationId: message.conversation.toString(),
                messageId: message._id.toString(),
                readerId: userId.toString()
            });
        }

        return res.status(200).json({
            success: true,
            data: message
        });

    } catch (error) {
        console.error("Mark Single Message Read Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark message as read",
            error: error.message
        });
    }
};

// ========================================
// GET UNREAD MESSAGE COUNTS
// ========================================
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const unreadGroups = await Message.aggregate([
            {
                $match: {
                    sender: { $ne: userId },
                    readBy: { $ne: userId }
                }
            },
            {
                $group: {
                    _id: "$conversation",
                    count: { $sum: 1 }
                }
            }
        ]);

        const counts = {};
        unreadGroups.forEach((item) => {
            counts[item._id.toString()] = item.count;
        });

        return res.status(200).json({
            success: true,
            data: counts
        });

    } catch (error) {
        console.error("Get Unread Count Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch unread counts",
            error: error.message
        });
    }
};
