import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { businessProfileService } from '../services/businessProfileService';
import { ValidationError } from '../utils/errors';

const createProfileSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
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
});

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
}

export const businessProfileController = new BusinessProfileController();
