import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { directoryService } from '../services/directoryService';
import { ValidationError } from '../utils/errors';
import { DirectoryType, SyncStatus } from '@prisma/client';

const createListingSchema = z.object({
  directory: z.nativeEnum(DirectoryType),
  listingUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  isClaimed: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

const updateListingSchema = z.object({
  listingUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  isClaimed: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  syncStatus: z.nativeEnum(SyncStatus).optional(),
});

const autoCreateSchema = z.object({
  directoryTypes: z.array(z.nativeEnum(DirectoryType)).optional(),
});

class DirectoryController {
  // Get all available directories
  async getAvailableDirectories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const directories = await directoryService.getAvailableDirectories();

      res.json({
        success: true,
        data: { directories },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get listings for a business profile
  async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await directoryService.getListings(profileId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create a new directory listing
  async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = createListingSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const listing = await directoryService.createListing(profileId, clientId, input);

      res.status(201).json({
        success: true,
        data: { listing },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a directory listing
  async updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { listingId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = updateListingSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const listing = await directoryService.updateListing(listingId, clientId, input);

      res.json({
        success: true,
        data: { listing },
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a directory listing
  async deleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { listingId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await directoryService.deleteListing(listingId, clientId);

      res.json({
        success: true,
        message: 'Directory listing deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Sync all listings with master profile
  async syncAllWithMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await directoryService.syncAllWithMaster(profileId, clientId);

      res.json({
        success: true,
        data: result,
        message: `${result.updatedCount} listings synced with master profile`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check consistency of a listing
  async checkConsistency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { listingId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await directoryService.checkConsistency(listingId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Auto-create listings for directories
  async autoCreateListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const clientId = req.params.clientId || req.clientId;
      const input = autoCreateSchema.parse(req.body);

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await directoryService.autoCreateListings(
        profileId,
        clientId,
        input.directoryTypes
      );

      res.json({
        success: true,
        data: result,
        message: `${result.created} directory listings created`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get recommended directories based on industry
  async getRecommendedDirectories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { industry } = req.query;

      const recommended = directoryService.getRecommendedDirectories(industry as string);

      res.json({
        success: true,
        data: { recommended },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const directoryController = new DirectoryController();
