import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { memStore, dbStore } from '../db/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SignupSchema, LoginSchema } from '../shared/schemas.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.post('/signup', validateBody(SignupSchema), async (req, res) => {
  const { email, password, fullName, businessName } = req.body;

  const existing = memStore.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'A user with this email address already exists' },
    });
  }

  const userId = uuidv4();
  const tenantId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    fullName,
    passwordHash,
    locale: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newTenant = {
    id: tenantId,
    name: businessName,
    legalName: businessName,
    slug,
    status: 'ACTIVE' as const,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    fiscalYearStart: 4,
    defaultDueDays: 30,
    onboardingStep: 'business',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {},
  };

  const newMembership = {
    id: uuidv4(),
    tenantId,
    userId,
    role: 'OWNER' as const,
    status: 'ACTIVE' as const,
    canApprove: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memStore.data.users.push(newUser);
  memStore.data.memberships.push(newMembership);

  const token = jwt.sign(
    { userId, tenantId, email: newUser.email, role: 'OWNER' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    data: {
      token,
      user: { id: userId, email: newUser.email, fullName: newUser.fullName },
      tenant: newTenant,
    },
    meta: { requestId: (req as any).requestId },
  });
});

authRouter.post('/login', validateBody(LoginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = memStore.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' },
    });
  }

  const isMatch = bcrypt.compareSync(password, (user as any).passwordHash || '');
  if (!isMatch) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' },
    });
  }

  const memberships = memStore.data.memberships.filter((m) => m.userId === user.id);
  const activeMembership = memberships[0];

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: activeMembership?.tenantId || memStore.data.tenant.id,
      email: user.email,
      role: activeMembership?.role || 'OWNER',
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    data: {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName },
      tenantId: activeMembership?.tenantId || memStore.data.tenant.id,
      role: activeMembership?.role || 'OWNER',
    },
    meta: { requestId: (req as any).requestId },
  });
});

authRouter.post('/logout', (req, res) => {
  res.json({ data: { success: true }, meta: { requestId: (req as any).requestId } });
});

authRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  const auth = req.auth!;
  const user = memStore.data.users.find((u) => u.id === auth.userId) || memStore.data.users[0];
  const tenant = await dbStore.getTenant(auth.tenantId);
  const memberships = memStore.data.memberships.filter((m) => m.userId === user.id);

  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
      },
      tenant,
      role: auth.role,
      canApprove: auth.canApprove,
      memberships,
    },
    meta: { requestId: auth.requestId },
  });
});

authRouter.post('/me/switch-tenant', (req: AuthenticatedRequest, res) => {
  const { tenantId } = req.body;
  const user = memStore.data.users.find((u) => u.id === req.auth!.userId);
  const membership = memStore.data.memberships.find(
    (m) => m.userId === req.auth!.userId && m.tenantId === tenantId
  );

  if (!membership) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'User is not a member of the requested tenant' },
    });
  }

  const token = jwt.sign(
    { userId: user!.id, tenantId, email: user!.email, role: membership.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    data: { token, tenantId, role: membership.role },
    meta: { requestId: (req as any).requestId },
  });
});

authRouter.post('/forgot-password', (req, res) => {
  res.json({
    data: { message: 'If an account exists, a password reset link has been sent.' },
    meta: { requestId: (req as any).requestId },
  });
});
