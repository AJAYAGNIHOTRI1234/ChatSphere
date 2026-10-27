import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
    sendMessage,
    uploadMessageImage,
    getMessages,
    markMessagesAsRead,
    markSingleMessageAsRead,
    getUnreadCount
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/send", protect, sendMessage);
router.post("/upload", protect, upload.single("image"), uploadMessageImage);
router.get("/unread-count", protect, getUnreadCount);
router.put("/read/:conversationId", protect, markMessagesAsRead);
router.put("/:id/read", protect, markSingleMessageAsRead);
router.get("/:conversationId", protect, getMessages);

export default router;
