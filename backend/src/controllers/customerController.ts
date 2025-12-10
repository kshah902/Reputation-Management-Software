import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { customerService } from '../services/customerService';
import { ValidationError } from '../utils/errors';

const storage = multer.memoryStorage();
export const uploadCSV = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('file');

const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  optOutEmail: z.boolean().optional(),
  optOutSms: z.boolean().optional(),
});

const listCustomersSchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  optOutEmail: z.enum(['true', 'false']).optional(),
  optOutSms: z.enum(['true', 'false']).optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
});

export class CustomerController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCustomerSchema.parse(req.body);
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const customer = await customerService.create({
        ...input,
        clientId,
      });

      res.status(201).json({
        success: true,
        data: { customer },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateCustomerSchema.parse(req.body);
      const { customerId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const customer = await customerService.update(customerId, clientId, input);

      res.json({
        success: true,
        data: { customer },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      await customerService.delete(customerId, clientId);

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const customer = await customerService.getById(customerId, clientId);

      res.json({
        success: true,
        data: { customer },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listCustomersSchema.parse(req.query);
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const result = await customerService.list({
        clientId,
        search: query.search,
        tags: query.tags?.split(','),
        optOutEmail: query.optOutEmail === 'true' ? true : query.optOutEmail === 'false' ? false : undefined,
        optOutSms: query.optOutSms === 'true' ? true : query.optOutSms === 'false' ? false : undefined,
        page: query.page,
        limit: query.limit,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      if (!req.file) {
        throw new ValidationError({ file: ['CSV file is required'] });
      }

      const result = await customerService.importFromCSV(
        clientId,
        req.file.buffer,
        req.file.originalname
      );

      res.status(202).json({
        success: true,
        data: result,
        message: 'Import started',
      });
    } catch (error) {
      next(error);
    }
  }

  async getImportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { importId } = req.params;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      const importStatus = await customerService.getImportStatus(importId, clientId);

      res.json({
        success: true,
        data: { import: importStatus },
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkOptOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerIds, optOutType } = req.body;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        throw new ValidationError({ customerIds: ['Customer IDs are required'] });
      }

      if (!['email', 'sms'].includes(optOutType)) {
        throw new ValidationError({ optOutType: ['Must be email or sms'] });
      }

      await customerService.bulkOptOut(clientId, customerIds, optOutType);

      res.json({
        success: true,
        message: 'Customers opted out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerIds, tags } = req.body;
      const clientId = req.params.clientId || req.clientId;

      if (!clientId) {
        throw new ValidationError({ clientId: ['Client ID is required'] });
      }

      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        throw new ValidationError({ customerIds: ['Customer IDs are required'] });
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        throw new ValidationError({ tags: ['Tags are required'] });
      }

      await customerService.addTags(clientId, customerIds, tags);

      res.json({
        success: true,
        message: 'Tags added successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
