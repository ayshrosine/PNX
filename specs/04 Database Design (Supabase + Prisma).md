# Database Design Document (Supabase Postgres + Prisma ORM)

Product: invoice-to-payment workflow for Indian micro/small B2B service firms. Audience: the founder-developer building from scratch. Everything below is meant to be copied into the repo.

---

## 1. Decisions and rules

| # | Decision | Reason |
| --- | --- | --- |
| D1 | Supabase is used as **managed Postgres + Auth + Storage**. The browser never queries tables directly; all data access goes through the Next.js API (Prisma). | One security boundary, simpler authorization, no accidental exposure through the Supabase Data API. |
| D2 | Multi-tenant, shared schema, `tenantId` on every business table, enforced by **application scoping + Postgres Row-Level Security (RLS)**. | Defense in depth against tenant leakage. |
| D3 | Prisma connects with a dedicated low-privilege role `app_runtime` (not `postgres`, no `BYPASSRLS`). Migrations use a separate admin connection. | RLS is bypassed by superusers and table owners, so the runtime role must be neither. |
| D4 | Two connection strings: `DATABASE_URL` (Supavisor pooler, port 6543, `?pgbouncer=true&connection_limit=1`) for runtime; `DIRECT_URL` (port 5432) for `prisma migrate`. | Prisma needs a direct connection for migrations; serverless needs pooling. |
| D5 | Money = `Decimal(14,2)` in INR. API returns money as **strings**. All arithmetic uses `decimal.js` in services. | Avoid float errors; supports invoices above Rs 2.1 crore (which would overflow int paise). |
| D6 | Dates without time (`issueDate`, `dueDate`, `receivedOn`) use `@db.Date` and are interpreted in the tenant timezone (default `Asia/Kolkata`). Event timestamps use `timestamptz`. | Due-date logic must not shift with UTC. |
| D7 | Primary keys are UUID v4 (`gen_random_uuid()`), except `User.id` which equals Supabase `auth.users.id`. | Safe in URLs, no enumeration. |
| D8 | Issued invoices are immutable in money fields; corrections use credit/debit notes. Enforced by a DB trigger. | GST practice and audit integrity. |
| D9 | Soft delete via `archivedAt` / `voidedAt` for business records; hard delete only through the DPDP erase process. | Audit trail and legal retention. |
| D10 | Every mutation writes `AuditLog` in the same transaction. | Traceability. |
| D11 | Invoice status stored is the **lifecycle** status. "Overdue", "Due soon" are **derived** from `dueDate`, `balanceDue` and today (in tenant timezone). | No nightly status-rewrite job; no stale statuses. |

---

## 2. Entity overview

```mermaid
erDiagram
  Tenant ||--o{ Membership : has
  User ||--o{ Membership : joins
  Tenant ||--o{ Client : owns
  Client ||--o{ Contact : has
  Tenant ||--o{ InvoiceSeries : defines
  Client ||--o{ Invoice : billed
  InvoiceSeries ||--o{ Invoice : numbers
  Invoice ||--|{ InvoiceItem : contains
  Invoice ||--o{ PaymentAllocation : receives
  Payment ||--o{ PaymentAllocation : splits
  Client ||--o{ Payment : pays
  Invoice ||--o{ CreditNote : adjusted_by
  CreditNote ||--|{ CreditNoteItem : contains
  Invoice ||--o{ Reminder : triggers
  ReminderRule ||--o{ Reminder : generates
  ReminderTemplate ||--o{ ReminderRule : used_by
  Reminder ||--o{ MessageLog : delivers
  Invoice ||--o{ InvoiceActivity : logs
  Invoice ||--o{ Dispute : disputed
  Invoice ||--o{ Document : attaches
  Tenant ||--o{ ImportJob : runs
  ImportJob ||--o{ ImportRow : has
  Tenant ||--o{ BankAccount : links
  BankAccount ||--o{ BankTransaction : has
  BankTransaction ||--o| Payment : matched_to
  Tenant ||--o{ AuditLog : records
  Tenant ||--|| Subscription : subscribes
  Plan ||--o{ Subscription : defines
```

---

## 3. Complete Prisma schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ───────────── ENUMS ─────────────

enum TenantStatus { ACTIVE SUSPENDED CLOSED }
enum Role { OWNER ADMIN ACCOUNTANT VIEWER }
enum MembershipStatus { ACTIVE INVITED DISABLED }

enum MsmeClass { UNKNOWN MICRO SMALL MEDIUM NOT_MSME }
enum Tone { FRIENDLY NEUTRAL FIRM }
enum Channel { EMAIL WHATSAPP SMS }

enum InvoiceStatus { DRAFT SENT PART_PAID PAID VOID WRITTEN_OFF }
enum InvoiceSource { MANUAL IMPORT API RECURRING }

enum PaymentMode { BANK_TRANSFER UPI CHEQUE CASH CARD GATEWAY OTHER }

enum CreditNoteStatus { DRAFT ISSUED VOID }
enum CreditNoteType { CREDIT DEBIT }

enum TriggerType { BEFORE_DUE ON_DUE AFTER_DUE }
enum ReminderStatus { DRAFT APPROVED SCHEDULED SENT FAILED SKIPPED CANCELLED }
enum MessageStatus { QUEUED SENT DELIVERED READ FAILED BOUNCED }

enum ActivityType { NOTE CALL EMAIL WHATSAPP PROMISE_TO_PAY STATUS_CHANGE SYSTEM }
enum DisputeStatus { OPEN IN_REVIEW RESOLVED REJECTED }

enum DocumentKind { INVOICE_PDF CREDIT_NOTE_PDF ATTACHMENT RECEIPT CONTRACT STATEMENT REPORT IMPORT_FILE LOGO }

enum ImportKind { CLIENTS INVOICES PAYMENTS }
enum ImportStatus { UPLOADED MAPPED VALIDATING VALIDATED COMMITTING COMMITTED FAILED CANCELLED }
enum ImportRowStatus { PENDING VALID ERROR DUPLICATE COMMITTED SKIPPED }

enum JobStatus { PENDING RUNNING SUCCEEDED FAILED DEAD }
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELED }
enum DataRequestKind { EXPORT ERASE }
enum DataRequestStatus { RECEIVED IN_PROGRESS COMPLETED REJECTED }

// ───────────── TENANCY & USERS ─────────────

