import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Using Maileroo SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: 'smtp.maileroo.com',
      port: 587,
      secure: false,
      auth: {
        user: config.EMAIL_FROM_ADDRESS,
        pass: config.MAILEROO_SENDING_KEY,
      },
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: options.from || `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM_ADDRESS}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent to ${options.to}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error(`Failed to send email to ${options.to}:`, error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendReviewRequest(
    to: string,
    customerName: string,
    businessName: string,
    reviewLink: string,
    customMessage?: string
  ): Promise<EmailResult> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We'd Love Your Feedback</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Thank You for Choosing Us!</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Hi ${customerName},</p>

          ${customMessage ? `<p>${customMessage}</p>` : `<p>We hope you had a great experience with ${businessName}. Your feedback means the world to us and helps other customers find us.</p>`}

          <p>Would you mind taking a moment to share your experience?</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Leave a Review
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">It only takes a minute, and we truly appreciate it!</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

          <p style="font-size: 12px; color: #999; text-align: center;">
            This email was sent by ${businessName}.<br>
            If you wish to stop receiving these emails, click <a href="#unsubscribe" style="color: #667eea;">here</a>.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${customerName},

We hope you had a great experience with ${businessName}. Your feedback means the world to us!

Would you mind taking a moment to share your experience? Just click the link below:

${reviewLink}

It only takes a minute, and we truly appreciate it!

Best regards,
${businessName}
    `;

    return this.send({
      to,
      subject: `${customerName}, how was your experience with ${businessName}?`,
      html,
      text,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
