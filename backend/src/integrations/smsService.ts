import { config } from '../config';
import { logger } from '../utils/logger';

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private apiKey: string;
  private phoneNumber: string;
  private messagingProfileId: string;
  private baseUrl = 'https://api.telnyx.com/v2';

  constructor() {
    this.apiKey = config.TELNYX_API_KEY || '';
    this.phoneNumber = config.TELNYX_PHONE_NUMBER || '';
    this.messagingProfileId = config.TELNYX_MESSAGING_PROFILE_ID || '';
  }

  async send(options: SMSOptions): Promise<SMSResult> {
    if (!this.apiKey) {
      logger.warn('SMS service not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: options.from || this.phoneNumber,
          to: options.to,
          text: options.message,
          messaging_profile_id: this.messagingProfileId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('SMS send failed:', data);
        return {
          success: false,
          error: data.errors?.[0]?.detail || 'SMS send failed',
        };
      }

      logger.info(`SMS sent to ${options.to}: ${data.data?.id}`);

      return {
        success: true,
        messageId: data.data?.id,
      };
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${options.to}:`, error);
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
    reviewLink: string
  ): Promise<SMSResult> {
    const message = `Hi ${customerName}! Thanks for visiting ${businessName}. We'd love to hear about your experience! Leave us a review: ${reviewLink}`;

    return this.send({
      to,
      message,
    });
  }

  async sendWithTemplate(
    to: string,
    template: string,
    tokens: Record<string, string>
  ): Promise<SMSResult> {
    let message = template;

    for (const [key, value] of Object.entries(tokens)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return this.send({
      to,
      message,
    });
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.phoneNumber);
  }
}

export const smsService = new SMSService();
