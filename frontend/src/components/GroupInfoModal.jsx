import { useState } from "react";
import {
    FaTimes,
    FaUsers,
    FaUserCircle,
    FaCrown,
    FaUserPlus,
    FaSignOutAlt,
    FaTrashAlt,
    FaSearch
} from "react-icons/fa";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";

function GroupInfoModal({ isOpen, onClose, conversation, onGroupUpdated, onLeaveGroup }) {
    const { user: currentUser } = useAuth();
    const { onlineUsers } = useSocket();

    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    if (!isOpen || !conversation || !conversation.isGroup) return null;

    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    const adminId = String(conversation.groupAdmin?._id || conversation.groupAdmin || "");
    const isAdmin = currentUserId === adminId;

    // Search users to add
    const handleSearch = async (val) => {
        setSearch(val);
        setError("");
        if (!val.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearchLoading(true);
            const res = await API.get(`/users/search?query=${encodeURIComponent(val)}`);
            // Filter out existing participants
            const existingIds = new Set(
                (conversation.participants || []).map((p) => String(p._id || p.id || p))
            );
            const filtered = (res.data.data || []).filter(
                (u) => !existingIds.has(String(u._id || u.id))
            );
            setSearchResults(filtered);
        } catch (err) {
            console.error("Search error:", err);
            setError("Failed to search users");
        } finally {
            setSearchLoading(false);
        }
    };

    // Add Member
    const handleAddMember = async (userId) => {
        try {
            setActionLoading(true);
            setError("");
            setSuccess("");

            const res = await API.put(`/groups/${conversation._id}/add-member`, { userId });
            if (res.data?.data) {
                onGroupUpdated(res.data.data);
                setSuccess("Member added successfully");
                setSearch("");
                setSearchResults([]);
                setIsAdding(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to add member");
        } finally {
            setActionLoading(false);
        }
    };

    // Remove Member (by Admin)
    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member from the group?")) return;

        try {
            setActionLoading(true);
            setError("");
            setSuccess("");

            const res = await API.put(`/groups/${conversation._id}/remove-member`, { userId });
            if (res.data?.data) {
                onGroupUpdated(res.data.data);
                setSuccess("Member removed from group");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove member");
        } finally {
            setActionLoading(false);
        }
    };

    // Leave Group
    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;

        try {
            setActionLoading(true);
            setError("");

            await API.put(`/groups/${conversation._id}/remove-member`, {
                userId: currentUserId
            });

            onLeaveGroup(conversation._id);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to leave group");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="group-info-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <button className="modal-close-btn" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="group-info-header">
                    <div className="group-info-avatar-box">
                        <FaUsers />
                    </div>
                    <h3>{conversation.groupName}</h3>
                    <p className="group-member-count">
                        {conversation.participants?.length || 0} participants
                    </p>
                </div>

                {error && <p className="error-banner" style={{ margin: "10px 0" }}>{error}</p>}
                {success && <p className="success-banner" style={{ margin: "10px 0" }}>{success}</p>}

                {/* Add Member Toggle (Admin only) */}
                {isAdmin && (
                    <div style={{ margin: "14px 0" }}>
                        <button
                            type="button"
                            className="add-member-toggle-btn"
                            onClick={() => setIsAdding(!isAdding)}
                        >
                            <FaUserPlus /> {isAdding ? "Close Search" : "Add New Participant"}
                        </button>

                        {isAdding && (
                            <div className="add-member-search-box">
                                <div className="search-box" style={{ margin: "8px 0", padding: "10px" }}>
                                    <FaSearch />
                                    <input
                                        type="text"
                                        placeholder="Search user to add..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>

                                {searchLoading && <p style={{ fontSize: "12px", color: "#64748b" }}>Searching...</p>}

                                {!searchLoading && search.trim() && searchResults.length === 0 && (
                                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>No available users found</p>
                                )}

                                <div className="add-member-results">
                                    {searchResults.map((user) => (
                                        <div
                                            className="add-member-item"
                                            key={user._id || user.id}
                                            onClick={() => handleAddMember(user._id || user.id)}
                                        >
                                            {user.profilePicture ? (
                                                <img
                                                    src={user.profilePicture}
                                                    alt={user.name}
                                                    className="user-avatar-img"
                                                />
                                            ) : (
                                                <FaUserCircle className="user-avatar-default" />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <h4>{user.name}</h4>
                                                <p>{user.email}</p>
                                            </div>
                                            <button className="add-btn-small" disabled={actionLoading}>
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Participants List */}
                <h4 className="members-section-title">Participants</h4>
                <div className="group-members-list">
                    {conversation.participants?.map((member) => {
                        const mId = String(member._id || member.id || member);
                        const isMemberAdmin = mId === adminId;
                        const isCurrentUserMember = mId === currentUserId;
                        const isOnline = onlineUsers.some((id) => String(id) === mId);

                        return (
                            <div className="group-member-item" key={mId}>
                                {member.profilePicture ? (
                                    <img
                                        src={member.profilePicture}
                                        alt={member.name}
                                        className="user-avatar-img"
                                    />
                                ) : (
                                    <FaUserCircle className="user-avatar-default" />
                                )}

                                <div className="member-info">
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <h4>{member.name || "User"} {isCurrentUserMember && "(You)"}</h4>
                                        {isMemberAdmin && (
                                            <span className="admin-badge">
                                                <FaCrown /> Admin
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ color: isOnline ? "#16a34a" : "#64748b" }}>
                                        {isOnline ? "Online" : "Offline"}
                                    </p>
                                </div>

                                {/* Remove Button (Visible to admin for non-admin members) */}
                                {isAdmin && !isMemberAdmin && (
                                    <button
                                        type="button"
                                        className="remove-member-btn"
                                        onClick={() => handleRemoveMember(mId)}
                                        title="Remove from group"
                                        disabled={actionLoading}
                                    >
                                        <FaTrashAlt />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Leave Group Action */}
                <div className="group-modal-footer" style={{ marginTop: "20px" }}>
                    <button
                        type="button"
                        className="leave-group-btn"
                        onClick={handleLeaveGroup}
                        disabled={actionLoading}
                    >
                        <FaSignOutAlt /> Leave Group
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GroupInfoModal;

