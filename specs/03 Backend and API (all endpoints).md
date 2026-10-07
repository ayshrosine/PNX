# Backend & API Document

Stack: Next.js route handlers (TypeScript) under `src/app/api`, Zod validation, service layer, Prisma (tenant-scoped), Supabase Auth/Storage. Base path **`/api/v1`**. All bodies are JSON unless stated.

---

## 1. Conventions

### 1.1 Request pipeline (every route)

1. `requestId` (header `x-request-id` or generated) → logger context.
2. Rate limit (per IP for public routes; per user + tenant for authenticated).
3. Authentication (Supabase session cookie or `Authorization: Bearer <jwt>`); public routes skip.
4. Tenant resolution (signed cookie `tenant`, or header `x-tenant-id` verified against membership).
5. Authorization: `requirePermission(ctx, 'invoice:create')`.
6. Validation: Zod on params, query, body → 422 on failure.
7. Idempotency (POST with header `Idempotency-Key`, stored 24h per tenant + route + key).
8. Service call inside `withTenantTx`.
9. Response envelope + audit entry on mutation.

Helper: `route({ perm, schema: { params, query, body }, handler })` wraps all of this.

### 1.2 Response envelope

```json
// success
{ "data": { ... }, "meta": { "requestId": "..." } }
// list
{ "data": [ ... ], "meta": { "nextCursor": "opaque|null", "total": 123 } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [{ "path": "items.0.rate", "message": "Must be >= 0" }], "requestId": "..." } }
```

### 1.3 Error codes

| HTTP | code | When |
| --- | --- | --- |
| 400 | BAD_REQUEST | Malformed JSON, bad cursor |
| 401 | UNAUTHENTICATED | No/invalid session |
| 403 | FORBIDDEN | Role lacks permission; tenant mismatch |
| 404 | NOT_FOUND | Entity missing in tenant |
| 409 | CONFLICT | Duplicate (invoice number, GSTIN), version mismatch, invalid state transition |
| 412 | VERSION_MISMATCH | `If-Match` version stale |
| 413 | PAYLOAD_TOO_LARGE | Upload > limit |
| 422 | VALIDATION_ERROR | Zod/business validation |
| 429 | RATE_LIMITED | Includes `Retry-After` |
| 402 | PLAN_LIMIT | Plan limit reached (invoices/month, seats) |
| 500 | INTERNAL | Unexpected (logged, Sentry) |
| 503 | DEPENDENCY_UNAVAILABLE | Email/WhatsApp provider down |

### 1.4 Pagination, filtering, sorting

- Cursor pagination: `?limit=25&cursor=<opaque>` (limit max 100, default 25).
- Sorting: `?sort=dueDate:asc` (allow-listed fields per endpoint).
- Search: `?q=` (trigram on name/number).
- Dates: ISO `YYYY-MM-DD`; timestamps ISO 8601 UTC. Money: strings (`"12500.00"`).
- Optimistic concurrency on invoices: send `If-Match: <version>`; server increments `version`.

### 1.5 Rate limits (initial)

| Scope | Limit |
| --- | --- |
| Auth endpoints (per IP) | 10/min |
| Public portal (per IP) | 60/min |
| Authenticated API (per user) | 300/min |
| Send/reminder endpoints (per tenant) | 60/min |
| Import upload (per tenant) | 10/hour |

### 1.6 Security headers (global)

