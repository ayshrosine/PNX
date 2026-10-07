# Frontend Document

Stack: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · shadcn/ui (Radix) · TanStack Query · TanStack Table · React Hook Form + Zod · Recharts · Supabase Auth (`@supabase/ssr`) · date-fns (+ `date-fns-tz`) · Sonner (toasts) · cmdk (command palette).

---

## 1. Principles

1. **Collections-first**: the first screen after login is "Today" (action list), not a ledger.
2. **Server Components for reads, Client Components for interaction**; mutations via typed API client + TanStack Query.
3. Every list is filterable, searchable, sortable, paginated by cursor, and shareable by URL (filters in query string).
4. Fast data entry: keyboard shortcuts, inline editing, bulk actions, import wizard.
5. Never auto-send; approvals are explicit and reversible until sent.
6. Money shown as `₹1,23,456.00` (en-IN grouping), dates as `07 Oct 2026`, due text relative ("due in 3 days", "12 days overdue").
7. Accessible (WCAG 2.1 AA), responsive (desktop-first, usable at 360 px), light/dark themes.

---

## 2. Route map (complete)

Route groups: `(marketing)`, `(auth)`, `(onboarding)`, `(app)`, `(portal)`, `(admin)`. Path column shows the URL.

### 2.1 Public marketing site

| URL | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Hero, problem/solution, how it works, pricing teaser, CTA (start free / book audit) |
| `/features` | Features | Daily action list, reminders with approval, imports, reports, accountant access |
| `/how-it-works` | How it works | 4-step flow with visuals |
| `/pricing` | Pricing | Plans (Starter/Growth/Managed), FAQ, comparison note |
| `/receivables-audit` | Free audit | Lead form for the free receivables audit |
| `/for-agencies`, `/for-it-services`, `/for-consultants` | Segment pages | Niche messaging (create as you choose niche) |
| `/accountants` | Accountant partners | Partner program + referral sign-up |
| `/resources` | Resource hub | Guides: invoice follow-up templates, 43B(h) explainer |
| `/resources/[slug]` | Article | MDX content |
| `/security` | Security | Controls summary, data handling |
| `/about` | About | Story, contact |
| `/contact` | Contact | Form + support email |
| `/legal/terms` | Terms of Service |  |
| `/legal/privacy` | Privacy Policy |  |
| `/legal/dpa` | Data Processing Addendum |  |
| `/legal/cookies` | Cookie policy |  |
| `/status` | Status | Link to external status page |
| `/sitemap.xml`, `/robots.txt` | SEO |  |

### 2.2 Authentication

| URL | Page | Notes |
| --- | --- | --- |
| `/login` | Login | Email+password, magic link, Google; link to signup; MFA step if enrolled |
| `/signup` | Sign up | Name, business name, email, password, consent checkbox (Terms/Privacy) |
| `/verify-email` | Verify email | Pending state + resend |
| `/forgot-password` | Forgot password |  |
| `/reset-password` | Reset password | Token from email |
| `/mfa` | MFA challenge | 6-digit TOTP |
| `/mfa/setup` | MFA enrollment | QR code, recovery note |
| `/accept-invite/[token]` | Accept invite | Sign in or sign up, join tenant |
| `/auth/callback` | (route handler) | OAuth/magic-link callback |
| `/logout` | (action) |  |

### 2.3 Onboarding wizard (`/onboarding/*`)

| URL | Step | Content |
| --- | --- | --- |
| `/onboarding` | Redirector | Sends to current step |
| `/onboarding/business` | 1. Business profile | Legal/trade name, GSTIN (optional), state, address, logo, bank/UPI details for invoices |
| `/onboarding/invoice-settings` | 2. Invoice setup | Series prefix, FY, next number, default due days, terms, footer |
| `/onboarding/import` | 3. Bring your data | Choose: import Excel/CSV, add manually, or skip; link to import wizard |
| `/onboarding/reminders` | 4. Reminder style | Choose tone and default cadence, quiet hours, approval toggle |
| `/onboarding/team` | 5. Invite team | Invite admin/accountant (skippable) |
| `/onboarding/done` | Finish | Summary + go to Today |

### 2.4 Authenticated product (`/app/*`)

Layout: left sidebar (Today, Invoices, Clients, Payments, Reminders, Reports, Imports, Settings), top bar (tenant switcher, global search `⌘K`, notifications, user menu, "New invoice" button).

#### Core

