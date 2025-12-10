import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { hashApiKey } from '../utils/helpers';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  clientId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      agencyId?: string;
      clientId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('No authorization header');
    }

    // Check for Bearer token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          clientId: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId || undefined,
        clientId: user.clientId || undefined,
      };
      req.agencyId = user.agencyId || undefined;
      req.clientId = user.clientId || undefined;

      return next();
    }

    // Check for API Key
    if (authHeader.startsWith('ApiKey ')) {
      const apiKey = authHeader.slice(7);
      const keyHash = hashApiKey(apiKey);

      const key = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { agency: true },
      });

      if (!key || !key.isActive) {
        throw new AuthenticationError('Invalid API key');
      }

      if (key.expiresAt && key.expiresAt < new Date()) {
        throw new AuthenticationError('API key expired');
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });

      req.user = {
        userId: 'api-key',
        email: key.agency.email,
        role: UserRole.AGENCY_ADMIN,
        agencyId: key.agencyId,
      };
      req.agencyId = key.agencyId;

      return next();
    }

    throw new AuthenticationError('Invalid authorization format');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Invalid token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Token expired'));
    }
    next(error);
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
}

export function requireAgency(req: Request, res: Response, next: NextFunction): void {
  if (!req.agencyId) {
    return next(new AuthorizationError('Agency context required'));
  }
  next();
}

export function requireClient(req: Request, res: Response, next: NextFunction): void {
  if (!req.clientId && !req.agencyId) {
    return next(new AuthorizationError('Client context required'));
  }
  next();
}

export async function setClientContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clientId = req.params.clientId || req.query.clientId as string;

  if (clientId) {
    // Verify the user has access to this client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, agencyId: true },
    });

    if (!client) {
      return next(new AuthorizationError('Client not found'));
    }

    // Check if user belongs to the client's agency or is the client directly
    if (req.user?.agencyId !== client.agencyId && req.user?.clientId !== clientId) {
      return next(new AuthorizationError('Access denied to this client'));
    }

    req.clientId = clientId;
  }

  next();
}