model Tenant {
  id               String       @id @default(uuid()) @db.Uuid
  name             String
  legalName        String?
  slug             String       @unique
  status           TenantStatus @default(ACTIVE)
  gstin            String?
  pan              String?
  stateCode        String?      @db.VarChar(2)
  addressLine1     String?
  addressLine2     String?
  city             String?
  state            String?
  pincode          String?
  country          String       @default("IN")
  email            String?
  phone            String?
  website          String?
  logoPath         String?
  bankName         String?
  bankAccountName  String?
  bankAccountLast4 String?      @db.VarChar(4)   // never store full account numbers here
  bankIfsc         String?
  upiId            String?
  invoiceFooter    String?
  defaultTerms     String?
  defaultNotes     String?
  currency         String       @default("INR")
  timezone         String       @default("Asia/Kolkata")
  fiscalYearStart  Int          @default(4)       // April
  defaultDueDays   Int          @default(30)
  quietHoursStart  String?      @default("20:00") // HH:mm local
  quietHoursEnd    String?      @default("09:00")
  sendOnWeekends   Boolean      @default(false)
  weeklyReportDay  Int          @default(1)       // 0=Sun..6=Sat
  settings         Json         @default("{}")
  onboardingStep   String       @default("business")
  createdAt        DateTime     @default(now()) @db.Timestamptz
  updatedAt        DateTime     @updatedAt @db.Timestamptz

  memberships      Membership[]
  invites          Invite[]
  clients          Client[]
  contacts         Contact[]
  series           InvoiceSeries[]
  invoices         Invoice[]
  invoiceItems     InvoiceItem[]
  payments         Payment[]
  allocations      PaymentAllocation[]
  creditNotes      CreditNote[]
  creditNoteItems  CreditNoteItem[]
  recurring        RecurringTemplate[]
  templates        ReminderTemplate[]
  rules            ReminderRule[]
  reminders        Reminder[]
  messageLogs      MessageLog[]
  activities       InvoiceActivity[]
  disputes         Dispute[]
  documents        Document[]
  importJobs       ImportJob[]
  bankAccounts     BankAccount[]
  bankTxns         BankTransaction[]
  notifications    Notification[]
  auditLogs        AuditLog[]
  subscription     Subscription?
  usage            UsageRecord[]
  dataRequests     DataRequest[]
  apiKeys          ApiKey[]
  jobs             Job[]

  @@map("tenants")
}

model User {
  id          String    @id @db.Uuid               // = auth.users.id
  email       String    @unique
  fullName    String?
  phone       String?
  avatarPath  String?
  locale      String    @default("en")
  lastLoginAt DateTime? @db.Timestamptz
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz

  memberships   Membership[]
  notifications Notification[]

  @@map("users")
}

model Membership {
  id          String           @id @default(uuid()) @db.Uuid
  tenantId    String           @db.Uuid
  userId      String           @db.Uuid
  role        Role
  status      MembershipStatus @default(ACTIVE)
  invitedById String?          @db.Uuid
  canApprove  Boolean          @default(true)   // admin-level toggle for reminder approval
  createdAt   DateTime         @default(now()) @db.Timestamptz
  updatedAt   DateTime         @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@index([userId])
  @@map("memberships")
}

model Invite {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  email       String
  role        Role
  tokenHash   String    @unique        // sha256 of the emailed token
  expiresAt   DateTime  @db.Timestamptz
  acceptedAt  DateTime? @db.Timestamptz
  revokedAt   DateTime? @db.Timestamptz
  invitedById String    @db.Uuid
  createdAt   DateTime  @default(now()) @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, email])
  @@map("invites")
}

// ───────────── CLIENTS ─────────────

model Client {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  name             String
  displayName      String?
  code             String?                       // optional internal customer code
  gstin            String?
  pan              String?
  msmeClass        MsmeClass @default(UNKNOWN)
  udyamNumber      String?
  paymentTermsDays Int       @default(30)
  addressLine1     String?
  addressLine2     String?
  city             String?
  state            String?
  stateCode        String?   @db.VarChar(2)
  pincode          String?
  country          String    @default("IN")
  reminderTone     Tone      @default(NEUTRAL)
  remindersPaused  Boolean   @default(false)
  pausedUntil      DateTime? @db.Date
  pauseReason      String?
  creditLimit      Decimal?  @db.Decimal(14, 2)
  notes            String?
  tags             String[]  @default([])
  externalRef      String?                       // id from Tally/Zoho/Excel
  archivedAt       DateTime? @db.Timestamptz
  createdById      String?   @db.Uuid
  createdAt        DateTime  @default(now()) @db.Timestamptz
  updatedAt        DateTime  @updatedAt @db.Timestamptz

  tenant       Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contacts     Contact[]
  invoices     Invoice[]
  payments     Payment[]
  creditNotes  CreditNote[]
  reminders    Reminder[]
  rules        ReminderRule[]
  recurring    RecurringTemplate[]
  documents    Document[]

  @@unique([tenantId, code])
  @@index([tenantId, name])
  @@index([tenantId, archivedAt])
  @@index([tenantId, gstin])
  @@map("clients")
}

model Contact {
  id                 String    @id @default(uuid()) @db.Uuid
  tenantId           String    @db.Uuid
  clientId           String    @db.Uuid
  name               String
  designation        String?
  email              String?
  phone              String?
  whatsappNumber     String?
  isPrimary          Boolean   @default(false)
  isBilling          Boolean   @default(true)
  consentEmail       Boolean   @default(true)   // client attests it may message this person
  consentWhatsapp    Boolean   @default(false)
  consentRecordedAt  DateTime? @db.Timestamptz
  consentRecordedBy  String?   @db.Uuid
  unsubscribedAt     DateTime? @db.Timestamptz
  archivedAt         DateTime? @db.Timestamptz
  createdAt          DateTime  @default(now()) @db.Timestamptz
  updatedAt          DateTime  @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([tenantId, clientId])
  @@index([tenantId, email])
  @@map("contacts")
}

// ───────────── INVOICING ─────────────

model InvoiceSeries {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  name        String
  prefix      String                      // e.g. "INV/"
  suffix      String   @default("")
  fiscalYear  String                      // e.g. "2026-27"
  nextNumber  Int      @default(1)
  padding     Int      @default(4)
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoices Invoice[]

  @@unique([tenantId, prefix, suffix, fiscalYear])
  @@map("invoice_series")
}

