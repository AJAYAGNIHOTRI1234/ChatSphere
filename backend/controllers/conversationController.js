
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

// ========================================
// CREATE OR GET ONE-TO-ONE CONVERSATION
// ========================================

export const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user._id;

        // Check receiver ID
        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: "Receiver ID is required"
            });
        }

        // Check whether receiver exists
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Prevent chatting with yourself
        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot chat with yourself"
            });
        }

        // Check existing conversation
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: {
                $all: [senderId, receiverId],
                $size: 2
            }
        })
            .populate(
                "participants",
                "name email profilePicture isOnline"
            )
            .populate("lastMessage");

        // Create conversation if it does not exist
        if (!conversation) {

            const newConversation = await Conversation.create({
                participants: [senderId, receiverId],
                isGroup: false
            });

            conversation = await Conversation.findById(
                newConversation._id
            )
                .populate(
                    "participants",
                    "name email profilePicture isOnline"
                )
                .populate("lastMessage");
        }

        // Send response
        return res.status(200).json({
            success: true,
            message: "Conversation ready",
            data: conversation
        });

    } catch (error) {

        console.error("Create Conversation Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ========================================
// GET ALL USER CONVERSATIONS
// ========================================

export const getConversations = async (req, res) => {
    try {

        const conversations = await Conversation.find({
            participants: req.user._id
        })
            .populate(
                "participants",
                "name email profilePicture isOnline"
            )
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: conversations.length,
            data: conversations
        });

    } catch (error) {

        console.error("Get Conversations Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
