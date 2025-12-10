import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { slugify } from '../utils/helpers';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

interface CreateClientInput {
  agencyId: string;
  name: string;
  email: string;
  phone?: string;
  industry?: string;
}

interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  industry?: string;
  isActive?: boolean;
  settings?: Record<string, any>;
}

interface CreateClientUserInput {
  clientId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export class ClientService {
  async create(input: CreateClientInput) {
    const slug = slugify(input.name);

    // Check if slug exists for this agency
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.client.findUnique({ where: { agencyId_slug: { agencyId: input.agencyId, slug: uniqueSlug } } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return prisma.client.create({
      data: {
        agencyId: input.agencyId,
        name: input.name,
        slug: uniqueSlug,
        email: input.email,
        phone: input.phone,
        industry: input.industry,
      },
    });
  }

  async update(id: string, agencyId: string, input: UpdateClientInput) {
    const client = await prisma.client.findFirst({
      where: { id, agencyId },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    return prisma.client.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, agencyId: string) {
    const client = await prisma.client.findFirst({
      where: { id, agencyId },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    // Soft delete by deactivating
    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getById(id: string, agencyId: string) {
    const client = await prisma.client.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: {
            customers: true,
            campaigns: true,
            reviews: true,
            businessProfiles: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    return client;
  }

  async list(agencyId: string, search?: string, page = 1, limit = 20) {
    const where: any = { agencyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              customers: true,
              campaigns: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(input: CreateClientUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role || UserRole.CLIENT_USER,
        clientId: input.clientId,
        agencyId: client.agencyId,
      },
    });
  }

  async listUsers(clientId: string) {
    return prisma.user.findMany({
      where: { clientId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardStats(clientId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalCustomers,
      totalReviews,
      recentReviews,
      avgRating,
      activeCampaigns,
      needsResponseCount,
    ] = await Promise.all([
      prisma.customer.count({ where: { clientId, isActive: true } }),
      prisma.review.count({ where: { clientId } }),
      prisma.review.count({ where: { clientId, publishedAt: { gte: thirtyDaysAgo } } }),
      prisma.review.aggregate({
        where: { clientId },
        _avg: { rating: true },
      }),
      prisma.campaign.count({ where: { clientId, status: 'ACTIVE' } }),
      prisma.review.count({ where: { clientId, needsResponse: true } }),
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { clientId },
      _count: true,
    });

    return {
      totalCustomers,
      totalReviews,
      recentReviews,
      averageRating: avgRating._avg.rating || 0,
      activeCampaigns,
      needsResponseCount,
      ratingDistribution: {
        1: ratingDistribution.find(r => r.rating === 1)?._count || 0,
        2: ratingDistribution.find(r => r.rating === 2)?._count || 0,
        3: ratingDistribution.find(r => r.rating === 3)?._count || 0,
        4: ratingDistribution.find(r => r.rating === 4)?._count || 0,
        5: ratingDistribution.find(r => r.rating === 5)?._count || 0,
      },
    };
  }
}

export const clientService = new ClientService();
