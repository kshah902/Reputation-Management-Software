import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaignService';
import { ValidationError } from '../utils/errors';
import { CampaignType, ScheduleType, CampaignStatus } from '@prisma/client';

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(CampaignType),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailSubject: z.string().max(200).optional(),
  emailTemplate: z.string().optional(),
  smsTemplate: z.string().max(500).optional(),
  scheduleType: z.nativeEnum(ScheduleType),
  scheduledAt: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  delayHours: z.number().int().min(0).max(168).optional(),
  dripEnabled: z.boolean().optional(),
  dripIntervalDays: z.number().int().min(1).max(30).optional(),
  dripMaxMessages: z.number().int().min(1).max(10).optional(),
});

const addRecipientsSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
});

export class CampaignController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCampaignSchema.parse(req.body);
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const campaign = await campaignService.create({
        ...input,
        clientId,
      });

      res.status(201).json({
        success: true,
        data: { campaign },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCampaignSchema.partial().parse(req.body);
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const campaign = await campaignService.update(campaignId, clientId, input);

      res.json({
        success: true,
        data: { campaign },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await campaignService.delete(campaignId, clientId);

      res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const campaign = await campaignService.getById(campaignId, clientId);

      res.json({
        success: true,
        data: { campaign },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;
      const { status, page, limit } = req.query;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await campaignService.list(
        clientId,
        status as CampaignStatus | undefined,
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

  async addRecipients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const { customerIds } = addRecipientsSchema.parse(req.body);

      const result = await campaignService.addRecipients({
        campaignId,
        customerIds,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeRecipients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const { customerIds } = addRecipientsSchema.parse(req.body);

      const result = await campaignService.removeRecipients(campaignId, customerIds);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async launch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await campaignService.launch(campaignId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await campaignService.pause(campaignId, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await campaignService.resume(campaignId, clientId);

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
      const { campaignId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const stats = await campaignService.getStats(campaignId, clientId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
