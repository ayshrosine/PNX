import { Router } from 'express';
import { memStore, calculateDerivedState } from '../db/store.js';
import { generateInvoicePdf } from '../services/pdf.service.js';
import { v4 as uuidv4 } from 'uuid';

export const portalRouter = Router();

portalRouter.get('/invoices/:token', (req, res) => {
  const inv = memStore.data.invoices.find((i: any) => i.publicToken === req.params.token);
  if (!inv) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found or link has expired' },
    });
  }

  inv.viewCount += 1;
  if (!inv.firstViewedAt) inv.firstViewedAt = new Date().toISOString();
  inv.lastViewedAt = new Date().toISOString();

  const client = memStore.data.clients.find((c: any) => c.id === inv.clientId);
  const tenant = memStore.data.tenant;
  const derived = calculateDerivedState(inv);

  res.json({
    data: {
      invoice: {
        id: inv.id,
        number: inv.number,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        subtotal: inv.subtotal,
        taxTotal: inv.taxTotal,
        total: inv.total,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        items: inv.items,
        notes: inv.notes,
        terms: inv.terms,
        derived,
      },
      client: {
        name: client?.name,
        gstin: client?.gstin,
      },
      business: {
        name: tenant.name,
        legalName: tenant.legalName,
        email: tenant.email,
        phone: tenant.phone,
        gstin: tenant.gstin,
        bankName: tenant.bankName,
        bankAccountName: tenant.bankAccountName,
        bankIfsc: tenant.bankIfsc,
        upiId: tenant.upiId,
      },
    },
    meta: { requestId: (req as any).requestId },
  });
});

portalRouter.get('/invoices/:token/pdf', async (req, res) => {
  const inv = memStore.data.invoices.find((i: any) => i.publicToken === req.params.token);
  if (!inv) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Invoice not found' },
    });
  }

  const client = memStore.data.clients.find((c: any) => c.id === inv.clientId);
  const tenant = memStore.data.tenant;

  try {
    const pdfBuffer = await generateInvoicePdf({ ...inv, client }, tenant);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.number.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF' } });
  }
});

portalRouter.post('/invoices/:token/acknowledge', (req, res) => {
  const inv = memStore.data.invoices.find((i: any) => i.publicToken === req.params.token);
  if (!inv) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

  memStore.data.activities.push({
    id: uuidv4(),
    tenantId: inv.tenantId,
    invoiceId: inv.id,
    type: 'NOTE',
    body: 'Client acknowledged receipt of invoice via public portal link.',
    promisedDate: null,
    promisedAmount: null,
    createdAt: new Date().toISOString(),
  });

  res.json({ data: { acknowledged: true } });
});

portalRouter.post('/invoices/:token/promise', (req, res) => {
  const { promisedDate, message } = req.body;
  const inv = memStore.data.invoices.find((i: any) => i.publicToken === req.params.token);
  if (!inv) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

  memStore.data.activities.push({
    id: uuidv4(),
    tenantId: inv.tenantId,
    invoiceId: inv.id,
    type: 'PROMISE_TO_PAY',
    body: `Client stated payment date: ${promisedDate}. Note: ${message || 'No additional note'}`,
    promisedDate: promisedDate || null,
    promisedAmount: inv.balanceDue,
    createdAt: new Date().toISOString(),
  });

  res.json({ data: { success: true, message: 'Promise to pay recorded.' } });
});

portalRouter.post('/invoices/:token/dispute', (req, res) => {
  const { message, contactEmail } = req.body;
  const inv = memStore.data.invoices.find((i: any) => i.publicToken === req.params.token);
  if (!inv) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });

  inv.isDisputed = true;
  inv.remindersPaused = true;

  memStore.data.disputes.unshift({
    id: uuidv4(),
    tenantId: inv.tenantId,
    invoiceId: inv.id,
    status: 'OPEN',
    reason: `Portal query from ${contactEmail || 'Client'}: ${message}`,
    raisedOn: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  memStore.data.activities.unshift({
    id: uuidv4(),
    tenantId: inv.tenantId,
    invoiceId: inv.id,
    type: 'NOTE',
    body: `Client raised question: "${message}" (${contactEmail})`,
    promisedDate: null,
    promisedAmount: null,
    createdAt: new Date().toISOString(),
  });

  res.json({ data: { success: true, message: 'Question received. The finance team has been notified.' } });
});

portalRouter.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
