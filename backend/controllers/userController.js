import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// ========================================
// SEARCH USERS
// ========================================
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter a name or email to search"
            });
        }

        const safeQuery = query.trim().replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [
                {
                    name: {
                        $regex: safeQuery,
                        $options: "i"
                    }
                },
                {
                    email: {
                        $regex: safeQuery,
                        $options: "i"
                    }
                }
            ]
        })
            .select("name email profilePicture bio isOnline lastSeen")
            .limit(20);

        return res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Search Users Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// GET USER BY ID
// ========================================
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select(
            "name email profilePicture bio isOnline lastSeen createdAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("Get User Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// UPDATE USER PROFILE
// ========================================
export const updateUserProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const updates = {};

        if (name && name.trim()) updates.name = name.trim();
        if (bio !== undefined) updates.bio = bio.trim();

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// UPLOAD PROFILE PICTURE
// ========================================
export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided"
            });
        }

        // Upload buffer to Cloudinary (or optimized DataURI fallback)
        const imageUrl = await uploadToCloudinary(
            req.file.buffer,
            req.file.mimetype,
            "chatsphere/profiles"
        );

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture: imageUrl },
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            data: updatedUser
        });

    } catch (error) {
        console.error("Upload Profile Picture Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload profile picture",
            error: error.message
        });
    }
};
