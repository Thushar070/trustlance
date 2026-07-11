# TrustLance — Full Build Plan (Phase-by-Phase, Zero to Deployed)

## ⚠️ Mandatory reference for any agent working on this repo
Before implementing anything in any phase below, read, in this order:
1. `/docs/AGENTS.md` — non-negotiable rules, stack, commands, commit checklist. Every rule in
   that file applies to every phase in this document without exception.
2. `/docs/MASTER_PLAN.md` (or `/docs/TrustLance_MasterPlan.md`) — full product spec, data model
   reasoning, payment/escrow architecture, security model.

This file (`BUILD_PLAN.md`) is the execution breakdown of that spec. If anything here appears to
conflict with AGENTS.md or the Master Plan, AGENTS.md and the Master Plan win — flag the conflict
in your response rather than silently picking one.

**Rule for every phase:** a phase is not complete until its feature works end-to-end (schema →
service layer → API route → frontend UI → test), not just scaffolded. Do not mark a phase done if
any layer is stubbed — state explicitly what was deferred, per AGENTS.md's final rule.

---

## How this plan is structured

Each phase delivers exactly **one complete, demoable feature** — nothing is left half-built across
phase boundaries. Every phase has:
- **Goal** — one sentence, what a user can now do that they couldn't before
- **Depends on** — which prior phases must be done first
- **Schema changes** — exact Prisma models/fields to add
- **Backend tasks** — services, routes, validation
- **Frontend tasks** — pages/components needed
- **Tests required** — what must be proven before the phase is "done"
- **Definition of Done** — a checklist

Phases are numbered 0–12. Do not skip ahead — later phases assume earlier ones are fully working,
not stubbed.

---

## Phase 0 — Project Scaffolding & Database Foundation

**Goal:** A running Next.js + TypeScript + Tailwind app connected to a PostgreSQL database via
Prisma, with the full schema in place (even though most tables are unused until later phases).

**Depends on:** nothing (this is the start)

### Tasks
1. Initialize Next.js (App Router) + TypeScript + Tailwind project.
2. Set up `/prisma/schema.prisma` with the full data model from the Master Plan §10:
   `User`, `Project`, `Proposal`, `Payment`, `Escrow`, `Dispute`, `Evidence`, `AuditLog`.
3. Set up PostgreSQL (local Docker container for dev, or a hosted dev instance — decide and
   document the choice in `/docs/DEPLOYMENT.md`).
