# Incident Report: Webhook Failure & Escrow Synchronization Issue

**Date/Time:** 2026-07-11 14:40:00+05:30
**Status:** Diagnosed, resolved, recovered, and protected.

---

## 1. Incident Description
During manual testing of a real Razorpay test-mode payment for project `cmrg4r7a8005ccp6nftujnuqp`, the payment was completed and signature verification succeeded (updating `Payment.status` to `SUCCESS` in the database). However, the associated `Escrow` record remained `null` on the project.

When the Freelancer logged in and attempted to submit deliverables, the backend API route `/api/projects/[id]/submit-work` returned a `404 Not Found` error with the message `"Escrow record not found for this project."`, blocking the Freelancer entirely even though the payment was completed.

---

## 2. Root Cause Analysis
1. **ngrok Offline**: During the manual testing session, the local ngrok HTTP tunnel was down. This meant Razorpay's webhook captured notifications could not be routed from Razorpay's servers to the local Next.js server.
2. **Webhook Dependency**: The initial escrow creation and transition to `HOLDING` status was designed to happen exclusively within the Razorpay webhook captured event handler (`payment.captured`), ensuring independent third-party confirmation of funds capture.
3. **No Checkout Verification Fallback**: The client-side payment verification endpoint (`PaymentService.verifyPayment()`) updated the payment record status but did not initialize the `Escrow` record. When the webhook request was lost, the database fell out of sync with reality (`Payment: SUCCESS`, `Escrow: null`).

---

## 3. Remediation & Fixes

### A. Long-Term local development guidelines
Added a known local development requirement in [DEPLOYMENT.md](file:///home/billy/Documents/ESCROW/docs/DEPLOYMENT.md):
- Before testing any real payment flow locally, ngrok must be running continuously and its current forwarding host must be updated in the Razorpay Webhooks settings dashboard.

### B. Admin Reconciliation Endpoint (Safety Valve)
Built a new admin-only API route:
- **`POST /api/admin/payments/[paymentId]/reconcile-escrow`**
- It ensures the caller session is an `ADMIN` role.
- It verifies the target `Payment` record status is `SUCCESS`.
- It verifies that no `Escrow` record currently exists for that project.
- It atomically creates the `Escrow` and transitions it to `HOLDING` inside a Prisma transaction block using the exact same `EscrowService` transition functions used by the webhook itself (ensuring strict rules checking and audit logging).

### C. Client UI Edge Case Message
Updated the frontend deliverables submission card ([app/projects/[id]/page.tsx](file:///home/billy/Documents/ESCROW/app/projects/%5Bid%5D/page.tsx)):
- If the payment is `SUCCESS` but the escrow is not yet initialized (due to delayed webhooks), the UI displays a clear, user-friendly notification message: 
  `"Payment received, but escrow setup is still processing. If this persists, contact support."`
- The same message is mapped onto the submission form error slot if the backend returns an escrow missing error, avoiding raw `404` error displays.

### D. Recovery of Stuck Project
Ran a TypeScript script importing `EscrowService` to safely perform the creation and transition to `HOLDING` for project `cmrg4r7a8005ccp6nftujnuqp`. The project has been successfully recovered, and the freelancer can submit work on it.

---

## 4. Verification & Testing
1. Added 5 integration tests in [__tests__/reconcile-escrow.test.ts](file:///home/billy/Documents/ESCROW/__tests__/reconcile-escrow.test.ts) verifying role protection, validation checks, double-creation prevention, and successful recovery.
2. Verified that `npm run lint` and all 69 Jest tests pass cleanly.
