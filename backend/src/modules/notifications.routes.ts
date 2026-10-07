import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { memStore } from '../db/store.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const notifs = memStore.data.notifications.filter(
    (n: any) => n.tenantId === req.auth!.tenantId && n.userId === req.auth!.userId
  );
  res.json({ data: notifs, meta: { requestId: req.auth!.requestId } });
});

notificationsRouter.post('/:id/read', (req: AuthenticatedRequest, res) => {
  const notif = memStore.data.notifications.find((n: any) => n.id === req.params.id);
  if (notif) (notif as any).readAt = new Date().toISOString();
  res.json({ data: { success: true }, meta: { requestId: req.auth!.requestId } });
});

notificationsRouter.post('/read-all', (req: AuthenticatedRequest, res) => {
  memStore.data.notifications
    .filter((n: any) => n.tenantId === req.auth!.tenantId && n.userId === req.auth!.userId)
    .forEach((n: any) => (n.readAt = new Date().toISOString()));
  res.json({ data: { success: true }, meta: { requestId: req.auth!.requestId } });
});
