import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore, memStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { PaymentCreateSchema } from '../shared/schemas.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', requirePermission('payment:read'), async (req: AuthenticatedRequest, res) => {
  const payments = await dbStore.getPayments(req.auth!.tenantId);
  res.json({ data: payments, meta: { total: payments.length, requestId: req.auth!.requestId } });
});

paymentsRouter.post(
  '/',
  requirePermission('payment:record'),
  validateBody(PaymentCreateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const payment = await dbStore.recordPayment(req.auth!.tenantId, req.body);
      res.status(201).json({ data: payment, meta: { requestId: req.auth!.requestId } });
    } catch (err: any) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: err.message, requestId: req.auth!.requestId },
      });
    }
  }
);

paymentsRouter.get('/:id', requirePermission('payment:read'), (req: AuthenticatedRequest, res) => {
  const payment = memStore.data.payments.find(
    (p) => p.id === req.params.id && p.tenantId === req.auth!.tenantId
  );
  if (!payment) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Payment not found', requestId: req.auth!.requestId },
    });
  }
  const client = memStore.data.clients.find((c) => c.id === payment.clientId);
  res.json({
    data: { ...payment, client },
    meta: { requestId: req.auth!.requestId },
  });
});
