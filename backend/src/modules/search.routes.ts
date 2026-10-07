import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { memStore } from '../db/store.js';

export const searchRouter = Router();

searchRouter.get('/', (req: AuthenticatedRequest, res) => {
  const q = (req.query.q as string || '').toLowerCase().trim();
  if (!q) {
    return res.json({ data: { clients: [], invoices: [], payments: [] } });
  }

  const tenantId = req.auth!.tenantId;

  const clients = memStore.data.clients
    .filter((c) => c.tenantId === tenantId && (c.name.toLowerCase().includes(q) || (c.gstin && c.gstin.toLowerCase().includes(q))))
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.name, subtitle: c.gstin || c.code, type: 'client', link: `/app/clients/${c.id}` }));

  const invoices = memStore.data.invoices
    .filter((i) => i.tenantId === tenantId && (i.number.toLowerCase().includes(q) || (i.reference && i.reference.toLowerCase().includes(q))))
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.number, subtitle: `Total ₹${i.total} • ${i.status}`, type: 'invoice', link: `/app/invoices/${i.id}` }));

  const payments = memStore.data.payments
    .filter((p) => p.tenantId === tenantId && p.reference && p.reference.toLowerCase().includes(q))
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: `Payment ${p.reference}`, subtitle: `Amount ₹${p.amount} • ${p.receivedOn}`, type: 'payment', link: `/app/payments` }));

  res.json({
    data: { clients, invoices, payments },
    meta: { requestId: req.auth!.requestId },
  });
});
