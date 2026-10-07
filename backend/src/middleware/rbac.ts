import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { Permission, Role } from '../shared/types.js';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    'tenant:manage',
    'billing:manage',
    'members:manage',
    'invoice:create',
    'invoice:edit',
    'invoice:send',
    'invoice:void',
    'invoice:read',
    'payment:record',
    'payment:reverse',
    'payment:read',
    'reminder:approve',
    'reminder:read',
    'rules:manage',
    'templates:manage',
    'client:create',
    'client:edit',
    'client:read',
    'import:run',
    'report:view',
    'report:export',
    'audit:view',
    'data:export',
    'data:erase',
  ],
  ADMIN: [
    'invoice:create',
    'invoice:edit',
    'invoice:send',
    'invoice:void',
    'invoice:read',
    'payment:record',
    'payment:reverse',
    'payment:read',
    'reminder:approve',
    'reminder:read',
    'rules:manage',
    'templates:manage',
    'client:create',
    'client:edit',
    'client:read',
    'import:run',
    'report:view',
    'report:export',
    'audit:view',
  ],
  ACCOUNTANT: [
    'invoice:read',
    'payment:read',
    'client:read',
    'reminder:read',
    'report:view',
    'report:export',
    'audit:view',
  ],
  VIEWER: [
    'invoice:read',
    'payment:read',
    'client:read',
    'reminder:read',
    'report:view',
  ],
};

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          requestId: req.auth?.requestId || (req as any).requestId,
        },
      });
    }

    const { role, canApprove } = req.auth;
    const allowedPerms = ROLE_PERMISSIONS[role] || [];

    if (!allowedPerms.includes(permission)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `User role '${role}' does not have permission '${permission}'`,
          requestId: req.auth.requestId,
        },
      });
    }

    // Special check for reminder approval right
    if (permission === 'reminder:approve' && role === 'ADMIN' && !canApprove) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin account does not have reminder approval privilege',
          requestId: req.auth.requestId,
        },
      });
    }

    next();
  };
}