model Invoice {
  id               String        @id @default(uuid()) @db.Uuid
  tenantId         String        @db.Uuid
  clientId         String        @db.Uuid
  seriesId         String?       @db.Uuid
  number           String                          // full formatted, e.g. "INV/2026-27/0042"
  status           InvoiceStatus @default(DRAFT)
  source           InvoiceSource @default(MANUAL)
  issueDate        DateTime      @db.Date
  dueDate          DateTime      @db.Date
  currency         String        @default("INR")
  placeOfSupply    String?       @db.VarChar(2)
  isReverseCharge  Boolean       @default(false)
  isInterState     Boolean       @default(false)
  poNumber         String?
  reference        String?
  subtotal         Decimal       @default(0) @db.Decimal(14, 2)
  discountTotal    Decimal       @default(0) @db.Decimal(14, 2)
  taxableAmount    Decimal       @default(0) @db.Decimal(14, 2)
  cgst             Decimal       @default(0) @db.Decimal(14, 2)
  sgst             Decimal       @default(0) @db.Decimal(14, 2)
  igst             Decimal       @default(0) @db.Decimal(14, 2)
  cess             Decimal       @default(0) @db.Decimal(14, 2)
  taxTotal         Decimal       @default(0) @db.Decimal(14, 2)
  tdsExpected      Decimal       @default(0) @db.Decimal(14, 2)  // informational
  roundOff         Decimal       @default(0) @db.Decimal(6, 2)
  total            Decimal       @default(0) @db.Decimal(14, 2)
  amountPaid       Decimal       @default(0) @db.Decimal(14, 2)  // cash + TDS allocated
  amountCredited   Decimal       @default(0) @db.Decimal(14, 2)  // credit notes applied
  balanceDue       Decimal       @default(0) @db.Decimal(14, 2)  // total - paid - credited
  notes            String?
  terms            String?
  publicToken      String        @unique @default(uuid())        // for client portal view link
  sentAt           DateTime?     @db.Timestamptz
  sentVia          Channel?
  firstViewedAt    DateTime?     @db.Timestamptz
  lastViewedAt     DateTime?     @db.Timestamptz
  viewCount        Int           @default(0)
  paidAt           DateTime?     @db.Timestamptz
  isDisputed       Boolean       @default(false)
  remindersPaused  Boolean       @default(false)
  voidedAt         DateTime?     @db.Timestamptz
  voidReason       String?
  writtenOffAt     DateTime?     @db.Timestamptz
  pdfPath          String?
  importJobId      String?       @db.Uuid
  recurringId      String?       @db.Uuid
  externalRef      String?
  version          Int           @default(1)                      // optimistic locking
  createdById      String?       @db.Uuid
  createdAt        DateTime      @default(now()) @db.Timestamptz
  updatedAt        DateTime      @updatedAt @db.Timestamptz

  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client      Client              @relation(fields: [clientId], references: [id])
  series      InvoiceSeries?      @relation(fields: [seriesId], references: [id])
  recurring   RecurringTemplate?  @relation(fields: [recurringId], references: [id])
  items       InvoiceItem[]
  allocations PaymentAllocation[]
  creditNotes CreditNote[]
  reminders   Reminder[]
  activities  InvoiceActivity[]
  disputes    Dispute[]
  documents   Document[]
  messageLogs MessageLog[]

  @@unique([tenantId, number])
  @@index([tenantId, status, dueDate])
  @@index([tenantId, clientId, status])
  @@index([tenantId, dueDate])
  @@index([tenantId, issueDate])
  @@index([tenantId, balanceDue])
  @@index([tenantId, importJobId])
  @@map("invoices")
}

model InvoiceItem {
  id             String  @id @default(uuid()) @db.Uuid
  tenantId       String  @db.Uuid
  invoiceId      String  @db.Uuid
  position       Int
  description    String
  hsnSac         String?
  quantity       Decimal @default(1) @db.Decimal(12, 3)
  unit           String? @default("NOS")
  rate           Decimal @db.Decimal(14, 2)
  discountPct    Decimal @default(0) @db.Decimal(5, 2)
  taxRate        Decimal @default(0) @db.Decimal(5, 2)    // total GST %, e.g. 18
  taxableAmount  Decimal @db.Decimal(14, 2)
  taxAmount      Decimal @db.Decimal(14, 2)
  lineTotal      Decimal @db.Decimal(14, 2)

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@unique([invoiceId, position])
  @@index([tenantId, invoiceId])
  @@map("invoice_items")
}

model RecurringTemplate {            // V1
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  clientId    String    @db.Uuid
  name        String
  frequency   String                // WEEKLY | MONTHLY | QUARTERLY | YEARLY
  intervalN   Int       @default(1)
  startDate   DateTime  @db.Date
  endDate     DateTime? @db.Date
  nextRunOn   DateTime  @db.Date
  autoSend    Boolean   @default(false)
  dueDays     Int       @default(30)
  seriesId    String?   @db.Uuid
  payload     Json                  // items, notes, terms
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client   Client    @relation(fields: [clientId], references: [id])
  invoices Invoice[]

  @@index([tenantId, isActive, nextRunOn])
  @@map("recurring_templates")
}

// ───────────── PAYMENTS & CREDIT NOTES ─────────────

model Payment {
  id                String      @id @default(uuid()) @db.Uuid
  tenantId          String      @db.Uuid
  clientId          String      @db.Uuid
  amount            Decimal     @db.Decimal(14, 2)     // cash received
  tdsAmount         Decimal     @default(0) @db.Decimal(14, 2)
  allocatedAmount   Decimal     @default(0) @db.Decimal(14, 2)
  unallocatedAmount Decimal     @default(0) @db.Decimal(14, 2)
  receivedOn        DateTime    @db.Date
  mode              PaymentMode @default(BANK_TRANSFER)
  reference         String?                           // UTR / cheque no / txn id
  notes             String?
  bankTxnId         String?     @unique @db.Uuid
  gatewayPaymentId  String?     @unique
  voidedAt          DateTime?   @db.Timestamptz
  voidReason        String?
  importJobId       String?     @db.Uuid
  recordedById      String?     @db.Uuid
  createdAt         DateTime    @default(now()) @db.Timestamptz
  updatedAt         DateTime    @updatedAt @db.Timestamptz

  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client      Client              @relation(fields: [clientId], references: [id])
  bankTxn     BankTransaction?    @relation(fields: [bankTxnId], references: [id])
  allocations PaymentAllocation[]

  @@index([tenantId, clientId])
  @@index([tenantId, receivedOn])
  @@index([tenantId, reference])
  @@map("payments")
}

model PaymentAllocation {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  paymentId String   @db.Uuid
  invoiceId String   @db.Uuid
  amount    Decimal  @db.Decimal(14, 2)       // cash portion
  tdsAmount Decimal  @default(0) @db.Decimal(14, 2)
  createdAt DateTime @default(now()) @db.Timestamptz
  reversedAt DateTime? @db.Timestamptz

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@unique([paymentId, invoiceId])
  @@index([tenantId, invoiceId])
  @@map("payment_allocations")
}

model CreditNote {
  id          String           @id @default(uuid()) @db.Uuid
  tenantId    String           @db.Uuid
  clientId    String           @db.Uuid
  invoiceId   String?          @db.Uuid
  type        CreditNoteType   @default(CREDIT)
  number      String
  status      CreditNoteStatus @default(DRAFT)
  issueDate   DateTime         @db.Date
  reason      String
  subtotal    Decimal          @default(0) @db.Decimal(14, 2)
  taxTotal    Decimal          @default(0) @db.Decimal(14, 2)
  total       Decimal          @default(0) @db.Decimal(14, 2)
  pdfPath     String?
  issuedAt    DateTime?        @db.Timestamptz
  voidedAt    DateTime?        @db.Timestamptz
  createdById String?          @db.Uuid
  createdAt   DateTime         @default(now()) @db.Timestamptz
  updatedAt   DateTime         @updatedAt @db.Timestamptz

  tenant  Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client  Client           @relation(fields: [clientId], references: [id])
  invoice Invoice?         @relation(fields: [invoiceId], references: [id])
  items   CreditNoteItem[]

  @@unique([tenantId, number])
  @@index([tenantId, invoiceId])
  @@map("credit_notes")
}

