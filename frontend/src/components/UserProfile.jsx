import { useState, useRef } from "react";
import { FaUserCircle, FaCamera, FaTimes, FaLock, FaUserEdit, FaSignOutAlt } from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";

function UserProfile({ isOpen, onClose }) {
    const { user, updateUser, logout } = useAuth();

    const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password"
    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState("");
    const [profileError, setProfileError] = useState("");

    // Password fields
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Handle Profile Picture Upload
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setProfileError("Image size must be less than 5MB");
            return;
        }

        const formData = new FormData();
        formData.append("profilePicture", file);

        try {
            setAvatarLoading(true);
            setProfileError("");
            setProfileSuccess("");

            const response = await API.post("/users/profile-picture", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data?.data) {
                updateUser(response.data.data);
                setProfileSuccess("Profile picture updated!");
            }
        } catch (error) {
            console.error("Avatar upload failed:", error);
            setProfileError(error.response?.data?.message || "Failed to upload profile picture");
        } finally {
            setAvatarLoading(false);
        }
    };

    // Save Name and Bio
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            setProfileSaving(true);
            setProfileError("");
            setProfileSuccess("");

            const response = await API.put("/users/profile", { name, bio });

            if (response.data?.data) {
                updateUser(response.data.data);
                setProfileSuccess("Profile details saved successfully!");
            }
        } catch (error) {
            setProfileError(error.response?.data?.message || "Failed to update profile");
        } finally {
            setProfileSaving(false);
        }
    };

    // Change Password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }

        try {
            setPasswordSaving(true);
            const response = await API.post("/auth/change-password", {
                oldPassword,
                newPassword
            });

            setPasswordSuccess(response.data?.message || "Password changed successfully!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setPasswordError(error.response?.data?.message || "Failed to change password");
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button className="modal-close-btn" onClick={onClose}>
                    <FaTimes />
                </button>

                {/* Avatar Section */}
                <div className="profile-avatar-container">
                    <div className="avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                        {user?.profilePicture ? (
                            <img
                                src={user.profilePicture}
                                alt={user.name}
                                className="profile-avatar-img"
                            />
                        ) : (
                            <FaUserCircle className="profile-avatar-default" />
                        )}
                        <div className="avatar-overlay">
                            <FaCamera />
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        style={{ display: "none" }}
                    />

                    {avatarLoading && <p className="avatar-loading-text">Uploading avatar...</p>}
                    <h3>{user?.name}</h3>
                    <p className="profile-email-text">{user?.email}</p>
                </div>

                {/* Modal Tabs */}
                <div className="profile-tabs">
                    <button
                        className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
                        onClick={() => setActiveTab("profile")}
                    >
                        <FaUserEdit /> Profile Info
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "password" ? "active" : ""}`}
                        onClick={() => setActiveTab("password")}
                    >
                        <FaLock /> Security
                    </button>
                </div>

                {/* Tab 1: Profile Info Form */}
                {activeTab === "profile" && (
                    <form className="profile-form" onSubmit={handleSaveProfile}>
                        {profileSuccess && <p className="success-banner">{profileSuccess}</p>}
                        {profileError && <p className="error-banner">{profileError}</p>}

                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Bio / About</label>
                            <textarea
                                rows="3"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell others something about yourself..."
                                maxLength="160"
                            />
                            <span className="char-counter">{bio.length}/160</span>
                        </div>

                        <button type="submit" className="save-btn" disabled={profileSaving}>
                            {profileSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </form>
                )}

                {/* Tab 2: Change Password Form */}
                {activeTab === "password" && (
                    <form className="profile-form" onSubmit={handleChangePassword}>
                        {passwordSuccess && <p className="success-banner">{passwordSuccess}</p>}
                        {passwordError && <p className="error-banner">{passwordError}</p>}

                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="save-btn" disabled={passwordSaving}>
                            {passwordSaving ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}

                {/* Logout Action */}
                <div className="profile-modal-footer">
                    <button className="logout-btn" onClick={logout}>
                        <FaSignOutAlt /> Sign Out
                    </button>
                </div>

            </div>
        </div>
    );
}

export default UserProfile;

