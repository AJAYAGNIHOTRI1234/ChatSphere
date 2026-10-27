import express from "express";

import {
    createConversation,
    getConversations,
} from "../controllers/conversationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create or get conversation
router.post("/", protect, createConversation);

// Get all conversations
router.get("/", protect, getConversations);

export default router;