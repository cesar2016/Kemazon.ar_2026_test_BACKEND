
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[Email Debug] Attempting to connect to Gmail...`);
        console.log(`[Email Debug] User: ${process.env.EMAIL_USER}`);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports (587 uses STARTTLS)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Add connection timeout setting
            connectionTimeout: 30000, // 30 seconds
            family: 4,    // Force IPv4
            logger: true, // Log to console
            debug: true   // Include debug info
        });

        // Verify connection configuration
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error('[Email Debug] Connection Verification Failed:', error);
                    reject(error);
                } else {
                    console.log('[Email Debug] Server is ready to take our messages');
                    resolve(success);
                }
            });
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Debug] Email sent successfully: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[Email Debug] FATAL ERROR sending email:`, error);

        // Detailed error logging
        if (error.code === 'ETIMEDOUT') {
            console.error('[Email Debug] Connection timed out. Check firewall or port block.');
        }

        // If credentials are not set, log the email content for dev/testing
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('--- MOCK EMAIL (Fallback) ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`HTML: ${html}`);
            console.log('--- END MOCK ---');
            return true; // Pretend it worked
        }

        return false;
    }
};

module.exports = sendEmail;
