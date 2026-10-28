export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Handle Express Body-Parser Payload Too Large Error
    if (err.type === "entity.too.large" || err.status === 413) {
        statusCode = 413;
        message = "File or payload size is too large (max 50MB allowed).";
    }

    // Handle Multer file upload errors
    if (err.name === "MulterError") {
        statusCode = 400;
        if (err.code === "LIMIT_FILE_SIZE") {
            message = "Image size exceeds the 5MB limit.";
        }
    }

    console.error(`❌ [${req.method} ${req.originalUrl}] Error:`, message);

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

