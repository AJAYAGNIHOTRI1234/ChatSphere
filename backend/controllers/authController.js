import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// ========================================
// SIGNUP
// ========================================
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio,
            },
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ========================================
// LOGIN
// ========================================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio,
            },
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ========================================
// GET PROFILE
// ========================================
export const getProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ========================================
// UPDATE PROFILE
// ========================================
export const updateProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const updates = {};

        if (name && name.trim()) updates.name = name.trim();
        if (bio !== undefined) updates.bio = bio.trim();

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ========================================
// CHANGE PASSWORD
// ========================================
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters",
            });
        }

        const user = await User.findById(req.user._id);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password does not match",
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ========================================
// FORGOT PASSWORD
// ========================================
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // Security best practice: don't reveal whether email exists
            // Lekin ham clearly bata rahe hain for beginner-friendly UX
            return res.status(404).json({
                success: false,
                message: "No user found with this email address",
            });
        }

        // Generate a random 32-byte token (raw, unhashed)
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash the token before saving to DB (for security)
        // Raw token email me jayega, hashed DB me store hoga
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Token 10 minutes me expire hoga
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Build a beautiful HTML email
        const resetEmailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">💬 ChatSphere</h1>
                    <p style="color: #c7d2fe; margin: 6px 0 0;">Password Reset Request</p>
                </div>
                <div style="padding: 30px; background: #fff;">
                    <p style="color: #374151; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
                    <p style="color: #374151; font-size: 15px;">
                        We received a request to reset your ChatSphere password.
                        Copy the token below and paste it in the app:
                    </p>
                    <div style="background: #f3f4f6; border: 1px dashed #6366f1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0; font-size: 12px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase;">Your Reset Token</p>
                        <p style="margin: 8px 0 0; font-size: 14px; font-weight: bold; color: #1f2937; word-break: break-all; font-family: monospace;">${resetToken}</p>
                    </div>
                    <p style="color: #ef4444; font-size: 13px;">⏰ This token expires in <strong>10 minutes</strong>.</p>
                    <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
                </div>
                <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 ChatSphere. Built with ❤️</p>
                </div>
            </div>
        `;

        // Send the email
        await sendEmail({
            to: user.email,
            subject: "ChatSphere — Password Reset Token",
            html: resetEmailHTML,
        });

        return res.status(200).json({
            success: true,
            message: "Password reset token sent to your registered email address. Check your inbox (and spam folder).",
        });

    } catch (error) {
        console.error("❌ Send Email Error Details:", error);

        // Agar email sending fail ho jaye, toh DB se token hata do
        // Warna token DB me pada rahega lekin email nahi aaya
        await User.findOneAndUpdate(
            { email: req.body?.email?.toLowerCase().trim() },
            { $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 } }
        );

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send reset email. Please try again later.",
        });
    }
};

// ========================================
// RESET PASSWORD
// ========================================
export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required",
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired password reset token",
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully. You can now log in.",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
