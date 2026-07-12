# Phase Completion Report: Access Control & Email Overhaul

This document details the decisions, implementation specifics, and verification results for the access-control, optional skills, assignments directory, and Nodemailer SMTP features.

---

## 1. Decisions & Implementation Details

### Part A: Restrict Client Visibility
- **Decision**: Overriding `clientId` filter parameter in GET `/api/projects` was chosen as the cleanest approach. When the logged-in user is `CLIENT`, we silently set `clientId = session.user.id`. This natively prevents clients from browsing public projects while preserving their own projects dashboard `/client/projects`.
- **Implementation**:
  - Gated GET `/api/projects` to block `ADMIN` role with `403 Forbidden` (since admins use the assignments directory).
  - Gated GET `/api/projects/[id]`: Clients can ONLY view the project details if they are the owner (`clientId === session.user.id`). Unrelated clients are rejected with `403 Forbidden` (even for `OPEN` status projects).
  - Modified `components/Navbar.tsx`: Removed the "Browse Projects" link for the `CLIENT` role.
  - Modified `app/projects/page.tsx`: If a client navigates directly to `/projects`, a friendly redirect layout is shown pointing to "My Projects" and "Post a Project".

### Part B: Make Skills Field Optional & Unobtrusive
- **Decision**: Made the `skills` field fully optional at both schema validation and database levels (zero skills allowed on a project), while wrapping the selection panel behind a clean, collapsible toggle button in the UI.
- **Implementation**:
  - Updated `lib/validators/project.ts` to allow empty skills array.
  - Collapsed the grid inside a folder-style toggle button labeled `+ Add relevant skills (optional)` in `app/(dashboard)/client/projects/new/page.tsx` and `app/projects/[id]/page.tsx` (edit form).
  - Styled tags quietly as low-contrast gray boxes on project cards.

### Part C: Tighten Admin visibility bounds & New Assignments Directory
- **Decision**: Gated project details strictly, forcing admins to monitor contracts from a flatAssignments Directory unless a project dispute is active or resolved.
- **Implementation**:
  - **New Endpoint**: GET `/api/admin/assignments` returns a flat array of Client Name, Client Email, Freelancer Name, Freelancer Email, Project Title, Project Status, and Dispute ID for `ASSIGNED` or later status projects.
  - **Project Detail Gate**: Gated GET `/api/projects/[id]` so that Admins are rejected with `403 Forbidden` unless a related dispute exists with status `OPEN`, `ADMIN_REVIEW`, or `RESOLVED`.
  - **Navbar Link**: Replaced Admin's "Browse Projects" nav link with "Assignments" pointing to the directory.
  - **Assignments Page**: Created a clean tabular list. If a dispute is active, a "Review Case →" link routes them directly to `/disputes/[id]`.

### Part D: Gmail SMTP Integration via Nodemailer
- **Decision**: Migrated from Resend to Nodemailer configuring STARTTLS with Gmail SMTP on port 587.
- **Implementation**:
  - Set SMTP settings dynamically using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` (App Password).
  - Enforced structured "from" headers: `TrustLance <trustlance.noreply@gmail.com>`.
  - Created unit tests verifying transporter instantiation and error handling using mock transports.
  - Verified `FREELANCER_ASSIGNED` and `WORK_SUBMITTED` triggers fire reliably in sequence.

### Part E: Remove Tech Stack Jargon from User-Facing Pages
- Replaced technical names (`Next.js`, `Prisma`, `Razorpay`, `S3`, `Google OAuth`, `RBAC`) on the landing page, search placeholders, upload button indicators, and error exceptions with plain functional terms like `Secure Sign-In`, `Escrow Payments`, `Cloud Storage`, and `Cloud Deliverables`.

---

## 2. Test Verification Summary

### Automated Test Suite
All 90 Jest unit and integration tests passed successfully:
* **Mailer Transporter Tests** (`__tests__/mailer.test.ts`):
  - `should initialize the transporter and send an email via Nodemailer transport`
  - `should fail gracefully and log a warning if transporter fails to send mail`
* **Visibility and Schema Tests** (`__tests__/new-features.test.ts`):
  - `CLIENT calling GET /api/projects is restricted to only their own projects`
  - `FREELANCER calling GET /api/projects still sees all OPEN projects as before`
  - `Regression check: My Projects still returns the Client's own projects`
  - `Permissive schema validation should allow project creation with zero skills`
  - `GET /api/admin/assignments returns only flat assignments directory and no description/budget`
  - `Admin is rejected (403) from GET /api/projects/:id for a project with NO dispute at all`
  - `Admin IS granted access to GET /api/projects/:id for a project WITH an active/resolved dispute`
  - `Regression: Admin is STILL rejected from messaging actions even when a dispute is open`

### Manual SMTP Delivery Verification
Triggered email dispatch verification against real Gmail SMTP using a dedicated test script (`test-email.js`) configured with the app password:
* **Sent to**: `trustlance.noreply@gmail.com` and `thushar.tl.dev@gmail.com`
* **Transporter**: `smtp.gmail.com:587` (STARTTLS)
* **Outcome**: **SUCCESS**
* **Returned Message ID**: `<1edd355e-938d-6196-e197-163b33fbd66a@gmail.com>`