model CreditNoteItem {
  id           String  @id @default(uuid()) @db.Uuid
  tenantId     String  @db.Uuid
  creditNoteId String  @db.Uuid
  position     Int
  description  String
  hsnSac       String?
  quantity     Decimal @default(1) @db.Decimal(12, 3)
  rate         Decimal @db.Decimal(14, 2)
  taxRate      Decimal @default(0) @db.Decimal(5, 2)
  taxableAmount Decimal @db.Decimal(14, 2)
  taxAmount    Decimal @db.Decimal(14, 2)
  lineTotal    Decimal @db.Decimal(14, 2)

  tenant     Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creditNote CreditNote @relation(fields: [creditNoteId], references: [id], onDelete: Cascade)

  @@unique([creditNoteId, position])
  @@map("credit_note_items")
}

// ───────────── REMINDERS & MESSAGING ─────────────

model ReminderTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  name      String
  channel   Channel  @default(EMAIL)
  tone      Tone     @default(NEUTRAL)
  language  String   @default("en")
  subject   String?
  body      String                                 // supports {{client_name}} {{invoice_number}} {{amount_due}} {{due_date}} {{days_overdue}} {{business_name}} {{payment_details}} {{invoice_link}}
  waTemplateName String?                           // approved WhatsApp template id
  isDefault Boolean  @default(false)
  isSystem  Boolean  @default(false)
  archivedAt DateTime? @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  tenant Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rules  ReminderRule[]

  @@index([tenantId, channel])
  @@map("reminder_templates")
}

model ReminderRule {
  id               String      @id @default(uuid()) @db.Uuid
  tenantId         String      @db.Uuid
  clientId         String?     @db.Uuid               // null = default for all clients
  name             String
  triggerType      TriggerType
  offsetDays       Int         @default(0)            // days before/after due date
  channel          Channel     @default(EMAIL)
  templateId       String      @db.Uuid
  requiresApproval Boolean     @default(true)
  minBalance       Decimal?    @db.Decimal(14, 2)
  escalateToOwner  Boolean     @default(false)
  position         Int         @default(0)
  isActive         Boolean     @default(true)
  createdAt        DateTime    @default(now()) @db.Timestamptz
  updatedAt        DateTime    @updatedAt @db.Timestamptz

  tenant    Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  client    Client?          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  template  ReminderTemplate @relation(fields: [templateId], references: [id])
  reminders Reminder[]

  @@index([tenantId, isActive])
  @@map("reminder_rules")
}

model Reminder {
  id            String         @id @default(uuid()) @db.Uuid
  tenantId      String         @db.Uuid
  invoiceId     String         @db.Uuid
  clientId      String         @db.Uuid
  ruleId        String?        @db.Uuid
  contactId     String?        @db.Uuid
  channel       Channel
  status        ReminderStatus @default(DRAFT)
  dedupeKey     String                                 // `${invoiceId}:${ruleId}:${yyyy-mm-dd}`
  dueForDate    DateTime       @db.Date                // the day this reminder is meant for
  subject       String?
  body          String
  toEmail       String?
  toPhone       String?
  requiresApproval Boolean     @default(true)
  approvedById  String?        @db.Uuid
  approvedAt    DateTime?      @db.Timestamptz
  scheduledFor  DateTime?      @db.Timestamptz
  sentAt        DateTime?      @db.Timestamptz
  skipReason    String?
  errorMessage  String?
  attempts      Int            @default(0)
  manual        Boolean        @default(false)
  createdAt     DateTime       @default(now()) @db.Timestamptz
  updatedAt     DateTime       @updatedAt @db.Timestamptz

  tenant   Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice  Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  client   Client        @relation(fields: [clientId], references: [id])
  rule     ReminderRule? @relation(fields: [ruleId], references: [id], onDelete: SetNull)
  logs     MessageLog[]

  @@unique([tenantId, dedupeKey])
  @@index([tenantId, status, dueForDate])
  @@index([tenantId, invoiceId])
  @@map("reminders")
}

model MessageLog {
  id                String        @id @default(uuid()) @db.Uuid
  tenantId          String        @db.Uuid
  reminderId        String?       @db.Uuid
  invoiceId         String?       @db.Uuid
  channel           Channel
  provider          String                                // resend | ses | gupshup | twilio | ...
  providerMessageId String?
  toAddress         String
  subject           String?
  status            MessageStatus @default(QUEUED)
  sentAt            DateTime?     @db.Timestamptz
  deliveredAt       DateTime?     @db.Timestamptz
  readAt            DateTime?     @db.Timestamptz
  failedReason      String?
  rawEvent          Json?
  createdAt         DateTime      @default(now()) @db.Timestamptz

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reminder Reminder? @relation(fields: [reminderId], references: [id], onDelete: SetNull)
  invoice  Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([tenantId, invoiceId])
  @@index([provider, providerMessageId])
  @@map("message_logs")
}

// ───────────── COLLECTIONS WORKFLOW ─────────────

model InvoiceActivity {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  invoiceId     String       @db.Uuid
  type          ActivityType
  body          String?
  promisedDate  DateTime?    @db.Date
  promisedAmount Decimal?    @db.Decimal(14, 2)
  meta          Json?
  createdById   String?      @db.Uuid
  createdAt     DateTime     @default(now()) @db.Timestamptz

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([tenantId, invoiceId, createdAt])
  @@index([tenantId, promisedDate])
  @@map("invoice_activities")
}

model Dispute {
  id           String        @id @default(uuid()) @db.Uuid
  tenantId     String        @db.Uuid
  invoiceId    String        @db.Uuid
  status       DisputeStatus @default(OPEN)
  reason       String
  raisedOn     DateTime      @db.Date
  resolvedOn   DateTime?     @db.Date
  resolution   String?
  assignedToId String?       @db.Uuid
  createdById  String?       @db.Uuid
  createdAt    DateTime      @default(now()) @db.Timestamptz
  updatedAt    DateTime      @updatedAt @db.Timestamptz

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@map("disputes")
}

// ───────────── FILES & IMPORTS ─────────────