`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, CORS restricted to app origin; mutating requests require same-origin check.

---

## 2. Module map

| Module | Folder | Responsibilities |
| --- | --- | --- |
| identity | `server/modules/identity` | Users, memberships, invites, tenant switch |
| tenants | `.../tenants` | Business profile, settings, onboarding state |
| clients | `.../clients` | Clients, contacts, consent |
| invoices | `.../invoices` | Drafts, issue, numbering, totals/GST, void, write-off, PDF, public portal |
| payments | `.../payments` | Payments, allocations, reversal, TDS |
| creditnotes | `.../creditnotes` | Credit/debit notes |
| collections | `.../collections` | Activities, promises, disputes, daily action list |
| reminders | `.../reminders` | Templates, rules, generation, approval, dispatch, webhooks |
| imports | `.../imports` | Upload, mapping, validation, commit |
| reports | `.../reports` | Dashboard, ageing, collections, statements, exports |
| bank (V1) | `.../bank` | Statement import, matching |
| billing | `.../billing` | Plans, subscription, usage, gateway webhooks |
| notifications | `.../notifications` | In-app + email digests |
| audit | `.../audit` | Audit read API |
| privacy | `.../privacy` | Data export/erase requests |
| jobs | `server/jobs` | Queue, handlers, schedulers |

---

## 3. API endpoint catalogue

Legend: **Perm** uses the RBAC matrix in the architecture doc (O=Owner, A=Admin, C=Accountant, V=Viewer). "Any" means any authenticated member.

### 3.1 Auth and session

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | Public | Create Supabase user + tenant draft (email, password, fullName, businessName) |
| POST | `/auth/login` | Public | Password login (wraps Supabase) |
| POST | `/auth/logout` | Any | Clear session and tenant cookie |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Public | Complete reset |
| POST | `/auth/resend-verification` | Public | Resend verify email |
| GET | `/auth/callback` | Public | OAuth/magic-link/verification callback; upserts `users` |
| POST | `/auth/mfa/enroll` | Any | Start TOTP enrollment |
| POST | `/auth/mfa/verify` | Any | Confirm TOTP |
| DELETE | `/auth/mfa` | Any | Disable MFA (non-owner, or owner with recent MFA) |
| GET | `/me` | Any | Profile, memberships, active tenant, permissions |
| PATCH | `/me` | Any | Update name, phone, locale |
| POST | `/me/switch-tenant` | Any | Body `{tenantId}`; re-issues tenant cookie |
| GET | `/me/sessions` | Any | List active sessions |
| DELETE | `/me/sessions/{id}` | Any | Revoke session |

### 3.2 Tenant (business) and team

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/tenant` | Any | Business profile, settings, onboarding step, plan |
| PATCH | `/tenant` | O | Update profile (GSTIN, state, address, bank details, defaults) |
| POST | `/tenant/logo` | O,A | Get signed upload URL for logo |
| PATCH | `/tenant/settings` | O,A | Quiet hours, weekend sending, weekly report day, default due days |
| PATCH | `/tenant/onboarding` | O,A | Set `onboardingStep` |
| GET | `/tenant/members` | O,A | List members |
| PATCH | `/tenant/members/{id}` | O | Change role/canApprove/status |
| DELETE | `/tenant/members/{id}` | O | Remove member |
| GET | `/tenant/invites` | O | Pending invites |
| POST | `/tenant/invites` | O | Invite `{email, role}` (token emailed; stored hashed) |
| DELETE | `/tenant/invites/{id}` | O | Revoke |
| POST | `/invites/accept` | Auth | Body `{token}`; creates membership |
| GET | `/tenant/series` | Any | Invoice series |
| POST | `/tenant/series` | O,A | Create series |
| PATCH | `/tenant/series/{id}` | O,A | Update (cannot lower `nextNumber`) |
| GET | `/tenant/audit` | O,A,C | See Audit |

### 3.3 Clients and contacts

| Method | Path | Perm | Query/body highlights |
| --- | --- | --- | --- |
| GET | `/clients` | Any | `q, tag, msmeClass, hasOverdue, archived, sort, cursor` |
| POST | `/clients` | O,A | Create (`name` required; GSTIN validated; duplicate GSTIN → 409 warning unless `force=true`) |
| GET | `/clients/{id}` | Any | Includes balances (outstanding, overdue, oldest due) |
| PATCH | `/clients/{id}` | O,A | Update fields, reminder settings, pause |
| POST | `/clients/{id}/archive` | O,A | Archive (blocked if open invoices unless `force`) |
| POST | `/clients/{id}/restore` | O,A | Restore |
| POST | `/clients/{id}/pause-reminders` | O,A | `{until?, reason?}` |
| POST | `/clients/{id}/resume-reminders` | O,A | Resume |
| GET | `/clients/{id}/contacts` | Any | List contacts |
| POST | `/clients/{id}/contacts` | O,A | Add contact (consent flags) |
| PATCH | `/clients/{id}/contacts/{contactId}` | O,A | Update |
| DELETE | `/clients/{id}/contacts/{contactId}` | O,A | Archive contact |
| GET | `/clients/{id}/invoices` | Any | Shortcut for filtered invoices |
| GET | `/clients/{id}/payments` | Any | Payments by client |
| GET | `/clients/{id}/statement` | Any | Statement JSON `?from&to` |
| GET | `/clients/{id}/statement.pdf` | Any | Statement PDF |
| GET | `/clients/{id}/timeline` | Any | Activities, messages, payments merged |
| POST | `/clients/merge` | O,A | `{sourceId, targetId}` (moves invoices/contacts; audit) |
| GET | `/clients/lookup-gstin` | O,A | Validate format only in MVP (no external call) |

