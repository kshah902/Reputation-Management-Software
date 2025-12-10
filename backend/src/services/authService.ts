import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { config } from '../config';
import { AuthenticationError, ConflictError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { slugify } from '../utils/helpers';

interface RegisterAgencyInput {
  agencyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  agencyId?: string;
  clientId?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async registerAgency(input: RegisterAgencyInput): Promise<{ agency: any; user: any; tokens: TokenPair }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const existingAgency = await prisma.agency.findUnique({
      where: { email: input.email },
    });

    if (existingAgency) {
      throw new ConflictError('Agency with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, this.SALT_ROUNDS);
    const slug = slugify(input.agencyName);

    // Check if slug exists and make it unique if needed
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.agency.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: input.agencyName,
          slug: uniqueSlug,
          email: input.email,
          phone: input.phone,
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: UserRole.AGENCY_OWNER,
          agencyId: agency.id,
          emailVerified: false,
        },
      });

      return { agency, user };
    });

    const tokens = await this.generateTokens(result.user);

    return {
      agency: {
        id: result.agency.id,
        name: result.agency.name,
        slug: result.agency.slug,
        email: result.agency.email,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      tokens,
    };
  }

  async registerUser(input: RegisterUserInput): Promise<{ user: any; tokens: TokenPair }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, this.SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        agencyId: input.agencyId,
        clientId: input.clientId,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: any; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
        client: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        agency: user.agency,
        client: user.client,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AuthenticationError('Refresh token expired');
    }

    if (!storedToken.user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Delete the old refresh token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private async generateTokens(user: any): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId || undefined,
      clientId: user.clientId || undefined,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    const refreshToken = uuidv4();
    const expiresAt = this.parseExpiration(config.JWT_REFRESH_EXPIRES_IN);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(config.JWT_EXPIRES_IN),
    };
  }

  private parseExpiration(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
    }

    return now;
  }

  private getExpiresInSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 900; // Default to 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

export const authService = new AuthService();