| URL | Page | Notes |
| --- | --- | --- |
| `/app` | Redirect | → `/app/today` |
| `/app/today` | **Today (action list)** | Sections: Approvals waiting, Chase now, Promises today/broken, Disputes, Drafts to send, Due soon |
| `/app/dashboard` | Dashboard | KPIs, ageing chart, collections trend, top overdue clients |
| `/app/search` | Search results | Full page for `⌘K` query |
| `/app/notifications` | Notifications | Full list |

#### Invoices

| URL | Page |
| --- | --- |
| `/app/invoices` | Invoice list (tabs: All, Draft, Open, Overdue, Due soon, Part-paid, Paid, Disputed, Void) |
| `/app/invoices/new` | Create invoice (`?clientId=` prefill, `?duplicateFrom=`) |
| `/app/invoices/[id]` | Invoice detail (summary, items, timeline, payments, reminders, documents, notes) |
| `/app/invoices/[id]/edit` | Edit draft |
| `/app/invoices/[id]/send` | Send dialog route (modal via parallel route `@modal`) |
| `/app/invoices/[id]/payment/new` | Record payment for this invoice (modal) |
| `/app/invoices/[id]/credit-note/new` | Create credit note (modal) |
| `/app/invoices/[id]/print` | Print-friendly view |
| `/app/invoices/bulk` | Bulk action confirmation (modal) |
| `/app/recurring` (V1) | Recurring invoices list |
| `/app/recurring/new`, `/app/recurring/[id]` (V1) | Create/edit |

#### Clients

| URL | Page |
| --- | --- |
| `/app/clients` | Client list with outstanding/overdue columns |
| `/app/clients/new` | Create client |
| `/app/clients/[id]` | Client profile: overview, invoices, payments, contacts, timeline, reminder settings, statement |
| `/app/clients/[id]/edit` | Edit client |
| `/app/clients/[id]/statement` | Statement view + download |
| `/app/clients/merge` | Merge clients wizard |

#### Payments and credit notes

| URL | Page |
| --- | --- |
| `/app/payments` | Payment list (filters: client, date, mode, unallocated) |
| `/app/payments/new` | Record payment with allocation table |
| `/app/payments/[id]` | Payment detail, allocations, reverse |
| `/app/credit-notes` | Credit/debit note list |
| `/app/credit-notes/new` | Create |
| `/app/credit-notes/[id]` | Detail |
| `/app/bank` (V1) | Bank accounts and unmatched transactions |
| `/app/bank/import` (V1) | Statement import wizard |
| `/app/bank/transactions` (V1) | Match/ignore view |

#### Collections and reminders

| URL | Page |
| --- | --- |
| `/app/reminders` | **Approval queue** (tabs: Needs approval, Scheduled, Sent, Failed, Skipped) |
| `/app/reminders/[id]` | Reminder detail/edit |
| `/app/reminders/rules` | Reminder rules (default + per-client), simulate |
| `/app/reminders/templates` | Template list |
| `/app/reminders/templates/new`, `/app/reminders/templates/[id]` | Template editor with live preview |
| `/app/disputes` | Disputes list |
| `/app/disputes/[id]` | Dispute detail |
| `/app/promises` | Promise-to-pay tracker |

#### Imports

| URL | Page |
| --- | --- |
| `/app/imports` | Import history |
| `/app/imports/new` | Step 1: choose type + upload |
| `/app/imports/[id]/map` | Step 2: column mapping |
| `/app/imports/[id]/review` | Step 3: validation results, fix rows |
| `/app/imports/[id]/done` | Step 4: summary + error report |

#### Reports

| URL | Page |
| --- | --- |
| `/app/reports` | Report hub |
| `/app/reports/receivables` | Receivables summary |
| `/app/reports/ageing` | Ageing report (client/invoice grouping) |
| `/app/reports/collections` | Collections over time |
| `/app/reports/invoice-register` | Invoice register |
| `/app/reports/payment-register` | Receipts register |
| `/app/reports/tds` | TDS summary |
| `/app/reports/gst-summary` | GST output summary (informational) |
| `/app/reports/msme-clock` | 43B(h)/45-day clock (informational) |
| `/app/reports/reminders` | Reminder effectiveness |
| `/app/reports/month-end` | Month-end pack generator |
| `/app/exports` | Generated files list |

#### Accountant view

| URL | Page |
| --- | --- |
| `/app/accountant` | Accountant home: registers, month-end pack, audit shortcuts (visible to ACCOUNTANT role; others see via menu) |

#### Settings (`/app/settings/*`)

