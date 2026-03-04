

## Plan: Set Up Database Tables & Authentication

### 1. Database Tables (via migrations)

Create tables with RLS policies:

- **profiles** — `id (uuid, FK auth.users)`, `business_name`, `owner_name`, `created_at`
- **expenses** — `id`, `user_id`, `category`, `vendor`, `amount`, `date`, `flagged`, `flag_reason`, `receipt_url`, `created_at`
- **invoices** — `id`, `user_id`, `invoice_number`, `client`, `amount`, `gst_rate`, `status (enum: draft/pending/paid/overdue)`, `date`, `created_at`
- **loans** — `id`, `user_id`, `lender`, `amount`, `interest_rate`, `emi`, `status`, `next_due`, `created_at`

All tables will have RLS enabled with policies restricting access to the authenticated user's own rows.

### 2. Authentication Pages

- **Auth page** (`/auth`) with login and signup forms (email/password)
- **Auth context/hook** to manage session state across the app
- **Protected routes** — redirect unauthenticated users to `/auth`

### 3. Wire Pages to Database

- **Expenses page** — CRUD from `expenses` table instead of hardcoded array; new OCR receipts save to DB
- **Invoices page** — read from `invoices` table; "New Invoice" button creates records
- **Dashboard/Loans** — pull real data from DB

### 4. Routing Updates

- Add `/auth` route
- Wrap existing routes in an auth guard component

