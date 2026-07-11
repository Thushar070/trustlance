# TrustLance — Master Project Plan & Technical Blueprint
### Secure Freelance Marketplace with Escrow-Style Payment Workflow
Working Document — Solo Build · SSN College of Engineering
July 2026

---

## Contents
1. Executive Summary
2. Problem Research & Discovery
3. Vision Statement
4. Goals & Non-Goals
5. Personas
6. Full Feature Universe (All Phases)
7. Technology Stack — Final Decisions & Reasoning
8. System Architecture
9. Authentication & Authorization — Full Design
10. Data Model (Prisma Schema)
11. Payment Flow — Razorpay Integration, Full Explanation
12. Escrow Engine — State Machine Design
13. Dispute Resolution System
14. Security Model
15. API Surface (Core Routes)
16. Non-Functional Requirements
17. Build Plan — Stage by Stage
18. Success Metrics
19. Risks & Mitigations
20. Resume Bullets (Honest, Accurate Framing)
21. Appendix — Full Flat Feature List, All Phases

---

## 1. Executive Summary

TrustLance is a full-stack freelance marketplace that solves the two-sided trust problem inherent to
freelance work: the client's fear of paying and never receiving work, and the freelancer's fear of
delivering work and never getting paid. It does this with an escrow-style payment workflow — the client
pays through Razorpay, and the platform's own backend manages a state machine that controls when
funds are considered releasable, based on project milestones, client approval, and a structured dispute
process.

This document is the working reference for the entire build: the problem it solves, the full feature set
across phases, the technology stack with reasoning, the data model, the payment and escrow architecture,
the dispute system, the security model, and a realistic stage-by-stage build plan.

**Important framing, stated up front:** TrustLance does not integrate Razorpay Route or any regulated
marketplace escrow product. It uses the standard Razorpay Payment Gateway for payment capture, and
implements the "escrow" as application-level business logic — a deliberate, explainable engineering
decision, not a limitation to hide. This document treats that distinction as a first-class design decision,
not an afterthought.

---

## 2. Problem Research & Discovery

### 2.1 The two-sided trust problem in freelancing
Freelance transactions between strangers have a structural trust gap on both sides:
- **Client's fear:** "What if I pay upfront and the freelancer disappears or delivers nothing usable?"
- **Freelancer's fear:** "What if I finish the work and the client refuses to pay or vanishes?"

Neither party wants to move first, and informal arrangements (pay-half-upfront, "trust me" agreements)
resolve this poorly and asymmetrically — usually favoring whichever party has more leverage.

### 2.2 How existing platforms handle this
- **Upwork/Fiverr:** Use real, regulated escrow-like holding of funds — but take a significant platform
  cut, gate access behind account approval, and are overkill for smaller, campus-adjacent or niche
  freelance arrangements.
- **Direct UPI/bank transfer arrangements:** No structure at all — entirely reputation and trust-based,
  no dispute mechanism, no audit trail.
- **General payment links (Razorpay Payment Links, PayPal.me):** Handle payment capture only — no
  workflow around holding, approval, or disputes.

### 2.3 The gap
There is no lightweight, self-hosted way to add a structured escrow-style workflow — capture, hold,
milestone approval, dispute resolution, audit trail — on top of a standard payment gateway, without
becoming a full regulated marketplace. That is the gap TrustLance fills, and the reason the "escrow" is
explicitly a state machine rather than a claimed financial product.

---

## 3. Vision Statement

> "A freelance marketplace where neither party has to move first — where payment is captured
> immediately but held in a transparent, auditable workflow until the work is actually approved,
> and where disagreements have a structured, evidence-based resolution path instead of a dead end."

---

## 4. Goals & Non-Goals

### 4.1 Goals
1. Remove single-party control over freelance payments by capturing funds up front and gating release
   behind explicit approval or admin-adjudicated dispute resolution.
2. Give every payment a fully auditable lifecycle — every state transition logged, with actor, timestamp,
   and reason.
3. Provide a real, usable dispute system with evidence submission from both sides, not just a complaint box.
4. Be honest, in code and in documentation, about what is and is not a regulated escrow service.

### 4.2 Non-Goals (v1 and near-term)
- Not a regulated marketplace escrow / payment aggregator — does not hold funds outside the payment
  gateway's own settlement cycle.
