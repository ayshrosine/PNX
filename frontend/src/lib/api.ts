const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const PUBLIC_BASE = API_BASE.replace('/api/v1', '/public');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('pnx_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err: any) {
    console.error(`API Error on ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    signup: (data: { email: string; password: string; fullName: string; businessName: string }) =>
      request<any>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request<any>('/auth/me'),
    logout: () => {
      if (typeof window !== 'undefined') localStorage.removeItem('pnx_token');
      return Promise.resolve();
    },
  },

  // Today Action List
  today: {
    get: () => request<{ data: any }>('/actions/today'),
  },

  // Dashboard & Reports
  dashboard: {
    get: () => request<{ data: any }>('/dashboard'),
  },

  reports: {
    receivables: () => request<{ data: any[] }>('/reports/receivables-summary'),
    ageing: () => request<{ data: any[] }>('/reports/ageing'),
    collections: () => request<{ data: any[] }>('/reports/collections'),
    tds: () => request<{ data: any[] }>('/reports/tds'),
    msmeClock: () => request<{ data: any[] }>('/reports/msme-clock'),
    invoiceRegister: () => request<{ data: any[] }>('/reports/invoice-register'),
  },

  // Invoices
  invoices: {
    list: (params?: { clientId?: string; status?: string; q?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<{ data: any[] }>(`/invoices${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<{ data: any }>(`/invoices/${id}`),
    create: (data: any) => request<{ data: any }>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    preview: (data: any) => request<{ data: any }>('/invoices/preview', { method: 'POST', body: JSON.stringify(data) }),
    getNextNumber: () => request<{ data: { nextNumber: string } }>('/invoices/next-number'),
    update: (id: string, data: any) => request<{ data: any }>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    issue: (id: string) => request<{ data: any }>(`/invoices/${id}/issue`, { method: 'POST' }),
    send: (id: string, data: any) => request<{ data: any }>(`/invoices/${id}/send`, { method: 'POST', body: JSON.stringify(data) }),
    duplicate: (id: string) => request<{ data: any }>(`/invoices/${id}/duplicate`, { method: 'POST' }),
    void: (id: string, reason?: string) => request<{ data: any }>(`/invoices/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) }),
    delete: (id: string) => request<{ data: any }>(`/invoices/${id}`, { method: 'DELETE' }),
    addActivity: (id: string, data: any) => request<{ data: any }>(`/invoices/${id}/activities`, { method: 'POST', body: JSON.stringify(data) }),
    addDispute: (id: string, data: any) => request<{ data: any }>(`/invoices/${id}/dispute`, { method: 'POST', body: JSON.stringify(data) }),
    getPdfBlobUrl: (id: string) => `${API_BASE}/invoices/${id}/pdf`,
  },

  // Clients
  clients: {
    list: (params?: { q?: string; archived?: boolean }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<{ data: any[] }>(`/clients${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<{ data: any }>(`/clients/${id}`),
    create: (data: any) => request<{ data: any }>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ data: any }>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pauseReminders: (id: string, data: any) => request<{ data: any }>(`/clients/${id}/pause-reminders`, { method: 'POST', body: JSON.stringify(data) }),
    resumeReminders: (id: string) => request<{ data: any }>(`/clients/${id}/resume-reminders`, { method: 'POST' }),
    addContact: (id: string, data: any) => request<{ data: any }>(`/clients/${id}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
    getStatement: (id: string) => request<{ data: any }>(`/clients/${id}/statement`),
  },

  // Payments
  payments: {
    list: () => request<{ data: any[] }>('/payments'),
    get: (id: string) => request<{ data: any }>(`/payments/${id}`),
    record: (data: any) => request<{ data: any }>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Reminders
  reminders: {
    list: (status?: string) => request<{ data: any[] }>(`/reminders${status ? `?status=${status}` : ''}`),
    approve: (id: string) => request<{ data: any }>(`/reminders/${id}/approve`, { method: 'POST' }),
    skip: (id: string, reason?: string) => request<{ data: any }>(`/reminders/${id}/skip`, { method: 'POST', body: JSON.stringify({ reason }) }),
    sendNow: (id: string) => request<{ data: any }>(`/reminders/${id}/send-now`, { method: 'POST' }),
    bulk: (ids: string[], action: 'approve' | 'skip') => request<{ data: any }>('/reminders/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }),
    templates: () => request<{ data: any[] }>('/reminders/templates/list'),
    createTemplate: (data: any) => request<{ data: any }>('/reminders/templates', { method: 'POST', body: JSON.stringify(data) }),
    rules: () => request<{ data: any[] }>('/reminders/rules/list'),
    createRule: (data: any) => request<{ data: any }>('/reminders/rules', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Imports
  imports: {
    create: (data: { kind: string; fileName: string }) => request<{ data: any }>('/imports', { method: 'POST', body: JSON.stringify(data) }),
    commit: (id: string, duplicateStrategy: string) => request<{ data: any }>(`/imports/${id}/commit`, { method: 'POST', body: JSON.stringify({ duplicateStrategy }) }),
    getTemplateUrl: (kind: string) => `${API_BASE}/imports/templates/${kind}`,
  },

  // Bank
  bank: {
    accounts: () => request<{ data: any[] }>('/bank/accounts'),
    transactions: () => request<{ data: any[] }>('/bank/transactions'),
    match: (id: string) => request<{ data: any }>(`/bank/transactions/${id}/match`, { method: 'POST' }),
    ignore: (id: string) => request<{ data: any }>(`/bank/transactions/${id}/ignore`, { method: 'POST' }),
  },

  // Billing
  billing: {
    plans: () => request<{ data: any[] }>('/billing/plans'),
    subscription: () => request<{ data: any }>('/billing/subscription'),
  },

  // Tenant
  tenant: {
    get: () => request<{ data: any }>('/tenant'),
    update: (data: any) => request<{ data: any }>('/tenant', { method: 'PATCH', body: JSON.stringify(data) }),
    updateSettings: (data: any) => request<{ data: any }>('/tenant/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    updateOnboarding: (step: string) => request<{ data: any }>('/tenant/onboarding', { method: 'PATCH', body: JSON.stringify({ step }) }),
    members: () => request<{ data: any[] }>('/tenant/members'),
    series: () => request<{ data: any[] }>('/tenant/series'),
  },

  // Search (⌘K)
  search: {
    query: (q: string) => request<{ data: { clients: any[]; invoices: any[]; payments: any[] } }>(`/search?q=${encodeURIComponent(q)}`),
  },

  // Notifications
  notifications: {
    list: () => request<{ data: any[] }>('/notifications'),
    read: (id: string) => request<{ data: any }>(`/notifications/${id}/read`, { method: 'POST' }),
    readAll: () => request<{ data: any }>('/notifications/read-all', { method: 'POST' }),
  },

  // Audit
  audit: {
    list: () => request<{ data: any[] }>('/audit'),
  },

  // Public Portal (No login)
  portal: {
    getInvoice: (token: string) => request<{ data: any }>(`${PUBLIC_BASE}/invoices/${token}`),
    acknowledge: (token: string) => request<{ data: any }>(`${PUBLIC_BASE}/invoices/${token}/acknowledge`, { method: 'POST' }),
    promise: (token: string, data: { promisedDate: string; message?: string }) =>
      request<{ data: any }>(`${PUBLIC_BASE}/invoices/${token}/promise`, { method: 'POST', body: JSON.stringify(data) }),
    dispute: (token: string, data: { message: string; contactEmail?: string }) =>
      request<{ data: any }>(`${PUBLIC_BASE}/invoices/${token}/dispute`, { method: 'POST', body: JSON.stringify(data) }),
    getPdfUrl: (token: string) => `${PUBLIC_BASE}/invoices/${token}/pdf`,
  },
};
