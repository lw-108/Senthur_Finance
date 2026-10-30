# Senthur Finance — Supabase Complete Setup & Starter Guide

This step-by-step starter guide walks you through setting up **Supabase** as the complete backend (PostgreSQL database, Auth system, and Private Storage) for the **Senthur Finance** multi-tenant loan management application.

---

## Table of Contents
1. [Step 1: Create a Free Supabase Project](#step-1-create-a-free-supabase-project)
2. [Step 2: Retrieve API Credentials](#step-2-retrieve-api-credentials)
3. [Step 3: Configure Mobile App Environment (.env)](#step-3-configure-mobile-app-environment-env)
4. [Step 4: Run the Master SQL Migration](#step-4-run-the-master-sql-migration)
5. [Step 5: Configure Supabase Authentication](#step-5-configure-supabase-authentication)
6. [Step 6: Verify Private Storage Bucket](#step-6-verify-private-storage-bucket)
7. [Step 7: Launch the App & Test Your Setup](#step-7-launch-the-app--test-your-setup)
8. [Step 8: Architecture & Security Overview](#step-8-architecture--security-overview)
9. [Step 9: Troubleshooting & FAQ](#step-9-troubleshooting--faq)

---

## Step 1: Create a Free Supabase Project

1. Open [https://supabase.com](https://supabase.com) in your web browser and click **Sign In** (or **Start your project**).
2. Click **New Project** in your Supabase organization dashboard.
3. Fill in the project details:
   - **Name**: `Senthur Finance` (or your chosen brand name)
   - **Database Password**: Enter a strong password and save it in a safe place.
   - **Region**: Choose the region closest to your customers (e.g. `South Asia (Mumbai)` for India).
   - **Pricing Plan**: Choose **Free** tier (supports up to 500MB DB, 1GB storage, 50,000 monthly active users).
4. Click **Create new project** and wait 1–2 minutes while Supabase provisions your PostgreSQL database and Auth service.

---

## Step 2: Retrieve API Credentials

Once the project setup completes:
1. In the left-hand sidebar menu, click the **Settings** (gear icon) at the bottom.
2. Select **API** (or **Data API** under Project Settings).
3. Find the **Project URL** and **Project API keys**:
   - **Project URL**: Format looks like `https://abcdefghijklmnopqrst.supabase.co`
   - **anon / public key**: A long string starting with `eyJhbGciOi...`
   
> [!IMPORTANT]
> **Use the `anon` / `public` key in the mobile app.**
> Never place the `service_role` key inside client mobile code, as it bypasses all Row Level Security (RLS).

---

## Step 3: Configure Mobile App Environment (.env)

1. Open your Senthur Finance project root folder in your editor.
2. Open the `.env` file (or create it if missing).
3. Paste your credentials:

```bash
# Senthur Finance - Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
EXPO_PUBLIC_STORAGE_PROVIDER=supabase
```

4. Save the file.

---

## Step 4: Run the Master SQL Migration

The master SQL script creates all 9 tables, indexes, cross-tenant isolation triggers, Row Level Security policies, the automatic lender signup trigger, and private storage policies in a single run.

1. In your Supabase Dashboard, click the **SQL Editor** icon in the left-hand sidebar (looks like `>_` or SQL icon).
2. Click **+ New Query** at the top.
3. Copy the entire contents of the file located at:
   - **[`supabase/complete_senthur_finance_schema.sql`](./supabase/complete_senthur_finance_schema.sql)**
4. Paste the SQL query into the editor window.
5. Click the green **RUN** button (or press `Ctrl + Enter` / `Cmd + Enter`).
6. You should see a **"Success. No rows returned"** message in the results pane.

### What this script creates:

| Component | Description |
|---|---|
| **`organizations`** | Isolated tenant record for each lender business. |
| **`organization_members`** | Connects users to tenants with role permissions (`owner`, `admin`, `staff`, `read_only`). |
| **`organization_settings`** | Business profile details, shop address, contact number, avatar, currency (`₹ INR`), loan products. |
| **`customers`** | Customer KYC profiles, ID proofs, references, ratings, and contact info. |
| **`loans`** | Micro-loans, principal amounts (in minor units/paise), interest rates, tenure, collateral, and statuses. |
| **`loan_schedules`** | Detailed installment schedules and due dates for daily, weekly, or monthly collections. |
| **`payments`** | Immutable collection ledger receipts (`CASH`, `UPI`, `BANK`, `CHEQUE`). |
| **`documents`** | Private metadata records pointing to KYC photos, identity cards, and signed loan documents in Storage. |
| **`audit_events`** | Append-only security audit trail for financial actions and logins. |
| **Auth Trigger (`handle_new_user`)** | Automatically creates an organization and assigns the user as `owner` when they register. |
| **Storage Bucket (`documents`)** | Private storage bucket with RLS policies restricting file downloads to authorized tenant members. |

---

## Step 5: Configure Supabase Authentication

1. In the Supabase Dashboard, click **Authentication** (the user icon) in the left sidebar.
2. Select **Providers**:
   - Ensure **Email** is enabled (**ON**).
   - *Optional for testing:* Under **Email**, toggle **Confirm email** to **OFF** if you want new signups to log in immediately without having to confirm an email link during development.
3. Select **URL Configuration** under Authentication:
   - Set **Site URL** to: `senthurfinance://auth/callback` (or your web domain if testing on web: `http://localhost:8081`).
   - Under **Redirect URLs**, add:
     - `http://localhost:8081`
     - `senthurfinance://auth/callback`
     - `exp://*` (for Expo Go local testing)

---

## Step 6: Verify Private Storage Bucket

1. In the Supabase Dashboard, click **Storage** (the bucket icon) in the left sidebar.
2. You should see a bucket named **`documents`**:
   - **Public status**: Must be **Private** (locked icon).
   - Files are stored under the folder path pattern: `{organization_id}/customers/...` or `{organization_id}/profile/...`.
3. If the bucket was not auto-created by the SQL script, click **New bucket**, name it `documents`, make sure **Public bucket** is unchecked, and click **Save**.

---

## Step 7: Launch the App & Test Your Setup

### 1. Run Automated Test Verification
Open your terminal in the project directory and run:
```bash
npm test
```
*All 73 unit and integration tests should pass.*

### 2. Run TypeScript Typecheck
```bash
npx tsc --noEmit
```
*Should complete with 0 errors.*

### 3. Start the Development Server
```bash
npx expo start
```

### 4. Create Your First Account
1. On the app welcome screen, tap **Sign Up**.
2. Enter an email (e.g. `admin@senthur.com`) and password (minimum 6 characters).
3. Tap **Sign Up**.
4. Check your Supabase Dashboard:
   - In **Authentication** &rarr; **Users**: Your new user will appear.
   - In **Table Editor** &rarr; **`organizations`**: Your lender tenant organization has been automatically created by the database trigger!
   - In **Table Editor** &rarr; **`organization_members`**: Your user is registered as `owner`.
   - In **Table Editor** &rarr; **`organization_settings`**: Your business profile has been initialized with default settings.

---

## Step 8: Architecture & Security Hardening (Official Supabase Best Practices)

The Senthur Finance backend adheres strictly to the official **Supabase & Postgres Security Best Practices**:

### 1. Multi-Tenant Isolation via Row Level Security (RLS)
- Every table has RLS enabled with explicit `TO authenticated` role targeting.
- Policies use subquery caching: `WHERE user_id = (SELECT auth.uid())` so Postgres calculates the user ID once per query instead of executing it per-row, providing up to **100x faster queries** on large tables.
- All `UPDATE` policies include both `USING (...)` and `WITH CHECK (...)` clauses to prevent tenant re-assignment (Broken Object Level Authorization / BOLA).

### 2. Search-Path Injection Defense
- All `SECURITY DEFINER` functions (`get_user_org_ids`, `get_user_role`, `handle_new_user`, and cross-tenant triggers) explicitly set `SET search_path = public, pg_temp` to prevent malicious schema hijacking attacks.
- Direct execution privileges (`EXECUTE`) on internal functions are revoked from `PUBLIC` and `anon`.

### 3. Cross-Tenant Integrity Triggers
- PostgreSQL `BEFORE INSERT OR UPDATE` triggers guarantee that loans, payments, and documents can never reference a customer or loan belonging to another tenant organization.

### 4. Financial Amounts in Integer Minor Units (Paise)
- All monetary columns (`principal_minor_units`, `monthly_income_paise`, `amount_minor_units`) are stored as **`BIGINT`** representing **paise** (`₹100.00` = `10000` paise).
- Floating-point arithmetic errors and decimal drift are mathematically eliminated.

### 5. Private Secure Storage & Upsert Support
- Uploaded borrower KYC photos, Aadhaar/PAN proofs, and transaction receipts are stored in a private Supabase Storage bucket (`documents`).
- Access is enforced through multi-tenant storage RLS policies covering `SELECT`, `INSERT`, `UPDATE` (required for upserting files), and `DELETE`.
- Files are accessed only via short-lived signed URLs.

### 6. Foreign Key Indexing
- Every foreign key relation (`customer_id`, `loan_id`, `created_by`, `uploaded_by`, `actor_user_id`) is indexed to prevent table scans and locks during cascading deletes.

---

## Step 9: Troubleshooting & FAQ

#### Q: I get `Invalid API key` when opening the app.
- Ensure your `.env` file contains valid keys without quotes:
  ```bash
  EXPO_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
  ```
- Restart Expo with cache cleared: `npx expo start -c`.

#### Q: New signups say "Email not confirmed".
- Go to Supabase Dashboard &rarr; **Authentication** &rarr; **Providers** &rarr; **Email** &rarr; turn OFF **Confirm email** for instant local testing.

#### Q: How do I switch organizations if I manage multiple lenders?
- Use [`setActiveOrganizationId(orgId)`](file:///C:/Users/ELCOT/Pictures/SF/SenthurFinance/src/lib/supabase/activeOrg.ts) from `src/lib/supabase/activeOrg.ts`. The repository queries automatically scope all operations to whichever organization is currently active.

#### Q: Can I run offline without an internet connection?
- Yes. Senthur Finance includes built-in offline caches and seed fallbacks so UI navigation, calculation tools, and demo previews remain accessible even without an active network.
