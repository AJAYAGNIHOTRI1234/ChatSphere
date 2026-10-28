import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Database
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

// Middleware
import { socketAuth } from "./middleware/socketAuth.js";
import initSocketHandler from "./sockets/socketHandler.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Load environment variables
dotenv.config();

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

// Increase JSON & URL-encoded body limit to support base64/media payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ========================================
// API ROUTES
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// ========================================
// CREATE HTTP SERVER
// ========================================

const httpServer = createServer(app);

// ========================================
// SOCKET.IO CONFIGURATION
// ========================================

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Make Socket.IO available in Express controllers
app.set("io", io);

// Socket JWT Authentication
io.use(socketAuth);

// Initialize Socket.IO Handler
initSocketHandler(io);

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        httpServer.listen(PORT, () => {
            console.log(`ChatSphere server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server Startup Error:", error);
        process.exit(1);
    }
};

startServer();
