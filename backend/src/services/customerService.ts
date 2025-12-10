import { Readable } from 'stream';
import csv from 'csv-parser';
import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { parseCSVRow, parsePhoneNumber, validateEmail } from '../utils/helpers';
import { CustomerSource, ImportStatus } from '@prisma/client';
import { logger } from '../utils/logger';

interface CreateCustomerInput {
  clientId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  source?: CustomerSource;
}

interface UpdateCustomerInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  optOutEmail?: boolean;
  optOutSms?: boolean;
}

interface CustomerFilter {
  clientId: string;
  search?: string;
  tags?: string[];
  optOutEmail?: boolean;
  optOutSms?: boolean;
  page?: number;
  limit?: number;
}

export class CustomerService {
  async create(input: CreateCustomerInput) {
    // Validate email if provided
    if (input.email && !validateEmail(input.email)) {
      throw new ValidationError({ email: ['Invalid email format'] });
    }

    // Parse phone number if provided
    const phone = input.phone ? parsePhoneNumber(input.phone) : undefined;

    // Check for duplicates
    if (input.email) {
      const existingByEmail = await prisma.customer.findUnique({
        where: { clientId_email: { clientId: input.clientId, email: input.email } },
      });
      if (existingByEmail) {
        throw new ValidationError({ email: ['Customer with this email already exists'] });
      }
    }

    if (phone) {
      const existingByPhone = await prisma.customer.findUnique({
        where: { clientId_phone: { clientId: input.clientId, phone } },
      });
      if (existingByPhone) {
        throw new ValidationError({ phone: ['Customer with this phone already exists'] });
      }
    }

    return prisma.customer.create({
      data: {
        clientId: input.clientId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone,
        tags: input.tags || [],
        metadata: input.metadata || {},
        source: input.source || CustomerSource.MANUAL,
      },
    });
  }

  async update(id: string, clientId: string, input: UpdateCustomerInput) {
    const customer = await prisma.customer.findFirst({
      where: { id, clientId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const phone = input.phone ? parsePhoneNumber(input.phone) : customer.phone;

    return prisma.customer.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(phone !== undefined && { phone }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.optOutEmail !== undefined && { optOutEmail: input.optOutEmail }),
        ...(input.optOutSms !== undefined && { optOutSms: input.optOutSms }),
      },
    });
  }

  async delete(id: string, clientId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, clientId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getById(id: string, clientId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, clientId, isActive: true },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return customer;
  }

  async list(filter: CustomerFilter) {
    const { clientId, search, tags, optOutEmail, optOutSms, page = 1, limit = 50 } = filter;

    const where: any = {
      clientId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (optOutEmail !== undefined) {
      where.optOutEmail = optOutEmail;
    }

    if (optOutSms !== undefined) {
      where.optOutSms = optOutSms;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async importFromCSV(
    clientId: string,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<{ importId: string }> {
    // Create import record
    const importRecord = await prisma.customerImport.create({
      data: {
        clientId,
        fileName,
        status: ImportStatus.PROCESSING,
      },
    });

    // Process CSV in background
    this.processCSVImport(importRecord.id, clientId, fileBuffer).catch((error) => {
      logger.error('CSV import failed:', error);
    });

    return { importId: importRecord.id };
  }

  private async processCSVImport(importId: string, clientId: string, fileBuffer: Buffer) {
    const rows: any[] = [];

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(fileBuffer);
      stream
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: any[] = [];

    await prisma.customerImport.update({
      where: { id: importId },
      data: { totalRows: rows.length },
    });

    for (let i = 0; i < rows.length; i++) {
      try {
        const parsed = parseCSVRow(rows[i]);

        if (!parsed) {
          errorCount++;
          errors.push({ row: i + 1, error: 'Could not parse name' });
          continue;
        }

        if (!parsed.email && !parsed.phone) {
          errorCount++;
          errors.push({ row: i + 1, error: 'Email or phone required' });
          continue;
        }

        // Check for duplicates
        if (parsed.email) {
          const existing = await prisma.customer.findUnique({
            where: { clientId_email: { clientId, email: parsed.email } },
          });
          if (existing) {
            duplicateCount++;
            continue;
          }
        }

        if (parsed.phone) {
          const existing = await prisma.customer.findUnique({
            where: { clientId_phone: { clientId, phone: parsed.phone } },
          });
          if (existing) {
            duplicateCount++;
            continue;
          }
        }

        await prisma.customer.create({
          data: {
            clientId,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email,
            phone: parsed.phone,
            source: CustomerSource.CSV_IMPORT,
          },
        });

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push({ row: i + 1, error: error.message });
      }

      // Update progress every 100 rows
      if ((i + 1) % 100 === 0) {
        await prisma.customerImport.update({
          where: { id: importId },
          data: { processedRows: i + 1 },
        });
      }
    }

    // Final update
    await prisma.customerImport.update({
      where: { id: importId },
      data: {
        status: ImportStatus.COMPLETED,
        processedRows: rows.length,
        successCount,
        errorCount,
        duplicateCount,
        errorLog: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });
  }

  async getImportStatus(importId: string, clientId: string) {
    const importRecord = await prisma.customerImport.findFirst({
      where: { id: importId, clientId },
    });

    if (!importRecord) {
      throw new NotFoundError('Import');
    }

    return importRecord;
  }

  async bulkOptOut(clientId: string, customerIds: string[], optOutType: 'email' | 'sms') {
    const field = optOutType === 'email' ? 'optOutEmail' : 'optOutSms';

    await prisma.customer.updateMany({
      where: {
        clientId,
        id: { in: customerIds },
      },
      data: {
        [field]: true,
      },
    });
  }

  async addTags(clientId: string, customerIds: string[], tags: string[]) {
    const customers = await prisma.customer.findMany({
      where: {
        clientId,
        id: { in: customerIds },
      },
      select: { id: true, tags: true },
    });

    for (const customer of customers) {
      const newTags = [...new Set([...customer.tags, ...tags])];
      await prisma.customer.update({
        where: { id: customer.id },
        data: { tags: newTags },
      });
    }
  }
}

export const customerService = new CustomerService();
