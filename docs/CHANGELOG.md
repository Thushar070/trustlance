# Changelog

All notable changes to the TrustLance project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released] - 2026-07-12

### Redesigned
- **Visual Theme Redesign & Responsive Layout Optimization Pass**:
  - Implemented the precise hex color palette specified in the task description for both light and dark themes in `app/globals.css`.
  - Shifted mobile menu breakpoint in `Navbar.tsx` from `md` (768px) to `lg` (1024px) to show the hamburger panel for all tablet/mobile viewports.
  - Implemented a "More" navigation dropdown for condensed desktop screens (1024px - 1440px) to prevent horizontal navbar link wrapping.
  - Developed an interactive, responsive Avatar Dropdown replacing the static username and separate logout buttons on condensed screen widths.
  - Added defensive `overflow-x: hidden` to root layout and `body` in `globals.css` to prevent accidental scroll leaks.
  - Redesigned the Admin Overview page layout: added the "Total Projects Count" metric and progress indicators/bars to status distribution items.
  - Aligned metric containers and layout sections using standard `max-w-7xl` centered grids.
  - Cleared all hardcoded Tailwind slate/rose/emerald styles in dispute resolution components to draw colors dynamically from semantic CSS variables.
  - Fixed pre-existing eslint violations (`react-hooks/set-state-in-effect`) in the local `ThemeProvider` and `ThemeToggle` components.

### Fixed
- **Table Horizontal Overflow on Mobile**:
  - Diagnosed a containment bug where wide data tables (Payments, Assignments, Disputes) forced a page-level horizontal scroll on viewports narrower than `1024px` because their columns/data stretched outer flex layouts without width constraints.
  - Refactored Admin Assignments, Payments ledger, and Admin Disputes queue pages to use responsive conditional rendering: tabular layout on desktop (>= `1024px`) and custom touch-friendly stacked card grids on mobile/tablet viewports (< `1024px`).
  - Added global layout containment rules in `app/globals.css` ensuring the root `<main>` layout element enforces `w-full max-w-full overflow-x-hidden min-w-0` to guarantee page-level containment.
