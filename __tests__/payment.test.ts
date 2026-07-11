import { POST as createOrderHandler } from "@/app/api/payments/[projectId]/create-order/route";
import { POST as verifyPaymentHandler } from "@/app/api/payments/verify/route";
import { PaymentService } from "@/lib/services/payment-service";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

// Mock auth guards
jest.mock("@/lib/auth/require-role");

// Mock Razorpay SDK
const mockCreateOrder = jest.fn();
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: mockCreateOrder,
      },
    };
  });
});

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  return {
    prisma: {
      project: {
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    },
  };
});

describe("Payment Capture Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
  });

  describe("Unit: verifyPayment Signature Checks", () => {
    it("verifyPayment rejects a tampered signature, does not update Payment.status", async () => {
      const razorpayOrderId = "order_123";
      const razorpayPaymentId = "pay_123";
      const incorrectSignature = "incorrect_signature";

      // Mock database calls
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "payment_123",
        projectId: "proj_123",
        razorpayOrderId,
        amount: 5000,
        status: PaymentStatus.PENDING,
        project: {
          clientId: "client_123",
        },
      });

      await expect(
        PaymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, incorrectSignature, "client_123")
      ).rejects.toThrow("signature verification failed");

      // Verify that prisma.payment.update was NOT called
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it("verifyPayment accepts a correct signature, sets Payment.status = SUCCESS", async () => {
      const razorpayOrderId = "order_123";
      const razorpayPaymentId = "pay_123";
      const secret = "test_key_secret";
      const correctSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      // Mock database calls
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "payment_123",
        projectId: "proj_123",
        razorpayOrderId,
        amount: 5000,
        status: PaymentStatus.PENDING,
        project: {
          clientId: "client_123",
        },
      });

      (prisma.payment.update as jest.Mock).mockResolvedValue({
        id: "payment_123",
        status: PaymentStatus.SUCCESS,
      });

      const result = await PaymentService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        correctSignature,
        "client_123"
      );

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: "payment_123" },
        data: {
          status: PaymentStatus.SUCCESS,
          razorpayPaymentId,
        },
      });
    });
  });

  describe("Integration: create-order API route", () => {
    it("create-order rejects a non-owner Client", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_different", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      // Mock project owned by client_123
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_123",
        status: ProjectStatus.ASSIGNED,
        agreedAmount: 5000,
        payment: null,
      });

      const req = new Request("http://localhost/api/payments/proj_123/create-order", {
        method: "POST",
      });

      const res = await createOrderHandler(req, { params: Promise.resolve({ projectId: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("You do not own this project");
    });

    it("create-order rejects a project not currently ASSIGNED", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_123", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      // Mock project in OPEN status (not ASSIGNED)
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_123",
        status: ProjectStatus.OPEN,
        agreedAmount: 5000,
        payment: null,
      });

      const req = new Request("http://localhost/api/payments/proj_123/create-order", {
        method: "POST",
      });

      const res = await createOrderHandler(req, { params: Promise.resolve({ projectId: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("must be in ASSIGNED status");
    });

    it("create-order rejects if a SUCCESS payment already exists for this project", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_123", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      // Mock project with already SUCCESS payment
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_123",
        status: ProjectStatus.ASSIGNED,
        agreedAmount: 5000,
        payment: {
          status: PaymentStatus.SUCCESS,
        },
      });

      const req = new Request("http://localhost/api/payments/proj_123/create-order", {
        method: "POST",
      });

      const res = await createOrderHandler(req, { params: Promise.resolve({ projectId: "proj_123" }) });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("successful payment already exists");
    });

    it("create-order uses Project.agreedAmount, not Project.budget", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_123", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      // agreedAmount is 8000, budget is 10000
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_123",
        status: ProjectStatus.ASSIGNED,
        agreedAmount: 8000,
        budget: 10000,
        payment: null,
      });

      mockCreateOrder.mockResolvedValue({
        id: "order_xyz",
        amount: 800000, // 8000 INR in paise
        currency: "INR",
      });

      (prisma.payment.upsert as jest.Mock).mockResolvedValue({
        id: "payment_123",
        projectId: "proj_123",
        amount: 8000,
        status: PaymentStatus.PENDING,
      });

      const req = new Request("http://localhost/api/payments/proj_123/create-order", {
        method: "POST",
      });

      const res = await createOrderHandler(req, { params: Promise.resolve({ projectId: "proj_123" }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.orderId).toBe("order_xyz");

      expect(mockCreateOrder).toHaveBeenCalledWith({
        amount: 800000, // agreedAmount * 100
        currency: "INR",
        receipt: "receipt_order_proj_123",
      });
      expect(prisma.payment.upsert).toHaveBeenCalledWith({
        where: { projectId: "proj_123" },
        update: expect.objectContaining({
          amount: 8000,
        }),
        create: expect.objectContaining({
          amount: 8000,
        }),
      });
    });

    it("a Freelancer cannot call create-order", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: false,
        status: 403,
        error: "Forbidden: Mismatched role.",
        session: {
          user: { id: "free_123", role: Role.FREELANCER },
          expires: "2026-12-31",
        },
      });

      const req = new Request("http://localhost/api/payments/proj_123/create-order", {
        method: "POST",
      });

      const res = await createOrderHandler(req, { params: Promise.resolve({ projectId: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("verify-payment API route verifies signature and updates payment status", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_123", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      const razorpayOrderId = "order_123";
      const razorpayPaymentId = "pay_123";
      const secret = "test_key_secret";
      const correctSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "payment_123",
        projectId: "proj_123",
        razorpayOrderId,
        amount: 5000,
        status: PaymentStatus.PENDING,
        project: {
          clientId: "client_123",
        },
      });

      (prisma.payment.update as jest.Mock).mockResolvedValue({
        id: "payment_123",
        status: PaymentStatus.SUCCESS,
      });

      const req = new Request("http://localhost/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: correctSignature,
        }),
      });

      const res = await verifyPaymentHandler(req);
      expect(res.status).toBe(200);
      const resData = await res.json();
      expect(resData.status).toBe(PaymentStatus.SUCCESS);
    });
  });
});