| URL | Page |
| --- | --- |
| `/app/settings` | Redirect to profile |
| `/app/settings/profile` | My profile, password, MFA, sessions |
| `/app/settings/business` | Business details, logo, bank/UPI |
| `/app/settings/invoicing` | Series, numbering, defaults, terms, footer, PDF template options |
| `/app/settings/tax` | State, GSTIN, tax defaults, HSN/SAC presets |
| `/app/settings/reminders` | Quiet hours, weekends, limits, approver rights |
| `/app/settings/team` | Members, roles, invites |
| `/app/settings/notifications` | Email/in-app preferences, daily digest time, weekly report day |
| `/app/settings/integrations` | Email sending domain verification, WhatsApp (V1), payment gateway (V1) |
| `/app/settings/billing` | Plan, usage, payment method, invoices |
| `/app/settings/data` | Export data, erase requests, retention info |
| `/app/settings/audit-log` | Audit trail viewer |
| `/app/settings/api-keys` (V2) | API keys |
| `/app/help` | Help center links, keyboard shortcuts, contact support |
| `/app/switch` | Tenant switcher (for accountants with multiple businesses) |

### 2.5 Public portal (no login)

| URL | Page |
| --- | --- |
| `/p/[token]` | Invoice view: business details, invoice summary, PDF download, "I have a question", "I'll pay on \[date\]", pay now (V1) |
| `/p/[token]/thanks` | Acknowledgement after an action |
| `/unsubscribe/[token]` | Unsubscribe confirmation for a contact |

### 2.6 Internal admin (`/admin/*`, platform admins only)

`/admin` (overview), `/admin/tenants`, `/admin/tenants/[id]`, `/admin/jobs`, `/admin/webhooks`, `/admin/usage`, `/admin/leads` (audit leads), `/admin/feature-flags`.

### 2.7 System pages

`not-found.tsx` (404), `error.tsx` (error boundary with request id), `global-error.tsx`, `/forbidden` (403), `/maintenance`, `/plan-limit` (upgrade prompt), `/suspended` (account suspended).

---

## 3. Page specifications (core product pages)

Each spec lists **Data**, **UI**, **Actions**, **States**, **Permissions**.

### 3.1 `/app/today`

- **Data**: `GET /actions/today`.
- **UI**: header with date and totals ("₹X overdue · N to approve"); stacked cards:
  1. *Approvals waiting*: table of draft reminders (client, invoice, amount, days overdue, channel, preview snippet) with row actions Approve/Edit/Skip and bulk "Approve selected".
  2. *Chase now*: ranked invoices; actions: Log call, Add promise, Send reminder, Open invoice.
  3. *Promises today / broken*: date, client, amount, status; actions Mark kept, Reschedule, Chase.
  4. *Disputes needing follow-up*.
  5. *Draft invoices to send*.
  6. *Due soon (7 days)*.
- **Empty state**: "All caught up" with link to dashboard.
- **Realtime-ish**: refetch on window focus; badge counts in sidebar.

### 3.2 `/app/dashboard`

- KPI tiles: Outstanding, Overdue (₹ and count), Due in 7 days, Collected this month (vs last month), DSO (30d).
- Charts: ageing bar (buckets), collections trend (12 weeks), top 10 overdue clients (bar), reminder performance (sent/opened/paid).
- Date range switch (This month, Last 30, FY to date).
- Export button (PDF snapshot, CSV).

### 3.3 `/app/invoices` (list)

- **Table columns**: Number, Client, Issue date, Due date, Total, Balance, Status chip + derived chip (Overdue 12d), Last reminder, Actions (⋯).
- **Filters** (URL-synced): status tabs, client multi-select, date ranges, amount range, ageing bucket, disputed, source, search.
- **Bulk**: Send, Pause reminders, Export, Void (drafts).
- **Row actions**: View, Record payment, Send/Resend, Duplicate, Download PDF, Void.
- Saved views (Overdue 30+, High value overdue) stored in `localStorage` + later server.
- Empty states: no invoices (CTAs: New invoice, Import).

### 3.4 `/app/invoices/new` and `/edit`

Form sections (single scroll page with sticky summary):

1. **Client** (searchable select, "Add new client" inline dialog). Shows client payment terms and outstanding.
2. **Header**: series, invoice date, due date (auto from terms, editable), place of supply (state select, default client state), PO number, reference.
3. **Line items** (table with add/remove/reorder): description (with saved-item autocomplete), HSN/SAC, qty, unit, rate, discount %, tax %, computed taxable/tax/total.
4. **Totals panel**: subtotal, discount, taxable, CGST/SGST or IGST, round-off, total, amount in words.
5. **Notes and terms**, attachments.
6. **Payment details** (from business settings; override).
7. Footer actions: Save draft, Preview PDF, Save & Send (opens send dialog).

