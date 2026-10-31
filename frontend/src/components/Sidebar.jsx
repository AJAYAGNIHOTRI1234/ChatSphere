import { useEffect, useState } from "react";
import API from "../services/api";
import { FaSearch, FaUserCircle, FaCog } from "react-icons/fa";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../hooks/useAuth";
import UserProfile from "./UserProfile";

function Sidebar({ onSelectConversation, selectedConversation }) {

    const [conversations, setConversations] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [conversationLoading, setConversationLoading] = useState(false);
    const [error, setError] = useState("");
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const { socket, onlineUsers } = useSocket();
    const { user: currentUser } = useAuth();

    const currentUserId = String(
        currentUser?._id || currentUser?.id || ""
    );

    // ====================================
    // FETCH CONVERSATIONS & UNREAD COUNTS
    // ====================================

    const fetchConversations = async () => {
        try {
            const [convResponse, unreadResponse] = await Promise.all([
                API.get("/conversations"),
                API.get("/messages/unread-count")
            ]);

            setConversations(convResponse.data.data || []);
            setUnreadCounts(unreadResponse.data.data || {});
        } catch (error) {
            console.error(
                "Fetch Conversations/Unread Error:",
                error.response?.data || error.message
            );
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // ====================================
    // REAL-TIME SOCKET UPDATES FOR SIDEBAR
    // ====================================
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            const convId = String(message.conversation?._id || message.conversation);

            setConversations((prev) => {
                const existingIndex = prev.findIndex((c) => String(c._id) === convId);

                if (existingIndex !== -1) {
                    const updatedConversation = {
                        ...prev[existingIndex],
                        lastMessage: message,
                        updatedAt: new Date().toISOString()
                    };
                    const rest = prev.filter((_, idx) => idx !== existingIndex);
                    return [updatedConversation, ...rest];
                }
                return prev;
            });

            if (String(selectedConversation?._id) !== convId) {
                const senderId = String(message.sender?._id || message.sender?.id || message.sender);
                if (senderId !== currentUserId) {
                    setUnreadCounts((prev) => ({
                        ...prev,
                        [convId]: (prev[convId] || 0) + 1
                    }));
                }
            }
        };

        const handleMessagesRead = ({ conversationId }) => {
            setUnreadCounts((prev) => ({
                ...prev,
                [String(conversationId)]: 0
            }));
        };

        socket.on("new_message", handleNewMessage);
        socket.on("messages_read", handleMessagesRead);

        return () => {
            socket.off("new_message", handleNewMessage);
            socket.off("messages_read", handleMessagesRead);
        };
    }, [socket, selectedConversation?._id, currentUserId]);

    // ====================================
    // SEARCH USERS
    // ====================================

    const searchUsers = async (value) => {
        setSearch(value);
        setError("");

        if (!value.trim()) {
            setUsers([]);
            return;
        }

        try {
            setLoading(true);

            const response = await API.get(
                `/users/search?query=${encodeURIComponent(value)}`
            );

            setUsers(response.data.data || []);
        } catch (error) {
            console.error(
                "User Search Error:",
                error.response?.data || error.message
            );
            setUsers([]);
            setError("Unable to search users");
        } finally {
            setLoading(false);
        }
    };

    // ====================================
    // CREATE OR OPEN CONVERSATION
    // ====================================

    const handleSelectConversation = (conversation) => {
        onSelectConversation(conversation);

        if (conversation?._id) {
            setUnreadCounts((prev) => ({
                ...prev,
                [String(conversation._id)]: 0
            }));
        }
    };

    const openConversation = async (user) => {
        try {
            setConversationLoading(true);
            setError("");

            const receiverId = user._id || user.id;

            const response = await API.post("/conversations", {
                receiverId
            });

            const conversation = response.data.data;

            if (!conversation || !conversation._id) {
                throw new Error("Invalid conversation response from server");
            }

            handleSelectConversation(conversation);

            setSearch("");
            setUsers([]);
            await fetchConversations();

        } catch (error) {
            console.error(
                "Conversation Error:",
                error.response?.data || error.message
            );
            setError(
                error.response?.data?.message ||
                error.message ||
                "Unable to open conversation"
            );
        } finally {
            setConversationLoading(false);
        }
    };

    // ====================================
    // GET OTHER PARTICIPANT
    // ====================================

    const getOtherParticipant = (conversation) => {
        return conversation.participants?.find((participant) => {
            const participantId = String(
                participant?._id || participant?.id || participant
            );
            return participantId !== currentUserId;
        });
    };

    // ====================================
    // SIDEBAR UI
    // ====================================

    return (
        <div className="sidebar">

            {/* HEADER */}
            <div className="sidebar-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h2>ChatSphere</h2>
                        <p>Real-time conversations</p>
                    </div>
                    <button
                        className="header-settings-btn"
                        onClick={() => setIsProfileOpen(true)}
                        title="Profile & Settings"
                    >
                        <FaCog />
                    </button>
                </div>
            </div>

            {/* SEARCH BOX */}
            <div className="search-box">
                <FaSearch />
                <input
                    type="text"
                    placeholder="Search people by name or email..."
                    value={search}
                    onChange={(e) => searchUsers(e.target.value)}
                />
            </div>

            {/* SEARCH RESULTS */}
            {search.trim() && (
                <div className="search-results">
                    {loading && (
                        <p>Searching users...</p>
                    )}

                    {!loading && users.length > 0 && (
                        users.map((user) => {
                            const isOnline = onlineUsers.some(
                                (id) => String(id) === String(user._id || user.id)
                            );

                            return (
                                <div
                                    className="user-item"
                                    key={user._id || user.id}
                                    onClick={() => openConversation(user)}
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
                                    <div style={{ overflow: "hidden" }}>
                                        <h4>{user.name}</h4>
                                        <p>{user.bio || user.email}</p>
                                    </div>
                                    <span
                                        className={`online-status ${isOnline ? "online" : ""}`}
                                        style={{ marginLeft: "auto" }}
                                    />
                                </div>
                            );
                        })
                    )}

                    {!loading && users.length === 0 && !error && (
                        <p>No users found</p>
                    )}
                </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
                <p className="error" style={{ margin: "10px 15px" }}>
                    {error}
                </p>
            )}

            {/* LOADING MESSAGE */}
            {conversationLoading && (
                <p className="loading-text" style={{ padding: "0 15px", color: "#6b7280" }}>
                    Opening conversation...
                </p>
            )}

            {/* CONVERSATION HEADING */}
            <h3 className="section-title">
                Messages
            </h3>

            {/* CONVERSATION LIST */}
            <div className="conversation-list">
                {conversations.length === 0 && (
                    <p className="empty-conversations" style={{ padding: "15px", color: "#888" }}>
                        No conversations yet. Search someone above to start chatting!
                    </p>
                )}

                {conversations.map((conversation) => {
                    const otherUser = getOtherParticipant(conversation);
                    if (!otherUser) return null;

                    const convIdStr = String(conversation._id);
                    const unread = unreadCounts[convIdStr] || 0;

                    const isOnline = onlineUsers.some(
                        (id) => String(id) === String(otherUser._id || otherUser.id)
                    );

                    return (
                        <div
                            key={conversation._id}
                            className={`conversation-item ${
                                selectedConversation?._id === conversation._id
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() => handleSelectConversation(conversation)}
                        >
                            {otherUser.profilePicture ? (
                                <img
                                    src={otherUser.profilePicture}
                                    alt={otherUser.name}
                                    className="user-avatar-img"
                                />
                            ) : (
                                <FaUserCircle className="user-avatar" />
                            )}

                            <div className="conversation-info">
                                <h4>{otherUser.name}</h4>
                                <p>
                                    {conversation.lastMessage?.image
                                        ? "📷 Photo"
                                        : conversation.lastMessage?.text || "Start a conversation"}
                                </p>
                            </div>

                            <div className="conversation-meta-box">
                                <span
                                    className={`online-status ${isOnline ? "online" : ""}`}
                                />
                                {unread > 0 && (
                                    <span className="unread-badge">
                                        {unread > 99 ? "99+" : unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* LOGGED IN USER FOOTER */}
            <div className="sidebar-user-footer" onClick={() => setIsProfileOpen(true)}>
                {currentUser?.profilePicture ? (
                    <img
                        src={currentUser.profilePicture}
                        alt={currentUser.name}
                        className="user-footer-avatar"
                    />
                ) : (
                    <FaUserCircle className="user-footer-avatar-default" />
                )}
                <div className="user-footer-info">
                    <h4>{currentUser?.name || "My Account"}</h4>
                    <p>{currentUser?.bio || currentUser?.email}</p>
                </div>
                <FaCog className="user-footer-gear" />
            </div>

            {/* USER PROFILE MODAL */}
            <UserProfile
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />

        </div>
    );
}

export default Sidebar;
