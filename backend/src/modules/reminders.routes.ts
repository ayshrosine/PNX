import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { ReminderTemplateCreateSchema, ReminderRuleCreateSchema } from '../shared/schemas.js';
import { v4 as uuidv4 } from 'uuid';

export const remindersRouter = Router();

remindersRouter.get('/', requirePermission('reminder:read'), async (req: AuthenticatedRequest, res) => {
  const status = req.query.status as string | undefined;
  const reminders = await dbStore.getReminders(req.auth!.tenantId, status);
  res.json({ data: reminders, meta: { total: reminders.length, requestId: req.auth!.requestId } });
});

remindersRouter.get('/:id', requirePermission('reminder:read'), (req: AuthenticatedRequest, res) => {
  const rem = memStore.data.reminders.find((r) => r.id === req.params.id && r.tenantId === req.auth!.tenantId);
  if (!rem) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Reminder not found', requestId: req.auth!.requestId },
    });
  }
  const invoice = memStore.data.invoices.find((i) => i.id === rem.invoiceId);
  const client = memStore.data.clients.find((c) => c.id === rem.clientId);
  res.json({ data: { ...rem, invoice, client }, meta: { requestId: req.auth!.requestId } });
});

remindersRouter.post('/:id/approve', requirePermission('reminder:approve'), async (req: AuthenticatedRequest, res) => {
  try {
    const rem = await dbStore.approveReminder(req.auth!.tenantId, req.params.id);
    res.json({ data: rem, meta: { requestId: req.auth!.requestId } });
  } catch (err: any) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
    });
  }
});

remindersRouter.post('/:id/skip', requirePermission('reminder:approve'), async (req: AuthenticatedRequest, res) => {
  try {
    const rem = await dbStore.skipReminder(req.auth!.tenantId, req.params.id, req.body.reason);
    res.json({ data: rem, meta: { requestId: req.auth!.requestId } });
  } catch (err: any) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
    });
  }
});

remindersRouter.post('/:id/send-now', requirePermission('reminder:approve'), async (req: AuthenticatedRequest, res) => {
  try {
    const rem = await dbStore.sendReminderNow(req.auth!.tenantId, req.params.id);
    res.json({ data: rem, meta: { requestId: req.auth!.requestId } });
  } catch (err: any) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
    });
  }
});

remindersRouter.post('/bulk', requirePermission('reminder:approve'), async (req: AuthenticatedRequest, res) => {
  const { ids, action } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'ids array is required', requestId: req.auth!.requestId },
    });
  }

  const results = [];
  for (const id of ids) {
    if (action === 'approve') {
      results.push(await dbStore.approveReminder(req.auth!.tenantId, id));
    } else if (action === 'skip') {
      results.push(await dbStore.skipReminder(req.auth!.tenantId, id, 'Bulk skipped'));
    }
  }

  res.json({ data: { updated: results.length }, meta: { requestId: req.auth!.requestId } });
});

// Templates
remindersRouter.get('/templates/list', requirePermission('reminder:read'), async (req: AuthenticatedRequest, res) => {
  const templates = await dbStore.getReminderTemplates(req.auth!.tenantId);
  res.json({ data: templates, meta: { total: templates.length, requestId: req.auth!.requestId } });
});

remindersRouter.post(
  '/templates',
  requirePermission('templates:manage'),
  validateBody(ReminderTemplateCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    const newTemplate = {
      id: uuidv4(),
      tenantId: req.auth!.tenantId,
      name: req.body.name,
      channel: req.body.channel || 'EMAIL',
      tone: req.body.tone || 'NEUTRAL',
      language: req.body.language || 'en',
      subject: req.body.subject || null,
      body: req.body.body,
      waTemplateName: null,
      isDefault: false,
      isSystem: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memStore.data.templates.push(newTemplate);
    res.status(201).json({ data: newTemplate, meta: { requestId: req.auth!.requestId } });
  }
);

// Rules
remindersRouter.get('/rules/list', requirePermission('reminder:read'), async (req: AuthenticatedRequest, res) => {
  const rules = await dbStore.getReminderRules(req.auth!.tenantId);
  res.json({ data: rules, meta: { total: rules.length, requestId: req.auth!.requestId } });
});

remindersRouter.post(
  '/rules',
  requirePermission('rules:manage'),
  validateBody(ReminderRuleCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    const newRule = {
      id: uuidv4(),
      tenantId: req.auth!.tenantId,
      clientId: req.body.clientId || null,
      name: req.body.name,
      triggerType: req.body.triggerType,
      offsetDays: req.body.offsetDays || 0,
      channel: req.body.channel || 'EMAIL',
      templateId: req.body.templateId,
      requiresApproval: req.body.requiresApproval !== undefined ? req.body.requiresApproval : true,
      minBalance: req.body.minBalance ? String(req.body.minBalance) : null,
      escalateToOwner: Boolean(req.body.escalateToOwner),
      position: memStore.data.rules.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memStore.data.rules.push(newRule);
    res.status(201).json({ data: newRule, meta: { requestId: req.auth!.requestId } });
  }
);
