import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';

export const collectionsRouter = Router();

collectionsRouter.get('/today', async (req: AuthenticatedRequest, res) => {
  const todayData = await dbStore.getTodayActions(req.auth!.tenantId);
  res.json({ data: todayData, meta: { requestId: req.auth!.requestId } });
});

collectionsRouter.get('/promises', async (req: AuthenticatedRequest, res) => {
  const promises = memStore.data.activities.filter(
    (a) => a.tenantId === req.auth!.tenantId && (a.type === 'PROMISE_TO_PAY' || Boolean(a.promisedDate))
  );

  const enriched = promises.map((p) => {
    const inv = memStore.data.invoices.find((i) => i.id === p.invoiceId);
    const client = inv ? memStore.data.clients.find((c) => c.id === inv.clientId) : null;
    return {
      ...p,
      invoice: inv ? { number: inv.number, total: inv.total, balanceDue: inv.balanceDue } : null,
      client: client ? { name: client.name } : null,
    };
  });

  res.json({ data: enriched, meta: { total: enriched.length, requestId: req.auth!.requestId } });
});

collectionsRouter.get('/disputes', (req: AuthenticatedRequest, res) => {
  const disputes = memStore.data.disputes.filter((d) => d.tenantId === req.auth!.tenantId);
  const enriched = disputes.map((d) => {
    const inv = memStore.data.invoices.find((i) => i.id === d.invoiceId);
    const client = inv ? memStore.data.clients.find((c) => c.id === inv.clientId) : null;
    return {
      ...d,
      invoice: inv ? { number: inv.number, balanceDue: inv.balanceDue } : null,
      client: client ? { name: client.name } : null,
    };
  });
  res.json({ data: enriched, meta: { total: enriched.length, requestId: req.auth!.requestId } });
});
