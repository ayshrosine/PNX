import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';

export const reportsRouter = Router();

reportsRouter.get('/dashboard', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const data = await dbStore.getDashboardData(req.auth!.tenantId);
  res.json({ data, meta: { requestId: req.auth!.requestId } });
});

reportsRouter.get('/receivables-summary', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const clients = await dbStore.getClients(req.auth!.tenantId);
  res.json({ data: clients, meta: { requestId: req.auth!.requestId } });
});

reportsRouter.get('/ageing', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const invoices = await dbStore.getInvoices(req.auth!.tenantId);
  const pending = invoices.filter((i) => ['SENT', 'PART_PAID'].includes(i.status) && parseFloat(i.balanceDue) > 0);
  res.json({ data: pending, meta: { total: pending.length, requestId: req.auth!.requestId } });
});

reportsRouter.get('/collections', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const payments = await dbStore.getPayments(req.auth!.tenantId);
  res.json({ data: payments, meta: { total: payments.length, requestId: req.auth!.requestId } });
});

reportsRouter.get('/invoice-register', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const invoices = await dbStore.getInvoices(req.auth!.tenantId);
  res.json({ data: invoices, meta: { total: invoices.length, requestId: req.auth!.requestId } });
});

reportsRouter.get('/tds', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const paymentsWithTds = memStore.data.payments.filter(
    (p) => p.tenantId === req.auth!.tenantId && parseFloat(p.tdsAmount) > 0
  );
  res.json({ data: paymentsWithTds, meta: { requestId: req.auth!.requestId } });
});

reportsRouter.get('/msme-clock', requirePermission('report:view'), async (req: AuthenticatedRequest, res) => {
  const invoices = await dbStore.getInvoices(req.auth!.tenantId);
  // Filter invoices where daysOverdue > 30 or client is micro/small
  const msmeRisk = invoices.filter((inv) => {
    return inv.derived.isOverdue && inv.derived.daysOverdue >= 30;
  });
  res.json({ data: msmeRisk, meta: { total: msmeRisk.length, requestId: req.auth!.requestId } });
});
