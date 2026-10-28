# Senthur Finance – Private Loan Tracker for Lenders/Admins

A private, admin-only mobile application built with **React Native**, **Expo SDK 57**, and **Firebase** for individual money lenders and small finance businesses.

> **Core Value**: *"Know exactly who owes me what, since when, how much interest has accrued, what is overdue, and have the proof for everything, in under 3 taps."*

---

## 1. Features & Capabilities

- **Fintech Design System**:
  - Signature layered **Stacked Folded-Tab Loan Cards** (White → Lavender → Dark Hero) with tap-to-expand/reorder.
  - Dark Hero loan cards (#2A2430) with collateral preview and big statistics.
  - Clean typography using geometric wide-sans styling with 44–52px display headings.
  - Interactive SVG Area Line Chart with lavender gradient fill, dashed crosshairs, and floating pill tooltips.
  - Indian currency digit grouping (e.g. ₹12,34,567) with 60% smaller currency symbol.
- **Pure Financial Engine (lib/finance/)**:
  - Simple Interest ($I = P \times r \times t$)
  - Compound Interest with selectable frequency (Daily, Weekly, Monthly, Quarterly, Yearly)
  - Flat Rate Equal Monthly Installments (EMI)
  - Reducing Balance Amortization Engine
  - Interest-Only loans with bullet principal maturity
  - Daily collection schemes (e.g. 100-day informal loans) with advance interest deductions
  - Per-day interest accrual from last payment date ("as of today" settlement engine)
  - Automated penalty engine with grace periods (Flat per day, % per month, One-time)
  - Prepayment waterfall allocation (Penalty → Interest → Principal)
  - Exact XIRR / Effective Annual Rate (EAR) calculator using Newton-Raphson
  - **45 unit tests** verifying leap years, month-end preservations, and rounding.
- **Borrower & KYC Management**:
  - 5-step borrower creation wizard with autosave drafts
  - Import borrower directly from phone contacts (`expo-contacts`)
  - Identity verification with Aadhaar & PAN regex validation
  - Front & back photo capture with automatic compression (`expo-image-manipulator`)
  - Biometric tap-to-reveal for sensitive IDs
- **Loan Disbursement & Servicing**:
  - Live preview summary card as admin types
  - Dynamic amortization schedule generation
  - Collateral registry (Gold, Vehicle, Property, Cheque, Promissory notes)
  - Foreclosure quotes with instant settlement
- **Collections & Branded Receipts**:
  - One-tap quick collection with waterfall allocation breakdown
  - Automatic PDF receipt generation with business branding (`expo-print`)
  - Instant WhatsApp and SMS receipt sharing (`expo-sharing`)
- **Analytics & Reporting**:
  - Interactive portfolio yield area chart with date switcher
  - Delinquency aging buckets (0–30, 31–60, 61–90, 90+ days)
  - Predicted 30-day cash inflow forecast
  - Daily collection sheet exports (PDF & CSV)
  - Overdue defaulters list export (CSV)
  - Full ledger JSON snapshot backup and restore
- **Security & Privacy**:
  - Admin login with email/password
  - Biometric & 4-digit PIN app lock (`expo-local-authentication`, `expo-secure-store`)
  - Complete data isolation per admin under `users/{adminUid}/`
  - Strict Firestore & Storage security rules with size and MIME limits

---

## 2. Architecture & Data Flow

```
Mobile Client (React Native + Expo Router)
  │
  ├── UI Layer (src/components/ui/)
  │     ├── StackedLoanCards, HeroLoanCard, AreaChartWrapper
  │     └── Theme Tokens (Lavender, DarkCard #2A2430, Ink, Surface)
  │
  ├── State & Cache (Zustand + TanStack React Query)
  │     ├── useAuthStore (Biometrics & PIN lock)
  │     ├── useLoanWizardDraft & useCustomerWizardDraft (Autosave drafts)
  │     └── React Query Cache (Offline Persistence + Optimistic UI)
  │
  ├── Domain Engine (src/lib/finance/)
  │     ├── interest.ts, schedule.ts, waterfall.ts, penalty.ts, xirr.ts
  │     └── 45 unit tests in __tests__/finance.test.ts
  │
  └── Backend & Storage (src/lib/firebase/)
        ├── Firestore (users/{adminUid}/{customers, loans, payments})
        ├── StorageProvider Abstraction (Firebase Storage / Cloudinary)
        └── Cloud Functions (Daily accrual at 00:30, reminders, stats)
```

---

## 3. Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd SenthurFinance

# Install dependencies (respecting Expo SDK 57 compatible versions)
npm install --legacy-peer-deps
```

### Running the App
```bash
# Start Expo development server
npx expo start

# Run on Android emulator / device
npx expo start --android

# Run on iOS simulator (macOS)
npx expo start --ios

# Run on Web browser
npx expo start --web
```

---

## 4. Running Tests & Type Checking

```bash
# Run 45 unit tests for financial calculation engine
npx jest

# Strict TypeScript typecheck
npx tsc --noEmit
```

---

## 5. Environment Variables & Firebase Setup

Create a `.env` file in the root directory:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=loanledger-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=loanledger-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=loanledger-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Storage Provider: 'firebase' or 'cloudinary'
EXPO_PUBLIC_STORAGE_PROVIDER=firebase

# Cloudinary Configuration (optional if using Cloudinary)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=loanledger_preset
```

### Firebase Console Setup:
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Authentication** with Email/Password.
3. Enable **Cloud Firestore** in production mode.
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules,firestore:indexes
   ```
5. Deploy Cloud Functions:
   ```bash
   cd functions && npm install && npm run build
   firebase deploy --only functions
   ```

### Running Firebase Local Emulators:
```bash
firebase emulators:start
```

---

## 6. Building APK / IPA via EAS

```bash
# Install EAS CLI
npx eas-cli@latest login

# Configure EAS project
npx eas-cli@latest build:configure

# Build Android APK for direct device installation
npx eas-cli@latest build --platform android --profile preview

# Build iOS IPA for TestFlight / Ad-hoc
npx eas-cli@latest build --platform ios --profile preview
```

---

## 7. Assumptions & Safety Mechanisms

1. **Paise-Integer Representation**: All monetary values are handled as integer minor units (paise) internally to prevent floating-point calculation errors.
2. **Offline-First Zero-Setup Fallback**: If Firebase credentials are not yet configured or device is offline, the app operates using in-memory cached seed data, enabling instant testing out of the box.
3. **Legal Disclaimer**: LoanLedger is a private record-keeping tool. The lender is responsible for compliance with local Moneylenders Acts and financial regulations.
4. **Append-Only Auditing**: Every payment and status adjustment creates an immutable audit log entry in `auditLogs`.
