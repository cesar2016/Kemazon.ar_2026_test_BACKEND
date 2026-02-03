
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail', // 'gmail' or others
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.response}`);
        return true;
    } catch (error) {
        console.error(`Error sending email: ${error}`);

        // If credentials are not set, log the email content for dev/testing
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('--- MOCK EMAIL ---');
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
