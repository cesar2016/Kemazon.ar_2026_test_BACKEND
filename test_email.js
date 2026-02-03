
require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- Testing Email Configuration ---');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Service:', process.env.EMAIL_SERVICE);
    // Do NOT log the password

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self
        subject: 'Test Email from Kemazon Debugger',
        html: '<h1>It Works!</h1><p>If you see this, the SMTP configuration is correct.</p>'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Response:', info.response);
    } catch (error) {
        console.error('❌ Error sending email:');
        console.error(error);
    }
};

testEmail();
