# Changelog

All notable changes to the TrustLance project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released] - 2026-07-11

### Added
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


