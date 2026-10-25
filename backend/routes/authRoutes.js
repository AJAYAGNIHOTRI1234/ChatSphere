import express from "express";
import {
    signup,
    login,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Password Management
router.post("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
