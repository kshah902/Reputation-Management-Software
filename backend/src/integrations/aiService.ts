import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Sentiment, ResponseTone } from '@prisma/client';

interface SentimentAnalysis {
  sentiment: Sentiment;
  score: number;
  keywords: string[];
}

interface ReviewResponseSuggestion {
  tone: ResponseTone;
  content: string;
  confidence: number;
}

export class AIService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: config.ANTHROPIC_API_KEY,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async analyzeSentiment(reviewText: string): Promise<SentimentAnalysis> {
    if (!this.client) {
      return {
        sentiment: Sentiment.NEUTRAL,
        score: 0.5,
        keywords: [],
      };
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Analyze the sentiment of this customer review. Return a JSON object with:
- sentiment: "POSITIVE", "NEUTRAL", or "NEGATIVE"
- score: a number from 0 to 1 (0 = very negative, 1 = very positive)
- keywords: an array of up to 5 key topics/themes mentioned in the review

Review: "${reviewText}"

Return only the JSON object, no other text.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const result = JSON.parse(content.text);

      return {
        sentiment: result.sentiment as Sentiment,
        score: result.score,
        keywords: result.keywords || [],
      };
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return {
        sentiment: Sentiment.NEUTRAL,
        score: 0.5,
        keywords: [],
      };
    }
  }

  async generateResponseSuggestions(
    reviewText: string,
    rating: number,
    reviewerName: string,
    businessName: string
  ): Promise<ReviewResponseSuggestion[]> {
    if (!this.client) {
      return this.getDefaultResponses(rating, reviewerName, businessName);
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate 3 professional response suggestions for this customer review. The business name is "${businessName}".

Review by ${reviewerName} (${rating} stars):
"${reviewText}"

Generate responses in these tones:
1. PROFESSIONAL - Formal and business-like
2. FRIENDLY - Warm and personable
3. ${rating <= 2 ? 'APOLOGETIC - Sincere apology acknowledging the issue' : 'GRATEFUL - Expressing sincere appreciation'}

For each response:
- Address the reviewer by name if appropriate
- Keep it concise (2-4 sentences)
- Be specific to the review content when possible
- ${rating <= 2 ? 'Acknowledge concerns and offer to make things right' : 'Thank them for positive feedback'}
- End with an invitation to return or contact for further discussion

Return a JSON array with objects containing:
- tone: "PROFESSIONAL", "FRIENDLY", or "${rating <= 2 ? 'APOLOGETIC' : 'GRATEFUL'}"
- content: the response text
- confidence: a number from 0.7 to 1 indicating how well the response fits

Return only the JSON array, no other text.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const suggestions = JSON.parse(content.text);

      return suggestions.map((s: any) => ({
        tone: s.tone as ResponseTone,
        content: s.content,
        confidence: s.confidence,
      }));
    } catch (error) {
      logger.error('Response generation failed:', error);
      return this.getDefaultResponses(rating, reviewerName, businessName);
    }
  }

  async generateCustomResponse(
    reviewText: string,
    rating: number,
    reviewerName: string,
    businessName: string,
    tone: ResponseTone,
    additionalContext?: string
  ): Promise<string> {
    if (!this.client) {
      return this.getDefaultResponse(rating, reviewerName, businessName, tone);
    }

    try {
      const toneInstructions: Record<ResponseTone, string> = {
        PROFESSIONAL: 'formal, business-like, and courteous',
        FRIENDLY: 'warm, personable, and conversational',
        APOLOGETIC: 'sincere, understanding, and focused on making things right',
        GRATEFUL: 'appreciative, thankful, and enthusiastic',
      };

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Write a ${toneInstructions[tone]} response to this customer review for "${businessName}".

Review by ${reviewerName} (${rating} stars):
"${reviewText}"

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Requirements:
- Address the reviewer appropriately
- Keep it concise (2-4 sentences)
- Be specific to the review content
- ${rating <= 2 ? 'Acknowledge concerns and offer resolution' : 'Express gratitude for feedback'}

Return only the response text, no other formatting.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return content.text.trim();
    } catch (error) {
      logger.error('Custom response generation failed:', error);
      return this.getDefaultResponse(rating, reviewerName, businessName, tone);
    }
  }

  async analyzeReputationTrends(
    reviews: Array<{ rating: number; comment: string; publishedAt: Date }>
  ): Promise<{
    overallSentiment: Sentiment;
    commonThemes: string[];
    improvementAreas: string[];
    strengths: string[];
  }> {
    if (!this.client || reviews.length === 0) {
      return {
        overallSentiment: Sentiment.NEUTRAL,
        commonThemes: [],
        improvementAreas: [],
        strengths: [],
      };
    }

    try {
      const reviewsSummary = reviews
        .slice(0, 50) // Limit to recent 50 reviews
        .map((r) => `Rating: ${r.rating}/5 - "${r.comment || 'No comment'}"`)
        .join('\n');

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze these customer reviews and provide insights:

${reviewsSummary}

Return a JSON object with:
- overallSentiment: "POSITIVE", "NEUTRAL", or "NEGATIVE"
- commonThemes: array of 3-5 recurring topics mentioned
- improvementAreas: array of 2-4 areas where the business could improve based on negative feedback
- strengths: array of 2-4 things customers consistently praise

Return only the JSON object.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const result = JSON.parse(content.text);

      return {
        overallSentiment: result.overallSentiment as Sentiment,
        commonThemes: result.commonThemes || [],
        improvementAreas: result.improvementAreas || [],
        strengths: result.strengths || [],
      };
    } catch (error) {
      logger.error('Reputation analysis failed:', error);
      return {
        overallSentiment: Sentiment.NEUTRAL,
        commonThemes: [],
        improvementAreas: [],
        strengths: [],
      };
    }
  }

  private getDefaultResponses(
    rating: number,
    reviewerName: string,
    businessName: string
  ): ReviewResponseSuggestion[] {
    if (rating >= 4) {
      return [
        {
          tone: ResponseTone.PROFESSIONAL,
          content: `Thank you for your review, ${reviewerName}. We appreciate your feedback and are glad to hear about your positive experience with ${businessName}. We look forward to serving you again.`,
          confidence: 0.7,
        },
        {
          tone: ResponseTone.FRIENDLY,
          content: `Thanks so much for the kind words, ${reviewerName}! We're thrilled you had a great experience with us. Can't wait to see you again soon!`,
          confidence: 0.7,
        },
        {
          tone: ResponseTone.GRATEFUL,
          content: `${reviewerName}, we truly appreciate you taking the time to share your experience! Your feedback means the world to us at ${businessName}. Thank you for your support!`,
          confidence: 0.7,
        },
      ];
    }

    return [
      {
        tone: ResponseTone.PROFESSIONAL,
        content: `Thank you for your feedback, ${reviewerName}. We sincerely apologize that your experience did not meet expectations. Please contact us directly so we can address your concerns and make things right.`,
        confidence: 0.7,
      },
      {
        tone: ResponseTone.FRIENDLY,
        content: `${reviewerName}, we're sorry to hear this wasn't the experience you hoped for. We'd love the chance to make it up to you - please reach out to us directly!`,
        confidence: 0.7,
      },
      {
        tone: ResponseTone.APOLOGETIC,
        content: `${reviewerName}, we sincerely apologize for falling short of your expectations. Your feedback is important to us, and we're committed to improving. Please contact us so we can make this right.`,
        confidence: 0.7,
      },
    ];
  }

  private getDefaultResponse(
    rating: number,
    reviewerName: string,
    businessName: string,
    tone: ResponseTone
  ): string {
    const responses = this.getDefaultResponses(rating, reviewerName, businessName);
    const match = responses.find((r) => r.tone === tone);
    return match?.content || responses[0].content;
  }
}

export const aiService = new AIService();
