import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const bankRouter = Router();

const bankAccounts = [
  {
    id: 'ba111111-1111-1111-1111-111111111111',
    name: 'HDFC Current A/C (Operations)',
    bankName: 'HDFC Bank',
    last4: '4821',
    ifsc: 'HDFC0000123',
    isActive: true,
  },
];

const bankTransactions = [
  {
    id: 'tx111111-1111-1111-1111-111111111111',
    txnDate: '2026-10-06',
    narration: 'CMS/NEFT/HDFC000123/TECHCORP INDIA PVT',
    credit: '141600.00',
    debit: '0.00',
    reference: 'HDFC9821441',
    matchStatus: 'SUGGESTED',
    suggestedClientId: 'c1111111-1111-1111-1111-111111111111',
  },
];

bankRouter.get('/accounts', (req: AuthenticatedRequest, res) => {
  res.json({ data: bankAccounts, meta: { requestId: req.auth!.requestId } });
});

bankRouter.get('/transactions', (req: AuthenticatedRequest, res) => {
  res.json({ data: bankTransactions, meta: { total: bankTransactions.length, requestId: req.auth!.requestId } });
});

bankRouter.post('/transactions/:id/match', (req: AuthenticatedRequest, res) => {
  const tx = bankTransactions.find((t) => t.id === req.params.id);
  if (tx) tx.matchStatus = 'MATCHED';
  res.json({ data: tx, meta: { requestId: req.auth!.requestId } });
});

bankRouter.post('/transactions/:id/ignore', (req: AuthenticatedRequest, res) => {
  const tx = bankTransactions.find((t) => t.id === req.params.id);
  if (tx) tx.matchStatus = 'IGNORED';
  res.json({ data: tx, meta: { requestId: req.auth!.requestId } });
});
