import { v4 as uuidv4 } from 'uuid';
import { getInitialSeedData, DEMO_TENANT_ID, DEMO_USER_ID } from './seed-data.js';
import { isDbConnected, getPrismaClient } from './client.js';
import { computeInvoiceTotals, LineItemInput } from '../shared/gst.js';

class InMemoryStore {
  public data: ReturnType<typeof getInitialSeedData>;

  constructor() {
    this.data = getInitialSeedData();
  }

  reset() {
    this.data = getInitialSeedData();
  }
}

export const memStore = new InMemoryStore();

export function calculateDerivedState(invoice: any) {
  const today = new Date().toISOString().split('T')[0];
  const dueDateStr = typeof invoice.dueDate === 'string' 
    ? invoice.dueDate.split('T')[0] 
    : invoice.dueDate instanceof Date 
      ? invoice.dueDate.toISOString().split('T')[0] 
      : '';

  const balance = parseFloat(invoice.balanceDue || '0');
  const isPending = ['SENT', 'PART_PAID'].includes(invoice.status) && balance > 0;
  
  let daysOverdue = 0;
  let isOverdue = false;
  let isDueSoon = false;
  let bucket: string | null = null;

  if (isPending && dueDateStr) {
    const dueTime = new Date(dueDateStr).getTime();
    const todayTime = new Date(today).getTime();
    const diffDays = Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      isOverdue = true;
      daysOverdue = diffDays;
      if (daysOverdue <= 15) bucket = '1-15';
      else if (daysOverdue <= 30) bucket = '16-30';
      else if (daysOverdue <= 45) bucket = '31-45';
      else if (daysOverdue <= 60) bucket = '46-60';
      else bucket = '60+';
    } else if (diffDays >= -7 && diffDays <= 0) {
      isDueSoon = true;
      bucket = 'CURRENT';
    } else {
      bucket = 'CURRENT';
    }
  }

  return {
    state: invoice.status,
    isOverdue,
    isDueSoon,
    daysOverdue,
    bucket,
  };
}

