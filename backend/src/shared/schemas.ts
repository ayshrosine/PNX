import { z } from 'zod';
import { GSTIN_REGEX } from './gst.js';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  businessName: z.string().min(2),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const TenantProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional().nullable(),
  gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().nullable(),
  pan: z.string().optional().nullable(),
  stateCode: z.string().length(2).optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  bankName: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountLast4: z.string().length(4).optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  invoiceFooter: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  defaultNotes: z.string().optional().nullable(),
  defaultDueDays: z.number().int().min(0).max(365).optional(),
});

export const TenantSettingsUpdateSchema = z.object({
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  sendOnWeekends: z.boolean().optional(),
  weeklyReportDay: z.number().int().min(0).max(6).optional(),
  defaultDueDays: z.number().int().min(0).max(365).optional(),
});

export const ClientCreateSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  displayName: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
  pan: z.string().optional().nullable(),
  msmeClass: z.enum(['UNKNOWN', 'MICRO', 'SMALL', 'MEDIUM', 'NOT_MSME']).default('UNKNOWN'),
  udyamNumber: z.string().optional().nullable(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().length(2).optional().nullable(),
  pincode: z.string().optional().nullable(),
  reminderTone: z.enum(['FRIENDLY', 'NEUTRAL', 'FIRM']).default('NEUTRAL'),
  creditLimit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
  }).optional(),
});

export const ContactCreateSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  isBilling: z.boolean().default(true),
  consentEmail: z.boolean().default(true),
  consentWhatsapp: z.boolean().default(false),
});

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  hsnSac: z.string().optional().nullable(),
  quantity: z.union([z.string(), z.number()]).default(1),
  unit: z.string().default('NOS'),
  rate: z.union([z.string(), z.number()]),
  discountPct: z.union([z.string(), z.number()]).default(0),
  taxRate: z.union([z.string(), z.number()]).default(18),
});

export const InvoiceCreateSchema = z.object({
  clientId: z.string().uuid(),
  seriesId: z.string().uuid().optional().nullable(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  poNumber: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  placeOfSupply: z.string().length(2).optional().nullable(),
  isReverseCharge: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1, 'Invoice must have at least one line item'),
});

export const InvoiceSendSchema = z.object({
  channels: z.array(z.enum(['EMAIL', 'WHATSAPP', 'SMS'])).default(['EMAIL']),
  contactIds: z.array(z.string().uuid()).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  attachPdf: z.boolean().default(true),
});

export const PaymentAllocationInputSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  tdsAmount: z.union([z.string(), z.number()]).optional().default(0),
});

export const PaymentCreateSchema = z.object({
  clientId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  tdsAmount: z.union([z.string(), z.number()]).optional().default(0),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'CARD', 'GATEWAY', 'OTHER']).default('BANK_TRANSFER'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  autoAllocate: z.boolean().optional().default(false),
  allocations: z.array(PaymentAllocationInputSchema).optional(),
});

export const ActivityCreateSchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'PROMISE_TO_PAY', 'STATUS_CHANGE', 'SYSTEM']),
  body: z.string().optional().nullable(),
  promisedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  promisedAmount: z.union([z.string(), z.number()]).optional().nullable(),
});

export const DisputeCreateSchema = z.object({
  reason: z.string().min(1),
});

export const ReminderRuleCreateSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  triggerType: z.enum(['BEFORE_DUE', 'ON_DUE', 'AFTER_DUE']),
  offsetDays: z.number().int().min(0).max(365).default(0),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']).default('EMAIL'),
  templateId: z.string().uuid(),
  requiresApproval: z.boolean().default(true),
  minBalance: z.union([z.string(), z.number()]).optional().nullable(),
  escalateToOwner: z.boolean().default(false),
});

export const ReminderTemplateCreateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']).default('EMAIL'),
  tone: z.enum(['FRIENDLY', 'NEUTRAL', 'FIRM']).default('NEUTRAL'),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  language: z.string().default('en'),
});
