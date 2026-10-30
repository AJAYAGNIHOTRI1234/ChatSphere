import { createContext, useState, useEffect } from "react";
import API from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem("token") || null;
    });

    const [loading, setLoading] = useState(true);

    // Verify token & sync latest user profile on initial app load
    useEffect(() => {
        const verifyUser = async () => {
            const storedToken = localStorage.getItem("token");

            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                const response = await API.get("/auth/profile");
                if (response.data?.success && response.data?.user) {
                    setUser(response.data.user);
                    localStorage.setItem("user", JSON.stringify(response.data.user));
                }
            } catch (error) {
                console.error("Token verification failed:", error?.response?.data?.message || error.message);
                // Invalid or expired token -> clear session
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        verifyUser();
    }, []);

    // Login function: store credentials and update state
    const login = (userData, tokenData) => {
        localStorage.setItem("token", tokenData);
        localStorage.setItem("user", JSON.stringify(userData));
        setToken(tokenData);
        setUser(userData);
    };

    // Logout function: clear credentials and reset state
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    // Update user helper (for profile edits, avatar updates)
    const updateUser = (updatedUser) => {
        const merged = { ...user, ...updatedUser };
        localStorage.setItem("user", JSON.stringify(merged));
        setUser(merged);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                isAuthenticated: !!token && !!user,
                login,
                logout,
                updateUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

