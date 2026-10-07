import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { memStore } from '../db/store.js';

export const billingRouter = Router();

billingRouter.get('/plans', (req, res) => {
  res.json({ data: memStore.data.plans });
});

billingRouter.get('/subscription', (req: AuthenticatedRequest, res) => {
  res.json({
    data: {
      plan: memStore.data.plans[1], // Growth plan
      status: 'ACTIVE',
      currentPeriodEnd: '2027-04-01T00:00:00.000Z',
      usage: {
        invoicesThisMonth: memStore.data.invoices.length,
        invoiceLimit: 300,
        remindersSent: 42,
      },
    },
    meta: { requestId: req.auth!.requestId },
  });
});
