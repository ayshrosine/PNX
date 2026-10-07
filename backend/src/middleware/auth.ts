import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthContext } from '../shared/types.js';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '../db/seed-data.js';
import { memStore } from '../db/store.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  requestId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reqId = (req as any).requestId || (req.headers['x-request-id'] as string) || 'req-unknown';
  const authHeader = req.headers.authorization;
  const tenantHeader = (req.headers['x-tenant-id'] as string) || DEMO_TENANT_ID;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const user = memStore.data.users.find((u) => u.id === decoded.userId);
      const membership = memStore.data.memberships.find(
        (m) => m.userId === decoded.userId && m.tenantId === (decoded.tenantId || tenantHeader)
      );

      if (user && membership) {
        req.auth = {
          userId: user.id,
          email: user.email,
          fullName: user.fullName || undefined,
          tenantId: membership.tenantId,
          role: membership.role as any,
          canApprove: membership.canApprove,
          requestId: reqId,
        };
        return next();
      }
    } catch (e) {
      // Token invalid or expired, continue to fallback below
    }
  }

  // Fallback to active demo tenant in development mode
  const demoUser = memStore.data.users.find((u) => u.id === DEMO_USER_ID) || memStore.data.users[0];
  const demoMembership = memStore.data.memberships.find(
    (m) => m.userId === demoUser.id && m.tenantId === tenantHeader
  ) || memStore.data.memberships[0];

  req.auth = {
    userId: demoUser.id,
    email: demoUser.email,
    fullName: demoUser.fullName || undefined,
    tenantId: demoMembership?.tenantId || DEMO_TENANT_ID,
    role: (demoMembership?.role as any) || 'OWNER',
    canApprove: demoMembership ? demoMembership.canApprove : true,
    requestId: reqId,
  };

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required for this endpoint',
        requestId: (req as any).requestId,
      },
    });
  }
  next();
}