4. Create `.env.example` with placeholders for: `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   storage provider keys (Cloudinary or S3 — pick one now, document the choice).
5. Run `npx prisma migrate dev --name init` to create the initial migration.
6. Set up folder structure:
   ```
   /app
     /api
     /(auth)
     /(dashboard)
   /components
   /lib
     /services
     /validators
     /storage
   /prisma
   /docs
     AGENTS.md
     MASTER_PLAN.md
     BUILD_PLAN.md
     CHANGELOG.md
     FEATURE_TRACKER.md
     DEPLOYMENT.md
   ```
7. Create `/docs/CHANGELOG.md` and `/docs/FEATURE_TRACKER.md` with the Phase 0–12 list from this
   document pre-populated as "Not Started".
8. Set up ESLint + Prettier config, confirm `npm run lint` runs clean on the empty scaffold.
9. Deploy an empty "hello world" version to Vercel immediately (proves the pipeline works before
   any real feature is built on top of it).

### Tests required
- None functional yet — confirm `npm run dev` runs, `npx prisma studio` connects, and the deployed
  URL loads.

### Definition of Done
- [ ] App runs locally with `npm run dev`
- [ ] Prisma schema has all 8 models from the Master Plan, migration applied
- [ ] `.env.example` covers every secret the project will ever need (fill in as discovered)
- [ ] Empty app deployed and reachable at a live URL
- [ ] `/docs` folder exists with AGENTS.md, MASTER_PLAN.md, and this BUILD_PLAN.md in it

---

## Phase 1 — Authentication & Role-Based Access Control

**Goal:** A user can sign up, log in, and the app knows their role (Client / Freelancer / Admin) —
every subsequent API route can be protected by role.

**Depends on:** Phase 0

### Schema (already in Phase 0, used now)
- `User { id, email, name, role, createdAt }`

### Backend tasks
1. Install and configure NextAuth.js.
2. Decide provider(s): credentials-based (email/password) and/or OAuth — document the decision.
3. On first login/signup, require role selection (Client or Freelancer only — Admin is manually
   assigned, never self-selected at signup).
4. Build `lib/auth/getServerSession` helper wrapping NextAuth's session for use in API routes.
5. Build `lib/auth/requireRole(role)` middleware helper — throws 403 if the session's role doesn't
   match.
6. Seed one hardcoded `ADMIN` user via a Prisma seed script (`prisma/seed.ts`) for local dev/testing.

### Frontend tasks
1. `/app/(auth)/login/page.tsx`
2. `/app/(auth)/signup/page.tsx` — includes role selection (Client/Freelancer)
3. Session-aware navbar showing the logged-in user's name/role and a logout action.
4. Basic protected-route wrapper for dashboard pages (redirect to `/login` if unauthenticated).

### Tests required
- Unit test: `requireRole` rejects a request from a mismatched role.
- Integration test: signup → login → session reflects correct role.

### Definition of Done
- [ ] User can sign up as Client or Freelancer, log in, log out
- [ ] Admin user exists via seed script, cannot be created via public signup
- [ ] `requireRole` helper used and tested
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 2 — Project Posting (Client-Side)

**Goal:** A logged-in Client can create, view, edit, and close their own project listings.

**Depends on:** Phase 1

### Schema
- `Project { id, clientId, title, description, budget, deadline, skills[], status, freelancerId?,
  createdAt }` (already scaffolded in Phase 0)
- `status` enum: `OPEN | ASSIGNED | IN_PROGRESS | UNDER_REVIEW | COMPLETED`

### Backend tasks
1. `lib/services/ProjectService.ts`:
   - `createProject(clientId, data)`
   - `getProjectById(id)`
   - `listProjects(filters)` — status/skill filters, paginated
   - `updateProject(id, clientId, data)` — ownership-checked, only allowed while `status = OPEN`
2. Routes:
   - `POST /api/projects` — Client only, validated with a zod schema (title, description, budget > 0,
     deadline in the future, at least one skill)
   - `GET /api/projects` — public listing, filterable
   - `GET /api/projects/:id`
   - `PATCH /api/projects/:id` — Client only, owner only, only while `OPEN`

### Frontend tasks
1. `/app/(dashboard)/client/projects/new/page.tsx` — creation form
2. `/app/(dashboard)/client/projects/page.tsx` — client's own project list
3. `/app/projects/page.tsx` — public browse/search page (for freelancers)
4. `/app/projects/[id]/page.tsx` — project detail page

### Tests required
- Unit: validation rejects a project with a past deadline or zero budget.
- Integration: non-owner Client cannot edit another Client's project (ownership check, not just role
  check).

### Definition of Done
- [ ] Client can create a project and see it appear in both their dashboard and the public list
- [ ] Ownership check proven by test, not just role check
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 3 — Proposals & Freelancer Selection

**Goal:** A Freelancer can apply to an open project; the Client can review proposals and select one
freelancer, moving the project to `ASSIGNED`.

**Depends on:** Phase 2

### Schema
- `Proposal { id, projectId, freelancerId, message, estimatedDays, price?, createdAt }`

### Backend tasks
1. `lib/services/ProposalService.ts`:
   - `submitProposal(freelancerId, projectId, data)` — reject if project isn't `OPEN`, reject
     duplicate proposals from the same freelancer on the same project
   - `listProposalsForProject(projectId, clientId)` — owner-only
   - `selectFreelancer(projectId, clientId, freelancerId)` — sets `Project.freelancerId`,
     transitions `status: OPEN → ASSIGNED`, and (important) rejects/archives all other proposals
     on that project
2. Routes:
   - `POST /api/projects/:id/apply` — Freelancer only
   - `GET /api/projects/:id/proposals` — Client owner only
   - `POST /api/projects/:id/select-freelancer` — Client owner only

### Frontend tasks
1. Proposal submission form on the project detail page (visible to Freelancers only, hidden if
   already applied or project not `OPEN`)
2. Client-side proposal review list on their own project page, with a "Select" action per proposal

### Tests required
- Integration: a freelancer cannot apply twice to the same project.
- Integration: selecting a freelancer correctly transitions project status and blocks further
  proposals.
- Integration: only the owning client can select a freelancer for their project.

### Definition of Done
- [ ] Freelancer can apply, Client can see all proposals and select one
- [ ] Project status transitions correctly, further applications blocked post-assignment
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 4 — Razorpay Payment Capture

**Goal:** After a project is `ASSIGNED`, the Client can pay through Razorpay, and the backend
verifies the payment server-side before trusting it.

**Depends on:** Phase 3

### Schema
- `Payment { id, projectId, razorpayOrderId, razorpayPaymentId?, amount, status, createdAt }`
- `status` enum: `PENDING | SUCCESS | FAILED`

### Backend tasks
1. `lib/services/PaymentService.ts`:
   - `createOrder(projectId, clientId)` — calls Razorpay Orders API, creates a `Payment` row with
     `status: PENDING`
   - `verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)` — recomputes HMAC
     signature server-side using `RAZORPAY_KEY_SECRET`, compares to the received signature; only on
     match sets `Payment.status = SUCCESS`
2. Routes:
   - `POST /api/payments/:projectId/create-order` — Client, owner only, project must be `ASSIGNED`
   - `POST /api/payments/verify` — Client only; **never trust this alone as the sole source of
     truth — see Phase 5's webhook handler for the independent confirmation path**
3. Razorpay Checkout integrated on the frontend using the created order ID.

### Frontend tasks
1. "Pay Now" button on the assigned project's page (Client view only), opening Razorpay Checkout.
2. Payment status indicator (Pending / Success / Failed) on the project page.

### Tests required
- Unit: `verifyPayment` rejects a tampered/incorrect signature.
- Integration: `create-order` rejects a non-owner or a project not in `ASSIGNED` status.

### Definition of Done
- [ ] Client can pay via Razorpay Checkout in test mode
- [ ] Signature verification proven to reject bad signatures via test
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 5 — Webhook Handling & Escrow State Machine

**Goal:** Payment confirmation is independently verified via Razorpay webhook (not just the
frontend callback), and a verified payment creates and advances an `Escrow` record through its
state machine to `HOLDING`.

**Depends on:** Phase 4

### Schema
- `Escrow { id, projectId, status, createdAt, updatedAt }`
- `status` enum: `CREATED | HOLDING | WORK_SUBMITTED | UNDER_REVIEW | RELEASED | DISPUTED | REFUNDED`
- Add a `WebhookEvent { id, razorpayEventId, processedAt }` table (or similar) to support
  idempotency — **this table is not in the original Master Plan schema, add it now and update the
  Master Plan doc to reflect it.**

### Backend tasks
1. `lib/services/EscrowService.ts` — **this is the single source of truth for all escrow state
   changes, per AGENTS.md rule 3.** No other file may write `Escrow.status` directly.
   - `transition(escrowId, newStatus, actorId)` — validates the transition against an explicit
     allowed-transitions map, throws on illegal transitions, writes an `AuditLog` row in the same
     `prisma.$transaction`.
   - `createEscrowForProject(projectId)` — called once payment is verified.
2. `POST /api/webhooks/razorpay`:
   - Verify Razorpay's webhook signature (different secret from the checkout flow).
   - Check `WebhookEvent` table for the incoming `event.id` — if already processed, return 200
     immediately without re-processing (idempotency).
   - On `payment.captured`: confirm `Payment.status = SUCCESS`, call
     `EscrowService.createEscrowForProject` → `EscrowService.transition(..., 'HOLDING', ...)`.
   - On `payment.failed`: set `Payment.status = FAILED`, do not touch escrow.
3. Define the full allowed-transitions map explicitly in code (mirrors Master Plan §12):
   ```
   CREATED -> HOLDING
   HOLDING -> WORK_SUBMITTED
   WORK_SUBMITTED -> UNDER_REVIEW
   UNDER_REVIEW -> RELEASED
   UNDER_REVIEW -> DISPUTED
   DISPUTED -> RELEASED
   DISPUTED -> REFUNDED
   ```

### Frontend tasks
- Escrow status badge on the project page, reflecting current state.

### Tests required (non-negotiable per AGENTS.md rule 3 and 5)
- Unit: every illegal transition in the map above throws.
- Unit: a duplicate webhook `event.id` is a no-op (proven by asserting the DB state doesn't change
  and the escrow doesn't double-transition).
- Integration: full flow — order created → payment verified via signature → webhook received →
  escrow reaches `HOLDING`.

### Definition of Done
- [ ] Escrow reaches `HOLDING` only after both signature verification and webhook confirmation
- [ ] Illegal transitions proven to throw via test
- [ ] Duplicate webhook proven to be a no-op via test
- [ ] `/docs/FEATURE_TRACKER.md` and Master Plan schema updated with `WebhookEvent` table

---

## Phase 6 — Work Submission & File/Link Uploads

**Goal:** The assigned Freelancer can submit work (files, GitHub link, demo link, progress notes),
transitioning the project and escrow into `WORK_SUBMITTED`.

**Depends on:** Phase 5

### Schema
- Add `fileUrl`, `githubLink`, `demoLink`, `notes` fields to a new `Submission` model, OR extend
  `Project` with a `submissions Submission[]` relation (decide which and document it — a
  `Submission` model is preferred since a project may have multiple submission rounds after
  revision requests).
  ```prisma
  model Submission {
    id         String   @id @default(cuid())
    projectId  String
    fileUrl    String?
    githubLink String?
    demoLink   String?
    notes      String?
    createdAt  DateTime @default(now())
  }
  ```

### Backend tasks
1. Set up the chosen file storage provider (Cloudinary or S3) in `lib/storage/`.
2. `lib/services/SubmissionService.ts`:
   - `submitWork(projectId, freelancerId, data)` — ownership check (must be the assigned
     freelancer), creates a `Submission` row, transitions `Project.status → UNDER_REVIEW` and
     `Escrow.status: HOLDING → WORK_SUBMITTED → UNDER_REVIEW` via `EscrowService.transition` (two
     calls, or a single combined transition step — decide and document which).
3. Route: `POST /api/projects/:id/submit-work` — assigned Freelancer only, validated file
   size/type.

### Frontend tasks
1. Work submission form on the project page (Freelancer view, visible only once `ASSIGNED`).
2. Submission history view showing all past submissions (relevant once revisions are supported in
   Phase 7).

### Tests required
- Integration: only the assigned freelancer (not any freelancer, not the client) can submit work.
- Integration: submitting work correctly advances both `Project.status` and `Escrow.status`.
- Unit: file upload validation rejects disallowed types/oversized files.

### Definition of Done
- [ ] Freelancer can submit work with at least one of file/GitHub/demo link
- [ ] Escrow reaches `UNDER_REVIEW` correctly
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 7 — Client Review: Approve / Request Changes / Dispute

**Goal:** The Client can review submitted work and take one of three actions, each with correct
downstream effects.

**Depends on:** Phase 6

### Backend tasks
1. Extend `ProjectService`/`EscrowService`:
   - `approve(projectId, clientId)` — owner-only, `Escrow.status: UNDER_REVIEW → RELEASED`,
     `Project.status → COMPLETED`
   - `requestChanges(projectId, clientId, feedback)` — owner-only, `Project.status: UNDER_REVIEW →
     IN_PROGRESS` (freelancer can resubmit via Phase 6's submission flow), store feedback text
   - `raiseDispute(projectId, userId, reason)` — either party, `Escrow.status: UNDER_REVIEW →
     DISPUTED` (full dispute record built in Phase 8; this phase just handles the trigger and state
     transition)
2. Routes:
   - `POST /api/projects/:id/approve` — Client owner only
   - `POST /api/projects/:id/request-changes` — Client owner only
   - `POST /api/projects/:id/dispute` — Client or assigned Freelancer only

### Frontend tasks
1. Three-button review UI on the project page (Client view, visible only in `UNDER_REVIEW`):
   Approve / Request Changes / Raise Dispute.
2. Feedback text field for "Request Changes".
3. Reason text field for "Raise Dispute" (full evidence upload comes in Phase 8).

### Tests required
- Integration: each of the three actions is owner/role-gated correctly.
- Integration: `approve` correctly finalizes both `Project.status` and `Escrow.status` and this
  transition is proven illegal to reverse (no route allows un-approving).
- Integration: `request-changes` correctly loops back to allow a new submission (Phase 6 flow still
  works after this).

### Definition of Done
- [ ] All three review actions work and are correctly gated
- [ ] Escrow reaches `RELEASED` on approval, proven final via test
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 8 — Dispute System with Evidence Upload & Admin Resolution

**Goal:** A raised dispute has a full record, both parties can upload evidence, and an Admin can
resolve it with release/refund, which correctly finalizes the escrow.

**Depends on:** Phase 7

### Schema
- `Dispute { id, escrowId, raisedBy, reason, status, resolution?, createdAt }`
- `status` enum: `OPEN | ADMIN_REVIEW | RESOLVED`
- `Evidence { id, disputeId, userId, type, url, createdAt }`

### Backend tasks
1. `lib/services/DisputeService.ts`:
   - `createDispute(escrowId, raisedBy, reason)` — called from Phase 7's `raiseDispute`, creates
     the actual `Dispute` row (Phase 7 only did the escrow-side transition; this phase completes
     the record)
   - `addEvidence(disputeId, userId, type, url)` — either party on that specific dispute only
   - `resolveDispute(disputeId, adminId, resolution: 'RELEASE' | 'REFUND')` — Admin only,
     transitions `Escrow.status: DISPUTED → RELEASED` or `DISPUTED → REFUNDED` via
     `EscrowService.transition`, sets `Dispute.status = RESOLVED`
2. Routes:
   - `GET /api/disputes/:id`
   - `POST /api/disputes/:id/evidence` — file upload via the same storage provider as Phase 6
   - `POST /api/disputes/:id/resolve` — Admin only

### Frontend tasks
1. Dispute detail page showing reason, timeline, and evidence from both sides.
2. Evidence upload form (both Client and Freelancer views, scoped to their own dispute).
3. Admin dispute queue page (`/app/(dashboard)/admin/disputes/page.tsx`) listing all open disputes.
4. Admin resolution UI (Release / Refund buttons) on the dispute detail page.

### Tests required
- Integration: only the two involved parties can add evidence to a given dispute (not any logged-in
  user).
- Integration: only Admin can resolve, and resolution correctly finalizes escrow status.
- Integration: a resolved dispute cannot be resolved again (no double-resolution).

### Definition of Done
- [ ] Full dispute lifecycle works: raise → evidence from both sides → admin resolves → escrow
      finalized
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 9 — Audit Logging (Retrofit + Verification)

**Goal:** Every state-changing action across the whole app so far is provably reconstructable from
`AuditLog` alone.

**Depends on:** Phase 8 (this phase retrofits/verifies logging across Phases 1–8)

> Note: `AuditLog` writes should already exist from Phase 5 onward per AGENTS.md rule 6. This phase
> is a dedicated audit pass — do not treat it as "add logging now"; treat it as "verify and fill any
> gaps."

### Backend tasks
1. Audit every service method that changes `Project.status`, `Escrow.status`, or `Dispute.status` —
   confirm each writes an `AuditLog` row in the same transaction as the state change. Fix any that
   don't.
2. `lib/services/AuditService.ts`:
   - `getLogsForEntity(entityType, entityId)` — Admin only
3. Route: `GET /api/audit-logs/:entityId?type=` — Admin only

### Frontend tasks
1. Admin-only audit trail viewer on the project/escrow/dispute detail pages — a simple
   chronological list of `AuditLog` entries.

### Tests required
- Integration test that walks a full project lifecycle (create → assign → pay → submit → dispute →
  resolve) and asserts the resulting `AuditLog` rows, in order, exactly reconstruct that sequence of
  states.

### Definition of Done
- [ ] Every state-changing action across the app writes an audit row, proven by the full-lifecycle
      test
- [ ] Admin can view the audit trail for any project/escrow/dispute
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 10 — Email Notifications

**Goal:** Users receive email notifications on the key lifecycle events.

**Depends on:** Phase 9

### Backend tasks
1. Set up Resend or Nodemailer in `lib/notifications/mailer.ts`.
2. `lib/services/NotificationService.ts` — a single `notify(event, payload)` function, called from
   the relevant service methods (not scattered `sendEmail()` calls across routes).
3. Wire notifications to these events, listed exactly (do not add or skip any without noting it):
   - Payment received (Client + Freelancer)
   - Freelancer assigned (Freelancer)
   - Work submitted (Client)
   - Changes requested (Freelancer)
   - Dispute raised (both parties + Admin)
   - Dispute resolved (both parties)
   - Payment released (Freelancer)
   - Refund issued (Client)

### Frontend tasks
- None required (email is out-of-app), but consider a simple in-app notification bell as a stretch
  item — not required for Phase 10 completion.

### Tests required
- Unit test with a mocked mailer confirming `notify()` is called with correct event/payload for at
  least the payment-received and dispute-raised cases.

### Definition of Done
- [ ] All 8 listed events trigger an email in dev (verify with a test inbox, e.g. Mailtrap or
      Resend's test mode)
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 11 — Admin Dashboard, Search/Filters, and Auto-Release Cron

**Goal:** Admin has a full operational view of the platform; Clients/Freelancers can search/filter
projects; stalled reviews auto-resolve after a deadline.

**Depends on:** Phase 10

### Backend tasks
1. `GET /api/admin/overview` — counts of projects by status, open disputes, total payment volume
   (Admin only).
2. Extend `GET /api/projects` with real filtering: skill, budget range, deadline range, status.
3. Cron job (`lib/cron/auto-release.ts`, triggered via Vercel Cron or `node-cron`):
   - Finds all `Escrow` rows in `UNDER_REVIEW` where the linked submission is older than N days
     (configurable, document the default in `/docs/DEPLOYMENT.md`) and no open dispute exists.
   - Calls `EscrowService.transition(..., 'RELEASED', actorId: 'SYSTEM_AUTO_RELEASE')`.
   - This transition must appear in `AuditLog` with a clearly distinguishable actor so it's never
     confused with a manual client approval.

### Frontend tasks
1. `/app/(dashboard)/admin/overview/page.tsx` — platform stats dashboard.
2. Filter UI on the public projects browse page (Phase 2's page, extended now).
3. Payment history page per user (`/app/(dashboard)/payments/page.tsx`).

### Tests required
- Unit: cron logic correctly identifies eligible projects and skips ones with an open dispute or
  within the grace period.
- Integration: auto-release correctly transitions escrow and is distinguishable in the audit log
  from a manual approval.

### Definition of Done
- [ ] Admin overview page shows accurate live counts
- [ ] Search/filter works on the public project listing
- [ ] Auto-release cron proven correct via test, not just "ran once locally"
- [ ] `/docs/FEATURE_TRACKER.md` updated

---

## Phase 12 — Testing Pass, Hardening, and Deployment

**Goal:** The full application is tested end-to-end, hardened, and deployed to production with a
real Razorpay account (test mode acceptable for demo purposes, document which mode is live).

**Depends on:** Phase 11

### Tasks
1. Full Jest test suite review — confirm every "Tests required" item from Phases 1–11 actually
   exists and passes; fill any gaps found.
2. One end-to-end Playwright test covering the critical path: signup (client + freelancer) → post
   project → apply → select → pay → submit work → approve → escrow released.
3. A second Playwright test covering the dispute path: submit work → raise dispute → both parties
   add evidence → admin resolves → escrow finalized.
4. Rate limiting added to: proposal submission, dispute creation, evidence upload.
5. Security review pass against AGENTS.md rules 1–10 — go through each rule explicitly and confirm
   compliance, note any exceptions.
6. Deploy to Vercel with production environment variables set (real or test-mode Razorpay keys —
   document which).
7. Write `/docs/DEPLOYMENT.md` covering: environment variables, cron configuration, storage
   provider setup, and any real incidents hit during deployment (per AGENTS.md rule 7).
8. Final README with architecture diagram, tech stack, and setup instructions for a fresh clone.

### Definition of Done
- [ ] Full test suite passes, coverage percentage reported in README
- [ ] Both critical-path Playwright tests pass
- [ ] App is live at a public URL with working Razorpay checkout (test mode)
- [ ] `/docs/DEPLOYMENT.md` and README complete
- [ ] `/docs/FEATURE_TRACKER.md` shows all 13 phases (0–12) as Done

---

## Phase Summary Table

| Phase | Feature Delivered |
|---|---|
| 0 | Project scaffolding + full DB schema |
| 1 | Auth & RBAC |
| 2 | Project posting (Client) |
| 3 | Proposals & freelancer selection |
| 4 | Razorpay payment capture |
| 5 | Webhook handling + escrow state machine to HOLDING |
| 6 | Work submission with file/link uploads |
| 7 | Client review: approve / request changes / dispute |
| 8 | Dispute system with evidence + admin resolution |
| 9 | Audit logging verification pass |
| 10 | Email notifications |
| 11 | Admin dashboard, search/filters, auto-release cron |
| 12 | Full testing pass, hardening, deployment |

Every phase = one working feature end to end. Do not begin a phase until the previous phase's
Definition of Done checklist is fully checked.
