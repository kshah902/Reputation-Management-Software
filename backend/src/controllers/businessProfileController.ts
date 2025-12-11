import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { businessProfileService } from '../services/businessProfileService';
import { ValidationError } from '../utils/errors';
import { PhotoType, PostType, PostStatus } from '@prisma/client';

const createProfileSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  primaryCategory: z.string().optional(),
  categories: z.array(z.string()).optional(),
  googlePlaceId: z.string().optional(),
});

const updateProfileSchema = createProfileSchema.partial().extend({
  mondayHours: z.string().optional(),
  tuesdayHours: z.string().optional(),
  wednesdayHours: z.string().optional(),
  thursdayHours: z.string().optional(),
  fridayHours: z.string().optional(),
  saturdayHours: z.string().optional(),
  sundayHours: z.string().optional(),
  logoUrl: z.string().optional(),
  coverPhotoUrl: z.string().optional(),
});

const updateHoursSchema = z.object({
  mondayHours: z.string().nullable().optional(),
  tuesdayHours: z.string().nullable().optional(),
  wednesdayHours: z.string().nullable().optional(),
  thursdayHours: z.string().nullable().optional(),
  fridayHours: z.string().nullable().optional(),
  saturdayHours: z.string().nullable().optional(),
  sundayHours: z.string().nullable().optional(),
  specialHours: z.any().optional(),
});

const createPhotoSchema = z.object({
  type: z.nativeEnum(PhotoType),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
});

const updatePhotoSchema = z.object({
  type: z.nativeEnum(PhotoType).optional(),
  caption: z.string().max(500).optional(),
});

const createPostSchema = z.object({
  type: z.nativeEnum(PostType),
  title: z.string().max(100).optional(),
  summary: z.string().min(1).max(1500),
  callToAction: z.string().optional(),
  callToActionUrl: z.string().url().optional().or(z.literal('')),
  mediaUrls: z.array(z.string().url()).optional(),
  eventStartDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  offerCode: z.string().optional(),
  offerTerms: z.string().optional(),
  status: z.nativeEnum(PostStatus).optional(),
});

const updatePostSchema = createPostSchema.partial();

export class BusinessProfileController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createProfileSchema.parse(req.body);
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const profile = await businessProfileService.create({
        ...input,
        clientId,
      });

      res.status(201).json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateProfileSchema.parse(req.body);
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const profile = await businessProfileService.update(profileId, clientId, input);

      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await businessProfileService.delete(profileId, clientId);

      res.json({
        success: true,
        message: 'Business profile deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const profile = await businessProfileService.getById(profileId, clientId);

      res.json({
        success: true,
        data: { profile },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;
      const { page, limit } = req.query;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await businessProfileService.list(
        clientId,
        page ? parseInt(page as string, 10) : undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const state = Buffer.from(JSON.stringify({ profileId })).toString('base64');

      const authUrl = businessProfileService.getGoogleAuthUrl(state);

      res.json({
        success: true,
        data: { authUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  async connectGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      const clientId = req.params.clientId || req.clientId;

      if (!code || !state) {
        throw new ValidationError({ code: ['Authorization code is required'] });
      }

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const { profileId } = JSON.parse(Buffer.from(state as string, 'base64').toString());

      await businessProfileService.connectGoogle(clientId, profileId, code as string);

      res.json({
        success: true,
        message: 'Google connected successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;

      const accounts = await businessProfileService.getGoogleAccounts(profileId);

      res.json({
        success: true,
        data: { accounts },
      });
    } catch (error) {
      next(error);
    }
  }

  async getGoogleLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, accountId } = req.params;

      const locations = await businessProfileService.getGoogleLocations(profileId, accountId);

      res.json({
        success: true,
        data: { locations },
      });
    } catch (error) {
      next(error);
    }
  }

  async selectGoogleLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const { accountId, locationId } = req.body;

      await businessProfileService.selectGoogleLocation(profileId, accountId, locationId);

      res.json({
        success: true,
        message: 'Google location selected successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async syncWithGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;

      await businessProfileService.syncWithGoogle(profileId);

      res.json({
        success: true,
        message: 'Sync started successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async handleReviewLinkRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortCode } = req.params;

      const link = await businessProfileService.getReviewLinkByShortCode(shortCode);

      res.redirect(link.fullUrl);
    } catch (error) {
      next(error);
    }
  }

  // Photos management
  async getPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const photos = await businessProfileService.getPhotos(profileId, clientId);

      res.json({
        success: true,
        data: { photos },
      });
    } catch (error) {
      next(error);
    }
  }

  async addPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = createPhotoSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const photo = await businessProfileService.addPhoto(profileId, clientId, input);

      res.status(201).json({
        success: true,
        data: { photo },
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, photoId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = updatePhotoSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const photo = await businessProfileService.updatePhoto(profileId, photoId, clientId, input);

      res.json({
        success: true,
        data: { photo },
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, photoId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await businessProfileService.deletePhoto(profileId, photoId, clientId);

      res.json({
        success: true,
        message: 'Photo deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Posts management
  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const { status } = req.query;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const posts = await businessProfileService.getPosts(profileId, clientId, status as PostStatus);

      res.json({
        success: true,
        data: { posts },
      });
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = createPostSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const post = await businessProfileService.createPost(profileId, clientId, input);

      res.status(201).json({
        success: true,
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, postId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = updatePostSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const post = await businessProfileService.updatePost(profileId, postId, clientId, input);

      res.json({
        success: true,
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, postId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await businessProfileService.deletePost(profileId, postId, clientId);

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async publishPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, postId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const post = await businessProfileService.publishPost(profileId, postId, clientId);

      res.json({
        success: true,
        data: { post },
        message: 'Post published successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Hours management
  async updateHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = updateHoursSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const profile = await businessProfileService.updateHours(profileId, clientId, input);

      res.json({
        success: true,
        data: { profile },
        message: 'Business hours updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const businessProfileController = new BusinessProfileController();
