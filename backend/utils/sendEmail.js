import nodemailer from "nodemailer";

// =============================================
// sendEmail — Helper function to send emails
// =============================================
// Yeh function ek reusable email sender hai.
// Hum ise forgotPassword me call karenge.
// =============================================

const sendEmail = async ({ to, subject, html }) => {
    // Create transporter (email sending engine)
    // Gmail use karo with App Password
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,  // Your Gmail address
            pass: process.env.EMAIL_PASS,  // 16-char Gmail App Password (NOT regular password)
        },
    });

    // Send the email
    await transporter.sendMail({
        from: `"ChatSphere" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};

export default sendEmail;

