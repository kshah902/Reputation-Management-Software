import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { aiService } from '../integrations/aiService';
import { googleBusinessProfileService } from '../integrations/googleBusinessProfile';
import { logger } from '../utils/logger';
import { Sentiment, ResponseTone } from '@prisma/client';

interface ReviewFilter {
  clientId: string;
  businessProfileId?: string;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  sentiment?: Sentiment;
  needsResponse?: boolean;
  isFlagged?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class ReviewService {
  async list(filter: ReviewFilter) {
    const {
      clientId,
      businessProfileId,
      rating,
      minRating,
      maxRating,
      sentiment,
      needsResponse,
      isFlagged,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filter;

    const where: any = { clientId };

    if (businessProfileId) where.businessProfileId = businessProfileId;
    if (rating !== undefined) where.rating = rating;
    if (minRating !== undefined) where.rating = { ...where.rating, gte: minRating };
    if (maxRating !== undefined) where.rating = { ...where.rating, lte: maxRating };
    if (sentiment) where.sentiment = sentiment;
    if (needsResponse !== undefined) where.needsResponse = needsResponse;
    if (isFlagged !== undefined) where.isFlagged = isFlagged;
    if (startDate) where.publishedAt = { ...where.publishedAt, gte: startDate };
    if (endDate) where.publishedAt = { ...where.publishedAt, lte: endDate };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          businessProfile: {
            select: { id: true, name: true },
          },
          responses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          aiSuggestions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, clientId: string) {
    const review = await prisma.review.findFirst({
      where: { id, clientId },
      include: {
        businessProfile: true,
        responses: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        aiSuggestions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    return review;
  }

  async generateAiSuggestions(reviewId: string, clientId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, clientId },
      include: { businessProfile: true },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Delete existing suggestions
    await prisma.reviewAiSuggestion.deleteMany({
      where: { reviewId },
    });

    // Generate new suggestions
    const suggestions = await aiService.generateResponseSuggestions(
      review.comment || '',
      review.rating,
      review.reviewerName || 'Valued Customer',
      review.businessProfile.name
    );

    // Save suggestions
    const created = await prisma.reviewAiSuggestion.createMany({
      data: suggestions.map((s) => ({
        reviewId,
        tone: s.tone,
        content: s.content,
        confidence: s.confidence,
      })),
    });

    // Also analyze sentiment if not done
    if (!review.sentiment) {
      const sentimentAnalysis = await aiService.analyzeSentiment(review.comment || '');
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          sentiment: sentimentAnalysis.sentiment,
          sentimentScore: sentimentAnalysis.score,
          keywords: sentimentAnalysis.keywords,
        },
      });
    }

    return prisma.reviewAiSuggestion.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createResponse(
    reviewId: string,
    clientId: string,
    userId: string,
    content: string,
    publish: boolean = false
  ) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, clientId },
      include: { businessProfile: true },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    const response = await prisma.reviewResponse.create({
      data: {
        reviewId,
        userId,
        content,
        isPublished: publish,
        publishedAt: publish ? new Date() : undefined,
        source: 'MANUAL',
      },
    });

    // If publishing, try to post to Google
    if (publish && review.businessProfile.googleAccessToken) {
      try {
        const success = await googleBusinessProfileService.replyToReview(
          review.businessProfile.googleAccessToken,
          review.businessProfile.googleRefreshToken!,
          review.externalId,
          content
        );

        if (success) {
          await prisma.review.update({
            where: { id: reviewId },
            data: { needsResponse: false, isResponded: true },
          });
        }
      } catch (error) {
        logger.error('Failed to publish response to Google:', error);
      }
    }

    return response;
  }

  async publishResponse(responseId: string, clientId: string) {
    const response = await prisma.reviewResponse.findFirst({
      where: { id: responseId },
      include: {
        review: {
          include: { businessProfile: true },
        },
      },
    });

    if (!response || response.review.clientId !== clientId) {
      throw new NotFoundError('Response');
    }

    const review = response.review;
    const profile = review.businessProfile;

    if (profile.googleAccessToken) {
      const success = await googleBusinessProfileService.replyToReview(
        profile.googleAccessToken,
        profile.googleRefreshToken!,
        review.externalId,
        response.content
      );

      if (success) {
        await prisma.reviewResponse.update({
          where: { id: responseId },
          data: { isPublished: true, publishedAt: new Date() },
        });

        await prisma.review.update({
          where: { id: review.id },
          data: { needsResponse: false, isResponded: true },
        });

        return { success: true };
      }
    }

    throw new Error('Failed to publish response');
  }

  async flagReview(reviewId: string, clientId: string, reason: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, clientId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { isFlagged: true, flagReason: reason },
    });

    return { success: true };
  }

  async unflagReview(reviewId: string, clientId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, clientId },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { isFlagged: false, flagReason: null },
    });

    return { success: true };
  }

  async getStats(clientId: string, businessProfileId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      clientId,
      publishedAt: { gte: startDate },
    };

    if (businessProfileId) {
      where.businessProfileId = businessProfileId;
    }

    const [
      totalReviews,
      ratingDistribution,
      sentimentDistribution,
      avgRating,
      needsResponseCount,
    ] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: true,
      }),
      prisma.review.groupBy({
        by: ['sentiment'],
        where: { ...where, sentiment: { not: null } },
        _count: true,
      }),
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      prisma.review.count({ where: { ...where, needsResponse: true } }),
    ]);

    // Get reviews over time
    const reviewsOverTime = await prisma.$queryRaw`
      SELECT DATE(published_at) as date, COUNT(*) as count, AVG(rating) as avg_rating
      FROM "Review"
      WHERE client_id = ${clientId}
        AND published_at >= ${startDate}
        ${businessProfileId ? prisma.$queryRaw`AND business_profile_id = ${businessProfileId}` : prisma.$queryRaw``}
      GROUP BY DATE(published_at)
      ORDER BY date ASC
    `;

    return {
      totalReviews,
      averageRating: avgRating._avg.rating || 0,
      needsResponseCount,
      ratingDistribution: this.formatRatingDistribution(ratingDistribution),
      sentimentDistribution: this.formatSentimentDistribution(sentimentDistribution),
      reviewsOverTime,
    };
  }

  async syncReviews(businessProfileId: string) {
    await googleBusinessProfileService.syncBusinessProfile(businessProfileId);
    return { success: true };
  }

  private formatRatingDistribution(data: Array<{ rating: number; _count: number }>) {
    const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of data) {
      result[item.rating] = item._count;
    }
    return result;
  }

  private formatSentimentDistribution(data: Array<{ sentiment: Sentiment | null; _count: number }>) {
    const result: Record<string, number> = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    for (const item of data) {
      if (item.sentiment) {
        result[item.sentiment] = item._count;
      }
    }
    return result;
  }
}

export const reviewService = new ReviewService();