### 3.4 Invoices

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/invoices` | Any | Filters: \`status, derived (overdue |
| POST | `/invoices` | O,A | Create **draft** with items; server computes tax and totals |
| GET | `/invoices/{id}` | Any | Full invoice with items, allocations, derived state, last reminders |
| PATCH | `/invoices/{id}` | O,A | Edit draft only (header + replace items); `If-Match` required |
| DELETE | `/invoices/{id}` | O,A | Delete draft only |
| POST | `/invoices/{id}/issue` | O,A | Assign number, set SENT-ready (no email) |
| POST | `/invoices/{id}/send` | O,A | Issue (if draft) + send via channel(s): `{channels:['EMAIL'], contactIds?, subject?, message?}` |
| POST | `/invoices/{id}/mark-sent` | O,A | Mark as sent manually (sent outside the system, with date) |
| POST | `/invoices/{id}/resend` | O,A | Resend to contacts |
| POST | `/invoices/{id}/duplicate` | O,A | New draft copy |
| POST | `/invoices/{id}/void` | O,A | `{reason}`; only if no active allocations |
| POST | `/invoices/{id}/write-off` | O,A | `{reason}` remaining balance written off |
| POST | `/invoices/{id}/reopen` | O | Undo write-off |
| GET | `/invoices/{id}/pdf` | Any | Returns signed URL (regenerate if stale) |
| POST | `/invoices/{id}/regenerate-pdf` | O,A | Force re-render |
| GET | `/invoices/{id}/timeline` | Any | Activities + messages + payments + status changes |
| POST | `/invoices/{id}/activities` | O,A | Add note/call/promise `{type, body, promisedDate?, promisedAmount?}` |
| PATCH | `/invoices/{id}/activities/{aid}` | O,A | Edit own note within 24h |
| POST | `/invoices/{id}/dispute` | O,A | Open dispute `{reason}` (pauses reminders) |
| PATCH | `/invoices/{id}/dispute/{did}` | O,A | Update status/resolution |
| POST | `/invoices/{id}/pause-reminders` | O,A | Per-invoice pause |
| POST | `/invoices/{id}/resume-reminders` | O,A | Resume |
| POST | `/invoices/{id}/regenerate-portal-link` | O,A | New `publicToken` |
| GET | `/invoices/{id}/attachments` | Any | List documents |
| POST | `/invoices/{id}/attachments` | O,A | Signed upload URL + create Document |
| DELETE | `/invoices/{id}/attachments/{docId}` | O,A | Delete |
| POST | `/invoices/preview` | O,A | Compute totals for unsaved payload (used by form live totals) |
| GET | `/invoices/next-number` | O,A | Preview next number for series (informational) |
| POST | `/invoices/bulk` | O,A | Bulk actions \`{ids, action: send |
| GET | `/invoices/export` | Any | CSV/XLSX export of filtered list (async job if > 5,000 rows) |

### 3.5 Payments and allocations

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/payments` | Any | Filters: `clientId, from, to, mode, unallocated, q` |
| POST | `/payments` | O,A | Record payment with allocations or `autoAllocate: true` |
| GET | `/payments/{id}` | Any | Detail with allocations |
| PATCH | `/payments/{id}` | O,A | Edit notes/reference/date (amount edits go through reverse and re-record) |
| POST | `/payments/{id}/allocate` | O,A | Allocate unallocated remainder |
| POST | `/payments/{id}/reverse` | O,A | `{reason}`; reverses allocations, recomputes invoice states |
| GET | `/payments/{id}/receipt.pdf` | Any | Payment receipt PDF |
| GET | `/payments/export` | Any | CSV export |

### 3.6 Credit and debit notes

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/credit-notes` | Any | List |
| POST | `/credit-notes` | O,A | Create draft against invoice or client |
| GET | `/credit-notes/{id}` | Any | Detail |
| PATCH | `/credit-notes/{id}` | O,A | Edit draft |
| POST | `/credit-notes/{id}/issue` | O,A | Assign number; reduces `balanceDue` (CREDIT) |
| POST | `/credit-notes/{id}/void` | O,A | Reverse effect |
| GET | `/credit-notes/{id}/pdf` | Any | Signed URL |

### 3.7 Collections workflow

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/actions/today` | Any | Daily action list: reminders to approve, overdue to chase, promises due today/broken, disputes needing follow-up, invoices to send (drafts) |
| GET | `/actions/promises` | Any | Promise-to-pay list |
| GET | `/disputes` | Any | List disputes |
| GET | `/disputes/{id}` | Any | Detail |

