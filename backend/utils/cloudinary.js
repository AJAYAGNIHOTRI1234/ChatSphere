import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

/**
 * Uploads a file buffer to Cloudinary or falls back to an encoded DataURI
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} mimetype - File mime type (e.g. image/jpeg)
 * @param {string} folder - Destination folder name in Cloudinary
 * @returns {Promise<string>} Uploaded secure URL
 */
export const uploadToCloudinary = (buffer, mimetype = "image/jpeg", folder = "chatsphere") => {
    return new Promise((resolve, reject) => {
        // If Cloudinary is configured, upload via upload_stream
        if (isCloudinaryConfigured) {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: "image",
                },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result.secure_url);
                }
            );

            uploadStream.end(buffer);
        } else {
            // Graceful fallback for local development: encode as optimized DataURI
            const base64Data = buffer.toString("base64");
            const dataUri = `data:${mimetype};base64,${base64Data}`;
            resolve(dataUri);
        }
    });
};

export default cloudinary;