- Not a dispute arbitration legal service — admin decisions are platform-level, not legally binding.
- Not multi-currency in v1 — INR only, single Razorpay account.
- Not a real-time chat platform initially — messaging is simple and threaded per project, not a
  general-purpose chat product.

---

## 5. Personas

| Persona | Core need | Key frustration today |
|---|---|---|
| **Client** | Confidence that payment won't be released until work is actually approved | No structure — either pays fully upfront on trust, or haggles over partial payments |
| **Freelancer** | Confidence that completed work will actually be paid for | Ghosting after delivery, scope disputes with no resolution path |
| **Admin** | A clear, evidence-based way to resolve disputes fairly | No visibility into either party's side without manually chasing screenshots |

---

## 6. Full Feature Universe (All Phases)

### 6.1 Phase 1 — MVP (build first, fully functional, demo-ready)
| # | Feature | Description |
|---|---|---|
| 1 | Auth (NextAuth) + RBAC | Client / Freelancer / Admin roles, every API route role-guarded |
| 2 | Project Posting | Client creates project: title, description, budget, deadline, skills |
| 3 | Proposals | Freelancer applies with proposal text, estimated days, optional price |
| 4 | Client Selection | Client picks one freelancer, project moves to `ASSIGNED` |
| 5 | Razorpay Payment Capture | Client pays via Razorpay Checkout; backend verifies signature |
| 6 | Escrow State Machine | Core engine controlling `HOLDING → UNDER_REVIEW → RELEASED/DISPUTED` |
| 7 | Work Submission | Freelancer submits files/GitHub link/demo link, progress updates |
| 8 | Client Decision | Approve / Request Changes / Raise Dispute |
| 9 | Dispute Evidence Upload | Both parties upload evidence (files, links, screenshots) |
| 10 | Admin Dispute Resolution | Admin reviews evidence, releases/refunds/partial-refunds |
| 11 | Audit Log | Every state transition recorded with actor, timestamp, prev/new state |
| 12 | Email Notifications | Payment received, assigned, submitted, disputed, released, refunded |
| 13 | Webhook Handling | `payment.captured` / `payment.failed`, idempotency-checked |

### 6.2 Phase 2 — Near-term extensions
| # | Feature | Description |
|---|---|---|
| 14 | Auto-Release After Deadline | If client doesn't respond within N days post-submission and no dispute is open, auto-transition to `RELEASED` (cron job) |
| 15 | Ratings & Reviews | Post-completion rating for both client and freelancer |
| 16 | Project Search & Filters | Filter by skill, budget range, deadline |
| 17 | In-Project Messaging | Threaded messages scoped to a project, not general chat |
| 18 | Payment History Dashboard | Per-user view of all past transactions and their final states |
| 19 | Partial Release / Milestones | Split project payment into milestone-based releases |

### 6.3 Phase 3 — Long-term / lower-priority
| # | Feature | Description |
|---|---|---|
| 20 | Real-Time Chat (Socket.io) | Upgrade from polling/threaded messages to live chat |
| 21 | Multi-Currency Support | Beyond INR, if Razorpay International or Stripe added |
| 22 | Freelancer Verification Badges | KYC-lite verification for trust signaling |
| 23 | Admin Analytics Dashboard | Dispute rate, average resolution time, platform volume |

---

## 7. Technology Stack — Final Decisions & Reasoning

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Single repo for frontend + API routes; TypeScript catches state-machine misuse at compile time, which matters a lot for an escrow system |
| Styling | Tailwind CSS | Fast iteration without a separate design system for a solo build |
| Backend | Next.js API Routes (Node.js) | Avoids running/deploying a separate Express server for a project this size; service-layer pattern keeps it from turning into a "fat API route" mess |
| Database | PostgreSQL | Escrow states, payments, and disputes are fundamentally relational with strict transitions — a strong case for SQL over NoSQL, unlike variable-shape content platforms |
| ORM | Prisma | Type-safe queries matched to TypeScript; migrations are explicit and reviewable, which matters when the schema encodes financial state |
| Auth | NextAuth.js | First-class Next.js integration, session handling and RBAC middleware without hand-rolling JWT logic |
| Payments | Razorpay Payment Gateway (Checkout + Orders API) | Real, working payment capture without claiming a regulated escrow product the project doesn't actually have access to |
| File Storage | Cloudinary or S3 (pick one before Stage 5) | Work submission files and dispute evidence need object storage outside the DB |
| Background Jobs | Cron (e.g. Vercel Cron or node-cron) | Needed for auto-release-after-deadline in Phase 2 |
| Email | Resend or Nodemailer | Transactional notifications on state changes |

