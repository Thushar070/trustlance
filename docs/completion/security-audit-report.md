# TrustLance Security Audit & System-Design Report

**Date of Audit:** July 13, 2026  
**Auditor:** Antigravity (Advanced Agentic Coding Security Agent)  
**Target Repository:** TrustLance (Escrow-backed Freelance Marketplace)  
**Status:** Completed and Pending Developer Review  

---

## Executive Summary

A full adversarial security and system-design audit was conducted across the entire TrustLance codebase. The application's business logic, state machines, and authentication boundaries were put through a rigorous verification check, including writing a custom security integration test suite to verify authorization gating. 

Overall, the **core escrow state-machine transitions and transaction atomic boundaries are safe and structurally sound**. Unauthorized cross-role state mutations (e.g., freelancers approving their own work, clients bypassing escrow) are correctly rejected across the service layer.

However, several critical and high-severity issues were identified:
1. **Stateless JWT Session Replay**: NextAuth stateless JWTs are client-side only; logout does not invalidate the session token on the server.
2. **Missing Database Indexes & Connection Pooling**: In production serverless configurations, the database is exposed to N+1 query patterns, lack of indexes on search lookups, and direct Postgres connection exhaustion.
3. **Missing Webhook Amount Verification**: The Razorpay webhook captured handler updates payments to success without verifying if the amount paid matches the database record.
4. **Unbounded List Queries & Pagination Gaps**: Multiple listing APIs lack pagination, and those that have it lack a maximum page size enforcement, presenting a denial-of-service vector.
5. **Accepted Connections Privacy Leak Gap**: A functional mismatch exists where accepted bidirectional connection partners are still restricted from viewing email/phone credentials.

No **active secrets** (keys, client secrets, passwords) were found leaked in the tracked repository or commit history.

---

## Findings Table