### 3.8 Reminders

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/reminders` | Any | Queue/history. Filters: `status, clientId, invoiceId, channel, from, to` |
| GET | `/reminders/{id}` | Any | Detail with message log |
| PATCH | `/reminders/{id}` | O,A | Edit subject/body/recipient while DRAFT/APPROVED |
| POST | `/reminders/{id}/approve` | O,A\* | Approve (needs `canApprove`); optional `sendAt` |
| POST | `/reminders/{id}/skip` | O,A | `{reason?}` |
| POST | `/reminders/{id}/send-now` | O,A\* | Approve and dispatch immediately (respects safety checks) |
| POST | `/reminders/bulk` | O,A\* | \`{ids, action: approve |
| POST | `/invoices/{id}/reminders` | O,A | Create manual reminder draft `{channel, templateId?}` |
| POST | `/reminders/preview` | O,A | Render template for an invoice (no save) |
| GET | `/reminder-templates` | Any | List templates |
| POST | `/reminder-templates` | O,A | Create |
| GET | `/reminder-templates/{id}` | Any | Detail |
| PATCH | `/reminder-templates/{id}` | O,A | Update |
| POST | `/reminder-templates/{id}/duplicate` | O,A | Copy |
| DELETE | `/reminder-templates/{id}` | O,A | Archive (blocked if used by active rule) |
| POST | `/reminder-templates/{id}/test-send` | O,A | Send test to current user |
| GET | `/reminder-rules` | Any | List rules (tenant defaults and per-client) |
| POST | `/reminder-rules` | O,A | Create |
| PATCH | `/reminder-rules/{id}` | O,A | Update (activate/deactivate, offsets, approval flag) |
| DELETE | `/reminder-rules/{id}` | O,A | Delete |
| POST | `/reminder-rules/reorder` | O,A | `{ids:[...]}` |
| POST | `/reminder-rules/simulate` | O,A | Show which reminders would be generated for a date range |
| GET | `/unsubscribe/{token}` | Public | One-click unsubscribe landing for a contact |
| POST | `/unsubscribe/{token}` | Public | Confirm |

### 3.9 Imports

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| POST | `/imports` | O,A | Create job `{kind, fileName}` → returns `jobId` and signed upload URL |
| POST | `/imports/{id}/uploaded` | O,A | Confirm upload; server parses header and returns columns + sample rows |
| GET | `/imports/{id}` | O,A | Status/progress |
| PUT | `/imports/{id}/mapping` | O,A | `{mapping, options}`; saves mapping, can save as reusable preset |
| POST | `/imports/{id}/validate` | O,A | Starts validation job |
| GET | `/imports/{id}/rows` | O,A | Paged rows with filter \`status=ERROR |
| PATCH | `/imports/{id}/rows/{rowId}` | O,A | Fix a row inline |
| POST | `/imports/{id}/commit` | O,A | Commit valid rows (\`duplicateStrategy: skip |
| POST | `/imports/{id}/cancel` | O,A | Cancel |
| GET | `/imports/{id}/errors.csv` | O,A | Error report signed URL |
| GET | `/imports` | O,A | History |
| GET | `/imports/templates/{kind}` | Any | Download sample CSV template |
| GET | `/imports/presets` | O,A | Saved mappings |

### 3.10 Reports and dashboard

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/dashboard` | Any | KPIs: outstanding, overdue, due in 7 days, collected this month, DSO, top overdue clients, pending approvals, upcoming promises |
| GET | `/reports/receivables-summary` | Any | Totals by bucket and client |
| GET | `/reports/ageing` | Any | Ageing by client/invoice; \`?asOf&groupBy=client |
| GET | `/reports/collections` | Any | Collected per period, per client, per mode |
| GET | `/reports/invoice-register` | Any | Register for accountant `?from&to&status` |
| GET | `/reports/payment-register` | Any | Receipts register |
| GET | `/reports/tds` | Any | TDS deducted summary per client |
| GET | `/reports/gst-summary` | Any | Output tax by rate and period (informational, not a return) |
| GET | `/reports/msme-clock` | Any | Invoices approaching/exceeding 45 days (informational) |
| GET | `/reports/reminder-effectiveness` | Any | Sent, opened, paid-within-7-days |
| GET | `/reports/monthend-pack` | O,A,C | Starts job producing ZIP (register, ageing, receipts, credit notes) |
| POST | `/reports/weekly/send-test` | O,A | Send weekly report to current user |
| GET | `/reports/{type}.csv` | Any | CSV variant for every report above |
| GET | `/exports` | Any | List generated export files |
| GET | `/exports/{id}` | Any | Signed download URL |

### 3.11 Bank (V1)

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/bank/accounts` | O,A | List/create |
| PATCH/DELETE | `/bank/accounts/{id}` | O,A | Update/deactivate |
| POST | `/bank/accounts/{id}/import` | O,A | Upload statement CSV (reuses import flow, kind BANK) |
| GET | `/bank/transactions` | O,A,C | Filters `matchStatus, from, to, q` |
| POST | `/bank/transactions/{id}/match` | O,A | Create payment from txn `{clientId, allocations}` |
| POST | `/bank/transactions/{id}/ignore` | O,A | Ignore |
| POST | `/bank/transactions/auto-suggest` | O,A | Run suggestion (amount + reference + client name) |