- Live totals via local `computeTotals` (same shared module as server) and `POST /invoices/preview` on blur for verification.
- Validation: Zod schema; warns on missing GSTIN for B2B clients, due before invoice date, zero total.
- Unsaved-changes guard; autosave draft every 30 s once created.
- Keyboard: `⌘S` save, `⌘Enter` save & send.

### 3.5 `/app/invoices/[id]`

- **Header**: number, status chips, client link, total/balance, actions: Send/Resend, Record payment, Add note, Create credit note, More (Duplicate, Void, Write-off, Pause reminders, Regenerate link).
- **Tabs**: Overview (items/tax summary, PDF preview iframe), Timeline (messages, payments, notes, status changes, views), Payments (allocations), Reminders (scheduled/sent + next planned), Documents, Audit.
- **Side panel**: Client contact quick info, ageing badge, promise-to-pay card, dispute card, portal link (copy), views count.
- Edit allowed only for drafts (button disabled with tooltip otherwise).

### 3.6 Record payment (`/app/payments/new`, modal from invoice)

- Fields: client, amount received, TDS deducted, date, mode, reference, notes.
- **Allocation table**: open invoices of the client (oldest first) with editable allocation inputs; "Auto-allocate" button; live "Unallocated ₹X" indicator; validation against balances.
- Duplicate warning if the same reference/amount exists.
- Success toast with links to affected invoices.

### 3.7 `/app/clients` and `/app/clients/[id]`

- List columns: Name, GSTIN, Outstanding, Overdue, Oldest due, Reminders (on/paused), Last payment, Tags.
- Detail layout: header with balances; tabs: Overview, Invoices, Payments, Contacts, Timeline, Reminders (rules override, pause), Notes, Statement.
- Contact editor includes consent checkboxes with helper text ("I confirm this person agreed to receive invoice communication").

### 3.8 `/app/reminders` (approval queue)

- Tabs with counts. Table: Client, Invoice, Amount, Days overdue, Channel, Scheduled, Tone, Preview.
- Drawer to read/edit message (subject, body, recipients) with variable chips and live preview; Approve, Skip (reason), Send now.
- Bulk approve; filter by client/rule/tone.
- Safety banners: "Client paused", "No consented contact", "Invoice partially paid since draft".

### 3.9 `/app/reminders/rules`

- Ordered list of rules (drag to reorder): trigger (Before/On/After), days, channel, template, approval toggle, min balance, escalate to owner, active toggle.
- Per-client override tab.
- "Simulate" panel: choose date range → table of reminders that would be created.

### 3.10 `/app/reminders/templates/[id]`

- Editor with subject/body, tone selector, variable picker, test-send button, preview using a sample invoice; language selector (en/hi); WhatsApp template mapping field (V1).

### 3.11 Import wizard (`/app/imports/*`)

1. **New**: pick type (Clients, Invoices, Payments), download sample, upload file (drag-drop, 10 MB), choose date format.
2. **Map**: auto-detected columns → target fields dropdown, sample preview of first 5 rows, required fields marked, "Save mapping preset".
3. **Review**: counts (valid, errors, duplicates); table with filter chips; inline fix; choose duplicate strategy; "Download error report".
4. **Commit & done**: progress bar (polling `GET /imports/{id}`), summary, links to imported invoices.

### 3.12 Reports pages

Shared layout: filter bar (date range, client, status), table + chart, Export CSV/PDF, "Schedule" (V1). Ageing report: matrix (clients × buckets) with drill-down to invoices.

### 3.13 Settings pages

Forms with section cards, autosave disabled (explicit Save), dirty-state indicator. Team page: members table with role selector, invite dialog, pending invites list. Integrations: email domain DNS records helper (SPF/DKIM/DMARC copy buttons) and verification status. Data page: export request button, erase request form, retention table.

### 3.14 Public invoice portal `/p/[token]`

- Mobile-first, no navigation chrome, business branding.
- Shows invoice number, amount due, due date, status, items summary, PDF download, bank/UPI details.
- Actions: "I have a question" (form → dispute activity), "I will pay on…" (date picker), "Pay now" (V1), "Acknowledge receipt".
- Revoked/expired token → friendly error. No indexing (`noindex`).

