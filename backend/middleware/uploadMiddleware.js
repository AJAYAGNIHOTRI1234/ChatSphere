import multer from "multer";

// Use memory storage so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

// File filter: accept only common image formats
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file format. Only JPEG, PNG, WEBP, and GIF are allowed."), false);
    }
};

// 5MB max file size
export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter
});

export default upload;