model Document {
  id           String       @id @default(uuid()) @db.Uuid
  tenantId     String       @db.Uuid
  kind         DocumentKind
  invoiceId    String?      @db.Uuid
  clientId     String?      @db.Uuid
  storageBucket String
  storagePath  String
  fileName     String
  mimeType     String
  sizeBytes    Int
  checksum     String?
  uploadedById String?      @db.Uuid
  createdAt    DateTime     @default(now()) @db.Timestamptz
  deletedAt    DateTime?    @db.Timestamptz

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoice Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  client  Client?  @relation(fields: [clientId], references: [id], onDelete: SetNull)

  @@index([tenantId, invoiceId])
  @@index([tenantId, clientId])
  @@map("documents")
}

model ImportJob {
  id             String       @id @default(uuid()) @db.Uuid
  tenantId       String       @db.Uuid
  kind           ImportKind
  status         ImportStatus @default(UPLOADED)
  fileName       String
  storagePath    String
  mapping        Json?                           // {sourceColumn: targetField}
  options        Json         @default("{}")     // dateFormat, defaultSeries, duplicateStrategy
  totalRows      Int          @default(0)
  validRows      Int          @default(0)
  errorRows      Int          @default(0)
  duplicateRows  Int          @default(0)
  committedRows  Int          @default(0)
  errorReportPath String?
  createdById    String?      @db.Uuid
  startedAt      DateTime?    @db.Timestamptz
  finishedAt     DateTime?    @db.Timestamptz
  failureReason  String?
  createdAt      DateTime     @default(now()) @db.Timestamptz
  updatedAt      DateTime     @updatedAt @db.Timestamptz

  tenant Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rows   ImportRow[]

  @@index([tenantId, createdAt])
  @@map("import_jobs")
}

model ImportRow {
  id          String          @id @default(uuid()) @db.Uuid
  importJobId String          @db.Uuid
  tenantId    String          @db.Uuid
  rowNumber   Int
  raw         Json
  normalized  Json?
  status      ImportRowStatus @default(PENDING)
  errors      Json?
  createdEntityId String?     @db.Uuid

  job ImportJob @relation(fields: [importJobId], references: [id], onDelete: Cascade)

  @@unique([importJobId, rowNumber])
  @@index([importJobId, status])
  @@map("import_rows")
}

// ───────────── BANK (V1) ─────────────

model BankAccount {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  name        String
  bankName    String?
  last4       String?  @db.VarChar(4)
  ifsc        String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz

  tenant Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  txns   BankTransaction[]

  @@map("bank_accounts")
}

model BankTransaction {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  bankAccountId  String   @db.Uuid
  txnDate        DateTime @db.Date
  narration      String
  reference      String?
  credit         Decimal  @default(0) @db.Decimal(14, 2)
  debit          Decimal  @default(0) @db.Decimal(14, 2)
  balance        Decimal? @db.Decimal(14, 2)
  fingerprint    String                              // hash(date|amount|narration|ref) for dedupe
  matchStatus    String   @default("UNMATCHED")      // UNMATCHED | SUGGESTED | MATCHED | IGNORED
  suggestedClientId String? @db.Uuid
  importJobId    String?  @db.Uuid
  createdAt      DateTime @default(now()) @db.Timestamptz

  tenant  Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  payment Payment?

  @@unique([tenantId, bankAccountId, fingerprint])
  @@index([tenantId, matchStatus])
  @@map("bank_transactions")
}

// ───────────── PLATFORM ─────────────

model Notification {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  userId    String    @db.Uuid
  type      String                                   // REMINDERS_PENDING, PAYMENT_RECORDED, IMPORT_DONE, ...
  title     String
  body      String?
  link      String?
  readAt    DateTime? @db.Timestamptz
  createdAt DateTime  @default(now()) @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId, readAt])
  @@map("notifications")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  actorId    String?  @db.Uuid
  actorType  String   @default("USER")               // USER | SYSTEM | API_KEY | PORTAL
  action     String                                  // invoice.created, payment.voided, ...
  entity     String
  entityId   String?
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  requestId  String?
  createdAt  DateTime @default(now()) @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([tenantId, entity, entityId])
  @@map("audit_logs")
}

model Plan {
  code          String  @id                          // STARTER | GROWTH | MANAGED
  name          String
  priceMonthly  Decimal @db.Decimal(10, 2)
  priceYearly   Decimal? @db.Decimal(10, 2)
  invoiceLimit  Int?                                 // per month, null = unlimited
  seatLimit     Int?
  features      Json    @default("{}")
  isActive      Boolean @default(true)

  subscriptions Subscription[]

  @@map("plans")
}

model Subscription {
  id                 String             @id @default(uuid()) @db.Uuid
  tenantId           String             @unique @db.Uuid
  planCode           String
  status             SubscriptionStatus @default(TRIALING)
  trialEndsAt        DateTime?          @db.Timestamptz
  currentPeriodStart DateTime?          @db.Timestamptz
  currentPeriodEnd   DateTime?          @db.Timestamptz
  cancelAtPeriodEnd  Boolean            @default(false)
  gatewaySubscriptionId String?
  gatewayCustomerId  String?
  createdAt          DateTime           @default(now()) @db.Timestamptz
  updatedAt          DateTime           @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan   Plan   @relation(fields: [planCode], references: [code])

  @@map("subscriptions")
}

model UsageRecord {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  period    String                                   // "2026-10"
  metric    String                                   // invoices_created | reminders_sent | whatsapp_sent
  quantity  Int      @default(0)
  updatedAt DateTime @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, period, metric])
  @@map("usage_records")
}

model ApiKey {                                        // V2
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  name       String
  keyPrefix  String
  keyHash    String    @unique
  scopes     String[]
  lastUsedAt DateTime? @db.Timestamptz
  revokedAt  DateTime? @db.Timestamptz
  createdById String   @db.Uuid
  createdAt  DateTime  @default(now()) @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("api_keys")
}

model DataRequest {                                   // DPDP export / erase workflow
  id          String            @id @default(uuid()) @db.Uuid
  tenantId    String            @db.Uuid
  kind        DataRequestKind
  status      DataRequestStatus @default(RECEIVED)
  requestedById String?         @db.Uuid
  subjectEmail String?
  details     String?
  resultPath  String?
  dueBy       DateTime?         @db.Date
  completedAt DateTime?         @db.Timestamptz
  createdAt   DateTime          @default(now()) @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("data_requests")
}

model WebhookEvent {                                  // idempotency for provider webhooks (no tenant)
  id          String    @id @default(uuid()) @db.Uuid
  provider    String
  eventId     String
  type        String?
  payload     Json
  receivedAt  DateTime  @default(now()) @db.Timestamptz
  processedAt DateTime? @db.Timestamptz
  error       String?

  @@unique([provider, eventId])
  @@map("webhook_events")
}

