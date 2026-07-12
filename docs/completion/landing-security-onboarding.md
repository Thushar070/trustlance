# Completion Report: Public Landing, Security Hardening, & Mandatory Onboarding

This document summarizes the changes, design decisions, route inventory, and test verification outcomes for this phase.

---

## 1. Route Inventory Table (Step 1)

Below is the complete route list under `/app` (pages) and `/app/api` (API routes) in the codebase.

| Route / Endpoint | Type | Permitted Role(s) | Enforcement Method |
| :--- | :--- | :--- | :--- |
| `/` | Page | Public / Authenticated | Middleware (`middleware.ts`) + NextAuth callback session context |
| `/login` | Page | Unauthenticated | Middleware (redirects authenticated users to `/`) |
| `/select-role` | Page | Authenticated (role: null) | Middleware (redirects if role is already selected) |
| `/complete-profile` | Page | Authenticated (role: set, profileCompleted: false) | Middleware (redirects if profile is already complete) |
| `/profile` | Page | `CLIENT`, `FREELANCER`, `ADMIN` | Middleware (authenticates sessions) |
| `/payments` | Page | `CLIENT`, `FREELANCER` | Middleware (blocks unauth, gates admins to `/admin/assignments`) |
| `/projects` | Page | `FREELANCER` | Middleware (gates clients to `/client/projects`, admins to `/admin/assignments`) |
| `/projects/[id]` | Page | `CLIENT`, `FREELANCER`, `ADMIN` | Middleware (gates auth) + details API permission resolution |
| `/client/projects` | Page | `CLIENT` | Middleware (redirects non-clients to `/`) |
| `/client/projects/new` | Page | `CLIENT` | Middleware (redirects non-clients to `/`) |
| `/admin/overview` | Page | `ADMIN` | Middleware (redirects non-admins to `/`) |
| `/admin/disputes` | Page | `ADMIN` | Middleware (redirects non-admins to `/`) |
| `/admin/assignments` | Page | `ADMIN` | Middleware (redirects non-admins to `/`) |
| `/disputes/[id]` | Page | `CLIENT`, `FREELANCER`, `ADMIN` | Middleware + details API permission resolution |
| `/api/auth/[...nextauth]` | API | Public | Excluded in middleware |
| `/api/auth/select-role` | API | Authenticated (role: null) | Route handler validation |
| `/api/users/me` | API | `CLIENT`, `FREELANCER`, `ADMIN` | Route handler session retrieval |
| `/api/users/complete-profile` | API | Authenticated (role: set, profileCompleted: false) | Route handler Zod schemas validation & db user status check |
| `/api/projects` | API | GET: `FREELANCER`, `CLIENT` (own). POST: `CLIENT` | Custom client/admin gating inside route handler |
| `/api/projects/[id]` | API | GET: `CLIENT` (owner), `FREELANCER` (assigned/open), `ADMIN` (active/resolved dispute). PATCH: `CLIENT` (owner) | Route handler ownership & dispute validation |
| `/api/projects/[id]/apply` | API | `FREELANCER` | `requireRole(Role.FREELANCER)` helper |
| `/api/projects/[id]/proposals` | API | `CLIENT` (owner), `FREELANCER` (own) | Route handler client/freelancer ownership check |
| `/api/projects/[id]/select-freelancer` | API | `CLIENT` (owner) | Route handler project client owner verification |
| `/api/projects/[id]/submit-work` | API | `FREELANCER` (assigned) | Route handler assigned freelancer verification |
| `/api/projects/[id]/submissions` | API | `CLIENT` (owner), `FREELANCER` (assigned) | Route handler project participant verification |
| `/api/projects/[id]/approve` | API | `CLIENT` (owner) | Route handler client owner verification |
| `/api/projects/[id]/request-changes` | API | `CLIENT` (owner) | Route handler client owner verification |
| `/api/projects/[id]/dispute` | API | `CLIENT` (owner) or `FREELANCER` (assigned) | Route handler participant validation |
| `/api/projects/[id]/messages` | API | `CLIENT` (owner) or `FREELANCER` (assigned) | MessageService participant validation |
| `/api/proposals/[id]` | API | `FREELANCER` (owner) | Route handler freelancer owner verification |
| `/api/disputes` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/disputes/[id]` | API | `CLIENT` (owner), `FREELANCER` (assigned), `ADMIN` | Route handler participant verification |
| `/api/disputes/[id]/evidence` | API | `CLIENT` (owner), `FREELANCER` (assigned) | Route handler participant verification |
| `/api/disputes/[id]/resolve` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/admin/overview` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/admin/run-auto-release` | API | `ADMIN` (session) or Bearer Token | Bearer token verification or `requireRole(Role.ADMIN)` |
| `/api/admin/assignments` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/admin/payments/[paymentId]/reconcile-escrow` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/audit-logs/[entityId]` | API | `ADMIN` | `requireRole(Role.ADMIN)` helper |
| `/api/payments/[projectId]/create-order` | API | `CLIENT` (owner) | Route handler client owner verification |
| `/api/payments/history` | API | `CLIENT`, `FREELANCER` | Route handler session check |
| `/api/payments/verify` | API | `CLIENT` (owner) | Route handler client owner verification |
| `/api/uploads/presign` | API | `CLIENT`, `FREELANCER` | Route handler session check |
| `/api/webhooks/razorpay` | API | Public | Razorpay cryptographic signature check |

---

## 2. Gaps Identified & Resolved (Step 2)

- **Admin/Client Page Route Scopes**: Previously, users could type dashboard paths (e.g. `/admin/overview`, `/client/projects`) directly. We added edge gating rules to `middleware.ts`. Freelancer/Client accounts attempting to load `/admin/*` are intercepted and redirected immediately.
- **Client Search Lists & Browse Links**: Restrained clients from accessing `/projects` (which contains public freelancer postings). The middleware redirects clients to `/client/projects`.
- **Database/Session Onboarding Synced**: Introduced `profileCompleted` state mapping. Uncompleted profiles are locked into the `/complete-profile` view. Navigation links on the Navbar are dynamically hidden.
- **Removed Google Fonts Network block**: Removed `next/font/google` compilation dependency because external internet fetches are disabled inside the sandbox environment. Configured highly readable web-safe system fonts, ensuring offline-safe builds.

---

## 3. Onboarding Decisions (Part 3)

- **Explicit DB Boolean flag**: Decided to use a database boolean `profileCompleted Boolean @default(false)` instead of checking field non-null values dynamically. This prevents users from being forced back to onboarding if they clear optional fields (e.g. bio) on `/profile` later.
- **Three-state state machine inside `middleware.ts`**:
  1. `!token` -> Login check page.
  2. `token && !role` -> select-role page.
  3. `token && role && !profileCompleted` -> complete-profile page.
  4. `token && role && profileCompleted` -> full app dashboard access.
- **Admin bypass**: Set `token.profileCompleted = true` inside NextAuth JWT callback for user records matching the `ADMIN` role. This enables platform admins to bypass onboarding immediately.

---

## 4. Test Cases Documented

All Jest test cases passed successfully:

### 1. Hardening & Onboarding Tests (`__tests__/hardening-onboarding.test.ts`)
- `GET /api/admin/overview` is gated and rejects Client/Freelancer with `403 Forbidden`.
- `GET /api/admin/assignments` is gated and rejects Client/Freelancer with `403 Forbidden`.
- `POST /api/admin/run-auto-release` is gated and rejects Client/Freelancer with `403 Forbidden`.
- `POST /api/admin/payments/:id/reconcile-escrow` is gated and rejects Client/Freelancer with `403 Forbidden`.
- `GET /api/audit-logs/:id` is gated and rejects Client/Freelancer with `403 Forbidden`.
- `POST /api/users/complete-profile` fails on missing required parameters (name, phone, location).
- `POST /api/users/complete-profile` fails for Client if `businessName` is missing.
- `POST /api/users/complete-profile` fails for Freelancer if `bio` is too short.
- `POST /api/users/complete-profile` succeeds on valid parameters and updates `profileCompleted`.
- Middleware redirects unauthenticated visitor to `/login`.
- Middleware redirects authenticated user with no role to `/select-role`.
- Middleware redirects user with role but profile incomplete to `/complete-profile`.
- Middleware allows normal route access once role and profileCompleted are true.
- Middleware blocks non-admins from `/admin/*` and redirects them to root.
- Middleware blocks clients from `/projects` and redirects to `/client/projects`.

### 2. General Integration Tests (`__tests__/integration.test.ts`)
- `should allow request if user already has a role and profile is complete` (updated to mock profileCompleted).
- `should redirect from /select-role to home if user already has a role and profile is complete` (updated to mock profileCompleted).
