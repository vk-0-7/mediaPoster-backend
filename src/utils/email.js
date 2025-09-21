
const Resend = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);


export const sendEmail = (sub, body) => {
    resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'vivekr4400@gmail.com',
        subject: sub,
        html: body
    });
}