- **NextAuth Session JWT Decryption Failure (Dashboard Access Regression)**:
  - Identified a critical decryption discrepancy where the client-side/edge Middleware decrypted the NextAuth session token using `process.env.NEXTAUTH_SECRET`, but the API route handlers (specifically `/api/auth/session` called by `useSession()`) decrypted using a SHA-256 hashed secret derived by next-auth's `createSecret` utility (because `secret` was not explicitly declared inside `authOptions`).
  - This decryption mismatch caused all CLIENT and FREELANCER dashboard loads to get stuck in `status: "loading"` or fail session validation, resulting in a redirect loop to `/select-role` or `/login`.
  - Resolved this root cause by explicitly mapping `secret: process.env.NEXTAUTH_SECRET` inside the shared `authOptions` config in [auth-options.ts](file:///home/billy/Documents/ESCROW/lib/auth/auth-options.ts).

### Added
- **Social & Discovery Layer**:
  - Implemented the `Rating` database model in `prisma/schema.prisma` and applied schema migrations.
  - Created the `GET /api/users/search` user search API endpoint with cross-role validation checks and sensitive profile contact data masking (excluding email and phone from search results).
  - Developed the dynamic `GET /api/users/:id/public-profile` API route to return profile stats, computed skills (from proposals), and rater feedback comments.
  - Built the `POST /api/projects/:id/rating` endpoint to allow Clients and Freelancers to rate completed projects (1-5 stars + comment) while enforcing the single-rating-per-project constraint.
  - Developed the client-side `/search` query page and `/profiles/[userId]` profile details interface, complete with a security-locked contact details section.
  - Integrated the new "Search" page into the dynamic Navbar.
  - Created a robust security-focused integration test suite at `__tests__/social-discovery.test.ts`.
- **Public Landing, Security Hardening & Onboarding Pass**:
  - Re-implemented root `/` route as a public-facing marketing landing page with functional descriptions, "How it Works" section, and "Get Started" triggers.
  - Implemented automatic redirection: authenticated users hitting root `/` are redirected to their default dashboard page.
  - Reinforced page-level role gating inside `middleware.ts` to block and redirect unauthorized roles attempting to load `/admin/*` and `/client/*` views.
  - Hardened `/api/admin/*` API endpoints, reconcile-escrow triggers, and `/api/audit-logs/*` routing to strictly enforce the `ADMIN` role.
  - Introduced `profileCompleted` state flag in Prisma schema User model to handle onboarding progression.
  - Wired a three-state onboarding logic in `middleware.ts` routing to redirect incomplete profiles to `/complete-profile`.
  - Created `/complete-profile` onboarding form page gating Client (Business Name) and Freelancer (Bio) inputs.
  - Excluded Google Fonts build-time downloads to guarantee offline compile-safe deployments.

- **Access Control & Email Overhaul Pass**:
  - Restricted Client project search visibility: clients now only see their own projects, public project lists are restricted to Freelancers, and browse links are removed from Client Navbar.
  - Implemented Client redirect warnings when clients try to navigate to `/projects` directly.
  - Updated skills field validation to be fully optional, hiding selection lists behind collapsible `+ Add relevant skills` selectors.
  - Hardened Admin visibility checks: admins can only view projects that have active or resolved disputes. Private chat threads remain completely forbidden for admins.
  - Built `GET /api/admin/assignments` endpoint and `/admin/assignments` Admin panel page displaying flat client/freelancer directory summaries.
  - Integrated Nodemailer SMTP Gmail transport replacing Resend notifications.
  - Cleared all developer-facing technical terms (Next.js, Prisma, S3, Razorpay, OAuth, RBAC) from user-visible pages.

- **UI/UX Overhaul: Complete Dark/Light Mode & Responsive Redesign**:
  - Implemented client-side theme engine with `components/ThemeProvider.tsx` and custom sun/moon/monitor cycle trigger `components/ThemeToggle.tsx`.
  - Added inline theme flash prevention script inside `app/layout.tsx` to handle hydration-safe loading from local storage.
  - Refactored `globals.css` to declare light/dark variable sets (including dark-mode status badges and high-contrast form element focus ring borders).
  - Redesigned public browse filters to convert standard desktop sidebars into a toggleable slide-over drawer modal on mobile viewports.
  - Upgraded Payments Ledger and Admin Disputes lists to include touch-optimized tables inside horizontal overflow containers.
  - Transformed disputes two-column evidence split panels into layout-stacking list items on mobile width sizes.
  - Re-seeded Neon development database with default ADMIN, CLIENT, and FREELANCER user override parameters.

## [Released] - 2026-07-11

### Fixed
- **Lucide Icons Build Error**: Fixed a Next.js compilation blocker caused by importing the brand `Github` icon from `lucide-react` (which does not exist in version `1.24.0`); replaced it with `Code2`.
- **TypeScript Build Gating**: Fixed TypeScript error in API message route `app/api/projects/[id]/messages/route.ts` where `session.user.id` could be undefined, by adding proper authorization checks.
- **PWA Service Worker Dev Reload Loop**: Fixed infinite reload loop caused by service worker self-healing logic in development; development now never registers or attempts to clean up a service worker at all — registration is scoped strictly to production builds.

### Added

- **Phase 11 (Admin Dashboard, Search/Filters, & Auto-Release Cron)**:
  - Extended GET `/api/projects` and project-service `listProjects()` with budget range (`minBudget`/`maxBudget`) and deadline boundary (`deadlineBefore`/`deadlineAfter`) filters.
  - Implemented client-side UI filter inputs in the projects sidebar on `/projects` page.
  - Created admin overview metrics endpoint GET `/api/admin/overview` and frontend dashboard `/admin/overview`.
  - Added payment history endpoint GET `/api/payments/history` and user ledger page `/payments`.
  - Developed auto-release cron logic in `lib/cron/auto-release.ts` implementing a 5-day grace period, 24-hour advance warnings (`AUTO_RELEASE_WARNING`), and explicit `SYSTEM_AUTO_RELEASE` actor auditing.
  - Added manual POST trigger endpoint `/api/admin/run-auto-release`.
  - Added 6 automated tests in `__tests__/auto-release.test.ts`.

- **Phase 10 (Email Notifications)**:
  - Integrated **Resend** as the email provider with lazy-init client and graceful console-fallback when `RESEND_API_KEY` is unset.
  - Created `NotificationService` (`lib/services/notification-service.ts`) with a single `notify(event, payload)` entry point covering 8 lifecycle events: `FREELANCER_ASSIGNED`, `PAYMENT_RECEIVED`, `WORK_SUBMITTED`, `CHANGES_REQUESTED`, `DISPUTE_RAISED`, `DISPUTE_RESOLVED`, `PAYMENT_RELEASED`, `REFUND_ISSUED`.
  - Wired notification triggers into `ProposalService`, `ProjectService`, `SubmissionService`, `DisputeService`, and the Razorpay webhook handler — all placed **after** the database transaction to ensure DB commits are never blocked by email failures.
  - Added 4 automated tests in `__tests__/notification.test.ts` (unit: PAYMENT_RECEIVED, DISPUTE_RAISED; resilience: mailer throw; integration: full lifecycle 8-event sequence).
  - Added `RESEND_API_KEY` to `.env.example`.

### Fixed

- **Unreachable notification code** in `ProposalService.selectFreelancer()`, `ProjectService.requestChanges()`, and `DisputeService.resolveDispute()`: each method was doing `return prisma.$transaction(...)`, making any `await` after the transaction unreachable. Changed to `const result = await prisma.$transaction(...)` with a subsequent `return result`.
- **Scoping error in `DisputeService.resolveDispute()`**: notification code referenced `dispute.escrow.projectId` outside the transaction scope where `dispute` was declared. Fixed by extracting `projectId` via a hoisted `let` variable.

### Fixed
- **Middleware Webhook Authentication Block**:
  - Fixed a production-blocking issue where NextAuth authentication middleware (`middleware.ts`) was intercepting Razorpay webhook requests (`/api/webhooks/razorpay`) and returning `401 Unauthorized`. Explicitly excluded `/api/webhooks/*` from session authentication checks so that route security is driven entirely by cryptographic signature validation.
  - Added regression test suite in `__tests__/integration.test.ts` to ensure that webhook routes bypass session auth, while other `/api/*` endpoints continue to strictly require session validation.
- **Escrow Synchronization Issues on Verification**:
  - Updated client-side payment signature verification (`PaymentService.verifyPayment()`) to automatically initialize the Escrow record (status `CREATED`) and transition it to `HOLDING` status immediately inside the transaction context upon successful signature verification.
  - Resolved work submission page raw `404` errors when client payment status is `SUCCESS` but `Escrow` is `null` by showing a friendly status alert warning the user that escrow setup is processing.

### Added
- **Admin Reconciliation Route (Escrow Webhook Recovery)**:
  - Created GET `/api/admin/payments/[paymentId]/reconcile-escrow` endpoint to recover projects stuck without an escrow record (e.g., due to missed webhook delivery in local dev).
  - Developed integration test suite `__tests__/reconcile-escrow.test.ts` verifying role gates, SUCCESS validation, existing escrow check, and successful reconciliation.

- **Phase 9 (Audit Logging - Retrofit & Verification Pass)**:
  - Created `lib/constants/actors.ts` reserving the `SYSTEM_WEBHOOK` and `SYSTEM_AUTO_RELEASE` actor constants.
  - Developed `AuditService` in `lib/services/audit-service.ts` allowing admins to fetch chronological audit history sequences per-entity.
  - Created admin-only API route GET `/api/audit-logs/[entityId]` with strict role validation.
  - Retrofitted status-changing actions across services (`ProposalService.selectFreelancer()`, `ProjectService.createProject()`, `ProjectService.updateProject()`, `EscrowService.createEscrowForProject()`, `EscrowService.transition()`, `PaymentService.createOrder()`, `PaymentService.verifyPayment()`, `DisputeService.createDispute()`, `DisputeService.resolveDispute()`, and webhook handlers) to atomically write `AuditLog` rows inside Prisma database transactions.
  - Implemented `AuditHistory.tsx` frontend component displaying logs in a monospace git-log-style view.
  - Embedded `<AuditHistory />` at the bottom of the Project and Dispute detail pages.
  - Added full project lifecycle and dispute resolution walkthrough integration tests in `__tests__/audit-lifecycle.test.ts`.

- **Phase 8 (Dispute System with Evidence & Admin Resolution + State Machine Fix)**:
  - **Part A (Critical Escrow State Machine Fix)**:
    - Added the `UNDER_REVIEW` -> `HOLDING` transition path to the Escrow state machine mapping, fixing the bug that locked freelancers out of resubmitting work after a client requests changes.
    - Updated `requestChanges()` inside `ProjectService` to atomically transition the escrow status to `HOLDING` inside the main Prisma transaction.
    - Added `Prisma.TransactionClient` support to `EscrowService.transition()` to execute state changes within parent transactions.
    - Added integration regression tests validating the Request Changes resubmission loop end-to-end.
  - **Part B (Admin Dispute Resolution System)**:
    - Created `DisputeService` to handle dispute creation, evidence upload gating (capped at 10 items per party), and transaction-wrapped admin resolution (releasing or refunding escrow) with double-submission protection.
    - Added backend endpoints: GET `/api/disputes` (gated list, sorted oldest first and filtered for OPEN/ADMIN_REVIEW), GET `/api/disputes/[id]`, POST `/api/disputes/[id]/evidence`, and POST `/api/disputes/[id]/resolve`.
    - Redesigned dispute details UI containing a custom alert confirmation panel displaying choices, amounts, and final execution actions.
    - Upgraded Admin disputes queue table layout displaying Project, Client, Freelancer, Amount, Days Open, and Status.
    - Developed 5 integration tests validating roles, missing notes rejection, idempotency, and audit log creations.

- **UI Polish Pass**:
  - Implemented consistent premium visual theme utilizing customized slate and indigo CSS variable color tokens.
  - Added sticky frosted-glass effect header navigation with gradient logo mark, hover shadow lift, and user initial avatar badges.
  - Redesigned `/login` and `/select-role` forms featuring elevated background grids, decorative blur blobs, gradient action CTA buttons, and interactive card icons.
  - Upgraded `/projects` public browser lists with sticky filter chip sidebars, search box icons, custom scrollbars, and group-hover lift transitions.
  - Upgraded `/projects/[id]` project detail cards with sticky sidebar contract details, structured review buttons (with ✓/↻/⚠ indicators), clean timeline submission history, and consistent status badge styling.
  - Upgraded Client dashboard tables and new project wizard form fields with modern input focus rings, spacing, and layout formatting.

### Added
- **Phase 7 (Client Review: Approve / Request Changes / Dispute)**:
  - Extended `Submission` database model in `prisma/schema.prisma` with an optional `feedback` text field.
  - Implemented `approve(projectId, clientId)`, `requestChanges(projectId, clientId, feedback)`, and `raiseDispute(projectId, userId, reason)` service handlers in `lib/services/project-service.ts` managing project state transitions and audit logging.
  - Created review API endpoints: POST `/api/projects/[id]/approve`, POST `/api/projects/[id]/request-changes`, and POST `/api/projects/[id]/dispute` checking permissions.
  - Added Client Actions panel on the frontend details page with Approve, Request Changes (including feedback input), and Raise Dispute forms.
  - Added Freelancer Dispute escalation option when the project is under review.
  - Rendered Client adjustment feedback on historical submission round entries.
  - Developed 5 integration tests in `__tests__/review.test.ts` verifying role gates, approval finality, loop-backs, and dispute triggers.

- **Phase 6 (Work Submission & File/Link Uploads)**:
  - Added `Submission` model to Prisma schema, representing work deliverables.
  - Implemented `lib/storage/s3.ts` containing AWS S3 client setup and helper to generate presigned upload URLs.
  - Developed `SubmissionService` to enforce project status barriers, create submission records inside database transactions, and route project/escrow state transitions.
  - Created POST `/api/uploads/presign` endpoint verifying file size/type restrictions (e.g. max 50MB, allowed types like `.zip`, `.pdf`, `.png`, etc.) and generating S3 upload endpoints.
  - Developed POST `/api/projects/[id]/submit-work` to receive freelancer links, notes, and file URLs.
  - Developed GET `/api/projects/[id]/submissions` to list chronological submissions gated by user permissions.
  - Developed client alerts and freelancer submission forms on the frontend details page.
  - Wrote 7 unit and integration Jest tests in `__tests__/submission.test.ts` verifying size limit rejections, file type checks, role gates, status transitions, and data privacy.

## [Released] - 2026-07-10

### Added
- **Phase 5 (Webhook Handling & Escrow State Machine)**:
  - Created `EscrowService` implementing the central allowed-transitions state machine and writing audit log rows inside database transactions.
  - Implemented `/api/webhooks/razorpay` endpoint to receive and verify event signature hooks securely.
  - Added idempotency filter logging `event.id` values to prevent duplicate event processes.
  - Integrated webhook `payment.captured` listener to transition payment and escrow statuses to `SUCCESS` and `HOLDING` automatically.
  - Integrated webhook `payment.failed` listener to mark payment failures.
  - Updated frontend details page to display Escrow Status Badge indicator next to payment status under details sidebar.
  - Created 6 Jest tests in `__tests__/escrow.test.ts` verifying illegal transitions, audit logging, incorrect signatures, idempotency, and full capture/fail flows.
- **Phase 4 (Razorpay Payment Capture)**:
  - Installed `razorpay` npm package for server-side order transactions.
  - Implemented `PaymentService` to create orders (`createOrder`) and verify payments (`verifyPayment`) using HMAC-SHA256 signature verification.
  - Developed `POST /api/payments/[projectId]/create-order` route to initiate orders (restricted to Client owner, status ASSIGNED).
  - Developed `POST /api/payments/verify` route for signature verification and setting `Payment.status = SUCCESS`.
  - Added "Pay Now" checkout widget integration using Razorpay Checkout SDK and dynamic script loading in `/app/projects/[id]`.
  - Added inline Payment Status indicator showing Pending / Success / Failed in the Details Sidebar.
  - Created 8 new Jest tests in `__tests__/payment.test.ts` covering signature checks and route guards.
- **Phase 0 (Project Scaffolding)**:
  - Initialized Next.js 16 (App Router) + TypeScript + Tailwind CSS project skeleton.
  - Set up Prisma 6.4.0 database connection configuration and dynamic client loader.
  - Created initial Prisma database schema models representing the full Conceptual Data Model: `User`, `Project`, `Proposal`, `Payment`, `Escrow`, `Dispute`, `Evidence`, `AuditLog`, and `WebhookEvent`.
  - Created `.env.example` file populated with placeholder keys for database, NextAuth, Razorpay, and AWS S3 integrations.
- **Phase 1 (Authentication & RBAC)**:
  - Integrated NextAuth.js configured with Google OAuth provider.
  - Implemented client-side onboarding page flow `/select-role` redirecting unassigned role users to select `CLIENT` or `FREELANCER` role.
  - Implemented `/api/auth/select-role` API route to validate and permanently save the selected role to the database, blocking `ADMIN` from select-role submissions.
  - Implemented developer overrides configuration in `lib/auth/role-overrides.ts` mapping specific test Gmail accounts directly to predefined roles (`ADMIN`, `CLIENT`, `FREELANCER`) on first Google sign-in.
  - Created server-side RBAC guards `getServerSession` and `requireRole` to retrieve active user context and protect future page/API resource actions.
  - Created request-level global routing wrapper in `middleware.ts` guarding paths and API endpoints, redirecting unauthenticated users to `/login`.
  - Added session-aware global `<Navbar />` showing name, role, and logout action.
- **Phase 2 (Project Posting)**:
  - Added predefined, categorized skills under `lib/constants/skills.ts` containing 9 categories of tech skills.
  - Updated `ProjectStatus` enum in `prisma/schema.prisma` with `CANCELLED` and `CLOSED` states.
  - Implemented Zod schema validation for project creation and edits in `lib/validators/project.ts` (budget > 0, future deadline, non-empty predefined skills).
  - Built `ProjectService` class in `lib/services/project-service.ts` handling data transactions, ownership validation, and lifecycle guards.
  - Created `POST /api/projects` and `GET /api/projects` routes for listing/creating projects.
  - Created `GET /api/projects/[id]` and `PATCH /api/projects/[id]` routes for details and update actions.
  - Built Client-side creation form at `/client/projects/new`.
  - Built Client dashboard at `/client/projects` listing owned projects with status badges and cancellation capabilities.
  - Built Public project browse/search interface at `/projects` with status and skill filter sidebars.
  - Built detailed Project dashboard at `/projects/[id]` with inline edit forms for Client owners.
  - Created 7 Jest unit and integration tests confirming past deadline rejection, budget constraint validation, empty skill array block, GET filters, PATCH ownership checks, status update blocks, and Freelancer role posting rejections.
- **Phase 3 (Proposals & Freelancer Selection)**:
  - Added `ProposalStatus` enum (`PENDING`, `ACCEPTED`, `REJECTED`), added `status` to `Proposal`, and added `agreedAmount` to `Project` model in Prisma.
  - Created Zod validation schema in `lib/validators/proposal.ts` verifying description limits, delivery times, and price counter-offers.
  - Implemented `ProposalService` in `lib/services/proposal-service.ts` managing transactional project-freelancer assignments, list filters, edits, and proposal deletions.
  - Developed route endpoints for proposal actions: `/api/projects/[id]/apply`, `/api/projects/[id]/proposals`, `/api/projects/[id]/select-freelancer`, and `/api/proposals/[id]`.
  - Built Freelancer proposal forms (apply, inline edits, withdrawals) and Client selection dashboards (proposal reviews and project assignments) on the project detail route.
  - Added 8 Jest tests validating proposal errors, duplicate bid rejections, closed project application blocks, list privacy gating, transactional project assignment, and assignment authorization checks.