### 3.12 Recurring invoices (V1)

`GET/POST /recurring`, `GET/PATCH/DELETE /recurring/{id}`, `POST /recurring/{id}/run-now`, `POST /recurring/{id}/pause`, `POST /recurring/{id}/resume`.

### 3.13 Billing and plan

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/billing/plans` | Any | Public plan list |
| GET | `/billing/subscription` | O | Current plan, usage, limits |
| POST | `/billing/checkout` | O | Create gateway subscription/checkout `{planCode, interval}` |
| POST | `/billing/portal` | O | Manage payment method link |
| POST | `/billing/cancel` | O | Cancel at period end |
| GET | `/billing/invoices` | O | Your own subscription invoices |
| GET | `/billing/usage` | O | Monthly usage counters |

### 3.14 Notifications

`GET /notifications` (`unread=true`), `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PATCH /notifications/preferences` (daily digest time, channels).

### 3.15 Documents

`POST /documents/upload-url` (generic signed upload `{kind, invoiceId?, clientId?, fileName, mimeType, size}`), `POST /documents/{id}/confirm`, `GET /documents/{id}/download-url`, `DELETE /documents/{id}`.

### 3.16 Audit and privacy

| Method | Path | Perm | Purpose |
| --- | --- | --- | --- |
| GET | `/audit` | O,A,C | Filters `entity, entityId, actorId, action, from, to` |
| POST | `/privacy/export` | O | Request tenant data export (async ZIP) |
| POST | `/privacy/erase-request` | O | Request erasure of a contact/subject or account closure |
| GET | `/privacy/requests` | O | List `data_requests` |
| GET | `/privacy/requests/{id}` | O | Status and result URL |

### 3.17 API keys (V2)

`GET/POST /api-keys`, `DELETE /api-keys/{id}`. Public API (V2) exposes a subset of invoices/clients/payments under `/api/public/v1` with key auth and scopes.

### 3.18 Search

`GET /search?q=` returns grouped hits (clients, invoices by number, payments by reference) — used by the global command palette.

### 3.19 Public/portal routes (no login)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/public/invoices/{token}` | Invoice summary JSON (limited fields) and signed PDF URL; records a view |
| POST | `/public/invoices/{token}/acknowledge` | Client acknowledges receipt (optional) |
| POST | `/public/invoices/{token}/dispute` | Client raises a query `{message, contactEmail}` → creates activity, notifies owner |
| POST | `/public/invoices/{token}/promise` | Client states payment date (creates PROMISE_TO_PAY activity) |
| POST | `/public/invoices/{token}/pay` | V1: create payment link/order |
| GET | `/public/health` | Health |

### 3.20 Webhooks (provider callbacks, signature verified, always 200 after persisting)

| Path | Source | Handles |
| --- | --- | --- |
| `/api/webhooks/email` | Resend/SES | delivered, bounced, complained, opened, clicked |
| `/api/webhooks/whatsapp` | BSP/Meta | delivery/read status, inbound replies (V1) |
| `/api/webhooks/razorpay` | Razorpay | subscription events, payment link paid (V1) |
| `/api/webhooks/supabase-auth` | Supabase (optional) | user deleted/confirmed hooks |

Processing: verify signature → insert `webhook_events` (unique provider+eventId) → enqueue `webhook.process` job → return 200. Handlers update `message_logs`, set contact `unsubscribedAt` on complaint/unsubscribe, mark reminders FAILED on hard bounce, apply payment-link payments through the normal PaymentService.

### 3.21 Internal job endpoints (cron only: header `x-cron-secret`, IP allow-list optional)

| Path | Schedule | Purpose |
| --- | --- | --- |
| `POST /api/internal/jobs/reminders-generate` | Daily 09:00 IST | Generate DRAFT reminders |
| `POST /api/internal/jobs/run` | Every 10 min | Claim and execute queued jobs (dispatch, pdf, imports, exports) |
| `POST /api/internal/jobs/weekly-report` | Monday 08:00 IST | Queue weekly reports |
| `POST /api/internal/jobs/recurring` | Daily 09:30 IST | Create recurring invoices |
| `POST /api/internal/jobs/digest` | Daily 09:15 IST | Email approval digests |
| `POST /api/internal/jobs/cleanup` | Daily | Retention clean-up |
| `GET /api/health` | Uptime check | DB + storage ping |
| `GET /api/version` | — | Build info |

