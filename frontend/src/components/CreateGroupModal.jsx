import { useState } from "react";
import { FaTimes, FaUsers, FaSearch, FaUserCircle, FaCheck } from "react-icons/fa";
import API from "../services/api";

function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    // Search users
    const handleSearch = async (val) => {
        setSearch(val);
        setError("");

        if (!val.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const res = await API.get(`/users/search?query=${encodeURIComponent(val)}`);
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error("Search error:", err);
            setError("Failed to search users");
        } finally {
            setLoading(false);
        }
    };

    // Toggle user selection
    const toggleUser = (user) => {
        const userId = user._id || user.id;
        const isSelected = selectedUsers.some((u) => (u._id || u.id) === userId);

        if (isSelected) {
            setSelectedUsers(selectedUsers.filter((u) => (u._id || u.id) !== userId));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    // Remove user chip
    const removeUser = (userId) => {
        setSelectedUsers(selectedUsers.filter((u) => (u._id || u.id) !== userId));
    };

    // Submit group creation
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setError("");

        if (!groupName.trim()) {
            setError("Please provide a group name");
            return;
        }

        if (selectedUsers.length < 2) {
            setError("Please select at least 2 members to create a group");
            return;
        }

        try {
            setCreating(true);
            const participantIds = selectedUsers.map((u) => u._id || u.id);

            const res = await API.post("/groups/create", {
                groupName: groupName.trim(),
                participantIds
            });

            const newGroup = res.data.data;
            if (newGroup) {
                onGroupCreated(newGroup);
                // Reset state
                setGroupName("");
                setSearch("");
                setSearchResults([]);
                setSelectedUsers([]);
                onClose();
            }
        } catch (err) {
            console.error("Create group failed:", err);
            setError(err.response?.data?.message || "Failed to create group");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="group-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="group-modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FaUsers className="group-modal-icon" />
                        <h3>Create New Group</h3>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {error && <p className="error-banner" style={{ margin: "12px 0" }}>{error}</p>}

                <form onSubmit={handleCreateGroup}>
                    {/* Group Name */}
                    <div className="form-group" style={{ marginBottom: "14px" }}>
                        <label>Group Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Project Developers, Friends"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Selected Members Chips */}
                    {selectedUsers.length > 0 && (
                        <div className="selected-chips-container">
                            <span className="selected-label">Selected ({selectedUsers.length}):</span>
                            <div className="chips-list">
                                {selectedUsers.map((u) => (
                                    <div className="user-chip" key={u._id || u.id}>
                                        <span>{u.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeUser(u._id || u.id)}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Users to Add */}
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                        <label>Add Members (minimum 2)</label>
                        <div className="search-box" style={{ margin: "4px 0 10px 0", padding: "10px" }}>
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Search Results / Pickers */}
                    <div className="group-search-results">
                        {loading && <p style={{ fontSize: "13px", color: "#64748b" }}>Searching...</p>}

                        {!loading && search.trim() && searchResults.length === 0 && (
                            <p style={{ fontSize: "13px", color: "#94a3b8" }}>No users found</p>
                        )}

                        {searchResults.map((user) => {
                            const isSelected = selectedUsers.some(
                                (u) => (u._id || u.id) === (user._id || user.id)
                            );

                            return (
                                <div
                                    className={`group-user-item ${isSelected ? "selected" : ""}`}
                                    key={user._id || user.id}
                                    onClick={() => toggleUser(user)}
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

                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <h4>{user.name}</h4>
                                        <p>{user.email}</p>
                                    </div>

                                    <div className={`checkbox-circle ${isSelected ? "checked" : ""}`}>
                                        {isSelected && <FaCheck />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="group-modal-footer">
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={onClose}
                            disabled={creating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="save-btn"
                            disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
                            style={{ margin: 0 }}
                        >
                            {creating ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateGroupModal;

