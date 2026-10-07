import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import {
  InvoiceCreateSchema,
  InvoiceSendSchema,
  ActivityCreateSchema,
  DisputeCreateSchema,
} from '../shared/schemas.js';
import { computeInvoiceTotals } from '../shared/gst.js';
import { generateInvoicePdf } from '../services/pdf.service.js';
import { v4 as uuidv4 } from 'uuid';

export const invoicesRouter = Router();

invoicesRouter.get('/', requirePermission('invoice:read'), async (req: AuthenticatedRequest, res) => {
  const { clientId, status, q } = req.query;
  const invoices = await dbStore.getInvoices(req.auth!.tenantId, {
    clientId: clientId as string,
    status: status as string,
    q: q as string,
  });
  res.json({ data: invoices, meta: { total: invoices.length, requestId: req.auth!.requestId } });
});

invoicesRouter.post('/preview', requirePermission('invoice:create'), async (req: AuthenticatedRequest, res) => {
  const tenant = await dbStore.getTenant(req.auth!.tenantId);
  const { placeOfSupply, items } = req.body;
  const totals = computeInvoiceTotals(tenant.stateCode, placeOfSupply, items || []);
  res.json({ data: totals, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.get('/next-number', requirePermission('invoice:create'), (req: AuthenticatedRequest, res) => {
  const series = memStore.data.series.find((s: any) => s.tenantId === req.auth!.tenantId) || memStore.data.series[0];
  const nextNum = `${series.prefix}${series.fiscalYear}/${String(series.nextNumber).padStart(series.padding, '0')}${series.suffix}`;
  res.json({ data: { nextNumber: nextNum }, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.post(
  '/',
  requirePermission('invoice:create'),
  validateBody(InvoiceCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await dbStore.createInvoice(req.auth!.tenantId, req.body);
      res.status(201).json({ data: invoice, meta: { requestId: req.auth!.requestId } });
    } catch (err: any) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
      });
    }
  }
);

invoicesRouter.get('/:id', requirePermission('invoice:read'), async (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const invoice = await dbStore.getInvoiceById(req.auth!.tenantId, invoiceId);
  if (!invoice) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
    });
  }
  res.json({ data: invoice, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.patch('/:id', requirePermission('invoice:edit'), async (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const inv = memStore.data.invoices.find((i: any) => i.id === invoiceId && i.tenantId === req.auth!.tenantId);
  if (!inv) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
    });
  }
  if (inv.status !== 'DRAFT') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Only draft invoices can be edited directly. Issue a credit note for modifications.', requestId: req.auth!.requestId },
    });
  }

  const tenant = await dbStore.getTenant(req.auth!.tenantId);
  const client = memStore.data.clients.find((c: any) => c.id === (req.body.clientId || inv.clientId));

  if (req.body.items) {
    const totals = computeInvoiceTotals(
      tenant.stateCode,
      req.body.placeOfSupply || client?.stateCode || tenant.stateCode,
      req.body.items
    );
    Object.assign(inv, {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      total: totals.total,
      balanceDue: totals.total,
      isInterState: totals.isInterState,
      items: totals.items.map((it) => ({
        ...it,
        id: uuidv4(),
        tenantId: req.auth!.tenantId,
        invoiceId: inv.id,
      })),
    });
  }

  if (req.body.issueDate) inv.issueDate = req.body.issueDate;
  if (req.body.dueDate) inv.dueDate = req.body.dueDate;
  if (req.body.poNumber !== undefined) inv.poNumber = req.body.poNumber;
  if (req.body.reference !== undefined) inv.reference = req.body.reference;
  if (req.body.notes !== undefined) inv.notes = req.body.notes;
  if (req.body.terms !== undefined) inv.terms = req.body.terms;

  inv.version += 1;
  inv.updatedAt = new Date().toISOString();

  res.json({ data: inv, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.delete('/:id', requirePermission('invoice:edit'), (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const index = memStore.data.invoices.findIndex((i: any) => i.id === invoiceId && i.tenantId === req.auth!.tenantId);
  if (index === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
    });
  }
  const inv = memStore.data.invoices[index];
  if (inv.status !== 'DRAFT') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Only DRAFT invoices can be deleted.', requestId: req.auth!.requestId },
    });
  }
  memStore.data.invoices.splice(index, 1);
  res.json({ data: { success: true }, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.post('/:id/issue', requirePermission('invoice:send'), async (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  try {
    const inv = await dbStore.issueAndSendInvoice(req.auth!.tenantId, invoiceId, {});
    res.json({ data: inv, meta: { requestId: req.auth!.requestId } });
  } catch (err: any) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
    });
  }
});