export const dbStore = {
  // Tenant
  async getTenant(tenantId: string) {
    return memStore.data.tenant;
  },

  async updateTenant(tenantId: string, updates: any) {
    Object.assign(memStore.data.tenant, updates, { updatedAt: new Date().toISOString() });
    return memStore.data.tenant;
  },

  async getMembers(tenantId: string) {
    return memStore.data.memberships.map((m) => {
      const user = memStore.data.users.find((u) => u.id === m.userId);
      return {
        ...m,
        user,
      };
    });
  },

  // Clients
  async getClients(tenantId: string, query?: { q?: string; archived?: boolean }) {
    let list = memStore.data.clients.filter((c) => c.tenantId === tenantId);
    if (!query?.archived) {
      list = list.filter((c) => !c.archivedAt);
    }
    if (query?.q) {
      const term = query.q.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.gstin && c.gstin.toLowerCase().includes(term)) ||
          (c.code && c.code.toLowerCase().includes(term))
      );
    }

    // Attach balances
    return list.map((client) => {
      const clientInvoices = memStore.data.invoices.filter(
        (inv) => inv.tenantId === tenantId && inv.clientId === client.id && ['SENT', 'PART_PAID'].includes(inv.status)
      );

      let outstanding = 0;
      let overdue = 0;
      let overdueCount = 0;
      let oldestDue: string | null = null;

      const today = new Date().toISOString().split('T')[0];

      for (const inv of clientInvoices) {
        const bal = parseFloat(inv.balanceDue || '0');
        outstanding += bal;
        const dueStr = inv.dueDate.split('T')[0];
        if (dueStr < today) {
          overdue += bal;
          overdueCount += 1;
          if (!oldestDue || dueStr < oldestDue) {
            oldestDue = dueStr;
          }
        }
      }

      return {
        ...client,
        balances: {
          outstanding: outstanding.toFixed(2),
          overdue: overdue.toFixed(2),
          overdueCount,
          oldestDue,
        },
      };
    });
  },

  async getClientById(tenantId: string, id: string) {
    const client = memStore.data.clients.find((c) => c.tenantId === tenantId && c.id === id);
    if (!client) return null;

    const contacts = memStore.data.contacts.filter((ct) => ct.clientId === id && ct.tenantId === tenantId);
    const invoices = await this.getInvoices(tenantId, { clientId: id });
    const payments = memStore.data.payments.filter((p) => p.clientId === id && p.tenantId === tenantId);

    return {
      ...client,
      contacts,
      invoices,
      payments,
    };
  },

  async createClient(tenantId: string, data: any) {
    const newClient = {
      id: uuidv4(),
      tenantId,
      name: data.name,
      displayName: data.displayName || data.name,
      code: data.code || `CUST-${memStore.data.clients.length + 1}`,
      gstin: data.gstin ? data.gstin.toUpperCase() : null,
      pan: data.pan ? data.pan.toUpperCase() : (data.gstin ? data.gstin.substring(2, 12).toUpperCase() : null),
      msmeClass: data.msmeClass || 'UNKNOWN',
      udyamNumber: data.udyamNumber || null,
      paymentTermsDays: data.paymentTermsDays || 30,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      stateCode: data.stateCode || (data.gstin ? data.gstin.substring(0, 2) : null),
      pincode: data.pincode || null,
      country: 'IN',
      reminderTone: data.reminderTone || 'NEUTRAL',
      remindersPaused: false,
      creditLimit: data.creditLimit || null,
      notes: data.notes || null,
      tags: data.tags || [],
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memStore.data.clients.unshift(newClient);

    if (data.contact) {
      const newContact = {
        id: uuidv4(),
        tenantId,
        clientId: newClient.id,
        name: data.contact.name,
        designation: data.contact.designation || null,
        email: data.contact.email || null,
        phone: data.contact.phone || null,
        whatsappNumber: data.contact.phone || null,
        isPrimary: true,
        isBilling: true,
        consentEmail: true,
        consentWhatsapp: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memStore.data.contacts.push(newContact);
    }

    return newClient;
  },

  async updateClient(tenantId: string, id: string, updates: any) {
    const client = memStore.data.clients.find((c) => c.tenantId === tenantId && c.id === id);
    if (!client) return null;
    Object.assign(client, updates, { updatedAt: new Date().toISOString() });
    return client;
  },

  // Invoices
  async getInvoices(tenantId: string, filters?: { clientId?: string; status?: string; q?: string }) {
    let list = memStore.data.invoices.filter((inv) => inv.tenantId === tenantId);

    if (filters?.clientId) {
      list = list.filter((inv) => inv.clientId === filters.clientId);
    }
    if (filters?.status) {
      if (filters.status === 'OVERDUE') {
        const today = new Date().toISOString().split('T')[0];
        list = list.filter((inv) => ['SENT', 'PART_PAID'].includes(inv.status) && inv.dueDate < today && parseFloat(inv.balanceDue) > 0);
      } else {
        list = list.filter((inv) => inv.status === filters.status);
      }
    }
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          (inv.reference && inv.reference.toLowerCase().includes(q)) ||
          (inv.poNumber && inv.poNumber.toLowerCase().includes(q))
      );
    }

    return list.map((inv) => {
      const client = memStore.data.clients.find((c) => c.id === inv.clientId);
      const derived = calculateDerivedState(inv);
      return {
        ...inv,
        client: client ? { id: client.id, name: client.name, gstin: client.gstin } : null,
        derived,
      };
    });
  },

  async getInvoiceById(tenantId: string, id: string) {
    const inv = memStore.data.invoices.find((i) => (i.id === id || i.publicToken === id) && (tenantId ? i.tenantId === tenantId : true));
    if (!inv) return null;

    const client = memStore.data.clients.find((c) => c.id === inv.clientId);
    const contacts = client ? memStore.data.contacts.filter((ct) => ct.clientId === client.id) : [];
    const activities = memStore.data.activities.filter((a) => a.invoiceId === inv.id);
    const reminders = memStore.data.reminders.filter((r) => r.invoiceId === inv.id);
    const payments = memStore.data.payments.filter((p) =>
      p.allocations.some((al: any) => al.invoiceId === inv.id)
    );
    const derived = calculateDerivedState(inv);

    return {
      ...inv,
      client,
      contacts,
      activities,
      reminders,
      payments,
      derived,
    };
  },

  async createInvoice(tenantId: string, data: any) {
    const tenant = await this.getTenant(tenantId);
    const client = memStore.data.clients.find((c) => c.id === data.clientId);
    if (!client) throw new Error('Client not found');

    const totals = computeInvoiceTotals(
      tenant.stateCode,
      data.placeOfSupply || client.stateCode || tenant.stateCode,
      data.items
    );

    const invoiceId = uuidv4();
    const shortCode = Math.random().toString(36).substring(2, 7);

    const newInvoice = {
      id: invoiceId,
      tenantId,
      clientId: data.clientId,
      seriesId: data.seriesId || DEMO_SERIES_ID,
      number: `DRAFT-${shortCode}`,
      status: 'DRAFT',
      source: 'MANUAL',
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      currency: 'INR',
      placeOfSupply: data.placeOfSupply || client.stateCode || tenant.stateCode,
      isReverseCharge: Boolean(data.isReverseCharge),
      isInterState: totals.isInterState,
      poNumber: data.poNumber || null,
      reference: data.reference || null,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      cess: totals.cess,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      total: totals.total,
      amountPaid: '0.00',
      amountCredited: '0.00',
      balanceDue: totals.total,
      notes: data.notes || tenant.defaultNotes || null,
      terms: data.terms || tenant.defaultTerms || null,
      publicToken: `token-${uuidv4()}`,
      sentAt: null,
      viewCount: 0,
      isDisputed: false,
      remindersPaused: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: totals.items.map((it) => ({
        ...it,
        id: uuidv4(),
        tenantId,
        invoiceId,
      })),
    };

    memStore.data.invoices.unshift(newInvoice);
    return newInvoice;
  },

  async issueAndSendInvoice(tenantId: string, id: string, options: any) {
    const inv = memStore.data.invoices.find((i) => i.id === id && i.tenantId === tenantId);
    if (!inv) throw new Error('Invoice not found');

    if (inv.status === 'DRAFT') {
      const s = memStore.data.series.find((sr) => sr.id === inv.seriesId) || memStore.data.series[0];
      const seq = s.nextNumber;
      s.nextNumber += 1;
      const numStr = String(seq).padStart(s.padding, '0');
      inv.number = `${s.prefix}${s.fiscalYear}/${numStr}${s.suffix}`;
      inv.status = 'SENT';
      inv.sentAt = new Date().toISOString();
    }

    inv.version += 1;
    inv.updatedAt = new Date().toISOString();

    // Log Activity
    memStore.data.activities.push({
      id: uuidv4(),
      tenantId,
      invoiceId: id,
      type: 'EMAIL',
      body: `Invoice ${inv.number} sent to contacts.`,
      promisedDate: null,
      promisedAmount: null,
      createdAt: new Date().toISOString(),
    });

    // Write audit log
    memStore.data.auditLogs.unshift({
      id: uuidv4(),
      tenantId,
      actorId: DEMO_USER_ID,
      actorType: 'USER',
      action: 'invoice.sent',
      entity: 'invoice',
      entityId: id,
      before: null,
      after: { number: inv.number, status: inv.status },
      createdAt: new Date().toISOString(),
    });

    return inv;
  },

  // Payments
  async getPayments(tenantId: string) {
    return memStore.data.payments.filter((p) => p.tenantId === tenantId);
  },

  async recordPayment(tenantId: string, data: any) {
    const paymentId = uuidv4();
    const client = memStore.data.clients.find((c) => c.id === data.clientId);
    if (!client) throw new Error('Client not found');

    const totalAmount = parseFloat(data.amount);
    const tds = parseFloat(data.tdsAmount || '0');

    let allocations: any[] = [];
    let allocatedTotal = 0;

    if (data.autoAllocate) {
      // Allocate to open invoices oldest first
      const openInvoices = memStore.data.invoices
        .filter((inv) => inv.tenantId === tenantId && inv.clientId === data.clientId && ['SENT', 'PART_PAID'].includes(inv.status))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      let remaining = totalAmount;
      for (const inv of openInvoices) {
        if (remaining <= 0) break;
        const due = parseFloat(inv.balanceDue);
        const alloc = Math.min(remaining, due);
        allocations.push({
          id: uuidv4(),
          tenantId,
          paymentId,
          invoiceId: inv.id,
          amount: alloc.toFixed(2),
          tdsAmount: '0.00',
          createdAt: new Date().toISOString(),
        });
        remaining -= alloc;
        allocatedTotal += alloc;

        // Update invoice balance
        const newPaid = parseFloat(inv.amountPaid) + alloc;
        const newBal = parseFloat(inv.total) - newPaid;
        inv.amountPaid = newPaid.toFixed(2);
        inv.balanceDue = Math.max(0, newBal).toFixed(2);
        inv.status = newBal <= 0 ? 'PAID' : 'PART_PAID';
        if (newBal <= 0) inv.paidAt = new Date().toISOString();
      }
    } else if (data.allocations && data.allocations.length > 0) {
      for (const item of data.allocations) {
        const inv = memStore.data.invoices.find((i) => i.id === item.invoiceId);
        if (inv) {
          const itemAmt = parseFloat(item.amount);
          allocations.push({
            id: uuidv4(),
            tenantId,
            paymentId,
            invoiceId: inv.id,
            amount: itemAmt.toFixed(2),
            tdsAmount: (item.tdsAmount || 0).toFixed(2),
            createdAt: new Date().toISOString(),
          });
          allocatedTotal += itemAmt;

          const newPaid = parseFloat(inv.amountPaid) + itemAmt;
          const newBal = parseFloat(inv.total) - newPaid;
          inv.amountPaid = newPaid.toFixed(2);
          inv.balanceDue = Math.max(0, newBal).toFixed(2);
          inv.status = newBal <= 0 ? 'PAID' : 'PART_PAID';
          if (newBal <= 0) inv.paidAt = new Date().toISOString();
        }
      }
    }

    const unallocated = Math.max(0, totalAmount - allocatedTotal);

    const newPayment = {
      id: paymentId,
      tenantId,
      clientId: data.clientId,
      amount: totalAmount.toFixed(2),
      tdsAmount: tds.toFixed(2),
      allocatedAmount: allocatedTotal.toFixed(2),
      unallocatedAmount: unallocated.toFixed(2),
      receivedOn: data.receivedOn,
      mode: data.mode || 'BANK_TRANSFER',
      reference: data.reference || null,
      notes: data.notes || null,
      allocations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memStore.data.payments.unshift(newPayment);

    // Write audit log
    memStore.data.auditLogs.unshift({
      id: uuidv4(),
      tenantId,
      actorId: DEMO_USER_ID,
      actorType: 'USER',
      action: 'payment.recorded',
      entity: 'payment',
      entityId: paymentId,
      before: null,
      after: { amount: newPayment.amount, reference: newPayment.reference },
      createdAt: new Date().toISOString(),
    });

    return newPayment;
  },

  // Reminders
  async getReminders(tenantId: string, status?: string) {
    let list = memStore.data.reminders.filter((r) => r.tenantId === tenantId);
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    return list.map((rem) => {
      const inv = memStore.data.invoices.find((i) => i.id === rem.invoiceId);
      const cl = memStore.data.clients.find((c) => c.id === rem.clientId);
      return {
        ...rem,
        invoice: inv ? { number: inv.number, total: inv.total, balanceDue: inv.balanceDue, dueDate: inv.dueDate } : null,
        client: cl ? { name: cl.name } : null,
      };
    });
  },

  async approveReminder(tenantId: string, id: string) {
    const rem = memStore.data.reminders.find((r) => r.id === id && r.tenantId === tenantId);
    if (!rem) throw new Error('Reminder not found');
    rem.status = 'APPROVED';
    rem.approvedAt = new Date().toISOString();
    return rem;
  },

  async skipReminder(tenantId: string, id: string, reason?: string) {
    const rem = memStore.data.reminders.find((r) => r.id === id && r.tenantId === tenantId);
    if (!rem) throw new Error('Reminder not found');
    rem.status = 'SKIPPED';
    rem.skipReason = reason || 'Skipped by admin';
    return rem;
  },

  async sendReminderNow(tenantId: string, id: string) {
    const rem = memStore.data.reminders.find((r) => r.id === id && r.tenantId === tenantId);
    if (!rem) throw new Error('Reminder not found');
    rem.status = 'SENT';
    rem.sentAt = new Date().toISOString();
    rem.attempts += 1;
    return rem;
  },

  // Templates & Rules
  async getReminderTemplates(tenantId: string) {
    return memStore.data.templates.filter((t) => t.tenantId === tenantId);
  },

  async getReminderRules(tenantId: string) {
    return memStore.data.rules.filter((r) => r.tenantId === tenantId);
  },

  // Actions & Today
  async getTodayActions(tenantId: string) {
    const reminders = await this.getReminders(tenantId, 'DRAFT');
    const overdueInvoices = (await this.getInvoices(tenantId)).filter((inv) => inv.derived.isOverdue);
    const dueSoonInvoices = (await this.getInvoices(tenantId)).filter((inv) => inv.derived.isDueSoon);
    const draftInvoices = (await this.getInvoices(tenantId)).filter((inv) => inv.status === 'DRAFT');

    const todayStr = new Date().toISOString().split('T')[0];
    const promisesToday = memStore.data.activities.filter((a) => a.tenantId === tenantId && a.promisedDate === todayStr);

    let totalOverdue = 0;
    for (const inv of overdueInvoices) {
      totalOverdue += parseFloat(inv.balanceDue || '0');
    }

    return {
      summary: {
        totalOverdue: totalOverdue.toFixed(2),
        approvalsCount: reminders.length,
        chaseCount: overdueInvoices.length,
        dueSoonCount: dueSoonInvoices.length,
        draftsCount: draftInvoices.length,
      },
      approvalsWaiting: reminders,
      chaseNow: overdueInvoices,
      promisesToday,
      dueSoon: dueSoonInvoices,
      drafts: draftInvoices,
    };
  },

  // Dashboard
  async getDashboardData(tenantId: string) {
    const invoices = await this.getInvoices(tenantId);
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let dueIn7Days = 0;
    let collectedThisMonth = 0;

    const ageingBuckets: Record<string, number> = {
      CURRENT: 0,
      '1-15': 0,
      '16-30': 0,
      '31-45': 0,
      '46-60': 0,
      '60+': 0,
    };

    for (const inv of invoices) {
      const bal = parseFloat(inv.balanceDue || '0');
      if (['SENT', 'PART_PAID'].includes(inv.status)) {
        totalOutstanding += bal;
        if (inv.derived.isOverdue) {
          totalOverdue += bal;
          overdueCount += 1;
        }
        if (inv.derived.isDueSoon) {
          dueIn7Days += bal;
        }
        if (inv.derived.bucket && ageingBuckets[inv.derived.bucket] !== undefined) {
          ageingBuckets[inv.derived.bucket] += bal;
        }
      }
    }

    const payments = memStore.data.payments.filter((p) => p.tenantId === tenantId);
    for (const p of payments) {
      collectedThisMonth += parseFloat(p.amount || '0');
    }

    // Top overdue clients
    const clients = await this.getClients(tenantId);
    const topOverdueClients = clients
      .filter((c) => parseFloat(c.balances.overdue) > 0)
      .sort((a, b) => parseFloat(b.balances.overdue) - parseFloat(a.balances.overdue))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        overdue: c.balances.overdue,
        outstanding: c.balances.outstanding,
      }));

    return {
      kpi: {
        totalOutstanding: totalOutstanding.toFixed(2),
        totalOverdue: totalOverdue.toFixed(2),
        overdueCount,
        dueIn7Days: dueIn7Days.toFixed(2),
        collectedThisMonth: collectedThisMonth.toFixed(2),
        dsoDays: 28, // Days Sales Outstanding calculation
      },
      ageing: [
        { bucket: 'Current', amount: ageingBuckets['CURRENT'] },
        { bucket: '1-15 days', amount: ageingBuckets['1-15'] },
        { bucket: '16-30 days', amount: ageingBuckets['16-30'] },
        { bucket: '31-45 days', amount: ageingBuckets['31-45'] },
        { bucket: '46-60 days', amount: ageingBuckets['46-60'] },
        { bucket: '60+ days', amount: ageingBuckets['60+'] },
      ],
      collectionsTrend: [
        { week: 'W1 Sep', amount: 35000 },
        { week: 'W2 Sep', amount: 50000 },
        { week: 'W3 Sep', amount: 70800 },
        { week: 'W4 Sep', amount: 45000 },
        { week: 'W1 Oct', amount: 50000 },
      ],
      topOverdueClients,
    };
  },

  // Audit
  async getAuditLogs(tenantId: string) {
    return memStore.data.auditLogs.filter((a) => a.tenantId === tenantId);
  },
};