### 3.22 Super-admin (internal back-office, separate auth claim `platform_admin`)

`GET /api/admin/tenants`, `GET /api/admin/tenants/{id}`, `POST /api/admin/tenants/{id}/suspend`, `POST .../unsuspend`, `GET /api/admin/jobs` (stuck/dead), `POST /api/admin/jobs/{id}/retry`, `GET /api/admin/usage`, `POST /api/admin/impersonate` (time-boxed, consented, audited), `GET /api/admin/webhook-events`.

---

## 4. Detailed contracts for core endpoints

### 4.1 `POST /invoices` (create draft)

Request:

```json
{
  "clientId": "uuid",
  "seriesId": "uuid",
  "issueDate": "2026-10-07",
  "dueDate": "2026-11-06",
  "poNumber": "PO-1182",
  "reference": "Oct retainer",
  "placeOfSupply": "27",
  "isReverseCharge": false,
  "notes": "Thank you for your business.",
  "terms": "Payment within 30 days. Late fee as per agreement.",
  "items": [
    { "description": "Website maintenance - October", "hsnSac": "998314", "quantity": "1", "unit": "NOS",
      "rate": "25000.00", "discountPct": "0", "taxRate": "18" }
  ]
}
```

Server behaviour:

1. Validate client belongs to tenant, series active, `dueDate >= issueDate`.
2. Determine `isInterState = tenant.stateCode !== placeOfSupply`.
3. Compute per line: `taxable = qty*rate*(1-discountPct/100)` (round half-up 2dp), `tax = taxable*taxRate/100`; split into CGST/SGST (half each) or IGST.
4. Totals, `roundOff` to nearest rupee, `total`, `balanceDue = total`.
5. Status DRAFT, number `DRAFT-xxxxxx`, version 1; audit `invoice.created`. Response 201:

```json
{ "data": { "id":"uuid","number":"DRAFT-a1b2c3","status":"DRAFT","subtotal":"25000.00","cgst":"2250.00","sgst":"2250.00","igst":"0.00",
  "taxTotal":"4500.00","roundOff":"0.00","total":"29500.00","balanceDue":"29500.00","version":1,
  "derived":{"state":"DRAFT","daysOverdue":0,"bucket":null} } }
```

### 4.2 `POST /invoices/{id}/send`

```json
{ "channels": ["EMAIL"], "contactIds": ["uuid"], "subject": "Invoice {{invoice_number}} from {{business_name}}", "message": "Hi {{client_name}}, ...", "attachPdf": true }
```

Steps (one transaction for DB parts, provider call after commit with outbox pattern):

1. If DRAFT: validate required fields (client GSTIN rules if B2B, at least one item), call `next_invoice_number`, set status SENT, `sentAt`.
2. Enqueue `invoice.pdf` (or render inline if \< 3s) and store `Document` + `pdfPath`.
3. Create `MessageLog` QUEUED per recipient; send via provider (idempotency key = `invoice:{id}:send:{n}`).
4. Add `InvoiceActivity(type=EMAIL)`; audit `invoice.sent`; usage counter `invoices_created`. Errors: 409 if void/paid; 422 if no consented contact; 402 if plan limit; 503 if provider down (invoice stays issued, message FAILED, user can resend).

### 4.3 `POST /payments`

```json
{
  "clientId": "uuid",
  "amount": "26550.00",
  "tdsAmount": "500.00",
  "receivedOn": "2026-10-20",
  "mode": "BANK_TRANSFER",
  "reference": "UTR123456789",
  "notes": "Oct invoice part-settlement",
  "autoAllocate": false,
  "allocations": [ { "invoiceId": "uuid", "amount": "26550.00", "tdsAmount": "500.00" } ]
}
```

Validation: payment amount > 0; each allocation invoice belongs to client and is SENT/PART_PAID; allocation amount + tds ≤ invoice `balanceDue`; sum of allocation cash ≤ payment amount; sum of allocation TDS ≤ payment `tdsAmount`; `autoAllocate` distributes oldest-due first. Duplicate guard: same `(clientId, amount, receivedOn, reference)` within tenant → 409 unless `force`. Effects (single tx): insert payment + allocations; per invoice `amountPaid += amount+tds`, `balanceDue -= ...`, status `PAID` when zero else `PART_PAID`, `paidAt` set; cancel DRAFT/APPROVED reminders for paid invoices; add activities; audit `payment.recorded`; notify owner if large. Response 201 includes updated invoice summaries and `unallocatedAmount`.

