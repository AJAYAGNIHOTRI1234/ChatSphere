import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
            default: "",
            trim: true,
        },

        image: {
            type: String,
            default: "",
        },

        messageType: {
            type: String,
            enum: ["text", "image"],
            default: "text",
        },

        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        deliveredTo: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes for high performance querying
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, readBy: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