---

## 4. Component library

### 4.1 Layout

`AppShell`, `Sidebar`, `Topbar`, `TenantSwitcher`, `CommandPalette`, `NotificationsBell`, `UserMenu`, `PageHeader`, `Tabs`, `SplitPane`, `Breadcrumbs`, `EmptyState`, `ErrorState`, `Skeletons`.

### 4.2 Data display

`DataTable` (TanStack: sorting, column visibility, row selection, sticky header, virtualised, cursor "load more"), `FilterBar` (URL-synced), `StatusChip`, `DerivedChip` (overdue/due soon), `MoneyText`, `DateText`, `RelativeDue`, `AgeingBar`, `KpiTile`, `Timeline`, `Avatar`, `CopyButton`.

### 4.3 Forms

`FormField`, `MoneyInput` (INR formatting, decimal-safe), `DateInput`, `ClientSelect` (async search), `StateSelect`, `GstinInput` (live validation), `HsnInput`, `PhoneInput` (+91), `TagInput`, `LineItemsEditor`, `AllocationEditor`, `FileDropzone` (signed URL upload with progress), `RichTextLite` (templates), `VariablePicker`.

### 4.4 Feedback

`Toast`, `ConfirmDialog`, `Dialog`, `Sheet` (drawers), `Banner`, `ProgressBar`, `InlineAlert`, `Tooltip`.

### 4.5 Charts

`AgeingChart`, `CollectionsTrend`, `TopClientsBar`, `ReminderFunnel`.

---

## 5. State, data fetching and caching

- **Server Components** fetch initial lists/details using a server-side `apiServer()` wrapper (forwards cookies) and pass as `initialData`.
- **TanStack Query** keys: `['invoices', filters]`, `['invoice', id]`, `['clients', filters]`, `['client', id]`, `['payments', filters]`, `['reminders', filters]`, `['today']`, `['dashboard', range]`, `['import', id]`, `['me']`.
- **Mutations** invalidate related keys (recording a payment invalidates `invoice`, `invoices`, `client`, `today`, `dashboard`).
- **Optimistic updates** only for low-risk actions (approve/skip reminder, mark notification read).
- **URL state** for filters via `nuqs` (type-safe search params).
- **Global UI state** (sidebar collapsed, theme) in Zustand with persistence; no business data in global stores.
- **Typed API client** generated from OpenAPI (`openapi-typescript`) + thin `fetchJson` handling error envelope, 401 redirect to `/login`, 402 to `/plan-limit`, 429 toast.
- Polling: import progress (2 s), PDF generation (until ready), notifications (60 s) — no websockets in MVP.

---

## 6. Forms and validation

- Schemas live in `src/shared/schemas/*.ts` and are reused by the API.
- Standard pattern: `useForm({ resolver: zodResolver(schema) })`, server errors mapped back onto fields via `details[].path`.
- Money inputs keep a string value; conversion to `Decimal` only in shared math utilities.
- Dates sent as `YYYY-MM-DD`; timezone handled by tenant setting.

---

## 7. Auth, guards and routing logic

- `middleware.ts`: refresh Supabase session; redirect unauthenticated users from `/app/*`, `/onboarding/*` to `/login?next=`; redirect authenticated users from `/login`/`/signup` to `/app`.
- App layout loads `/me`; if no tenant → `/onboarding`; if `onboardingStep != done` → onboarding step; if tenant `SUSPENDED` → `/suspended`; if plan expired → `/app/settings/billing` with banner.
- Role-based UI: `useCan('invoice:create')` hides/disables actions; server still enforces.
- MFA gate for Owners after onboarding (banner → `/mfa/setup`; enforced after grace period).

---

## 8. Design system

| Token | Value (starting point) |
| --- | --- |
| Font | Inter (UI), JetBrains Mono (numbers in tables optional) |
| Colors | Primary indigo-600, neutral slate scale, success emerald, warning amber, danger rose; status chips: Draft slate, Sent blue, Part-paid amber, Paid emerald, Void gray, Overdue rose |
| Radius | 8 px cards, 6 px inputs |
| Spacing | 4 px grid |
| Density | Compact tables (40 px rows) with comfortable mode |
| Icons | lucide-react |
| Motion | Minimal (150 ms), respects `prefers-reduced-motion` |

Number formatting: `Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' })`. Amount in words helper (Indian numbering: lakh/crore).

---

## 9. Accessibility and i18n

