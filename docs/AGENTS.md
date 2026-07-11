# AGENTS.md — TrustLance

## Project
Full-stack freelance marketplace with an escrow-style payment workflow. See /docs/MASTER_PLAN.md
or the /docs/TrustLance_MasterPlan file for the full product spec — read it before implementing any
feature not yet scaffolded, especially before touching anything in the payment or escrow flow.

## Stack (do not substitute without asking)
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS — in /app and /components
- Backend: Next.js API Routes (Node.js runtime) — in /app/api, service layer in /lib/services
- DB: PostgreSQL via Prisma ORM — schema in /prisma/schema.prisma
- Auth: NextAuth.js, session-based, role field on User (CLIENT | FREELANCER | ADMIN)
- Payments: Razorpay Payment Gateway (Checkout + Orders API) — NOT Razorpay Route, NOT RazorpayX
- File Storage: Cloudinary or S3 (whichever is configured in /lib/storage — check before assuming)
- Background Jobs: Vercel Cron / node-cron for auto-release-after-deadline (Phase 2+ only)

## Commands (use these exact commands, do not invent alternatives)
- Install: `npm install`
- Run dev: `npm run dev`
- Prisma migrate (dev): `npx prisma migrate dev`
- Prisma studio (inspect DB): `npx prisma studio`
- Lint: `npm run lint` — must pass with zero errors before any commit
- Test: `npm test` (Jest) — escrow state machine tests are non-negotiable, see rule 3 below

## Non-negotiable rules

1. **Never fabricate.** If you don't know whether a package, env var, Prisma field, or API route
   exists in this repo, check the actual file before writing code that assumes it. Do not invent
   Razorpay API responses, field names, or webhook payload shapes that "seem right" — check the
   actual Razorpay docs or existing code in this repo. If unsure, say so and ask, don't guess.

2. **Never commit secrets (CRITICAL).** `.env` is gitignored — never write real credentials
   (Razorpay key secret, database URL, NextAuth secret) into ANY tracked file, including test
   scripts or one-off checks. Always use `process.env.VARIABLE_NAME`. Use `.env.example` with
   placeholder values only. Leaking a Razorpay key secret is a critical failure.

3. **Escrow state transitions are the single most important invariant in this codebase.** All
   escrow status changes must go through `EscrowService` — never update `escrow.status` directly
   from a route handler or another service. Illegal transitions (e.g. `PAYMENT_PENDING` straight to
   `RELEASED`) must throw, not silently succeed. Any change to `EscrowService` must include or update
   a test proving illegal transitions are rejected.

4. **Never trust client-reported payment success.** Every payment confirmation must be verified
   server-side via Razorpay signature verification (checkout callback AND webhook, independently).
   Never set `Payment.status = SUCCESS` or `Escrow.status = HOLDING` based on a frontend flag alone.

5. **Webhook idempotency is required, not optional.** Every webhook handler must check whether the
   incoming Razorpay `event.id` has already been processed before mutating any state. Any change
   touching `/api/webhooks/razorpay` must include a test proving a duplicate event is a no-op.

6. **Audit logging is not optional for state-changing actions.** Any change to `Escrow.status`,
   `Dispute.status`, or `Project.status` must write an `AuditLog` row in the same database
   transaction as the state change — never as a separate, potentially-failing follow-up call.

7. **No silent architecture changes.** Don't introduce a new library, change the folder structure,
   or alter the Prisma schema in ways not reflected in /docs/MASTER_PLAN.md without flagging it
   explicitly in your response first.

8. **Match existing patterns.** Before adding a new route/service/component, look at how an existing
   one in this repo is structured (e.g. how `ProjectService` calls `EscrowService`) and follow that
   pattern rather than introducing a new style.

9. **Confirm before destructive actions.** Never drop a table, force-push, delete a branch, or run
   `prisma migrate reset` without explicit confirmation in the current session.

10. **Never overstate what's implemented in resume-facing docs or code comments.** Do not add
    comments, README lines, or copy suggesting Razorpay Route or a regulated escrow product is used
    unless it is actually integrated. The escrow is application-level business logic — describe it
    that way everywhere, including in code comments.

## Code style
- Functions and variables: camelCase. Components: PascalCase. Files: kebab-case except React
  components (PascalCase.tsx).
- Every API route wrapped in try/catch, errors passed to a centralized error handler — never a bare
  `res.status(500).send(err)` or an unguarded throw reaching the client as a raw stack trace.
- No `console.log` left in committed code — use a real logger or remove it.
- No commented-out dead code in commits — delete it, git history keeps it if needed.
- All Prisma writes that touch more than one table (e.g. Escrow + AuditLog) use `prisma.$transaction`.

## Before every commit/push — run through this in order
1. `npm run lint` passes, zero errors
2. `npm test` passes — explicitly confirm escrow state-machine and webhook idempotency tests are
   included and passing if this task touched either area
3. No `.env`, `node_modules`, or build artifacts staged (`git status` check)
3a. Audit codebase for hardcoded secrets (Razorpay keys, database URLs) in any tracked file
4. No leftover `console.log`/debugger statements
5. Update /docs/CHANGELOG.md with what changed
6. Update /docs/FEATURE_TRACKER.md status for any feature touched
7. Commit message follows the Conventional Commits format below

## Commit message format (Conventional Commits — required)
`type(scope): short description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

Examples:
- `feat(escrow): add HOLDING to WORK_SUBMITTED transition with audit log`
- `fix(webhooks): reject duplicate razorpay event.id`
- `test(escrow): add test proving illegal state transitions throw`

Bad (do not do this): `update stuff`, `fix bug`, `wip`, `final version`, `changes`

## When you finish a task
State clearly, in plain language, what was actually implemented, which files were touched, and what
was explicitly NOT done (deferred/stubbed) — do not imply something works end-to-end (e.g. "payment
verified") if it was only scaffolded or uses mock data.