model Job {                                           // DB-backed queue
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String?   @db.Uuid
  type       String                                  // reminders.generate | reminders.send | report.weekly | import.validate | import.commit | invoice.pdf | ...
  payload    Json      @default("{}")
  status     JobStatus @default(PENDING)
  runAt      DateTime  @default(now()) @db.Timestamptz
  attempts   Int       @default(0)
  maxAttempts Int      @default(5)
  lockedAt   DateTime? @db.Timestamptz
  lockedBy   String?
  lastError  String?
  uniqueKey  String?   @unique
  finishedAt DateTime? @db.Timestamptz
  createdAt  DateTime  @default(now()) @db.Timestamptz

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([status, runAt])
  @@index([type, status])
  @@map("jobs")
}
```

---

## 4. Data dictionary highlights

| Table | Purpose | Key rules |
| --- | --- | --- |
| `tenants` | One row per client business | `slug` unique; `bankAccountLast4` only; GSTIN validated by regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` in service layer |
| `users` | App profile for a Supabase Auth user | `id` equals `auth.users.id`; created on first login via server callback |
| `memberships` | Link user to tenant with role | One user can belong to multiple tenants (accountant use-case) |
| `clients` | Customers of the tenant | `msmeClass` drives the 43B(h) flag; `remindersPaused` stops all reminders |
| `contacts` | People to message | Consent flags are attested by the tenant; no message goes to a contact with `unsubscribedAt` set |
| `invoice_series` | Numbering | Row-locked increment inside the same transaction as invoice issue |
| `invoices` | Core ledger | `balanceDue = total - amountPaid - amountCredited`; immutable money fields after issue |
| `payments` + `payment_allocations` | Receipts and which invoices they settle | One payment can split across many invoices; unallocated remainder is an advance |
| `reminders` | Drafts and sent reminders | `dedupeKey` prevents duplicates on job re-run |
| `message_logs` | Provider events | Updated by webhooks (delivered, read, bounced) |
| `invoice_activities` | Timeline: notes, calls, promise-to-pay | Drives the "promises due today" list |
| `jobs` | Queue | Claimed with `FOR UPDATE SKIP LOCKED` |

### 4.1 Derived invoice states (SQL/service logic)

```
overdue        = status IN (SENT, PART_PAID) AND balanceDue > 0 AND dueDate < today_local
due_soon       = status IN (SENT, PART_PAID) AND balanceDue > 0 AND dueDate BETWEEN today AND today+7
days_overdue   = GREATEST(0, today_local - dueDate)
ageing_bucket  = CASE days_overdue: 0 -> 'CURRENT', 1-15, 16-30, 31-45, 46-60, 60+
msme_43bh_risk = client.msmeClass IN (MICRO, SMALL) is on the buyer's side. For the seller (your tenant), the flag is informational:
                 "Your client is a buyer; if YOU are Micro/Small (tenant.settings.msmeClass), days_overdue > 45 (or agreed shorter term) highlights the 43B(h) clock on the invoice".
```

### 4.2 Status transitions

```
DRAFT --issue--> SENT --payment--> PART_PAID --payment--> PAID
DRAFT/SENT/PART_PAID --void (no allocations)--> VOID
SENT/PART_PAID --write-off--> WRITTEN_OFF
PAID --reverse payment--> PART_PAID or SENT
```

Rules: a `VOID` invoice keeps its number (never reused). Void requires zero active allocations. Reversal of a payment recomputes balance and status inside one transaction.

---

## 5. Setup: Supabase roles, RLS, functions, triggers (SQL migration)

Create `prisma/migrations/<timestamp>_security_baseline/migration.sql` (run after the Prisma tables exist; use `prisma migrate dev --create-only` and paste).

### 5.1 Runtime role

```sql
-- run once as postgres
CREATE ROLE app_runtime LOGIN PASSWORD '<strong-random>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- keep Supabase's public API roles out of business tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
```

Runtime `DATABASE_URL` uses `app_runtime`; `DIRECT_URL` uses an admin role for migrations. Also disable the Data API for the `public` schema in Supabase settings.

### 5.2 Tenant helper

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA app TO app_runtime;
GRANT EXECUTE ON FUNCTION app.current_tenant() TO app_runtime;
```

### 5.3 Enable RLS on every tenant table

```sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','contacts','invoice_series','invoices','invoice_items','recurring_templates',
    'payments','payment_allocations','credit_notes','credit_note_items',
    'reminder_templates','reminder_rules','reminders','message_logs',
    'invoice_activities','disputes','documents','import_jobs','import_rows',
    'bank_accounts','bank_transactions','notifications','audit_logs',
    'usage_records','api_keys','data_requests','invites'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation ON %I
      USING ("tenantId" = app.current_tenant())
      WITH CHECK ("tenantId" = app.current_tenant())$f$, t);
  END LOOP;
END $$;

-- tables keyed differently
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY; ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenants USING (id = app.current_tenant()) WITH CHECK (id = app.current_tenant());

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY; ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_tenant ON memberships USING ("tenantId" = app.current_tenant()) WITH CHECK ("tenantId" = app.current_tenant());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY sub_tenant ON subscriptions USING ("tenantId" = app.current_tenant()) WITH CHECK ("tenantId" = app.current_tenant());
```

Pre-tenant operations (signup, login lookup of memberships, invite accept, webhooks, job runner) need a controlled bypass. Provide a second role `app_system` with `BYPASSRLS`, used only by (a) auth callback, (b) job runner, (c) webhook handlers, via a separate Prisma client (`prismaSystem`) with its own connection string `SYSTEM_DATABASE_URL`. Keep this client in a single module `src/server/db/system.ts` and forbid imports from route handlers via an ESLint `no-restricted-imports` rule.

```sql
CREATE ROLE app_system LOGIN PASSWORD '<strong-random>' NOSUPERUSER BYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_system;
```

### 5.4 Prisma client with tenant context

```ts
// src/server/db/tenant-client.ts
import { PrismaClient } from '@prisma/client';
const base = new PrismaClient();

