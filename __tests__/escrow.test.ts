import { EscrowService } from "@/lib/services/escrow-service";
import { ProjectService } from "@/lib/services/project-service";
import { SubmissionService } from "@/lib/services/submission-service";
import { POST as webhookHandler } from "@/app/api/webhooks/razorpay/route";
import { prisma } from "@/lib/prisma";
import { EscrowStatus, PaymentStatus, ProjectStatus } from "@prisma/client";
import crypto from "crypto";

const secret = "webhook_secret";

// Mock auth guards (unused here but good for safety)
jest.mock("@/lib/auth/require-role");

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    submission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    webhookEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Escrow State Machine & Webhooks Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  });

  describe("Unit: Escrow State Machine Transitions", () => {
    it("throws and does not update DB on illegal transition (e.g. CREATED -> RELEASED)", async () => {
      (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
        id: "esc_1",
        status: EscrowStatus.CREATED,
      });

      await expect(
        EscrowService.transition("esc_1", EscrowStatus.RELEASED, "actor_1")
      ).rejects.toThrow("Illegal escrow transition");

      expect(prisma.escrow.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("succeeds and writes AuditLog on legal transition (e.g. CREATED -> HOLDING)", async () => {
      (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
        id: "esc_1",
        status: EscrowStatus.CREATED,
      });
      (prisma.escrow.update as jest.Mock).mockResolvedValue({
        id: "esc_1",
        status: EscrowStatus.HOLDING,
      });

      const result = await EscrowService.transition("esc_1", EscrowStatus.HOLDING, "actor_1");

      expect(result.status).toBe(EscrowStatus.HOLDING);
      expect(prisma.escrow.update).toHaveBeenCalledWith({
        where: { id: "esc_1" },
        data: { status: EscrowStatus.HOLDING },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "Escrow",
          entityId: "esc_1",
          action: "TRANSITION_HOLDING",
          actorId: "actor_1",
          prevState: "CREATED",
          newState: "HOLDING",
        },
      });
    });
  });

  describe("Unit/Integration: Webhooks endpoint guards", () => {
    it("webhook rejects invalid signature with 400 and doesn't update database", async () => {
      const badSignature = "invalid_signature";
      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": badSignature,
        },
        body: JSON.stringify({ id: "evt_1" }),
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid webhook signature");

      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.escrow.create).not.toHaveBeenCalled();
    });

    it("duplicate webhook event is a no-op (no DB mutations)", async () => {
      const dbError = new Error("Unique constraint violation");
      (dbError as unknown as { code: string }).code = "P2002";
      (prisma.webhookEvent.create as jest.Mock).mockRejectedValue(dbError);

      const payloadBody = JSON.stringify({
        id: "evt_duplicate",
        event: "payment.captured",
      });
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payloadBody)
        .digest("hex");

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: payloadBody,
      });

      const paymentUpdateCallsBefore = (prisma.payment.update as jest.Mock).mock.calls.length;
      const escrowCreateCallsBefore = (prisma.escrow.create as jest.Mock).mock.calls.length;

      const res = await webhookHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Event already processed.");

      expect((prisma.payment.update as jest.Mock).mock.calls.length).toBe(paymentUpdateCallsBefore);
      expect((prisma.escrow.create as jest.Mock).mock.calls.length).toBe(escrowCreateCallsBefore);
    });
  });

  describe("Integration: Webhook Captured & Failed Flows", () => {
    it("integration: webhook payment.captured transitions escrow to HOLDING", async () => {
      const rawBody = JSON.stringify({
        id: "evt_captured",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_captured",
              order_id: "order_captured",
            },
          },
        },
      });
      const signature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      (prisma.webhookEvent.create as jest.Mock).mockResolvedValue({ id: "we_1" });
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "pay_db_1",
        projectId: "proj_db_1",
        razorpayOrderId: "order_captured",
        status: PaymentStatus.PENDING,
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        id: "pay_db_1",
        status: PaymentStatus.SUCCESS,
      });
      (prisma.escrow.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "esc_db_1",
          projectId: "proj_db_1",
          status: EscrowStatus.CREATED,
        });
      (prisma.escrow.create as jest.Mock).mockResolvedValue({
        id: "esc_db_1",
        projectId: "proj_db_1",
        status: EscrowStatus.CREATED,
      });
      (prisma.escrow.update as jest.Mock).mockResolvedValue({
        id: "esc_db_1",
        status: EscrowStatus.HOLDING,
      });

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: rawBody,
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: { razorpayEventId: "evt_captured" },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "pay_db_1" },
        data: { status: PaymentStatus.SUCCESS, razorpayPaymentId: "pay_captured" },
      });
      expect(prisma.escrow.create).toHaveBeenCalledWith({
        data: { projectId: "proj_db_1", status: EscrowStatus.CREATED },
      });
      expect(prisma.escrow.update).toHaveBeenCalledWith({
        where: { id: "esc_db_1" },
        data: { status: EscrowStatus.HOLDING },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "Escrow",
          entityId: "esc_db_1",
          action: "TRANSITION_HOLDING",
          actorId: "SYSTEM_WEBHOOK",
          prevState: "CREATED",
          newState: "HOLDING",
        },
      });
    });

    it("integration: payment.failed webhook sets status to FAILED and does not create escrow", async () => {
      const rawBody = JSON.stringify({
        id: "evt_failed",
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed",
              order_id: "order_failed",
            },
          },
        },
      });
      const signature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      (prisma.webhookEvent.create as jest.Mock).mockResolvedValue({ id: "we_2" });
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "pay_db_2",
        projectId: "proj_db_2",
        razorpayOrderId: "order_failed",
        status: PaymentStatus.PENDING,
      });

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: rawBody,
      });

      const res = await webhookHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "pay_db_2" },
        data: { status: PaymentStatus.FAILED, razorpayPaymentId: "pay_failed" },
      });
      expect(prisma.escrow.create).not.toHaveBeenCalled();
      expect(prisma.escrow.update).not.toHaveBeenCalled();
    });
  });

  describe("Unit: Escrow State Machine Mapping Verification", () => {
    it("3. verifies the exact allowed-transitions map (UNDER_REVIEW -> HOLDING is legal, nothing else new)", async () => {
      const allStatuses = Object.values(EscrowStatus);
      
      const expectedTransitions: Record<EscrowStatus, EscrowStatus[]> = {
        [EscrowStatus.CREATED]: [EscrowStatus.HOLDING],
        [EscrowStatus.HOLDING]: [EscrowStatus.WORK_SUBMITTED],
        [EscrowStatus.WORK_SUBMITTED]: [EscrowStatus.UNDER_REVIEW],
        [EscrowStatus.UNDER_REVIEW]: [EscrowStatus.RELEASED, EscrowStatus.DISPUTED, EscrowStatus.HOLDING],
        [EscrowStatus.DISPUTED]: [EscrowStatus.RELEASED, EscrowStatus.REFUNDED],
        [EscrowStatus.RELEASED]: [],
        [EscrowStatus.REFUNDED]: [],
      };

      for (const src of allStatuses) {
        const allowed = expectedTransitions[src];
        for (const dest of allStatuses) {
          (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
            id: "esc_test",
            status: src,
          });
          
          if (allowed.includes(dest)) {
            // Legal transition
            (prisma.escrow.update as jest.Mock).mockResolvedValue({
              id: "esc_test",
              status: dest,
            });
            const result = await EscrowService.transition("esc_test", dest, "actor");
            expect(result.status).toBe(dest);
          } else {
            // Illegal transition
            await expect(
              EscrowService.transition("esc_test", dest, "actor")
            ).rejects.toThrow("Illegal escrow transition");
          }
        }
      }
    });
  });

  describe("Integration: Request Changes Escrow Reset Regression", () => {
    it("1. request-changes transitions Escrow back to HOLDING, and subsequent submit-work succeeds", async () => {
      // Setup dynamic status tracker for mocks
      let escrowStatus = EscrowStatus.UNDER_REVIEW;
      (prisma.escrow.findUnique as jest.Mock).mockImplementation(async () => ({
        id: "esc_123",
        status: escrowStatus,
      }));
      (prisma.escrow.update as jest.Mock).mockImplementation(async ({ data }) => {
        if (data && data.status) {
          escrowStatus = data.status;
        }
        return { id: "esc_123", status: escrowStatus };
      });

      // 1. Mock first phase: client requests changes
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_1",
        freelancerId: "freelancer_1",
        status: ProjectStatus.UNDER_REVIEW,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.UNDER_REVIEW,
        },
      });

      (prisma.submission.findFirst as jest.Mock).mockResolvedValue({
        id: "sub_1",
        projectId: "proj_123",
      });

      await ProjectService.requestChanges("proj_123", "client_1", "Please resubmit with changes.");

      // Check project went back to IN_PROGRESS and escrow went back to HOLDING
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.IN_PROGRESS },
      });
      expect(escrowStatus).toBe(EscrowStatus.HOLDING);

      // 2. Mock second phase: freelancer submits work again
      // The project is now in IN_PROGRESS (submittable status) and escrow is in HOLDING (submittable status)
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_1",
        freelancerId: "freelancer_1",
        status: ProjectStatus.IN_PROGRESS,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.HOLDING,
        },
      });

      (prisma.submission.create as jest.Mock).mockResolvedValue({
        id: "sub_2",
        projectId: "proj_123",
        fileUrl: "https://bucket.s3.amazonaws.com/submissions/file2.zip",
        notes: "Here is the resubmitted work",
      });

      // Attempting to submit work again should succeed now without throwing escrow status errors
      const submissionInput = {
        fileUrl: "https://bucket.s3.amazonaws.com/submissions/file2.zip",
        notes: "Here is the resubmitted work",
      };

      const result = await SubmissionService.submitWork("proj_123", "freelancer_1", submissionInput);
      expect(result).toBeDefined();

      // Verify that escrow transitioned to WORK_SUBMITTED and then UNDER_REVIEW
      expect(escrowStatus).toBe(EscrowStatus.UNDER_REVIEW);
    });
  });
});
