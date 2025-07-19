import nodemailer from 'nodemailer';

import dotenv from 'dotenv';
dotenv.config();

interface OtpMailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendOtpMail = async ({ to, subject, html }: OtpMailPayload): Promise<void> => {

  try {

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // required for port 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: 'chat-app <no-reply@chatapp.com>',
      to,
      subject,
      html
    });

    console.log(`📧 OTP mail sent to ${to} (Message ID: ${info.messageId})`);

  } catch (error) {
    console.error(`❌ Failed to send OTP mail to ${to}:`, error);
    // You can also rethrow or handle retry here if needed
    throw error;
  }
};