### 4.4 `POST /payments/{id}/reverse`

Body `{ "reason": "Cheque bounced" }`. Marks `voidedAt`, sets allocations `reversedAt`, recomputes each invoice (`amountPaid`, `balanceDue`, status back to SENT/PART_PAID, clear `paidAt`), writes activity "Payment reversed", audit.

### 4.5 `GET /actions/today`

```json
{ "data": {
  "date": "2026-10-07",
  "approvals": { "count": 12, "totalAmount": "245000.00", "items": [ {"reminderId":"...","invoiceNumber":"...","client":"...","daysOverdue":7,"balanceDue":"..."} ] },
  "chaseNow": [ { "invoiceId":"...","client":"...","balanceDue":"...","daysOverdue":32,"lastContactAt":"...","suggested":"CALL" } ],
  "promisesToday": [ ... ],
  "brokenPromises": [ ... ],
  "disputes": [ ... ],
  "draftsToSend": [ ... ],
  "dueSoon": [ ... ]
} }
```

Priority score for `chaseNow` = `balanceDue_weight + daysOverdue_weight + no_contact_in_7d_bonus - paused_penalty` (documented in code, configurable).

### 4.6 Reminder generation algorithm (`reminders.generate`)

For each ACTIVE tenant with active subscription:

1. `today = now in tenant.timezone`; skip if weekend and `sendOnWeekends=false` (generate but schedule for next allowed day).
2. Load active rules (client-specific rules override tenant defaults for the same trigger/offset).
3. Candidate invoices: status IN (SENT, PART_PAID), `balanceDue > 0`, not paused (invoice/client), not disputed.
4. For each rule: `target = dueDate + offset` for AFTER_DUE; `dueDate - offset` for BEFORE_DUE; `dueDate` for ON_DUE; match when `target == today`.
5. Skip if `minBalance` not met, no consented contact for the channel, or an equal `dedupeKey` exists.
6. Render template variables, create `Reminder` (DRAFT if `requiresApproval` else APPROVED with `scheduledFor`).
7. If `escalateToOwner`, also create a notification task for the owner.
8. Increment usage counters on send, not on draft. Edge cases: part-payment between generation and sending (re-check balance at send), due date changes (new keys), tenant timezone changes, daylight irrelevant (IST), plan limit exceeded (leave DRAFT with warning).

### 4.7 Template variables

`{{client_name}} {{contact_name}} {{invoice_number}} {{invoice_date}} {{due_date}} {{amount_due}} {{total_amount}} {{days_overdue}} {{business_name}} {{business_phone}} {{payment_details}} {{invoice_link}} {{unsubscribe_link}}`. Unknown variables fail validation at save time. Templates are sanitised (no scripts) and rendered with a logic-less engine (Handlebars with no helpers).

### 4.8 Import validation rules

- Invoices kind required fields: `invoiceNumber (or auto), clientName|clientGstin, issueDate, dueDate|paymentTerms, itemDescription|amount, total`.
- Date parsing with chosen `dateFormat` (DD/MM/YYYY default), numbers with Indian grouping accepted, GSTIN regex, duplicate detection on `(number)` or `(client, amount, date)` heuristics, unknown clients created automatically only if option enabled.
- Status inference: if `paidAmount` column present, create payment allocations as `RECEIVED` on `paidDate` or issue date.
- Limits: 10 MB, 20,000 rows per job, 60 s per chunk.
- Commit in batches of 200 inside transactions; failures roll back the batch and mark rows ERROR.

### 4.9 Dashboard response (shape)

`outstandingTotal, overdueTotal, overdueCount, dueNext7Days, collectedThisMonth, collectedLastMonth, dso30, ageingBuckets[], topOverdueClients[10], pendingApprovals, brokenPromises, weeklyCollectionsSeries[12], remindersSent7d, remindersOpenRate`. Cached 60 seconds per tenant.

---

## 5. GST and calculation module (`shared/gst.ts`)

- Pure functions, unit-tested: `computeLine`, `computeTotals`, `splitTax`, `roundHalfUp`, `isInterState`.
- Rounding: line-level tax rounded to 2dp; invoice `roundOff` to nearest rupee, shown separately.
- Validation helpers: `isValidGstin`, `stateCodeFromGstin`, `isValidHsn` (4/6/8 digits as configured; confirm rules with a CA).
- Disclaimer: the product is a billing and collections aid; tax filing and e-invoicing remain outside MVP.

---

## 6. State machines (enforced in services)

