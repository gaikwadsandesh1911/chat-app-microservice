import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

interface OtpMailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendOtpToMail = async ({ to, subject, html }: OtpMailPayload): Promise<boolean> => {
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
    const mailResponse = await transporter.sendMail({
      from: 'chat-app <no-reply@chatapp.com>',
      to,
      subject,
      html
    });
    console.log(`✔ OTP sent to ${to}`, mailResponse);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${to}:`, error);
    // You can also rethrow or handle retry here if needed
    return false;
  }
};
