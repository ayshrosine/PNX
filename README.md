# PNX Flow — B2B Invoicing, GST Compliance & Collections Platform

> **Engineered for Indian micro and small B2B service firms** (creative studios, IT consultancies, dev agencies, professional service providers) billing ₹5L–₹50L/month across 5–50 active accounts.

PNX Flow solves the cashflow and collection bottleneck through:
1. **Automated WhatsApp + Email Reminders** with strict **Human-in-the-Loop** approval ("no embarrassing client spam").
2. **Dynamic Indian GST Engine** with automatic **CGST/SGST (intra-state)** vs **IGST (inter-state)** detection based on Place of Supply (POS).
3. **Statutory Section 43B(h) Audit Clock** tracking MSME buyer payment deadlines (15-day default, 45-day statutory cap) to avoid buyer tax disallowances.
4. **Instant Daily Collections Routine** via the flagship `/app/today` command centre.
5. **Frictionless Public Client Payment Portal** (`/p/[token]`) enabling debtors to download GST PDFs, view UPI/bank details, acknowledge bills, schedule payments, or flag questions without logging in.

---

## 🏗️ Architecture & Clean Separation of Concerns

```
d:/PNX/
├── backend/                       # Node.js + Express + Prisma ORM + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma          # 24 Models & 17 Enums (Multi-tenant, RLS ready)
│   │   ├── seed.ts                # Realistic Indian B2B demo dataset
│   │   └── migrations/
│   │       └── 0_security_baseline.sql  # Row-Level Security & PostgreSQL triggers
│   ├── src/
│   │   ├── config/                # Environment variables & runtime flags
│   │   ├── db/                    # Prisma client, seed data, and dual-mode store
│   │   ├── middleware/            # JWT Auth, RBAC permissions, Zod validation, error handling
│   │   ├── modules/               # 16 Feature routes (Invoices, Reminders, Today, Reports, etc.)
│   │   ├── services/              # PDFKit Indian GST Tax Invoice generator
│   │   └── shared/                # Decimal.js money, GST calculator, Zod schemas
│   ├── .env.example
│   └── package.json
│
├── frontend/                      # Next.js 16 (App Router) + React 19 + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # /login (with 1-click demo login), /signup
│   │   │   ├── (onboarding)/      # /onboarding (3-step wizard)
│   │   │   ├── app/               # Authenticated workspace:
│   │   │   │   ├── today/         # 30-Second Morning Collections Command Centre
│   │   │   │   ├── dashboard/     # Cashflow Analytics & Ageing bar chart
│   │   │   │   ├── invoices/      # List, [id] detail with timeline, /new GST creator
│   │   │   │   ├── clients/       # Directory with MSME tags, [id] ledger statement
│   │   │   │   ├── payments/      # Register, /new with FIFO invoice allocation
│   │   │   │   ├── reminders/     # Approval queue, cadence rules, template editor
│   │   │   │   ├── reports/       # Ageing matrix, Section 43B(h) clock, TDS reconciliation
│   │   │   │   ├── imports/       # CSV data migration wizard
│   │   │   │   └── settings/      # Business profile, GSTIN, Bank/UPI, Series, Team
│   │   │   ├── p/[token]/         # Public client invoice portal (No login required)
│   │   │   ├── features/          # Marketing feature showcase
│   │   │   ├── pricing/           # Pricing plans (Starter, Growth, Managed)
│   │   │   └── how-it-works/      # 4-Step interactive walk-through
│   │   ├── components/layout/     # AppShell (Sidebar, Topbar, ⌘K Command Palette)
│   │   └── lib/                   # Typed API client, INR formatting, date helpers
│   ├── .env.example
│   └── package.json
│
├── specs/                         # Project specifications (Architecture, UI, API, DB)
├── package.json                   # Root monorepo orchestrator
└── README.md
```

---

## ⚡ Quick Start (Out-of-the-Box Development Mode)

The backend features a **hybrid dual-persistence architecture**:
- **Zero-Friction Demo Mode**: Works immediately without needing an active PostgreSQL/Supabase database running. Pre-seeded with realistic Indian B2B company data (Acme Cloud Studio LLP, TechCorp Solutions, Nexus Retail, etc.).
- **Live Supabase Mode**: Automatically switches to PostgreSQL + Prisma once you paste your database connection string in `backend/.env`.

### 1. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 2. Run the Development Servers
From the root workspace directory `d:\PNX`:
```bash
# Run both concurrently
npm run dev

# Or run separately:
npm run dev:backend   # Express API on http://localhost:5000
npm run dev:frontend  # Next.js Web App on http://localhost:3000
```

### 3. Demo Login Credentials
- **Email**: `demo@pnx.com`
- **Password**: `Password123!`
- *Or click the instant **"1-Click Demo Login"** button on the `/login` screen.*

---

## 🔐 Connecting Supabase / Live PostgreSQL (Optional)

When you are ready to connect your live Supabase database:
1. Open `backend/.env` and set:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
2. Run database migration and seed:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts
   ```

---

## 📊 Core Features Implemented

| Feature | Description | Spec Ref |
|---|---|---|
| **Today Action Centre** | 30-second morning collections routine: approve queued reminders, chase overdue accounts, record promises to pay | Spec 02 §3.1 |
| **GST Tax Engine** | Live inter-state (IGST) vs intra-state (CGST+SGST) detection, HSN/SAC codes, round-off, Indian words conversion | Spec 01 §3.2 |
| **Section 43B(h) Clock** | Tracks 15/45 day payment deadlines for Micro & Small enterprises to enforce buyer tax deduction risk | Spec 01 §3.3 |
| **PDF Tax Invoice** | PDFKit-generated GST Tax Invoice with bank remittance details and UPI QR coordinates | Spec 03 §4.1 |
| **Public Client Portal** | Frictionless invoice view at `/p/[token]` with 1-click Acknowledge, Promise, and Dispute buttons | Spec 02 §4.1 |
| **Intelligent Allocation** | Record payment with FIFO automatic distribution across oldest overdue invoices | Spec 02 §3.4 |
| **Cadence & Human-in-Loop**| Multi-stage reminder pipeline (T-3, T+7, T+30) requiring owner approval before dispatch | Spec 01 §3.4 |
| **⌘K Command Palette** | Instant keyboard search across clients, invoices, and payments | Spec 02 §2.3 |