**Invoice**: `DRAFT → SENT → PART_PAID → PAID`; `SENT/PART_PAID → WRITTEN_OFF`; `DRAFT/SENT/PART_PAID(no allocations) → VOID`; reversal returns `PAID → PART_PAID/SENT`. Illegal transitions → 409 `INVALID_STATE`. **Reminder**: `DRAFT → APPROVED → SCHEDULED → SENT | FAILED`; `DRAFT/APPROVED → SKIPPED | CANCELLED`. A FAILED reminder can be retried by the user (new attempt). **Import**: `UPLOADED → MAPPED → VALIDATING → VALIDATED → COMMITTING → COMMITTED`; any → `FAILED | CANCELLED`. **Credit note**: `DRAFT → ISSUED → VOID`.

---

## 7. Security details for the API

- Never accept `tenantId` from the client body; derive from context.
- All IDs validated as UUID; unknown IDs return 404 (not 403) to avoid enumeration.
- Public token endpoints: constant-time compare not needed (lookup by unique token), but rate-limit and avoid leaking existence differences; token regeneration invalidates old links.
- File uploads: signed URLs scoped to path and content-length; post-upload verification (MIME sniffing, extension allow-list) before the file is attached.
- CSV export sanitisation against formula injection.
- Webhook signature verification and 5-minute replay window.
- Secrets only via env; `server-only` import guard on all server modules.
- Audit every mutation; include `before/after` for money fields.
- PII minimisation in logs (no email bodies, no phone numbers; hash identifiers).

---

## 8. Observability inside the API

- Logger fields: `requestId, tenantId, userId, route, status, durationMs, errorCode`.
- Sentry tags: `tenantId`, `route`, `jobType`.
- Metrics counters: `invoices_created`, `reminders_generated`, `reminders_sent`, `reminders_failed`, `imports_failed`, `webhook_signature_failures`.
- Slow query log: Prisma `$on('query')` for > 500 ms in non-prod, aggregated in prod.

---

## 9. Testing strategy

| Layer | Tool | What |
| --- | --- | --- |
| Pure logic | Vitest | GST maths, allocation, ageing buckets, template rendering, date logic (tenant tz) |
| Services | Vitest + test DB | Numbering concurrency, payment reversal, state transitions, import commit rollback |
| API | Vitest + supertest-style fetch | Auth, RBAC matrix per endpoint (table-driven), validation errors, idempotency |
| Tenant isolation | Vitest + test DB | Every table/endpoint cannot read or write across tenants |
| Jobs | Vitest with fake clock | Generation algorithm for edge cases, dispatch guards |
| Integrations | MSW / fakes | Email/WhatsApp/payment adapters; webhook signature tests |
| E2E | Playwright | Signup → onboarding → import → send invoice → record payment → approve reminder |
| Load | k6 | 50 concurrent users on lists/dashboard; 10k-invoice tenant |

Coverage gate: services and shared logic ≥ 85%.

---

## 10. Environment variables

```
NODE_ENV, APP_URL, API_URL
DATABASE_URL, DIRECT_URL, SYSTEM_DATABASE_URL
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_JWKS_URL
COOKIE_SECRET, CRON_SECRET, WEBHOOK_SECRET_EMAIL, WEBHOOK_SECRET_RAZORPAY, WEBHOOK_SECRET_WHATSAPP
EMAIL_PROVIDER=resend|ses, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_DOMAIN
WHATSAPP_PROVIDER, WHATSAPP_API_KEY (V1)
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (V1)
SENTRY_DSN, POSTHOG_KEY, LOG_LEVEL
RATE_LIMIT_REDIS_URL (optional; otherwise DB/in-memory limiter)
FEATURE_FLAGS (json)
```

---

## 11. Build order for the backend (solo developer)

1. Foundation: `route()` wrapper, error classes, logger, auth/tenant resolution, RBAC, audit helper, Prisma clients.
2. Tenant + members + invites + series.
3. Clients/contacts.
4. GST module + invoices (draft, issue, send, PDF).
5. Payments + allocations + reversal.
6. Activities, disputes, derived states, actions/today.
7. Imports (clients, invoices, payments).
8. Reminders: templates, rules, generator, approval, dispatcher, webhooks, unsubscribe.
9. Dashboard + reports + exports + weekly report.
10. Billing/usage limits, notifications, audit UI endpoints, privacy endpoints.
11. Hardening: rate limits, idempotency, isolation suite, load test, security review.
12. V1: portal actions, payment links, WhatsApp, bank, recurring.

## 12. Definition of done per endpoint

Zod schema, permission check, service test, RBAC test, tenant-isolation test, audit entry (if mutating), OpenAPI entry (generate with `zod-to-openapi` and publish at `/api/v1/openapi.json`), error cases documented, and a typed client function in `features/*/api.ts`.