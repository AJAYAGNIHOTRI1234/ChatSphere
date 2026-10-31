import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import {
    FaPaperPlane,
    FaUserCircle,
    FaCheck,
    FaCheckDouble,
    FaImage,
    FaTimes
} from "react-icons/fa";
import { useSocket } from "../hooks/useSocket";

function Chat({ conversation }) {
    const { socket, onlineUsers } = useSocket();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl }
    const [viewingImage, setViewingImage] = useState(null); // Fullscreen preview modal
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [typingUser, setTypingUser] = useState(null);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    const currentUser = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    const currentUserId = String(
        currentUser._id || currentUser.id || ""
    );

    // ====================================
    // IDENTIFY OTHER PARTICIPANT
    // ====================================
    const otherUser = conversation?.participants?.find((participant) => {
        const participantId = String(
            participant?._id || participant?.id || participant
        );
        return participantId !== currentUserId;
    });

    const otherUserId = String(otherUser?._id || otherUser?.id || "");

    const isOtherUserOnline = onlineUsers.some(
        (id) => String(id) === otherUserId
    );

    // ====================================
    // AUTO-SCROLL TO BOTTOM
    // ====================================
    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUser, selectedImage]);

    // ====================================
    // FETCH PREVIOUS MESSAGES & MARK READ
    // ====================================
    useEffect(() => {
        if (!conversation?._id) {
            setMessages([]);
            return;
        }

        let cancelled = false;

        const fetchMessagesAndMarkRead = async () => {
            try {
                setLoading(true);
                const response = await API.get(`/messages/${conversation._id}`);

                if (!cancelled) {
                    setMessages(response.data.data || []);
                }

                await API.put(`/messages/read/${conversation._id}`);

                if (socket) {
                    socket.emit("mark_messages_read", {
                        conversationId: conversation._id
                    });
                }
            } catch (error) {
                console.error(
                    "Fetch Messages Error:",
                    error.response?.data || error.message
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchMessagesAndMarkRead();

        return () => {
            cancelled = true;
        };
    }, [conversation?._id, socket]);

    // ====================================
    // SOCKET EVENTS: ROOM, MESSAGES, RECEIPTS
    // ====================================
    useEffect(() => {
        if (!socket || !conversation?._id) return;

        const conversationId = String(conversation._id);

        socket.emit("join_conversation", conversationId);

        const handleNewMessage = (message) => {
            const messageConversationId = String(
                message.conversation?._id || message.conversation
            );

            if (messageConversationId !== conversationId) return;

            setMessages((prev) => {
                const alreadyExists = prev.some((item) => item._id === message._id);
                if (alreadyExists) return prev;
                return [...prev, message];
            });

            const senderId = String(
                message.sender?._id || message.sender?.id || message.sender
            );
            if (senderId !== currentUserId) {
                socket.emit("mark_messages_read", { conversationId });
            }
        };

        const handleMessagesRead = ({ conversationId: readConvId, readerId }) => {
            if (String(readConvId) !== conversationId) return;

            setMessages((prev) =>
                prev.map((msg) => {
                    const readerIdStr = String(readerId);
                    const alreadyRead = (msg.readBy || []).some(
                        (id) => String(id?._id || id) === readerIdStr
                    );

                    if (!alreadyRead) {
                        return {
                            ...msg,
                            readBy: [...(msg.readBy || []), readerIdStr]
                        };
                    }
                    return msg;
                })
            );
        };

        const handleUserTyping = (data) => {
            if (String(data.conversationId) === conversationId && data.userId !== currentUserId) {
                setTypingUser(data.userName);
            }
        };

        const handleUserStopTyping = (data) => {
            if (String(data.conversationId) === conversationId) {
                setTypingUser(null);
            }
        };

        socket.on("new_message", handleNewMessage);
        socket.on("messages_read", handleMessagesRead);
        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);

        return () => {
            socket.emit("leave_conversation", conversationId);
            socket.off("new_message", handleNewMessage);
            socket.off("messages_read", handleMessagesRead);
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
            setTypingUser(null);
        };
    }, [socket, conversation?._id, currentUserId]);

    // ====================================
    // HANDLE IMAGE SELECTION
    // ====================================
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be smaller than 5MB");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setSelectedImage({ file, previewUrl });
    };

    const handleClearSelectedImage = () => {
        if (selectedImage?.previewUrl) {
            URL.revokeObjectURL(selectedImage.previewUrl);
        }
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // ====================================
    // HANDLE TYPING INPUT
    // ====================================
    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);

        if (!socket || !conversation?._id) return;

        socket.emit("typing", { conversationId: conversation._id });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", { conversationId: conversation._id });
        }, 2000);
    };

    // ====================================
    // SEND MESSAGE (TEXT & IMAGE)
    // ====================================
    const handleSendMessage = async (e) => {
        e.preventDefault();

        const messageText = newMessage.trim();

        if ((!messageText && !selectedImage) || !conversation?._id || sending) {
            return;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (socket) {
            socket.emit("stop_typing", { conversationId: conversation._id });
        }

        try {
            setSending(true);

            let uploadedImageUrl = "";

            // Upload image first if an attachment is chosen
            if (selectedImage?.file) {
                const formData = new FormData();
                formData.append("image", selectedImage.file);

                const uploadRes = await API.post("/messages/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                uploadedImageUrl = uploadRes.data?.imageUrl || "";
            }

            const response = await API.post("/messages/send", {
                conversationId: conversation._id,
                text: messageText,
                image: uploadedImageUrl,
                messageType: uploadedImageUrl ? "image" : "text"
            });

            const savedMessage = response.data.data;

            if (savedMessage) {
                setMessages((prev) => {
                    const alreadyExists = prev.some(
                        (item) => item._id === savedMessage._id
                    );
                    if (alreadyExists) return prev;
                    return [...prev, savedMessage];
                });
            }

            setNewMessage("");
            handleClearSelectedImage();

        } catch (error) {
            console.error(
                "Message Sending Error:",
                error.response?.data || error.message
            );
        } finally {
            setSending(false);
        }
    };

    // ====================================
    // EMPTY CHAT SCREEN
    // ====================================
    if (!conversation) {
        return (
            <div className="chat-empty">
                <h2>Welcome to ChatSphere!</h2>
                <p>Select a conversation to start messaging in real-time.</p>
            </div>
        );
    }

    // ====================================
    // CHAT INTERFACE
    // ====================================
    return (
        <div className="chat-window">

            {/* CHAT HEADER */}
            <div className="chat-header">
                {otherUser?.profilePicture ? (
                    <img
                        src={otherUser.profilePicture}
                        alt={otherUser.name}
                        className="header-avatar-img"
                    />
                ) : (
                    <FaUserCircle className="header-avatar" />
                )}

                <div>
                    <h3>{otherUser?.name || "Chat User"}</h3>
                    <p style={{ color: isOtherUserOnline ? "#16a34a" : "#6b7280" }}>
                        {typingUser
                            ? `${typingUser} is typing...`
                            : isOtherUserOnline
                            ? "Online"
                            : "Offline"}
                    </p>
                </div>
            </div>

            {/* MESSAGES */}
            <div className="messages-container">
                {loading && <p>Loading messages...</p>}

                {!loading && messages.length === 0 && (
                    <p className="no-messages">
                        No messages yet. Say hello!
                    </p>
                )}

                {messages.map((message) => {
                    const senderId = String(
                        message.sender?._id ||
                        message.sender?.id ||
                        message.sender
                    );

                    const isOwnMessage = senderId === currentUserId;

                    const isRead = (message.readBy || []).some(
                        (id) => String(id?._id || id) === otherUserId
                    );

                    const isDelivered = isRead || (message.deliveredTo || []).some(
                        (id) => String(id?._id || id) === otherUserId
                    ) || isOtherUserOnline;

                    return (
                        <div
                            key={message._id}
                            className={`message ${isOwnMessage ? "sent" : "received"}`}
                        >
                            <div className="message-bubble">
                                {/* Attached Image */}
                                {message.image && (
                                    <div className="message-image-wrapper">
                                        <img
                                            src={message.image}
                                            alt="Sent media"
                                            className="message-image-content"
                                            onClick={() => setViewingImage(message.image)}
                                        />
                                    </div>
                                )}

                                {/* Message Text */}
                                {message.text && <p>{message.text}</p>}

                                <div className="message-meta">
                                    <span>
                                        {new Date(message.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </span>

                                    {/* Status Checkmarks (Only on sent messages) */}
                                    {isOwnMessage && (
                                        isRead ? (
                                            <FaCheckDouble
                                                className="message-status-icon read"
                                                title="Read"
                                            />
                                        ) : isDelivered ? (
                                            <FaCheckDouble
                                                className="message-status-icon delivered"
                                                title="Delivered"
                                            />
                                        ) : (
                                            <FaCheck
                                                className="message-status-icon sent"
                                                title="Sent"
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Real-time typing bubble */}
                {typingUser && (
                    <div className="message received">
                        <div className="message-bubble" style={{ fontStyle: "italic", color: "#6b7280" }}>
                            <p>{typingUser} is typing...</p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* IMAGE PREVIEW BAR */}
            {selectedImage && (
                <div className="image-preview-bar">
                    <div className="preview-thumbnail-box">
                        <img src={selectedImage.previewUrl} alt="Upload preview" />
                        <button
                            type="button"
                            className="preview-close-btn"
                            onClick={handleClearSelectedImage}
                        >
                            <FaTimes />
                        </button>
                    </div>
                    <span>Ready to send image</span>
                </div>
            )}

            {/* MESSAGE INPUT */}
            <form className="message-input" onSubmit={handleSendMessage}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    style={{ display: "none" }}
                />

                <button
                    type="button"
                    className="attachment-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach photo"
                >
                    <FaImage />
                </button>

                <input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={handleInputChange}
                />

                <button
                    type="submit"
                    disabled={(!newMessage.trim() && !selectedImage) || sending}
                >
                    <FaPaperPlane />
                </button>
            </form>

            {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
            {viewingImage && (
                <div className="lightbox-overlay" onClick={() => setViewingImage(null)}>
                    <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close-btn" onClick={() => setViewingImage(null)}>
                            <FaTimes />
                        </button>
                        <img src={viewingImage} alt="Expanded media" />
                    </div>
                </div>
            )}

        </div>
    );
}

export default Chat;
