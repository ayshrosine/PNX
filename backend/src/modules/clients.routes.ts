import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { ClientCreateSchema, ContactCreateSchema } from '../shared/schemas.js';
import { v4 as uuidv4 } from 'uuid';

export const clientsRouter = Router();

clientsRouter.get('/', requirePermission('client:read'), async (req: AuthenticatedRequest, res) => {
  const q = req.query.q as string | undefined;
  const archived = req.query.archived === 'true';
  const clients = await dbStore.getClients(req.auth!.tenantId, { q, archived });
  res.json({ data: clients, meta: { total: clients.length, requestId: req.auth!.requestId } });
});

clientsRouter.post(
  '/',
  requirePermission('client:create'),
  validateBody(ClientCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    const client = await dbStore.createClient(req.auth!.tenantId, req.body);
    res.status(201).json({ data: client, meta: { requestId: req.auth!.requestId } });
  }
);

clientsRouter.get('/:id', requirePermission('client:read'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const client = await dbStore.getClientById(req.auth!.tenantId, clientId);
  if (!client) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Client not found', requestId: req.auth!.requestId },
    });
  }
  res.json({ data: client, meta: { requestId: req.auth!.requestId } });
});

clientsRouter.patch('/:id', requirePermission('client:edit'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const updated = await dbStore.updateClient(req.auth!.tenantId, clientId, req.body);
  if (!updated) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Client not found', requestId: req.auth!.requestId },
    });
  }
  res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
});

clientsRouter.post('/:id/pause-reminders', requirePermission('client:edit'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const { reason, until } = req.body;
  const updated = await dbStore.updateClient(req.auth!.tenantId, clientId, {
    remindersPaused: true,
    pauseReason: reason || 'Paused by user',
    pausedUntil: until || null,
  });
  res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
});

clientsRouter.post('/:id/resume-reminders', requirePermission('client:edit'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const updated = await dbStore.updateClient(req.auth!.tenantId, clientId, {
    remindersPaused: false,
    pauseReason: null,
    pausedUntil: null,
  });
  res.json({ data: updated, meta: { requestId: req.auth!.requestId } });
});

clientsRouter.get('/:id/contacts', requirePermission('client:read'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const contacts = memStore.data.contacts.filter(
    (c: any) => c.clientId === clientId && c.tenantId === req.auth!.tenantId
  );
  res.json({ data: contacts, meta: { requestId: req.auth!.requestId } });
});

clientsRouter.post(
  '/:id/contacts',
  requirePermission('client:edit'),
  validateBody(ContactCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    const clientId = String(req.params.id);
    const newContact: any = {
      id: uuidv4(),
      tenantId: req.auth!.tenantId,
      clientId,
      name: req.body.name,
      designation: req.body.designation || null,
      email: req.body.email || null,
      phone: req.body.phone || null,
      whatsappNumber: req.body.whatsappNumber || req.body.phone || null,
      isPrimary: Boolean(req.body.isPrimary),
      isBilling: req.body.isBilling !== undefined ? req.body.isBilling : true,
      consentEmail: Boolean(req.body.consentEmail),
      consentWhatsapp: Boolean(req.body.consentWhatsapp),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memStore.data.contacts.push(newContact);
    res.status(201).json({ data: newContact, meta: { requestId: req.auth!.requestId } });
  }
);

clientsRouter.get('/:id/statement', requirePermission('client:read'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const client = await dbStore.getClientById(req.auth!.tenantId, clientId);
  if (!client) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Client not found', requestId: req.auth!.requestId },
    });
  }

  const invoices = await dbStore.getInvoices(req.auth!.tenantId, { clientId });
  const payments = memStore.data.payments.filter(
    (p: any) => p.clientId === clientId && p.tenantId === req.auth!.tenantId
  );

  res.json({
    data: {
      client,
      invoices,
      payments,
      statementGeneratedAt: new Date().toISOString(),
    },
    meta: { requestId: req.auth!.requestId },
  });
});

clientsRouter.get('/:id/timeline', requirePermission('client:read'), async (req: AuthenticatedRequest, res) => {
  const clientId = String(req.params.id);
  const clientInvoices = memStore.data.invoices.filter(
    (inv: any) => inv.clientId === clientId && inv.tenantId === req.auth!.tenantId
  );
  const invIds = clientInvoices.map((i: any) => i.id);

  const activities = memStore.data.activities.filter(
    (a: any) => a.tenantId === req.auth!.tenantId && invIds.includes(a.invoiceId)
  );

  res.json({ data: activities, meta: { requestId: req.auth!.requestId } });
});