invoicesRouter.post(
  '/:id/send',
  requirePermission('invoice:send'),
  validateBody(InvoiceSendSchema),
  async (req: AuthenticatedRequest, res) => {
    const invoiceId = String(req.params.id);
    try {
      const inv = await dbStore.issueAndSendInvoice(req.auth!.tenantId, invoiceId, req.body);
      res.json({ data: inv, meta: { requestId: req.auth!.requestId } });
    } catch (err: any) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
      });
    }
  }
);

invoicesRouter.get('/:id/pdf', requirePermission('invoice:read'), async (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const invoice = await dbStore.getInvoiceById(req.auth!.tenantId, invoiceId);
  if (!invoice) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
    });
  }
  const tenant = await dbStore.getTenant(req.auth!.tenantId);

  try {
    const pdfBuffer = await generateInvoicePdf(invoice, tenant);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF', requestId: req.auth!.requestId },
    });
  }
});

invoicesRouter.post(
  '/:id/activities',
  requirePermission('invoice:edit'),
  validateBody(ActivityCreateSchema),
  (req: AuthenticatedRequest, res) => {
    const invoiceId = String(req.params.id);
    const inv = memStore.data.invoices.find((i: any) => i.id === invoiceId && i.tenantId === req.auth!.tenantId);
    if (!inv) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
      });
    }

    const newActivity: any = {
      id: uuidv4(),
      tenantId: req.auth!.tenantId,
      invoiceId,
      type: req.body.type,
      body: req.body.body || null,
      promisedDate: req.body.promisedDate || null,
      promisedAmount: req.body.promisedAmount ? String(req.body.promisedAmount) : null,
      createdAt: new Date().toISOString(),
    };

    memStore.data.activities.unshift(newActivity);
    res.status(201).json({ data: newActivity, meta: { requestId: req.auth!.requestId } });
  }
);

invoicesRouter.post(
  '/:id/dispute',
  requirePermission('invoice:edit'),
  validateBody(DisputeCreateSchema),
  (req: AuthenticatedRequest, res) => {
    const invoiceId = String(req.params.id);
    const inv = memStore.data.invoices.find((i: any) => i.id === invoiceId && i.tenantId === req.auth!.tenantId);
    if (!inv) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
      });
    }

    inv.isDisputed = true;
    inv.remindersPaused = true;

    const newDispute = {
      id: uuidv4(),
      tenantId: req.auth!.tenantId,
      invoiceId,
      status: 'OPEN',
      reason: req.body.reason,
      raisedOn: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memStore.data.disputes.unshift(newDispute);
    res.status(201).json({ data: newDispute, meta: { requestId: req.auth!.requestId } });
  }
);

invoicesRouter.post('/:id/duplicate', requirePermission('invoice:create'), async (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const original = await dbStore.getInvoiceById(req.auth!.tenantId, invoiceId);
  if (!original) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Original invoice not found', requestId: req.auth!.requestId },
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const duplicated = await dbStore.createInvoice(req.auth!.tenantId, {
    clientId: original.clientId,
    issueDate: today,
    dueDate,
    placeOfSupply: original.placeOfSupply,
    notes: original.notes,
    terms: original.terms,
    items: original.items.map((it: any) => ({
      description: it.description,
      hsnSac: it.hsnSac,
      quantity: it.quantity,
      unit: it.unit,
      rate: it.rate,
      discountPct: it.discountPct,
      taxRate: it.taxRate,
    })),
  });

  res.status(201).json({ data: duplicated, meta: { requestId: req.auth!.requestId } });
});

invoicesRouter.post('/:id/void', requirePermission('invoice:void'), (req: AuthenticatedRequest, res) => {
  const invoiceId = String(req.params.id);
  const inv = memStore.data.invoices.find((i: any) => i.id === invoiceId && i.tenantId === req.auth!.tenantId);
  if (!inv) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found', requestId: req.auth!.requestId },
    });
  }
  if (parseFloat(inv.amountPaid || '0') > 0) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Cannot void invoice with recorded payments. Reverse payments first.', requestId: req.auth!.requestId },
    });
  }

  inv.status = 'VOID';
  inv.voidedAt = new Date().toISOString();
  inv.voidReason = req.body.reason || 'Voided by user';
  inv.remindersPaused = true;

  res.json({ data: inv, meta: { requestId: req.auth!.requestId } });
});
