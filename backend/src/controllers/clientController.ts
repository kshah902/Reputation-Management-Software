import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { clientService } from '../services/clientService';
import { ValidationError } from '../utils/errors';
import { UserRole } from '@prisma/client';

const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  industry: z.string().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.nativeEnum(UserRole).optional(),
});

export class ClientController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createClientSchema.parse(req.body);
      const agencyId = req.agencyId;

      if (!agencyId) {
        throw new ValidationError({ agencyId: ['Agency ID is required'] });
      }

      const client = await clientService.create({
        ...input,
        agencyId,
      });

      res.status(201).json({
        success: true,
        data: { client },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateClientSchema.parse(req.body);
      const { clientId } = req.params;
      const agencyId = req.agencyId;

      if (!agencyId) {
        throw new ValidationError({ agencyId: ['Agency ID is required'] });
      }

      const client = await clientService.update(clientId, agencyId, input);

      res.json({
        success: true,
        data: { client },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const agencyId = req.agencyId;

      if (!agencyId) {
        throw new ValidationError({ agencyId: ['Agency ID is required'] });
      }

      await clientService.delete(clientId, agencyId);

      res.json({
        success: true,
        message: 'Client deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const agencyId = req.agencyId;

      if (!agencyId) {
        throw new ValidationError({ agencyId: ['Agency ID is required'] });
      }

      const client = await clientService.getById(clientId, agencyId);

      res.json({
        success: true,
        data: { client },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const agencyId = req.agencyId;
      const { search, page, limit } = req.query;

      if (!agencyId) {
        throw new ValidationError({ agencyId: ['Agency ID is required'] });
      }

      const result = await clientService.list(
        agencyId,
        search as string | undefined,
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

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const input = createUserSchema.parse(req.body);

      const user = await clientService.createUser({
        ...input,
        clientId,
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;

      const users = await clientService.listUsers(clientId);

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const stats = await clientService.getDashboardStats(clientId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
