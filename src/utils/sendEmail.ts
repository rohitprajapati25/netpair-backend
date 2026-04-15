import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("⚠️ SMTP not configured. Printing email to console instead:");
    console.log("---------------------------------------");
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    console.log("---------------------------------------");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME || 'IMS'} <${process.env.SMTP_FROM_EMAIL || 'noreply@ims.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("❌ Email failed to send, printing link to console fallback:");
    console.log("---------------------------------------");
    console.log(`RESET LINK: ${options.message.split('\n').pop()?.trim()}`);
    console.log("---------------------------------------");
    // In dev mode, we don't throw error to allow testing the flow
    if (process.env.NODE_ENV === 'production') throw error;
  }
};

export default sendEmail;
