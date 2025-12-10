import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reviewService } from '../services/reviewService';
import { ValidationError } from '../utils/errors';
import { Sentiment } from '@prisma/client';

const listReviewsSchema = z.object({
  businessProfileId: z.string().uuid().optional(),
  rating: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
  minRating: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
  maxRating: z.string().optional().transform((v) => v ? parseInt(v, 10) : undefined),
  sentiment: z.nativeEnum(Sentiment).optional(),
  needsResponse: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  isFlagged: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  startDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  endDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  page: z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
});

const createResponseSchema = z.object({
  content: z.string().min(1).max(5000),
  publish: z.boolean().optional(),
});

const flagReviewSchema = z.object({
  reason: z.string().min(1).max(500),
});

export class ReviewController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const query = listReviewsSchema.parse(req.query);

      const result = await reviewService.list({
        clientId,
        ...query,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const review = await reviewService.getById(reviewId, clientId);

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  async generateAiSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const suggestions = await reviewService.generateAiSuggestions(reviewId, clientId);

      res.json({
        success: true,
        data: { suggestions },
      });
    } catch (error) {
      next(error);
    }
  }

  async createResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const { content, publish } = createResponseSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const response = await reviewService.createResponse(
        reviewId,
        clientId,
        req.user!.userId,
        content,
        publish
      );

      res.status(201).json({
        success: true,
        data: { response },
      });
    } catch (error) {
      next(error);
    }
  }

  async publishResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { responseId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await reviewService.publishResponse(responseId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async flagReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const { reason } = flagReviewSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await reviewService.flagReview(reviewId, clientId, reason);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async unflagReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await reviewService.unflagReview(reviewId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;
      const { businessProfileId, days } = req.query;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const stats = await reviewService.getStats(
        clientId,
        businessProfileId as string | undefined,
        days ? parseInt(days as string, 10) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async syncReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessProfileId } = req.params;

      const result = await reviewService.syncReviews(businessProfileId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
