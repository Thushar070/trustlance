import { EscrowService } from "@/lib/services/escrow-service";
import { POST as webhookHandler } from "@/app/api/webhooks/razorpay/route";
import { prisma } from "@/lib/prisma";
import { EscrowStatus, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

const secret = "webhook_secret";

// Mock auth guards (unused here but good for safety)
jest.mock("@/lib/auth/require-role");

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
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
});
