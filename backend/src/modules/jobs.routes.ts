import { Router } from 'express';
import { memStore } from '../db/store.js';
import { v4 as uuidv4 } from 'uuid';

export const internalJobsRouter = Router();

internalJobsRouter.post('/reminders-generate', (req, res) => {
  const overdueInvoices = memStore.data.invoices.filter(
    (inv: any) => ['SENT', 'PART_PAID'].includes(inv.status) && parseFloat(inv.balanceDue) > 0
  );

  let generated = 0;
  for (const inv of overdueInvoices) {
    const existing = memStore.data.reminders.find(
      (r: any) => r.invoiceId === inv.id && r.status === 'DRAFT'
    );
    if (!existing) {
      memStore.data.reminders.push({
        id: uuidv4(),
        tenantId: inv.tenantId,
        invoiceId: inv.id,
        clientId: inv.clientId,
        ruleId: memStore.data.rules[0]?.id || null,
        contactId: null,
        channel: 'EMAIL',
        status: 'DRAFT',
        dedupeKey: `${inv.id}:rule:${new Date().toISOString().split('T')[0]}`,
        dueForDate: new Date().toISOString().split('T')[0] as any,
        subject: `Payment Reminder: Invoice ${inv.number}`,
        body: `Dear client, please review invoice ${inv.number} with outstanding balance ₹${inv.balanceDue}.`,
        toEmail: null,
        toPhone: null,
        requiresApproval: true,
        approvedAt: null,
        skipReason: null,
        sentAt: null,
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      generated += 1;
    }
  }

  res.json({
    data: {
      success: true,
      job: 'reminders.generate',
      remindersDrafted: generated,
      timestamp: new Date().toISOString(),
    },
  });
});

internalJobsRouter.post('/run', (req, res) => {
  const approvedReminders = memStore.data.reminders.filter((r: any) => r.status === 'APPROVED');
  let dispatched = 0;

  for (const rem of approvedReminders) {
    rem.status = 'SENT';
    rem.sentAt = new Date().toISOString();
    rem.attempts += 1;
    dispatched += 1;
  }

  res.json({
    data: {
      success: true,
      job: 'reminders.dispatch',
      dispatchedCount: dispatched,
      timestamp: new Date().toISOString(),
    },
  });
});

internalJobsRouter.post('/weekly-report', (req, res) => {
  res.json({
    data: {
      success: true,
      job: 'report.weekly',
      sentTo: 'demo@pnx.com',
      timestamp: new Date().toISOString(),
    },
  });
});