**Why not a real escrow/marketplace product (Razorpay Route, RazorpayX):** those require business
verification, marketplace approval, and a settlement/transfer model meant for platforms disbursing to many
verified sub-merchants — disproportionate for a single-account student project, and dishonest to claim
without actually integrating them. The state-machine approach captures the same user-facing behavior
(money doesn't move to the freelancer until approved) using only the standard payment gateway.

---

## 8. System Architecture

```
                    Client (Next.js + TypeScript)
                           |
                           | HTTPS
                           v
                 -----------------------
                 |      Backend API     |
                 |  Next.js API Routes  |
                 -----------------------
                  |        |         |
                  v        v         v
             PostgreSQL  Razorpay  File Storage
               Prisma     API      (Cloudinary/S3)

                  |
                  v
          Escrow State Machine
                  |
                  v
        Notifications / Webhooks / Audit Log
```

**Service layer pattern:**
```
API Route -> ProjectService -> EscrowService -> PaymentService -> Prisma
```
Keeps controllers thin and each domain concern independently testable.

---

## 9. Authentication & Authorization — Full Design

- NextAuth.js session-based auth, credentials or OAuth provider (decide before Stage 1).
- Every user has exactly one role: `CLIENT`, `FREELANCER`, or `ADMIN`.
- Role-based middleware wraps every API route — e.g. `POST /projects` is Client-only,
  `POST /projects/:id/apply` is Freelancer-only, `POST /disputes/:id/resolve` is Admin-only.
- Ownership checks are separate from role checks: a Client can only act on their own projects, a
  Freelancer can only submit work on projects they were assigned to. Role alone is not sufficient
  authorization — every mutating route must check resource ownership too.

---

## 10. Data Model (Prisma Schema, conceptual)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     // CLIENT | FREELANCER | ADMIN
  createdAt DateTime @default(now())

  projectsAsClient Project[]  @relation("ClientProjects")
  proposals        Proposal[]
}

model Project {
  id          String   @id @default(cuid())
  clientId    String
  title       String
  description String
  budget      Int
  deadline    DateTime
  skills      String[]
  status      ProjectStatus // OPEN | ASSIGNED | IN_PROGRESS | UNDER_REVIEW | COMPLETED
  freelancerId String?

  proposals   Proposal[]
  escrow      Escrow?
  createdAt   DateTime @default(now())
}

model Proposal {
  id            String   @id @default(cuid())
  projectId     String
  freelancerId  String
  message       String
  estimatedDays Int
  price         Int?
  createdAt     DateTime @default(now())
}

model Payment {
  id              String   @id @default(cuid())
  projectId       String   @unique
  razorpayOrderId String
  razorpayPaymentId String?
  amount          Int
  status          PaymentStatus // PENDING | SUCCESS | FAILED
  createdAt       DateTime @default(now())
}

model Escrow {
  id           String       @id @default(cuid())
  projectId    String       @unique
  status       EscrowStatus // CREATED | HOLDING | WORK_SUBMITTED | UNDER_REVIEW | RELEASED | DISPUTED | REFUNDED
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  dispute      Dispute?
}

model Dispute {
  id         String   @id @default(cuid())
  escrowId   String   @unique
  raisedBy   String   // userId
  reason     String
  status     DisputeStatus // OPEN | ADMIN_REVIEW | RESOLVED
  resolution String?
  evidence   Evidence[]
  createdAt  DateTime @default(now())
}

