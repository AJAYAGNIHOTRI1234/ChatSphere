import express from "express";
import {
    createGroup,
    addMember,
    removeMember,
    updateGroup
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createGroup);
router.put("/:id/add-member", protect, addMember);
router.put("/:id/remove-member", protect, removeMember);
router.put("/:id/update", protect, updateGroup);

export default router;

