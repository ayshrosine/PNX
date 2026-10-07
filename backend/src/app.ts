import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import { authRouter } from './modules/auth.routes.js';
import { tenantRouter } from './modules/tenant.routes.js';
import { clientsRouter } from './modules/clients.routes.js';
import { invoicesRouter } from './modules/invoices.routes.js';
import { paymentsRouter } from './modules/payments.routes.js';
import { remindersRouter } from './modules/reminders.routes.js';
import { collectionsRouter } from './modules/collections.routes.js';
import { reportsRouter } from './modules/reports.routes.js';
import { portalRouter } from './modules/portal.routes.js';
import { importsRouter } from './modules/imports.routes.js';
import { bankRouter } from './modules/bank.routes.js';
import { billingRouter } from './modules/billing.routes.js';
import { notificationsRouter } from './modules/notifications.routes.js';
import { auditRouter } from './modules/audit.routes.js';
import { searchRouter } from './modules/search.routes.js';
import { internalJobsRouter } from './modules/jobs.routes.js';

export const app = express();

// Global middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(requestIdMiddleware);

// Health check
app.get(['/healthz', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Public Portal routes (No login required)
app.use('/public', portalRouter);
app.use('/api/v1/public', portalRouter);

// Internal cron job endpoints
app.use('/api/internal/jobs', internalJobsRouter);

// Authentication routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/me', authRouter);

// Authenticated API endpoints (with tenancy & RBAC)
app.use('/api/v1/tenant', authMiddleware, tenantRouter);
app.use('/api/v1/clients', authMiddleware, clientsRouter);
app.use('/api/v1/invoices', authMiddleware, invoicesRouter);
app.use('/api/v1/payments', authMiddleware, paymentsRouter);
app.use('/api/v1/reminders', authMiddleware, remindersRouter);
app.use('/api/v1/reminder-templates', authMiddleware, remindersRouter);
app.use('/api/v1/reminder-rules', authMiddleware, remindersRouter);
app.use('/api/v1/actions', authMiddleware, collectionsRouter);
app.use('/api/v1/disputes', authMiddleware, collectionsRouter);
app.use('/api/v1/reports', authMiddleware, reportsRouter);
app.use('/api/v1/dashboard', authMiddleware, reportsRouter);
app.use('/api/v1/imports', authMiddleware, importsRouter);
app.use('/api/v1/bank', authMiddleware, bankRouter);
app.use('/api/v1/billing', authMiddleware, billingRouter);
app.use('/api/v1/notifications', authMiddleware, notificationsRouter);
app.use('/api/v1/audit', authMiddleware, auditRouter);
app.use('/api/v1/search', authMiddleware, searchRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      requestId: (req as any).requestId,
    },
  });
});

// Error handling middleware
app.use(errorHandler);