model Evidence {
  id        String   @id @default(cuid())
  disputeId String
  userId    String
  type      String   // "file" | "link" | "screenshot"
  url       String
  createdAt DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  entityType String   // "Escrow" | "Project" | "Dispute"
  entityId   String
  action     String
  actorId    String
  prevState  String?
  newState   String?
  createdAt  DateTime @default(now())
}
```

**Note:** `Payment` and `Escrow` are deliberately separate tables. `Payment` records what Razorpay
actually did (transaction facts). `Escrow` records the platform's own workflow interpretation of that
payment (business state). Conflating them makes it much harder to explain — and much harder to
audit — what actually happened versus what the app decided to do about it.

---

## 11. Payment Flow — Razorpay Integration, Full Explanation

1. Client clicks "Pay" on an assigned project.
2. Backend creates a Razorpay Order (`orders.create`) for the agreed budget amount.
3. Frontend opens Razorpay Checkout using that order ID.
4. On success, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` to
   the frontend.
5. **Frontend sends these three values to the backend — never trust a "payment succeeded" flag from
   the client alone.**
6. Backend recomputes the HMAC signature server-side using the key secret and compares it to the
   received signature. Only if they match is the payment considered verified.
7. On verification: `Payment.status = SUCCESS`, `Escrow.status = HOLDING`.
8. Razorpay also sends an asynchronous webhook (`payment.captured`) to a dedicated endpoint —
   this is verified independently (separate webhook signature) and checked for idempotency (has this
   `event.id` already been processed?) before updating anything, since webhooks can be retried or
   arrive out of order relative to the frontend's own confirmation call.

---

## 12. Escrow Engine — State Machine Design

```
CREATED
   |
PAYMENT_PENDING
   |
PAYMENT_VERIFIED
   |
HOLDING
   |
WORK_SUBMITTED
   |
UNDER_REVIEW
   |
   +---------------------+
   |                      |
 Approve               Dispute
   |                      |
RELEASED             DISPUTED
   |                      |
COMPLETED           ADMIN_REVIEW
                          |
                    REFUNDED / RELEASED
```

Rules:
- Transitions are enforced in one place (`EscrowService`), never scattered across route handlers.
- Illegal transitions (e.g. `PAYMENT_PENDING → RELEASED` directly) must throw, not silently succeed.
- Every transition writes an `AuditLog` row in the same database transaction as the state change —
  never as an afterthought that could fail independently and desync from reality.

---

## 13. Dispute Resolution System

1. Either party raises a dispute from `UNDER_REVIEW` (or from `WORK_SUBMITTED` if the client refuses
   to respond — see Phase 2 auto-release for the inverse case).
2. Both client and freelancer can upload evidence: client typically uploads requirement docs, chat
   screenshots; freelancer typically uploads source code links, commit history, demo videos.
3. Admin reviews all evidence in one screen and chooses: **Release to freelancer**, **Refund to
   client**, or **Partial split** (optional, Phase 2).
4. Resolution is logged to `AuditLog` and the dispute record, and both parties are notified by email.

---

## 14. Security Model

- Server-side Razorpay signature verification on both the checkout callback and the webhook — never
  trust client-reported payment success alone.
- Webhook idempotency: store processed `event.id`s, reject duplicates.
- RBAC + ownership checks on every mutating route (see §9).
- Input validation on all API routes (e.g. zod schemas) before touching the database.
- File upload validation: type and size limits on evidence/work-submission uploads.
- Rate limiting on proposal submission and dispute creation to prevent spam/abuse.
- Passwords (if credentials auth is used) hashed with bcrypt; sessions via NextAuth, not hand-rolled JWT.

---

## 15. API Surface (Core Routes)

```
POST   /api/projects                        -> Client only
GET    /api/projects?status=&skill=
GET    /api/projects/:id
POST   /api/projects/:id/apply               -> Freelancer only
POST   /api/projects/:id/select-freelancer    -> Client only, transitions to ASSIGNED

POST   /api/payments/:projectId/create-order  -> Client only
POST   /api/payments/verify                   -> signature verification, transitions escrow to HOLDING
POST   /api/webhooks/razorpay                 -> Razorpay only, signature + idempotency checked

POST   /api/projects/:id/submit-work          -> assigned Freelancer only
POST   /api/projects/:id/approve              -> Client only, transitions escrow to RELEASED
POST   /api/projects/:id/request-changes      -> Client only
POST   /api/projects/:id/dispute              -> Client or Freelancer

POST   /api/disputes/:id/evidence             -> either party on that dispute
POST   /api/disputes/:id/resolve              -> Admin only

GET    /api/audit-logs/:entityId              -> Admin only
GET    /api/notifications
```

