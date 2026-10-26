import express from "express";
import {
    searchUsers,
    getUserById,
    updateUserProfile,
    uploadProfilePicture
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchUsers);
router.put("/profile", protect, updateUserProfile);
router.post(
    "/profile-picture",
    protect,
    upload.single("profilePicture"),
    uploadProfilePicture
);
router.get("/:id", protect, getUserById);

export default router;
