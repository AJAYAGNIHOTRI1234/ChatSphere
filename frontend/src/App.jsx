import { useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

function ChatDashboard() {
    const [selectedConversation, setSelectedConversation] = useState(null);

    return (
        <div className={`chat-dashboard ${selectedConversation ? "chat-open" : "sidebar-open"}`}>
            <Sidebar
                onSelectConversation={setSelectedConversation}
                selectedConversation={selectedConversation}
            />

            <Chat
                conversation={selectedConversation}
                onConversationUpdated={setSelectedConversation}
                onLeaveGroup={() => setSelectedConversation(null)}
                onBack={() => setSelectedConversation(null)}
            />
        </div>
    );
}

function App() {
    const { isAuthenticated } = useAuth();

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
                    }
                />

                <Route
                    path="/login"
                    element={
                        isAuthenticated ? <Navigate to="/chat" replace /> : <Login />
                    }
                />

                <Route
                    path="/signup"
                    element={
                        isAuthenticated ? <Navigate to="/chat" replace /> : <Signup />
                    }
                />

                <Route
                    path="/chat"
                    element={
                        <ProtectedRoute>
                            <ChatDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
