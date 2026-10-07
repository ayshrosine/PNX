import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { TenantProfileUpdateSchema, TenantSettingsUpdateSchema } from '../shared/schemas.js';
import { v4 as uuidv4 } from 'uuid';

export const tenantRouter = Router();

tenantRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const tenant = await dbStore.getTenant(req.auth!.tenantId);
  res.json({ data: tenant, meta: { requestId: req.auth!.requestId } });
});

tenantRouter.patch(
  '/',
  requirePermission('tenant:manage'),
  validateBody(TenantProfileUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    const updated = await dbStore.updateTenant(req.auth!.tenantId, req.body);
    res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
  }
);

tenantRouter.patch(
  '/settings',
  requirePermission('tenant:manage'),
  validateBody(TenantSettingsUpdateSchema),
  async (req: AuthenticatedRequest, res) => {
    const updated = await dbStore.updateTenant(req.auth!.tenantId, req.body);
    res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
  }
);

tenantRouter.patch('/onboarding', async (req: AuthenticatedRequest, res) => {
  const { step } = req.body;
  const updated = await dbStore.updateTenant(req.auth!.tenantId, { onboardingStep: step });
  res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
});

tenantRouter.get('/members', async (req: AuthenticatedRequest, res) => {
  const members = await dbStore.getMembers(req.auth!.tenantId);
  res.json({ data: members, meta: { requestId: req.auth!.requestId } });
});

tenantRouter.get('/series', async (req: AuthenticatedRequest, res) => {
  const list = memStore.data.series.filter((s) => s.tenantId === req.auth!.tenantId);
  res.json({ data: list, meta: { requestId: req.auth!.requestId } });
});

tenantRouter.post('/series', requirePermission('tenant:manage'), async (req: AuthenticatedRequest, res) => {
  const { name, prefix, suffix, fiscalYear } = req.body;
  const newSeries = {
    id: uuidv4(),
    tenantId: req.auth!.tenantId,
    name: name || 'Custom Series',
    prefix: prefix || 'INV/',
    suffix: suffix || '',
    fiscalYear: fiscalYear || '2026-27',
    nextNumber: 1,
    padding: 4,
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memStore.data.series.push(newSeries);
  res.status(201).json({ data: newSeries, meta: { requestId: req.auth!.requestId } });
});
