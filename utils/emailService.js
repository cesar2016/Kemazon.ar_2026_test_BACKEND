const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
    try {
        console.log(`[Email Debug] Attempting to send email via Resend...`);
        console.log(`[Email Debug] To: ${to}`);

        // Note: 'onboarding@resend.dev' only allows sending to the account owner's email address
        // until you verify a custom domain in the Resend dashboard.
        const { data, error } = await resend.emails.send({
            from: 'Kemazon <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('[Email Debug] Resend API Error:', error);
            return false;
        }

        console.log('[Email Debug] Email sent successfully:', data);
        return true;
    } catch (err) {
        console.error('[Email Debug] Unexpected error:', err);
        return false;
    }
};

module.exports = sendEmail;