---

## 16. Non-Functional Requirements

- **Testing:** unit tests on the escrow state machine specifically — a test proving illegal transitions
  throw, and a test proving webhook idempotency actually rejects duplicate events. Integration test on
  the full happy path: project created → assigned → paid → submitted → approved → released.
- **Performance:** paginate project listings; index on `status`, `clientId`, `freelancerId`.
- **Auditability:** every escrow/dispute state change must be reconstructable from `AuditLog` alone,
  independent of current table state.
- **Error handling:** every API route wrapped in try/catch, structured JSON error responses, no raw
  stack traces to the client.

---

## 17. Build Plan — Stage by Stage

| Stage | Focus |
|---|---|
| 0 | Database schema (ER design) — Users, Projects, Proposals, Payments, Escrow, Disputes, Evidence, AuditLogs |
| 1 | Auth & RBAC |
| 2 | Project & Proposal service |
| 3 | Razorpay payment integration + webhook |
| 4 | Escrow state machine |
| 5 | Work submission & client review |
| 6 | Dispute system + evidence upload |
| 7 | Notifications (email) |
| 8 | Audit logging |
| 9 | Admin dashboard + auto-release cron |
| 10 | Polish, search/filters, deploy |

---

## 18. Success Metrics

- % of projects reaching `RELEASED` without a dispute (validates the core workflow trust hypothesis)
- Average time from `WORK_SUBMITTED` to final resolution
- Dispute rate and admin resolution time
- Webhook duplicate-event rejection rate (validates idempotency actually works under retries)

---

## 19. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Overclaiming "real escrow" on resume/interview damages credibility | Explicit, honest framing throughout this doc and the resume bullets below; practiced answer for "did you use Razorpay Route?" |
| Illegal state transitions corrupt escrow data | All transitions centralized in `EscrowService`, unit-tested |
| Duplicate webhook delivery double-processes a payment | Idempotency table keyed on Razorpay `event.id` |
| Client never responds after work submission, freelancer left unpaid indefinitely | Phase 2 auto-release-after-deadline cron job |
| File upload abuse (oversized/malicious files as evidence) | Type/size validation, storage provider-level scanning if available |

---

## 20. Resume Bullets (Honest, Accurate Framing)

1. "Built TrustLance, a freelance marketplace with an escrow-style payment workflow using Razorpay
   payment integration and a backend-managed state machine that holds funds until client approval or
   dispute resolution."
2. "Prevented payment spoofing and duplicate processing by implementing server-side Razorpay
   signature verification on both checkout and webhook events, with idempotency checks."
3. "Designed a state-driven escrow lifecycle (captured, holding, released, refunded, disputed) with
   role-based admin overrides and a full audit log of every transition."

**Interview-ready distinction to always have ready:** "I integrated Razorpay for payment processing.
Since a regulated marketplace escrow service isn't accessible for a personal project, I implemented the
escrow workflow myself as a backend state machine — the payment table records what Razorpay actually
did, and the escrow table records the platform's own interpretation of that payment."

---

## 21. Appendix — Full Flat Feature List, All Phases

| Feature | Phase |
|---|---|
| Auth & RBAC | 1 |
| Project Posting | 1 |
| Proposals | 1 |
| Client Selection | 1 |
| Razorpay Payment Capture | 1 |
| Escrow State Machine | 1 |
| Work Submission | 1 |
| Client Decision (Approve/Revise/Dispute) | 1 |
| Dispute Evidence Upload | 1 |
| Admin Dispute Resolution | 1 |
| Audit Log | 1 |
| Email Notifications | 1 |
| Webhook Handling | 1 |
| Auto-Release After Deadline | 2 |
| Ratings & Reviews | 2 |
| Project Search & Filters | 2 |
| In-Project Messaging | 2 |
| Payment History Dashboard | 2 |
| Partial Release / Milestones | 2 |
| Real-Time Chat (Socket.io) | 3 |
| Multi-Currency Support | 3 |
| Freelancer Verification Badges | 3 |
| Admin Analytics Dashboard | 3 |

*End of Document — TrustLance Master Plan v1.0*
