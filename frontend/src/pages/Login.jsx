import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { FaTimes, FaKey } from "react-icons/fa";

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Forgot Password Modal State
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotStep, setForgotStep] = useState(1); // 1: request token, 2: set new password
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await API.post("/auth/login", formData);

            const { token, user } = response.data;

            // Automatically connects socket via SocketProvider
            login(user, token);

            // Navigate to dashboard
            navigate("/chat");

        } catch (err) {
            setError(
                err.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    // Request Reset Token — ab email me token jayega
    const handleRequestToken = async (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");
        setForgotLoading(true);

        try {
            const res = await API.post("/auth/forgot-password", { email: forgotEmail });
            setForgotSuccess(res.data?.message || "Check your email for the reset token!");
            setForgotStep(2); // Token user email se copy karega manually
        } catch (err) {
            setForgotError(err.response?.data?.message || "Failed to send reset email");
        } finally {
            setForgotLoading(false);
        }
    };

    // Submit New Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");
        setForgotLoading(true);

        try {
            const res = await API.post("/auth/reset-password", {
                resetToken,
                newPassword
            });
            setForgotSuccess(res.data?.message || "Password reset successfully! You can now log in.");
            setTimeout(() => {
                setIsForgotModalOpen(false);
                setForgotStep(1);
                setForgotEmail("");
                setResetToken("");
                setNewPassword("");
                setForgotSuccess("");
            }, 2500);
        } catch (err) {
            setForgotError(err.response?.data?.message || "Failed to reset password");
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleSubmit}>

                <h1>Welcome Back!</h1>
                <p>Login to ChatSphere</p>

                {error && (
                    <p className="error">{error}</p>
                )}

                <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <div style={{ textAlign: "right", marginTop: "4px" }}>
                    <button
                        type="button"
                        style={{
                            background: "none",
                            border: "none",
                            color: "#4f46e5",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0
                        }}
                        onClick={() => {
                            setIsForgotModalOpen(true);
                            setForgotError("");
                            setForgotSuccess("");
                        }}
                    >
                        Forgot password?
                    </button>
                </div>

                <button type="submit" disabled={loading} style={{ marginTop: "12px" }}>
                    {loading ? "Logging in..." : "Login"}
                </button>

                <p>
                    Don't have an account?{" "}
                    <Link to="/signup">Sign Up</Link>
                </p>

            </form>

            {/* FORGOT PASSWORD MODAL */}
            {isForgotModalOpen && (
                <div className="modal-overlay" onClick={() => setIsForgotModalOpen(false)}>
                    <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="modal-close-btn"
                            onClick={() => setIsForgotModalOpen(false)}
                        >
                            <FaTimes />
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: "#e0e7ff",
                                color: "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px"
                            }}>
                                <FaKey />
                            </div>
                            <div>
                                <h3 style={{ fontSize: "18px", color: "#1f2937" }}>Reset Password</h3>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                                    {forgotStep === 1
                                        ? "Enter your registered email to receive a reset token."
                                        : "Check your email for the token, then set a new password."}
                                </p>
                            </div>
                        </div>

                        {forgotError && <p className="error-banner" style={{ margin: "10px 0" }}>{forgotError}</p>}
                        {forgotSuccess && <p className="success-banner" style={{ margin: "10px 0" }}>{forgotSuccess}</p>}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleRequestToken} className="profile-form">
                                <div className="form-group">
                                    <label>Registered Email</label>
                                    <input
                                        type="email"
                                        placeholder="your.email@example.com"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="save-btn" disabled={forgotLoading}>
                                    {forgotLoading ? "Sending Email..." : "Send Reset Email"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="profile-form">
                                <div className="form-group">
                                    <label>Reset Token (from your email)</label>
                                    <input
                                        type="text"
                                        placeholder="Paste the token from your email"
                                        value={resetToken}
                                        onChange={(e) => setResetToken(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="save-btn" disabled={forgotLoading}>
                                    {forgotLoading ? "Updating..." : "Reset Password"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