export function dbForTenant(tenantId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
```

For multi-statement units of work, use an interactive transaction and set the config once:

```ts
export async function withTenantTx<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return base.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`;
    return fn(tx);
  }, { timeout: 15000, isolationLevel: 'ReadCommitted' });
}
```

**Rule:** every service method receives `ctx = { tenantId, userId, role }` and uses `withTenantTx`. Services also include `tenantId` in every `where` (belt and braces).

### 5.5 Invoice numbering function

```sql
CREATE OR REPLACE FUNCTION next_invoice_number(p_series uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE s invoice_series%ROWTYPE; n int;
BEGIN
  UPDATE invoice_series SET "nextNumber" = "nextNumber" + 1
   WHERE id = p_series AND "tenantId" = app.current_tenant()
   RETURNING * INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'series not found'; END IF;
  n := s."nextNumber" - 1;
  RETURN s.prefix || s."fiscalYear" || '/' || lpad(n::text, s.padding, '0') || s.suffix;
END $$;
```

Call with `SELECT next_invoice_number($1)` inside the same transaction that moves the invoice from DRAFT to SENT. Draft invoices carry a temporary number `DRAFT-<shortid>`; the real number is assigned on issue so there are no gaps from abandoned drafts.

### 5.6 Immutability guard

```sql
CREATE OR REPLACE FUNCTION guard_issued_invoice() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
       NEW.total <> OLD.total OR NEW.subtotal <> OLD.subtotal OR NEW."taxTotal" <> OLD."taxTotal"
    OR NEW."clientId" <> OLD."clientId" OR NEW."issueDate" <> OLD."issueDate" OR NEW.number <> OLD.number
  ) THEN
    RAISE EXCEPTION 'Issued invoice % is immutable; issue a credit/debit note', OLD.number;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_issued_invoice BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION guard_issued_invoice();

CREATE OR REPLACE FUNCTION guard_issued_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st "InvoiceStatus";
BEGIN
  SELECT status INTO st FROM invoices WHERE id = COALESCE(NEW."invoiceId", OLD."invoiceId");
  IF st <> 'DRAFT' THEN RAISE EXCEPTION 'Items of an issued invoice cannot change'; END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_guard_items BEFORE INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION guard_issued_items();
```

(Items are inserted for draft invoices; when the app issues an invoice, status changes after item totals are final.)

### 5.7 Check constraints

```sql
ALTER TABLE invoices ADD CONSTRAINT chk_inv_amounts CHECK (total >= 0 AND "amountPaid" >= 0 AND "amountCredited" >= 0 AND "balanceDue" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_inv_dates   CHECK ("dueDate" >= "issueDate");
ALTER TABLE invoices ADD CONSTRAINT chk_inv_balance CHECK ("balanceDue" = total - "amountPaid" - "amountCredited");
ALTER TABLE payments ADD CONSTRAINT chk_pay_amounts CHECK (amount > 0 AND "tdsAmount" >= 0 AND "allocatedAmount" >= 0 AND "unallocatedAmount" >= 0);
ALTER TABLE payment_allocations ADD CONSTRAINT chk_alloc_pos CHECK (amount >= 0 AND "tdsAmount" >= 0 AND (amount + "tdsAmount") > 0);
ALTER TABLE invoice_items ADD CONSTRAINT chk_item_pos CHECK (quantity > 0 AND rate >= 0 AND "taxRate" BETWEEN 0 AND 100 AND "discountPct" BETWEEN 0 AND 100);
ALTER TABLE reminder_rules ADD CONSTRAINT chk_rule_offset CHECK ("offsetDays" BETWEEN 0 AND 365);
ALTER TABLE clients ADD CONSTRAINT chk_terms CHECK ("paymentTermsDays" BETWEEN 0 AND 365);
```

If the check on `balanceDue` rejects rounding differences, store tax in line items with round-half-up to 2 decimals and compute totals only from stored line values.

### 5.8 Immutable audit log

```sql
REVOKE UPDATE, DELETE ON audit_logs FROM app_runtime;   -- insert + select only
```

### 5.9 Useful views (read-only, tenant-scoped via RLS using `security_invoker`)

```sql
CREATE OR REPLACE VIEW v_invoice_ageing WITH (security_invoker = true) AS
SELECT i."tenantId", i.id, i."clientId", i.number, i."dueDate", i."balanceDue",
       GREATEST(0, (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date - i."dueDate") AS days_overdue,
       CASE
         WHEN i."dueDate" >= CURRENT_DATE THEN 'CURRENT'
         WHEN CURRENT_DATE - i."dueDate" <= 15 THEN '1-15'
         WHEN CURRENT_DATE - i."dueDate" <= 30 THEN '16-30'
         WHEN CURRENT_DATE - i."dueDate" <= 45 THEN '31-45'
         WHEN CURRENT_DATE - i."dueDate" <= 60 THEN '46-60'
         ELSE '60+' END AS bucket
FROM invoices i
WHERE i.status IN ('SENT','PART_PAID') AND i."balanceDue" > 0;

CREATE OR REPLACE VIEW v_client_balances WITH (security_invoker = true) AS
SELECT i."tenantId", i."clientId",
       SUM(i."balanceDue") AS outstanding,
       SUM(i."balanceDue") FILTER (WHERE i."dueDate" < CURRENT_DATE) AS overdue,
       COUNT(*) FILTER (WHERE i."dueDate" < CURRENT_DATE) AS overdue_count,
       MIN(i."dueDate") FILTER (WHERE i."dueDate" < CURRENT_DATE) AS oldest_due
FROM invoices i WHERE i.status IN ('SENT','PART_PAID') AND i."balanceDue" > 0
GROUP BY i."tenantId", i."clientId";
GRANT SELECT ON v_invoice_ageing, v_client_balances TO app_runtime;
```

Use `prisma.$queryRaw` for these or declare Prisma `view` models (`previewFeatures = ["views"]`). Compute "today" in the tenant timezone in application code and pass it as a parameter for accuracy; the views use IST as a default.

### 5.10 Job claiming query

```sql
UPDATE jobs SET status='RUNNING', "lockedAt"=now(), "lockedBy"=$1, attempts=attempts+1
WHERE id IN (
  SELECT id FROM jobs
  WHERE status IN ('PENDING','FAILED') AND "runAt" <= now() AND attempts < "maxAttempts"
  ORDER BY "runAt" LIMIT $2 FOR UPDATE SKIP LOCKED)
RETURNING *;
```

Jobs run with `app_system`. Exponential backoff: `runAt = now() + (2^attempts) minutes`; status `DEAD` after `maxAttempts`.

### 5.11 Scheduling (Supabase `pg_cron` + `pg_net`)

```sql
SELECT cron.schedule('daily-reminders-gen', '30 3 * * *',   -- 09:00 IST
  $$ SELECT net.http_post(url:='https://app.example.com/api/internal/jobs/reminders-generate',
       headers:=jsonb_build_object('x-cron-secret', '<secret>')) $$);
SELECT cron.schedule('reminders-dispatch', '*/10 * * * *',
  $$ SELECT net.http_post(url:='https://app.example.com/api/internal/jobs/run',
       headers:=jsonb_build_object('x-cron-secret', '<secret>')) $$);
SELECT cron.schedule('weekly-report', '30 2 * * 1',  -- Monday 08:00 IST
  $$ SELECT net.http_post(url:='https://app.example.com/api/internal/jobs/weekly-report',
       headers:=jsonb_build_object('x-cron-secret', '<secret>')) $$);
SELECT cron.schedule('recurring-invoices', '0 4 * * *',
  $$ SELECT net.http_post(url:='https://app.example.com/api/internal/jobs/recurring',
       headers:=jsonb_build_object('x-cron-secret', '<secret>')) $$);
SELECT cron.schedule('cleanup', '0 21 * * *',
  $$ DELETE FROM webhook_events WHERE "receivedAt" < now() - interval '30 days';
     DELETE FROM jobs WHERE status IN ('SUCCEEDED','DEAD') AND "finishedAt" < now() - interval '30 days';
     DELETE FROM import_rows WHERE "importJobId" IN (SELECT id FROM import_jobs WHERE "createdAt" < now() - interval '90 days'); $$);
```

(Vercel Cron is an equal alternative; keep the endpoints the same.)

---

## 6. Storage design (Supabase Storage)

| Bucket | Public | Contents | Path |
| --- | --- | --- | --- |
| `invoices` | No | Invoice and credit-note PDFs | `{tenantId}/invoices/{invoiceId}/{number}.pdf` |
| `documents` | No | Attachments, contracts | `{tenantId}/documents/{documentId}/{fileName}` |
| `imports` | No | Uploaded CSV/XLSX and error reports | `{tenantId}/imports/{jobId}/source.xlsx` |
| `reports` | No | Generated weekly/month-end packs | `{tenantId}/reports/{yyyy-mm}/...` |
| `logos` | No (signed) | Business logos | `{tenantId}/logo.png` |

Rules: no storage policies for `anon`/`authenticated` (deny all). The server uses the service-role key to create **signed upload URLs** (client uploads directly, 10 MB cap) and **signed download URLs** (60-second expiry). File types allow-listed (`pdf, png, jpg, csv, xlsx`). Validate MIME and magic bytes server-side after upload; set a retention rule for `imports` (delete source after 90 days).

---

## 7. Auth integration

1. Supabase Auth handles email/password, magic link, Google OAuth, MFA (TOTP).
2. After login, the server route `/auth/callback` upserts `users` (using `prismaSystem`) with `id = auth.users.id`.
3. A DB trigger on `auth.users` is **not** used (keeps logic in code, easier to test).
4. Active tenant stored in a signed, HTTP-only cookie `tenant` (validated against memberships on each request).
5. JWT is verified on the server with Supabase's JWKS; never trust client-sent `tenantId`.

---

## 8. Indexing and performance

| Query pattern | Index |
| --- | --- |
| Invoice list by status/due date | `(tenantId, status, dueDate)` |
| Client detail invoices | `(tenantId, clientId, status)` |
| Search by number | unique `(tenantId, number)` plus `pg_trgm` GIN on `number` |
| Client search by name | `CREATE INDEX ON clients USING gin ("name" gin_trgm_ops)` |
| Reminders approval queue | `(tenantId, status, dueForDate)` |
| Promises due | `(tenantId, promisedDate)` |
| Daily generation scan | partial: `CREATE INDEX idx_inv_open ON invoices ("tenantId","dueDate") WHERE status IN ('SENT','PART_PAID') AND "balanceDue" > 0;` |

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_inv_number_trgm   ON invoices USING gin (number gin_trgm_ops);
CREATE INDEX idx_inv_open ON invoices ("tenantId","dueDate") WHERE status IN ('SENT','PART_PAID') AND "balanceDue" > 0;
```

Guidelines: paginate with cursor (`id`, `createdAt`), select only needed columns, avoid N+1 by `include` on lists, cap page size at 100, run the dashboard aggregates in one raw query, cache dashboard for 60 seconds per tenant.

---

## 9. Migrations workflow

1. Edit `schema.prisma`.
2. `npx prisma migrate dev --name <change>` (local Supabase via `supabase start`, or a dev project).
3. For SQL-only items (RLS, triggers, views, cron, extensions) add a hand-written migration with `--create-only` and edit the SQL.
4. CI runs `prisma migrate deploy` against staging, then prod, using `DIRECT_URL`.
5. Never edit applied migrations. Use expand-and-contract for breaking changes (add column, backfill, switch code, drop later).
6. `prisma generate` in the build step. Pin Prisma version.
7. Before every prod migration: Supabase backup (PITR on paid plan) and a dry run on staging with a prod-size seed.

Environment variables:

```
DATABASE_URL="postgresql://app_runtime:***@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:***@db.<ref>.supabase.co:5432/postgres"
SYSTEM_DATABASE_URL="postgresql://app_system:***@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
SUPABASE_URL=...
SUPABASE_ANON_KEY=...            # browser: auth only
SUPABASE_SERVICE_ROLE_KEY=...    # server only: storage signing, admin auth
```

---

## 10. Seed data (`prisma/seed.ts`)

- Plans: `STARTER`, `GROWTH`, `MANAGED` with limits.
- System reminder templates (email): friendly pre-due, due today, overdue +7, firm +30, final notice; with `isSystem = true`, copied per tenant at onboarding.
- Default reminder rules: BEFORE_DUE 3, ON_DUE 0, AFTER_DUE 3/7/15/30 (30 escalates to owner).
- Demo tenant for development: 1 tenant, 3 users (owner/admin/accountant), 25 clients, 150 invoices spanning statuses, 60 payments, 40 reminders.
- Test helper to create isolated tenants for integration tests.

---

## 11. Data lifecycle, retention, DPDP

| Data | Retention | Notes |
| --- | --- | --- |
| Invoices, payments, credit notes | At least 8 years (confirm with CA) | Business/tax records; never hard-delete on client request alone |
| Contacts | While contract active; erase on request unless legal hold | Anonymise: replace name/email/phone with `erased` markers |
| Message logs/audit logs | Minimum 1 year (DPDP rules for logs); keep 3 years default | `audit_logs` append-only |
| Import files | 90 days | Delete from `imports` bucket |
| Webhook events/jobs | 30 days | `cleanup` cron |
| Account closure | Export offered for 30 days, then erase personal data, retain legally required financial records | Track via `data_requests` |

Erase procedure (service `DataRequestService.erase`): export snapshot → anonymise contacts/users → delete storage objects (non-statutory) → mark tenant `CLOSED` → write audit entry → confirm to owner in writing. Backups age out per provider schedule; note this in the privacy policy.

---

## 12. Testing the database layer

- Unit: money/tax calculation, allocation logic (pure functions with `decimal.js`).
- Integration (Vitest + test Postgres): numbering concurrency (50 parallel issues → no duplicates/gaps), payment reversal, immutability trigger, import commit rollback.
- **Tenant isolation suite** (must pass in CI): for every table, create rows in tenant A, set context to tenant B, assert zero rows and failed writes; assert queries without context return zero rows.
- Migration test: apply all migrations on an empty DB and on a prod-like snapshot.

---

## 13. Checklist before first pilot

- [ ] `app_runtime` and `app_system` roles created; Data API disabled
- [ ] RLS enabled and forced on all tenant tables; isolation suite green
- [ ] Triggers and check constraints applied
- [ ] Storage buckets private; signed URL flow tested
- [ ] PITR/backups enabled; restore drill done once
- [ ] Seed templates and plans loaded
- [ ] Cron jobs created and secrets rotated
- [ ] Indexes verified with `EXPLAIN` on 10k-invoice tenant