| Category | Description | Severity | Status |
| :--- | :--- | :--- | :--- |
| **Auth & Session** | [Stateless JWT Session Replay after Logout](#1-stateless-jwt-session-replay-after-logout) | High | Confirmed Vulnerable |
| **Auth & Session** | [Hardcoded Developer Role Overrides](#2-hardcoded-developer-role-overrides) | High | Confirmed Vulnerable |
| **Dependency** | [Outdated Vulnerable Packages (`nodemailer`, `postcss`, `uuid`)](#3-outdated-vulnerable-packages) | Medium | Needs Fix |
| **Dependency** | [Unused Leftover Dependency (`resend`)](#4-unused-leftover-dependency) | Low | Needs Fix |
| **Authorization** | [Privacy Gating Mismatch on Accepted Connections](#5-privacy-gating-mismatch-on-accepted-connections) | Medium | Confirmed Vulnerable |
| **Payments** | [Missing Amount Verification on Webhook Payment Capture](#6-missing-amount-verification-on-webhook-payment-capture) | Medium | Confirmed Vulnerable |
| **Rate Limiting** | [Lack of Rate Limiting on Key Mutating Routes & Search](#7-lack-of-rate-limiting-on-key-mutating-routes--search) | Medium | Confirmed Vulnerable |
| **Input Validation** | [Zod Schema Whitespace Bypass / Lack of Trimming](#8-zod-schema-whitespace-bypass--lack-of-trimming) | Low | Confirmed Vulnerable |
| **Performance** | [N+1 Query Pattern in User Search Listing](#9-n1-query-pattern-in-user-search-listing) | Medium | Confirmed Vulnerable |
| **Performance** | [Missing Database Indexes on Query Fields](#10-missing-database-indexes-on-query-fields) | Medium | Confirmed Vulnerable |
| **Performance / DoS** | [Unbounded Pagination / Missing Max Page Size Bounds](#11-unbounded-pagination--missing-max-page-size-bounds) | Medium | Confirmed Vulnerable |
| **Infrastructure** | [Direct Postgres Connection Exhaustion in Serverless Deployments](#12-direct-postgres-connection-exhaustion-in-serverless-deployments) | High | Needs Fix |
| **Security Headers** | [Missing HTTP Security Headers in Next.js Config](#13-missing-http-security-headers-in-next-js-config) | Medium | Confirmed Vulnerable |

---

## Detailed Vulnerability Analysis

### 1. Stateless JWT Session Replay after Logout
* **Reproduction Steps**:
  1. Authenticate to the application as any valid user and capture the session cookie (`next-auth.session-token`).
  2. Click "Logout" (or invoke `/api/auth/signout`). The application clears the client-side cookie.
  3. Send an API request (e.g., `GET /api/users/me`) using the captured session cookie.
  4. The server accepts the cookie as valid because it relies purely on stateless cryptographic signature verification of the JWT.
* **Proposed Fix**: Set up a database-backed session store in `authOptions.ts` (using Prisma adapter) or implement a simple token blacklist store (using Redis/DB) that invalidates the JWT's unique ID (`jti`) upon sign-out.

### 2. Hardcoded Developer Role Overrides
* **Reproduction Steps**:
  1. An attacker registers or signs in using a Google account with the email `thusharyyy@gmail.com`.
  2. The database sign-in callback checks `ROLE_OVERRIDES` in `lib/auth/role-overrides.ts` and maps the email directly to `ADMIN` status.
  3. The attacker gains instant administrator access without database approval or verification.
* **Proposed Fix**: Remove hardcoded entries from `role-overrides.ts` or wrap them in environment checks so they only execute if `process.env.NODE_ENV === 'development'`.

### 3. Outdated Vulnerable Packages
* **Reproduction Steps**:
  * Run `npm audit`.
  * High vulnerability reported on `nodemailer` <= 9.0.0 (SMTP command injection, CRLF injection, arbitrary file reads).
  * Moderate vulnerabilities reported on `postcss` and `uuid` (XSS via unescaped output, missing buffer bounds checks).
* **Proposed Fix**: Upgrade dependencies in `package.json` to secure versions (`nodemailer` to `9.0.3`+, `next-auth` to resolve `uuid`, `postcss` to `8.5.10`+).

### 4. Unused Leftover Dependency
* **Reproduction Steps**:
  * Run `grep -r "resend" app/ lib/`. Notice no active service imports resend after Nodemailer migration, yet it remains in `package.json`.
* **Proposed Fix**: Run `npm uninstall resend` to reduce supply chain attack surface.

### 5. Privacy Gating Mismatch on Accepted Connections
* **Reproduction Steps**:
  1. Connect two users A and B, and have User B accept User A's connection request.
  2. Call `GET /api/users/B/public-profile` as User A.
  3. The endpoint returns `isContactVisible: false` and masks the email/phone fields because the public profile route checker only validates `hasProjectRelationship()` and ignores connection status.
* **Proposed Fix**: Modify `app/api/users/[id]/public-profile/route.ts` to include the accepted connection check in the `isAssociated` resolution:
  ```typescript
  const conn = await ConnectionService.getConnectionStatus(viewerId, profileUserId);
  const isConnected = conn.status === ConnectionStatus.ACCEPTED;
  const isAssociated = isOwner || (await hasProjectRelationship(viewerId, profileUserId)) || isConnected;
  ```

### 6. Missing Amount Verification on Webhook Payment Capture
* **Reproduction Steps**:
  1. Inspect `app/api/webhooks/razorpay/route.ts`.
  2. Observe that when `payment.captured` is received, the handler fetches the payment record from the DB and transitions it to `SUCCESS` but does NOT verify that the paid amount in the webhook payload (`payload.payload.payment.entity.amount`) matches the database `amount` of that record.
* **Proposed Fix**: Add validation comparing `amount` parameters:
  ```typescript
  const paidAmountInPaise = paymentEntity?.amount;
  if (paidAmountInPaise && paidAmountInPaise !== dbPayment.amount * 100) {
    throw new Error("Amount mismatch: webhook amount does not match order record.");
  }
  ```

### 7. Lack of Rate Limiting on Key Mutating Routes & Search
* **Reproduction Steps**:
  1. A client profile can spam the `POST /api/projects` endpoint thousands of times to bloat the database.
  2. A user can spam profile updates (`POST /api/users/complete-profile`) or project rating creation (`POST /api/projects/[id]/rating`).
* **Proposed Fix**: Implement an in-memory token bucket or database-backed rate limit check on:
  - Project creation: e.g., max 5 per client per hour.
  - Search endpoint: e.g., max 100 queries per user per minute.
  - Messages: e.g., max 60 messages per minute.

### 8. Zod Schema Whitespace Bypass / Lack of Trimming
* **Reproduction Steps**:
  1. Submit a project creation request with a description consisting of 20 space characters.
  2. The Zod validator accepts it because the length is 20, letting empty content get written to the database.
* **Proposed Fix**: Apply `.trim()` to string validations in zod schemas, for example: `title: z.string().trim().min(5)`.

---

## System Design & Performance Recommendations

### 9. N+1 Query Pattern in User Search Listing
* **Finding**: `GET /api/users/search` maps over the results of `prisma.user.findMany` and performs individual `prisma.project.count` and `prisma.rating.findMany` queries per user. In a list of 50 users, this spawns 100 subsequent queries.
* **Recommendation**: Refactor to aggregate user ratings and project counts inside a single batch query (e.g., using `prisma.rating.groupBy` and `prisma.project.groupBy` for the listed user IDs), then mapping them in memory.

### 10. Missing Database Indexes on Query Fields
* **Finding**: `schema.prisma` contains no index annotations for columns used heavily for sorting, querying, or foreign key joins (e.g., `Project.status`, `Project.clientId`, `Project.freelancerId`, `Project.createdAt`).
* **Recommendation**: Add index decorators inside `schema.prisma`:
  ```prisma
  model Project {
    ...
    @@index([status])
    @@index([clientId])
    @@index([freelancerId])
    @@index([createdAt])
  }
  ```

### 11. Unbounded Pagination / Missing Max Page Size Bounds
* **Finding**: Route handlers like `GET /api/projects` accept a `limit` parameter directly from query string queries and forward it to Prisma without validating a maximum cap. Endpoints like `assignments` and `search` do not paginate results at all.
* **Recommendation**: Enforce a maximum limit cap server-side (e.g., `const limit = Math.min(parseInt(limitParam) || 10, 100)`) and implement basic cursor or offset-based pagination on all other collection endpoints.

### 12. Direct Postgres Connection Exhaustion in Serverless Deployments
* **Finding**: `DATABASE_URL` in `.env` connects directly to Neon. Under high concurrent serverless request loads (Vercel lambdas), this will open individual connections per function execution instance, rapidly exhausting Neon's direct connection limits.
* **Recommendation**: Switch the production `DATABASE_URL` environment configuration to Neon's **pooled connection string format** (e.g. port `5432` or pooler host variant) to leverage connection pooling.

### 13. Missing HTTP Security Headers in Next.js Config
* **Finding**: `next.config.ts` contains no security headers config block.
* **Recommendation**: Inject standard secure headers in `next.config.ts`:
  ```typescript
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  }
  ```

---

## Things Confirmed Safe

The following security controls and design invariants successfully resisted all adversarial attempts:
1. **Escrow Status Transition Controls**: State transitions must proceed strictly via the state-machine rules of `EscrowService` (verified via integration tests). Illegal transitions like `CREATED` -> `RELEASED` throw exceptions cleanly.
2. **Access Control Gating on Messages**: Admin accounts are strictly blocked from retrieving message threads via `MessageService.listMessages` even if they have project relationships, ensuring messaging privacy.
3. **Cryptographic Webhook Signature Integrity**: Fabricated Razorpay signatures are correctly rejected with `400 Bad Request` at `/api/webhooks/razorpay`.
4. **Auto-Release Cron Secrets Verification**: The cron trigger verifies the `Authorization` header against the expected `CRON_SECRET` accurately, successfully blocking arbitrary triggers.
5. **No Raw SQL Vulnerabilities**: The application leverages Prisma's parameterized queries across all database read/write actions, preventing SQL Injection.
6. **No unsafe HTML rendering**: Reactor escaping is trusted throughout the project, with zero usage of user-supplied variables inside `dangerouslySetInnerHTML`.
7. **No Secrets committed**: Git log searches verified that `.env` remains excluded and no production/dev secrets have ever been committed into tracked repository code files.