- Semantic HTML, focus management in dialogs/drawers, visible focus rings, labels and `aria-describedby` for errors, table headers with scope, colour is never the only status signal (icon + text).
- Keyboard shortcuts: `g t` Today, `g i` Invoices, `g c` Clients, `n i` New invoice, `n p` New payment, `/` search, `?` shortcut help.
- i18n-ready with `next-intl` (English MVP; Hindi after validation). Strings in message files; dates/numbers localized.

---

## 10. Performance

- Route-level code splitting, dynamic import of charts/PDF viewer, `next/image`, font subsetting.
- List pages: virtualised rows beyond 100, cursor pagination, prefetch next page on hover.
- Avoid client JS on marketing pages (Server Components, static generation, ISR for resources).
- Budgets: marketing LCP \< 2 s on 4G; app route JS \< 250 KB gzip initial.
- Image uploads resized client-side (logos) before upload.

---

## 11. Error and empty/loading states

- Every data view has: skeleton, empty state with next-step CTA, error state with retry and request id, and forbidden state.
- Network offline banner; retry with exponential backoff for GET.
- Destructive actions require typed confirmation for void/write-off of high-value invoices (> ₹1 lakh configurable).

---

## 12. Analytics and feedback

- PostHog events (no PII): `signup_completed`, `onboarding_step_completed`, `import_committed`, `invoice_sent`, `payment_recorded`, `reminder_approved`, `reminder_skipped`, `report_exported`, `weekly_report_opened`.
- In-app feedback widget (thumbs + comment) writes to a `feedback` endpoint (add `Feedback` table or send to support inbox).
- Session replay disabled or masked on financial data pages.

---

## 13. Testing

| Level | Tool | Scope |
| --- | --- | --- |
| Unit | Vitest | Formatters, money/GST utils, hooks |
| Component | Testing Library | Forms (line items, allocation), tables, dialogs |
| Contract | MSW + OpenAPI types | API client against mocks |
| E2E | Playwright | Signup → onboarding → import → create/send invoice → record payment → approve reminder → view report; role-based visibility; portal flows |
| Visual | Storybook + Chromatic (optional) | Components in light/dark |
| Accessibility | axe-core in Playwright | Critical pages |
| Responsive | Playwright mobile viewport | Today, invoices, portal |

---

## 14. Frontend folder structure

```
src/app/
  (marketing)/ page.tsx, features/, pricing/, ... legal/
  (auth)/ login/ signup/ verify-email/ forgot-password/ reset-password/ mfa/ accept-invite/[token]/
  (onboarding)/ onboarding/ business/ invoice-settings/ import/ reminders/ team/ done/
  (app)/app/
     layout.tsx  today/ dashboard/ invoices/ clients/ payments/ credit-notes/
     reminders/ (rules/, templates/) disputes/ promises/ imports/ reports/ exports/
     bank/ recurring/ accountant/ settings/ help/ switch/ notifications/ search/
  (portal)/p/[token]/ page.tsx thanks/
  unsubscribe/[token]/
  (admin)/admin/ ...
  api/ ...
src/features/<feature>/
  api.ts          # typed calls
  hooks.ts        # useInvoices, useCreateInvoice ...
  components/     # feature components
  schemas.ts      # re-exports from shared
src/components/ui/        # shadcn primitives
src/components/shared/    # DataTable, MoneyText, StatusChip, ...
src/lib/                  # api client, formatters, cn, constants
```

---

## 15. Build order (solo developer)

1. Project setup, Tailwind, shadcn, theme, AppShell, auth pages, middleware, `/me` bootstrap.
2. Onboarding wizard + settings (business, invoicing).
3. Clients (list, create, detail).
4. Invoices (list, form with line items, detail, PDF preview, send dialog).
5. Payments (record, allocation, detail, reverse).
6. Today + dashboard + timeline/notes/disputes/promises.
7. Import wizard.
8. Reminders (templates, rules, approval queue, simulate).
9. Reports and exports.
10. Settings (team, notifications, billing, data, audit log).
11. Public portal + unsubscribe.
12. Marketing site, legal pages, pricing.
13. Polish: empty/error states, a11y, performance, E2E suite.
14. V1: bank, recurring, WhatsApp settings, payment links, accountant view, Hindi.

## 16. Definition of done per page

Route exists with correct guard and permission; loading/empty/error/forbidden states; responsive at 360/768/1280; keyboard accessible; analytics events wired; typed API hooks; unit/component test for critical logic; E2E coverage for primary path; copy reviewed; no console errors.