import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';

export const auditRouter = Router();

auditRouter.get('/', requirePermission('audit:view'), async (req: AuthenticatedRequest, res) => {
  const logs = await dbStore.getAuditLogs(req.auth!.tenantId);
  res.json({ data: logs, meta: { total: logs.length, requestId: req.auth!.requestId } });
});
