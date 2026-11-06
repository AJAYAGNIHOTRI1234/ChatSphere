import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],

        isGroup: {
            type: Boolean,
            default: false,
        },

        groupName: {
            type: String,
            default: "",
            trim: true,
        },

        groupPicture: {
            type: String,
            default: "",
        },

        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for conversation lookups
conversationSchema.index({ participants: 1 });
conversationSchema.index({ isGroup: 1, updatedAt: -1 });

const Conversation = mongoose.model(
    "Conversation",
    conversationSchema
);

export default Conversation;
