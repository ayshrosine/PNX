export type Role = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PART_PAID' | 'PAID' | 'VOID' | 'WRITTEN_OFF';
export type PaymentMode = 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH' | 'CARD' | 'GATEWAY' | 'OTHER';
export type Channel = 'EMAIL' | 'WHATSAPP' | 'SMS';
export type ReminderStatus = 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
export type TriggerType = 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE';
export type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'WHATSAPP' | 'PROMISE_TO_PAY' | 'STATUS_CHANGE' | 'SYSTEM';
export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type MsmeClass = 'UNKNOWN' | 'MICRO' | 'SMALL' | 'MEDIUM' | 'NOT_MSME';
export type Tone = 'FRIENDLY' | 'NEUTRAL' | 'FIRM';

export type Permission =
  | 'tenant:manage'
  | 'billing:manage'
  | 'members:manage'
  | 'invoice:create'
  | 'invoice:edit'
  | 'invoice:send'
  | 'invoice:void'
  | 'invoice:read'
  | 'payment:record'
  | 'payment:reverse'
  | 'payment:read'
  | 'reminder:approve'
  | 'reminder:read'
  | 'rules:manage'
  | 'templates:manage'
  | 'client:create'
  | 'client:edit'
  | 'client:read'
  | 'import:run'
  | 'report:view'
  | 'report:export'
  | 'audit:view'
  | 'data:export'
  | 'data:erase';

export interface AuthContext {
  userId: string;
  email: string;
  fullName?: string;
  tenantId: string;
  role: Role;
  canApprove: boolean;
  requestId: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    requestId?: string;
    total: number;
    nextCursor?: string | null;
  };
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}
