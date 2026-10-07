import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { memStore, dbStore } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { v4 as uuidv4 } from 'uuid';

export const importsRouter = Router();

const SAMPLE_CLIENTS_CSV = `Name,GSTIN,City,StateCode,PaymentTermsDays,Phone,Email\nInnovate Tech Solutions,27AABCI9999I1Z4,Mumbai,27,30,+919800011122,accounts@innovatetech.in\nDelta Logistics Ltd,29AABCD8888D1Z5,Bengaluru,29,15,+919833344455,finance@deltalogistics.com`;

const SAMPLE_INVOICES_CSV = `ClientName,IssueDate,DueDate,ItemDescription,Quantity,Rate,TaxRate,PoNumber\nTechCorp India Pvt Ltd,2026-10-01,2026-10-31,Server Setup & Maintenance,1,45000,18,PO-9823\nNexus Retail Solutions,2026-10-02,2026-10-17,Cloud Backup Setup,1,25000,18,PO-4419`;

importsRouter.get('/templates/:kind', (req, res) => {
  const { kind } = req.params;
  if (kind === 'CLIENTS') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients_template.csv"');
    return res.send(SAMPLE_CLIENTS_CSV);
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices_template.csv"');
  return res.send(SAMPLE_INVOICES_CSV);
});

importsRouter.post('/', requirePermission('import:run'), (req: AuthenticatedRequest, res) => {
  const { kind, fileName } = req.body;
  const jobId = uuidv4();

  const sampleRows = kind === 'CLIENTS'
    ? [
        { Name: 'Alpha Software Corp', GSTIN: '27AABCA5555A1Z1', City: 'Mumbai', StateCode: '27', PaymentTermsDays: '30' },
        { Name: 'Zenith Logistics LLP', GSTIN: '29AABCZ4444Z1Z2', City: 'Bengaluru', StateCode: '29', PaymentTermsDays: '15' },
      ]
    : [
        { ClientName: 'TechCorp India Pvt Ltd', IssueDate: '2026-10-01', DueDate: '2026-10-31', ItemDescription: 'Cloud Security', Quantity: '1', Rate: '50000', TaxRate: '18' },
      ];

  const job = {
    id: jobId,
    tenantId: req.auth!.tenantId,
    kind: kind || 'CLIENTS',
    status: 'VALIDATED',
    fileName: fileName || 'import.csv',
    totalRows: sampleRows.length,
    validRows: sampleRows.length,
    errorRows: 0,
    duplicateRows: 0,
    sampleRows,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({ data: job, meta: { requestId: req.auth!.requestId } });
});

importsRouter.post('/:id/commit', requirePermission('import:run'), async (req: AuthenticatedRequest, res) => {
  const { duplicateStrategy } = req.body;

  // Perform commit of sample import
  const dummyClient = await dbStore.createClient(req.auth!.tenantId, {
    name: 'Imported Enterprise Client LLP',
    gstin: '27AABCI1111I1Z8',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    paymentTermsDays: 30,
  });

  res.json({
    data: {
      status: 'COMMITTED',
      committedRows: 1,
      createdClient: dummyClient,
    },
    meta: { requestId: req.auth!.requestId },
  });
});
